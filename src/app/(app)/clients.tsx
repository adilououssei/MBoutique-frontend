import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Badge, Chip, EmptyState, ErrorBox, Fab, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatMoney, toNumber } from '@/lib/format';
import type { Customer } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

export default function Clients() {
  const { can } = useAuth();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const list = usePagedList<Customer>(`${base}/clients`, { recherche: search, debiteurs: debtorsOnly ? 1 : undefined });

  return (
    <Screen title="Clients" scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, téléphone ou entreprise..." />
        <View style={styles.filters}>
          <Chip label="Tous" active={!debtorsOnly} onPress={() => setDebtorsOnly(false)} />
          <Chip label="Débiteurs" active={debtorsOnly} onPress={() => setDebtorsOnly(true)} />
        </View>
      </View>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={
            debtorsOnly ? (
              <EmptyState icon="checkmark-circle-outline" title="Aucune dette en cours" message="Les ventes à crédit apparaîtront ici." />
            ) : (
              <EmptyState icon="people-outline" title={search ? 'Aucun client trouvé' : 'Aucun client'} message={search ? undefined : 'Enregistrez vos clients pour les retrouver lors des ventes.'} />
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
              <Thumb name={item.nom} size={46} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name}>{item.nom}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.telephone, item.nom_entreprise].filter(Boolean).join(' · ') || item.email || '—'}
                </Text>
              </View>
              {toNumber(item.solde) > 0 ? <Badge label={`Doit ${formatMoney(item.solde)}`} tone="danger" /> : !item.actif && <Badge label="Inactif" />}
            </Pressable>
          )}
        />
      )}
      {can('clients.creer') && <Fab icon="person-add" onPress={() => router.push('/clients/formulaire')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6, gap: 10 },
  filters: { flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
});
