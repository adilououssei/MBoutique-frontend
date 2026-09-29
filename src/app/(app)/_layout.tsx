import { Redirect, Stack } from 'expo-router';

import { C } from '@/constants/colors';
import { useAuth } from '@/context/auth';

export default function AppLayout() {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/connexion" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.dark }, animation: 'slide_from_right' }} />;
}
