# Liquid Star design audit

Audit the file(s) specified in $ARGUMENTS (or the most recently edited file if none given) against the Liquid Star design rules for this project.

Check each of the following and report pass/fail with line numbers:

**Colors**
- [ ] No hardcoded hex color strings (e.g. `'#6366F1'`, `'#000'`, `'white'`, `'black'`)
- [ ] All colors come from `Colors.*` tokens via `useTheme()`
- [ ] Alpha variants use the hex-append pattern: `Colors.primary + '20'`, not `rgba(...)` with raw numbers

**Cards & Layout**
- [ ] No left-side accent bars or border strips (width: 3-6, height: 100%, colorful) — strictly forbidden
- [ ] Cards use `Radius.xl` (20px) or `Radius.lg` (16px) border radius
- [ ] Card shadows use `Shadow.sm/md/lg` spread into style arrays — not inline shadow props
- [ ] Cards have `borderWidth: StyleSheet.hairlineWidth` or `borderWidth: 1` with `borderColor: Colors.border`

**Buttons**
- [ ] Primary CTAs use `LinearGradient` with `[Colors.primary, Colors.secondary]`
- [ ] Secondary CTAs use border + transparent background (ghost style)
- [ ] `activeOpacity` is set on all `TouchableOpacity` elements (0.75–0.88 range)

**Typography**
- [ ] Font sizes use `FontSize.*` tokens
- [ ] Font weights use `FontWeight.*` tokens (not raw string numbers like `'700'`)

**Spacing**
- [ ] Padding/margin uses `Spacing.*` tokens, not magic numbers
- [ ] Exception: fine-tune values of 2–4px for micro-adjustments are OK

**Status indicators**
- [ ] Booking status colors come from `Colors.status[booking.status]` — not hardcoded per-status
- [ ] Active/live statuses (EN_ROUTE, IN_PROGRESS) show a pulsing animated dot, not a static icon

**Modals / Bottom Sheets**
- [ ] Use `Animated.Value` + spring for slide-in, not `animationType="slide"` on `<Modal>`
- [ ] Dimmed backdrop is a `TouchableOpacity` with `backgroundColor: 'rgba(0,0,0,0.55)'`
- [ ] Has a pull handle bar at the top

After the audit, list what needs fixing and make the fixes if any issues are found.
