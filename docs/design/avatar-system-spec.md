# Mundial Poker — Avatar System Spec

**Author:** Doni (Design)
**For:** Joni (Frontend)
**Date:** April 3, 2026
**Status:** Ready for implementation

---

## Overview

The avatar is the player's identity on the table. Every piece of game state — whose turn it is, who won, who folded, who is a bot — communicates through the avatar. This spec defines every visual state, every size variant, the YOU/bot indicator system, and the photo upload slot for future sprints.

The avatar sits inside `PlayerSeat.tsx`. No other component renders an avatar.

---

## 1. Size Variants

Three contexts. Each has its own size token or hardcoded value.

| Context                     | Size   | Token / Source                                   | Where                                                    |
| --------------------------- | ------ | ------------------------------------------------ | -------------------------------------------------------- |
| **Seat — desktop**          | `56px` | `var(--avatar-size)`                             | `PlayerSeat.tsx` — the main table                        |
| **Seat — mobile landscape** | `40px` | `var(--avatar-size)` (overridden in media query) | `PlayerSeat.tsx` — the main table                        |
| **Score card**              | `48px` | Hardcoded — not responsive                       | `RoundResultsOverlay.tsx` (retired per DN1) / future use |
| **Mini**                    | `24px` | Hardcoded                                        | Future: lobby player list, chat, leaderboard             |

**Rule:** Never use a size other than these four. Don't introduce a `32px` avatar — it belongs to neither group.

### Timer ring sizing

The SVG timer ring in `PlayerSeat.tsx` is `RING_SIZE = 68, RING_RADIUS = 28`. This is designed for the 56px avatar. On mobile (40px avatar), the ring still renders at 68px and scales via `scale(var(--ring-scale))`.

Add to `:root`:

```css
--ring-scale: 1;
```

Add to mobile landscape block:

```css
--ring-scale: 0.71; /* 40 / 56 = 0.714 — ring hugs avatar at both sizes */
```

The transform in `PlayerSeat.tsx` already has `scale(var(--ring-scale))` from J19. If it doesn't, add it to the SVG `style` attribute:

```tsx
transform: 'translate(-50%, -50%) scale(var(--ring-scale)) rotate(-90deg)',
```

---

## 2. Initials Rendering

The avatar circle contains the player's initials as text. Current implementation: `player.username.substring(0, 2).toUpperCase()`.

**Rules:**

- Always 2 characters. If the username is 1 character, show 1 character — don't pad.
- Font: `font-outfit font-black text-sm` (current, keep as-is)
- Color: `avatarColor` from `getAvatarColor(username)` — same color as the border and background tint
- When `dimmed` (folded or eliminated): color becomes `var(--text-muted)`

**Future: photo upload slot**

When a player uploads a photo, the initials are replaced by an `<img>` tag. The circle structure doesn't change — only the content inside:

```tsx
{
  player.avatarUrl ? (
    <img
      src={player.avatarUrl}
      alt={player.username}
      className="w-full h-full object-cover rounded-full"
      draggable={false}
    />
  ) : (
    player.username.substring(0, 2).toUpperCase()
  )
}
```

The border, ring, and all state effects remain on the outer div — they work regardless of whether the interior shows initials or a photo. **No prop changes needed.** When `avatarUrl` is added to `TablePlayer`, it just renders.

---

## 3. Avatar Color System

`getAvatarColor(username)` returns a hex color. This color is used in three places:

| Usage                      | Value                            | Where              |
| -------------------------- | -------------------------------- | ------------------ |
| Background gradient top    | `${avatarColor}33` (20% opacity) | `background` style |
| Background gradient bottom | `${avatarColor}11` (7% opacity)  | `background` style |
| Default border             | `${avatarColor}44` (27% opacity) | `border` style     |
| Initials text              | `avatarColor` (100%)             | `color` style      |

This gives each player a subtly distinct color identity without adding noise. The dimmed state (opacity-25 + grayscale) deliberately overrides the color — it's intentional desaturation when a player is out of the round.

---

## 4. Visual States

States are not mutually exclusive. A player can be **active + current user** simultaneously. A bot is **never** the current user. The winner is never folded. The state priority order (what takes visual precedence) is:

**Winner > Active turn > Scored > Folded/Eliminated > Default**

### State 1 — Default

No indicator. Player is seated, waiting.

```
Border: 2.5px solid ${avatarColor}44
Box-shadow: 0 4px 12px rgba(0,0,0,0.5)
Background: linear-gradient(145deg, ${avatarColor}33, ${avatarColor}11)
Timer ring: hidden
```

