import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Chip, EmptyState, ErrorBox, Fab, Loading } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatDateTime } from '@/lib/format';
import type { StockTransfer } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

/** Marchandise envoyée à une autre boutique de l'entreprise, ou reçue d'elle. */
export default function Transferts() {
  const { can } = useAuth();
  const base = useStorePath();
  const [direction, setDirection] = useState<'' | 'sortant' | 'entrant'>('');
  const list = usePagedList<StockTransfer>(`${base}/transferts`, { sens: direction || undefined });

  return (
    <Screen title="Transferts" scroll={false}>
      <View style={styles.top}>
        <Chip label="Tous" active={direction === ''} onPress={() => setDirection('')} />
        <Chip label="Envoyés" active={direction === 'sortant'} onPress={() => setDirection('sortant')} />
        <Chip label="Reçus" active={direction === 'entrant'} onPress={() => setDirection('entrant')} />
      </View>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={<EmptyState icon="swap-horizontal" title="Aucun transfert" message="Envoyez de la marchandise vers une autre de vos boutiques." />}
          renderItem={({ item }) => {
            const out = item.sens === 'sortant';
            return (
              <Pressable onPress={() => router.push({ pathname: '/transferts/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
                <View style={[styles.icon, { backgroundColor: out ? C.warning : C.success }]}>
                  <Ionicons name={out ? 'arrow-forward' : 'arrow-back'} size={18} color={C.white} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {out ? `Vers ${item.destination.nom}` : `Depuis ${item.source.nom}`}
                  </Text>
                  <Text style={styles.meta}>
                    {item.reference} · {formatDateTime(item.cree_le)}
                  </Text>
                </View>
                <Text style={styles.count}>{item.nombre_articles ?? 0} art.</Text>
              </Pressable>
            );
          }}
        />
      )}
      {can('stock.ajuster') && <Fab icon="add" onPress={() => router.push('/transferts/nouveau')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  count: { fontSize: 13, fontWeight: '700', color: C.text },
});
