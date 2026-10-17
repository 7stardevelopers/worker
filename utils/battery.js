import { Platform, Linking } from 'react-native';
import * as Battery from 'expo-battery';
import { IS_EXPO_GO } from '@utils/location';

// Xiaomi / Oppo / Vivo / Realme battery savers kill background apps, which
// stops the location service mid-trip (the customer sees a frozen bike).

/** True when Android battery optimisation is on for this app (never on iOS / Expo Go). */
export async function isBatteryRestricted() {
  if (Platform.OS !== 'android' || IS_EXPO_GO) return false;
  try {
    return await Battery.isBatteryOptimizationEnabledAsync();
  } catch {
    return false;
  }
}

/** Where this phone brand keeps the setting, under the app's own settings page. */
export function batteryTip() {
  const brand = String(Platform.constants?.Manufacturer ?? '').toLowerCase();
  if (/xiaomi|redmi|poco/.test(brand)) return 'Battery saver → "No restrictions", and turn on "Autostart"';
  if (/oppo|realme|oneplus/.test(brand)) return 'Battery → "Allow background activity" and "Allow auto launch"';
  if (/vivo|iqoo/.test(brand)) return 'Battery → "Allow high background power consumption"';
  if (/samsung/.test(brand)) return 'Battery → "Unrestricted"';
  return 'App battery usage → "Unrestricted"';
}

// The app's own settings page holds the battery toggles on every brand, and
// needs no extra permission (Play restricts REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
export function openBatterySettings() {
  return Linking.openSettings().catch(() => {});
}
