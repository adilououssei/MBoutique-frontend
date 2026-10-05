import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PurchasePaymentFields, type PaymentDraft } from '@/components/purchase-payment-fields';
import { PAYMENT_STATUS } from '@/components/purchase-row';
import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { cleanNumberInput, formatDate, formatDateTime, formatMoney, formatQty, toNumber } from '@/lib/format';
import type { Purchase } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailAchat() {
  const { id, nouveau } = useLocalSearchParams<{ id: string; nouveau?: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const { data: p, setData, error, loading } = useApi(() => api.get<Purchase>(`${base}/achats/${id}`), [base, id]);

  const [payOpen, setPayOpen] = useState(false);
  const [draft, setDraft] = useState<PaymentDraft>({ mode: 'externe', amount: '', registerId: null, note: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<ApiError | null>(null);

  const due = toNumber(p?.reste_a_payer);

  function openPay() {
    setPayError(null);
    setDraft({ mode: 'externe', amount: String(due), registerId: null, note: '' });
    setPayOpen(true);
  }

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      const { data } = await api.post<Purchase>(`${base}/achats/${id}/paiements`, {
        montant: cleanNumberInput(draft.amount),
        mode: draft.mode,
        caisse_id: draft.mode === 'caisse' ? draft.registerId : null,
        note: draft.note.trim() || null,
      });
      setData(data);
      setPayOpen(false);
    } catch (e) {
      setPayError(e as ApiError);
    } finally {
      setPaying(false);
    }
  }

  const status = p ? PAYMENT_STATUS[p.statut_paiement] : null;

  return (
    <Screen title="Détail de l'achat" footer={p && due > 0 && can('achats.creer') ? <Button title="Enregistrer un règlement" icon="cash-outline" onPress={openPay} /> : undefined}>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {p && status && (
        <>
          {nouveau === '1' && (
            <View style={styles.success}>
              <Text style={styles.successText}>Achat enregistré : le stock et les prix d’achat ont été mis à jour.</Text>
            </View>
          )}

          <Card style={{ gap: 10 }}>
            <View style={styles.headRow}>
              <View style={{ gap: 3 }}>
                <Text style={styles.ref}>{p.reference}</Text>
                <Text style={styles.meta}>{formatDate(p.achete_le)}</Text>
              </View>
              <Badge label={status.label} tone={status.tone} />
            </View>
            <InfoRow
              label="Fournisseur"
              value={p.fournisseur?.nom ?? 'Sans fournisseur'}
            />
            {p.fournisseur && (
              <Button title="Voir le fournisseur" variant="ghost" small onPress={() => router.push({ pathname: '/fournisseurs/[id]', params: { id: p.fournisseur!.id } })} />
            )}
          </Card>

          <Text style={styles.section}>Marchandise reçue</Text>
          <Card style={{ gap: 10 }}>
            {p.lignes?.map((l, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{l.nom_produit}</Text>
                  <Text style={styles.meta}>
                    {formatQty(l.quantite)} × {formatMoney(l.cout_unitaire)}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>{formatMoney(l.total)}</Text>
              </View>
            ))}
            <View style={styles.sep} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(p.montant_total)}</Text>
            </View>
          </Card>

          <Text style={styles.section}>Règlements</Text>
          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Déjà réglé" value={formatMoney(p.montant_paye)} />
            <InfoRow label="Reste à payer" value={<Text style={[styles.due, { color: due > 0 ? C.danger : C.success }]}>{formatMoney(due)}</Text>} />
          </Card>
          {(p.paiements ?? []).map((pay) => (
            <View key={pay.id} style={styles.payment}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.lineName}>{pay.mode === 'caisse' ? 'Payé en caisse' : 'Payé hors caisse'}</Text>
                <Text style={styles.meta}>
                  {formatDateTime(pay.paye_le)}
                  {pay.cree_par ? ` · ${pay.cree_par.nom}` : ''}
                  {pay.note ? ` · ${pay.note}` : ''}
                </Text>
              </View>
              <Text style={styles.lineTotal}>{formatMoney(pay.montant)}</Text>
            </View>
          ))}

          {p.note && (
            <Card>
              <Text style={styles.lineName}>Note</Text>
              <Text style={styles.meta}>{p.note}</Text>
            </Card>
          )}
          {p.cree_par && <Text style={styles.footerMeta}>Enregistré par {p.cree_par.nom}</Text>}
        </>
      )}

      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title="Enregistrer un règlement">
        <Text style={styles.meta}>Reste à payer : {formatMoney(due)}</Text>
        {payError && Object.keys(payError.erreurs).length === 0 && <ErrorBox message={payError.message} />}
        <PurchasePaymentFields value={draft} onChange={setDraft} allowCredit={false} error={payError?.field('montant')} />
        <Button
          title="Valider le règlement"
          onPress={pay}
          loading={paying}
          disabled={!draft.amount.trim() || toNumber(cleanNumberInput(draft.amount)) <= 0 || (draft.mode === 'caisse' && !draft.registerId)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { backgroundColor: C.successSoft, padding: 14, borderRadius: 12 },
  successText: { color: C.success, fontWeight: '700', fontSize: 13 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ref: { fontSize: 16, fontWeight: '800', color: C.primary },
  meta: { fontSize: 12, color: C.textMuted },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { fontSize: 14, fontWeight: '600', color: C.text },
  lineTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  sep: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: C.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: C.primary },
  due: { fontSize: 15, fontWeight: '800' },
  payment: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.background },
  footerMeta: { fontSize: 12, color: C.textLight, textAlign: 'center' },
});
