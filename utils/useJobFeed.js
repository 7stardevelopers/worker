import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Notifications from '@utils/notifications';
import { api } from '@utils/api';
import { normalizeJob } from '@utils/normalize';

const POLL_MS = 20000;
const FAST_POLL_MS = 5000; // while a job request popup is open

// Best-effort: clear the "New job near you" banner for a job that's gone.
function dismissOfferBanner(bookingId) {
  Notifications?.getPresentedNotificationsAsync()
    .then(list => list
      .filter(n => n.request.content.data?.booking_id === bookingId)
      .forEach(n => Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {})))
    .catch(() => {});
}

/**
 * The worker's job feed: their own jobs plus broadcast requests (PENDING,
 * unassigned, matching their services). While online and in the foreground it
 * polls, and a `job_available` push triggers an immediate refresh — so new
 * requests appear even when push is unavailable (Expo Go, denied permission).
 *
 * `onNewRequest(job)` fires once per request first seen after the initial
 * load; requests already waiting when the worker went online only show in the list.
 *
 * A `job_taken` push (another worker accepted it, or it was cancelled/expired)
 * drops that request at once. `fastPoll` polls every 5 s instead of 20 s — the
 * jobs tab sets it while a request popup is open, so the popup still closes
 * quickly when push is unavailable.
 */
export default function useJobFeed({ token, isAvailable, onNewRequest, fastPoll = false }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seen = useRef(null); // Set of request ids; null until the first load
  // Requests a `job_taken` push said are gone — kept out even if a response
  // fetched just before the accept committed still lists them.
  const gone = useRef(new Set());
  // Bumped whenever online state/token changes: a response to a request made
  // before the switch (e.g. an offline fetch landing after going online) is
  // stale and must not overwrite the feed or reset `seen`.
  const generation = useRef(0);
  const onNewRef = useRef(onNewRequest);
  onNewRef.current = onNewRequest;

  const refresh = useCallback(async () => {
    if (!token) return;
    const gen = generation.current;
    try {
      const [mineRes, availableRes] = await Promise.all([
        api.get('/bookings', token),
        // Requests only matter to a worker who can take them.
        isAvailable ? api.get('/bookings/available', token).catch(() => ({ data: [] })) : { data: [] },
      ]);
      if (gen !== generation.current) return;
      const byId = new Map();
      [...(mineRes.data ?? []), ...(availableRes.data ?? [])].forEach(b => byId.set(b.booking_id, b));
      const next = Array.from(byId.values()).map(normalizeJob)
        .filter(j => !(j.status === 'PENDING' && gone.current.has(j.id)));
      setJobs(next);
      setError(null);

      const requests = next.filter(j => j.status === 'PENDING');
      if (seen.current) {
        const fresh = requests.filter(j => !seen.current.has(j.id));
        if (fresh.length) onNewRef.current?.(fresh[0]);
      }
      seen.current = new Set(requests.map(j => j.id));
    } catch (e) {
      if (gen === generation.current) setError(e);
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [token, isAvailable]);

  // Going offline→online re-seeds, so requests already waiting don't all pop up at once.
  useEffect(() => {
    generation.current += 1;
    seen.current = null;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAvailable || !token) return undefined;
    let timer = null;
    const start = () => { clearInterval(timer); timer = setInterval(refresh, fastPoll ? FAST_POLL_MS : POLL_MS); };
    const stop = () => clearInterval(timer);
    start();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') { refresh(); start(); } else stop();
    });
    return () => { stop(); sub.remove(); };
  }, [isAvailable, token, refresh, fastPoll]);

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationReceivedListener(n => {
      const { type, booking_id: bookingId } = n.request.content.data ?? {};
      if (type === 'job_available' || type === 'instant_job') refresh();
      if (type === 'job_taken' && bookingId) {
        gone.current.add(bookingId);
        setJobs(prev => prev.filter(j => !(j.status === 'PENDING' && j.id === bookingId)));
        dismissOfferBanner(bookingId);
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  return { jobs, loading, error, refresh };
}
