import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { useAuth } from '@/context/auth';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={22} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { store, hasFeature } = useAuth();
  const insets = useSafeAreaInsets();
  if (!store) return <Redirect href="/bienvenue" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.text,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.border,
          height: 62 + (Platform.OS === 'web' ? 0 : insets.bottom),
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: C.dark },
      }}>
      <Tabs.Screen name="accueil" options={{ title: 'Accueil', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="produits" options={{ title: 'Produits', tabBarIcon: icon('cube', 'cube-outline'), href: hasFeature('produits') ? undefined : null }} />
      <Tabs.Screen name="ventes" options={{ title: 'Ventes', tabBarIcon: icon('cart', 'cart-outline'), href: hasFeature('ventes') ? undefined : null }} />
      <Tabs.Screen name="plus" options={{ title: 'Plus', tabBarIcon: icon('apps', 'apps-outline') }} />
    </Tabs>
  );
}
