import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ErrorBox, InfoRow, Loading } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney, formatQty, toNumber } from '@/lib/format';
import type { Sale } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailVente() {
  const { id, nouvelle } = useLocalSearchParams<{ id: string; nouvelle?: string }>();
  const { store } = useAuth();
  const base = useStorePath();
  const { data: sale, error, loading } = useApi(() => api.get<Sale>(`${base}/ventes/${id}`), [base, id]);

  return (
    <Screen title="Détail de la vente">
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {sale && (
        <>
          {nouvelle === '1' && (
            <View style={styles.success}>
              <Ionicons name="checkmark-circle" size={22} color={C.success} />
              <Text style={styles.successText}>Vente enregistrée avec succès</Text>
            </View>
          )}

          <Card style={styles.receipt}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={styles.store}>{store?.nom}</Text>
              <Text style={styles.ref}>{sale.reference}</Text>
              <Text style={styles.meta}>{formatDateTime(sale.vendue_le)}</Text>
              <View style={{ marginTop: 6 }}>{sale.statut === 'annulee' ? <Badge label="Annulée" tone="danger" /> : <Badge label="Terminée" tone="success" />}</View>
            </View>

            <View style={styles.dashed} />

            {sale.lignes?.map((l, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{l.nom_produit}</Text>
                  <Text style={styles.meta}>
                    {formatQty(l.quantite)} × {formatMoney(l.prix_unitaire)} · {l.mode_prix === 'gros' ? 'Gros' : 'Détail'}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>{formatMoney(l.total)}</Text>
              </View>
            ))}

            <View style={styles.dashed} />

            <InfoRow label="Sous-total" value={formatMoney(sale.sous_total)} />
            {toNumber(sale.remise) > 0 && <InfoRow label="Remise" value={`− ${formatMoney(sale.remise)}`} />}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(sale.total)}</Text>
            </View>
          </Card>

          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Paiement" value={sale.mode_paiement === 'especes' ? 'Espèces' : sale.mode_paiement} />
            <InfoRow label="Client" value={sale.client?.nom ?? 'Client de passage'} />
            <InfoRow label="Vendeur" value={sale.vendeur?.nom ?? '—'} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.successSoft, padding: 14, borderRadius: 12 },
  successText: { color: C.success, fontWeight: '700' },
  receipt: { gap: 10 },
  store: { fontSize: 17, fontWeight: '800', color: C.text },
  ref: { fontSize: 13, fontWeight: '700', color: C.primary },
  meta: { fontSize: 12, color: C.textMuted },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: C.border, marginVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { fontSize: 14, fontWeight: '600', color: C.text },
  lineTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: C.primary },
});
