# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

7StarWorker is the **provider-facing** React Native app (Expo SDK 57, React Native 0.86) for the 7StarExperts home services platform. Providers (workers) receive job requests via push notifications, navigate to customers, verify door OTPs, complete jobs with proof photos, and request wallet payouts.

The companion customer app lives at `../Customer/` — both apps share the same design system, auth pattern, and backend.

## Commands

```bash
npx expo start          # Start dev server (Expo Go or development build)
npx expo start --android
npx expo start --ios
eas build --platform android --profile preview   # EAS production build
```

There are no lint or test scripts configured.

## Environment

The app reads `EXPO_PUBLIC_API_BASE_URL` from `.env` at build time. Expo automatically inlines `EXPO_PUBLIC_*` variables — no import needed, just `process.env.EXPO_PUBLIC_API_BASE_URL`.

## Path Aliases

Configured in `babel.config.js` via `module-resolver`. Always use aliases — never relative imports:

| Alias | Path |
|-------|------|
| `@components` | `./components` |
| `@constants` | `./constants` |
| `@context` | `./context` |
| `@utils` | `./utils` |

## Architecture

### Routing (Expo Router file-based)

```
app/index.jsx           Auth gate — redirects based on token + provider.status
app/(auth)/             Login (phone entry) + OTP verification
app/(tabs)/             3-tab shell: Jobs | Earnings | Profile
app/job/[id].jsx        Job detail + full lifecycle (most complex screen)
app/onboarding/         5-step onboarding: personal → services → documents → bank → availability
app/pending.jsx         Complete application awaiting admin approval
app/suspended.jsx       provider.status = SUSPENDED
app/support/index.jsx   Raise and view support tickets
app/notifications.jsx   Notification history
```

### Provider Status Flow

After OTP login, `app/index.jsx` routes via `routeForProvider()` in `utils/onboarding.js`.
`GET /providers/me` never 404s — the backend creates a PENDING record on first call, so a
brand-new worker also comes back as PENDING.
- No token → `/(auth)/login`
- `APPROVED` → `/(tabs)`
- `SUSPENDED` → `/suspended`
- `PENDING` with onboarding unfinished → first incomplete step (name → services → documents
  from `GET /documents/mine`, rejected counts as missing → bank)
- `PENDING` and complete → `/pending`
- Profile fetch fails → Retry screen

### Context Providers (nested in `app/_layout.jsx`)

```
GestureHandlerRootView
  SafeAreaProvider
    ThemeProvider         — isDark, Colors via useTheme()
      AuthProvider        — token, user, login(), logout(), updateUser()
        ProviderProvider  — profile, isAvailable, fetchProfile(), toggleAvailability()
          AppContent
```

- **`useAuth()`** — token is a JWT stored in AsyncStorage; passed manually to every `api.*` call
- **`useProvider()`** — provider profile from `GET /providers/me`; `isAvailable` is optimistic (rolls back on API error)
- **`useTheme()`** — returns `{ isDark, Colors }` where `Colors` is either `DarkColors` or `LightColors` from `constants/theme.js`

### API Utility (`utils/api.js`)

```js
api.get(path, token)
api.post(path, body, token)
api.patch(path, body, token)
api.delete(path, token)
```

Throws `Error(message)` with `.status` on non-2xx. Base URL from `process.env.EXPO_PUBLIC_API_BASE_URL`.
- Silent refresh on 401 via `refreshSession()` — single in-flight refresh, and the **rotated
  refresh token is stored** (the backend revokes the old one on every refresh).
- Unrecoverable 401 throws `SESSION_EXPIRED` and fires the session-expired callback once.
- 20 s timeout; non-JSON bodies (e.g. API Gateway 413) don't crash the caller.
- Show errors with `alertError()` / `friendlyError()` from `utils/errors.js`, never raw `e.message`.
- Every attempt is dev-logged by `logApi()` (`utils/apiLog.js`): `✅/❌ status METHOD path (ms)` plus the
  redacted payload/response, in the Metro terminal and DevTools console. Full raw requests are in the
  React Native DevTools **Network** tab (`j` in the Expo terminal). Nothing is logged in release builds.

