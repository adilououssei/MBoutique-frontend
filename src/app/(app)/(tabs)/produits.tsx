import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ProductRow } from '@/components/product-row';
import { Button } from '@/components/ui/button';
import { Chip, EmptyState, ErrorBox, Fab, Loading, SearchBar, SquareButton } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import type { Category, Product, Stock } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

type Filter = 'tous' | 'detail' | 'gros' | 'faible';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'detail', label: 'En détail' },
  { key: 'gros', label: 'En gros' },
  { key: 'faible', label: 'Stock faible' },
];

export default function Produits() {
  const { can, hasFeature } = useAuth();
  const base = useStorePath();
  const trackStock = hasFeature('stock');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const [categoryId, setCategoryId] = useState<number | 'toutes'>('toutes');
  const [status, setStatus] = useState<'tous' | 'actifs' | 'inactifs'>('tous');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stocks, setStocks] = useState<Record<number, Stock>>({});

  const lowStock = filter === 'faible';

  const products = usePagedList<Product>(lowStock ? null : `${base}/produits`, {
    recherche: search,
    mode_prix: filter === 'detail' || filter === 'gros' ? filter : undefined,
    categorie_id: categoryId === 'toutes' ? undefined : categoryId,
    actif: status === 'tous' ? undefined : status === 'actifs',
  });
  const low = usePagedList<Stock>(lowStock ? `${base}/stocks` : null, { recherche: search, stock_faible: 1 });

  // Statut de stock affiché sur chaque ligne (badge « En stock », « Stock faible »…).
  useEffect(() => {
    if (!trackStock) return;
    api
      .page<Stock>(`${base}/stocks`, { recherche: search, par_page: 100 })
      .then((res) => setStocks(Object.fromEntries(res.donnees.map((s) => [s.produit.id, s]))))
      .catch(() => {});
  }, [base, search, trackStock, products.items]);

  useEffect(() => {
    if (!hasFeature('categories')) return;
    api.page<Category>(`${base}/categories`, { par_page: 100 }).then((r) => setCategories(r.donnees)).catch(() => {});
  }, [base, hasFeature]);

  const list = lowStock ? low : products;
  const rows = useMemo(() => (lowStock ? low.items.map((s) => s.produit) : products.items), [lowStock, low.items, products.items]);
  const lowById = useMemo(() => Object.fromEntries(low.items.map((s) => [s.produit.id, s])), [low.items]);
  const activeFilters = (categoryId !== 'toutes' ? 1 : 0) + (status !== 'tous' ? 1 : 0);

  return (
    <Screen title="Produits" back={false} scroll={false}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." right={<SquareButton icon="options-outline" active={activeFilters > 0} onPress={() => setFiltersOpen(true)} />} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.filter((f) => f.key !== 'faible' || trackStock).map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
      </View>

      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProductRow product={item} stock={lowById[item.id] ?? stocks[item.id]} trackStock={trackStock} onPress={() => router.push({ pathname: '/produits/[id]', params: { id: item.id } })} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={
            list.error ? null : (
              <EmptyState
                icon="cube-outline"
                title={search || filter !== 'tous' ? 'Aucun produit trouvé' : 'Aucun produit pour le moment'}
                message={search || filter !== 'tous' ? 'Essayez une autre recherche ou un autre filtre.' : 'Ajoutez votre premier produit pour commencer à vendre.'}
                action={!search && filter === 'tous' && can('produits.creer') ? <Button title="Créer un produit" icon="add" onPress={() => router.push('/produits/nouveau')} /> : undefined}
              />
            )
          }
        />
      )}

      {can('produits.creer') && <Fab onPress={() => router.push('/produits/nouveau')} />}

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrer les produits">
        {hasFeature('categories') && (
          <SelectField
            label="Catégorie"
            value={categoryId}
            onChange={setCategoryId}
            options={[{ value: 'toutes' as const, label: 'Toutes les catégories' }, ...categories.map((c) => ({ value: c.id, label: c.nom }))]}
          />
        )}
        <SelectField
          label="Statut"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'tous', label: 'Tous les produits' },
            { value: 'actifs', label: 'Actifs uniquement' },
            { value: 'inactifs', label: 'Inactifs uniquement' },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Réinitialiser"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => {
              setCategoryId('toutes');
              setStatus('tous');
            }}
          />
          <Button title="Appliquer" style={{ flex: 1 }} onPress={() => setFiltersOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  chips: { gap: 8, paddingBottom: 4 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
});
