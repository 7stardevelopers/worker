import { Stack } from 'expo-router';
import { useTheme } from '@context/theme';

export default function OnboardingLayout() {
  const { Colors } = useTheme();

  return (
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
      <Stack.Screen name="photo"        options={{ gestureEnabled: false }} />
    </Stack>
  );
}
