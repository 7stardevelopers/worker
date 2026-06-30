import { Tabs } from 'expo-router';
import FloatingTabBar from '@components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Jobs'     }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile'  }} />
    </Tabs>
  );
}
