// Footprint definitions — each returns an array of {x, z} points (counter-clockwise)
// and a `cells` array: [{col, row}] listing which grid cells are inside the footprint.
// Origin is the centroid of the bounding box (so the building group is already centred).

const UNIT_W = 2.6;
const UNIT_D = 3.2;
const UNIT_H = 1.9;
const GAP   = 0.08; // small gap between units for visual separation

/**
 * Rectangle footprint.
 * cols = units_per_floor spread along X, rows = always 1 for a flat building face.
 * We keep the classic flat-row layout here: all units on a single depth row.
 */
export function getRectangleFootprint(cols) {
  const W = cols * UNIT_W;
  const D = UNIT_D;
  // half-extents
  const hw = W / 2, hd = D / 2;
  const points = [
    { x: -hw, z: -hd },
    { x:  hw, z: -hd },
    { x:  hw, z:  hd },
    { x: -hw, z:  hd },
  ];
  const cells = [];
  for (let c = 0; c < cols; c++) {
    cells.push({ col: c, row: 0 });
  }
  return { points, cells, cols, rows: 1, totalW: W, totalD: D };
}

/**
 * L-shape footprint.
 * Main wing: mainCols × mainRows (grid positions)
 * Annex wing: annexCols × annexRows — attached at the right, set back to annexRows deep
 *
 *  ┌───────────────────┐  ← mainRows rows
 *  │   main wing       │
 *  ├──────────┐        │
 *  │ annex    │        │
 *  └──────────┘────────┘
 *
 * The L is cut from the bottom-left corner — i.e. the annex occupies the
 * lower-left rectangle and the notch is the top-right missing corner.
 */
export function getLShapeFootprint(mainCols, mainRows, annexCols, annexRows) {
  // In world units:
  const totalCols = mainCols;
  const totalRows = mainRows;
  const W  = totalCols * UNIT_W;
  const D  = totalRows * UNIT_D;
  const nW = (totalCols - annexCols) * UNIT_W; // notch width  (missing top-right)
  const nD = (totalRows - annexRows) * UNIT_D; // notch depth

  // Polygon (XZ plane), bottom-left origin, then shift to centroid below
  const rawPts = [
    { x: 0,  z: 0  },
    { x: W,  z: 0  },
    { x: W,  z: D - nD }, // notch bottom-right
    { x: W - nW, z: D - nD }, // notch inner corner
    { x: W - nW, z: D  },
    { x: 0,  z: D  },
  ];
  const cx = W / 2, cz = D / 2;
  const points = rawPts.map(p => ({ x: p.x - cx, z: p.z - cz }));

  // Cells: include all cells in the bounding rectangle EXCEPT the notch
  const cells = [];
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      // notch occupies cols [annexCols..totalCols-1], rows [annexRows..totalRows-1]
      const inNotch = c >= annexCols && r >= annexRows;
      if (!inNotch) cells.push({ col: c, row: r });
    }
  }

  return { points, cells, cols: totalCols, rows: totalRows, totalW: W, totalD: D };
}

/**
 * Offset / step footprint.
 * Two side-by-side rectangles at different Z offsets, joined along their length.
 * frontCols = columns in the front section (z = 0 to frontDepthRows*UNIT_D)
 * backCols  = columns in the back section  (z = stepRows*UNIT_D to totalD)
 *
 *  ┌──────┐
 *  │ back │
 *  │      ├──────────┐
 *  │      │  front   │
 *  └──────┴──────────┘
 */
