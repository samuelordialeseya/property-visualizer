# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **independent landlords, boutique property owners, and real estate owner-operators** managing small-to-medium rental portfolios (typically 1 to 10 buildings, including residential apartment complexes, student dormitories, multi-unit townhomes, and mixed-use commercial spaces).

They operate without large corporate back-office departments, handling daily operations directly: inspecting physical buildings, onboarding new tenants, calculating monthly rent and utility split bills, logging maintenance repairs, and monitoring financial health.

## Product Purpose

Property Visualizer ("PropViz") provides an executive property management control deck that unites physical building architecture with operational lease management. It exists to replace disconnected spreadsheets, paper utility logs, and mental floorplan recall with an interactive digital twin.

Success means a property owner can open the app on desktop or iPad, immediately recognize which units are occupied, overdue, or vacant through intuitive 3D and 2D spatial layouts, generate accurate monthly utility statements, and verify rent payments within seconds.

## Positioning

**The Spatial 3D/2D Digital Twin for Independent Property Management.**

Unlike generic enterprise property management software (such as AppFolio or Yardi) that overwhelms independent owners with enterprise complexity, and unlike static spreadsheet trackers that obscure physical building context, Property Visualizer anchors all financial, tenant, and maintenance operations directly to the physical geometry of each property.

## Operating Context

- **Devices & Form Factors:** Desktop browsers for deep ledger entries and configuration; iPad / tablet devices (run as a standalone PWA via Home Screen shortcut) for on-site property walkthroughs, room inspections, and quick payment reviews.
- **Operational Rituals:**
  - Monthly billing cycle: calculating individual room electricity, water, dues, and rent, then attaching screenshot receipts upon payment.
  - Physical walkthroughs: inspecting rooms, tracking active maintenance issues with visual icons on room roofs/facades.
  - Tenant turnover: toggling unit vacancy status and drafting custom room dimensions or layouts.

## Capabilities and Constraints

### Confirmed Capabilities
- **Dual Spatial Visualization:**
  - Interactive 3D low-poly building visualizer and in-browser layout builder (Three.js r185 / React Three Fiber).
  - Interactive 2D Architectural Blueprint Floorplan with zero GPU overhead, touch pan/zoom, and scale grid.
- **Tenant & Unit Management:** Directory tracking lease dates, monthly rent, deposits, emergency contacts, and identification documents.
- **Financial Billing & Payment Proof:** Multi-category statement generation (rent, electricity, water, parking, dues, repairs) and screenshot receipt upload via Firebase Storage.
- **Maintenance Ticketing:** Issue submission, severity assignment, direct unit linkage, and resolution status tracking.
- **Staff & Payroll Records:** Tracking property caretakers, security, and maintenance personnel with payment schedules.
- **Document Vault:** Centralized storage for property deeds, building permits, and insurance files.

### Durable Constraints
- **Owner-Side Exclusivity:** The system is engineered strictly for the property owner and manager. No tenant portal, caretaker login, or public booking flows exist.
- **iPad / Tablet WebKit Performance Priority:** Must sustain 60fps on mobile Safari. Prohibits heavy multi-pass `backdrop-filter: blur(...)` compositing, clamps 3D canvas resolution to `1.5x` DPR, and utilizes GPU-accelerated `140ms` keyframe transitions.
- **Deployment & Architecture:** Next.js 16 static export (`output: 'export'`) served directly from Firebase Hosting with real-time Firestore database synchronization.

## Brand Commitments

- **Product Name:** Property Visualizer ("PropViz").
- **Core Identity Assets:**
  - Horizontal brand logo: `/branding/logo-horizontal.png`
  - App icon: `/branding/building-icon.png`
  - Favicon: `/branding/favicon.png`
- **Color Signifiers (The Tenancy Triad):**
  - Maritime Authority Blue (`#0b3860`) for structural branding.
  - Blueprint Cobalt (`#2270b8`) for operational actions.
  - Warm Terracotta (`#d98a53`) strictly for Occupied tenancy.
  - Crimson Coral (`#e05c5c`) strictly for Overdue accounts.
  - Muted Slate (`#6e8592`) strictly for Vacant units.

## Evidence on Hand

- **Production Codebase:** Next.js 16 (Turbopack), React 19, Tailwind CSS v4, Three.js 0.185, Firebase v12 (Firestore, Storage, Auth).
- **Live Deployment:** Accessible and operational at `https://property-visualizer-b04f3.web.app`.
- **Normative Design Specification:** Captured in `DESIGN.md` and `.impeccable/design.json`.

## Product Principles

1. **Spatial Truth Over Abstract Tables:** Physical buildings have spatial logic; locating a tenant or maintenance problem in 3D/2D space is significantly faster than parsing rows of text.
2. **Tactile Executive Autonomy:** Property owners should never need more than two taps to inspect a unit, record a payment receipt, or verify property occupancy.
3. **Field-Ready Reliability:** The app must load instantly and respond without stutter on field devices (tablets and mobile) during physical property visits.
4. **Strict Scope Discipline:** Optimize deeply for the property owner's daily oversight; reject features that belong to external tenant portals or enterprise accounting conglomerates.

## Accessibility & Inclusion

- High-contrast visual palette meeting WCAG AA requirements across both light mist ledger cards and obsidian drafting canvas.
- Minimum 42px touch hit targets across all buttons and controls for comfortable iPad and touch operation.
- Dual 3D and 2D mode guarantee: If a device lacks WebGL 2 hardware capability, the app automatically transitions to the 2D Architectural Blueprint view with zero data loss or feature degradation.
