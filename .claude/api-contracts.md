# API Contracts

Base URL: `https://api.7starexperts.com`  
Auth: `Authorization: Bearer <jwt_token>` on all protected routes.  
All responses: `{ success: boolean, data: any, message?: string }`

---

## Auth

```
POST /auth/otp/send
  Body:     { phone: string }          // 10-digit Indian mobile
  Response: { message: "OTP sent" }
  Rate:     5 OTPs/hour per phone (Redis)

POST /auth/otp/verify
  Body:     { phone: string, otp: string }
  Response: { token: string, user: User }
  Note:     OTP is 6-digit, single-use, 10-min expiry

POST /auth/refresh
  Body:     { refreshToken: string }
  Response: { token: string }

POST /auth/logout
  Protected. Blacklists token in Redis.
```

## Users

```
GET  /users/me               → User profile
PATCH /users/me              → Update name, avatar
GET  /users/me/addresses     → Saved addresses
POST /users/me/addresses     → Add address
DELETE /users/me/addresses/:id
PATCH /users/me/addresses/:id/default
```

## Services & Categories

```
GET /categories              → Category[]
GET /services                → Service[] (supports ?categoryId=, ?featured=true, ?recommended=true)
GET /services/:id            → Service with packages[]
GET /services/search?q=      → Service[] matching query
```

## Bookings

```
GET  /bookings               → Booking[] (supports ?status=, ?page=, ?limit=)
GET  /bookings/:id           → Booking with full details
POST /bookings               → Create booking
  Body: { serviceId, scheduledAt, addressId, packageId?, couponCode? }
  Response: { booking, paymentOrder: RazorpayOrder }

PATCH /bookings/:id/cancel   → Cancel booking
  Body: { reason?: string }

POST /bookings/:id/payment-confirm
  Body: { razorpayPaymentId, razorpayOrderId, razorpaySignature }

POST /bookings/:id/otp-verify    (Provider only — customer sees OTP)
  Body: { otp: string }
  → booking.status = IN_PROGRESS

POST /bookings/:id/review
  Body: { rating: 1-5, comment?: string, tags?: string[] }

POST /bookings/:id/tip
  Body: { amount: number }

GET  /bookings/:id/messages  → ChatMessage[]  (DynamoDB)
```

## Coupons

```
POST /coupons/validate
  Body: { code: string, serviceId: string, amount: number }
  Response: { valid: boolean, discount: number, type: 'FLAT'|'PERCENT', message?: string }
```

## Subscriptions

```
GET  /subscriptions/plans    → SubscriptionPlan[]
POST /subscriptions/subscribe
  Body: { planId: string }
  Response: { subscription, paymentOrder }
GET  /subscriptions/mine     → UserSubscription | null
```

## Support

```
POST /support/tickets
  Body: { bookingId?: string, category: string, message: string }
GET  /support/tickets        → Ticket[] (own tickets)
GET  /support/tickets/:id    → Ticket with messages[]
POST /support/tickets/:id/messages
  Body: { content: string }
```

## Providers (Customer-facing)

```
GET /providers/nearby        → Provider[] near lat/lng (for map view)
  Query: ?lat=&lng=&serviceId=
```

---

## Data Models (TypeScript-style reference)

```ts
type User = {
  id: string; name: string; phone: string; email?: string;
  avatar?: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'SUPPORT' | 'FINANCE';
  subscription?: { plan: string; expiresAt: string };
}

type Booking = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  scheduledAt: string;       // ISO 8601
  completedAt?: string;
  totalAmount: number;       // in INR
  tip?: number;
  service: { id: string; name: string; duration: number; categoryId: string };
  provider?: { id: string; user: { name: string; avatar?: string }; rating: number };
  address: { fullAddress: string; lat?: number; lng?: number };
  review?: { rating: number; comment?: string };
  cancelReason?: string;
}

type Service = {
  id: string; categoryId: string; name: string; description: string;
  basePrice: number; duration: number; rating: number; reviewCount: number;
  badge?: string; image: string; images: string[]; includes: string[];
}

type Category = { id: string; name: string; icon: string; color: string }
```

---

## Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | VALIDATION_ERROR | Invalid request body |
| 401 | UNAUTHORIZED | Missing or expired token |
| 403 | FORBIDDEN | Insufficient role |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Already exists (e.g. duplicate booking) |
| 429 | RATE_LIMITED | Too many OTP requests |
| 500 | SERVER_ERROR | Unexpected backend error |

Response shape on error:
```json
{ "success": false, "error": "RATE_LIMITED", "message": "Too many OTP requests. Try again in 55 minutes." }
```
