---
name: Plink Design System
colors:
  surface: '#0b1519'
  surface-dim: '#0b1519'
  surface-bright: '#313b40'
  surface-container-lowest: '#060f14'
  surface-container-low: '#131d22'
  surface-container: '#172126'
  surface-container-high: '#212b30'
  surface-container-highest: '#2c363b'
  on-surface: '#d9e4eb'
  on-surface-variant: '#c5c8b3'
  inverse-surface: '#d9e4eb'
  inverse-on-surface: '#283237'
  outline: '#8f937f'
  outline-variant: '#454838'
  surface-tint: '#b4d256'
  primary: '#bfde61'
  on-primary: '#283500'
  primary-container: '#a4c248'
  on-primary-container: '#3d4e00'
  inverse-primary: '#516600'
  secondary: '#7ad0ff'
  on-secondary: '#003549'
  secondary-container: '#00a9e3'
  on-secondary-container: '#003a50'
  tertiary: '#cbd3d7'
  on-tertiary: '#2a3235'
  tertiary-container: '#afb8bc'
  on-tertiary-container: '#41494c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cfef6f'
  primary-fixed-dim: '#b4d256'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#c3e8ff'
  secondary-fixed-dim: '#7ad0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#dbe4e8'
  tertiary-fixed-dim: '#bfc8cc'
  on-tertiary-fixed: '#151d20'
  on-tertiary-fixed-variant: '#40484b'
  background: '#0b1519'
  on-background: '#d9e4eb'
  surface-variant: '#2c363b'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin: 24px
---

## Brand & Style

This design system establishes a high-performance, minimalist aesthetic tailored for competitive team management. It balances the depth of a dark, tactical environment with the high-energy precision of cybernetic accents.

The visual direction is **Modern-Corporate meets Cyber-Minimalism**. It avoids the clutter of traditional gaming UIs in favor of structured data, ample negative space, and a clear functional hierarchy. The emotional response is one of focus, technical superiority, and organized strategy. 

Key stylistic pillars include:
- **Atmospheric Depth:** A deep navy foundation that feels expansive yet grounded.
- **Luminous Precision:** Vibrant cyan and green accents used sparingly for critical feedback and active states.
- **Tactile Softness:** Large radius corners that make complex management tools feel approachable and fluid.

## Colors

The palette is anchored in a dark-mode-first hierarchy. The primary "Active Green" is used for primary actions and confirmations, while the "Cyan Highlight" provides secondary emphasis and interactive states.

- **Background (Tertiary):** `#121A1D` – The base surface, providing a deep, low-glare canvas.
- **Surface (Neutral):** `#212B30` – Used for containers and cards to create subtle elevation.
- **Action (Primary):** `#A4C248` – A vibrant, desaturated lime for "Add," "Teams," and success states.
- **Accent (Secondary):** `#40C4FF` – A tech-forward cyan for selection markers, player avatars, and secondary buttons.
- **Border/Stroke:** Use high-transparency variants of the neutral color to define boundaries without adding visual weight.

## Typography

This design system utilizes **Hanken Grotesk** for its technical precision and modern geometric construction. The typeface bridges the gap between a grotesque and a more friendly humanist face, ensuring readability during intense gaming sessions.

- **Scale:** Headlines use tight letter-spacing for a bold, impactful look. 
- **Hierarchy:** Sub-headers and section titles (like "PLAYERS IN THIS TEAM") must be uppercase with increased tracking to differentiate them from interactive data.
- **Contrast:** High-contrast white is reserved for primary content; secondary labels use a 60% opacity variant of the neutral color.

## Layout & Spacing

The layout follows a **fluid grid** philosophy that prioritizes content density without feeling claustrophobic. 

- **Grid:** A 12-column grid is used for desktop views, collapsing to 4 columns on mobile.
- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Containers:** Main management modules should utilize a 24px internal padding (`md`) to allow the UI to breathe.
- **Safe Areas:** Interactive elements like chips and buttons should maintain at least a 12px (`sm`) gap to prevent mis-clicks.

## Elevation & Depth

Visual hierarchy is achieved through **low-contrast outlines** and tonal layering rather than heavy shadows.

- **Surface Levels:** The background is the lowest level. Cards and modals are one step lighter (`#212B30`).
- **Borders:** Every container features a 1px solid border. Use `rgba(255, 255, 255, 0.1)` for standard containers.
- **Active State Glow:** Primary buttons and active input fields may feature a very subtle, low-opacity outer glow matching their accent color to simulate a "powered-on" hardware feel.

## Shapes

The design system uses a generous **Rounded** shape language to soften the technical navy/green palette.

- **Standard Components:** Buttons, inputs, and cards use a `0.5rem` radius.
- **Pill Elements:** Tags, player chips, and toggle switches use a fully rounded `3rem` (pill) radius to distinguish them as discrete, draggable, or removable objects.
- **Iconography:** Icons should be housed in soft-square containers with consistent rounding.

## Components

### Buttons & Inputs
- **Primary Action:** Solid fill with `#A4C248` and dark text.
- **Secondary Action:** Ghost style with 1px border and 10% fill opacity.
- **Inputs:** Prominent containers with `#0D1316` backgrounds and bold 1px borders. Focused states must use the `#40C4FF` accent border.

### Chips & Tags
- **Pill-shaped:** All player tags and category chips must be pill-shaped.
- **Interactive:** Include a clear 'x' or '+' icon for removal/addition, using a contrasting background circle for the icon.

### Stepped Progress
- Use thick, horizontal bars for progress.
- Completed steps are filled with the primary green; current steps are cyan; upcoming steps are a translucent neutral.

### Lists & Tables
- Items should be separated by clear vertical spacing rather than divider lines.
- Hover states should trigger a subtle background tint change to `#2A363C`.