import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, ErrorBox, InfoRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { formatDate, initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';

export default function Profil() {
  const { user, store, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function changePassword() {
    setSaving(true);
    setError(null);
    try {
      const { message } = await api.put('/auth/mot-de-passe', { mot_de_passe_actuel: current, mot_de_passe: next, mot_de_passe_confirmation: confirmation });
      setCurrent('');
      setNext('');
      setConfirmation('');
      notify(message ?? 'Mot de passe mis à jour.');
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Mon profil">
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.nom ?? '')}</Text>
        </View>
        <Text style={styles.name}>{user?.nom}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
      </View>

      <Card style={{ paddingVertical: 4 }}>
        <InfoRow label="Téléphone" value={user?.telephone ?? '—'} />
        <InfoRow label="Boutique" value={store?.nom ?? '—'} />
        <InfoRow label="Rôle" value={store?.mon_role ? ROLE_LABELS[store.mon_role] : '—'} />
        <InfoRow label="Membre depuis" value={formatDate(user?.cree_le)} />
      </Card>

      <Text style={styles.section}>Changer le mot de passe</Text>
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      <Field label="Mot de passe actuel" required value={current} onChangeText={setCurrent} password error={error?.field('mot_de_passe_actuel')} />
      <Field label="Nouveau mot de passe" required value={next} onChangeText={setNext} password error={error?.field('mot_de_passe')} />
      <Field label="Confirmer le nouveau mot de passe" required value={confirmation} onChangeText={setConfirmation} password />
      <Button title="Mettre à jour" onPress={changePassword} loading={saving} disabled={!current || !next || !confirmation} />

      <Button
        title="Se déconnecter"
        variant="danger"
        icon="log-out-outline"
        onPress={async () => {
          if (await confirm('Déconnexion', 'Voulez-vous vous déconnecter ?', 'Se déconnecter')) await logout();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 26 },
  name: { fontSize: 20, fontWeight: '800', color: C.text },
  meta: { fontSize: 13, color: C.textMuted },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 8 },
});
