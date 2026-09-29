import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { StockMovementRow } from '@/components/movement-row';
import { EmptyState, ErrorBox, Loading } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import type { StockMovement } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

export default function HistoriqueStock() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useStorePath();
  const list = usePagedList<StockMovement>(`${base}/stocks/${id}/mouvements`, {}, 30);

  return (
    <Screen title="Historique du stock" scroll={false}>
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <StockMovementRow m={item} />}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={<EmptyState icon="time-outline" title="Aucun mouvement" />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },
});
