import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PurchaseRow } from '@/components/purchase-row';
import { Chip, EmptyState, ErrorBox, Fab, Loading, SearchBar } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import type { Purchase } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

type Filter = 'tous' | 'non_solde' | 'paye';

export default function Achats() {
  const { can } = useAuth();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const list = usePagedList<Purchase>(`${base}/achats`, { recherche: search, statut_paiement: filter === 'tous' ? undefined : filter });

  return (
    <Screen title="Achats" scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une référence..." />
        <View style={styles.chips}>
          <Chip label="Tous" active={filter === 'tous'} onPress={() => setFilter('tous')} />
          <Chip label="À régler" active={filter === 'non_solde'} onPress={() => setFilter('non_solde')} />
          <Chip label="Réglés" active={filter === 'paye'} onPress={() => setFilter('paye')} />
        </View>
        {!list.loading && list.total > 0 && <Text style={styles.count}>{list.total} achat(s)</Text>}
      </View>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={filter === 'non_solde' ? 'Aucun achat à régler' : 'Aucun achat'}
              message={filter === 'tous' ? 'Enregistrez vos réceptions de marchandise : le stock et le prix d’achat se mettent à jour tout seuls.' : undefined}
            />
          }
          renderItem={({ item }) => <PurchaseRow purchase={item} />}
        />
      )}
      {can('achats.creer') && <Fab icon="add" onPress={() => router.push('/achats/nouveau')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, gap: 14, paddingBottom: 4 },
  chips: { flexDirection: 'row', gap: 8 },
  count: { fontSize: 12, color: C.textMuted },
  list: { paddingHorizontal: 20, flexGrow: 1 },
});
