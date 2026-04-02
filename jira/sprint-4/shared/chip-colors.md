# Chip Denomination Colors — Doni's Spec
**From:** Doni
**For:** Joni (J16)
**Date:** April 2, 2026

---

## Decision: Keep Standard Poker Associations

White=5, Red=10, Green=25, Blue=50, Black=100, Gold=200.

Don't change these. Players know them. Swapping poker chip color associations adds cognitive load at exactly the moment they're making a bet. World Cup branding comes from the football panel pattern and MP monogram — not by inventing new chip colors.

What I'm fixing in Joni's default plan:
1. **Black chip (#1C1C1C on #050a18 bg)** — invisible. Use silver/charcoal instead.
2. **White chip (#E8E8E8)** — too clinical. Use warm ivory to match our navy/gold palette.
3. **Flat single hex values** — the SVG uses gradients. I'm giving you gradient stops that match the chip's existing construction.
4. **200/Gold** — already correct. Maps 1:1 to the current chip design. No changes needed.

---

## Component API

Add a `denomination` prop to `PokerChip.tsx`:

```tsx
interface PokerChipProps {
  readonly size?: number
  readonly className?: string
  readonly style?: CSSProperties
  readonly denomination?: 5 | 10 | 25 | 50 | 100 | 200  // NEW
}
```

If `denomination` is undefined or not passed, render the current design unchanged (backwards compatible — all existing uses of `<PokerChip />` in pot display, blind badges, etc. stay gold).

---

## Color Config

Add this map inside `PokerChip.tsx` (before the component function):

```tsx
interface ChipColors {
  rimHi: string    // rim gradient top (highlight)
  rimMid: string   // rim gradient middle (main color)
  rimLo: string    // rim gradient bottom (shadow)
  notch: string    // 8 edge notch rectangles
  bodyHi: string   // body gradient top (highlight)
  bodyLo: string   // body gradient base
  ring: string     // inner label ring stroke
  dotsBase: string // football dots & pentagon — use as rgba at 0.22/0.45 opacity
  mp: string       // MP monogram text
}

const CHIP_COLORS: Record<number, ChipColors> = {
  5: {
    rimHi:    '#F5F0E8',  // warm ivory highlight
    rimMid:   '#D8CCBA',  // parchment mid
    rimLo:    '#9E9585',  // warm gray shadow
    notch:    '#050a18',  // deep navy cut-outs (contrast against ivory rim)
    bodyHi:   '#1e2e54',  // keep standard navy body — ivory rim + dark body = readable
    bodyLo:   '#050a18',
    ring:     '#C8BEA8',  // muted ivory ring
    dotsBase: '#C8BEA8',  // ivory-toned dots
    mp:       '#E8DFC8',  // warm white MP text
  },
  10: {
    rimHi:    '#E85D50',  // bright red highlight
    rimMid:   '#C0392B',  // casino red main
    rimLo:    '#7B241C',  // deep red shadow
    notch:    '#050a18',  // navy cut-outs
    bodyHi:   '#1A0A0A',  // very dark red-tinted navy
    bodyLo:   '#050a18',
    ring:     '#C0392B',  // red ring
    dotsBase: '#C0392B',  // red-tinted dots
    mp:       '#F08080',  // light red MP text (contrast on dark body)
  },
  25: {
    rimHi:    '#4DBD74',  // bright green highlight
    rimMid:   '#27AE60',  // casino green main
    rimLo:    '#186A3B',  // deep green shadow
    notch:    '#050a18',  // navy cut-outs
    bodyHi:   '#091A0F',  // very dark green-tinted navy
    bodyLo:   '#050a18',
    ring:     '#27AE60',  // green ring
    dotsBase: '#27AE60',  // green dots
    mp:       '#80E0A0',  // light green MP text
  },
  50: {
    rimHi:    '#5DADE2',  // bright blue highlight
    rimMid:   '#2980B9',  // standard blue main
    rimLo:    '#1A5276',  // deep blue shadow
    notch:    '#050a18',  // navy cut-outs
    bodyHi:   '#050D1A',  // very dark blue-tinted navy (subtle)
    bodyLo:   '#050a18',
    ring:     '#2980B9',  // blue ring
    dotsBase: '#2980B9',  // blue dots
    mp:       '#7DC8F5',  // light blue MP text
  },
  100: {
    // "Black" chip — can't use true black on dark navy, use silver/pewter instead.
    // Players still read this as "the black chip" — silver at this size.
    rimHi:    '#C8D4E0',  // light silver highlight
    rimMid:   '#8090A4',  // pewter mid
    rimLo:    '#4A5464',  // dark slate shadow
    notch:    '#C8D4E0',  // LIGHT notches — reversed from others, silver shows on dark rim
    bodyHi:   '#1C2030',  // slightly lighter navy than bg-deep for visible body edge
    bodyLo:   '#0A0E18',
    ring:     '#8090A4',  // pewter ring
    dotsBase: '#8090A4',  // silver dots
    mp:       '#C8D4E0',  // silver MP text
  },
  200: {
    // Gold — this IS the current chip design. Map directly to existing gradient values.
    rimHi:    '#f5e080',
    rimMid:   '#d4a843',
    rimLo:    '#8a6210',
    notch:    '#050a18',
    bodyHi:   '#1e2e54',
    bodyLo:   '#050a18',
    ring:     '#d4a843',
    dotsBase: '#d4a843',
    mp:       '#f0d060',
  },
}
```

---

## How to Wire the Colors in the SVG

When `denomination` is provided, replace the hardcoded gradient stop values:

**Rim gradient** (was always gold):
```tsx
// Before:
<stop offset="0%" stopColor="#f5e080" />
<stop offset="45%" stopColor="#d4a843" />
<stop offset="100%" stopColor="#8a6210" />

// After (when denomination is set):
<stop offset="0%" stopColor={colors.rimHi} />
<stop offset="45%" stopColor={colors.rimMid} />
<stop offset="100%" stopColor={colors.rimLo} />
```

**Body gradient** (was always navy):
```tsx
// Before:
<stop offset="0%" stopColor="#1e2e54" />
<stop offset="100%" stopColor="#050a18" />

// After:
<stop offset="0%" stopColor={colors.bodyHi} />
<stop offset="100%" stopColor={colors.bodyLo} />
```

**Notch fill** (was always `#050a18`):
```tsx
// Before:
fill="#050a18"

// After:
fill={colors.notch}
```

**Inner ring strokes** (was always gold):
```tsx
// Before:
stroke="#d4a843"
// second ring:
stroke="rgba(212,168,67,0.18)"

// After:
stroke={colors.ring}
// second ring:
stroke={`${colors.ring}30`}   // 30 = ~18% in hex opacity
```

**Football dots + pentagon** (was always gold-tinted):
```tsx
// Before:
fill="rgba(212,168,67,0.22)"
stroke="rgba(212,168,67,0.45)"

// After — use a helper:
fill={hexToRgba(colors.dotsBase, 0.22)}
stroke={hexToRgba(colors.dotsBase, 0.45)}
```

**MP text** (was always `#f0d060`):
```tsx
// Before:
fill="#f0d060"

// After:
fill={colors.mp}
```

---

## The `hexToRgba` helper

You need this for the football dot opacity. Add it inside the file (not exported):

```tsx
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
```

---

## What the chips should look like

| Denom | Rim | Body | Notches | MP text | Reads as |
|-------|-----|------|---------|---------|----------|
| 5 | Warm ivory | Dark navy | Navy cut-outs | Warm white | "White chip" |
| 10 | Casino red | Near-black red | Navy cut-outs | Light red | "Red chip" |
| 25 | Casino green | Near-black green | Navy cut-outs | Light green | "Green chip" |
| 50 | Standard blue | Near-black blue | Navy cut-outs | Light blue | "Blue chip" |
| 100 | Pewter/silver | Dark charcoal | Silver (reversed) | Silver | "Black chip" |
| 200 | Gold (current) | Navy (current) | Navy (current) | Gold | "Gold chip" |

Note on the 100: The reversed notch treatment (light notches on dark rim rather than dark notches on light rim) is intentional — it creates the "silver striped" look that reads as a high-value dark chip. Real casino black chips often have a metallic-shimmer look. This achieves that.

---

## Visibility at Small Sizes

At `--chip-btn-size: 32px` (mobile) and the default `size={24}` inline usage:
- The rim is the only thing that communicates denomination — it's the prominent outer ring
- The body and inner details get compressed but the rim stays clear
- No additional simplification needed — the SVG scales cleanly

The `size={12}` used in the chip badge in `BettingControls.tsx` (the "your chips" display) doesn't need denomination coloring — that badge uses the generic chip icon (no denomination prop). Leave it as gold.

---

## Backwards Compatibility

Usage that should stay gold (no denomination prop passed):
- `<PokerChip size={12} />` in chip count badge — `BettingControls.tsx`
- `<PokerChip size={10} />` in `RoundResultsOverlay.tsx` header
- `<PokerChip size={12} />` in pot display — wherever PotDisplay renders it
- `chip-64.png / chip-32.png / chip-16.png` static PNG exports — not affected

Usage that needs denomination:
- `<PokerChip size={36} />` inside each chip denomination button in `BettingControls.tsx` `chipRow` — pass `denomination={denom}` where `denom` is the value from `CHIP_DENOMS = [5, 10, 25, 50, 100, 200]`

— Doni
