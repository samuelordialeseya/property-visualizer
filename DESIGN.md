---
name: Property Visualizer
description: Interactive low-poly 3D building visualizer and executive property management control deck
colors:
  ocean-authority: "#0b3860"
  blueprint-cobalt: "#2270b8"
  midnight-navy: "#051b30"
  ice-tint: "#e1ebf4"
  sky-focus: "#479de9"
  surface-canvas: "#f4f4f5"
  surface-card: "#ffffff"
  text-charcoal: "#18181b"
  text-muted: "#71717a"
  border-light: "#e4e4e7"
  obsidian-dark: "#0b0f13"
  obsidian-surface: "#141a21"
  obsidian-border: "#262f38"
  status-occupied: "#d98a53"
  status-overdue: "#e05c5c"
  status-vacant: "#6e8592"
  status-occupied-tint: "#fef3c7"
  status-overdue-tint: "#fee2e2"
  status-vacant-tint: "#f4f4f5"
typography:
  display:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ocean-authority}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.midnight-navy}"
  button-accent:
    backgroundColor: "{colors.blueprint-cobalt}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-accent-hover:
    backgroundColor: "{colors.sky-focus}"
  card-surface:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-standard:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-charcoal}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Property Visualizer

## Overview

**Creative North Star: "The Architectural Control Deck"**

Property Visualizer bridges two demanding worlds: executive financial property administration and interactive 3D/2D CAD architectural modeling. Rather than forcing a compromise between dense spreadsheet utilities and artistic 3D game engines, the system establishes a deliberate bifurcation called **The Dual-World Doctrine**. Administrative tasks, financial records, tenant ledgers, and property portfolios operate in a luminous, high-clarity mist canvas (`#f4f4f5`) anchored by pure white cards (`#ffffff`) and deep maritime blues (`#0b3860`). In contrast, the spatial layout visualizer operates inside an Obsidian Darkroom (`#0b0f13`) where architectural blueprints, low-poly structural geometry, and unit statuses glow with drafting-table precision.

The personality of the system is tactile, authoritative, and decisively functional. It rejects decorative generic SaaS trends—such as candy-colored neon gradients, giant low-opacity diffuse blurs that choke mobile GPUs, and unformatted enterprise table clutter. Every badge, border, and elevation tier delivers unmistakable real-world operational intelligence: tenancy health, payment punctuality, spatial coordinates, and physical structural boundaries.

### Key Characteristics:
- **Dual-World Clarity:** High-contrast daylight administration paired with an obsidian darkroom for 3D and 2D floorplan visualization.
- **Dual-Layer Elevation:** Flat, crisp 1px borders at rest that lift into subtle floating ambient cushions upon user interaction.
- **Typographic Duality:** Authoritative geometric headings (`Sora`) paired with an ultra-readable ergonomic grotesk (`Manrope`).
- **Tactile Kinetic Feedback:** Rapid 140ms GPU-accelerated micro-interactions with immediate scale feedback (`active:scale-95`).

---

## Colors

The palette balances maritime institutional authority with functional architectural signifiers and high-contrast status alerts.

### Primary
- **Ocean Authority** (`#0b3860`): The institutional anchor of the application. Used for primary navigation states, dominant action buttons, table headers, and brand identity marks.
- **Blueprint Cobalt** (`#2270b8`): The operational interactive accent. Reserved for active tab indicators, spatial tools, selection outlines, and primary layout design triggers.
- **Midnight Navy** (`#051b30`): Deep active and hover state for primary triggers. Communicates grounded mechanical weight.

### Secondary
- **Sky Focus** (`#479de9`): High-visibility electric blue used for focus rings, 3D room hover highlights, and active vector points.
- **Ice Tint** (`#e1ebf4`): Soft oceanic tint used as selection washes, hover chips, and active nav pill backdrops in light mode.

### Status Palette (The Tenancy Triad)
- **Warm Terracotta** (`#d98a53` / background: `#fef3c7` / text: `#92400e`): Designates **Occupied** units and active leases. Conveys warmth, security, and inhabited space.
- **Crimson Coral** (`#e05c5c` / background: `#fee2e2` / text: `#991b1b`): Designates **Overdue** rent, unresolved maintenance emergencies, or critical alerts. High-urgency, unambiguous warning.
- **Muted Slate** (`#6e8592` / background: `#f4f4f5` / text: `#52525b`): Designates **Vacant** inventory. Neutral and non-alarming, allowing occupied and overdue figures to dominate visual priority.

### Neutral
- **Canvas Mist** (`#f4f4f5`): Global background for light administrative screens, providing contrast against white cards.
- **Pure Surface** (`#ffffff`): The primary card and panel surface.
- **Text Charcoal** (`#18181b`): Dominant high-contrast text color for headings and data metrics.
- **Text Muted** (`#71717a`): Secondary metadata, unit dimensions, and timestamp labels.
- **Border Light** (`#e4e4e7`): Structural 1px division line throughout light cards and lists.
- **Obsidian Dark** (`#0b0f13`): Canvas background for 3D View and 2D Architectural Blueprint drafting mode.
- **Obsidian Surface** (`#141a21`): Opaque, GPU-friendly floating card and dock surface within the darkroom.

