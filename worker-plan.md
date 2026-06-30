# 7StarWorker — Provider App Build Plan

> Build plan for the **worker/provider-facing** native app.
> Reference architecture: `../Customer/` — same patterns, same design system.
> Backend contracts: `../plan-backend (6).md` Section 7.
> Project sprint assignments: `../plan-project (4).md`.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Package Setup](#2-package-setup)
3. [Files to Copy from Customer App](#3-files-to-copy-from-customer-app)
4. [Full Folder Structure](#4-full-folder-structure)
5. [Babel & Config Setup](#5-babel--config-setup)
6. [Context & Utilities](#6-context--utilities)
7. [Screen-by-Screen Build Guide](#7-screen-by-screen-build-guide)
8. [New Components](#8-new-components)
9. [Background Location Task](#9-background-location-task)
10. [Week-by-Week Build Order](#10-week-by-week-build-order)
11. [API Quick Reference](#11-api-quick-reference)

---

## 1. What This App Does

Provider (worker) app for 7StarExperts. The provider:

1. Registers with phone OTP → completes onboarding (documents, services, bank details)
2. Waits for admin approval (PENDING → APPROVED)
3. Toggles online → receives job requests via push notifications
4. Has 30 seconds to accept or reject each job
5. Navigates to customer → verifies 4-digit door OTP → starts job
6. Uploads 1–2 proof photos → marks complete → earns credited to wallet
7. Requests payout to bank account
8. Can raise support tickets and view earnings history

**Roles handled:** `PROVIDER` only. Admin/Support/Finance roles use the web portals.

---

## 2. Package Setup

### Base `package.json`

Same core dependencies as Customer app (`../Customer/package.json`) + extra native modules for camera, location, and documents.

```json
{
  "name": "7starworker",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build:android": "eas build --platform android --profile preview"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "babel-plugin-module-resolver": "^5.0.2",
    "babel-preset-expo": "~54.0.10",
    "expo": "~54.0.34",
    "expo-camera": "~16.0.18",
    "expo-constants": "~18.0.13",
    "expo-file-system": "~18.0.13",
    "expo-font": "~14.0.11",
    "expo-image-picker": "~16.0.6",
    "expo-linear-gradient": "~15.0.8",
    "expo-linking": "~8.0.12",
    "expo-location": "~18.0.10",
    "expo-router": "~6.0.23",
    "expo-splash-screen": "~31.0.13",
    "expo-status-bar": "~3.0.9",
    "expo-system-ui": "~6.0.9",
    "expo-task-manager": "~12.0.7",
    "nativewind": "^4.1.21",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-css-interop": "^0.0.36",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-web": "^0.21.0",
    "react-native-worklets": "0.5.1"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.3.2"
  },
  "private": true,
  "overrides": {
    "react-native-safe-area-context": "~5.6.0"
  }
}
```

**Extra libraries vs. Customer app:**

| Package | Version | Why |
|---------|---------|-----|
| `expo-camera` | ~16.0.18 | Take proof-of-completion photos |
| `expo-image-picker` | ~16.0.6 | Pick Aadhaar, PAN, certificate documents from gallery |
| `expo-location` | ~18.0.10 | GPS — live location broadcast to customer during job |
| `expo-task-manager` | ~12.0.7 | Run background location task (required for expo-location background) |
| `expo-file-system` | ~18.0.13 | Read file URI for S3 presigned PUT upload |

---

## 3. Files to Copy from Customer App

Copy these files **verbatim** — zero changes needed. They work identically for the worker app.

```
Customer/constants/theme.js          → worker/constants/theme.js
Customer/context/auth.js             → worker/context/auth.js
Customer/context/theme.js            → worker/context/theme.js
Customer/components/FloatingTabBar.jsx → worker/components/FloatingTabBar.jsx
Customer/components/Skeleton.jsx     → worker/components/Skeleton.jsx
Customer/components/EmptyState.jsx   → worker/components/EmptyState.jsx
Customer/components/PressableScale.jsx → worker/components/PressableScale.jsx
Customer/components/Splash.jsx       → worker/components/Splash.jsx
Customer/global.css                  → worker/global.css
Customer/tailwind.config.js          → worker/tailwind.config.js
Customer/metro.config.js             → worker/metro.config.js
Customer/app.json                    → worker/app.json  (then rename app to 7starworker)
Customer/eas.json                    → worker/eas.json
```

**Write `utils/api.js` fresh** — same structure as Customer, but BASE_URL reads from `process.env.EXPO_PUBLIC_API_BASE_URL` (already set in `.env`). With Expo SDK 49+, `EXPO_PUBLIC_*` vars are automatically inlined at build time via `process.env`. Do not copy the Customer version verbatim — it hardcodes the URL as a string literal.

```js
// worker/utils/api.js
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || 'Something went wrong');
  return data;
}

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, token)       => request('DELETE', path, null, token),
};
```

**Copy then extend `utils/normalize.js`** — copy and add `normalizeJob`, `normalizeEarning`, `normalizeProviderProfile` at the bottom.

---

## 4. Full Folder Structure

```
worker/
├── app.json
├── eas.json
├── global.css
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
├── package.json
│
├── app/
│   ├── _layout.jsx                  # Root: GestureHandler → SafeArea → Theme → Auth → AppContent
│   ├── index.jsx                    # Auth gate: redirect → (auth) or (tabs) or onboarding
│   │
│   ├── (auth)/
│   │   ├── _layout.jsx
│   │   ├── login.jsx                # Phone entry (copy + adapt from Customer)
│   │   └── otp.jsx                  # 6-digit OTP (copy + adapt from Customer)
│   │
│   ├── (tabs)/
│   │   ├── _layout.jsx              # 3 tabs: Jobs | Earnings | Profile
│   │   ├── index.jsx                # Jobs screen (active + incoming jobs)
│   │   ├── earnings.jsx             # Wallet balance + earnings history
│   │   └── profile.jsx             # Provider profile + settings
│   │
│   ├── job/
│   │   └── [id].jsx                 # Full job detail + lifecycle actions
│   │
│   ├── onboarding/
│   │   ├── _layout.jsx              # Stack for onboarding steps
│   │   ├── personal.jsx             # Name, photo, gender, bio
│   │   ├── services.jsx             # Select services offered
│   │   ├── documents.jsx            # Upload Aadhaar + PAN + certificate
│   │   ├── bank.jsx                 # Bank account + IFSC
│   │   └── availability.jsx         # Working hours schedule
│   │
│   ├── support/
│   │   └── index.jsx                # Raise + view support tickets
│   │
│   └── notifications.jsx            # Notification history
│
├── components/
│   ├── FloatingTabBar.jsx           # COPIED from Customer (3 tabs)
│   ├── Skeleton.jsx                 # COPIED from Customer
│   ├── EmptyState.jsx               # COPIED from Customer
│   ├── PressableScale.jsx           # COPIED from Customer
│   ├── Splash.jsx                   # COPIED from Customer (adapt branding)
│   │
│   ├── JobRequestModal.jsx          # NEW — 30s countdown popup for incoming job
│   ├── JobCard.jsx                  # NEW — job summary card (list item)
│   ├── StatusPill.jsx               # NEW — colored booking status chip
│   ├── EarningsChart.jsx            # NEW — 7-day bar chart (Reanimated)
│   ├── OTPVerifySheet.jsx           # NEW — bottom sheet for door OTP input
│   ├── DocumentUploadCard.jsx       # NEW — upload card with status (pending/verified/rejected)
│   └── OnlineToggle.jsx             # NEW — large online/offline toggle with animation
│
├── constants/
│   └── theme.js                     # COPIED from Customer
│
├── context/
│   ├── auth.js                      # COPIED from Customer
│   ├── theme.js                     # COPIED from Customer
│   └── provider.js                  # NEW — provider profile + availability state
│
├── utils/
│   ├── api.js                       # COPIED from Customer
│   ├── normalize.js                 # COPIED + extended with normalizeJob, normalizeEarning
│   ├── location.js                  # NEW — background location task definition
│   └── s3Upload.js                  # NEW — presigned URL upload helper
│
└── assets/                          # Icons, splash, adaptive icon
```

---

## 5. Babel & Config Setup

### `babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@components': './components',
          '@constants':  './constants',
          '@context':    './context',
          '@utils':      './utils',
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
```

### `.env` (already exists in repo root)

```
EXPO_PUBLIC_API_BASE_URL=https://1ipuylc4mh.execute-api.ap-south-1.amazonaws.com/Prod
```

Expo automatically exposes `EXPO_PUBLIC_*` variables to the JS bundle via `process.env` — no extra packages or `expo-constants` import needed. The variable is inlined at build time for both dev and production EAS builds.

### `app.json` — key changes from Customer copy

```json
{
  "expo": {
    "name": "7StarWorker",
    "slug": "7starworker",
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        { "cameraPermission": "Allow 7StarWorker to access your camera for proof of job completion." }
      ],
      [
        "expo-image-picker",
        { "photosPermission": "Allow 7StarWorker to access photos for document uploads." }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "7StarWorker needs your location to show customers where you are during a job.",
          "locationAlwaysPermission": "7StarWorker uses background location to track your route during active jobs.",
          "isIosBackgroundLocationEnabled": true,
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ]
  }
}
```

---

## 6. Context & Utilities

### `context/provider.js` (NEW)

Stores the provider's own profile and availability state — fetched once on login, updated on toggle.

```js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '@utils/api';
import { useAuth } from '@context/auth';

const ProviderContext = createContext({});

export function ProviderProvider({ children }) {
  const { token } = useAuth();
  const [profile,     setProfile]     = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading,     setLoading]     = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/providers/me', token);
      const p   = res.data;
      setProfile(p);
      setIsAvailable(!!p.is_available);
    } catch (e) {
      console.warn('[Provider] fetchProfile failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const toggleAvailability = useCallback(async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await api.patch('/providers/me/availability', { is_available: next }, token);
    } catch (e) {
      setIsAvailable(!next); // rollback on error
    }
  }, [isAvailable, token]);

  return (
    <ProviderContext.Provider value={{ profile, isAvailable, loading, fetchProfile, toggleAvailability }}>
      {children}
    </ProviderContext.Provider>
  );
}

export const useProvider = () => useContext(ProviderContext);
```

### `utils/normalize.js` — additions for worker app

Append these at the bottom of the copied Customer normalize.js:

```js
export function normalizeJob(b) {
  let snap = b.service_snapshot;
  if (typeof snap === 'string') { try { snap = JSON.parse(snap); } catch { snap = null; } }
  let addr = b.address_snapshot;
  if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { addr = null; } }
  let proof = b.proof_photos;
  if (typeof proof === 'string') { try { proof = JSON.parse(proof); } catch { proof = []; } }

  return {
    id:            b.booking_id,
    customerId:    b.customer_id,
    status:        b.status ?? 'PENDING',
    scheduledAt:   b.scheduled_at,
    totalAmount:   b.total_amount ?? 0,
    platformFee:   b.platform_fee ?? 0,
    providerEarning: (b.total_amount ?? 0) - (b.platform_fee ?? 0),
    paymentStatus: b.payment_status,
    isInstant:     !!b.is_instant,
    doorOtp:       b.door_otp ?? null,
    doorOtpVerified: !!b.door_otp_verified,
    proofPhotos:   Array.isArray(proof) ? proof : [],
    customerNotes: b.customer_notes ?? '',
    service: {
      id:       b.service_id,
      name:     snap?.name ?? 'Service',
      duration: snap?.duration ?? 60,
      image:    snap?.image_url ?? null,
    },
    address: {
      fullAddress: addr?.full_address ?? addr?.fullAddress ?? 'Address on file',
      lat:  addr?.lat  ?? null,
      lng:  addr?.lng  ?? null,
      city: addr?.city ?? '',
    },
    createdAt: b.created_at,
  };
}

export function normalizeEarning(e) {
  return {
    id:        e.earning_id,
    bookingId: e.booking_id,
    amount:    e.amount ?? 0,
    type:      e.type ?? 'BOOKING',  // BOOKING | TIP | BONUS | DEDUCTION
    createdAt: e.created_at,
    timeAgo:   timeAgo(e.created_at),
  };
}

export function normalizeProvider(p) {
  return {
    id:              p.provider_id,
    userId:          p.user_id,
    status:          p.status,          // PENDING | APPROVED | SUSPENDED | REJECTED
    isAvailable:     !!p.is_available,
    avgRating:       p.avg_rating ?? 0,
    totalReviews:    p.total_reviews ?? 0,
    acceptanceRate:  p.acceptance_rate ?? 1,
    walletBalance:   p.wallet_balance ?? 0,
    bankAccount:     p.bank_account_number ?? '',
    bankIfsc:        p.bank_ifsc ?? '',
    bio:             p.bio ?? '',
    yearsExp:        p.years_experience ?? 0,
  };
}
```

### `utils/s3Upload.js` (NEW)

Helper to upload a file to S3 via a presigned PUT URL.

```js
import * as FileSystem from 'expo-file-system';

export async function uploadToS3(presignedUrl, fileUri, contentType = 'image/jpeg') {
  const result = await FileSystem.uploadAsync(presignedUrl, fileUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (result.status !== 200) {
    throw new Error(`S3 upload failed: ${result.status}`);
  }
  return result;
}
```

---

## 7. Screen-by-Screen Build Guide

### 7.1 `app/index.jsx` — Auth Gate

Reads token from AsyncStorage via `useAuth()`. Decides where to send the user:

```
token missing           → router.replace('/(auth)/login')
token present + provider.status = PENDING   → router.replace('/onboarding/personal')
token present + provider.status = APPROVED  → router.replace('/(tabs)')
token present + provider.status = REJECTED  → show rejection screen inline
```

```jsx
import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { DarkColors } from '@constants/theme';

export default function Index() {
  const { token, loading: authLoading } = useAuth();
  const { profile, fetchProfile, loading: provLoading } = useProvider();

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace('/(auth)/login'); return; }
    fetchProfile();
  }, [token, authLoading]);

  useEffect(() => {
    if (!profile) return;
    if (profile.status === 'APPROVED') router.replace('/(tabs)');
    else router.replace('/onboarding/personal');
  }, [profile]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DarkColors.background }}>
      <ActivityIndicator color={DarkColors.primary} size="large" />
    </View>
  );
}
```

---

### 7.2 `app/(auth)/login.jsx` — Phone Entry

**Copy** `../Customer/app/(auth)/login.jsx`.

Change two things only:
1. Logo subtitle: `'Expert Partner App'` instead of `'Premium Home Services'`
2. Trust badges: replace customer-facing badges with:
   - `{ icon: 'cash-outline', text: 'Earn Daily' }`
   - `{ icon: 'shield-checkmark-outline', text: 'Verified Platform' }`
   - `{ icon: 'star-outline', text: '₹500 Referral Bonus' }`

Everything else (shake animation, OTP API call, navigation) is identical.

---

### 7.3 `app/(auth)/otp.jsx` — OTP Verify

**Copy** `../Customer/app/(auth)/otp.jsx` as-is.

After successful `POST /auth/verify-otp`, the token is stored and `app/index.jsx` handles routing. No changes needed.

---

### 7.4 `app/(tabs)/_layout.jsx` — Tab Shell

Three tabs: **Jobs | Earnings | Profile**. Uses the same `FloatingTabBar` component.

```jsx
import { Tabs } from 'expo-router';
import FloatingTabBar from '@components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Jobs' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

Update `FloatingTabBar.jsx`'s TABS constant for the worker app:

```js
const TABS = [
  { name: 'index',    icon: 'briefcase-outline',  activeIcon: 'briefcase',  label: 'Jobs'     },
  { name: 'earnings', icon: 'wallet-outline',      activeIcon: 'wallet',     label: 'Earnings' },
  { name: 'profile',  icon: 'person-outline',      activeIcon: 'person',     label: 'Profile'  },
];
```

---

### 7.5 `app/(tabs)/index.jsx` — Jobs Screen

**Purpose:** Shows the Online/Offline toggle and all current/past jobs.

**Sections:**
- `OnlineToggle` component (large animated toggle at top)
- Live / In Progress job banner (if any) → taps to `/job/[id]`
- Filter tabs: All | Incoming (PENDING) | Active (ACCEPTED/EN_ROUTE/IN_PROGRESS) | Completed | Cancelled
- `JobCard` list with pull-to-refresh
- `JobRequestModal` overlay — fires when a push notification arrives with `type: 'job_request'`

**API calls:**
```
GET /bookings                → lists provider's own bookings (role=PROVIDER inferred from JWT)
PATCH /providers/me/availability  → from OnlineToggle
```

**State:**
```js
const [jobs,        setJobs]        = useState([]);
const [activeFilter, setFilter]     = useState('All');
const [loading,     setLoading]     = useState(true);
const [refreshing,  setRefreshing]  = useState(false);
const [incomingJob, setIncomingJob] = useState(null); // triggers JobRequestModal
```

**Push notification handler** (register in useEffect):
```js
import * as Notifications from 'expo-notifications';  // built into expo SDK

useEffect(() => {
  const sub = Notifications.addNotificationReceivedListener(notif => {
    if (notif.request.content.data?.type === 'job_request') {
      const bookingId = notif.request.content.data?.booking_id;
      // fetch job detail and show modal
      fetchJobDetail(bookingId).then(job => setIncomingJob(job));
    }
  });
  return () => sub.remove();
}, []);
```

Note: `expo-notifications` is bundled in the `expo` package — no separate install needed.

---

### 7.6 `app/(tabs)/earnings.jsx` — Earnings Screen

**Purpose:** Wallet balance, 7-day earnings bar chart, earnings history list.

**Sections:**
- Header: wallet balance (large, gradient text)
- `EarningsChart` — 7-day bar chart built with Reanimated (no extra chart lib needed)
- Summary row: This week | This month | Total
- "Request Payout" CTA button (disabled if wallet < ₹100 minimum)
- `FlatList` of earning rows (BOOKING | TIP | BONUS | DEDUCTION)

**API calls:**
```
GET /providers/me           → wallet_balance
GET /bookings               → completed bookings count + amounts
POST /payments/payout-request → body: { amount: walletBalance }
```

**Payout flow:**
```
Tap "Request Payout"
  → Alert: "Request payout of ₹X to account ****1234?"
  → Confirm → POST /payments/payout-request
  → Success toast → wallet balance shows 0 (pending)
  → Finance team approves in the finance portal
```

---

### 7.7 `app/(tabs)/profile.jsx` — Provider Profile

**Purpose:** Provider info, rating, stats, settings.

**Sections:**
- Avatar + name + phone + rating stars
- Status badge (PENDING / APPROVED / SUSPENDED) with color
- Stats row: Total jobs | Acceptance rate | Avg rating
- Section rows (same pattern as Customer profile):
  - Edit Profile → `/edit-profile`
  - My Documents → `/onboarding/documents` (view/resubmit)
  - Bank Account → `/onboarding/bank`
  - Support → `/support`
  - Notifications toggle
  - Dark Mode toggle
  - Sign Out

**API calls:**
```
GET /providers/me           → full provider profile
GET /auth/me                → name, phone, email, photo_url
```

---

### 7.8 `app/job/[id].jsx` — Job Detail + Lifecycle

This is the most complex screen. It handles the entire job flow after accepting.

**URL param:** `id` = booking_id  
**Route entry points:** Job card tap, live banner tap, push notification deep-link

**Sections (rendered based on `job.status`):**

#### When PENDING (shouldn't normally appear here — handled by JobRequestModal)
Show waiting state.

#### When ACCEPTED
- Service info card (name, scheduled time, earning amount)
- Customer address with "Navigate" button → deep link to Google Maps / Apple Maps
- Provider notes from customer
- "I've Arrived" button → `PATCH /bookings/{id}/status { status: 'EN_ROUTE' }`
- Chat button (placeholder for Week 4)

```js
const handleNavigate = (lat, lng, label) => {
  const url = Platform.select({
    ios:     `maps://app?daddr=${lat},${lng}`,
    android: `google.navigation:q=${lat},${lng}`,
  });
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  });
};
```

#### When EN_ROUTE
- Same address card
- "Customer will show you a 4-digit OTP when you arrive"
- `OTPVerifySheet` — bottom sheet with 4 PIN inputs → POST /bookings/{id}/otp-verify → status becomes IN_PROGRESS

#### When IN_PROGRESS
- Job started banner with elapsed timer
- Checklist (hardcoded for MVP — derived from service name)
- "Complete Job" button → opens proof photo picker flow

**Complete Job flow:**
```
Tap "Complete Job"
  → expo-image-picker.launchCameraAsync() or launchImageLibraryAsync()
  → Pick 1–2 photos
  → For each photo:
     1. POST /documents/upload-url { doc_type: 'PROOF_PHOTO', booking_id }
     2. GET presigned URL from response
     3. uploadToS3(presignedUrl, fileUri)
     4. POST /documents/confirm { s3_key, booking_id }
  → PATCH /bookings/{id}/status { status: 'COMPLETED', proof_photos: [s3Key1, s3Key2] }
  → Navigate back to Jobs tab → show earning credited toast
