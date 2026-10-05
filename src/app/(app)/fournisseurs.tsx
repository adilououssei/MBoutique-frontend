import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Badge, EmptyState, ErrorBox, Fab, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatMoney, toNumber } from '@/lib/format';
import type { Supplier } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

export default function Fournisseurs() {
  const { can } = useAuth();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const list = usePagedList<Supplier>(`${base}/fournisseurs`, { recherche: search });

  return (
    <Screen title="Fournisseurs" scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, contact ou téléphone..." />
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
            <EmptyState icon="business-outline" title={search ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur'} message={search ? undefined : 'Enregistrez vos fournisseurs pour suivre vos achats et ce que vous leur devez.'} />
          }
          renderItem={({ item }) => {
            const due = toNumber(item.solde_du);
            return (
              <Pressable onPress={() => router.push({ pathname: '/fournisseurs/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
                <Thumb name={item.nom} size={46} icon="business" />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name}>{item.nom}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[item.nom_contact, item.telephone].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {due > 0 ? <Text style={styles.due}>{formatMoney(due)}</Text> : <Badge label="À jour" tone="success" />}
                  {due > 0 && <Text style={styles.dueLabel}>à payer</Text>}
                  {!item.actif && <Badge label="Inactif" />}
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {can('fournisseurs.creer') && <Fab icon="add" onPress={() => router.push('/fournisseurs/formulaire')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  due: { fontSize: 14, fontWeight: '800', color: C.danger },
  dueLabel: { fontSize: 11, color: C.textMuted },
});
