import * as THREE from "three";

// Shared texture loader
let loader = null;
function getLoader() {
  if (!loader && typeof window !== "undefined") {
    loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
  }
  return loader;
}

// In-memory cache for loaded Three.js textures
const textureCache = new Map();

export const MATERIAL_CONFIGS = {
  concrete: {
    mapUrl: null,
    bumpUrl: "/textures/concrete_bump.jpg",
    roughness: 0.95,
    metalness: 0.0,
    bumpScale: 1.5,
  },
  brick: {
    mapUrl: "/textures/brick.jpg",
    bumpUrl: "/textures/brick_bump.jpg",
    roughness: 0.95,
    metalness: 0.0,
    bumpScale: 0.06,
  },
  wood: {
    mapUrl: "/textures/wood.jpg",
    bumpUrl: "/textures/wood_bump.jpg",
    roughness: 0.65,
    metalness: 0.0,
    bumpScale: 0.05,
  },
  metal: {
    mapUrl: "/textures/metal.jpg",
    bumpUrl: "/textures/metal.jpg",
    roughness: 0.28,
    metalness: 0.85,
    bumpScale: 0.04,
  },
  stucco: {
    mapUrl: null,
    bumpUrl: null,
    roughness: 0.85,
    metalness: 0.05,
    bumpScale: 0,
  }
};

/**
 * Loads and caches a texture with specified UV repetition.
 */
export function loadPhotoTexture(url, repeatX = 1, repeatY = 1, onLoad = null) {
  if (!url || typeof window === "undefined") return null;

  const key = `${url}_${repeatX.toFixed(2)}_${repeatY.toFixed(2)}`;
  if (textureCache.has(key)) {
    const cached = textureCache.get(key);
    if (onLoad) onLoad(cached);
    return cached;
  }

  const texLoader = getLoader();
  if (!texLoader) return null;

  const texture = texLoader.load(url, (loadedTex) => {
    loadedTex.wrapS = THREE.RepeatWrapping;
    loadedTex.wrapT = THREE.RepeatWrapping;
    loadedTex.repeat.set(repeatX, repeatY);
    loadedTex.needsUpdate = true;
    if (onLoad) onLoad(loadedTex);
  });

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);

  textureCache.set(key, texture);
  return texture;
}

/**
 * Returns photographic material maps and PBR parameters for a unit.
 */
export function applyMaterialToRef(mat, materialType, textureUrl, repeatX = 1, repeatY = 1, wallColor = null) {
  if (!mat) return;

  const isDefaultColor = !wallColor || wallColor === "#4a5a66";

  if (textureUrl) {
    // Custom uploaded texture
    const tex = loadPhotoTexture(textureUrl, repeatX, repeatY, (loaded) => {
      mat.map = loaded;
      mat.bumpMap = loaded;
      mat.bumpScale = 0.04;
      mat.color.set(isDefaultColor ? "#ffffff" : wallColor);
      mat.roughness = 0.85;
      mat.metalness = 0.05;
      mat.needsUpdate = true;
    });

    mat.map = tex;
    mat.bumpMap = tex;
    mat.bumpScale = 0.04;
    mat.color.set(isDefaultColor ? "#ffffff" : wallColor);
    mat.roughness = 0.85;
    mat.metalness = 0.05;
    mat.needsUpdate = true;
    return;
  }

  const config = MATERIAL_CONFIGS[materialType] || MATERIAL_CONFIGS.stucco;

  if (config.mapUrl || config.bumpUrl) {
    const diffuseTex = config.mapUrl ? loadPhotoTexture(config.mapUrl, repeatX, repeatY, (loaded) => {
      mat.map = loaded;
      mat.needsUpdate = true;
    }) : null;
    const bumpTex = config.bumpUrl
      ? loadPhotoTexture(config.bumpUrl, repeatX, repeatY, (loaded) => {
          mat.bumpMap = loaded;
          mat.needsUpdate = true;
        })
      : null;

    mat.map = diffuseTex;
    mat.bumpMap = bumpTex || diffuseTex;
    mat.bumpScale = config.bumpScale;
    mat.color.set(isDefaultColor ? (config.mapUrl ? "#ffffff" : "#4a5a66") : wallColor);
    mat.roughness = config.roughness;
    mat.metalness = config.metalness;
    mat.needsUpdate = true;
  } else {
    // Stucco / default plain color
    mat.map = null;
    mat.bumpMap = null;
    mat.color.set(isDefaultColor ? 0x4a5a66 : wallColor);
    mat.roughness = config.roughness;
    mat.metalness = config.metalness;
    mat.needsUpdate = true;
  }
}