```

#### When COMPLETED
- Summary card: duration, amount earned, customer address
- Review received (if any)
- "Back to Jobs" button

**Key implementation patterns:**
```js
import { useLocalSearchParams, router } from 'expo-router';

export default function JobDetail() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    fetchJob();
  }, [id]));

  const fetchJob = async () => {
    const res = await api.get(`/bookings/${id}`, token);
    setJob(normalizeJob(res.data));
    setLoading(false);
  };

  // ... render based on job.status
}
```

---

### 7.9 `app/onboarding/personal.jsx` — Personal Info

**Purpose:** Collect name, profile photo, gender, bio. First onboarding step.

**Fields:**
- Profile photo — `expo-image-picker` → upload to S3 media bucket → save URL
- Full name (TextInput)
- Gender (pill selector: Male | Female | Other)
- Bio / short description (TextInput multiline)

**On Submit:**
```
PATCH /auth/me { name, photo_url }
PATCH /providers/me { bio }
→ router.push('/onboarding/services')
```

**Progress indicator** at top: Step 1 of 5 (filled bar segments)

---

### 7.10 `app/onboarding/services.jsx` — Select Services

**Purpose:** Provider picks which services they offer.

**UI:** Grid of service category cards. Each card shows the category icon + name. Multi-select with checkmark overlay.

```
GET /categories              → list all service categories
POST /provider-services      → body: { service_ids: ['s1', 's3', 's7'] }
```

Min 1 service required to proceed. Show validation message if none selected.

**Progress:** Step 2 of 5

---

### 7.11 `app/onboarding/documents.jsx` — Document Upload

**Purpose:** Upload Aadhaar (front + back), PAN card, police verification (optional), skill certificate (optional).

**Required docs:**
- Aadhaar Front
- Aadhaar Back
- PAN Card

**Optional docs:**
- Police Verification Certificate
- Skill Certificate

Each doc slot shows a `DocumentUploadCard` with three states:
- Empty → tap to pick/capture
- Uploaded (pending review) → shows thumbnail + "Pending" badge
- Verified → green checkmark
- Rejected → red X + rejection reason + "Resubmit" button

**Upload flow per document:**
```
1. Tap DocumentUploadCard → ActionSheet: "Camera" or "Gallery"
2. expo-image-picker → get fileUri
3. POST /documents/upload-url { doc_type: 'AADHAAR_FRONT' }
4. uploadToS3(presignedUrl, fileUri)          (from utils/s3Upload.js)
5. POST /documents/confirm { doc_type, s3_key }
6. Update local state → show thumbnail
```

On "Submit for Review":
```
→ Only enabled when Aadhaar Front + Back + PAN are uploaded
→ router.push('/onboarding/bank')
```

**Note:** This screen is also accessible from Profile → My Documents for resubmission.

**Progress:** Step 3 of 5

---

### 7.12 `app/onboarding/bank.jsx` — Bank Details

**Purpose:** Bank account number + IFSC for payouts.

**Fields:**
- Account Number (numeric TextInput, mask all but last 4 on blur)
- Confirm Account Number (validate match)
- IFSC Code (uppercase, alphanumeric, 11 chars — format: XXXX0XXXXXX)
- Bank Name (auto-detected from IFSC via a simple lookup table for top banks, or manual entry)

**On Submit:**
```
PATCH /providers/me { bank_account_number, bank_ifsc }
→ router.push('/onboarding/availability')
```

**Progress:** Step 4 of 5

---

### 7.13 `app/onboarding/availability.jsx` — Working Hours

**Purpose:** Set which days and hours the provider is available.

**UI:** 7-day grid (Mon–Sun). Each day has a toggle + time range picker (start time → end time).

**Data shape:**
```js
// Saved as JSON to providers.availability_schedule (add this column if not present,
// or store as part of provider profile update)
{
  "mon": { "enabled": true,  "from": "09:00", "to": "18:00" },
  "tue": { "enabled": true,  "from": "09:00", "to": "18:00" },
  "wed": { "enabled": false, "from": "09:00", "to": "18:00" },
  ...
}
```

**On Submit:**
```
PATCH /providers/me { availability_schedule: JSON.stringify(schedule) }
→ router.replace('/(tabs)')
→ Show "Application submitted! Admin will review within 24-48 hours." alert
```

**Progress:** Step 5 of 5

---

### 7.14 `app/support/index.jsx` — Support Tickets

**Purpose:** Provider raises and views support tickets.

**Sections:**
- "New Ticket" button → inline form (subject, category, optional booking ID)
- My tickets list with status badges

**API calls:**
```
GET /support/tickets            → my tickets
POST /support/tickets           → create ticket
GET /support/tickets/{id}       → ticket detail (on row tap → modal or new screen)
POST /support/tickets/{id}/messages → reply
```

---

### 7.15 `app/notifications.jsx` — Notification History

**Copy** and adapt from Customer. Same `GET /notifications` + `PATCH /notifications/{id}/read`.

---

## 8. New Components

### 8.1 `components/JobCard.jsx`

Job summary card for the jobs list.

```
Props:
  job       — normalizeJob() output
  onPress   — navigate to /job/[id]
  compact   — bool (smaller version for history list)

