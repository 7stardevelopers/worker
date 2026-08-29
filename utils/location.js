import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const LOCATION_TASK = 'WORKER_LOCATION_TASK';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[Location] Task error:', error.message);
    return;
  }
  if (!data) {
    console.log('[Location] Task fired with no data');
    return;
  }

  const { locations } = data;
  const loc = locations?.[0];
  if (!loc) {
    console.log('[Location] Task fired with no locations in payload');
    return;
  }

  console.log('[Location] 📍 Got fix:', loc.coords.latitude, loc.coords.longitude, '| BASE_URL:', BASE_URL ?? 'NOT SET');

  try {
    const token = await AsyncStorage.getItem('auth_access_token');
    if (!token) {
      console.warn('[Location] No auth token in storage — skipping PATCH');
      return;
    }

    const res = await fetch(`${BASE_URL}/providers/me/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      }),
    });
    console.log('[Location] PATCH /providers/me/location →', res.status);
  } catch (e) {
    console.warn('[Location] PATCH failed (non-fatal):', e.message);
  }
});

export async function startLocationTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    Alert.alert(
      'Location Permission Needed',
      'Turn on location access so customers can see you on the way. Without it, live tracking won\'t work for this job.'
    );
    return false;
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    Alert.alert(
      'Background Location Needed',
      'Set location access to "Allow all the time" in Settings so your position keeps updating while the app is in the background.'
    );
    return false;
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) {
    console.log('[Location] Task already running');
    return true;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: '7StarWorker',
      notificationBody: 'Sharing your location with the customer.',
    },
  });
  console.log('[Location] ✅ Started background tracking task');
  return true;
}

export async function stopLocationTracking() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    console.log('[Location] 🛑 Stopped background tracking task');
  }
}
