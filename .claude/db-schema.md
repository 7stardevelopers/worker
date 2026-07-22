# Database Schema Reference

Primary DB: Aurora Serverless v2 (PostgreSQL) via Prisma ORM.  
Chat + notifications: DynamoDB. Provider presence: ElastiCache Redis.

---

## Core Tables (Prisma Schema)

```prisma
model User {
  id        String   @id @default(uuid())
  phone     String   @unique
  name      String
  email     String?
  avatar    String?
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())

  addresses    Address[]
  bookings     Booking[]        @relation("CustomerBookings")
  subscription UserSubscription?
  referralCode String           @unique
}

enum Role { CUSTOMER PROVIDER ADMIN SUPPORT FINANCE }

model Provider {
  id          String         @id @default(uuid())
  userId      String         @unique
  status      ProviderStatus @default(PENDING)
  isAvailable Boolean        @default(false)
  rating      Float          @default(0)
  lat         Float?
  lng         Float?

  user      User               @relation(fields: [userId], references: [id])
  services  ProviderService[]
  bookings  Booking[]          @relation("ProviderBookings")
  documents ProviderDocument[]
  earnings  ProviderEarning[]
}

enum ProviderStatus { PENDING APPROVED REJECTED SUSPENDED }

model Service {
  id          String   @id @default(uuid())
  categoryId  String
  name        String
  description String
  basePrice   Int
  duration    Int      // minutes
  rating      Float    @default(0)
  reviewCount Int      @default(0)
  isActive    Boolean  @default(true)

  category Category @relation(fields: [categoryId], references: [id])
  packages ServicePackage[]
  bookings Booking[]
}

model Booking {
  id          String        @id @default(uuid())
  customerId  String
  providerId  String?
  serviceId   String
  addressId   String
  status      BookingStatus @default(PENDING)
  scheduledAt DateTime
  completedAt DateTime?
  totalAmount Int           // in paise (₹1 = 100)
  createdAt   DateTime      @default(now())

  customer Customer @relation("CustomerBookings", fields: [customerId], references: [id])
  provider Provider? @relation("ProviderBookings", fields: [providerId], references: [id])
  service  Service  @relation(fields: [serviceId], references: [id])
  address  Address  @relation(fields: [addressId], references: [id])
  review   Review?
  tip      Tip?
  otp      BookingOtp?
}

enum BookingStatus { PENDING ACCEPTED EN_ROUTE IN_PROGRESS COMPLETED CANCELLED REJECTED }

model Review {
  id        String  @id @default(uuid())
  bookingId String  @unique
  rating    Int     // 1-5
  comment   String?
  createdAt DateTime @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
}

model Tip {
  id         String   @id @default(uuid())
  bookingId  String   @unique
  customerId String
  providerId String
  amount     Int      // in paise
  createdAt  DateTime @default(now())
}

model Address {
  id          String  @id @default(uuid())
  userId      String
  label       String  // 'Home', 'Office', etc.
  fullAddress String
  lat         Float?
  lng         Float?
  isDefault   Boolean @default(false)

  user     User      @relation(fields: [userId], references: [id])
  bookings Booking[]
}
```

---

## New Tables (Phase 2–4)

```prisma
model SubscriptionPlan {
  id               String @id @default(uuid())
  name             String // 'Basic', 'Pro', 'Elite'
  price            Int    // monthly, in paise
  bookingsIncluded Int
  discountPct      Int
  isActive         Boolean @default(true)
}

model UserSubscription {
  id        String   @id @default(uuid())
  userId    String   @unique
  planId    String
  startsAt  DateTime
  expiresAt DateTime
  status    String   // ACTIVE | EXPIRED | CANCELLED
}

model Coupon {
  id        String   @id @default(uuid())
  code      String   @unique
  type      String   // FLAT | PERCENT
  value     Int
  maxUses   Int
  usedCount Int      @default(0)
  expiresAt DateTime
}

model SupportTicket {
  id         String   @id @default(uuid())
  userId     String
  bookingId  String?
  category   String
  status     String   @default("OPEN")  // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  priority   String   @default("NORMAL") // LOW | NORMAL | HIGH | URGENT
  createdAt  DateTime @default(now())

  messages TicketMessage[]
}

model TicketMessage {
  id         String   @id @default(uuid())
  ticketId   String
  senderId   String
  content    String
  isInternal Boolean  @default(false) // support-only notes
  createdAt  DateTime @default(now())
}

model ProviderDocument {
  id         String   @id @default(uuid())
  providerId String
  type       String   // AADHAAR | PAN | POLICE_VERIFICATION | SKILL_CERT
  fileUrl    String   // S3 presigned or CloudFront URL
  status     String   @default("PENDING") // PENDING | APPROVED | REJECTED
  verifiedAt DateTime?
}

model ProviderEarning {
  id         String   @id @default(uuid())
  providerId String
  bookingId  String
  amount     Int      // in paise
  type       String   // JOB | TIP | REFERRAL_BONUS
  createdAt  DateTime @default(now())
}
```

---

## DynamoDB (Chat + Notifications)

**Table: `chat_messages`**
```
PK: bookingId (String)
SK: timestamp#messageId (String)
Attributes: senderId, senderRole, content, createdAt
TTL: 90 days from createdAt
```

**Table: `notifications`**
```
PK: userId (String)
SK: timestamp#notificationId (String)
Attributes: type, title, body, data (JSON), isRead
TTL: 30 days
```

**Table: `provider_locations`**
```
PK: providerId (String)
Attributes: lat, lng, updatedAt
TTL: 5 minutes (refreshed by worker app heartbeat)
```

---

## Redis Keys (ElastiCache)

| Key pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `otp:{phone}` | `{code}:{attempts}` | 10 min | OTP validation |
| `token:blacklist:{jti}` | `1` | Token expiry | Logout invalidation |
| `provider:online:{id}` | `1` | 60 sec | Heartbeat presence |
| `rate:{ip}:otp` | count | 1 hour | OTP rate limiting |
| `rate:{userId}:api` | count | 1 min | Per-user API rate limit |