Visual:
  Left: service icon (from category color) with status-colored dot
  Center: service name, scheduled date+time, address city
  Right: earning amount, status pill
  Bottom (if ACCEPTED/EN_ROUTE/IN_PROGRESS): action buttons (Navigate / Mark Arrived / etc.)

Status → color mapping uses Colors.status from theme.js
```

### 8.2 `components/JobRequestModal.jsx`

Full-screen modal (or very tall bottom sheet) that fires when a push notification with `type: 'job_request'` arrives.

```
Props:
  visible   — bool
  job       — normalizeJob() output
  onAccept  — async fn() → PATCH /bookings/{id}/status { status: 'ACCEPTED' }
  onReject  — async fn() → PATCH /bookings/{id}/status { status: 'REJECTED' }
  onTimeout — fn() called after 30s if no action taken

Visual:
  Dark overlay background (Modal with transparent background)
  Center card (glassmorphism):
    - Service name + category
    - Customer address (city only for privacy)
    - Distance: "~3.2 km away"
    - Earning: "₹580" (large, accent gold color)
    - Circular countdown timer (30s) — Animated arc drawn with Reanimated
    - Two buttons: [✕ Decline] [✓ Accept]

Countdown:
  Animated.Value starts at 30, counts down every second
  Arc drawn as SVG path or Reanimated canvas stroke around a circle
  Red at <10s, amber at <20s, green otherwise

