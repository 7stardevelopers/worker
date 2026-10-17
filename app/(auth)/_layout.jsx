import { Stack } from 'expo-router';
import { useTheme } from '@context/theme';

export default function AuthLayout() {
  const { Colors } = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp"   options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
