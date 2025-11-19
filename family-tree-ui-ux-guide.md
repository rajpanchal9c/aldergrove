# Family Tree App UI/UX Design Guide

## Overview

This guide provides comprehensive design recommendations for creating a clean, user-friendly family tree visualization that makes relationships instantly clear through spacing, lines, colors, and symbols.

---

## Core Design Principles

### 1. Visual Relationship Hierarchy

#### Partners/Couples
- **Visual container:** Place partners within a subtle rounded rectangle or bracket that connects them
- **Spacing:** Keep partners closer together (minimal horizontal gap, ~8-16px)
- **Color coding:** Use a soft connecting line or shared background tint (e.g., `var(--color-bg-1)` or `var(--color-bg-2)`)
- **Symbol:** Small heart icon or marriage date between them (optional, can toggle on/off)

#### Siblings
- **Horizontal alignment:** Same vertical level with equal spacing between nodes (~24-32px)
- **Visual connector:** Thin horizontal line above connecting to shared parent line
- **Spacing pattern:** Siblings grouped together with less space than between family branches
- **Color:** Siblings could share the same generational color stripe or background shade

#### Parent-Child Relationships
- **Vertical flow:** Parents above, children below (most intuitive)
- **Connection lines:** Clear vertical lines from parent(s) to a horizontal line, then down to children
- **Spacing:** Larger vertical gap between generations (~48-64px) than between siblings
- **Visual weight:** Thicker lines for direct lineage, thinner for extended family

---

### 2. Node Design (Individual Person Cards)

Keep cards **minimal and scannable**:

```
┌─────────────────┐
│   [Photo/Icon]  │  ← Avatar (circular for living, square for deceased)
│   John Smith    │  ← Name (bold, clear)
│   1950 - 2020   │  ← Dates (smaller, secondary color)
│   [Gender Icon] │  ← Optional: small gender indicator
└─────────────────┘
```

#### Card Specifications
- **Size:** ~120-150px width, ~140-180px height
- **Border:** Subtle border using `var(--color-card-border)`
- **Background:** `var(--color-surface)` with slight elevation (`box-shadow: var(--shadow-sm)`)
- **Border radius:** `var(--radius-lg)` for modern, friendly feel
- **Hover state:** Subtle lift effect (`box-shadow: var(--shadow-md)`)

---

### 3. Color System for Clarity

#### Generational Color Coding
Assign each generation a subtle background color from the design system palette:
- Generation 1 (oldest): `var(--color-bg-1)`
- Generation 2: `var(--color-bg-2)`
- Generation 3: `var(--color-bg-3)`
- Continue pattern through `--color-bg-8`
- This creates instant visual scanning ability

#### Status Indicators
- **Living:** Green accent border (`var(--color-success)`)
- **Deceased:** Gray/muted border (`var(--color-text-secondary)`)
- **Adoptive relationship:** Dashed line connector
- **Step-family:** Dotted line connector

---

### 4. Connection Lines Strategy

Use **orthogonal (right-angle) lines** rather than curves - they're cleaner and easier to parse:

```
        [Parent 1] ━━━┬━━━ [Parent 2]
                      │
            ┌─────────┼─────────┐
            │         │         │
        [Child 1] [Child 2] [Child 3]
```

#### Line Specifications
- **Direct lineage:** 2px solid, `var(--color-border)`
- **Marriage/partnership:** Horizontal connecting line, 2px solid
- **Adoptive:** 2px dashed
- **Step-family:** 1px dotted
- **Line color:** Use generation color or neutral `var(--color-border)`

---

### 5. Simplified Layout Options

For tree view, offer **two layout modes**:

#### A) Vertical Pedigree (Ancestry Focus)
- You at bottom, ancestors flowing upward
- Best for exploring "where you came from"
- More compact width-wise

#### B) Horizontal Fan (Descendant Focus)
- Root ancestor on left, descendants flowing right
- Better for large families with many children
- Easier to scan left-to-right (natural reading flow)

---

### 6. Interaction Patterns

#### Pan and Zoom
- Essential for large trees
- Use pinch-to-zoom on mobile
- Minimap in corner showing full tree with viewport indicator

#### Click to Expand/Collapse
- Branches can fold up to simplify view
- Visual indicator (chevron icon) on expandable nodes
- Smooth CSS transitions (`transition: all var(--duration-normal) var(--ease-standard)`)

