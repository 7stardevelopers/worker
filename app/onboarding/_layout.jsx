import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="personal"     />
      <Stack.Screen name="services"     options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="documents"    options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="bank"         options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="availability" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
