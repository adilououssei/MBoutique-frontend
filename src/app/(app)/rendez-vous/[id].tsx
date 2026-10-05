import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { dayKey, formatTime, longDayLabel, STATUS } from '@/lib/agenda';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { formatMoney } from '@/lib/format';
import type { Appointment } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailRendezVous() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, hasFeature } = useAuth();
  const base = useStorePath();
  const { data: a, setData, error, loading } = useApi(() => api.get<Appointment>(`${base}/rendez-vous/${id}`), [base, id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const isOpen = a?.statut === 'prevu' || a?.statut === 'confirme';
  const canUpdate = can('rendez_vous.modifier');
  const canCheckout = hasFeature('ventes') && can('ventes.creer');

  async function setStatus(statut: 'confirme' | 'termine' | 'absent') {
    setBusy(statut);
    try {
      const { data } = await api.post<Appointment>(`${base}/rendez-vous/${id}/statut`, { statut });
      setData(data);
    } catch (e) {
      notify('Action impossible', (e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy('annule');
    try {
      const { data } = await api.post<Appointment>(`${base}/rendez-vous/${id}/annuler`, { motif: reason.trim() || null });
      setData(data);
      setCancelOpen(false);
    } catch (e) {
      notify('Annulation impossible', (e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  // La caisse est pré-remplie ; une fois la vente encaissée, elle termine le rendez-vous.
  function checkout() {
    if (!a?.service) return;
    router.push({ pathname: '/ventes/nouvelle', params: { service_id: a.service.id, client_id: a.client?.id ?? '', rendez_vous_id: a.id } });
  }

  const status = a ? STATUS[a.statut] : null;
  const phone = a?.telephone_client;

  return (
    <Screen
      title="Rendez-vous"
      footer={
        a && isOpen && (canUpdate || canCheckout) ? (
          <View style={{ gap: 10 }}>
            {canCheckout && <Button title={`Encaisser ${a.service ? formatMoney(a.service.prix) : ''}`} icon="cart" onPress={checkout} />}
            {canUpdate && (
              <View style={styles.row}>
                {a.statut === 'prevu' && <Button title="Confirmer" variant="outline" small style={{ flex: 1 }} loading={busy === 'confirme'} onPress={() => setStatus('confirme')} />}
                <Button title="Terminé" variant="outline" small style={{ flex: 1 }} loading={busy === 'termine'} onPress={() => setStatus('termine')} />
                <Button title="Absent" variant="ghost" small style={{ flex: 1 }} loading={busy === 'absent'} onPress={() => setStatus('absent')} />
              </View>
            )}
          </View>
        ) : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {a && status && (
        <>
          <View style={styles.hero}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.when}>{longDayLabel(dayKey(new Date(a.debut_le)))}</Text>
              <Text style={styles.time}>
                {formatTime(a.debut_le)} – {formatTime(a.fin_le)}
              </Text>
            </View>
            <Badge label={status.label} tone={status.tone} />
          </View>

          {a.statut === 'annule' && (
            <View style={styles.cancelled}>
              <Text style={styles.cancelledText}>Rendez-vous annulé{a.motif_annulation ? ` : ${a.motif_annulation}` : '.'}</Text>
            </View>
          )}
          {a.vente_id && (
            <Button title="Voir la vente encaissée" icon="receipt-outline" variant="ghost" small onPress={() => router.push({ pathname: '/ventes/[id]', params: { id: a.vente_id! } })} />
          )}

          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Client" value={a.nom_client ?? '—'} />
            <InfoRow label="Prestation" value={a.service?.nom ?? '—'} />
            <InfoRow label="Prix" value={a.service ? formatMoney(a.service.prix) : '—'} />
            <InfoRow label="Avec" value={a.employe?.nom ?? 'N’importe qui'} />
          </Card>

          {phone && (
            <View style={styles.row}>
              <Button title="Appeler" icon="call" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${phone}`)} />
              <Button
                title="Rappel WhatsApp"
                icon="logo-whatsapp"
                variant="outline"
                small
                style={{ flex: 1 }}
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                      `Bonjour ${a.nom_client ?? ''}, nous vous rappelons votre rendez-vous (${a.service?.nom ?? ''}) ${longDayLabel(dayKey(new Date(a.debut_le))).toLowerCase()} à ${formatTime(a.debut_le)}. À bientôt !`,
                    )}`,
                  )
                }
              />
            </View>
          )}

          {a.notes && (
            <Card>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.notes}>{a.notes}</Text>
            </Card>
          )}

          {isOpen && (
            <View style={styles.row}>
              {canUpdate && (
                <Button title="Déplacer" icon="calendar-outline" variant="outline" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/rendez-vous/nouveau', params: { id } })} />
              )}
              {can('rendez_vous.annuler') && (
                <Button title="Annuler" icon="close-circle-outline" variant="danger" small style={{ flex: 1 }} onPress={() => setCancelOpen(true)} />
              )}
            </View>
          )}
        </>
      )}

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler le rendez-vous">
        <View style={styles.warn}>
          <Ionicons name="information-circle" size={18} color={C.textMuted} />
          <Text style={styles.warnText}>Le créneau sera libéré pour un autre client.</Text>
        </View>
        <Field label="Motif" value={reason} onChangeText={setReason} placeholder="Optionnel (ex : client malade)" />
        <Button title="Confirmer l'annulation" variant="danger" loading={busy === 'annule'} onPress={cancel} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.dark, borderRadius: R.lg, padding: 18 },
  when: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  time: { fontSize: 24, fontWeight: '800', color: C.white },
  cancelled: { backgroundColor: C.dangerSoft, borderRadius: R.md, padding: 12 },
  cancelledText: { color: C.danger, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  notes: { fontSize: 14, color: C.text, lineHeight: 20 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  warnText: { fontSize: 13, color: C.textMuted, flex: 1 },
});
