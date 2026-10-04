import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api } from '@utils/api';
import { APP_NAME } from '@constants/brand';

export const LOCATION_TASK = 'WORKER_LOCATION_TASK';

// Expo Go can't do background location on iOS: its Info.plist has no
// "Always" usage string / location background mode, so asking for it throws
// ERR_LOCATION_INFO_PLIST. In Expo Go we fall back to foreground-only
// tracking (updates while the app is open). Dev/preview/store builds keep
// full background tracking.
export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

let foregroundSub = null;
let currentMode = null; // 'fast' | 'normal' — options the running task was started with

// EN_ROUTE streams fast so the customer's pin glides like a ride app; otherwise
// (pre-job window, on the job) a slower cadence saves battery.
const MODES = {
  fast:   { timeInterval: 3000,  distanceInterval: 5 },
  normal: { timeInterval: 10000, distanceInterval: 10 },
};

// Statuses during which the customer is watching the worker on the map.
const LIVE_STATUSES = ['EN_ROUTE', 'IN_PROGRESS'];
// An accepted job starts sharing location this close to its slot.
const PRE_JOB_WINDOW_MIN = 60;

// Fixes worse than this are skipped (indoor/cold-start GPS can be off by
// hundreds of metres) — unless nothing has been sent for MAX_SILENCE_MS, so a
// worker with poor reception still shows up on the customer's map.
const MAX_ACCURACY_M = 100;
const MAX_SILENCE_MS = 60000;
let lastSentAt = 0;

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[Location] Task error:', error.message);
    return;
  }
  // Android can deliver a batch; the last entry is the newest fix.
  const locs = data?.locations;
  const loc = locs?.[locs.length - 1];
  if (!loc) return;
  await sendLocation(loc);
});

/** True when the permissions this build needs are granted (foreground only in Expo Go). */
export async function hasTrackingPermission() {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  if (IS_EXPO_GO) return true;
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

/**
 * Ask for the permissions this build needs. Returns { granted, blocked }.
 * Only called from app/permissions.jsx (after the prominent disclosure).
 */
export async function requestTrackingPermission() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { granted: false, blocked: !fg.canAskAgain };
  if (IS_EXPO_GO) return { granted: true, blocked: false };
  // Android 11+ sends the worker to Settings for "Allow all the time".
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return { granted: false, blocked: !bg.canAskAgain };
  return { granted: true, blocked: false };
}

async function sendLocation(loc) {
  const { coords } = loc;
  const inaccurate = coords.accuracy != null && coords.accuracy > MAX_ACCURACY_M;
  if (inaccurate && Date.now() - lastSentAt < MAX_SILENCE_MS) return;
  try {
    // Goes through api.js so an expired access token is refreshed instead of
    // every update failing with 401 once the app has been backgrounded > 15 min.
    // heading/speed let the customer's map rotate the pin; mocked (Android) is
    // rejected server-side in production.
    await api.patch('/providers/me/location', {
      lat: coords.latitude,
      lng: coords.longitude,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
      accuracy: coords.accuracy ?? null,
      mocked: !!loc.mocked,
    });
    lastSentAt = Date.now();
  } catch (e) {
    console.warn('[Location] update failed (non-fatal):', e.message);
  }
}

/**
 * Starts background location sharing. Without permission, `silent` just
 * returns false (used when resuming after an app restart); otherwise the
 * worker is sent to the permission explainer (app/permissions.jsx) — the OS
 * prompt is only ever shown from there. `enRoute` selects the fast cadence;
 * a running task with the other cadence is restarted. `keepFast` never slows an
 * already-fast task (a screen for one job mustn't throttle another job's trip).
 */
export async function startLocationTracking({ silent = false, enRoute = false, keepFast = false } = {}) {
  if (!(await hasTrackingPermission())) {
    if (!silent) router.push('/permissions');
    return false;
  }
  const mode = enRoute || (keepFast && currentMode === 'fast') ? 'fast' : 'normal';

  if (IS_EXPO_GO) {
    if (foregroundSub && currentMode === mode) return true;
    foregroundSub?.remove();
    foregroundSub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, ...MODES[mode] },
      sendLocation,
    );
    currentMode = mode;
    return true;
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  // currentMode is null after an app restart — restart the task so it uses the right cadence.
  if (isRunning && currentMode === mode) return true;
  if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    ...MODES[mode],
    // iOS: keep sending while driving instead of letting the OS pause "idle" updates.
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: APP_NAME,
      notificationBody: 'Sharing your location with the customer.',
      // Keep sharing after the worker swipes the app away (Android) so the
      // customer doesn't see a frozen pin mid-trip. The task stops itself via
      // reconcileTracking / stopLocationTracking once no job needs it; iOS
      // still stops on force-quit.
      killServiceOnDestroy: false,
    },
  });
  currentMode = mode;
  return true;
}

export async function stopLocationTracking() {
  currentMode = null;
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
  if (IS_EXPO_GO) return;
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

export function needsTracking(job) {
  if (LIVE_STATUSES.includes(job.status)) return true;
  if (job.status === 'ACCEPTED' && job.scheduled_at) {
    return (new Date(job.scheduled_at) - Date.now()) / 60000 <= PRE_JOB_WINDOW_MIN;
  }
  return false;
}

/**
 * Makes GPS match reality: stop it when the worker has no job that needs it
 * (job cancelled by the customer/admin, finished on another device…), resume it
 * silently if a live job exists but the OS killed the task.
 */
export async function reconcileTracking(token) {
  if (!token) return;
  try {
    const res = await api.get('/bookings', token);
    const jobs = Array.isArray(res.data) ? res.data : [];
    if (jobs.some(needsTracking)) {
      await startLocationTracking({ silent: true, enRoute: jobs.some(j => j.status === 'EN_ROUTE') });
    }
    else await stopLocationTracking();
  } catch (e) {
    console.warn('[Location] reconcile failed (non-fatal):', e.message);
  }
}
