import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stockBadge } from '@/components/product-row';
import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { formatMoney, formatQty, unitShort, UNITS } from '@/lib/format';
import type { Product, Stock } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { goBack } from '@/lib/navigation';

export default function DetailProduit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, hasFeature } = useAuth();
  const base = useStorePath();
  const [deleting, setDeleting] = useState(false);
  const withStock = hasFeature('stock');

  const { data, error, loading, reload, refreshing } = useApi(async () => {
    const [product, stock] = await Promise.all([api.get<Product>(`${base}/produits/${id}`), withStock ? api.get<Stock>(`${base}/stocks/${id}`).catch(() => undefined) : undefined]);
    return { product, stock };
  }, [base, id, withStock]);

  async function remove() {
    if (!data) return;
    const ok = await confirm('Supprimer le produit', `« ${data.product.nom} » sera retiré du catalogue. Les ventes passées sont conservées.`, 'Supprimer', true);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`${base}/produits/${id}`);
      goBack('/produits');
    } catch (e) {
      notify('Suppression impossible', (e as ApiError).message);
    } finally {
      setDeleting(false);
    }
  }

  const product = data?.product;
  const stock = data?.stock;
  const badge = product && (product.actif ? stockBadge(stock, withStock) : { label: 'Inactif', tone: 'neutral' as const });
  const unit = unitShort(product?.unite);

  return (
    <Screen
      title="Détail du produit"
      refreshing={refreshing}
      onRefresh={reload}
      right={
        product && can('produits.supprimer') ? (
          <Pressable onPress={remove} disabled={deleting} hitSlop={10} accessibilityLabel="Supprimer">
            <Ionicons name="trash-outline" size={21} color={C.white} />
          </Pressable>
        ) : undefined
      }
      footer={
        product && (can('produits.modifier') || (withStock && can('stock.voir'))) ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {withStock && can('stock.voir') && <Button title="Stock" icon="cube-outline" variant="outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/stock/[id]', params: { id } })} />}
            {can('produits.modifier') && <Button title="Modifier" style={{ flex: 2 }} onPress={() => router.push({ pathname: '/produits/[id]/modifier', params: { id } })} />}
          </View>
        ) : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {product && (
        <>
          <Card style={styles.head}>
            <Thumb name={product.nom} size={72} uri={product.image_url} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{product.nom}</Text>
                {badge && <Badge label={badge.label} tone={badge.tone} />}
              </View>
              <Text style={styles.cat}>{product.categorie?.nom ?? 'Sans catégorie'}</Text>
              {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
            </View>
          </Card>

          <Text style={styles.section}>Modes de vente</Text>
          <Card style={styles.list}>
            <InfoRow label="Détail" value={product.vente_detail_active ? formatMoney(product.prix_detail) : 'Désactivé'} strong />
            <View style={styles.sep} />
            <InfoRow label="Gros" value={product.vente_gros_active ? formatMoney(product.prix_gros) : 'Désactivé'} strong />
          </Card>

          <Text style={styles.section}>Informations</Text>
          <Card style={styles.list}>
            <InfoRow label="Catégorie" value={product.categorie?.nom ?? '—'} />
            <InfoRow label="Code" value={product.sku ?? '—'} />
            {product.code_barres && <InfoRow label="Code-barres" value={product.code_barres} />}
            <InfoRow label="Unité" value={UNITS.find((u) => u.value === product.unite)?.label ?? product.unite} />
            {product.prix_achat !== null && <InfoRow label="Prix d'achat" value={formatMoney(product.prix_achat)} />}
            {withStock && <InfoRow label="Stock actuel" value={stock && stock.cree_le ? `${formatQty(stock.quantite)} ${unit}` : 'Non initialisé'} />}
            {withStock && <InfoRow label="Stock minimum" value={stock?.quantite_minimum != null ? `${formatQty(stock.quantite_minimum)} ${unit}` : '—'} />}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  cat: { fontSize: 13, color: C.textMuted },
  desc: { fontSize: 12, color: C.textLight, marginTop: 4 },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  list: { paddingVertical: 4 },
  sep: { height: 1, backgroundColor: C.border },
});
