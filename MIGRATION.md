# Property Visualizer — Project Migration & AI Context Guide

> **Current Version:** 2.0 (Classic Ocean Blue Edition)  
> **Last Updated:** August 2026  
> **Purpose:** Comprehensive architecture, design system, state management, and migration history document to bring any AI agent or IDE up to date with the latest project codebase.

---

## 1. Executive Summary & Tech Stack

**Property Visualizer** is a Next.js single-page web application that blends real estate property management with an interactive **"Sims-style" 3D building visualizer and room layout editor** (Three.js / React Three Fiber). Landlords can create multi-floor buildings, edit room geometry in real-time 3D, and track occupancy, rent, overdue alerts, and expiring leases.

### Core Technologies
- **Framework:** Next.js 16 (React 19, Turbopack, App Router)
- **3D Engine:** Three.js (`three`), React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **Database & Auth:** Firebase Firestore (NoSQL) & Firebase Auth (`firebase`)
- **File Storage:** Firebase Storage (leases, receipts, documents)
- **Styling:** Tailwind CSS (Vanilla CSS design tokens in `src/app/globals.css`)
- **Iconography:** `lucide-react` (clean vector icons only, no raw emojis in UI)
- **Typography:** **Sora** (Headers & Hero Numbers) + **Manrope** (Body, Labels, Navigation & Buttons)

---

## 2. Branding & Design System Evolution

### Color Palette ("Pantone Classic Blue & Ocean Steel")
The app has fully transitioned away from legacy green/Verde to a **Pantone Classic Blue** (`#0F4C81`) design system:
- **Primary Navy / Deep Blue:** `#0b3860` (Main brand, primary buttons, headers)
- **Brand Accent Blue:** `#0F4C81` (Pantone Classic Blue — active tabs, key icons)
- **Interactive Ocean Blue:** `#2270b8` / `#3186d6` (Save buttons, slider accents, rotation controls)
- **Sky Highlight:** `#479de9` (Doors, badges, focus rings)
- **Surface Neutrals:** Pure white (`#ffffff`) on dashboard cards, slate-50 (`#fafafa`) background, dark glassmorphic overlays (`bg-zinc-900/85 backdrop-blur-xl border border-white/10`) for 3D HUD controls.

### Card Elevation & Visual Depth
- **Dashboard Cards:** `rounded-[16px]` or `rounded-[24px]` with `shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-zinc-100`.
- **3D HUD Elements:** Compact floating islands with `backdrop-blur-xl` and subtle white border highlights.

---

## 3. Database Architecture & Optimization

### Firestore Structure
1. **`buildings` (Collection)**:
   - `id`: Document ID
   - `user_id`: Owner's Firebase Auth UID
   - `name`: Property name (e.g., "Pacific Heights Tower")
   - `address`: Physical address string
   - `floors`: Number of floors (1–3+)
   - `units_per_floor`: Initial unit generation multiplier
   - `advanced_build_mode`: Boolean flag for 3D room builder
   - `created_at`: ISO timestamp
2. **`units` (Subcollection under `/buildings/{buildingId}/units`)**:
   - `id`: Document ID
   - `buildingId`: Parent building document ID
   - `user_id`: Owner's Firebase Auth UID
   - `unit_label`: Display label (e.g., "A1", "Unit 102")
   - `floor`: Floor index (1, 2, 3)
   - `status`: `"occupied"` | `"vacant"` | `"overdue"`
   - `monthly_rent`: Number (PHP / ₱)
   - `x`, `z`: 3D world space coordinate offsets
   - `width`, `depth`, `height`: 3D bounding box dimensions in meters
   - `rotation`: Y-axis rotation in degrees (`0`, `90`, `180`, `270`)
   - `roof_type`: `'flat'` | `'triangle'`
   - `tenant`: Object containing `{ name, email, phone, lease_start, lease_end, notes, documents }`
   - `payment_history`: Array of `{ id, month, year, amount, paid_at, receipt_url, payment_type }`

