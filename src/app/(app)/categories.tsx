import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorBox, Loading, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import type { Category } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function Categories() {
  const { can } = useAuth();
  const base = useStorePath();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [actif, setActif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);
  const { data, error, loading, reload, refreshing } = useApi(() => api.page<Category>(`${base}/categories`, { par_page: 100 }).then((r) => r.donnees), [base]);

  function open(c: Category | 'new') {
    setFormError(null);
    setNom(c === 'new' ? '' : c.nom);
    setDescription(c === 'new' ? '' : (c.description ?? ''));
    setActif(c === 'new' ? true : c.actif);
    setEditing(c);
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    const payload = { nom: nom.trim(), description: description.trim() || null, actif };
    try {
      if (editing === 'new') await api.post(`${base}/categories`, payload);
      else if (editing) await api.put(`${base}/categories/${editing.id}`, payload);
      setEditing(null);
      await reload();
    } catch (e) {
      setFormError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!(await confirm('Supprimer la catégorie', `Supprimer « ${c.nom} » ? Les produits concernés resteront sans catégorie.`, 'Supprimer', true))) return;
    try {
      await api.delete(`${base}/categories/${c.id}`);
      setEditing(null);
      await reload();
    } catch (e) {
      notify('Suppression impossible', (e as ApiError).message);
    }
  }

  const editable = can('categories.modifier');

  return (
    <Screen title="Catégories" refreshing={refreshing} onRefresh={reload} footer={can('categories.creer') ? <Button title="Nouvelle catégorie" icon="add" onPress={() => open('new')} /> : undefined}>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState icon="pricetags-outline" title="Aucune catégorie" message="Les catégories organisent vos produits et services." />}
      {data?.map((c) => (
        <Pressable key={c.id} disabled={!editable} onPress={() => open(c)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
          <View style={styles.icon}>
            <Ionicons name="pricetag" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{c.nom}</Text>
            {c.description && (
              <Text style={styles.meta} numberOfLines={1}>
                {c.description}
              </Text>
            )}
          </View>
          {!c.actif && <Badge label="Inactive" />}
          {editable && <Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
        </Pressable>
      ))}

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}>
        {formError && Object.keys(formError.erreurs).length === 0 && <ErrorBox message={formError.message} />}
        <Field label="Nom" required value={nom} onChangeText={setNom} placeholder="Ex : Boissons" error={formError?.field('nom') ?? formError?.field('slug')} />
        <Field label="Description" value={description} onChangeText={setDescription} placeholder="Optionnel" multiline />
        {editing !== 'new' && <ToggleRow label="Catégorie active" value={actif} onValueChange={setActif} />}
        <Button title="Enregistrer" onPress={save} loading={saving} disabled={!nom.trim()} />
        {editing && editing !== 'new' && can('categories.supprimer') && <Button title="Supprimer" variant="danger" onPress={() => remove(editing)} />}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
});
