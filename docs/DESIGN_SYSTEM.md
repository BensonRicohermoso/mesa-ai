# UI DESIGN DIRECTION — MODERN MONOCHROME LUXURY EDITORIAL

This document defines the permanent, project-wide UI and design standards for **MESA-AI**. Every module — including Customer Ordering, Cashier POS, Kitchen Display System (KDS), Owner Dashboard, and AI Analytics — must adhere to these guidelines to ensure a cohesive, high-fashion editorial identity.

---

## 1. Overall Design Concept

Create a sophisticated, timeless, and minimalist visual identity.

The website and all terminal interfaces should communicate:

- **Sophistication and elegance**
- **Minimalist luxury**
- **Contemporary editorial design**
- **Timeless black-and-white aesthetics**
- **Understated premium quality**

*Think of a high-end fashion publication (Vogue, Kinfolk, Aesop) merged with contemporary luxury branding.*

> **Strict Prohibitions:** Avoid generic website templates, colorful Bootstrap-style cards, playful cartoon illustrations, excessive gradients, glassmorphism, and overly rounded components.

---

## 2. Color Palette

Strictly adhere to this monochromatic color palette. **Do not introduce accent colors (no blue, green, orange, or purple).**

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| **Primary Black** | `#050505` | Dramatic backgrounds, primary buttons, high-contrast containers |
| **Pure Black** | `#000000` | Deepest contrast, key typographic elements |
| **Primary White** | `#FFFFFF` | Crisp content cards, pure contrast text on dark panels |
| **Off-White** | `#F7F7F5` | Primary background canvas, archival editorial paper feel |
| **Light Gray** | `#EAEAEA` | Hairline borders, subtle tabular dividers, input borders |
| **Muted Gray** | `#858585` | Secondary metadata, letter-spaced uppercase eyebrows, inactive dots |

### Palette Usage Rules
- **Black backgrounds**: Dramatic, sophisticated hero sections, lock screens, and high-impact moments.
- **White & Off-White backgrounds**: Clean editorial reading layouts, dashboards, and tables.
- **Borders & Dividers**: Thin hairline borders (`1px solid #EAEAEA` or `1px solid rgba(255, 255, 255, 0.12)`).
- **No accent colors**: Statuses, badges, and highlights rely on typographic weights, letter-spacing, inverted fills, and hairline boxes instead of colored badges.

---

## 3. Typography Hierarchy

Typography is the cornerstone of this design system. We combine three complementary font styles:

### A. Elegant Editorial Serif (`Cormorant Garamond` / `Playfair Display`)
- **Usage**: Large, dramatic, high-contrast headlines, welcome greetings, and modal titles.
- **Styling**: `font-weight: 300` or `400`, tight letter-spacing (`-0.02em` to `-0.03em`), occasional italic emphasis (`em`).
- **CSS Token**: `var(--font-serif)`

### B. Clean Modern Sans-Serif (`Montserrat` / `Inter`)
- **Usage**: Navigation, body paragraphs, form labels, buttons, tabular data, and metadata.
- **Styling for Labels & Eyebrows**: Uppercase with wide letter-spacing (`letter-spacing: 0.18em` to `0.25em`), `font-size: 0.65rem` to `0.75rem`, `font-weight: 600`.
- **CSS Token**: `var(--font-sans)`

### C. Refined Calligraphic Script (`Pinyon Script`)
- **Usage**: Used sparingly for decorative sub-signatures and luxury accents (e.g. `MESA atelier`, `service as an art form`).
- **Styling**: Large (`1.8rem` to `2.4rem`), subdued opacity (`0.55` to `0.70`). Never use for body text.
- **CSS Token**: `var(--font-script)`

---

## 4. Layout and Composition

- **Intentional Negative Space**: Generous section padding (`clamp(2.5rem, 6vw, 6rem)`). Never crowd elements.
- **Hairline Geometry**: Thin dividers and borders (`1px solid var(--light-gray)`).
- **Asymmetrical & Split Grid**: Architectural balance with strong alignments (e.g., 60/40 cinematic splits).
- **Minimal Shadows**: Rely on sharp 1px borders and contrasting white/black surfaces. Avoid heavy fuzzy drop-shadows.

---

## 5. Component Patterns

### Buttons
- **Primary Button**: Solid `#050505` background, `#FFFFFF` text, `border: 1px solid #050505`. Hover inverts to white background with black text.
- **Secondary / Action Pill**: Transparent background, black text, `1px solid #050505`. Hover inverts to black background with white text.
- **Quiet Link Button**: Understated text with letter-spacing, hover underlines or shifts tone.
- **Typography on Buttons**: Always uppercase with wide tracking (`letter-spacing: 0.2em`).

### Form Fields & Inputs
- **Base Style**: Sharp rectangular shape, `border: 1px solid #EAEAEA`, background `#FFFFFF`.
- **Focus State**: `border-color: #050505` with a subtle `1px solid #050505` ring. No colorful focus outlines.
- **Labels**: Small uppercase sans-serif with wide tracking placed above the input.

### Modal & Dialogs
- **Overlay**: Dark luxury backdrop with frosted glass blur (`rgba(5, 5, 5, 0.78); backdrop-filter: blur(8px)`).
- **Dialog Box**: Sharp `#FFFFFF` card bounded by a crisp 1px hairline border.

### PIN Keypad (POS / Station Mode)
- **PIN Indicator**: Exactly 4 circular dots (`○ ○ ○ ○`). Empty is a 1px ring; filled is solid black `#050505`.
- **Keypad Buttons**: Tactile `#FFFFFF` or `#F7F7F5` squares with serif numbers and hairline borders. Auto-submit on 4th digit.

---

## 6. Implementation Reference (CSS Tokens)

These tokens are globally registered in `client/src/index.css` and `client/src/App.css`:

```css
:root {
  --font-serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --font-sans: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-script: 'Pinyon Script', cursive;

  --black: #050505;
  --pure-black: #000000;
  --white: #ffffff;
  --off-white: #f7f7f5;
  --light-gray: #eaeaea;
  --muted-gray: #858585;
  --dark-surface: #0a0a0a;
}
```

---

## 7. Golden Rule

> **The design should feel expensive through restraint, composition, photography, and typography — not through excessive decorative effects.**
