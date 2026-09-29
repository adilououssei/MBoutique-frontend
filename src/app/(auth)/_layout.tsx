import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/auth';

export default function AuthLayout() {
  const { ready, user, store } = useAuth();
  if (ready && user) return <Redirect href={store ? '/accueil' : '/bienvenue'} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
