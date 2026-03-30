# High-End Editorial Design System: Executive Guidelines

## 1. Overview & Creative North Star: "The Kinetic Noir"
This design system is built upon the principle of **Kinetic Noir**. It combines the high-contrast authority of editorial print with the high-velocity energy of high-end mechanical engineering. We move beyond "Dark Mode" into a space of "Obsidian Depth," where the UI doesn't just sit on a screen—it feels machined, intentional, and premium.

**The Creative North Star:** To break the "SaaS Template" look, we utilize **Intentional Asymmetry** and **Tonal Layering**. We avoid the rigid 1px grid in favor of breathing room and depth. The "Premium Urgency" is conveyed through the sharp juxtaposition of deep blacks and a singular, vibrating yellow accent, suggesting a system that is both elite and perpetually in motion.

---

## 2. Color & Surface Architecture
We do not use color to "decorate." We use color to "architect."

### The "No-Line" Rule
Explicitly prohibit the use of 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts. 
*   **Implementation:** Place a `surface-container-low` section directly against a `surface` background. The eye should perceive the change in depth through the shift from `#0e0e0e` to `#131313`, not a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Each "inner" container should utilize a tier higher or lower than its parent to define importance:
*   **Base:** `surface` (#0e0e0e)
*   **Primary Containers:** `surface-container` (#1a1919)
*   **Elevated Elements:** `surface-container-high` (#201f1f)
*   **Interactive Overlays:** `surface-container-highest` (#262626)

### The "Glass & Signature" Rule
To elevate the experience, floating elements (modals, dropdowns) must use **Glassmorphism**. 
*   **Formula:** `surface-variant` (#262626) at 70% opacity + 20px Backdrop Blur.
*   **Signature Textures:** For Hero CTAs, do not use flat colors. Apply a subtle linear gradient from `primary` (#ffe484) to `primary-container` (#fdd404) at a 135-degree angle to provide "visual soul."

---

## 3. Typography: The Editorial Voice
Typography is our primary tool for authority. We pair the industrial precision of **Satoshi** (referenced here as *Space Grotesk* per token mapping) with the modern approachability of **Plus Jakarta Sans**.

*   **Display & Headlines (Space Grotesk):** Use `display-lg` and `headline-lg` with tight letter-spacing (-0.02em) to create a "Block Editorial" feel. These should always be `on-surface` (#ffffff) to maximize contrast against the obsidian background.
*   **Body & Labels (Plus Jakarta Sans):** Designed for high readability. Use `body-md` for standard text and `label-md` for metadata. 
*   **The Hierarchy Strategy:** A 4:1 scale ratio should be maintained between Headlines and Body text to ensure the "Premium Urgency" remains clear. Large type isn't just for reading; it's a structural element of the layout.

---

## 4. Elevation, Depth & Ghost Borders
We reject traditional drop shadows. We favor "Atmospheric Depth."

*   **The Layering Principle:** Stacking `surface-container-lowest` on `surface-container-low` creates a "natural lift."
*   **Ambient Shadows:** If an element must float (e.g., a floating action button), use an extra-diffused shadow: `offset: 0 20px`, `blur: 40px`, `color: rgba(0,0,0, 0.4)`. Never use pure grey shadows; always tint them with a hint of the background color.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use a "Ghost Border": `outline-variant` (#494847) at **15% opacity**. A 100% opaque border is considered a design failure in this system.

---

## 5. Component Signature Styles

### Buttons: The Kinetic Engine
*   **Primary:** `primary` background with `on-primary` (Black) text. No border. Corner radius: `lg` (1rem).
*   **Secondary:** Ghost style. `outline` border at 20% opacity. Text in `primary`.
*   **State:** On hover, the primary button should transition to `primary-dim` (#edc600) with a subtle 2px vertical lift.

### Cards & Lists: The Negative Space Rule
*   **Cards:** Forbid divider lines. Separate content using the Spacing Scale (e.g., `spacing-8` or `spacing-10`).
*   **Container:** Use `surface-container-low` with a `lg` (1rem) corner radius.
*   **Interactive Cards:** On hover, shift the background to `surface-container-high`.

### Badges: Semantic Mutedness
Unlike the high-contrast CTAs, status badges use "Tonal Mutedness."
*   **Success:** Background `tertiary-container` (Muted Lime) with `on-tertiary` text.
*   **Danger:** Background `error-container` (Deep Red) with `on-error-container` text.
*   **Logic:** This ensures semantic information doesn't compete for attention with the primary "Go" Yellow.

### Input Fields: The Recessed Look
*   **Default:** Background `surface-container-lowest`, no border, `md` (0.75rem) radius.
*   **Focus:** 1px "Ghost Border" using `primary` at 40% opacity. 

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace the Void:** Use large amounts of `surface` (#0e0e0e) to let the Yellow accent "scream."
*   **Asymmetric Layouts:** Align text to the left but allow imagery or accents to bleed off the right edge of the grid.
*   **Tonal Transitions:** Use background color shifts to guide the user’s eye down the page.

### Don't:
*   **Don't use 1px Borders:** Never use them to separate list items or sections. Use space or color shifts.
*   **Don't use Pure Grey:** Ensure all "greys" are derived from the `surface` tokens to maintain the "Kinetic Noir" warmth.
*   **Don't Over-Glow:** Avoid neon "outer glow" effects on Yellow elements. Keep the edges crisp and machined.
*   **Don't Center Everything:** Centered layouts feel like templates. Use staggered, left-aligned typography to maintain the editorial edge.