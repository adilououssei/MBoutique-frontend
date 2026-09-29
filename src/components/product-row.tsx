import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Thumb } from '@/components/ui/elements';
import { C } from '@/constants/colors';
import { formatMoney, toNumber } from '@/lib/format';
import type { Product, Stock } from '@/lib/types';

export function stockBadge(stock: Stock | undefined, tracked: boolean) {
  if (!tracked) return null;
  if (!stock || stock.cree_le === null) return { label: 'Non suivi', tone: 'neutral' as const };
  if (toNumber(stock.quantite) <= 0) return { label: 'Rupture', tone: 'danger' as const };
  if (stock.stock_faible) return { label: 'Stock faible', tone: 'warning' as const };
  return { label: 'En stock', tone: 'success' as const };
}

export function priceLine(p: Product): string {
  const parts: string[] = [];
  if (p.vente_detail_active) parts.push(`Détail : ${formatMoney(p.prix_detail)}`);
  if (p.vente_gros_active) parts.push(`Gros : ${formatMoney(p.prix_gros)}`);
  return parts.join('  |  ') || 'Aucun mode de vente actif';
}

export function ProductRow({ product, stock, trackStock, onPress }: { product: Product; stock?: Stock; trackStock: boolean; onPress: () => void }) {
  const badge = stockBadge(stock, trackStock);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
      <Thumb name={product.nom} size={56} uri={product.image_url} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {product.nom}
          </Text>
          {!product.actif ? <Badge label="Inactif" tone="neutral" /> : badge && <Badge label={badge.label} tone={badge.tone} />}
        </View>
        <Text style={styles.cat}>{product.categorie?.nom ?? 'Sans catégorie'}</Text>
        <Text style={styles.price} numberOfLines={1}>
          {priceLine(product)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center' },
  body: { flex: 1, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  cat: { fontSize: 12, color: C.textMuted },
  price: { fontSize: 12, color: C.textMuted, marginTop: 2 },
});
