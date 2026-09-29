import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CashMovementRow } from '@/components/movement-row';
import { Button } from '@/components/ui/button';
import { Badge, Card, Chip, EmptyState, ErrorBox, InfoRow, Loading, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { cleanNumberInput, formatDateTime, formatMoney, toNumber } from '@/lib/format';
import type { CashMovement, CashRegister, CashSession } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Action = 'ouvrir' | 'fermer' | 'entree' | 'sortie' | 'ajustement' | 'modifier';

const TITLES: Record<Action, string> = {
  ouvrir: 'Ouvrir la caisse',
  fermer: 'Fermer la caisse',
  entree: 'Entrée d’argent',
  sortie: 'Sortie d’argent',
  ajustement: 'Ajustement de caisse',
  modifier: 'Modifier la caisse',
};

export default function DetailCaisse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const [tab, setTab] = useState<'session' | 'historique'>('session');
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sign, setSign] = useState<1 | -1>(1);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);

  const { data, error, loading, reload, refreshing } = useApi(async () => {
    const [register, session, sessions] = await Promise.all([
      api.get<CashRegister>(`${base}/caisses/${id}`),
      api.get<CashSession | null>(`${base}/caisses/${id}/session-courante`),
      api.page<CashSession>(`${base}/caisses/${id}/sessions`, { par_page: 15 }),
    ]);
    const movements = session ? (await api.page<CashMovement>(`${base}/caisses/${id}/sessions/${session.id}/mouvements`, { par_page: 50 })).donnees : [];
    return { register, session, sessions: sessions.donnees, movements };
  }, [base, id]);

  const register = data?.register;
  const session = data?.session;

  function start(a: Action) {
    setAmount('');
    setNote('');
    setSign(1);
    setFormError(null);
    if (a === 'modifier' && register) {
      setEditName(register.nom);
      setEditCode(register.code ?? '');
      setEditActive(register.actif);
    }
    setAction(a);
  }

  async function submit() {
    if (!action) return;
    setSaving(true);
    setFormError(null);
    const value = cleanNumberInput(amount);
    try {
      let message: string | null = null;
      if (action === 'ouvrir') {
        ({ message } = await api.post(`${base}/caisses/${id}/sessions`, { montant_ouverture: value, motif: note.trim() || null }));
      } else if (action === 'fermer' && session) {
        const res = await api.post<CashSession>(`${base}/caisses/${id}/sessions/${session.id}/fermer`, { montant_fermeture_reel: value, note_fermeture: note.trim() || null });
        const ecart = toNumber(res.data.ecart);
        message = ecart === 0 ? 'Caisse fermée : aucun écart.' : `Caisse fermée avec un écart de ${ecart > 0 ? '+' : ''}${formatMoney(ecart)}.`;
      } else if ((action === 'entree' || action === 'sortie') && session) {
        ({ message } = await api.post(`${base}/caisses/${id}/sessions/${session.id}/${action}`, { montant: value, motif: note.trim() || null }));
      } else if (action === 'ajustement' && session) {
        ({ message } = await api.post(`${base}/caisses/${id}/sessions/${session.id}/ajustement`, { montant: String(sign * toNumber(value)), motif: note.trim() }));
      } else if (action === 'modifier') {
        ({ message } = await api.put(`${base}/caisses/${id}`, { nom: editName.trim(), code: editCode.trim() || null, actif: editActive }));
      }
      setAction(null);
      await reload();
      if (message && action === 'fermer') notify(message);
    } catch (e) {
      setFormError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  const needsAmount = action !== 'modifier';
  const canSubmit = action === 'modifier' ? !!editName.trim() : !!amount.trim() && (action !== 'ajustement' || !!note.trim());

  return (
    <Screen
      title={register?.nom ?? 'Caisse'}
      refreshing={refreshing}
      onRefresh={reload}
      right={
        register && can('caisse.gerer') ? (
          <Pressable onPress={() => start('modifier')} hitSlop={10} accessibilityLabel="Modifier la caisse">
            <Ionicons name="create-outline" size={22} color={C.white} />
          </Pressable>
        ) : undefined
      }
      footer={
        register ? (
          session ? (
            can('caisse.fermer') ? <Button title="Fermer la caisse" variant="dark" icon="lock-closed" onPress={() => start('fermer')} /> : undefined
          ) : can('caisse.ouvrir') && register.actif ? (
            <Button title="Ouvrir la caisse" icon="lock-open" onPress={() => start('ouvrir')} />
          ) : undefined
        ) : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {register && (
        <>
          <View style={styles.balance}>
            <View style={styles.balanceHead}>
              <Text style={styles.balanceLabel}>{session ? 'Solde en caisse' : 'Caisse fermée'}</Text>
              {!register.actif ? <Badge label="Inactive" tone="neutral" /> : session ? <Badge label="Ouverte" tone="success" /> : <Badge label="Fermée" tone="warning" />}
            </View>
            <Text style={styles.balanceValue}>{session ? formatMoney(session.solde_courant) : '—'}</Text>
            {session && (
              <Text style={styles.balanceMeta}>
                Ouverte le {formatDateTime(session.ouverte_le)}
                {session.ouverte_par ? ` par ${session.ouverte_par.nom}` : ''} · fond {formatMoney(session.montant_ouverture)}
              </Text>
            )}
          </View>

          {session && can('caisse.ajuster') && (
            <View style={styles.actions}>
              <ActionButton icon="arrow-down" label="Entrée" color={C.success} onPress={() => start('entree')} />
              <ActionButton icon="arrow-up" label="Sortie" color={C.danger} onPress={() => start('sortie')} />
              <ActionButton icon="swap-vertical" label="Ajuster" color={C.info} onPress={() => start('ajustement')} />
            </View>
          )}

          <View style={styles.tabs}>
            <Chip label="Session en cours" active={tab === 'session'} onPress={() => setTab('session')} />
            <Chip label="Historique" active={tab === 'historique'} onPress={() => setTab('historique')} />
          </View>

          {tab === 'session' &&
            (session ? (
              <Card style={{ paddingVertical: 0 }}>{data.movements.length ? data.movements.map((m) => <CashMovementRow key={m.id} m={m} />) : <Text style={styles.none}>Aucun mouvement.</Text>}</Card>
            ) : (
              <EmptyState icon="lock-closed-outline" title="Aucune session ouverte" message="Ouvrez la caisse avec le fond de caisse pour commencer à encaisser." />
            ))}

          {tab === 'historique' &&
            (data.sessions.length === 0 ? (
              <EmptyState icon="time-outline" title="Aucune session" />
            ) : (
              data.sessions.map((s) => {
                const ecart = toNumber(s.ecart);
                return (
                  <Card key={s.id} style={{ gap: 2, paddingVertical: 8 }}>
                    <View style={styles.sessionHead}>
                      <Text style={styles.sessionTitle}>{formatDateTime(s.ouverte_le)}</Text>
                      {s.statut === 'ouverte' ? <Badge label="En cours" tone="success" /> : <Badge label={ecart === 0 ? 'Sans écart' : `Écart ${ecart > 0 ? '+' : ''}${formatMoney(ecart)}`} tone={ecart === 0 ? 'neutral' : ecart > 0 ? 'primary' : 'danger'} />}
                    </View>
                    <InfoRow label="Fond d'ouverture" value={formatMoney(s.montant_ouverture)} />
                    {s.statut === 'fermee' && <InfoRow label="Attendu / compté" value={`${formatMoney(s.montant_fermeture_attendu)} / ${formatMoney(s.montant_fermeture_reel)}`} />}
                    {s.fermee_le && <InfoRow label="Fermée le" value={`${formatDateTime(s.fermee_le)}${s.fermee_par ? ` · ${s.fermee_par.nom}` : ''}`} />}
                  </Card>
                );
              })
            ))}
        </>
      )}

      <Sheet visible={action !== null} onClose={() => setAction(null)} title={action ? TITLES[action] : ''}>
        {formError && Object.keys(formError.erreurs).length === 0 && <ErrorBox message={formError.message} />}
        {action === 'fermer' && session && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Solde théorique : {formatMoney(session.solde_courant)}. Comptez les espèces présentes et saisissez le montant réel.</Text>
          </View>
        )}
        {action === 'ajustement' && (
          <View style={styles.tabs}>
            <Chip label="Ajouter (+)" active={sign === 1} onPress={() => setSign(1)} />
            <Chip label="Retirer (−)" active={sign === -1} onPress={() => setSign(-1)} />
          </View>
        )}
        {needsAmount && (
          <Field
            label={action === 'ouvrir' ? "Fond de caisse d'ouverture" : action === 'fermer' ? 'Montant compté' : 'Montant'}
            required
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            suffix="FCFA"
            autoFocus
            error={formError?.field('montant') ?? formError?.field('montant_ouverture') ?? formError?.field('montant_fermeture_reel')}
          />
        )}
        {needsAmount && (
          <Field
            label={action === 'fermer' ? 'Note de fermeture' : 'Motif'}
            required={action === 'ajustement'}
            value={note}
            onChangeText={setNote}
            placeholder={action === 'ajustement' ? 'Obligatoire pour un ajustement' : 'Optionnel'}
            error={formError?.field('motif')}
          />
        )}
        {action === 'modifier' && (
          <>
            <Field label="Nom de la caisse" required value={editName} onChangeText={setEditName} error={formError?.field('nom')} />
            <Field label="Code" value={editCode} onChangeText={setEditCode} autoCapitalize="characters" error={formError?.field('code')} />
            <ToggleRow label="Caisse active" description="Une caisse inactive ne peut plus être ouverte." value={editActive} onValueChange={setEditActive} />
          </>
        )}
        <Button title="Valider" onPress={submit} loading={saving} disabled={!canSubmit} />
      </Sheet>
    </Screen>
  );
}

function ActionButton({ icon, label, color, onPress }: { icon: 'arrow-down' | 'arrow-up' | 'swap-vertical'; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: C.background }]}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color={C.white} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  balance: { backgroundColor: C.dark, borderRadius: R.lg, padding: 18, gap: 6 },
  balanceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  balanceValue: { color: C.white, fontSize: 30, fontWeight: '800' },
  balanceMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  tabs: { flexDirection: 'row', gap: 8 },
  none: { color: C.textMuted, fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  sessionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  hint: { backgroundColor: C.primarySoft, borderRadius: R.md, padding: 12 },
  hintText: { fontSize: 13, color: C.text },
});
