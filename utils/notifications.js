import Constants from 'expo-constants';

// Expo Go (SDK 53+) throws on Android as soon as expo-notifications is imported,
// which kills app/_layout.jsx and makes every route look like it has no default
// export. Only load it in dev/production builds; callers must handle null.
export const NOTIFICATIONS_SUPPORTED = Constants.executionEnvironment !== 'storeClient';

const Notifications = NOTIFICATIONS_SUPPORTED ? require('expo-notifications') : null;

export default Notifications;
