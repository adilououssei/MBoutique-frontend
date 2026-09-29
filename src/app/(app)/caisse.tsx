import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorBox, IconCircle, Loading } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import type { CashRegister } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function Caisses() {
  const { can } = useAuth();
  const base = useStorePath();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);
  const { data, error, loading, reload, refreshing } = useApi(() => api.page<CashRegister>(`${base}/caisses`, { par_page: 100 }).then((r) => r.donnees), [base]);

  async function create() {
    setSaving(true);
    setFormError(null);
    try {
      const { data: created } = await api.post<CashRegister>(`${base}/caisses`, { nom: nom.trim(), code: code.trim() || null });
      setOpen(false);
      setNom('');
      setCode('');
      router.push({ pathname: '/caisse/[id]', params: { id: created.id } });
    } catch (e) {
      setFormError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Caisse"
      refreshing={refreshing}
      onRefresh={reload}
      footer={can('caisse.gerer') ? <Button title="Nouvelle caisse" icon="add" onPress={() => setOpen(true)} /> : undefined}>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon="calculator-outline" title="Aucune caisse" message="Créez une caisse pour encaisser vos ventes et suivre vos espèces." />}
      {data?.map((r) => (
        <Pressable key={r.id} onPress={() => router.push({ pathname: '/caisse/[id]', params: { id: r.id } })} style={({ pressed }) => [styles.card, pressed && { backgroundColor: C.background }]}>
          <IconCircle name="calculator" size={48} colors={r.est_ouverte ? undefined : ['#8A96A6', '#B4BDC8']} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{r.nom}</Text>
            <Text style={styles.meta}>{r.code ?? 'Sans code'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            {!r.actif ? <Badge label="Inactive" tone="neutral" /> : r.est_ouverte ? <Badge label="Ouverte" tone="success" /> : <Badge label="Fermée" tone="warning" />}
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </View>
        </Pressable>
      ))}

      <Sheet visible={open} onClose={() => setOpen(false)} title="Nouvelle caisse">
        {formError && Object.keys(formError.erreurs).length === 0 && <ErrorBox message={formError.message} />}
        <Field label="Nom de la caisse" required value={nom} onChangeText={setNom} placeholder="Ex : Caisse principale" error={formError?.field('nom')} autoFocus />
        <Field label="Code" value={code} onChangeText={setCode} placeholder="Ex : C1 (optionnel)" autoCapitalize="characters" error={formError?.field('code')} />
        <Button title="Créer la caisse" onPress={create} loading={saving} disabled={!nom.trim()} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.lg, borderWidth: 1, borderColor: C.border },
  name: { fontSize: 16, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
});
