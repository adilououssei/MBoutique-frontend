import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { stockBadge } from '@/components/product-row';
import { Badge, Chip, EmptyState, ErrorBox, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { formatQty, unitShort } from '@/lib/format';
import type { Stock } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

export default function StockListe() {
  const params = useLocalSearchParams<{ filtre?: string }>();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const [low, setLow] = useState(params.filtre === 'faible');
  const list = usePagedList<Stock>(`${base}/stocks`, { recherche: search, stock_faible: low ? 1 : undefined });

  return (
    <Screen title="Stock" scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." />
        <View style={styles.chips}>
          <Chip label="Tous" active={!low} onPress={() => setLow(false)} />
          <Chip label="Stock faible" active={low} onPress={() => setLow(true)} />
        </View>
      </View>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(s) => String(s.produit.id)}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title={low ? 'Aucun produit en stock faible' : 'Aucun stock suivi'}
              message={low ? 'Tous vos produits sont au-dessus de leur seuil minimum.' : 'Initialisez le stock d’un produit depuis sa fiche (bouton « Stock »).'}
            />
          }
          renderItem={({ item }) => {
            const badge = stockBadge(item, true);
            return (
              <Pressable onPress={() => router.push({ pathname: '/stock/[id]', params: { id: item.produit.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
                <Thumb name={item.produit.nom} size={48} uri={item.produit.image_url} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.produit.nom}
                  </Text>
                  <Text style={styles.meta}>Minimum : {item.quantite_minimum != null ? formatQty(item.quantite_minimum) : '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text style={styles.qty}>
                    {formatQty(item.quantite)} <Text style={styles.unit}>{unitShort(item.produit.unite)}</Text>
                  </Text>
                  {badge && <Badge label={badge.label} tone={badge.tone} />}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, gap: 14, paddingBottom: 6 },
  chips: { flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  qty: { fontSize: 16, fontWeight: '800', color: C.text },
  unit: { fontSize: 11, fontWeight: '500', color: C.textMuted },
});