### Named Rules
**The Dual-World Doctrine.** Never bleed the light mist administrative canvas into the spatial 3D/2D visualizer, and never render dashboard data cards on dark canvas. Light is for accounting and operations; Obsidian is for spatial architecture.
**The 10% Cobalt Rule.** Blueprint Cobalt (`#2270b8`) is an intentional precision trigger. It must occupy ≤ 10% of any given administrative viewport to preserve its ability to draw the eye immediately.

---

## Typography

**Display Font:** Sora (fallback: `ui-sans-serif, system-ui, sans-serif`)  
**Body Font:** Manrope (fallback: `ui-sans-serif, system-ui, sans-serif`)  
**Monospace / Data Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`  

**Character:** `Sora` provides architectural structure, geometric precision, and executive weight to numbers and headers. `Manrope` delivers exceptional horizontal legibility for dense tenant records, financial statements, and technical room dimensions.

### Hierarchy
- **Display** (`font-weight: 800`, `font-size: 30px`, `line-height: 1.1`, `letter-spacing: -0.02em`): Metric hero totals on dashboard stat cards and major summary cards.
- **Headline** (`font-weight: 700`, `font-size: 20px`, `line-height: 1.25`, `letter-spacing: -0.01em`): Section titles, property names in detail headers, modal titles.
- **Title** (`font-weight: 600`, `font-size: 16px`, `line-height: 1.3`): Card titles, unit numbers in inspectors, sub-headers.
- **Body** (`font-weight: 400`, `font-size: 14px`, `line-height: 1.5`): General UI copy, tenant descriptions, transaction line items.
- **Body Bold / Metric** (`font-weight: 600`, `font-size: 13px–14px`): Financial currency amounts, unit status badges.
- **Label / Micro** (`font-weight: 700`, `font-size: 11px`, `letter-spacing: 0.08em`, `text-transform: uppercase`): Stat card category tags, table column headers, status indicator pills.

### Named Rules
**The Sora Numeric Rule.** All primary numerical metrics (financial totals, occupancy rates, room quantities) must render in `Sora` at `font-weight: 700` or `800` to preserve physical typographic presence.
**The Strict Uppercase Discipline.** Uppercase typography is restricted solely to metadata labels and status pills (`font-size: 10px–11px`). Standard navigation and action buttons must use Title Case or Sentence Case.

---

## Layout

The spatial model uses an administrative split-pane grid with a responsive persistent navigation column and fluid content frame.

- **Desktop (≥ 1024px):** Fixed or collapsed sidebar (`240px` expanded, `70px` collapsed) anchored on the left; fluid content area on the right.
- **Tablet / iPad Portrait (768px – 1023px):** Responsive sidebar width locked to exactly `25%` (`w-[25%] min-w-[190px] max-w-[240px]`), providing a guaranteed `75%` viewport to the main content pane.
- **Mobile (< 768px):** Sidebar hidden; fixed bottom navigation bar (`h-16`) with safe-area padding (`env(safe-area-inset-bottom)`).
- **Density & Spacing Rhythm:** Built upon a 4px baseline grid. Standard component gaps are 8px (`gap-2`), 12px (`gap-3`), and 16px (`gap-4`). Card internal padding standard is 20px (`p-5`).
- **Spatial Viewport Lock:** The 3D Canvas and 2D Blueprint floorplan are pinned with `absolute inset-0 overflow-hidden` inside a `flex-1 h-full min-h-0` container to prevent mobile WebKit height collapse.

---

## Elevation & Depth

The system uses a **Dual-Layer Precision** model. Rest surfaces remain flat, structured, and legible, utilizing tight contact outlines. User interaction triggers soft ambient diffuse depth.

### Shadow Vocabulary
- **Card Rest (`--shadow-card`):** `0 1px 3px 0 rgba(0,0,0,0.08), 0 6px 20px -3px rgba(0,0,0,0.10)` combined with `border: 1px solid rgba(228, 228, 231, 0.7)`. Provides crisp edge definition on low-contrast screens while floating slightly above `#f4f4f5`.
- **Card Hover (`--shadow-card-hover`):** `0 2px 6px 0 rgba(0,0,0,0.10), 0 12px 30px -5px rgba(0,0,0,0.14)`. Accompanied by a subtle `-translate-y-0.5` transform on desktop pointers.
- **Card Compact (`--shadow-card-sm`):** `0 1px 2px 0 rgba(0,0,0,0.07), 0 3px 8px -2px rgba(0,0,0,0.09)`. Used for list items, sub-cards, and floating HUD controls.
- **Modal / Floating Drawer (`--shadow-modal`):** `0 4px 12px 0 rgba(0,0,0,0.10), 0 24px 60px -10px rgba(0,0,0,0.20)`.

