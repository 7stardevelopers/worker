# Joel's Worker App — 2-Week Sprint Plan
> Generated: 2026-07-17 | Based on full code audit of Worker app, Customer app, and Backend.

---

## Before Day 1 — What to Pull

Joel needs to stay in sync with two other repos. **No code copying needed** — just agree on the same staging API URL so test bookings land in the same database.

| Repo | Branch | What to watch for |
|------|--------|-------------------|
| `backend` (Premsagar) | `main` | He's adding 3 missing routes + fixing the OTP route name. **Do not start Day 2 until Premsagar confirms these are deployed to staging.** |
| `Customer` (Yaswanth) | `main` | No changes needed from here — just coordinate the test booking flow together on Days 3 and Week 2. |

---

## Week 1

### Day 1 — Fix Config + Register Push Tokens

**Estimated time: 1–2 hours. Must be done before anything else.**

---

#### 1A. Add API URL to `eas.json`

Currently `eas.json` has **zero env vars**. The background location task (`utils/location.js` line 6) reads `process.env.EXPO_PUBLIC_API_BASE_URL` — without this, location silently fails.

Replace the entire `eas.json` with:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://1ipuylc4mh.execute-api.ap-south-1.amazonaws.com/Prod"
      }
    },
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://1ipuylc4mh.execute-api.ap-south-1.amazonaws.com/Prod"
      }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.7starexperts.com",
        "EXPO_PUBLIC_WSS_URL": "wss://wss.7starexperts.com"
      }
    }
  }
}
```

Also create a `Worker/.env` file for local dev with `expo start`:

```
EXPO_PUBLIC_API_BASE_URL=https://1ipuylc4mh.execute-api.ap-south-1.amazonaws.com/Prod
```

---

#### 1B. Register Push Token in `context/auth.js`

Currently `auth.js` has **no push token registration**. The `login()` function only stores tokens to AsyncStorage. Without this fix, the backend never knows your device address, so **job request push notifications will never arrive**.

Add this helper function at the top of `context/auth.js` (before the `AuthProvider`):

```js
import * as Notifications from 'expo-notifications';

async function registerPushToken(accessToken) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: tokenData.data, role: 'PROVIDER' }),
    });
    console.log('[Auth] Push token registered:', tokenData.data);
  } catch (e) {
    console.warn('[Auth] Push token registration failed (non-fatal):', e.message);
  }
}
```

Then in the existing `login()` function, add **one line** at the very end:

```js
const login = async (accessToken, refreshToken, u) => {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY,  accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
    [USER_KEY,          JSON.stringify(u)],
  ]);
  setToken(accessToken);
  setUser(u);
  registerPushToken(accessToken); // ← ADD THIS LINE
};
```

---

#### 1C. Verify It Works

- Run `expo start` on your device
- Login with a real phone number
- OTP arrives via SMS within 30 seconds ✓
- You reach the Jobs tab ✓
- Metro logs show: `[Auth] Push token registered: ExponentPushToken[...]` ✓

---

### Day 2 — Fix 4 Known Code Bugs

> **Wait for Premsagar's confirmation before starting.** He needs to deploy fixes for the OTP route, earnings route, and bank route to staging first.

---

#### Bug 1: Door OTP endpoint path mismatch

**File:** `app/job/[id].jsx` — **line 72**

The app calls `/verify-door-otp` but the backend route is `/otp-verify`. This breaks the door entry flow completely.

```js
// CURRENT (wrong):
await api.post(`/bookings/${id}/verify-door-otp`, { otp: code }, token);

// FIX:
await api.post(`/bookings/${id}/otp-verify`, { otp: code }, token);
```

---

#### Bug 2: Complete job uses wrong HTTP method

**File:** `app/job/[id].jsx` — **line 103**

The app calls `api.patch` but the backend route is `POST /bookings/:id/complete`. Job completion will return 404 or 405.

```js
// CURRENT (wrong):
await api.patch(`/bookings/${id}/complete`, { proof_photos: uploadedUrls }, token);