Auto-reject:
  If timer reaches 0 → call onTimeout → close modal
  Backend receives no ACCEPTED status → job goes to next provider (backend handles this)
```

**Implementation note:** Use `useEffect` + `setInterval` for the countdown. Store the interval ref and clear it on unmount or when action is taken.

### 8.3 `components/OTPVerifySheet.jsx`

Bottom sheet for the door OTP entry (provider enters the 4 digits shown to the customer).

```
Props:
  visible    — bool
  bookingId  — string
  onSuccess  — fn() called when OTP verified → status becomes IN_PROGRESS
  onClose    — fn()

Visual:
  Modal with slide_from_bottom animation (manual Animated spring)
  Title: "Enter Customer OTP"
  Subtitle: "Ask the customer to show their 4-digit code"
  4 large PIN input boxes (auto-advance on each digit)
  "Verify" button (disabled until 4 digits entered)
  Error message if OTP wrong

API:
  POST /bookings/{bookingId}/otp-verify { otp: '1234' }
  → 200: success → call onSuccess
  → 400: wrong OTP → show "Incorrect OTP. Try again."
```

### 8.4 `components/OnlineToggle.jsx`

Large, animated online/offline toggle at the top of the Jobs screen.

```
Props:
  isOnline      — bool
  onToggle      — fn()
  loading       — bool (shows spinner while API call in progress)

