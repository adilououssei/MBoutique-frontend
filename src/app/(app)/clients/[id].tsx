import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PurchasePaymentFields, type PaymentDraft } from '@/components/purchase-payment-fields';
import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { cleanNumberInput, formatDateTime, formatMoney, toNumber } from '@/lib/format';
import type { Customer, CustomerAccountEntry } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { goBack } from '@/lib/navigation';

const ENTRY_LABELS: Record<CustomerAccountEntry['type'], string> = {
  vente_credit: 'Achat à crédit',
  paiement: 'Remboursement',
  annulation_vente: 'Vente annulée',
};

export default function DetailClient() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const { data: c, setData, error, loading } = useApi(() => api.get<Customer>(`${base}/clients/${id}`), [base, id]);

  // Compte client (crédit) : historique des dettes et remboursements.
  const [entries, setEntries] = useState<CustomerAccountEntry[]>([]);
  const loadAccount = useCallback(() => {
    api
      .page<CustomerAccountEntry>(`${base}/clients/${id}/compte`, { par_page: 30 })
      .then((r) => setEntries(r.donnees))
      .catch(() => setEntries([]));
  }, [base, id]);
  useEffect(loadAccount, [loadAccount]);

  const [payOpen, setPayOpen] = useState(false);
  const [draft, setDraft] = useState<PaymentDraft>({ mode: 'caisse', amount: '', registerId: null, note: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<ApiError | null>(null);

  const balance = toNumber(c?.solde);

  function openPay() {
    setPayError(null);
    setDraft({ mode: 'caisse', amount: String(balance), registerId: null, note: '' });
    setPayOpen(true);
  }

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      const { data } = await api.post<{ solde: string }>(`${base}/clients/${id}/paiements`, {
        montant: cleanNumberInput(draft.amount),
        mode: draft.mode,
        caisse_id: draft.mode === 'caisse' ? draft.registerId : null,
        note: draft.note.trim() || null,
      });
      setData((prev) => (prev ? { ...prev, solde: data.solde } : prev));
      loadAccount();
      setPayOpen(false);
    } catch (e) {
      setPayError(e as ApiError);
    } finally {
      setPaying(false);
    }
  }

  async function remove() {
    if (!c || !(await confirm('Supprimer le client', `Supprimer « ${c.nom} » ? Ses ventes passées sont conservées.`, 'Supprimer', true))) return;
    try {
      await api.delete(`${base}/clients/${id}`);
      goBack('/clients');
    } catch (e) {
      notify('Suppression impossible', (e as ApiError).message);
    }
  }

  return (
    <Screen
      title="Fiche client"
      right={
        c && can('clients.supprimer') ? (
          <Pressable onPress={remove} hitSlop={10} accessibilityLabel="Supprimer">
            <Ionicons name="trash-outline" size={21} color={C.white} />
          </Pressable>
        ) : undefined
      }
      footer={c && can('clients.modifier') ? <Button title="Modifier" onPress={() => router.push({ pathname: '/clients/formulaire', params: { id } })} /> : undefined}>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {c && (
        <>
          <View style={styles.head}>
            <Thumb name={c.nom} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{c.nom}</Text>
              {c.nom_entreprise && <Text style={styles.meta}>{c.nom_entreprise}</Text>}
              {!c.actif && <Badge label="Inactif" />}
            </View>
          </View>
          {c.telephone && (
            <View style={styles.quick}>
              <Button title="Appeler" icon="call" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${c.telephone}`)} />
              <Button title="WhatsApp" icon="logo-whatsapp" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${c.telephone?.replace(/[^\d]/g, '')}`)} />
            </View>
          )}

          <View style={[styles.balance, balance > 0 ? styles.balanceDue : styles.balanceOk]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.balanceLabel}>{balance > 0 ? 'Doit à la boutique' : balance < 0 ? 'Avoir en sa faveur' : 'Aucune dette'}</Text>
              <Text style={[styles.balanceValue, { color: balance > 0 ? C.danger : C.success }]}>{formatMoney(Math.abs(balance))}</Text>
            </View>
            {balance > 0 && can('credits.gerer') && <Button title="Encaisser" icon="cash-outline" small onPress={openPay} />}
          </View>

          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Téléphone" value={c.telephone ?? '—'} />
            <InfoRow label="E-mail" value={c.email ?? '—'} />
            <InfoRow label="Adresse" value={c.adresse ?? '—'} />
          </Card>
          {c.notes && (
            <Card>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notes}>{c.notes}</Text>
            </Card>
          )}

          {entries.length > 0 && (
            <>
              <Text style={styles.section}>Historique du crédit</Text>
              <Card style={{ gap: 12 }}>
                {entries.map((e) => {
                  const amount = toNumber(e.montant);
                  return (
                    <Pressable
                      key={e.id}
                      disabled={!e.vente}
                      onPress={() => e.vente && router.push({ pathname: '/ventes/[id]', params: { id: e.vente.id } })}
                      style={styles.entry}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.entryTitle}>
                          {ENTRY_LABELS[e.type]}
                          {e.type === 'paiement' ? (e.mode === 'caisse' ? ' · en caisse' : ' · hors caisse') : ''}
                        </Text>
                        <Text style={styles.meta}>
                          {formatDateTime(e.cree_le)}
                          {e.vente?.reference ? ` · ${e.vente.reference}` : ''}
                          {e.note ? ` · ${e.note}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.entryAmount, { color: amount > 0 ? C.danger : C.success }]}>
                        {amount > 0 ? '+' : '−'} {formatMoney(Math.abs(amount))}
                      </Text>
                    </Pressable>
                  );
                })}
              </Card>
            </>
          )}
        </>
      )}

      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title="Remboursement du client">
        <Text style={styles.meta}>Dette actuelle : {formatMoney(balance)}</Text>
        {payError && Object.keys(payError.erreurs).length === 0 && <ErrorBox message={payError.message} />}
        <PurchasePaymentFields value={draft} onChange={setDraft} allowCredit={false} error={payError?.field('montant')} />
        <Button
          title="Valider le remboursement"
          onPress={pay}
          loading={paying}
          disabled={!draft.amount.trim() || toNumber(cleanNumberInput(draft.amount)) <= 0 || (draft.mode === 'caisse' && !draft.registerId)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 19, fontWeight: '800', color: C.text },
  meta: { fontSize: 13, color: C.textMuted },
  quick: { flexDirection: 'row', gap: 10 },
  notesTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  notes: { fontSize: 14, color: C.text, lineHeight: 20 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: R.lg, borderWidth: 1 },
  balanceDue: { backgroundColor: '#FDECEC', borderColor: '#F6C9C8' },
  balanceOk: { backgroundColor: '#E8F6EF', borderColor: '#BFE5D2' },
  balanceLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  balanceValue: { fontSize: 22, fontWeight: '800' },
  section: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 4 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  entryAmount: { fontSize: 14, fontWeight: '800' },
});
