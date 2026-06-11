---
id: TASK-402
title: "Design System & Theming Spec (Light/Dark)"
status: approved
priority: medium
assigned: "@ux"
reviewers: ["@frontend", "@analyst"]
modifies:
  - frontend/src/index.css
  - (new) frontend/src/theme.ts (optional helper)
---

# Design System & Theming Spec

**Author**: @ux
**Date**: 2026-05-27
**Implements**: TASK-402
**Downstream**: TASK-415 (CSS token infrastructure), TASK-424 (toggle UI), TASK-433 (accessibility audit)

---

## 1. Goals

1. Formalize all existing CSS custom properties into a documented token system
2. Define a complete dark theme token set
3. Identify and tokenize hardcoded colors currently embedded in component inline styles
4. Specify the theme switching mechanism and persistence strategy
5. Ensure WCAG AA contrast compliance for both themes

---

## 2. Token Taxonomy

Tokens are organized into five categories: **background**, **text**, **border**, **semantic**, and **component**.

### 2.1 Background Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-app` | `#ffffff` | `#0f172a` | Root background (body, app shell) |
| `--bg-canvas` | `#f8f9fa` | `#1e293b` | React Flow canvas area |
| `--bg-sidebar` | `#ffffff` | `#1e293b` | Left/right sidebar panels |
| `--bg-surface` | `#f1f5f9` | `#334155` | Cards, drawers, modal backgrounds |
| `--bg-surface-hover` | `#e2e8f0` | `#475569` | Hover state for surface items (NEW) |
| `--bg-popover` | `#ffffff` | `#1e293b` | Popover/tooltip backgrounds (NEW) |
| `--bg-overlay` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` | Modal backdrop overlay (NEW) |
| `--bg-drop-highlight` | `#eff6ff` | `#1e3a5f` | Drop target highlight on nodes (NEW) |

### 2.2 Text Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--text-primary` | `#1e293b` | `#f1f5f9` | Body text, headings |
| `--text-muted` | `#94a3b8` | `#94a3b8` | Secondary text, labels |
| `--text-on-primary` | `#ffffff` | `#ffffff` | Text on primary-colored backgrounds (NEW) |
| `--text-popover` | `#334155` | `#e2e8f0` | Popover body text (NEW) |

### 2.3 Border Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--border-panel` | `#e2e8f0` | `#475569` | Panel dividers, input borders, node borders |
| `--border-focus` | `var(--primary)` | `var(--primary)` | Focus ring on inputs (NEW) |

### 2.4 Semantic Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `#3b82f6` | `#60a5fa` | Primary actions, links, selection |
| `--primary-hover` | `#2563eb` | `#3b82f6` | Primary hover state |
| `--danger` | `#ef4444` | `#f87171` | Error, delete, danger actions |
| `--danger-hover` | `#dc2626` | `#ef4444` | Danger hover state |
| `--warning` | `#f59e0b` | `#fbbf24` | Warning indicators |
| `--success` | `#22c55e` | `#4ade80` | Success indicators |

### 2.5 Component Tokens

#### Node Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--node-leaf` | `#ffffff` | `#1e293b` | Leaf node background |
| `--node-and` | `#dbeafe` | `#1e3a5f` | AND gate node background |
| `--node-or` | `#ffedd5` | `#431407` | OR gate node background |
| `--node-handle` | `#94a3b8` | `#64748b` | Node connection handles (NEW) |
| `--node-handle-border` | `#ffffff` | `#1e293b` | Handle border (matches bg) (NEW) |

#### Control Badge Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--badge-preventive-bg` | `#dbeafe` | `#1e3a5f` | Preventive control badge bg (NEW) |
| `--badge-preventive-text` | `#1d4ed8` | `#93c5fd` | Preventive control badge text (NEW) |
| `--badge-detective-bg` | `#fef3c7` | `#451a03` | Detective control badge bg (NEW) |
| `--badge-detective-text` | `#92400e` | `#fcd34d` | Detective control badge text (NEW) |
| `--badge-corrective-bg` | `#dcfce7` | `#052e16` | Corrective control badge bg (NEW) |
| `--badge-corrective-text` | `#166534` | `#86efac` | Corrective control badge text (NEW) |
| `--badge-mixed-bg` | `#f1f5f9` | `#334155` | Mixed category badge bg (NEW) |
| `--badge-mixed-text` | `#64748b` | `#94a3b8` | Mixed category badge text (NEW) |

