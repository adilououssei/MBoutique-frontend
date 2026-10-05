import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Badge, EmptyState, ErrorBox, Fab, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatMoney, SALARY_PERIOD_LABELS, toNumber } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

export default function Employes() {
  const { can } = useAuth();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const list = usePagedList<Employee>(`${base}/employes`, { recherche: search });

  return (
    <Screen title="Employés" scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, poste ou téléphone..." />
      </View>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={<EmptyState icon="id-card-outline" title={search ? 'Aucun employé trouvé' : 'Aucun employé'} message={search ? undefined : 'Ajoutez votre personnel pour suivre salaires, avances et primes.'} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/employes/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
              <Thumb name={item.nom} size={46} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name}>{item.nom}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.poste ?? 'Poste non renseigné'}
                  {item.salaire != null && item.periodicite_salaire ? ` · ${formatMoney(item.salaire)} ${SALARY_PERIOD_LABELS[item.periodicite_salaire]}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {!item.actif ? (
                  <Badge label="Inactif" />
                ) : (
                  <>
                    <Text style={styles.paid}>{formatMoney(item.paye_ce_mois)}</Text>
                    <Text style={styles.paidLabel}>{toNumber(item.paye_ce_mois) > 0 ? 'versé ce mois' : 'rien versé ce mois'}</Text>
                  </>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
      {can('employes.gerer') && <Fab icon="person-add" onPress={() => router.push('/employes/formulaire')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  paid: { fontSize: 14, fontWeight: '800', color: C.text },
  paidLabel: { fontSize: 11, color: C.textMuted },
});
