import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { CatalogPicker, type PickedItem } from '@/components/catalog-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatTime } from '@/lib/agenda';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { cleanNumberInput, formatDate, formatMoney, formatQty, toNumber } from '@/lib/format';
import { isOpen, nextStep, ORDER_TYPES, statusLabel } from '@/lib/orders';
import type { CashRegister, Order } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailCommande() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, hasFeature } = useAuth();
  const base = useStorePath();
  const { data: o, setData, error, loading } = useApi(() => api.get<Order>(`${base}/commandes/${id}`), [base, id]);

  const [busy, setBusy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [discount, setDiscount] = useState('');
  const [payError, setPayError] = useState<ApiError | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const open = o ? isOpen(o.statut) : false;
  const canUpdate = can('commandes.modifier');
  const canCheckout = canUpdate && can('ventes.creer') && hasFeature('ventes');

  async function act(key: string, call: () => Promise<{ data: Order }>) {
    setBusy(key);
    try {
      setData((await call()).data);
    } catch (e) {
      notify('Action impossible', (e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  const advance = (status: string) => act('statut', () => api.post<Order>(`${base}/commandes/${id}/statut`, { statut: status }));
  const removeLine = (lineId: number) => act(`ligne-${lineId}`, () => api.delete<Order>(`${base}/commandes/${id}/lignes/${lineId}`));
  function addLine(item: PickedItem) {
    setPickerOpen(false);
    act('ajout', () =>
      api.post<Order>(`${base}/commandes/${id}/lignes`, {
        lignes: [item.kind === 'produit' ? { produit_id: item.id, mode_prix: item.mode, quantite: 1 } : { service_id: item.id, quantite: 1 }],
      }),
    );
  }

  async function openPay() {
    setPayError(null);
    setDiscount('');
    setPayOpen(true);
    try {
      const list = (await api.page<CashRegister>(`${base}/caisses`, { actif: true, par_page: 100 })).donnees.filter((r) => r.est_ouverte);
      setRegisters(list);
      setRegisterId(list[0]?.id ?? null);
    } catch {
      setRegisters([]);
    }
  }

  async function pay() {
    if (!registerId) return;
    setBusy('encaisser');
    setPayError(null);
    try {
      const { data } = await api.post<Order>(`${base}/commandes/${id}/encaisser`, { caisse_id: registerId, montant_remise: discount.trim() ? cleanNumberInput(discount) : null });
      setPayOpen(false);
      setData(data);
      if (data.vente_id) router.push({ pathname: '/ventes/[id]', params: { id: data.vente_id, nouvelle: '1' } });
    } catch (e) {
      setPayError(e as ApiError);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    await act('annuler', () => api.post<Order>(`${base}/commandes/${id}/annuler`, { motif: reason.trim() || null }));
    setCancelOpen(false);
  }

  const step = o && open ? nextStep(o.statut, o.type) : null;
  const status = o ? statusLabel(o.statut, o.type) : null;
  const phone = o?.telephone_client;

  return (
    <Screen
      title={o?.table?.nom ?? 'Commande'}
      footer={
        o && open && (canUpdate || canCheckout) ? (
          <View style={{ gap: 10 }}>
            {step && canUpdate && <Button title={step.label} variant="outline" icon="arrow-forward-circle-outline" loading={busy === 'statut'} onPress={() => advance(step.status)} />}
            {canCheckout && <Button title={`Encaisser ${formatMoney(o.total)}`} icon="cash-outline" onPress={openPay} disabled={!o.lignes?.length} />}
          </View>
        ) : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {o && status && (
        <>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name={ORDER_TYPES[o.type].icon} size={22} color={C.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.heroTitle}>{ORDER_TYPES[o.type].label}{o.table ? ` · ${o.table.nom}` : ''}</Text>
              <Text style={styles.heroMeta}>
                {o.reference} · {formatTime(o.cree_le)}
              </Text>
            </View>
            <Badge label={status.label} tone={status.tone} />
          </View>

          {o.statut === 'annulee' && (
            <View style={styles.cancelled}>
              <Text style={styles.cancelledText}>Commande annulée{o.motif_annulation ? ` : ${o.motif_annulation}` : '.'}</Text>
            </View>
          )}
          {o.vente_id && <Button title="Voir la vente encaissée" icon="receipt-outline" variant="ghost" small onPress={() => router.push({ pathname: '/ventes/[id]', params: { id: o.vente_id! } })} />}

          {(o.nom_client || o.date_promise || o.adresse_livraison) && (
            <Card style={{ paddingVertical: 4 }}>
              {o.nom_client && <InfoRow label="Client" value={o.nom_client} />}
              {o.date_promise && <InfoRow label="À retirer le" value={formatDate(o.date_promise)} />}
              {o.adresse_livraison && <InfoRow label="Livraison" value={o.adresse_livraison} />}
            </Card>
          )}
          {phone && (
            <View style={styles.row}>
              <Button title="Appeler" icon="call" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${phone}`)} />
              {o.type === 'depot' && o.statut === 'prete' && (
                <Button
                  title="Prévenir (WhatsApp)"
                  icon="logo-whatsapp"
                  variant="outline"
                  small
                  style={{ flex: 1 }}
                  onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Bonjour ${o.nom_client ?? ''}, votre commande ${o.reference} est prête. Vous pouvez passer la récupérer. Merci !`)}`)}
                />
              )}
            </View>
          )}

          <Text style={styles.section}>Articles</Text>
          <Card style={{ gap: 12 }}>
            {(o.lignes ?? []).map((l) => (
              <View key={l.id} style={styles.line}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.lineName}>
                    {formatQty(l.quantite)} × {l.nom}
                  </Text>
                  {l.note && <Text style={styles.lineNote}>« {l.note} »</Text>}
                </View>
                <Text style={styles.lineTotal}>{formatMoney(l.total)}</Text>
                {open && canUpdate && (
                  <Pressable onPress={() => removeLine(l.id)} disabled={busy === `ligne-${l.id}`} hitSlop={8} accessibilityLabel="Retirer">
                    <Ionicons name="close-circle-outline" size={20} color={C.danger} />
                  </Pressable>
                )}
              </View>
            ))}
            {(o.lignes ?? []).length === 0 && <Text style={styles.empty}>Aucun article pour l’instant.</Text>}
            <View style={styles.sep} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(o.total)}</Text>
            </View>
          </Card>
          {open && canUpdate && <Button title="Ajouter un article" icon="add-circle-outline" variant="outline" loading={busy === 'ajout'} onPress={() => setPickerOpen(true)} />}

          {o.note && (
            <Card>
              <Text style={styles.lineName}>Note</Text>
              <Text style={styles.lineNote}>{o.note}</Text>
            </Card>
          )}
          {open && can('commandes.annuler') && <Button title="Annuler la commande" variant="danger" small icon="close-circle-outline" onPress={() => setCancelOpen(true)} />}
        </>
      )}

      <CatalogPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addLine} />

      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title="Encaisser la commande">
        {payError && <ErrorBox message={payError.message} />}
        {registers.length === 0 ? (
          <ErrorBox message="Aucune caisse ouverte : ouvrez une session de caisse pour encaisser." />
        ) : (
          <SelectField label="Caisse" required value={registerId} onChange={setRegisterId} options={registers.map((r) => ({ value: r.id, label: r.nom }))} />
        )}
        <Field label="Remise" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" suffix="FCFA" />
        <View style={styles.summary}>
          <Text style={styles.totalLabel}>À payer</Text>
          <Text style={styles.totalValue}>{formatMoney(Math.max(0, toNumber(o?.total) - toNumber(cleanNumberInput(discount))))}</Text>
        </View>
        <Text style={styles.empty}>Paiement en espèces · le prix final est recalculé à l’encaissement.</Text>
        <Button title="Encaisser" onPress={pay} loading={busy === 'encaisser'} disabled={!registerId} />
      </Sheet>

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la commande">
        <Field label="Motif" value={reason} onChangeText={setReason} placeholder="Optionnel (ex : client parti)" />
        <Button title="Confirmer l'annulation" variant="danger" loading={busy === 'annuler'} onPress={cancel} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.dark, borderRadius: R.lg, padding: 16 },
  heroIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  cancelled: { backgroundColor: C.dangerSoft, borderRadius: R.md, padding: 12 },
  cancelledText: { color: C.danger, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { fontSize: 14, fontWeight: '600', color: C.text },
  lineNote: { fontSize: 12, color: C.primary, fontStyle: 'italic' },
  lineTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  empty: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  sep: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: C.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: C.primary },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.background, borderRadius: R.md, padding: 14 },
});