### Named Rules
**The Flat-At-Rest Doctrine.** Surfaces never float with heavy ambient shadows without an active state. Shadows indicate either an active elevation layer (modals, floating HUD docks) or direct user hover.
**The No-Blur Compositing Mandate.** Avoid `backdrop-filter: blur(...)` across mobile and iPad WebKit interfaces. Use solid, high-opacity dark surfaces (`#141a21`, `#161c22`) and clean white panels to guarantee 60fps frame rates.

---

## Shapes

- **Base Radius Hierarchy:**
  - Micro Elements / Status Pills / Sub-buttons: `rounded-lg` (8px).
  - Primary Buttons / Text Inputs / Select Menus: `rounded-xl` (12px).
  - Content Cards / Unit Cards / Inspector Sheets: `rounded-2xl` (16px).
  - System Dialogs / Setup Modals / Floating Onboarding Cards: `rounded-3xl` (24px).
  - Circular Indicators / Avatars / Collapse Toggles: `rounded-full` (9999px).
- **Form Silhouette:** Crisp, gentle curvature that softens industrial property data without drifting into bubbly consumer aesthetics.

---

## Components

### Buttons
- **Primary Action:** Solid Ocean Authority (`#0b3860`), white text, `rounded-xl` (12px), `px-4 py-2.5`, `font-semibold text-[13px]`. Hover deepens to Midnight Navy (`#051b30`).
- **Accent Action (Blueprint / 3D):** Blueprint Cobalt (`#2270b8`), white text, `rounded-xl` (12px), `px-3.5 py-1.5`. Hover brightens to Sky Blue (`#3186d6`).
- **Secondary / Ghost:** Pure white background, `border border-zinc-200`, text Charcoal (`#18181b`), hover to `bg-zinc-50`.
- **Interactive Feedback:** All clickable buttons feature `active:scale-95 transition-all duration-140`.

### Status Badges & Pills
- **Geometry:** Height 22px–24px, `rounded-full`, horizontal padding `px-2.5`, `font-bold text-[10px] uppercase tracking-wider font-['Manrope']`.
- **Occupied:** `bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]/30` with solid terracotta dot (`#d98a53`).
- **Overdue:** `bg-[#fee2e2] text-[#991b1b] border border-[#ef4444]/30` with solid coral dot (`#e05c5c`).
- **Vacant:** `bg-[#f4f4f5] text-[#52525b] border border-[#d4d4d8]` with neutral slate dot (`#6e8592`).

### Cards & Stat Blocks
- **Corner Style:** `rounded-2xl` (16px) with `border border-zinc-200/70`.
- **Background:** Pure White (`#ffffff`).
- **Header Structure:** Top row carries uppercase category label in `text-zinc-400 font-bold text-[11px]` and icon badge; body showcases 30px Sora bold metric.

### Form Inputs & Fields
- **Geometry:** Height 42px, `rounded-xl` (12px), padding `px-3.5 py-2.5`, `font-['Manrope'] text-[13px]`.
- **Border Treatment:** `border border-zinc-200 bg-white` transitioning to `border-[#2270b8] ring-2 ring-[#2270b8]/20` on focus.

### Spatial Control Dock (Obsidian HUD)
- **Geometry:** Centered pill dock, `rounded-2xl` (16px), `bg-zinc-900 border border-white/10 p-1.5`, text white.
- **Segmented Controls:** Inner pills `rounded-xl` (12px), inactive `text-zinc-400 hover:text-white`, active `bg-[#0F4C81] text-white shadow-sm`.

---

## Do's and Don'ts

### Do:
- **Do** maintain the strict visual split between the light mist ledger (`#f4f4f5`) and the obsidian 3D/2D CAD visualizer (`#0b0f13`).
- **Do** format all monetary amounts in `₱` (PHP) with standard digit-grouping commas (e.g. `₱15,000`).
- **Do** pair `Sora` for numbers/headers and `Manrope` for descriptive body copy and table data.
- **Do** enforce `active:scale-95` and 140ms duration on all interactive touch buttons for snappy tactile response.
- **Do** provide immediate 2D Architectural Blueprint fallback whenever WebGL 2 is unavailable on the client device.

### Don't:
- **Don't** use decorative multi-color gradients on buttons or navigation elements.
- **Don't** add heavy Gaussian `backdrop-blur-*` filters on mobile overlays where WebKit GPU frame rates drop.
- **Don't** display raw hexadecimal colors or unformatted timestamps to property managers.
- **Don't** allow 3D Canvas wrappers to use flexible percentage heights without `min-h-0` or `absolute inset-0`.
- **Don't** use amber or coral status colors for non-urgent decorative accents; reserve them strictly for real-world lease and payment states.
