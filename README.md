# Property Visualizer

An interactive 3D property management web application built with Next.js, React Three Fiber (Three.js), and Firebase.

## Key Features

- **Interactive 3D Visualizer**: Render and explore multi-story building designs in real time. Hover and select individual units to inspect their status and tenant data.
- **In-Scene Footprint Editor**: Reshape and customize buildings directly within the 3D canvas by dragging corner handles. Includes:
  - Snapping to a 0.5-unit grid.
  - Interactive self-intersection prevention.
  - Quick-start templates (Rectangle, L-shape, and Z-offset).
- **Tenant Management**: Assign tenants to units with photo uploads, lease details, and specific payment methods.
- **Financial Ledger & Tracker**: 
  - Record payments for monthly rent, maintenance fees, and late fees.
  - Track invoice receipts/screenshots uploaded directly to Firebase Storage.
  - Automated missed-month detection based on lease start dates and due dates.
- **Collapsible Responsive Workspace**: Modern minimalist layout featuring dynamic sidebar states that automatically collapse to maximize 3D viewing space.

## Tech Stack

- **Framework**: Next.js (React)
- **3D Graphics**: Three.js & React Three Fiber (R3F)
- **Database & Auth**: Firebase Firestore & Firebase Auth
- **Storage**: Firebase Storage (for tenant photos and receipts)
- **Styling**: Tailwind CSS & Vanilla CSS

## Setup Instructions

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Set up Firebase in `src/lib/firebase.js` using your Firebase config.
3. Configure Firestore rules to allow read/write access.
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.
