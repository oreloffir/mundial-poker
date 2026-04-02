# Mundial Poker — Style Guide v1

**Maintainer:** Doni (Design) · **For:** Joni (Frontend implementation)
**Last updated:** April 1, 2026

This is the implementation reference. Every value here is pulled directly from the live codebase. When Figma says one thing and this document says another, ask Doni. When this document says one thing and you're not sure, don't guess — ask.

---

## 1. Color Tokens

All colors are CSS custom properties defined in `index.css`. Always use the variable, never the raw hex — it makes future theming changes trivial.

### Backgrounds (darkest → most elevated)

| Token             | Hex       | Usage                                            |
| ----------------- | --------- | ------------------------------------------------ |
| `--bg-deep`       | `#050a18` | Page background, full-screen base, deepest layer |
| `--bg-card`       | `#0d1424` | Card and panel backgrounds                       |
| `--bg-card-hover` | `#111b33` | Hover state on interactive cards                 |
| `--surface`       | `#141e35` | Elevated surfaces: modals, drawers, overlays     |

**Rule:** Never put `--bg-card` content directly on `--bg-deep` without a border or shadow — the contrast is too low. Always pair with `--border`.

### Gold — the primary brand color

| Token           | Hex       | Usage                                                    |
| --------------- | --------- | -------------------------------------------------------- |
| `--gold`        | `#d4a843` | Borders, labels, active state outlines, section headings |
| `--gold-bright` | `#f0cc5b` | Highlights: chip amounts, winning states, hover text     |
| `--gold-dim`    | `#8a6d1b` | Subtle borders, muted accents, hover border transitions  |

**Rule:** Gold is the only brand color. It carries all visual weight. Never use it at full opacity on light backgrounds — it disappears. On dark navy it glows.

### Greens — pitch and success

| Token           | Hex       | Usage                                                          |
| --------------- | --------- | -------------------------------------------------------------- |
| `--green-pitch` | `#1a6e3a` | Football pitch surface color, center circle                    |
| `--green-light` | `#27ae60` | Light green accents (rarely used directly)                     |
| `--green-glow`  | `#2ecc71` | Active turn ring, chip gain flash animation, winning team name |

### Action colors — semantic, not decorative

| Token      | Hex       | Used for                                                      |
| ---------- | --------- | ------------------------------------------------------------- |
| `--red`    | `#e74c3c` | Fold button, chip loss animation, error states, timer urgency |
| `--blue`   | `#3498db` | Call button, Small Blind badge                                |
| `--purple` | `#9b59b6` | Reserved — not in active use                                  |
| `--cyan`   | `#00d2ff` | Reserved — not in active use                                  |

**Rule:** These are semantic. Red = danger/fold. Blue = neutral action/call. Gold = raise/primary. Never swap them — players learn these associations.

### Text

| Token          | Hex       | Usage                                       |
| -------------- | --------- | ------------------------------------------- |
| `--text`       | `#f0f0f0` | Primary body copy, button labels            |
| `--text-dim`   | `#8899b0` | Secondary labels, helper text, descriptions |
| `--text-muted` | `#556680` | Placeholders, empty states, disabled labels |

### Borders and glows

| Token      | Value                      | Usage                                        |
| ---------- | -------------------------- | -------------------------------------------- |
| `--border` | `rgba(212, 168, 67, 0.15)` | Default border everywhere — subtle gold tint |
| `--glow`   | `rgba(212, 168, 67, 0.4)`  | Gold glow for focus and active states        |

---

## 2. Typography

Three fonts. Each has a specific, non-overlapping role. Don't substitute one for another.

| Font       | Class            | Weight range | Role                                                                      |
| ---------- | ---------------- | ------------ | ------------------------------------------------------------------------- |
| **Inter**  | _(body default)_ | 400–600      | UI copy, buttons, form labels, descriptions                               |
| **Outfit** | `.font-outfit`   | 700–900      | Numbers, chip amounts, scores, pot display, round counter, section labels |
| **Cinzel** | `.font-cinzel`   | 700          | Table header only ("World Poker Cup" / "MUNDIAL POKER")                   |

**Decision rule:**

