import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RecordsProvider } from '../RecordsProvider';

export default function Layout() {
 return <RecordsProvider>
  <StatusBar style="dark" />
  <Tabs screenOptions={{
   headerShown: false,
   tabBarActiveTintColor: '#007AFF',
   tabBarInactiveTintColor: '#6C6C70',
   tabBarStyle: { backgroundColor: '#FFFFFF' },
   tabBarIconStyle: { display: 'none' },
   tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
   tabBarItemStyle: { paddingVertical: 12 },
   tabBarHideOnKeyboard: true,
  }}>
   <Tabs.Screen name="index" options={{ title: '기록' }} />
   <Tabs.Screen name="calendar" options={{ title: '달력' }} />
  </Tabs>
 </RecordsProvider>;
}