### Performance & Cost Optimization Rules
- **No Duplicate Snapshot Listeners:** Mutating documents from helper components (like `UnitPanel.jsx`) must use direct standalone mutation functions (`updateUnitDoc`, `addUnitDoc`, `deleteUnitDoc`) instead of calling listener hooks.
- **Client-Side Sorting:** Queries avoid compound index requirements by executing basic collection queries and sorting in memory with JavaScript `data.sort(...)`.
- **Drag In-Memory First:** 3D coordinates are dragged in local React state and only committed to Firestore on "Save Layout" to prevent hundreds of rapid writes.
- **Backward Compatibility:** Data fetching includes documents where `user_id === currentUserId || !user_id` so legacy demo properties are never lost.

---

## 4. Key Component Architecture

### A. View Routing (`src/app/page.js`)
State-driven Single Page App switching between:
1. `dashboard`: Portfolio summary & overview
2. `properties`: Full directory listing (`PropertiesList.jsx`)
3. `property_detail`: Single property management (`PropertyDetail.jsx`)
4. `3d_view`: Interactive 3D visualizer & layout builder (`Visualizer3D.jsx`)

### B. Dashboard Overview (`src/components/views/DashboardOverview.jsx`)
- **Top 4 Stat Cards:**
  1. `TOTAL PROPERTIES`: Count of buildings + `[N] Total Units` sublabel
  2. `ACTIVE TENANTS`: `[Occupied] / [Total]` ratio + `[N] Vacant` sublabel
  3. `OVERDUE RENT`: Total overdue units count + dynamic `All Paid 🟢` or `₱[Amount] Overdue 🔴` pill
  4. `EXPIRING LEASES`: Count of leases expiring in next 30 days + `Next 30 Days 🟡` pill
- **Split Layout Grid (50 / 50):**
  - **Left Card:** "My Properties" directory with internal scroll container (`max-h-[380px] overflow-y-auto`) and action buttons (3D View, Units).
  - **Right Column:**
    - "Est. Monthly Revenue" with collection progress meter.
    - **"Attention Needed" (Action Items Widget):** Dynamically surfaces high-priority operational items (Overdue payments → Expiring leases → Vacant units). Clicking an item transports the user to that property.

### C. 3D Visualizer & HUD (`src/components/Visualizer3D.jsx`)
Features a modern, unified 3-dock glassmorphic interface:
1. **Top Floating Island (`top-4 left-4 right-4`):**
   - Left: Back arrow button, building title, address, pencil info modal button, and active room count badge.
   - Right: "Edit Layout" toggle in View Mode; "Cancel" and "Save Layout" in Edit Mode.
2. **Bottom Control Dock (`bottom-5 left-1/2 -translate-x-1/2`):**
   - Segmented Camera Switcher: `Iso`, `Top`, `Front` views.
   - Edit Mode Builder Tools: `+ Room` and `+ L-Shape`.
   - View Mode Legend: Occupied (`#d98a53`), Overdue (`#e05c5c`), Vacant (`#6e8592`).
3. **Right Contextual Inspector (`top-20 right-4`):**
   - When Room Selected (Edit Mode): Editable Room Label, Rotate 90° button, Delete button, Floor dropdown (1-3), Roof Type dropdown (Flat/Triangle), and Height slider with live meter readout.
   - When No Room Selected: Subtle floating hint pill.

### D. Unit Drawer Panel (`src/components/UnitPanel.jsx`)
Slide-out drawer containing tenant lease dates, monthly rent tracker, timeline builder with missed-payment detection, and document attachment uploader via Firebase Storage.

---

## 5. Coding & Contribution Rules for AI / Developers
1. **Preserve Color Hierarchy:** Never hardcode emerald/green shades for core branding; use CSS variables or Tailwind tokens matching the Classic Blue system.
2. **Typography Consistency:** Apply `font-['Sora']` for numeric metrics and main headings; use `font-['Manrope']` for UI labels, tables, navigation, and sublabels.
3. **Optimized Firestore Mutations:** When building new subcomponents, import `updateUnitDoc` / `addUnitDoc` from `useFirestore.js` rather than creating new listener hooks.
4. **Pointer Events:** Floating HUD overlays in 3D views must use `pointer-events-none` on container wrappers and `pointer-events-auto` on clickable buttons to allow OrbitControls canvas navigation.
