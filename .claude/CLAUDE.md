# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

7StarWorker is the **provider-facing** React Native app (Expo SDK 54) for the 7StarExperts home services platform. Providers (workers) receive job requests via push notifications, navigate to customers, verify door OTPs, complete jobs with proof photos, and request wallet payouts.

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
app/pending.jsx         Shown when provider.status = PENDING (awaiting admin approval)
app/support/index.jsx   Raise and view support tickets
app/notifications.jsx   Notification history
```

### Provider Status Flow

After OTP login, `app/index.jsx` routes based on `provider.status`:
- No token → `/(auth)/login`
- `APPROVED` → `/(tabs)`
- `PENDING` → `/pending`
- Anything else (new user / rejected / incomplete) → `/onboarding/personal`

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

Throws on non-2xx. Base URL from `process.env.EXPO_PUBLIC_API_BASE_URL`.

### Data Normalization (`utils/normalize.js`)

All API responses are passed through normalizers before use in components:
- `normalizeJob(b)` — booking from provider POV (includes `providerEarning`, `doorOtp`, `proofPhotos`, `address.lat/lng`)
- `normalizeEarning(e)` — earning record
- `normalizeProvider(p)` — provider profile
- `normalizeBooking(b)` — customer-side booking (used in auth/customer-facing contexts)

### Background Location (`utils/location.js`)

`TaskManager.defineTask` must run at module level. The file is imported in `app/_layout.jsx` so the task registers at app startup.

- `startLocationBroadcast(bookingId)` — starts background GPS; stores `active_booking_id` in AsyncStorage
- `stopLocationBroadcast()` — stops task, clears stored booking ID
- Sends `PATCH /providers/me/location { lat, lng }` every 10 seconds or 20 meters

### S3 Document Upload (`utils/s3Upload.js`)

```
POST /documents/upload-url { doc_type }  →  { presigned_url, s3_key }
uploadToS3(presignedUrl, fileUri)         →  binary PUT via expo-file-system
POST /documents/confirm { doc_type, s3_key }
```

## Key Conventions

1. **Styling**: `StyleSheet.create` only — never inline style objects. Colors always from `useTheme()`, never hardcoded.

2. **Amounts**: All monetary values from the API are in **paise** (₹1 = 100 paise). Display as: `₹${(amount / 100).toLocaleString('en-IN')}`.

3. **Status colors**: Use `Colors.status[booking.status]` from `constants/theme.js` — the `statusMap` covers `PENDING | ACCEPTED | EN_ROUTE | IN_PROGRESS | COMPLETED | CANCELLED | REJECTED`.

4. **Screen refresh on focus**: Job screens use `useFocusEffect(useCallback(() => { fetchJob(); }, [id]))` to reload data when navigating back.

5. **Push notifications**: `app/_layout.jsx` routes on notification tap. `app/(tabs)/index.jsx` listens for foreground `job_request` notifications to show `JobRequestModal`.

6. **Token refresh**: Not yet implemented. 15-minute JWT expiry means users may need to re-login. Implement silent refresh (`POST /auth/refresh`) before Week 5.