// FIX:
await api.post(`/bookings/${id}/complete`, { proof_photos: uploadedUrls }, token);
```

---

#### Bug 3: Earnings route is missing from backend

After Premsagar adds `GET /providers/me/earnings`, verify the response fields match `normalizeEarning()` in `utils/normalize.js` (line 131). The normalizer expects:

| Backend field | Normalized to |
|--------------|--------------|
| `earning_id` | `id` |
| `booking_id` | `bookingId` |
| `amount` | `amount` |
| `type` | `type` (`BOOKING`, `TIP`, `BONUS`, `DEDUCTION`) |
| `created_at` | `createdAt` |

If actual field names differ, update `normalizeEarning()` to match.

---

#### Bug 4: Bank details route is missing from backend

After Premsagar adds `PATCH /providers/me/bank`, find the bank onboarding screen (`app/onboarding/bank.jsx`) and confirm it sends:

```json
{ "account_number": "...", "ifsc": "...", "account_name": "..." }
```

If the field names differ from what Premsagar implements, update that screen accordingly.

---

### Day 3 — Full Job Lifecycle Test

Ask Yaswanth to create a test booking from the Customer app for a service you offer.
Walk through every step and mark ✓ or ✗:

**Phase 1: Job Request**
- [ ] Toggle online in the Worker app
- [ ] Yaswanth creates a booking on his Customer app
- [ ] Push notification arrives on your device within **10 seconds**
- [ ] `JobRequestModal` slides up showing: service name, customer address, your earning amount
- [ ] 30-second countdown timer counts down correctly
- [ ] **Accept** → booking moves to ACCEPTED on both apps
- [ ] **Decline** test: create another booking, let the timer expire → modal closes correctly

**Phase 2: En Route + Location Tracking**
- [ ] Tap **"I'm on my way"** → status changes to EN_ROUTE
- [ ] Metro logs show `startLocationTracking()` called with no error
- [ ] Wait 15 seconds → confirm `PATCH /providers/me/location` is firing (check Metro network logs)
- [ ] Yaswanth opens Track screen on Customer app → your location marker appears and moves

> **Important — Location Broadcast:** The Worker app sends location via `PATCH /providers/me/location` (HTTP). The Customer app listens for WebSocket frames. For this to work end-to-end, Premsagar's backend must forward the HTTP location update as a WebSocket broadcast to the customer's connected client. Ask Premsagar to confirm this is implemented. **This is a backend task, not a Worker app change.**

**Phase 3: Door OTP**
- [ ] Tap **"Verify Door OTP"** → OTPVerifySheet slides up
- [ ] Ask Yaswanth for the 4-digit door code shown in his Customer app
- [ ] Enter all 4 digits → tap **"Verify & Start"**
- [ ] Status moves to IN_PROGRESS ✓ *(confirms Bug 1 fix worked)*

**Phase 4: Proof Photos + Complete**
- [ ] Camera opens, take 1–2 photos of the "completed work"
- [ ] Tap **"Mark as Complete"**
- [ ] S3 presign URL is fetched → photos upload → `POST /bookings/:id/complete` fires *(confirms Bug 2 fix worked)*
- [ ] Status moves to COMPLETED ✓
- [ ] Metro logs show `stopLocationTracking()` called

**Phase 5: Post-Job**
- [ ] Earnings tab shows the new transaction in history *(confirms Bug 3 fix worked)*
- [ ] Wallet balance updated correctly
- [ ] Tap **"Request Payout"** (min ₹100) → Yaswanth checks Admin panel to confirm it appears in Finance → Payouts queue

---

### Day 4 — Fix Bugs Found on Day 3

Document every failure with: exact error message + which API call failed + HTTP status code.

Common expected issues and where to look:

| Likely issue | Where to check | Probable fix |
|-------------|---------------|-------------|
| OTP verify still 404 | Metro network log — check URL being called | Confirm Bug 1 fix was saved and re-built |
| Photo upload fails | `utils/s3Upload.js` — check presign response | Confirm `upload_url` and `object_url` field names match what backend returns |
| Push notification never arrives | Metro — missing `[Auth] Push token registered` log | Logout → login again to re-trigger `registerPushToken()` |
| Earnings shows blank/error | Network tab — check `/providers/me/earnings` response shape | Update `normalizeEarning()` field names to match actual API response |
| Customer can't see location on map | Not a Worker app issue | Tag Premsagar — backend needs to broadcast via WebSocket |

---

### Day 5 — New Provider Onboarding Test

Register with a brand-new phone number not used before.

- [ ] Fresh login → app redirects to **onboarding** (not Jobs tab)
- [ ] **Step 1 — Personal info:** enter name, bio, years of experience → saved
- [ ] **Step 2 — Services:** select 2–3 services → saved
- [ ] **Step 3 — Documents:** upload Aadhaar front, Aadhaar back, PAN (real camera photos) → S3 upload works
- [ ] **Step 4 — Bank:** enter account number, IFSC, account name → saved *(confirms Bug 4 fix worked)*
- [ ] **Step 5 — Availability:** complete and submit

After submitting all 5 steps:
- [ ] Tell Yaswanth — he should see the new provider as **PENDING** in Admin panel with all documents visible
- [ ] Yaswanth approves from Admin panel
- [ ] Push notification arrives on your device: approval message
- [ ] App gate now shows **Jobs tab** (onboarding no longer shown)
- [ ] Toggle online → receive a test job from Yaswanth

---

## Week 2

### Day 1–3 — Integration Testing with Yaswanth

Run the full journey together. Yaswanth is on the Customer app, Joel is on the Worker app, both hitting the same staging backend.

**Journey A — Full Job Lifecycle:**
```
Yaswanth books a service on Customer app
  → Joel receives push notification within 10 seconds
  → Joel accepts within 30 seconds
  → Joel taps "I'm on my way"
  → Yaswanth opens Track screen — sees Joel's location on the live map
  → Joel arrives — asks Yaswanth for the door OTP
  → Joel enters OTP → status IN_PROGRESS on both apps simultaneously
  → Joel takes 2 proof photos → taps "Mark as Complete"
  → Yaswanth sees COMPLETED on his booking detail
  → Yaswanth submits 5-star review + ₹50 tip
  → Joel's Earnings tab shows: ₹X booking earning + ₹50 tip
