import { router } from 'expo-router';

/** Screen for a push's `data` payload. `null` = re-run the auth gate. */
export function routeForNotification(data = {}) {
  if (['provider_approved', 'account_approved', 'photo_reset'].includes(data.type)) return null;
  if (data.type === 'support_reply' && data.ticket_id) return `/support/${data.ticket_id}`;
  if (data.type === 'new_message' && data.booking_id) return { pathname: '/chat/[id]', params: { id: data.booking_id } };
  // New job requests open on the job itself, where the worker can see the slot and accept.
  if (data.booking_id) return `/job/${data.booking_id}`;
  return '/notifications';
}

// A push tapped while the app was closed: the auth gate (app/index.jsx) replaces
// the stack with the tabs first, so the jobs tab opens this once it mounts.
let pendingRoute;
let tabsReady = false;
let handledId = null;

export function openNotification(response, { coldStart = false } = {}) {
  const id = response?.notification?.request?.identifier;
  if (!id || id === handledId) return;
  handledId = id;
  const target = routeForNotification(response.notification.request.content?.data ?? {});
  // Re-run the auth gate → straight into the app (or the photo retake). A cold start runs it anyway.
  if (target === null) { if (!coldStart) router.replace('/'); return; }
  if (coldStart && !tabsReady) { pendingRoute = target; return; }
  router.push(target);
}

/** Called by the jobs tab once it's on screen. */
export function consumePendingRoute() {
  tabsReady = true;
  const target = pendingRoute;
  pendingRoute = undefined;
  if (target) router.push(target);
}
