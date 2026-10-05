import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { formatDateTime, formatMoney, formatQty, toNumber } from '@/lib/format';
import { shareReceiptPdf, shareReceiptText } from '@/lib/receipt';
import type { CashRegister, Sale } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailVente() {
  const { id, nouvelle } = useLocalSearchParams<{ id: string; nouvelle?: string }>();
  const { store, can } = useAuth();
  const base = useStorePath();
  const { data: sale, setData, error, loading } = useApi(() => api.get<Sale>(`${base}/ventes/${id}`), [base, id]);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<ApiError | null>(null);
  const [sharing, setSharing] = useState<'texte' | 'pdf' | null>(null);

  const cancelled = sale?.statut === 'annulee';
  const productUnits = (sale?.lignes ?? []).filter((l) => l.type === 'produit').reduce((s, l) => s + toNumber(l.quantite), 0);

  async function openCancel() {
    setReason('');
    setCancelError(null);
    setCancelOpen(true);
    try {
      // Le remboursement sort d'une caisse dont la session est ouverte maintenant.
      const open = (await api.page<CashRegister>(`${base}/caisses`, { actif: true, par_page: 100 })).donnees.filter((r) => r.est_ouverte);
      setRegisters(open);
      setRegisterId(open[0]?.id ?? null);
    } catch {
      setRegisters([]);
    }
  }

  async function confirmCancel() {
    if (!registerId) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const { data, message } = await api.post<Sale>(`${base}/ventes/${id}/annuler`, { motif: reason.trim(), caisse_id: registerId });
      setData(data);
      setCancelOpen(false);
      notify(message ?? 'Vente annulée.');
    } catch (e) {
      setCancelError(e as ApiError);
    } finally {
      setCancelling(false);
    }
  }

  async function share(kind: 'texte' | 'pdf') {
    if (!sale) return;
    setSharing(kind);
    try {
      if (kind === 'texte') await shareReceiptText(sale, store);
      else await shareReceiptPdf(sale, store);
    } catch (e) {
      notify('Partage impossible', e instanceof Error ? e.message : undefined);
    } finally {
      setSharing(null);
    }
  }

  return (
    <Screen
      title="Détail de la vente"
      footer={
        sale && !cancelled && can('ventes.annuler') ? <Button title="Annuler la vente" icon="close-circle-outline" variant="danger" onPress={openCancel} /> : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {sale && (
        <>
          {nouvelle === '1' && !cancelled && (
            <View style={styles.success}>
              <Ionicons name="checkmark-circle" size={22} color={C.success} />
              <Text style={styles.successText}>Vente enregistrée avec succès</Text>
            </View>
          )}

          {cancelled && sale.annulation && (
            <View style={styles.cancelled}>
              <Ionicons name="close-circle" size={22} color={C.danger} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cancelledTitle}>Vente annulée et remboursée</Text>
                <Text style={styles.cancelledText}>
                  {formatDateTime(sale.annulation.le)}
                  {sale.annulation.par ? ` · par ${sale.annulation.par.nom}` : ''}
                </Text>
                <Text style={styles.cancelledText}>Motif : {sale.annulation.motif}</Text>
              </View>
            </View>
          )}

          <Card style={styles.receipt}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={styles.store}>{store?.nom}</Text>
              <Text style={styles.ref}>{sale.reference}</Text>
              <Text style={styles.meta}>{formatDateTime(sale.vendue_le)}</Text>
              <View style={{ marginTop: 6 }}>{cancelled ? <Badge label="Annulée" tone="danger" /> : <Badge label="Terminée" tone="success" />}</View>
            </View>

            <View style={styles.dashed} />

            {sale.lignes?.map((l, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.lineName}>{l.nom_produit}</Text>
                  <Text style={styles.meta}>
                    {formatQty(l.quantite)} × {formatMoney(l.prix_unitaire)} · {l.type === 'service' ? 'Service' : l.mode_prix === 'gros' ? 'Gros' : 'Détail'}
                  </Text>
                  {toNumber(l.remise) > 0 && <Text style={styles.lineDiscount}>Remise − {formatMoney(l.remise)}</Text>}
                </View>
                <Text style={[styles.lineTotal, cancelled && styles.struck]}>{formatMoney(l.total)}</Text>
              </View>
            ))}

            <View style={styles.dashed} />

            <InfoRow label="Sous-total" value={formatMoney(sale.sous_total)} />
            {toNumber(sale.remise) > 0 && <InfoRow label="Remise" value={`− ${formatMoney(sale.remise)}`} />}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalValue, cancelled && styles.struck]}>{formatMoney(sale.total)}</Text>
            </View>
          </Card>

          <View style={styles.shareRow}>
            <Button title="Partager" icon="share-social-outline" variant="outline" small style={{ flex: 1 }} loading={sharing === 'texte'} onPress={() => share('texte')} />
            <Button title="Ticket PDF" icon="document-text-outline" variant="outline" small style={{ flex: 1 }} loading={sharing === 'pdf'} onPress={() => share('pdf')} />
          </View>

          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Paiement" value={sale.mode_paiement === 'especes' ? 'Espèces' : sale.mode_paiement} />
            <InfoRow label="Client" value={sale.client?.nom ?? 'Client de passage'} />
            <InfoRow label="Vendeur" value={sale.vendeur?.nom ?? '—'} />
          </Card>
        </>
      )}

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la vente">
        {sale && (
          <View style={styles.warning}>
            <Ionicons name="alert-circle" size={20} color={C.danger} />
            <Text style={styles.warningText}>
              {productUnits > 0 ? `${formatQty(productUnits)} article(s) seront remis en stock et ` : ''}
              {formatMoney(sale.total)} seront sortis de la caisse pour rembourser le client. Cette action est définitive.
            </Text>
          </View>
        )}
        {cancelError && Object.keys(cancelError.erreurs).length === 0 && <ErrorBox message={cancelError.message} />}
        {registers.length === 0 ? (
          <ErrorBox message="Aucune caisse ouverte : ouvrez une session de caisse pour pouvoir rembourser." />
        ) : (
          <SelectField
            label="Rembourser depuis la caisse"
            required
            value={registerId}
            onChange={setRegisterId}
            options={registers.map((r) => ({ value: r.id, label: r.nom, description: r.code ?? undefined }))}
            error={cancelError?.field('caisse_id')}
          />
        )}
        <Field label="Motif de l'annulation" required value={reason} onChangeText={setReason} placeholder="Ex : erreur de saisie, client a rendu l'article…" multiline error={cancelError?.field('motif')} />
        <Button title="Confirmer l'annulation" variant="danger" onPress={confirmCancel} loading={cancelling} disabled={!reason.trim() || !registerId} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.successSoft, padding: 14, borderRadius: 12 },
  successText: { color: C.success, fontWeight: '700' },
  cancelled: { flexDirection: 'row', gap: 10, backgroundColor: C.dangerSoft, padding: 14, borderRadius: 12 },
  cancelledTitle: { color: C.danger, fontWeight: '800', fontSize: 14 },
  cancelledText: { color: C.text, fontSize: 12 },
  receipt: { gap: 10 },
  store: { fontSize: 17, fontWeight: '800', color: C.text },
  ref: { fontSize: 13, fontWeight: '700', color: C.primary },
  meta: { fontSize: 12, color: C.textMuted },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: C.border, marginVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { fontSize: 14, fontWeight: '600', color: C.text },
  lineDiscount: { fontSize: 12, color: C.success, fontWeight: '600' },
  lineTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  struck: { textDecorationLine: 'line-through', color: C.textMuted },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: C.primary },
  shareRow: { flexDirection: 'row', gap: 10 },
  warning: { flexDirection: 'row', gap: 10, backgroundColor: C.dangerSoft, borderRadius: R.md, padding: 12 },
  warningText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
});
