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

// Statuses during which the customer is watching the worker on the map.
const LIVE_STATUSES = ['EN_ROUTE', 'IN_PROGRESS'];
// An accepted job starts sharing location this close to its slot.
const PRE_JOB_WINDOW_MIN = 60;

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[Location] Task error:', error.message);
    return;
  }
  const loc = data?.locations?.[0];
  if (!loc) return;
  try {
    // Goes through api.js so an expired access token is refreshed instead of
    // every update failing with 401 once the app has been backgrounded > 15 min.
    await api.patch('/providers/me/location', { lat: loc.coords.latitude, lng: loc.coords.longitude });
  } catch (e) {
    console.warn('[Location] update failed (non-fatal):', e.message);
  }
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

async function sendLocation(coords) {
  try {
    await api.patch('/providers/me/location', { lat: coords.latitude, lng: coords.longitude });
  } catch (e) {
    console.warn('[Location] update failed (non-fatal):', e.message);
  }
}

/**
 * Starts background location sharing. Without permission, `silent` just
 * returns false (used when resuming after an app restart); otherwise the
 * worker is sent to the permission explainer (app/permissions.jsx) — the OS
 * prompt is only ever shown from there.
 */
export async function startLocationTracking({ silent = false } = {}) {
  if (!(await hasTrackingPermission())) {
    if (!silent) router.push('/permissions');
    return false;
  }

  if (IS_EXPO_GO) {
    if (foregroundSub) return true;
    foregroundSub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
      loc => sendLocation(loc.coords),
    );
    return true;
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) return true;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: APP_NAME,
      notificationBody: 'Sharing your location with the customer.',
    },
  });
  return true;
}

export async function stopLocationTracking() {
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
    if (jobs.some(needsTracking)) await startLocationTracking({ silent: true });
    else await stopLocationTracking();
  } catch (e) {
    console.warn('[Location] reconcile failed (non-fatal):', e.message);
  }
}
