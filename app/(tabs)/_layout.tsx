// app/(tabs)/_layout.tsx — Tab navigation with custom tab bar + center action button
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="order" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
