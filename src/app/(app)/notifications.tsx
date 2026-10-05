import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Chip, EmptyState, ErrorBox, Loading, type IconName } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { formatTime } from '@/lib/agenda';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AppNotification } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

const LOOK: Record<string, { icon: IconName; color: string }> = {
  stock: { icon: 'cube', color: C.danger },
  commande_prete: { icon: 'restaurant', color: C.success },
  rendez_vous: { icon: 'calendar', color: C.primary },
  rappel_rendez_vous: { icon: 'alarm', color: C.warning },
};

/** Écran de l'application correspondant au lien d'une notification. */
function open(n: AppNotification) {
  if (!n.lien) return;
  const id = String(n.lien.id);
  if (n.lien.ecran === 'stock') router.push({ pathname: '/stock/[id]', params: { id } });
  else if (n.lien.ecran === 'commande') router.push({ pathname: '/commandes/[id]', params: { id } });
  else if (n.lien.ecran === 'rendez_vous') router.push({ pathname: '/rendez-vous/[id]', params: { id } });
}

function when(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `aujourd'hui à ${formatTime(iso)}` : `${formatDate(iso)} à ${formatTime(iso)}`;
}

export default function Notifications() {
  const base = useStorePath();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const list = usePagedList<AppNotification>(`${base}/notifications`, { non_lues: onlyUnread ? 1 : undefined }, 30);

  async function tap(n: AppNotification) {
    if (!n.lue) {
      list.setItems((items) => items.map((x) => (x.id === n.id ? { ...x, lue: true } : x)));
      api.post(`${base}/notifications/${n.id}/lire`).catch(() => {});
    }
    open(n);
  }

  async function readAll() {
    list.setItems((items) => items.map((x) => ({ ...x, lue: true })));
    await api.post(`${base}/notifications/tout-lire`).catch(() => {});
    list.reload();
  }

  const unread = list.items.filter((n) => !n.lue).length;

  return (
    <Screen
      title="Notifications"
      scroll={false}
      right={
        unread > 0 ? (
          <Pressable onPress={readAll} hitSlop={10} accessibilityLabel="Tout marquer comme lu">
            <Ionicons name="checkmark-done" size={22} color={C.white} />
          </Pressable>
        ) : undefined
      }>
      <View style={styles.top}>
        <Chip label="Toutes" active={!onlyUnread} onPress={() => setOnlyUnread(false)} />
        <Chip label="Non lues" active={onlyUnread} onPress={() => setOnlyUnread(true)} />
      </View>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title={onlyUnread ? 'Tout est lu' : 'Aucune notification'}
              message="Vous serez prévenu ici en cas de stock faible, de commande prête ou de rendez-vous."
            />
          }
          renderItem={({ item }) => {
            const look = LOOK[item.categorie ?? ''] ?? { icon: 'notifications' as IconName, color: C.info };
            return (
              <Pressable onPress={() => tap(item)} style={({ pressed }) => [styles.row, !item.lue && styles.unread, pressed && { opacity: 0.8 }]}>
                <View style={[styles.icon, { backgroundColor: look.color }]}>
                  <Ionicons name={look.icon} size={16} color={C.white} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.title, !item.lue && { fontWeight: '800' }]}>{item.titre}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.time}>{when(item.cree_le)}</Text>
                </View>
                {!item.lue && <View style={styles.dot} />}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 24, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  unread: { backgroundColor: C.primarySoft, borderColor: C.primarySoft },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: C.text },
  message: { fontSize: 13, color: C.text, lineHeight: 18 },
  time: { fontSize: 11, color: C.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 6 },
});