- Is it a number or score? → Outfit
- Is it a dramatic brand moment? → Cinzel (use sparingly)
- Everything else → Inter

### Type scale in use

| Context                       | Size                                    | Weight  | Font      | Notes                                 |
| ----------------------------- | --------------------------------------- | ------- | --------- | ------------------------------------- |
| Table header title            | `1.1rem`                                | 700     | Cinzel    | Gold color, letter-spacing            |
| Section labels (`.wpc-label`) | `0.75rem`                               | 700     | Outfit    | Uppercase, `letter-spacing: 4px`      |
| Button text                   | `0.875rem`                              | 600     | Inter     | Desktop default via `--btn-font-size` |
| Button text (mobile)          | `0.75rem`                               | 600     | Inter     | Via `--btn-font-size` override        |
| Chip amounts / pot            | `0.875rem`–`1rem`                       | 800–900 | Outfit    | `font-black`, gold color              |
| Player username               | `10px`                                  | 600     | Inter     | Truncated, `max-w-20`                 |
| Team code on card             | `var(--card-code-size)` = `9px` / `7px` | 700     | Inter     | `letter-spacing: 0.05em`              |
| Fixture team code             | `8px`                                   | 700     | Inter     | On dark tile background               |
| Score / showdown total        | `10px`                                  | 900     | Outfit    | `font-black`                          |
| Timer countdown               | `0.75rem`                               | 700     | monospace | Color changes with urgency            |

### Letter spacing conventions

- `letter-spacing: 4px` — section labels (`.wpc-label`)
- `letter-spacing: 1.8px` — MP monogram on chip
- `letter-spacing: 0.05em` — team codes on cards
- No letter spacing — everything else

---

## 3. Spacing System

Defined as CSS variables in `:root`, overridden by the mobile landscape media query `@media (max-height: 500px) and (orientation: landscape)`.

| Token                  | Desktop     | Mobile landscape | What it controls                      |
| ---------------------- | ----------- | ---------------- | ------------------------------------- |
| `--avatar-size`        | `56px`      | `40px`           | Player avatar circle diameter         |
| `--card-w`             | `60px`      | `44px`           | Player hand card width                |
| `--card-h`             | `84px`      | `62px`           | Player hand card height               |
| `--card-flag-size`     | `1.5rem`    | `1rem`           | Flag emoji size on hand cards         |
| `--card-code-size`     | `9px`       | `7px`            | Team code text on hand cards          |
| `--fixture-tile-w`     | `72px`      | `56px`           | Fixture board tile width              |
| `--top-bar-h`          | `48px`      | `36px`           | Top navigation bar height             |
| `--top-bar-px`         | `20px`      | `8px`            | Top bar horizontal padding            |
| `--btn-padding`        | `10px 20px` | `6px 12px`       | Standard button padding               |
| `--btn-font-size`      | `0.875rem`  | `0.75rem`        | Standard button font size             |
| `--chip-btn-size`      | `36px`      | `28px`           | Chip denomination button size         |
| `--chip-btn-font-size` | `0.7rem`    | `0.575rem`       | Chip denomination label size          |
| `--preset-padding`     | `4px 10px`  | `2px 8px`        | Preset button padding (Min/½Pot/etc.) |
| `--preset-font-size`   | `0.625rem`  | `0.5625rem`      | Preset button font size               |

**Rule:** Always use these tokens for anything that needs to respond to mobile landscape. Don't hardcode pixel values for interactive elements.

### Spacing scale (Tailwind)

Tight, consistent use of Tailwind spacing. Common patterns found in the codebase:

- `gap-1` (4px) — between tight elements: team code + flag
- `gap-1.5` (6px) — between chip denomination buttons
- `gap-2` (8px) — standard inline gap: action buttons, badge items
- `gap-3` (12px) — between groups: timer + label
- `px-2.5 py-1` — standard pill badge padding
- `px-4 py-2` / `px-4 py-3` — panel padding (betting bar, top bar)
- `p-3` — compact card padding (game over overlay rows)
- `p-8` — large modal padding

---

## 4. Border Radius

Consistent use across the codebase. Don't introduce new values — use the closest existing one.

