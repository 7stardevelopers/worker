import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK = 'WORKER_LOCATION_TASK';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data) return;

  const { locations } = data;
  const loc = locations?.[0];
  if (!loc) return;

  try {
    const token = await AsyncStorage.getItem('auth_access_token');
    if (!token) return;

    await fetch(`${BASE_URL}/providers/me/location`, {
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
  } catch {
    // silent — background failures are expected
  }
});

export async function startLocationTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) return true;

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
  return true;
}

export async function stopLocationTracking() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
