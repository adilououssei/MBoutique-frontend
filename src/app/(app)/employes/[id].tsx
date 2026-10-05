import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PurchasePaymentFields, type PaymentDraft } from '@/components/purchase-payment-fields';
import { Button } from '@/components/ui/button';
import { Badge, Card, Chip, ErrorBox, InfoRow, Loading, Thumb } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { cleanNumberInput, formatDate, formatDateTime, formatMoney, SALARY_PERIOD_LABELS, toNumber } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import type { Employee, EmployeePayment, EmployeePaymentType } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const TYPE_LABELS: Record<EmployeePaymentType, string> = { salaire: 'Salaire', avance: 'Avance', prime: 'Prime' };
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const currentPeriod = () => `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;

export default function DetailEmploye() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const { data, error, loading, reload, refreshing } = useApi(async () => {
    const [employee, payments] = await Promise.all([api.get<Employee>(`${base}/employes/${id}`), api.page<EmployeePayment>(`${base}/employes/${id}/paiements`, { par_page: 30 })]);
    return { employee, payments: payments.donnees };
  }, [base, id]);

  const [payOpen, setPayOpen] = useState(false);
  const [type, setType] = useState<EmployeePaymentType>('salaire');
  const [period, setPeriod] = useState('');
  const [draft, setDraft] = useState<PaymentDraft>({ mode: 'externe', amount: '', registerId: null, note: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<ApiError | null>(null);

  const e = data?.employee;

  function openPay(kind: EmployeePaymentType) {
    setPayError(null);
    setType(kind);
    setPeriod(currentPeriod());
    // Le salaire est pré-rempli ; une avance ou une prime se saisit.
    setDraft({ mode: 'externe', amount: kind === 'salaire' && e?.salaire != null ? String(toNumber(e.salaire)) : '', registerId: null, note: '' });
    setPayOpen(true);
  }

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      await api.post(`${base}/employes/${id}/paiements`, {
        type,
        montant: cleanNumberInput(draft.amount),
        mode: draft.mode,
        caisse_id: draft.mode === 'caisse' ? draft.registerId : null,
        periode: period.trim() || null,
        note: draft.note.trim() || null,
      });
      setPayOpen(false);
      await reload();
    } catch (err) {
      setPayError(err as ApiError);
    } finally {
      setPaying(false);
    }
  }

  async function remove() {
    if (!e || !(await confirm("Supprimer l'employé", `Supprimer « ${e.nom} » ? L'historique des paiements est conservé. Pour un départ, vous pouvez aussi simplement le désactiver.`, 'Supprimer', true))) return;
    try {
      await api.delete(`${base}/employes/${id}`);
      goBack('/employes');
    } catch (err) {
      notify('Suppression impossible', (err as ApiError).message);
    }
  }

  const manage = can('employes.gerer');

  return (
    <Screen
      title="Employé"
      refreshing={refreshing}
      onRefresh={reload}
      right={
        e && manage ? (
          <Pressable onPress={remove} hitSlop={10} accessibilityLabel="Supprimer">
            <Ionicons name="trash-outline" size={21} color={C.white} />
          </Pressable>
        ) : undefined
      }
      footer={
        e && manage ? (
          <View style={styles.footer}>
            <Button title="Payer le salaire" icon="cash-outline" style={{ flex: 2 }} onPress={() => openPay('salaire')} />
            <Button title="Avance" variant="outline" style={{ flex: 1 }} onPress={() => openPay('avance')} />
          </View>
        ) : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {e && (
        <>
          <View style={styles.head}>
            <Thumb name={e.nom} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{e.nom}</Text>
              <Text style={styles.meta}>{e.poste ?? 'Poste non renseigné'}</Text>
              {!e.actif && <Badge label="Inactif" />}
            </View>
            {manage && (
              <Pressable onPress={() => router.push({ pathname: '/employes/formulaire', params: { id } })} hitSlop={10} accessibilityLabel="Modifier">
                <Ionicons name="create-outline" size={22} color={C.primary} />
              </Pressable>
            )}
          </View>

          <View style={styles.month}>
            <Text style={styles.monthLabel}>Versé ce mois-ci</Text>
            <Text style={styles.monthValue}>{formatMoney(e.paye_ce_mois)}</Text>
            {e.salaire != null && e.periodicite_salaire && (
              <Text style={styles.meta}>
                Salaire : {formatMoney(e.salaire)} {SALARY_PERIOD_LABELS[e.periodicite_salaire]}
              </Text>
            )}
          </View>

          {e.telephone && (
            <View style={styles.quick}>
              <Button title="Appeler" icon="call" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${e.telephone}`)} />
              <Button title="WhatsApp" icon="logo-whatsapp" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${e.telephone?.replace(/[^\d]/g, '')}`)} />
            </View>
          )}

          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Téléphone" value={e.telephone ?? '—'} />
            <InfoRow label="Embauché le" value={formatDate(e.date_embauche)} />
            <InfoRow label="Adresse" value={e.adresse ?? '—'} />
            <InfoRow label="Compte M Boutique" value={e.compte ? e.compte.nom : 'Aucun'} />
          </Card>
          {e.notes && (
            <Card>
              <Text style={styles.lineName}>Notes</Text>
              <Text style={styles.meta}>{e.notes}</Text>
            </Card>
          )}

          <Text style={styles.section}>Paiements</Text>
          {data.payments.length === 0 ? (
            <Text style={styles.meta}>Aucun paiement enregistré.</Text>
          ) : (
            data.payments.map((p) => (
              <View key={p.id} style={styles.payment}>
                <View style={[styles.payIcon, { backgroundColor: p.type === 'avance' ? C.warning : p.type === 'prime' ? C.success : C.primary }]}>
                  <Ionicons name={p.type === 'avance' ? 'time' : p.type === 'prime' ? 'gift' : 'cash'} size={15} color={C.white} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.lineName}>
                    {TYPE_LABELS[p.type]}
                    {p.periode ? ` · ${p.periode}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {formatDateTime(p.paye_le)} · {p.mode === 'caisse' ? 'en caisse' : 'hors caisse'}
                    {p.note ? ` · ${p.note}` : ''}
                  </Text>
                </View>
                <Text style={styles.amount}>{formatMoney(p.montant)}</Text>
              </View>
            ))
          )}
        </>
      )}

      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title={`Payer ${e?.nom ?? ''}`}>
        <View style={styles.types}>
          {(['salaire', 'avance', 'prime'] as const).map((t) => (
            <Chip key={t} label={TYPE_LABELS[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>
        {payError && Object.keys(payError.erreurs).length === 0 && <ErrorBox message={payError.message} />}
        <Field label="Période" value={period} onChangeText={setPeriod} placeholder="Ex : Octobre 2026" />
        <PurchasePaymentFields value={draft} onChange={setDraft} allowCredit={false} error={payError?.field('montant')} />
        <Button
          title={`Enregistrer ${TYPE_LABELS[type].toLowerCase()}`}
          onPress={pay}
          loading={paying}
          disabled={toNumber(cleanNumberInput(draft.amount)) <= 0 || (draft.mode === 'caisse' && !draft.registerId)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 19, fontWeight: '800', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  month: { borderRadius: R.lg, padding: 16, gap: 4, backgroundColor: C.dark },
  monthLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  monthValue: { fontSize: 26, fontWeight: '800', color: C.white },
  quick: { flexDirection: 'row', gap: 10 },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  payment: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  payIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lineName: { fontSize: 14, fontWeight: '600', color: C.text },
  amount: { fontSize: 14, fontWeight: '800', color: C.text },
  types: { flexDirection: 'row', gap: 8 },
  footer: { flexDirection: 'row', gap: 10 },
});
