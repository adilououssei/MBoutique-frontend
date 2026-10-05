import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api } from '@/lib/api';

const REFRESH_MS = 60_000;

/** Cloche du tableau de bord avec le nombre de notifications non lues. */
export function NotificationBell() {
  const base = useStorePath();
  const [unread, setUnread] = useState(0);

  // Rafraîchi à chaque retour sur l'écran, puis toutes les minutes tant qu'il est affiché.
  useFocusEffect(
    useCallback(() => {
      const load = () =>
        api
          .get<{ non_lues: number }>(`${base}/notifications/compteur`)
          .then((r) => setUnread(r.non_lues))
          .catch(() => {});
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [base]),
  );

  return (
    <Pressable onPress={() => router.push('/notifications')} style={styles.bell} hitSlop={6} accessibilityLabel={`Notifications${unread ? `, ${unread} non lues` : ''}`}>
      <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={20} color={C.white} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.dark },
  badgeText: { color: C.white, fontSize: 10, fontWeight: '800' },
});