Visual (ONLINE state):
  Wide pill button: green gradient background (#10B981 → #059669)
  Left: pulsing green dot
  Center: "You're Online" text
  Right: toggle switch

Visual (OFFLINE state):
  Wide pill button: surfaceRaised background, muted border
  Center: "Go Online" text (primary color)
  Right: toggle switch

Animation:
  Background color interpolated with Animated.Value (0 = offline, 1 = online)
  Pulsing ring on the dot when online (same pattern as Customer bookings live dot)
```

### 8.5 `components/DocumentUploadCard.jsx`

Reusable card for a single document upload slot.

```
Props:
  label         — "Aadhaar Front"
  required      — bool
  status        — 'empty' | 'uploaded' | 'verified' | 'rejected'
  thumbnailUri  — string | null
  rejectionReason — string | null
  onUpload      — fn() → triggers picker flow
  onResubmit    — fn() → same as onUpload

Visual:
  Card with dashed border when empty
  Thumbnail image when uploaded
  Status badge overlay (top-right corner): pending/verified/rejected
  Rejection reason text in red when rejected
  Resubmit button when rejected
```

### 8.6 `components/EarningsChart.jsx`

7-day bar chart for earnings.

```
Props:
  data   — array of { day: 'Mon', amount: 580 } (7 items)
  height — number (default 120)

Implementation:
  Pure React Native — no chart library needed
  Use Reanimated withTiming to animate bar heights on mount
  Bars: gradient fill (primary → secondary)
  Labels: day abbreviation below each bar
  Y-axis: none (amounts shown on tap in a tooltip)
  Today's bar: highlighted with accent color
```

---

## 9. Background Location Task

### `utils/location.js`

This module defines the background task and provides helpers to start/stop location broadcasting.

```js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@utils/api';

const LOCATION_TASK = '7starworker-location';

// Register the background task — must be called at module level (outside components)
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) { console.error('[Location Task]', error); return; }
  const { locations } = data;
  const { latitude, longitude } = locations[0].coords;

  try {
    const token      = await AsyncStorage.getItem('auth_access_token');
    const bookingId  = await AsyncStorage.getItem('active_booking_id');
    if (!token) return;

    // Update provider location in DB (REST, not WebSocket — simpler for background)
    await api.patch('/providers/me/location', { lat: latitude, lng: longitude }, token);

    // If there's an active booking, also send via WebSocket
    // (WebSocket from background is unreliable — REST is the correct approach here)
  } catch (e) {
    console.warn('[Location Task] patch failed:', e.message);
  }
});

