import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, Chip, EmptyState, ErrorBox, Fab, Loading, SearchBar } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatDateTime, formatMoney, todayIso } from '@/lib/format';
import type { Sale } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

type Period = 'jour' | 'semaine' | 'mois' | 'tout';

function since(period: Period): string | undefined {
  if (period === 'tout') return undefined;
  if (period === 'jour') return todayIso();
  const d = new Date();
  d.setDate(d.getDate() - (period === 'semaine' ? 6 : 29));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Ventes() {
  const { can } = useAuth();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('jour');
  const query = useMemo(() => ({ recherche: search, du: since(period) }), [search, period]);
  const list = usePagedList<Sale>(can('ventes.voir') ? `${base}/ventes` : null, query);

  return (
    <Screen title="Ventes" back={false} scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une référence..." />
        <View style={styles.chips}>
          <Chip label="Aujourd'hui" active={period === 'jour'} onPress={() => setPeriod('jour')} />
          <Chip label="7 jours" active={period === 'semaine'} onPress={() => setPeriod('semaine')} />
          <Chip label="30 jours" active={period === 'mois'} onPress={() => setPeriod('mois')} />
          <Chip label="Tout" active={period === 'tout'} onPress={() => setPeriod('tout')} />
        </View>
        {!list.loading && list.total > 0 && <Text style={styles.count}>{list.total} vente(s)</Text>}
      </View>

      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Aucune vente sur cette période"
              action={can('ventes.creer') ? <Button title="Enregistrer une vente" icon="cart" onPress={() => router.push('/ventes/nouvelle')} /> : undefined}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/ventes/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>#</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.ref}>{item.reference}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {formatDateTime(item.vendue_le)}
                  {item.client ? ` · ${item.client.nom}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Text style={styles.total}>{formatMoney(item.total)}</Text>
                {item.statut === 'annulee' ? <Badge label="Annulée" tone="danger" /> : item.mode_paiement === 'credit' ? <Badge label="À crédit" tone="warning" /> : <Badge label="Espèces" tone="success" />}
              </View>
            </Pressable>
          )}
        />
      )}
      {can('ventes.creer') && <Fab icon="cart" onPress={() => router.push('/ventes/nouvelle')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, gap: 14, paddingBottom: 4 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  count: { fontSize: 12, color: C.textMuted },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: C.primary, fontWeight: '800', fontSize: 16 },
  ref: { fontSize: 14, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  total: { fontSize: 15, fontWeight: '800', color: C.text },
});
