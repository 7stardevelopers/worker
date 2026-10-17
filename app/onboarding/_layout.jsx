import { Stack } from 'expo-router';
import { useTheme } from '@context/theme';

export default function OnboardingLayout() {
  const { Colors } = useTheme();

  return (
<<<<<<< HEAD
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="personal"     options={{ animation: 'fade' }} />
      <Stack.Screen name="services"     />
      <Stack.Screen name="documents"    />
      <Stack.Screen name="bank"         />
      <Stack.Screen name="availability" />
=======
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="personal"     />
      <Stack.Screen name="services"     options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="documents"    options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="bank"         options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="availability" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="photo"        options={{ animation: 'slide_from_right', gestureEnabled: false }} />
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
    </Stack>
  );
}
