import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorBox, Loading, Thumb } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { ROLE_LABELS } from '@/lib/permissions';
import type { StoreMember, StoreRoleName } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const ROLES: { value: StoreRoleName; description: string }[] = [
  { value: 'administrateur', description: 'Accès complet, gère l’équipe' },
  { value: 'gerant', description: 'Catalogue, stock, caisse et ventes' },
  { value: 'caissier', description: 'Ventes et opérations de caisse' },
  { value: 'employe', description: 'Consultation uniquement' },
];

export default function Membres() {
  const { can, user } = useAuth();
  const base = useStorePath();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StoreRoleName>('caissier');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);
  const { data, error, loading, reload, refreshing } = useApi(() => api.get<StoreMember[]>(`${base}/membres`), [base]);

  async function add() {
    setSaving(true);
    setFormError(null);
    try {
      await api.post(`${base}/membres`, { email: email.trim(), role });
      setOpen(false);
      setEmail('');
      await reload();
    } catch (e) {
      setFormError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: StoreMember) {
    if (!(await confirm('Retirer le membre', `Retirer ${m.utilisateur.nom} de la boutique ?`, 'Retirer', true))) return;
    try {
      await api.delete(`${base}/membres/${m.utilisateur.id}`);
      await reload();
    } catch (e) {
      notify('Action impossible', (e as ApiError).message);
    }
  }

  return (
    <Screen title="Équipe" refreshing={refreshing} onRefresh={reload} footer={can('membres.gerer') ? <Button title="Ajouter un membre" icon="person-add" onPress={() => setOpen(true)} /> : undefined}>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState icon="people-outline" title="Aucun membre" />}
      {data?.map((m) => {
        const r = m.roles[0] as StoreRoleName | undefined;
        const me = m.utilisateur.id === user?.id;
        return (
          <View key={m.id} style={styles.row}>
            <Thumb name={m.utilisateur.nom} size={44} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.name}>
                {m.utilisateur.nom}
                {me ? ' (vous)' : ''}
              </Text>
              <Text style={styles.meta}>{m.utilisateur.email}</Text>
            </View>
            {r && <Badge label={ROLE_LABELS[r] ?? r} tone={r === 'proprietaire' ? 'primary' : 'neutral'} />}
            {can('membres.gerer') && !me && r !== 'proprietaire' && (
              <Pressable onPress={() => remove(m)} hitSlop={8} accessibilityLabel="Retirer">
                <Ionicons name="close-circle-outline" size={22} color={C.danger} />
              </Pressable>
            )}
          </View>
        );
      })}

      <Sheet visible={open} onClose={() => setOpen(false)} title="Ajouter un membre">
        {formError && Object.keys(formError.erreurs).length === 0 && <ErrorBox message={formError.message} />}
        <Text style={styles.help}>La personne doit déjà avoir créé son compte M Boutique avec cette adresse e-mail.</Text>
        <Field label="E-mail du membre" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={formError?.field('email')} />
        <SelectField label="Rôle" required value={role} onChange={setRole} options={ROLES.map((x) => ({ value: x.value, label: ROLE_LABELS[x.value], description: x.description }))} error={formError?.field('role')} />
        <Button title="Ajouter" onPress={add} loading={saving} disabled={!email.trim()} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  help: { fontSize: 13, color: C.textMuted },
});
