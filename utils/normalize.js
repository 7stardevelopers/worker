const COUPON_COLORS = ['#6366F1', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];

export function normalizeCategory(cat) {
  return {
    id: cat.category_id,
    name: cat.name,
    color: cat.color ?? '#6366F1',
    icon: cat.icon ?? '🔧',
    sortOrder: cat.sort_order ?? 0,
  };
}

export function normalizeService(svc) {
  let images = svc.images;
  if (typeof images === 'string') { try { images = JSON.parse(images); } catch { images = []; } }
  images = Array.isArray(images) ? images : [];

  let includes = svc.includes;
  if (typeof includes === 'string') { try { includes = JSON.parse(includes); } catch { includes = []; } }
  includes = Array.isArray(includes) ? includes : [];

  return {
    id: svc.service_id,
    categoryId: svc.category_id,
    name: svc.name,
    description: svc.description ?? '',
    basePrice: svc.base_price ?? 0,
    rating: svc.rating ? Number(svc.rating) : 4.5,
    reviewCount: svc.review_count ?? 0,
    duration: svc.duration ?? 60,
    images,
    image: svc.image_url ?? (images[0] ?? null),
  };
}

export function normalizeBooking(b) {
  let snap = b.service_snapshot;
  if (typeof snap === 'string') { try { snap = JSON.parse(snap); } catch { snap = null; } }

  let addr = b.address_snapshot;
  if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { addr = null; } }

  return {
    id: b.booking_id,
    status: b.status ?? 'PENDING',
    scheduledAt: b.scheduled_at,
    totalAmount: b.total_amount ?? 0,
    paymentStatus: b.payment_status,
    service: {
      id: b.service_id,
      name: snap?.name ?? 'Service',
      duration: snap?.duration ?? 60,
      image: snap?.image_url ?? null,
    },
    address: {
      fullAddress: addr?.full_address ?? addr?.fullAddress ?? 'Address on file',
    },
  };
}

export function normalizeNotification(n) {
  const NOTIF_CONFIG = {
    booking:  { icon: 'calendar-outline',           color: '#6366F1' },
    tracking: { icon: 'location-outline',           color: '#8B5CF6' },
    promo:    { icon: 'pricetag-outline',           color: '#F59E0B' },
    review:   { icon: 'star-outline',               color: '#10B981' },
    system:   { icon: 'information-circle-outline', color: '#3B82F6' },
    payment:  { icon: 'card-outline',               color: '#10B981' },
  };
  const cfg = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.system;
  return {
    id: n.notification_id,
    type: n.type,
    icon: cfg.icon,
    color: cfg.color,
    read: !!n.read_ind,
    title: n.title,
    body: n.body,
    time: timeAgo(n.created_at),
  };
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function normalizeJob(b) {
  let snap = b.service_snapshot;
  if (typeof snap === 'string') { try { snap = JSON.parse(snap); } catch { snap = null; } }
  let addr = b.address_snapshot;
  if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch { addr = null; } }
  let proof = b.proof_photos;
  if (typeof proof === 'string') { try { proof = JSON.parse(proof); } catch { proof = []; } }

  return {
    id:              b.booking_id,
    customerId:      b.customer_id,
    customerName:    b.customer_name ?? 'Customer',
    customerPhoto:   b.customer_photo ?? null,
    status:          b.status ?? 'PENDING',
    scheduledAt:     b.scheduled_at,
    totalAmount:     b.total_amount ?? 0,
    platformFee:     b.platform_fee ?? 0,
    providerEarning: (b.total_amount ?? 0) - (b.platform_fee ?? 0),
    paymentStatus:   b.payment_status,
    isInstant:       !!b.is_instant,
    doorOtp:         b.door_otp ?? null,
    doorOtpVerified: !!b.door_otp_verified,
    proofPhotos:     Array.isArray(proof) ? proof : [],
    customerNotes:   b.customer_notes ?? '',
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
    type:      e.type ?? 'BOOKING',
    createdAt: e.created_at,
    timeAgo:   timeAgo(e.created_at),
  };
}

export function normalizeProvider(p) {
  return {
    id:             p.provider_id,
    userId:         p.user_id,
    status:         p.status,
    isAvailable:    !!p.is_available,
    avgRating:      p.avg_rating ?? 0,
    totalReviews:   p.total_reviews ?? 0,
    acceptanceRate: p.acceptance_rate ?? 1,
    walletBalance:  p.wallet_balance ?? 0,
    bankAccount:    p.bank_account_number ?? '',
    bankIfsc:       p.bank_ifsc ?? '',
    bio:            p.bio ?? '',
    yearsExp:       p.years_experience ?? 0,
  };
}
