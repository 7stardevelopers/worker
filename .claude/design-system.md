# Liquid Star — Design System Reference

> Brand identity for 7StarExperts. Inspired by Apple Vision Pro glassmorphism + Vercel dark aesthetic + Linear precision. Dark-first. Never purple/white flat like Urban Company.

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

## Gradients

Always `expo-linear-gradient`. Primary brand gradient is indigo → violet.

```jsx
// Primary CTA (horizontal)
<LinearGradient colors={[Colors.primary, Colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}}>

// Subtle top glow on active cards (vertical, transparent)
<LinearGradient colors={[statusColor + '22', 'transparent']} start={{x:0,y:0}} end={{x:0,y:1}}>

// Gold accent (subscription, ratings)
<LinearGradient colors={[Colors.accent, '#FBBF24']} start={{x:0,y:0}} end={{x:1,y:0}}>

// Dark map background
<LinearGradient colors={['#0A0E1A', '#0D1220', '#101828']}>
```

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

### Cards
```js
style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.md]}
// card: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth }
```
**Never** add a left-side colored border strip/accent bar to cards. This pattern is forbidden.

### Glassmorphism Surface
```js
{ backgroundColor: Colors.glassBg, borderColor: Colors.glassBorder, borderWidth: 1, borderRadius: Radius.xl }
// + Shadow.md
```

### Primary Button
```jsx
<TouchableOpacity style={styles.btn} activeOpacity={0.82}>
  <LinearGradient colors={[Colors.primary, Colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.grad}>
    <Text style={styles.btnText}>Action</Text>
  </LinearGradient>
</TouchableOpacity>
// btn: { borderRadius: Radius.md, overflow: 'hidden' }
// grad: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }
// btnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold }
```

### Secondary Button (Ghost)
```js
{ borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12 }
```

### Filter Chip / Pill
```jsx
// Active: backgroundColor: Colors.primary, borderColor: Colors.primary, text: '#FFF'
// Inactive: backgroundColor: Colors.surface, borderColor: Colors.border, text: Colors.mutedForeground
// Shape: borderRadius: Radius.full
```

### Status Badge / Pill
```js
{ backgroundColor: statusColor + '1A', borderColor: statusColor + '40', borderWidth: 1, borderRadius: Radius.full }
// Icon or pulsing dot + text label
// Pulsing dot for: PENDING, EN_ROUTE, IN_PROGRESS
// Static icon for: ACCEPTED, COMPLETED, CANCELLED, REJECTED
```

### Provider Avatar (initials)
```jsx
<LinearGradient colors={[Colors.primary, Colors.secondary]} start={{x:0,y:0}} end={{x:1,y:1}}
  style={{ width: 40, height: 40, borderRadius: 20, alignItems:'center', justifyContent:'center' }}>
  <Text style={{ color:'#FFF', fontWeight:'700', fontSize: 15 }}>RK</Text>
</LinearGradient>
```

### Bottom Sheet / Modal
```js
// Always use Animated.Value + Animated.spring — never animationType="slide"
// Sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28 }
// Handle bar: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf:'center' }
// Backdrop: TouchableOpacity with { backgroundColor: 'rgba(0,0,0,0.55)' }
```

### Pulsing Dot (live status indicator)
```jsx
// Animated.loop → scale 1→2.0, opacity 0.75→0 over 750ms, then reset
// Inner solid dot (6px) + outer animated ring (10px)
// Color = statusColor for the booking status
```

---

## Loading & Feedback Patterns

### Skeleton Loaders
Use `Skeleton.*` from `@components/Skeleton` for loading states. Never show empty UI — always skeleton while data loads.
```jsx
// During loading, replace real content:
{loading ? (
  <>
    <Skeleton width="auto" height={110} radius={Radius.xl} style={{ marginHorizontal: Spacing.base }} />
    {[...Array(3)].map((_, i) => <Skeleton.ServiceCard key={i} />)}
  </>
) : (
  // real content
)}
```

### Empty States
Use `EmptyState` from `@components/EmptyState`. Never use ad-hoc empty view — always use the shared component.
- `compact` prop for inline empty states inside a section
- `cta` prop for actionable empties (Clear Filters, Book Now, etc.)
- Icon color should match the context (error → Colors.error, search → Colors.primary)

### PressableScale
Use instead of `TouchableOpacity` for cards, category items, featured banners:
- Scale `0.98` — large banner/featured cards
- Scale `0.96` (default) — standard cards, list items
- Scale `0.93` — small chips, category items

### Pull-to-Refresh
Every full-page `ScrollView` that shows data should have `RefreshControl`. Show skeleton loading state while refreshing (`loading` flag, separate from `refreshing`).

---

## Unique UX Elements (differentiation from competitors)

1. **Status pills with pulsing dot** — active bookings pulse, completed use static icons
2. **Top gradient glow** — active booking cards get a subtle `statusColor + '22'` gradient at the top edge
3. **Provider avatar** — always gradient initials, never a placeholder silhouette
4. **Dark mock map** — grid tile pattern + road shapes for tracking preview
5. **Glassmorphism live banner** — when booking is EN_ROUTE/IN_PROGRESS, a banner appears at top of bookings screen
6. **Gold star accent** — `Colors.accent` (#F59E0B) for all ratings, premium indicators, subscription badges