| Value            | Tailwind class   | Used for                                                     |
| ---------------- | ---------------- | ------------------------------------------------------------ |
| `9999px` / `50%` | `rounded-full`   | Avatars, chip badges, pill labels, timer bar, dots           |
| `16px`           | `rounded-2xl`    | Large panels, overlays, team cards (full), game over modal   |
| `14px`           | _(inline style)_ | Player action badge container                                |
| `12px`           | `rounded-xl`     | Action buttons (Fold/Check/Call/Raise/All In), raise confirm |
| `10px`           | `rounded-[10px]` | Hand card containers, player seat card area                  |
| `8px`            | `rounded-lg`     | Compact badges, team card compact variant, score chips       |
| `6px`            | `rounded-md`     | Mini hand cards in betting bar, tier badge                   |
| `4px`            | `rounded`        | Smallest chips: blind position label                         |

**Decision rule:**

- Modal / large panel → `rounded-2xl` (16px)
- Interactive button → `rounded-xl` (12px)
- Badge / pill → `rounded-full` or `rounded-lg` depending on height
- Card sub-element → `rounded-md` or `rounded-lg`

---

## 5. Glassmorphism

The signature overlay treatment for anything floating above the table. Used consistently — don't improvise new values.

### Standard overlay (modals, game-over, waiting screen)

```css
background: rgba(5, 10, 24, 0.85);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px); /* always include this */
border: 1px solid var(--border);
```

### Betting bar (bottom panel)

```css
background: rgba(5, 10, 24, 0.82);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border-top: 1px solid rgba(212, 168, 67, 0.12);
```

### Fixture tiles (floating on pitch)

```css
background: rgba(13, 20, 36, 0.4); /* pending */
background: rgba(13, 20, 36, 0.55); /* finished */
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.07); /* pending */
border: 1px solid rgba(212, 168, 67, 0.45); /* finished */
```

### Light glassmorphism (nav bar)

```css
background: rgba(5, 10, 24, 0.6);
backdrop-filter: blur(20px);
border-bottom: 1px solid var(--border);
```

**Rule:** Always include `-webkit-backdrop-filter` alongside `backdrop-filter` for Safari. Blur values: 8px (lightest) → 10px (fixture tiles) → 12px (modals) → 20px (nav/betting bar).

---

## 6. Shadow System

Shadows layer depth onto a dark UI. All shadows use `rgba(0,0,0,x)` for depth and `rgba(212,168,67,x)` for gold glow effects.

### Depth shadows (dark, no color)

| Context                     | Value                        |
| --------------------------- | ---------------------------- |
| Standard card / player seat | `0 4px 16px rgba(0,0,0,0.6)` |
| Fixture tile                | `0 8px 24px rgba(0,0,0,0.5)` |
| Chip badge                  | `0 2px 8px rgba(0,0,0,0.5)`  |
| Mini card (betting bar)     | `0 2px 6px rgba(0,0,0,0.4)`  |
| Action badge                | `0 4px 12px rgba(0,0,0,0.4)` |

### Gold glow shadows (ambient presence)

| Context                  | Value                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| Winner avatar pulse      | `0 0 24px rgba(212,168,67,0.4)`                                             |
| Winner banner            | `0 0 40px rgba(212,168,67,0.3), 0 0 80px rgba(212,168,67,0.1)`              |
| Primary button           | `0 8px 30px rgba(212,168,67,0.3)`                                           |
| Primary button hover     | `0 12px 40px rgba(212,168,67,0.45)`                                         |
| Gold glow text class     | `text-shadow: 0 0 20px rgba(212,168,67,0.4), 0 0 40px rgba(212,168,67,0.2)` |
| Gold glow subtle class   | `text-shadow: 0 0 12px rgba(212,168,67,0.3)`                                |
| Player seat ambient halo | `filter: drop-shadow(0 0 14px rgba(212,168,67,0.2))`                        |

**Rule:** The gold glow is used for states of importance — winner, active player, primary action. Don't apply it to neutral states. It loses meaning if overused.

---

## 7. Component Patterns

### `.wpc-card` — Standard panel / card