### State 2 — Active Turn

The turn timer ring appears. The seat background gets a faint green tint (already on the outer seat container, not the avatar circle).

```
Border: 2.5px solid ${avatarColor}44  ← unchanged; ring does the active signaling
Timer ring: visible, color progresses green → gold → red
Ring colors:
  > 10s remaining  → var(--green-glow)  #2ecc71
  5s–10s remaining → var(--gold)        #d4a843
  < 5s remaining   → var(--red)         #e74c3c
```

The outer seat container (the div wrapping the whole seat) uses:

```tsx
background: isActive ? 'rgba(46,204,113,0.05)' : 'transparent'
```

This is the active-turn signal for the seat area. The ring does the time signal.

### State 3 — Current User (YOU)

The current user gets a distinct border, independent of game phase.

```
Border: 2.5px solid var(--gold-dim)   ← #8a6d1b
```

The YOU badge (see Section 6) appears below the avatar as a pill label, replacing the blind badge row when no blind is assigned. See the positioning rules in Section 6.

### State 4 — Folded

The player folded this round. Their avatar dims to signal they're watching, not playing.

```
className: opacity-25 grayscale    ← applied via dimmed flag
```

`dimmed = (isFolded || player.isEliminated) && !inShowdown`

The "Folded" text indicator below remains at `color: var(--red), opacity: 0.6`. It's separate from the avatar — no change needed there.

### State 5 — Winner

The avatar glows gold and pulses. Maximum visual weight — this is the moment.

```
Border: 2.5px solid var(--gold)
Box-shadow: 0 0 24px rgba(212,168,67,0.4)
Animation: gold-burst 1.2s ease-out infinite
```

`gold-burst` keyframes (in `index.css`):

```css
@keyframes gold-burst {
  0% {
    box-shadow: 0 0 12px rgba(212, 168, 67, 0.4);
  }
  50% {
    box-shadow:
      0 0 32px rgba(212, 168, 67, 0.7),
      0 0 60px rgba(212, 168, 67, 0.2);
  }
  100% {
    box-shadow: 0 0 12px rgba(212, 168, 67, 0.4);
  }
}
```

The outer seat container uses:

```tsx
background: 'rgba(212,168,67,0.08)'
border: '1px solid var(--gold-dim)'
```

### State 6 — In Showdown (Scored)

Score results are visible. The `inShowdown` flag is `!!scoreResult`.

No change to the avatar circle itself in this state — the `SeatScorePopup` appears above the seat and `{scoreResult.totalScore} PTS` appears below the chip badge. The avatar stays at its default/winner state border.

**Important:** When `inShowdown` is true, `dimmed` is forced false even if the player is folded or eliminated. Folded players who stayed to showdown must be visible during reveals.

### State 7 — Eliminated

`player.isEliminated === true`. Treated identically to folded (`dimmed = true`) except no "Folded" text — eliminated players show nothing below the avatar.

If `isFolded && !player.isEliminated && !inShowdown` → show "Folded" text
If `player.isEliminated && !inShowdown` → show nothing (avatar is just dimmed)

---

## 5. Bot Indicator

`player.isBot === true` means a bot is in this seat. The current implementation has zero visual distinction between a bot and a human player. This must change — players need to know they're facing an AI.

### Where it renders

A `🤖` emoji badge renders **inside the avatar circle**, replacing the initials. Bots don't have usernames that mean anything to players — showing "BO" or "B1" is noise. The emoji is internationally understood, requires no localization, and fits the game's playful tone.

```tsx
{
  player.isBot ? '🤖' : player.username.substring(0, 2).toUpperCase()
}
```

### Bot badge — exact implementation

In `PlayerSeat.tsx`, inside the avatar circle div, replace the existing text content:

```tsx
<div
  className={`rounded-full flex items-center justify-center font-outfit transition-all duration-300 ${dimmed ? 'opacity-25 grayscale' : ''}`}
  style={{
    width: 'var(--avatar-size)',
    height: 'var(--avatar-size)',
    background: player.isBot
      ? 'linear-gradient(145deg, rgba(155,89,182,0.2), rgba(155,89,182,0.07))'
      : `linear-gradient(145deg, ${avatarColor}33, ${avatarColor}11)`,
    border: isWinner
      ? '2.5px solid var(--gold)'
      : isCurrentUser
        ? '2.5px solid var(--gold-dim)'
        : player.isBot
          ? '2.5px solid rgba(155,89,182,0.5)'
          : `2.5px solid ${avatarColor}44`,
    boxShadow: isWinner ? '0 0 24px rgba(212,168,67,0.4)' : '0 4px 12px rgba(0,0,0,0.5)',
    color: dimmed ? 'var(--text-muted)' : player.isBot ? 'var(--text-dim)' : avatarColor,
    fontSize: player.isBot ? 'calc(var(--avatar-size) * 0.52)' : undefined,
    ...(isWinner ? { animation: 'gold-burst 1.2s ease-out infinite' } : {}),
  }}
>
  {player.isBot ? '🤖' : player.username.substring(0, 2).toUpperCase()}
</div>
```