#### Hover States
- Highlight the person's card
- Dim non-related family members
- Brighten direct lineage path

#### Quick Actions on Card
- Small icon buttons (edit, add child, add spouse) appear on hover
- Don't clutter card by default

---

### 7. Resource-Efficient Implementation

#### Use CSS Variables for Everything
- Colors, spacing, sizing all from design system
- Easy theme switching (light/dark mode)
- One source of truth

#### SVG for Connection Lines
- Dynamically generated based on node positions
- Clean scaling at any zoom level
- Minimal performance impact

#### Virtual Rendering
- Only render visible nodes + small buffer
- As user pans, dynamically load/unload nodes
- Critical for trees with 100+ people

#### Simple DOM Structure
```html
<div class="tree-container">
  <svg class="connection-lines"></svg>
  <div class="nodes-layer">
    <div class="person-card" data-id="1">...</div>
    <div class="person-card" data-id="2">...</div>
  </div>
</div>
```

---

### 8. Organic, Simple Aesthetic

#### Typography
- Use `var(--font-family-base)` for names
- `var(--font-size-base)` for primary text
- `var(--font-size-sm)` for dates/secondary info
- `var(--font-weight-semibold)` for names

#### Spacing Rhythm
- Consistent use of `var(--space-*)` variables
- Creates visual harmony
- 8px base grid system (8, 16, 24, 32, etc.)

#### Minimal Decoration
- Avoid gradients, shadows should be subtle
- Let content and relationships be the focus
- Clean, breathing room around elements

---

### 9. Mobile Considerations

- **Larger touch targets:** Minimum 44x44px for iOS compliance
- **Simplified view:** Show fewer generations by default on mobile
- **Bottom sheet:** Details panel slides up on tap instead of sidebar
- **Gesture-friendly:** Swipe to navigate siblings, pinch to zoom

---

### 10. Grid View Complement

Since you have a grid view too, make it **data-dense and filterable**:
- Table with columns: Name, Birth, Death, Relationship, Generation
- Sort by any column
- Filter by generation, living/deceased, surname
- Quick jump from grid to tree view (highlight person)

---

## Summary: Key Visual Rules

1. **Spacing = Relationship:** Closer spacing = closer relationship
2. **Lines = Connections:** Solid for blood, dashed for adoption, dotted for step
3. **Color = Generation:** Each generation gets a background tint
4. **Vertical = Hierarchy:** Parents above, children below
5. **Horizontal = Equality:** Siblings side-by-side
6. **Minimal cards:** Photo, name, dates - that's it
7. **Subtle UI:** Let the family structure be the star

---

## Implementation Notes

This approach is:
- **Simple to build:** Standard HTML/CSS with SVG lines
- **Visually clear:** Spacing and color do the heavy lifting
- **Scales well:** Virtual rendering + zoom/pan
- **Organic feel:** Respects natural family relationships through spatial proximity rather than complex decorations

---

## Design System Variables Reference

### Colors
- Surface backgrounds: `var(--color-surface)`, `var(--color-background)`
- Borders: `var(--color-border)`, `var(--color-card-border)`
- Text: `var(--color-text)`, `var(--color-text-secondary)`
- Status: `var(--color-success)`, `var(--color-error)`, `var(--color-warning)`
- Generational backgrounds: `var(--color-bg-1)` through `var(--color-bg-8)`

### Spacing
- Base units: `var(--space-8)`, `var(--space-16)`, `var(--space-24)`, `var(--space-32)`
- Cards: `var(--space-16)` for padding
- Siblings: `~24-32px` horizontal spacing
- Generations: `~48-64px` vertical spacing
- Partners: `~8-16px` horizontal spacing

### Typography
- Font family: `var(--font-family-base)`
- Sizes: `var(--font-size-base)`, `var(--font-size-sm)`
- Weights: `var(--font-weight-semibold)`, `var(--font-weight-medium)`

### Effects
- Shadows: `var(--shadow-sm)`, `var(--shadow-md)`
- Radius: `var(--radius-lg)`, `var(--radius-base)`
- Transitions: `var(--duration-normal)`, `var(--ease-standard)`

---

*Design guide for family tree visualization - focusing on clarity, simplicity, and organic user experience.*