export function getOffsetFootprint(frontCols, frontRows, backCols, backRows) {
  const totalRows = frontRows + backRows;
  const totalCols = Math.max(frontCols, backCols);

  const fW = frontCols * UNIT_W;
  const bW = backCols  * UNIT_W;
  const fD = frontRows * UNIT_D;
  const bD = backRows  * UNIT_D;
  const totalD = fD + bD;

  // Build shape: back section at top (high Z), front at bottom
  // back is left-aligned, front is right-aligned for the "step" effect
  const rawPts = [
    { x: 0,   z: 0      },  // back bottom-left
    { x: bW,  z: 0      },  // back bottom-right
    { x: bW,  z: bD     },  // step inner corner
    { x: fW,  z: bD     },  // front top-right
    { x: fW,  z: totalD },  // front bottom-right
    { x: 0,   z: totalD },  // front bottom-left
  ];
  const cx = totalCols * UNIT_W / 2;
  const cz = totalD / 2;
  const points = rawPts.map(p => ({ x: p.x - cx, z: p.z - cz }));

  const cells = [];
  for (let r = 0; r < totalRows; r++) {
    const maxCols = r < backRows ? backCols : frontCols;
    for (let c = 0; c < maxCols; c++) {
      cells.push({ col: c, row: r });
    }
  }

  return { points, cells, cols: totalCols, rows: totalRows, totalW: totalCols * UNIT_W, totalD };
}

/**
 * Point in polygon check using ray casting (winding number or simple odd/even).
 * Checks if a point (px, pz) is inside the polygon defined by points.
 */
function isPointInPolygon(px, pz, points) {
  let isInside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, zi = points[i].z;
    const xj = points[j].x, zj = points[j].z;
    const intersect = ((zi > pz) !== (zj > pz)) &&
      (px < (xj - xi) * (pz - zi) / (zj - zi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

/**
 * Get the footprint for a building document from Firestore.
 * building.footprint_type: 'rectangle' | 'l_shape' | 'offset'
 * building.footprint_params: shape-specific params (see below)
 * building.custom_footprint_points: optional user-edited array of {x,z}
 */
export function getFootprint(building) {
  const { footprint_type = 'rectangle', footprint_params = {}, units_per_floor = 4, custom_footprint_points } = building;

  // 1. If we have custom points from the in-scene editor, use them directly
  if (custom_footprint_points && custom_footprint_points.length > 2) {
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    custom_footprint_points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const totalW = maxX - minX;
    const totalD = maxZ - minZ;
    const cols = Math.max(1, Math.ceil(totalW / UNIT_W));
    const rows = Math.max(1, Math.ceil(totalD / UNIT_D));
    const cx = totalW / 2;
    const cz = totalD / 2;

    const cells = [];
    // Test each cell centre to see if it falls inside the custom polygon
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Find world coord of cell centre
        const cellWorldX = c * UNIT_W + UNIT_W / 2 - cx;
        const cellWorldZ = r * UNIT_D + UNIT_D / 2 - cz;
        
        // Simple point-in-poly check
        if (isPointInPolygon(cellWorldX, cellWorldZ, custom_footprint_points)) {
          cells.push({ col: c, row: r });
        }
      }
    }
    
    // Fallback: if no cells ended up perfectly inside (e.g. shape is too small/narrow), 
    // just add a simple grid matching the bounding box cols/rows to avoid breaking.
    if (cells.length === 0) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
           cells.push({ col: c, row: r });
        }
      }
    }

    return { 
      points: custom_footprint_points, 
      cells, 
      cols, 
      rows, 
      totalW, 
      totalD 
    };
  }

  // 2. Otherwise fall back to the templates
  if (footprint_type === 'l_shape') {
    const { mainCols = units_per_floor, mainRows = 2, annexCols, annexRows = 1 } = footprint_params;
    return getLShapeFootprint(mainCols, mainRows, annexCols ?? Math.ceil(mainCols / 2), annexRows);
  }

  if (footprint_type === 'offset') {
    const { frontCols = units_per_floor, frontRows = 1, backCols, backRows = 1 } = footprint_params;
    return getOffsetFootprint(frontCols, frontRows, backCols ?? Math.ceil(frontCols * 0.6), backRows);
  }

  // Default: rectangle — single row of units_per_floor cols
  return getRectangleFootprint(units_per_floor);
}

/**
 * Cell → world position of the unit box centre on a given floor.
 */
export function cellToWorld(col, row, floor, fp) {
  const cx = fp.totalW / 2;
  const cz = fp.totalD / 2;
  const x = col * UNIT_W + UNIT_W / 2 - cx;
  const y = floor * UNIT_H + UNIT_H / 2;
  const z = row * UNIT_D + UNIT_D / 2 - cz;
  return { x, y, z };
}

export { UNIT_W, UNIT_D, UNIT_H, GAP };
