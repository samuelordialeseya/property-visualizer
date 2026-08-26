# Property Visualizer — AI Context & Project Summary

This document serves as the primary technical summary of the Property Visualizer application for AI assistants, IDEs, and developers.

## 1. Core Concept & Tech Stack
- **Purpose:** Rental property management dashboard featuring an interactive **"Sims-style" 3D building creator & visualizer**. Landlords can construct multi-floor buildings room-by-room, adjust spatial dimensions in 3D, and track tenants, leases, and overdue rent.
- **Tech Stack:**
  - **Framework:** Next.js 16 (React 19, Turbopack, App Router)
  - **3D Graphics:** Three.js (`three`), React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
  - **Database & Auth:** Firebase Firestore (NoSQL) & Firebase Authentication
  - **Storage:** Firebase Cloud Storage
  - **Styling:** Tailwind CSS (Vanilla CSS design tokens in `src/app/globals.css`)
  - **Icons:** `lucide-react`
  - **Typography:** `Sora` (Headers, numbers, metrics) + `Manrope` (Body, labels, buttons, navigation)

## 2. Design Language & Brand Tokens
- **Theme:** Pantone Classic Blue & Ocean Steel
  - Primary Navy / Headers: `#0b3860`
  - Brand Accent Blue: `#0F4C81`
  - Interactive Action Blue: `#2270b8` / `#3186d6`
  - Sky Highlight: `#479de9`
- **Card Aesthetics:** Clean white cards (`#ffffff`) with lifted floating shadows (`shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-zinc-100`) and rounded corners (`rounded-[16px]` / `rounded-[24px]`).
- **3D HUD Aesthetics:** Modern dark glassmorphic dock styling (`bg-zinc-900/85 backdrop-blur-xl border border-white/10 shadow-2xl`).

## 3. Database Schema (Firestore)
- **`buildings` (Collection)**:
  - `id`, `user_id`, `name`, `address`, `floors`, `units_per_floor`, `advanced_build_mode`, `is_new`, `created_at`
- **`units` (Subcollection under `/buildings/{buildingId}/units`)**:
  - `id`, `buildingId`, `user_id`, `unit_label`, `floor`, `status` (`occupied`, `vacant`, `overdue`), `monthly_rent`, `x`, `z`, `width`, `depth`, `height`, `rotation`, `roof_type` (`flat` | `triangle`), `tenant`, `payment_history`

## 4. Navigation & Views (`src/app/page.js`)
Single Page App with state-driven view routing:
1. **Dashboard (`DashboardOverview.jsx`)**:
   - 4 Operational Stat Cards: `TOTAL PROPERTIES`, `ACTIVE TENANTS`, `OVERDUE RENT` (dynamic badge), `EXPIRING LEASES`.
   - "My Properties" list in a 50/50 split layout with internal scrolling (`max-h-[380px]`).
   - "Attention Needed" priority action widget (surfaces overdue units, expiring leases, and vacant units; clickable to navigate).
2. **Properties List (`PropertiesList.jsx`) & Detail (`PropertyDetail.jsx`)**:
   - Directory of properties, financial breakdown, and unit table with quick launch into 3D.
3. **3D Visualizer (`Visualizer3D.jsx`)**:
   - **Top Floating Island:** Back button, building title, address, info edit button, room count badge, and layout edit action button.
   - **Bottom Control Dock:** Segmented camera controls (Iso, Top, Front) and builder tool buttons (`+ Room`, `+ L-Shape`) / status legend.
   - **Right Contextual Inspector:** Active room inspector card (rotation, delete, floor, roof type, height slider) or minimal guidance pill.
4. **Unit Panel Drawer (`UnitPanel.jsx`)**:
   - Tenant lease management, payment timeline history with missed-month calculation, and document upload.

## 5. Key Architecture Rules for Modifying the Codebase
1. **Firestore Performance:** Always use standalone mutation functions (`updateUnitDoc`, `addUnitDoc`, `deleteUnitDoc` in `src/hooks/useFirestore.js`) for doc updates rather than creating duplicate `onSnapshot` listeners.
2. **Typography Rules:** Use `font-['Sora']` for numeric counters/titles and `font-['Manrope']` for UI labels, badges, and controls.
3. **3D UI Overlays:** Ensure HUD overlay containers use `pointer-events-none` with `pointer-events-auto` on actionable buttons to preserve OrbitControls interactivity.
