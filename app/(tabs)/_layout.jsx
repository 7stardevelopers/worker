import { Tabs } from 'expo-router';
import { useTheme } from '@context/theme';
import TabBar from '@components/TabBar';

export default function TabsLayout() {
  const { Colors } = useTheme();

  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Jobs'     }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile'  }} />
    </Tabs>
  );
}