### Data Normalization (`utils/normalize.js`)

All API responses are passed through normalizers before use in components (they also convert money from paise to rupees):
- `normalizeJob(b)` — booking from provider POV (includes `providerEarning`, `doorOtp`, `proofPhotos`, `address.lat/lng`)
- `normalizeEarning(e)` — earning record
- `normalizeProvider(p)` — provider profile
- `normalizeBooking(b)` — customer-side booking (used in auth/customer-facing contexts)

### Background Location (`utils/location.js`)

`TaskManager.defineTask` must run at module level. The file is imported in `app/_layout.jsx` so the task registers at app startup.

- `startLocationTracking({ silent })` — starts background GPS (silent = only if permission already granted)
- `stopLocationTracking()` — stops the task
- `reconcileTracking(token)` — runs on login and every app foreground: stops GPS when no job needs it,
  silently resumes it for a live job (EN_ROUTE / IN_PROGRESS, or ACCEPTED within 60 min)
- The task sends `PATCH /providers/me/location { lat, lng }` through `api.js`, so expired tokens refresh
- Logout stops tracking, goes offline, unregisters the push token and revokes the refresh token

### Uploads

Always shrink photos with `compressImage()` (`utils/image.js`, ~1600px JPEG) before uploading.
- **Documents:** `POST /documents/upload { doc_type, content_type, file_content }` with base64
  content — requests are capped at ~6 MB by Lambda, which is why compression is mandatory.
- **Proof photos:** `POST /media/presign { content_type, folder: 'proof' }` → `uploadToS3()`
  (`utils/s3Upload.js`) → `POST /bookings/:id/complete { proof_photos }`.

## Key Conventions

1. **Styling**: `StyleSheet.create` only — never inline style objects. Colors always from `useTheme()`, never hardcoded.

2. **Amounts**: The API stores, returns and accepts every money value (`base_price`, `price_snapshot`,
   `total_amount`, `platform_fee`, earning/payout `amount`, `wallet_balance`, earnings `stats`) as integer
   **paise** (₹499 = `49900`). Convert to rupees at the boundary — the normalizers in `utils/normalize.js`
   already do; for raw fields (e.g. `profile.wallet_balance`, earnings `stats`) use `fromPaise()` from
   `utils/money.js`. Components only ever see rupees; display with `formatINR()` (rupees). Anything sent
   back (e.g. `POST /payments/payout-request { amount }`) must go through `toPaise()`.

3. **Status colors**: Use `Colors.status[booking.status]` from `constants/theme.js` — the `statusMap` covers `PENDING | ACCEPTED | EN_ROUTE | IN_PROGRESS | COMPLETED | CANCELLED | REJECTED`.

4. **Screen refresh on focus**: Job screens use `useFocusEffect(useCallback(() => { fetchJob(); }, [id]))` to reload data when navigating back.

5. **Push notifications**: `app/_layout.jsx` routes on notification tap. `app/(tabs)/index.jsx` listens for foreground `job_request` notifications to show `JobRequestModal`.

6. **Token refresh**: Handled silently in `utils/api.js` (15-minute access tokens) — screens never deal with it.

7. **Branding**: The visible name comes from `constants/brand.js` (`APP_NAME` = "MULTIOKS Partner"). Never hardcode it.
   Build identifiers (bundle id, package, slug, EAS project) intentionally still use the old names.

8. **Location permission**: Never call `Location.request*PermissionsAsync` directly — send the worker to
   `/permissions` (`?then=online` to go online afterwards). It's the prominent disclosure Google Play requires
   before background location. `startLocationTracking()` already does this when permission is missing.

9. **Offline**: `components/OfflineBanner.jsx` (mounted in `app/_layout.jsx`) shows app-wide when there's no internet.

10. **Accessibility**: Icon-only buttons need `accessibilityLabel` and `hitSlop`; toggles use `accessibilityRole="switch"`.