```css
background: linear-gradient(145deg, var(--bg-card), var(--surface));
border: 1px solid var(--border);
border-radius: 16px;
transition: all 0.4s ease;
/* Hover: */
border-color: var(--gold-dim);
transform: translateY(-4px);
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
/* Gold top bar appears on hover via ::before */
```

### `.wpc-btn-primary` — Gold gradient button

```css
background: linear-gradient(135deg, var(--gold), var(--gold-bright));
color: #000; /* black text on gold — always */
border-radius: 12px;
font-weight: 600;
box-shadow: 0 8px 30px rgba(212, 168, 67, 0.3);
/* Hover: translateY(-3px), stronger shadow */
/* Disabled: opacity 0.4, no transform */
```

### `.wpc-btn-ghost` — Outline button

```css
background: transparent;
color: var(--text-dim);
border: 1px solid var(--border);
border-radius: 10px;
/* Hover: color → --gold, border → --gold-dim, faint gold bg tint */
```

### `.wpc-label` — Section label

```css
font-family: Outfit;
font-size: 0.75rem;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 4px;
color: var(--gold);
/* ::before: 30px × 2px gold bar */
```

### Pill badge (chip balance, blind labels)

```css
background: rgba(5, 10, 24, 0.85);
border: 1px solid rgba(212, 168, 67, 0.25);
border-radius: 9999px;
padding: 4px 10px;
/* Chip icon (PokerChip component) + Outfit font-black number */
```

### Action badge (Fold/Call/Raise/Check/All In label that floats above player)

```css
/* Fold */
background: rgba(231, 76, 60, 0.15);
border: 1px solid rgba(231, 76, 60, 0.4);
color: var(--red);

/* Call */
background: rgba(52, 152, 219, 0.15);
border: 1px solid rgba(52, 152, 219, 0.4);
color: var(--blue);

/* Raise */
background: rgba(212, 168, 67, 0.15);
border: 1px solid rgba(212, 168, 67, 0.4);
color: var(--gold);

/* Check */
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.15);
color: var(--text);

/* All In */
background: linear-gradient(135deg, var(--gold), var(--gold-bright));
color: #000;
```

Animation: `badge-pop 2s ease-out forwards` (see animation section).

### Blind position badge (SB / BB)

```css
/* SB */
background: rgba(52, 152, 219, 0.18);
border: 1px solid rgba(52, 152, 219, 0.5);
color: var(--blue);

/* BB */
background: rgba(212, 168, 67, 0.18);
border: 1px solid rgba(212, 168, 67, 0.5);
color: var(--gold);

border-radius: 4px;
font-size: 9px;
font-weight: 700;
padding: 2px 6px;
```

### Active turn ring (around player avatar)

```css
/* Active player */
stroke: var(--green-glow);
stroke-width: 2.5px;
transition: stroke 0.3s;

/* Winner */
animation: gold-burst 1.2s ease-out infinite;
```

---

## 8. Animation System

All animations are CSS `@keyframes` defined in `index.css`. Apply via `animation:` inline style — never via class names that might conflict with Tailwind.

| Name            | Duration      | Easing                 | What it does                           | Where used                  |
| --------------- | ------------- | ---------------------- | -------------------------------------- | --------------------------- |
| `badge-pop`     | `2s`          | `ease-out forwards`    | Floats up and fades out                | Player action badges        |
| `card-deal`     | `0.3s`        | `ease-out both`        | Slides in from below + slight rotation | Hand cards entering         |
| `card-flip`     | `0.4s`        | `ease-out both`        | 3D Y-axis reveal                       | Showdown card flip          |
| `tile-reveal`   | `0.3s`        | `ease-out both`        | Scale + translate up                   | Fixture tiles revealing     |
| `pot-flash`     | `0.6s`        | `ease-in-out`          | Text flashes white                     | Pot number on bet added     |
| `gold-burst`    | `1.2s`        | `ease-out infinite`    | Pulsing gold ring                      | Winner avatar               |
| `score-pop`     | `0.4s`        | `ease-out both`        | Scale in from small                    | Showdown score badge        |
| `fade-in-up`    | `0.6s`        | `ease-out`             | Slides up from below                   | Winner banner entrance      |
| `chip-fly`      | Uses CSS vars | —                      | Flies to pot center                    | Chips flying to pot         |
| `chip-increase` | _(short)_     | —                      | Green flash scale                      | Chip count increase         |
| `chip-decrease` | _(short)_     | —                      | Red flash scale                        | Chip count decrease         |
| `blink`         | `0.7s / 1.5s` | `ease-in-out infinite` | Opacity pulse                          | Timer urgency, waiting dots |
| `hero-breathe`  | _(long)_      | `ease infinite`        | Subtle scale + opacity                 | Landing page ambient        |

