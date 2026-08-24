---
name: StudyHub Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1200px
  sidebar-width: 260px
  gutter: 24px
  margin-mobile: 16px
  stack-gap: 12px
---

## Brand & Style
The design system is engineered for high-density information management and cognitive clarity. It targets university students who require a tool that feels both academically rigorous and technologically advanced. 

The aesthetic is **Modern Minimalist**, drawing heavily from the "Linear" and "Notion" schools of thought: prioritizing functional utility, intentional whitespace, and a monochromatic foundation punctuated by a single, purposeful accent color. The emotional response should be one of "calm productivity"—reducing the anxiety of a heavy workload through a clean, predictable, and highly organized interface.

## Colors
The palette is intentionally restrained to keep the focus on student content.
- **Primary (#2563EB):** Used for primary actions, active states, and progress indicators. It represents focus and institutional trust.
- **Neutral/Surface:** A range of cool grays derived from Slate. Use `#F8FAFC` for sidebar backgrounds and secondary surfaces to create subtle contrast against the white `#FFFFFF` main workspace.
- **Borders:** A consistent `#E2E8F0` is used for all structural divisions, ensuring a crisp, "plumb" look without the heaviness of darker lines.

## Typography
The system employs a dual-font strategy. **Geist** is used for headings and UI labels to provide a precise, technical edge that appeals to the modern student. **Inter** is used for body text and long-form notes to ensure maximum readability during long study sessions.

Hierarchy is established through weight and letter-spacing rather than dramatic size shifts. Use `label-sm` for metadata (e.g., "Course Code" or "Due Date") to maintain a structured, systematic feel.

## Layout & Spacing
The layout uses a **Fixed-Fluid Hybrid** model. 
- **Sidebar:** A fixed 260px left-hand navigation bar using a subtle off-white background.
- **Main Canvas:** A fluid area with a maximum content width of 1200px to prevent line lengths from becoming unreadable.
- **Spacing Rhythm:** Based on a 4px baseline grid. Standard component spacing should utilize 12px (3 units) or 16px (4 units) to maintain a compact, "SaaS-like" density.
- **Mobile:** The sidebar collapses into a bottom navigation bar or a hamburger menu, and horizontal padding reduces to 16px.

## Elevation & Depth
Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.
- **Level 0 (Base):** The main background (`#FFFFFF`).
- **Level 1 (Subtle):** Sidebar and secondary panels (`#F8FAFC`) with a right-hand border of 1px `#E2E8F0`.
- **Level 2 (Cards):** Floating elements use a 1px border (`#E2E8F0`) and an extremely soft "Ambient Shadow": `0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.03)`.
- **Level 3 (Overlays):** Modals and dropdowns use a slightly more pronounced shadow and a 1px border to separate them clearly from the background canvas.

## Shapes
Following the modern SaaS aesthetic, the system uses a **Rounded (8px/0.5rem)** standard. 
- **Buttons and Inputs:** 8px (`rounded-md`).
- **Cards and Modals:** 12px (`rounded-lg`).
- **Outer Containers:** 16px (`rounded-xl`) when nested layouts are required.
This "soft-square" approach feels professional yet approachable, avoiding the clinical feel of sharp corners or the overly casual look of full pills.

## Components
- **Buttons:** Primary buttons use a solid `#2563EB` fill with white text. Secondary buttons use a white fill with a 1px border. The hover state for primary buttons should be a subtle darken (5-10%).
- **Inputs:** Fields should have a 1px border (`#E2E8F0`) and use a subtle light-gray background on focus to indicate the active workspace.
- **Cards:** Subject/Course cards are minimalist. They should contain a small icon or color-coded tag in the top right. Content should be left-aligned with a clear `headline-md` title.
- **Sidebar Items:** Use a 4px left-accent bar or a subtle background tint (`#F1F5F9`) for the active state.
- **Chips/Badges:** Small, low-contrast pills for status (e.g., "In Progress," "Completed"). Use light background tints of the status color (e.g., light green background with dark green text).
- **Progress Bars:** Use a thin 6px height with rounded ends to track study goals or course completion without dominating the visual space.