# Liquid Star — Design System Reference

> Brand identity for 7StarExperts. Clean, minimal, dark-first. Palette is fixed; the UI stays flat and quiet so content and actions lead.

---

## Color Tokens (from `constants/theme.js`)

Always use `Colors.*` from `useTheme()`. Never hardcode hex values in components.

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `Colors.background` | #000000 | #F2F2F7 | Screen root background |
| `Colors.surface` | #1C1C1E | #FFFFFF | Card backgrounds |
| `Colors.surfaceRaised` | #2C2C2E | #F2F2F7 | Modals, elevated panels |
| `Colors.foreground` | #FFFFFF | #000000 | Primary text |
| `Colors.mutedForeground` | rgba(235,235,245,0.6) | rgba(60,60,67,0.6) | Secondary text, meta |
| `Colors.subtleForeground` | rgba(235,235,245,0.3) | rgba(60,60,67,0.3) | Placeholder, disabled |
| `Colors.border` | rgba(84,84,88,0.65) | rgba(60,60,67,0.18) | Card borders, dividers |
| `Colors.primary` | #6366F1 | #4F46E5 | Indigo — CTAs, active states |
| `Colors.secondary` | #8B5CF6 | #7C3AED | Violet — gradient pair |
| `Colors.accent` | #F59E0B | #D97706 | Star Gold — ratings, premium |
| `Colors.success` | #10B981 | #059669 | Confirmed, completed |
| `Colors.warning` | #F59E0B | #D97706 | Pending, amber states |
| `Colors.error` | #EF4444 | #DC2626 | Cancelled, errors |
| `Colors.info` | #3B82F6 | #2563EB | Informational |
| `Colors.glassBg` | rgba(28,28,30,0.72) | rgba(255,255,255,0.72) | Glassmorphism bg |
| `Colors.glassBorder` | rgba(255,255,255,0.12) | rgba(0,0,0,0.08) | Glassmorphism border |

**Alpha pattern:** `Colors.primary + '20'` appends hex alpha to any color string.
Common alpha values: `'12'`=7%, `'18'`=9%, `'1A'`=10%, `'20'`=12%, `'35'`=21%, `'40'`=25%, `'50'`=31%, `'80'`=50%

**Booking status colors** (from `Colors.status[status]`):
- PENDING → #F59E0B (amber)
- ACCEPTED → #3B82F6 (blue)
- EN_ROUTE → #8B5CF6 (violet)
- IN_PROGRESS → #06B6D4 (cyan)
- COMPLETED → #10B981 (green)
- CANCELLED / REJECTED → #EF4444 (red)

---

## Visual Style

Clean and minimal. Solid surfaces, hairline borders, one accent color.

- **No gradients, glows or decorative rings** in UI. `gradientPrimary`/`gradientAccent` tokens remain in `theme.js` for palette reference only.
- **No emoji or decorative glyphs** in copy or UI (use Ionicons for icons).
- **No shadows on cards** — separate with `Colors.border` hairlines instead.
- Copy is sentence case, no exclamation marks.

---

## Spacing Scale (`Spacing.*`)

| Token | Value |
|-------|-------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `base` | 16 |
| `lg` | 20 |
| `xl` | 24 |
| `xl2` | 32 |
| `xl3` | 40 |
| `xl4` | 48 |

Standard screen horizontal padding: `Spacing.base` (16). Bottom padding for scroll content: 120 (clears floating tab bar).

---

## Border Radius Scale (`Radius.*`)

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8 | Small chips, inputs |
| `md` | 12 | Buttons, tags |
| `lg` | 16 | Smaller cards |
| `xl` | 20 | Main cards, modals |
| `xl2` | 28 | Large surfaces, bottom sheets |
| `full` | 9999 | Pills, filter chips, avatars |

---

## Typography Scale (`FontSize.*`, `FontWeight.*`)

| Token | Size | Weight usage |
|-------|------|------|
| `display` | 32 | Hero screens, splash |
| `h1` | 24 | Screen titles |
| `h2` | 20 | Section headers |
| `h3` | 17 | Card titles |
| `body` | 15 | Main content, buttons |
| `sm` | 13 | Meta, captions, chips |
| `xs` | 11 | Labels, micro text |

Font weights: `regular(400)`, `medium(500)`, `semibold(600)`, `bold(700)`

---

## Shadow System (`Shadow.*`)

Spread directly into style arrays — don't write shadow props inline.

```js
Shadow.sm   // subtle card lift
Shadow.md   // standard cards
Shadow.lg   // modals, bottom sheets
Shadow.glow // indigo glow for active elements
```

---

## Component Patterns

Use the shared components — don't rebuild these per screen.

| Component | Use for |
|-----------|---------|
| `Button` | Every CTA. `variant`: `primary` (solid `Colors.primary`), `secondary`, `danger`, `ghost`. Fixed height, shows spinner via `loading`. |
| `ScreenHeader` | Every screen header. `back` for stacked screens, `large` for tab roots, `right` slot for actions. |
| `FooterBar` | Sticky bottom actions. In layout flow (never `position: absolute`), pads for safe-area inset. |
| `BottomSheet` | All sheets/modals with content. Native-driver slide + backdrop fade, keyboard-aware, safe-area padded. |
| `TextField` | All form inputs (label, focus border, optional hint). |
| `OtpInput` | Any code entry. Boxes flex so they never overflow narrow screens. |
| `LoadingScreen` | All loading states (see below). |
| `EmptyState` | All empty/error states. |
| `StatusPill` | Booking status. Colour from `Colors.status`, pulsing dot for EN_ROUTE / IN_PROGRESS. |

### Cards
```js
{ backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg }
```
**Never** add a left-side colored border strip/accent bar to cards.

### Layout rules (iOS + Android)
- Screen root: `SafeAreaView edges={['top']}`; bottom inset is handled by `FooterBar` / `TabBar` / `BottomSheet`.
- Screens with inputs wrap content in `KeyboardAvoidingView behavior="padding"` on **both** platforms (Android is edge-to-edge in SDK 54, so the window no longer resizes for the keyboard).
- Never position footers absolutely over scroll content.

---

## Loading & Feedback Patterns

### Loading
Loading is always a centred spinner via `LoadingScreen`:
- `<LoadingScreen brand />` — app start / auth gate.
- `<LoadingScreen overlay />` — rendered before the `ScreenHeader` so it centres on the full screen while the back button stays tappable.
- Initial load only; refreshes on focus happen silently, pull-to-refresh uses `RefreshControl`.

### Empty States
Use `EmptyState` from `@components/EmptyState`. Pass `cta` for actionable empties (Try again, Raise a ticket).

### Pull-to-Refresh
Every list screen that shows data has a `RefreshControl`.

---

## Distinguishing Details

1. **Status pills with pulsing dot** — live bookings pulse, others are static.
2. **Gold star accent** — `Colors.accent` for ratings only.
