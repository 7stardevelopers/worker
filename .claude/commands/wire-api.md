# Wire up a real API endpoint

Replace a mock data source or placeholder with a real API call for the endpoint described in $ARGUMENTS.

**API utility** (already set up — use it, don't recreate):
```js
import { api } from '@utils/api';
// api.get(path, token) | api.post(path, body, token) | api.patch(path, body, token) | api.delete(path, token)
// Token comes from: const { token } = useAuth();
// Throws on non-2xx. Base URL from process.env.EXPO_PUBLIC_API_BASE_URL
```

**Standard fetch pattern:**
```js
const { token } = useAuth();
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useFocusEffect(useCallback(() => {
  let active = true;
  api.get('/endpoint', token)
    .then(res => { if (active) setData(res.data); })
    .catch(e => console.warn('[Screen]', e.message))
    .finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
}, [token]));
```

---

## Worker App Endpoints

### Provider Profile
```
GET  /providers/me                          → Provider profile + status
PATCH /providers/me                         → Update name, bio, avatar
PATCH /providers/me/availability            → Body: { isAvailable: boolean }
PATCH /providers/me/location               → Body: { lat, lng }  (sent every 10s by location.js)
```

### Jobs (Provider POV)
```
GET  /providers/bookings                   → Job[] (supports ?status= filter)
GET  /providers/bookings/:id               → Full job detail
PATCH /bookings/:id/accept                 → Accept incoming job
PATCH /bookings/:id/reject                 → Reject with reason
  Body: { reason?: string }
PATCH /bookings/:id/start                  → Mark EN_ROUTE (starts location broadcast)
PATCH /bookings/:id/otp-verify             → Verify door OTP → IN_PROGRESS
  Body: { otp: string }
PATCH /bookings/:id/complete               → Complete job
  Body: { proofPhotoKeys?: string[] }      // S3 keys from s3Upload.js
```

### Finance & Earnings
```
GET  /finance/wallet                       → { balance: number (paise), pendingPayout: number }
GET  /finance/earnings                     → ProviderEarning[] (supports ?page=, ?limit=)
POST /finance/payout-request               → Body: { amount: number (paise), bankAccountId: string }
```

### Documents
```
GET  /documents/:providerId               → ProviderDocument[]
POST /documents/upload-url                → Body: { doc_type: 'AADHAAR'|'PAN'|'POLICE_VERIFICATION'|'SKILL_CERT' }
                                          → { presigned_url, s3_key }
POST /documents/confirm                   → Body: { doc_type, s3_key }
```

### Notifications
```
GET  /notifications                        → Notification[]
PATCH /notifications/:id/read             → Mark as read
POST /notifications/register              → Body: { token: string, platform: 'android'|'ios' }
```

### Support
```
POST /support/tickets                     → Body: { bookingId?, category, message }
GET  /support/tickets                     → Ticket[] (own tickets)
GET  /support/tickets/:id                 → Ticket with messages[]
POST /support/tickets/:id/messages        → Body: { content: string }
```

### Auth
```
POST /auth/send-otp                       → Body: { phone: string }
POST /auth/verify-otp                     → Body: { phone, otp } → { access_token, refresh_token, user }
POST /auth/refresh                        → Body: { refresh_token } → { access_token }
```

---

**Normalizers** — always pass raw API response through normalize before setting state:
```js
import { normalizeJob, normalizeEarning, normalizeProvider } from '@utils/normalize';
// normalizeJob(b)       — booking from provider POV
// normalizeEarning(e)   — earning record
// normalizeProvider(p)  — provider profile
```

**Loading state** — show `<Skeleton.*>` while loading, never blank UI.  
**Amounts** — all monetary values in **paise**. Display: `₹${(amount / 100).toLocaleString('en-IN')}`.