export async function startLocationBroadcast(bookingId) {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Background location permission denied');
  }
  await AsyncStorage.setItem('active_booking_id', bookingId);
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,     // every 10 seconds
    distanceInterval: 20,    // or every 20 meters
    foregroundService: {
      notificationTitle: '7StarWorker — Job Active',
      notificationBody:  'Sharing your location with the customer.',
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
  });
}

export async function stopLocationBroadcast() {
  await AsyncStorage.removeItem('active_booking_id');
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
```

**When to start/stop:**
- **Start**: When `job.status` changes to `ACCEPTED` AND `job.scheduledAt` is within 60 minutes (the 1-hour-before trigger). OR immediately for instant bookings.
- **Stop**: 30 minutes after `job.status` becomes `COMPLETED`. Call `stopLocationBroadcast()` in the job completion flow.

**Call `startLocationBroadcast` in `app/job/[id].jsx`:**
```js
// In useEffect watching job.status
useEffect(() => {
  if (job?.status === 'ACCEPTED') {
    const minutesUntilJob = (new Date(job.scheduledAt) - Date.now()) / 60000;
    if (minutesUntilJob <= 65) {
      startLocationBroadcast(job.id).catch(console.warn);
    }
  }
  if (job?.status === 'COMPLETED') {
    stopLocationBroadcast().catch(console.warn);
  }
}, [job?.status]);
```

**Important:** Import `utils/location.js` in `app/_layout.jsx` so `TaskManager.defineTask` runs at app startup before any task could be triggered.

---

## 10. Week-by-Week Build Order

### Week 1 — Auth + Shell (Days 1–5)

**Goal:** App runs. Login works end-to-end.

| Day | Task |
|-----|------|
| 1 | Init repo. `expo init 7starworker` or clone blank Expo project. Copy files listed in Section 3. Install packages from package.json. |
| 2 | Set up `babel.config.js` with aliases. Verify `@components`, `@constants`, `@context`, `@utils` resolve. |
| 3 | Build `app/_layout.jsx` (copy Customer _layout, add ProviderProvider). Build `app/index.jsx` (auth gate). |
| 4 | Copy + adapt `app/(auth)/login.jsx` and `app/(auth)/otp.jsx`. Wire to real backend (use Premsagar's staging URL). Test OTP login end-to-end on a real device. |
| 5 | Build `app/(tabs)/_layout.jsx` with FloatingTabBar. Build skeleton shell screens for Jobs, Earnings, Profile (just title + EmptyState). Verify tab navigation works. |

**Week 1 checkpoint:** Phone OTP login works. Three tabs are navigable.

---

### Week 2 — Jobs List + Job Request Modal (Days 1–5)

**Goal:** Provider can see jobs and accept/reject with countdown timer.

| Day | Task |
|-----|------|
| 1 | Build `components/OnlineToggle.jsx`. Wire to `PATCH /providers/me/availability`. Wire `GET /providers/me` in `context/provider.js`. |
| 2 | Build `components/JobCard.jsx`. Wire `GET /bookings` in `app/(tabs)/index.jsx`. Show job list with filter tabs. Pull-to-refresh. |
| 3 | Register Expo push token: `POST /notifications/register { token_id, device_type }`. Handle push notification foreground receipt → set `incomingJob` state. |
| 4 | Build `components/JobRequestModal.jsx` with 30s countdown. Wire Accept → `PATCH /bookings/{id}/status ACCEPTED`. Wire Reject → `PATCH /bookings/{id}/status REJECTED`. |
| 5 | Integration test: Yaswanth creates a booking via customer app or Postman → Joel sees JobRequestModal within 10s on a real device. |

**Week 2 checkpoint:** Job request arrives, countdown shows, accept/reject works.

---

### Week 3 — Full Job Lifecycle (Days 1–5)

**Goal:** Provider can navigate to customer, verify OTP, complete job with photos.

| Day | Task |
|-----|------|
| 1 | Build `app/job/[id].jsx` shell. Render different UI per status. Implement "Navigate" button with Maps deep-link. |
| 2 | Wire "I've Arrived" → `PATCH status EN_ROUTE`. Build `components/OTPVerifySheet.jsx`. Wire door OTP verify → `POST /bookings/{id}/otp-verify`. |
| 3 | Request `expo-camera` + `expo-image-picker` permissions. Implement proof photo capture flow. |
| 4 | Implement S3 upload flow: `POST /documents/upload-url` → `uploadToS3` → `POST /documents/confirm`. Wire "Complete Job" → `PATCH status COMPLETED`. |
| 5 | Wire earning credited flow: after COMPLETED, show earning amount in a toast. Navigate to Jobs tab. Verify wallet balance updates in Earnings tab. |

**Week 3 checkpoint:** Full job lifecycle works end-to-end on a real device.

---

### Week 4 — Onboarding + Earnings + Location (Days 1–5)

**Goal:** New provider can onboard. Earnings screen is real. Background location works.

| Day | Task |
|-----|------|
| 1–2 | Build all 5 onboarding screens: `personal.jsx` → `services.jsx` → `documents.jsx` → `bank.jsx` → `availability.jsx`. Wire all API calls. Test complete onboarding flow fresh (new phone number). |
| 3 | Build `components/DocumentUploadCard.jsx`. Wire document status display (pending/verified/rejected) in `documents.jsx`. |
| 4 | Build `app/(tabs)/earnings.jsx`. Wire wallet balance, payout request. Build `components/EarningsChart.jsx` with 7-day animation. |
| 5 | Implement background location task (`utils/location.js`). Test: Joel accepts a booking → Yaswanth sees provider location updating on tracking screen. |

**Week 4 checkpoint:** New provider onboarding works. Earnings screen real. Customer sees provider location.

---

### Week 5 — Integration Testing + Bug Fixes (Days 1–5)

**Goal:** Full journey A (customer) and B (provider) complete without errors.

| Day | Task |
|-----|------|
| 1–2 | Run Journey B end-to-end: new phone → OTP → onboarding → documents → admin approves → toggle online → receive job → accept → navigate → OTP → complete → earnings. |
| 3 | Build `app/support/index.jsx`. Build `app/notifications.jsx`. Wire `GET /notifications`. |
| 4 | Fix all P0/P1 bugs from Days 1–3. Polish: loading skeletons on every list, error retry states, empty states. |
| 5 | Test on both Android (physical device) and iOS (simulator). Prepare EAS production build config. |

---

## 11. API Quick Reference

All endpoints use the base URL from `EXPO_PUBLIC_API_BASE_URL` in `.env` (already set to the live staging API). The `utils/api.js` reads it via `process.env.EXPO_PUBLIC_API_BASE_URL` — no hardcoding needed.
JWT is attached automatically via `api.get/post/patch` helpers.

| Screen | Method | Endpoint | Body / Notes |
|--------|--------|----------|--------------|
| Login | POST | `/auth/send-otp` | `{ phone }` |
| OTP | POST | `/auth/verify-otp` | `{ phone, otp }` |
| Jobs list | GET | `/bookings` | JWT role=PROVIDER → provider's own jobs |
| Accept job | PATCH | `/bookings/{id}/status` | `{ status: 'ACCEPTED' }` |
| Reject job | PATCH | `/bookings/{id}/status` | `{ status: 'REJECTED' }` |
| Mark arrived | PATCH | `/bookings/{id}/status` | `{ status: 'EN_ROUTE' }` |
| Verify door OTP | POST | `/bookings/{id}/otp-verify` | `{ otp: '1234' }` |
| Complete job | PATCH | `/bookings/{id}/status` | `{ status: 'COMPLETED' }` |
| Toggle online | PATCH | `/providers/me/availability` | `{ is_available: true/false }` |
| Update location | PATCH | `/providers/me/location` | `{ lat, lng }` |
| My profile | GET | `/providers/me` | — |
| Update profile | PATCH | `/providers/me` | `{ bio, bank_account_number, bank_ifsc }` |
| Update user info | PATCH | `/auth/me` | `{ name, photo_url }` |
| Select services | POST | `/provider-services` | `{ service_ids: ['s1', 's3'] }` |
| Doc upload URL | POST | `/documents/upload-url` | `{ doc_type: 'AADHAAR_FRONT' }` |
| Confirm upload | POST | `/documents/confirm` | `{ doc_type, s3_key }` |
| My documents | GET | `/documents/mine` | — |
| Wallet balance | GET | `/providers/me` | field: `wallet_balance` (paise) |
| Request payout | POST | `/payments/payout-request` | `{ amount }` |
| Register push token | POST | `/notifications/register` | `{ token_id, device_type }` |
| Notifications | GET | `/notifications` | — |
| Mark read | PATCH | `/notifications/{id}/read` | — |
| Create ticket | POST | `/support/tickets` | `{ subject, category, booking_id? }` |
| My tickets | GET | `/support/tickets` | — |
| Reply to ticket | POST | `/support/tickets/{id}/messages` | `{ content }` |

---

## Key Implementation Rules

1. **Styling**: `StyleSheet.create` only — same as Customer app. Never hardcode colors; always use `Colors.xxx` from `useTheme()`.

2. **No relative imports**: Always use aliases (`@components/JobCard`, `@utils/api`, etc.).

3. **Amount display**: All amounts from API are in **paise** (₹1 = 100 paise). Display as: `₹${(amount / 100).toLocaleString('en-IN')}`.

4. **Permissions**: Request location and camera permissions gracefully — show an explanation screen before the system prompt if permission was previously denied.

5. **Background task registration**: `TaskManager.defineTask(LOCATION_TASK, ...)` must run at the top level of `utils/location.js` (outside any component), and that file must be imported in `app/_layout.jsx` to ensure it registers before the OS could fire it.

6. **Onboarding gate**: The `app/index.jsx` auth gate must check `provider.status` after every login. If `PENDING`, redirect to onboarding regardless of which step was last completed — the individual onboarding screens track their own completion by checking what data is already filled.

7. **Token refresh**: Not implemented in the Customer `utils/api.js`. For Week 1, 15-minute access tokens will require re-login. Implement silent refresh (call `POST /auth/refresh` with the stored refresh token when API returns 401) before Week 5 polish sprint.
