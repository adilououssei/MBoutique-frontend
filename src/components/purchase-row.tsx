import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/elements';
import { C } from '@/constants/colors';
import { formatDate, formatMoney } from '@/lib/format';
import type { Purchase, PurchasePaymentStatus } from '@/lib/types';

export const PAYMENT_STATUS: Record<PurchasePaymentStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  paye: { label: 'Réglé', tone: 'success' },
  partiel: { label: 'Partiel', tone: 'warning' },
  non_paye: { label: 'À crédit', tone: 'danger' },
};

export function PurchaseRow({ purchase, showSupplier = true }: { purchase: Purchase; showSupplier?: boolean }) {
  const status = PAYMENT_STATUS[purchase.statut_paiement];
  return (
    <Pressable onPress={() => router.push({ pathname: '/achats/[id]', params: { id: purchase.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.ref}>{purchase.reference}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDate(purchase.achete_le)}
          {showSupplier ? ` · ${purchase.fournisseur?.nom ?? 'Sans fournisseur'}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text style={styles.total}>{formatMoney(purchase.montant_total)}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  ref: { fontSize: 14, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  total: { fontSize: 15, fontWeight: '800', color: C.text },
});