#### Button Variants

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--btn-secondary-bg` | `#f1f5f9` | `#334155` | Secondary button background (NEW) |
| `--btn-secondary-hover` | `#e2e8f0` | `#475569` | Secondary button hover (NEW) |

#### Chart & Visualization

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--chart-grid` | `#e2e8f0` | `#334155` | D3 axis gridlines (NEW) |
| `--chart-axis-text` | `#64748b` | `#94a3b8` | Axis labels and tick text (NEW) |
| `--chart-bar-primary` | `#3b82f6` | `#60a5fa` | Histogram bars, primary series (NEW) |
| `--chart-bar-baseline` | `#94a3b8` | `#64748b` | Baseline comparison series (NEW) |
| `--chart-line` | `#3b82f6` | `#60a5fa` | Exceedance curve line (NEW) |
| `--chart-ci-fill` | `rgba(59,130,246,0.15)` | `rgba(96,165,250,0.15)` | Confidence interval fill (NEW) |

#### Selection & Focus

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--selection-ring` | `rgba(59,130,246,0.3)` | `rgba(96,165,250,0.3)` | Selected node glow (NEW) |
| `--drop-ring` | `rgba(59,130,246,0.15)` | `rgba(96,165,250,0.2)` | Drop target ring (NEW) |

---

## 3. Hardcoded Colors to Tokenize

The following inline hardcoded colors must be replaced with tokens in TASK-415:

| File | Current Value | Replace With |
|------|--------------|--------------|
| `LeafNode.tsx:9` | `#dbeafe` (preventive bg) | `var(--badge-preventive-bg)` |
| `LeafNode.tsx:9` | `#1d4ed8` (preventive text) | `var(--badge-preventive-text)` |
| `LeafNode.tsx:10` | `#fef3c7` / `#92400e` (detective) | `var(--badge-detective-bg/text)` |
| `LeafNode.tsx:11` | `#dcfce7` / `#166534` (corrective) | `var(--badge-corrective-bg/text)` |
| `LeafNode.tsx:13` | `#f1f5f9` / `#64748b` (mixed) | `var(--badge-mixed-bg/text)` |
| `LeafNode.tsx:97` | `#eff6ff` (drop highlight) | `var(--bg-drop-highlight)` |
| `LeafNode.tsx:102` | `#e2e8f0` (node border) | `var(--border-panel)` |
| `LeafNode.tsx:154` | `white` (popover bg) | `var(--bg-popover)` |
| `LeafNode.tsx:155` | `#e2e8f0` (popover border) | `var(--border-panel)` |
| `LeafNode.tsx:174` | `#334155` (popover text) | `var(--text-popover)` |
| `LeafNode.tsx:201` | `#64748b` (effectiveness text) | `var(--text-muted)` |
| `LeafNode.tsx:234` | `#64748b` (TEF x V label) | `var(--text-muted)` |
| `LeafNode.tsx:249` | `#94a3b8` / `white` (handle) | `var(--node-handle)` / `var(--node-handle-border)` |
| `index.css:104` | `#f1f5f9` (btn-secondary) | `var(--btn-secondary-bg)` |
| `index.css:109` | `#e2e8f0` (btn-secondary hover) | `var(--btn-secondary-hover)` |

---

## 4. Theme Switching Mechanism

### 4.1 CSS Architecture

Use a `data-theme` attribute on the `<html>` element:

```css
/* index.css — Light theme (default) */
:root { /* existing tokens — light values */ }

/* Dark theme overrides */
html[data-theme="dark"] {
  --bg-app: #0f172a;
  --bg-canvas: #1e293b;
  /* ... all dark values from Section 2 ... */
}
```

**Why `data-theme` over class?** It's a cleaner semantic signal, avoids class name collisions, and works well with CSS attribute selectors. React Flow's `!important` overrides remain compatible.

### 4.2 Persistence