```

Fix every **P0 bug** (anything that stops the flow) immediately before moving on.
Log every **P1 bug** (something wrong but flow completes) for later.

**Journey B — New Provider First Job:**
```
Fresh phone number → complete onboarding → Yaswanth approves in Admin
  → Toggle online → receive a real booking → complete full Journey A
```

---

### Day 4–5 — Production Build

After Premsagar deploys production (he'll share the production URL):

Update `eas.json` production env — it already has the right keys from Day 1, just confirm URLs are correct:
```json
"EXPO_PUBLIC_API_BASE_URL": "https://api.7starexperts.com",
"EXPO_PUBLIC_WSS_URL": "wss://wss.7starexperts.com"
```

Then build:
```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

Install the production APK on a real device. Smoke test:
- Login → receive job → full lifecycle → earnings update

Submit:
- **Android** → Google Play Internal Track
- **iOS** → TestFlight

---

## Summary — All Code Changes Joel Makes

| File | Line | Change |
|------|------|--------|
| `eas.json` | — | Add `EXPO_PUBLIC_API_BASE_URL` to all 3 build profiles |
| `.env` | — | Create new file with staging URL |
| `context/auth.js` | `login()` | Add `registerPushToken(accessToken)` call + helper function |
| `app/job/[id].jsx` | 72 | `verify-door-otp` → `otp-verify` |
| `app/job/[id].jsx` | 103 | `api.patch` → `api.post` for the complete endpoint |
| `utils/normalize.js` | 131 | Update `normalizeEarning()` field names if they don't match real API (check on Day 3) |

**6 files. 5 specific line changes. Everything else is testing.**

---

## What Joel Needs from Premsagar — Tag Him on These

> Premsagar: please confirm each of these before Joel starts Day 2.

1. **OTP route name** — the Worker app calls `POST /bookings/:id/otp-verify`. Confirm this is the exact path on staging, including the hyphen vs underscore.
2. **Add `GET /providers/me/earnings`** — returns an array of earning records with fields: `earning_id`, `booking_id`, `amount`, `type`, `created_at`.
3. **Add `PATCH /providers/me/bank`** — accepts `{ account_number, ifsc, account_name }` and saves to provider's bank record.
4. **Location → WebSocket broadcast** — when `PATCH /providers/me/location` is called by the Worker app, the backend must forward that `{ lat, lng }` as a WebSocket push to all connected Customer app clients for that `booking_id`. Without this, the live tracking map on the Customer side will not update. This is a backend-only change.
