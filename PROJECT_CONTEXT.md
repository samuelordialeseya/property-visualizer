# Property Visualizer - AI Context & Project Summary

This document serves as a comprehensive summary of the Property Visualizer application. Use this to understand the app's architecture, data flow, navigation, and UI aesthetics.

## 1. Core Concept & Tech Stack
**App Purpose:** A rental property management dashboard featuring a **"Sims-style" 3D interactive building creator**. Users can build properties block-by-block (room-by-room), visualize them in 3D, and track occupancy and rent.
**Tech Stack:** 
- **Frontend Framework:** Next.js (React)
- **3D Engine:** `react-three-fiber` / `three` (Three.js wrapper)
- **Styling:** Tailwind CSS (Vanilla CSS variables in `globals.css`)
- **Database / Auth:** Firebase Firestore & Firebase Auth
- **Icons:** `lucide-react`
- **Typography:** `Sora` (Headers/Numbers) + `Manrope` (Body/Labels)

## 2. Design Language & Aesthetics
The application heavily utilizes the **"Verde Admin"** design system:
- **Colors:** Deep emerald greens (`#064e3b`, `#059669`) mixed with neutral zinc/slate backgrounds (`#fafafa` dashboard, `#f4f4f5` sidebar).
- **Cards:** White or off-white (`#fdfdfd`), heavily rounded (`rounded-[24px]`), with deep, soft, floating shadows (`shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)]`).
- **Typography Guidelines:**
  - Headers / Huge Stats: **Sora** (weights 600, 700)
  - Navigation / Lists / Body / Buttons: **Manrope** (weights 400, 500, 600)
- **Modals/Overlays:** Glassmorphism (blur filters with semi-transparent dark backgrounds and glowing accent orbs).

## 3. Database Schema (Firestore)
- **`buildings` (Collection)**: Contains metadata about the property.
  - Fields: `name`, `address`, `floors`, `units_per_floor`, `advanced_build_mode`, `is_new`, `createdAt`.
- **`units` (Subcollection inside each Building)**: Represents individual rooms/boxes in the 3D space.
  - Fields: `unit_label`, `status` (occupied, vacant, overdue), `monthly_rent`, `tenant`, `x`, `z`, `width`, `depth`, `height`, `rotation`, `roof_type` ('flat' or 'triangle').

## 4. Navigation Flow & Views (`page.js`)

The app acts as a Single Page Application (SPA) using a state-driven view router (`activeView` state in `page.js`).

### A. Sidebar
- Toggled via a collapse button. Contains navigation to: **Dashboard**, **Properties**, **Settings**.

### B. Dashboard View (`DashboardOverview.jsx`)
- **Top Header:** "Portfolio Overview" & the "+ NEW BUILDING" button.
- **Top Stats Row (4 Cards):** Shows Total Properties, Total Units, Vacant Units, and Overdue Renters. Features up/down trend arrows and large Sora numbers.
- **Left Panel ("Real-time Portfolio Activity"):** A list of all buildings with mini status pills (e.g., "5 Occupied", "12 Total Units").
- **Right Panels:** Est. Monthly Revenue card and an Occupancy Breakdown progress bar card.
- **Action Flow:** Clicking **"+ NEW BUILDING"** creates a blank building in Firestore and immediately jumps the user to the **3D View**.

### C. 3D View / Layout Editor (`Visualizer3D.jsx`)
This is the most complex component in the app.
- **Setup State:** If a building is brand new (no name), a **Floating Glass Setup Card** appears over the 3D canvas asking for "Building Name" and "Address". The user cannot build until they fill this out.
- **View Mode:** Users can orbit the 3D property. Clicking a room/unit opens the `UnitPanel.jsx` sidebar to manage tenant info, rent, and status (which changes the room's color: Green=Occupied, Red=Overdue, White/Gray=Vacant).
- **Edit Mode (Sims-Style Builder):** 
  - Triggered by clicking "Edit Building Layout".
  - A bottom HUD appears allowing the user to **"Add Room"**.
  - Rooms are spawned as 3D bounding boxes.
  - **Interactions:** Users can drag rooms around the X/Z grid using `useDrag`. They can use arrow keys to expand/shrink room dimensions (`width`, `depth`). 
  - **Roof Toggle:** Users can select a room and toggle its roof between a "Flat" slab or a classic "Triangle" pitched roof.
  - Clicking "Save & Exit Layout" writes all room coordinates, dimensions, and roof types back to Firestore.

### D. Properties View (`PropertiesList.jsx`) & Property Detail (`PropertyDetail.jsx`)
- List view of all buildings. Clicking one opens `PropertyDetail.jsx`, which shows building metadata and provides a button to jump into the `Visualizer3D` for that specific property.

## 5. Key Components to Know
- `Visualizer3D.jsx`: Renders the `<Canvas>` and Three.js lights/shadows. Contains the floating setup card and handles the switch between "View Mode" and "Edit Mode".
- `RoomLayoutEditor.jsx`: The actual Three.js component that renders the draggable boxes and handles raycasting for the Sims-style builder.
- `DashboardOverview.jsx`: The premium Verde-styled summary page.
- `UnitPanel.jsx`: The right-side slide-out panel for modifying specific tenant data for a selected room.