### Transition conventions

- Fast micro-interactions: `0.1s` (chip press, button states)
- Standard UI transitions: `0.2s–0.3s` (color, border changes)
- Smooth panel transitions: `0.4s ease` (card hover, state changes)
- Slow atmospheric: `0.6s+` (banner entrance, overlay appear)

**Rule:** Never animate `width`, `height`, or `top/left` directly — use `transform` and `opacity` for performance. The exception is `max-height` for CSS-only drawers (acceptable for low-frequency toggles like the raise panel).

---

## 9. Responsive Breakpoints

Only one breakpoint matters for game layout:

```css
@media (max-height: 500px) and (orientation: landscape) {
  /* Mobile landscape — phone held sideways */
}
```

This targets phones in landscape mode (667×375 up to 932×430). It overrides the CSS token values in section 3. No other breakpoints are used in the game view.

**What changes on mobile landscape:**

- All token values shrink (see section 3)
- `.mobile-landscape-hide` elements are hidden (`display: none !important`)
- `.betting-bar-wrapper` padding is zeroed
- Table pitch resizes: `width: min(85vw, calc((100vh - 36px) * 1.6))`

**What does NOT change:** layout structure, component hierarchy, color, typography choices. Everything just scales down.

---

## 10. Do / Don't

### Color

- ✅ Use `var(--gold)` for any primary brand accent
- ✅ Use `--text-dim` for secondary labels
- ❌ Never hardcode `#d4a843` or any hex directly — always use the token
- ❌ Never use `--purple` or `--cyan` in new designs — they're reserved

### Typography

- ✅ Use Outfit for any number that matters (chips, scores, timer)
- ✅ Use Cinzel only for the game title
- ❌ Never use Cinzel for body copy or buttons
- ❌ Never mix Outfit and Inter in adjacent numbers

### Glassmorphism

- ✅ Always include `-webkit-backdrop-filter` alongside `backdrop-filter`
- ✅ Match blur level to layer depth (8px light → 20px heaviest)
- ❌ Never use `background: white` or any light color on game overlays
- ❌ Never use glassmorphism on elements smaller than ~120px wide

### Animations

- ✅ Use `transform` and `opacity` for all animations
- ✅ Keep game animations under 0.4s unless they're narrative moments (winner reveal)
- ❌ Never animate layout properties (`width`, `height`, `margin`, `padding`)
- ❌ Never add `animation: infinite` to elements a player looks at while deciding — it's distracting

### General

- ✅ Every interactive element needs a visible hover state
- ✅ Disabled states: always `opacity: 0.3–0.4` + `cursor: not-allowed`
- ❌ Never use pure `#ffffff` — use `var(--text)` (`#f0f0f0`) at most
- ❌ Never use pure `#000000` as text — only as text on gold buttons

---

## 11. Assets

| Asset            | File                                                        | Sizes                    | Usage                                          |
| ---------------- | ----------------------------------------------------------- | ------------------------ | ---------------------------------------------- |
| Poker chip       | `PokerChip.tsx` (SVG component)                             | Any size via `size` prop | Pot display, chip badges, denomination buttons |
| Chip PNG exports | `public/images/chip-64.png` / `chip-32.png` / `chip-16.png` | 64px / 32px / 16px       | Static img tags, meta tags, PWA icons          |
| Card back        | `public/images/card-back-hd.png`                            | 3 sizes: hd/md/sm        | Card back before reveal                        |
| Table background | `public/table.png`                                          | Full screen              | Stadium pitch, anchors everything              |

Re-export chips after design changes: `cd scripts && node export-chip-pngs.mjs`

---

_Questions or discrepancies → Doni via Orel._
