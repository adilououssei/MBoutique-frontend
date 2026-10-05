import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, SearchBar, Thumb } from '@/components/ui/elements';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatMoney, toNumber } from '@/lib/format';
import type { PricingMode, Product, Service } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

export type PickedItem =
  | { kind: 'produit'; id: number; nom: string; prix: number; mode: PricingMode }
  | { kind: 'service'; id: number; nom: string; prix: number };

/** Feuille de choix d'un produit ou d'un service à ajouter (commandes). */
export function CatalogPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (item: PickedItem) => void }) {
  const { hasFeature } = useAuth();
  const base = useStorePath();
  const withProducts = hasFeature('produits');
  const withServices = hasFeature('services');
  const [tab, setTab] = useState<'produits' | 'services'>(withProducts ? 'produits' : 'services');
  const [search, setSearch] = useState('');

  const products = usePagedList<Product>(visible && tab === 'produits' ? `${base}/produits` : null, { recherche: search, actif: true }, 40);
  const services = usePagedList<Service>(visible && tab === 'services' ? `${base}/services` : null, { recherche: search, actif: true }, 40);
  const loading = tab === 'produits' ? products.loading : services.loading;

  return (
    <Sheet visible={visible} onClose={onClose} title="Ajouter un article">
      {withProducts && withServices && (
        <View style={styles.tabs}>
          <Chip label="Produits" active={tab === 'produits'} onPress={() => setTab('produits')} />
          <Chip label="Services" active={tab === 'services'} onPress={() => setTab('services')} />
        </View>
      )}
      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher..." />
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ margin: 16 }} />
      ) : tab === 'produits' ? (
        products.items.map((p) => {
          const mode: PricingMode = p.vente_detail_active ? 'detail' : 'gros';
          const price = toNumber(mode === 'detail' ? p.prix_detail : p.prix_gros);
          const sellable = p.vente_detail_active || p.vente_gros_active;
          return (
            <Row key={p.id} name={p.nom} price={formatMoney(price)} thumb={<Thumb name={p.nom} size={40} uri={p.image_url} />} disabled={!sellable} onPress={() => onPick({ kind: 'produit', id: p.id, nom: p.nom, prix: price, mode })} />
          );
        })
      ) : (
        services.items.map((s) => (
          <Row key={s.id} name={s.nom} price={formatMoney(s.prix)} thumb={<Thumb name={s.nom} size={40} icon="construct" />} onPress={() => onPick({ kind: 'service', id: s.id, nom: s.nom, prix: toNumber(s.prix) })} />
        ))
      )}
      {!loading && (tab === 'produits' ? products.items : services.items).length === 0 && <Text style={styles.none}>Aucun article.</Text>}
    </Sheet>
  );
}

function Row({ name, price, thumb, disabled, onPress }: { name: string; price: string; thumb: React.ReactNode; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }, disabled && { opacity: 0.45 }]}>
      {thumb}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>
      <Ionicons name="add-circle" size={26} color={C.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  price: { fontSize: 12, color: C.textMuted },
  none: { textAlign: 'center', color: C.textMuted, padding: 16 },
});