**Bot color rationale:** Purple (`#9b59b6`) is currently reserved in the color system but unused. Bots are a distinct category — not a real player, not an action state. Purple is the right choice:

- Not gold (that's the player action system)
- Not red or blue (those are semantic action colors)
- Distinct enough to be noticed, subdued enough to not dominate

**Emoji sizing:** `calc(var(--avatar-size) * 0.52)` gives 29px emoji at 56px avatar, 21px at 40px. This fills the circle without clipping.

### Bot username display

Below the avatar, bot usernames render normally (e.g., "Bot 1"). No change needed there — the 🤖 in the circle is the sufficient indicator.

---

## 6. YOU Badge

The current user gets a special identity indicator beyond just a different border color. A "YOU" pill label renders below the avatar, in the same row as the blind position badge (SB/BB).

### Mutual exclusion with bot

`isCurrentUser` is derived from `player.userId === user?.id`. A bot never has a matching user ID. **You cannot simultaneously be YOU and a bot.** No guard needed — it's structurally impossible.

### Mutual exclusion with blind badge

SB and BB badges already render in the blind badge row. YOU occupies the same row. Rules:

- If the current user **is** the SB or BB: show the blind badge only (SB/BB takes priority — the current user knows they're them)
- If the current user **is not** a blind: show the YOU badge

```tsx
{
  /* Blind position badge row — also YOU badge for current user */
}
{
  blindPosition ? (
    <div className="flex justify-center mt-1">
      <span
        data-testid={blindPosition === 'SB' ? 'sb-badge' : 'bb-badge'}
        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={
          blindPosition === 'SB'
            ? {
                background: 'rgba(52,152,219,0.25)',
                color: '#5dade2',
                border: '1px solid rgba(52,152,219,0.4)',
              }
            : {
                background: 'rgba(212,168,67,0.2)',
                color: 'var(--gold-bright)',
                border: '1px solid rgba(212,168,67,0.4)',
              }
        }
      >
        {blindPosition}
      </span>
    </div>
  ) : isCurrentUser ? (
    <div className="flex justify-center mt-1">
      <span
        data-testid="you-badge"
        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{
          background: 'rgba(212,168,67,0.12)',
          color: 'var(--gold-dim)',
          border: '1px solid rgba(212,168,67,0.2)',
          letterSpacing: '0.08em',
        }}
      >
        YOU
      </span>
    </div>
  ) : null
}
```

### YOU badge visual spec

| Property       | Value                            |
| -------------- | -------------------------------- |
| Text           | `YOU`                            |
| Font size      | `10px`                           |
| Font weight    | 700 (`font-bold`)                |
| Color          | `var(--gold-dim)` — #8a6d1b      |
| Background     | `rgba(212,168,67,0.12)`          |
| Border         | `1px solid rgba(212,168,67,0.2)` |
| Border radius  | `4px` (`.rounded`)               |
| Padding        | `2px 6px` (`px-1.5 py-0.5`)      |
| Letter spacing | `0.08em`                         |

**Rationale:** The YOU badge is deliberately quiet — gold-dim on near-black is a subtle whisper, not a shout. The border color on the avatar circle already signals identity. The badge just adds a text label for first-time players who might not notice the border difference. It uses the same `10px / rounded` pattern as the SB/BB badges so it feels like it belongs in the same row.

---

## 7. State × Indicator Matrix

All states and which indicators are active. `—` = not applicable.

| Player state               | Timer ring | Border            | YOU badge                   | 🤖 in circle | dimmed   | Action badge     | Score popup |
| -------------------------- | ---------- | ----------------- | --------------------------- | ------------ | -------- | ---------------- | ----------- |
| Default human              | ✗          | avatarColor44     | if isCurrentUser & no blind | ✗            | ✗        | if recent action | ✗           |
| Default bot                | ✗          | purple 50%        | ✗                           | ✓            | ✗        | if recent action | ✗           |
| Active turn — human        | ✓          | avatarColor44     | if isCurrentUser & no blind | ✗            | ✗        | if recent action | ✗           |
| Active turn — bot          | ✓          | purple 50%        | ✗                           | ✓            | ✗        | —                | ✗           |
| Current user (no blind)    | ✗          | gold-dim          | ✓                           | ✗            | ✗        | if recent action | ✗           |
| Current user + SB          | ✗          | gold-dim          | ✗ (SB shows)                | ✗            | ✗        | if recent action | ✗           |
| Current user + BB          | ✗          | gold-dim          | ✗ (BB shows)                | ✗            | ✗        | if recent action | ✗           |
| Current user + active turn | ✓          | gold-dim          | if no blind                 | ✗            | ✗        | —                | ✗           |
| Folded                     | ✗          | avatarColor44     | if isCurrentUser & no blind | if bot       | ✓        | ✗                | ✗           |
| Winner                     | ✗          | gold (gold-burst) | if isCurrentUser & no blind | if bot       | ✗        | ✗                | ✗           |
| In showdown                | ✗          | unchanged         | if isCurrentUser & no blind | if bot       | forced ✗ | ✗                | ✓           |
| Eliminated                 | ✗          | avatarColor44     | ✗                           | if bot       | ✓        | ✗                | ✗           |

---

## 8. Props Changes to PlayerSeat

The current `PlayerSeatProps` interface requires no new props. `player.isBot` is already on `TablePlayer` (line 60 of `game.types.ts`). All new behavior is derived from existing props.

**No interface changes needed.**

The only implementation changes are:

1. Avatar circle content: initials → `🤖` when `player.isBot`
2. Avatar circle background/border: purple tint when `player.isBot`
3. Blind badge row: add `YOU` pill when `isCurrentUser && !blindPosition`

---

## 9. New CSS Tokens

Add to `:root` in `index.css`:

```css
/* Avatar system */
--ring-scale: 1;
--avatar-bot-border: rgba(155, 89, 182, 0.5);
--avatar-bot-bg-hi: rgba(155, 89, 182, 0.2);
--avatar-bot-bg-lo: rgba(155, 89, 182, 0.07);
```

Add to `@media (max-height: 500px) and (orientation: landscape)` block:

```css
--ring-scale: 0.71;
```

**Note:** The `--avatar-size` token already exists at both breakpoints (56px / 40px). No change needed.

---

## 10. Photo Upload Future-Proofing

When photo upload lands (Sprint 7 or later), the `TablePlayer` type will gain:

```typescript
avatarUrl?: string  // absolute URL or relative path
```

The avatar circle change is a one-line swap in the initials render (see Section 2 above). The outer div, border, ring, and all state effects remain on the outer container div — they don't care what's inside the circle.

**Constraint for that sprint:** `avatarUrl` images must be served at the exact avatar size (56px / 40px) to avoid network waste. The `<img>` renders at `w-full h-full object-cover rounded-full` — if the source is 1MB, it will still only paint 56px of pixels.

**Bot avatars in the photo era:** A bot always renders `🤖` regardless of whether an `avatarUrl` exists. `isBot` gates the whole content branch.

---

## 11. Accessibility Notes

- The `YOU` badge uses `data-testid="you-badge"` — Playwright tests can assert its presence.
- The `🤖` emoji in the circle has no `aria-label` — the parent element has no role either. This is intentional: screen readers will read the username from the text below the avatar. The emoji is decorative at this layer.
- If this is ever fixed for accessibility: add `aria-label="bot player"` to the outer avatar div when `player.isBot`, and `aria-label={`${player.username.substring(0,2)} — your avatar`}` when `isCurrentUser`.

---

## 12. Implementation Checklist for Joni

- [ ] In `PlayerSeat.tsx`, replace avatar circle content with bot/human branch (Section 5)
- [ ] In `PlayerSeat.tsx`, update avatar border/background to use purple when `player.isBot` (Section 5)
- [ ] In `PlayerSeat.tsx`, replace blind badge block with the new SB/BB/YOU tri-state block (Section 6)
- [ ] In `index.css` `:root`, add `--ring-scale: 1` and bot color tokens (Section 9)
- [ ] In `index.css` mobile landscape block, add `--ring-scale: 0.71` (Section 9)
- [ ] In `PlayerSeat.tsx`, confirm SVG timer ring transform includes `scale(var(--ring-scale))` (Section 1)
- [ ] Add `data-testid="you-badge"` to YOU pill (already in spec above)

**Do not:**

- Add any new props to `PlayerSeatProps`
- Import anything new — all dependencies already exist in the file
- Change the seat layout, chip badge, score popup, or action badge — those are not in scope

— Doni