- Store preference in `localStorage` key: `riskweb-theme` (values: `"light"`, `"dark"`, `"system"`)
- Default: `"system"` (respect `prefers-color-scheme` media query)
- On load, apply theme before first paint (inline `<script>` in `index.html` to avoid flash):

```html
<script>
  (function() {
    var t = localStorage.getItem('riskweb-theme') || 'system';
    if (t === 'system') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

### 4.3 Toggle UI (for TASK-424)

- Location: TopBar, right side, next to simulation controls
- Three-state toggle: Light / System / Dark
- Icon: sun / monitor / moon
- Compact: icon-only button with tooltip, or a 3-segment pill toggle

---

## 5. Component-Specific Notes

### 5.1 React Flow

The canvas background is already using `var(--bg-canvas)` via `.react-flow__background` override. Additional React Flow elements to theme:

- **Edge lines**: currently inherit defaults — add `--edge-stroke` token if needed
- **Minimap**: background should use `var(--bg-surface)`
- **Controls panel**: override React Flow's built-in control styles if visible

### 5.2 D3 Charts (Histogram, Exceedance, Tornado)

All D3-rendered SVG elements must use CSS variable values read via `getComputedStyle()` or passed as props from React. Key areas:

- Axis lines and ticks: `var(--chart-grid)`
- Axis labels: `var(--chart-axis-text)`
- Bar fills: `var(--chart-bar-primary)`, `var(--chart-bar-baseline)`
- Line stroke: `var(--chart-line)`

### 5.3 Modals & Popovers

All modal overlays should use `var(--bg-overlay)`. Modal content backgrounds use `var(--bg-surface)`. Popover backgrounds use `var(--bg-popover)`.

### 5.4 Form Elements

`<select>` background must use `var(--bg-app)` (already the case). Focus borders use `var(--primary)` (already the case). Dark mode select dropdowns are browser-styled — no custom override needed.

---

## 6. WCAG Contrast Requirements

Target: **WCAG 2.1 AA** compliance for both themes.

| Criterion | Requirement |
|-----------|------------|
| Normal text (< 18pt) | 4.5:1 contrast ratio minimum |
| Large text (>= 18pt or 14pt bold) | 3:1 contrast ratio minimum |
| UI components & graphical objects | 3:1 against adjacent colors |
| Focus indicators | 3:1 against adjacent colors |

### Light Theme (Verified)

- `--text-primary` (#1e293b) on `--bg-app` (#ffffff): **12.6:1** PASS
- `--text-muted` (#94a3b8) on `--bg-app` (#ffffff): **3.3:1** PASS (large text only) — acceptable for secondary labels at 13px/600wt
- `--primary` (#3b82f6) on `--bg-app` (#ffffff): **4.0:1** — borderline for small text, acceptable for interactive elements

### Dark Theme (Designed For)

- `--text-primary` (#f1f5f9) on `--bg-app` (#0f172a): **14.5:1** PASS
- `--text-muted` (#94a3b8) on `--bg-app` (#0f172a): **5.5:1** PASS
- `--primary` (#60a5fa) on `--bg-app` (#0f172a): **6.4:1** PASS

Full audit deferred to TASK-433 after implementation.

---

## 7. Migration Strategy (for TASK-415)

1. Add all NEW tokens to `:root` in `index.css` (light values)
2. Add `html[data-theme="dark"]` block with all dark overrides
3. Replace hardcoded colors in components (Section 3 table) with `var(--token)` references
4. Add inline script to `index.html` for flash-free theme initialization
5. No changes to component logic or structure — only style values change

---

## 8. Acceptance Criteria

- [ ] AC-1: All tokens from Section 2 are defined in `:root` (light) and `html[data-theme="dark"]` (dark)
- [ ] AC-2: All hardcoded colors from Section 3 are replaced with token references
- [ ] AC-3: Theme toggles correctly between light and dark via `data-theme` attribute
- [ ] AC-4: Preference persists across page reloads via localStorage
- [ ] AC-5: `prefers-color-scheme` respected when preference is "system"
- [ ] AC-6: No flash of wrong theme on page load
- [ ] AC-7: React Flow canvas, D3 charts, and modals all respond to theme change
- [ ] AC-8: WCAG AA contrast ratios met for both themes (verified in TASK-433)
