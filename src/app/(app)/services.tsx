import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorBox, Loading, SearchBar, Thumb, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { cleanNumberInput, formatMoney, toNumber } from '@/lib/format';
import type { Category, Service } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const EMPTY = { nom: '', description: '', prix: '', duree_minutes: '', categorie_id: null as number | null, actif: true };

export default function Services() {
  const { can, hasFeature } = useAuth();
  const base = useStorePath();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);
  const { data, error, loading, reload, refreshing } = useApi(() => api.page<Service>(`${base}/services`, { recherche: query, par_page: 100 }).then((r) => r.donnees), [base, query]);

  useEffect(() => {
    if (!hasFeature('categories')) return;
    api.page<Category>(`${base}/categories`, { par_page: 100, actif: true }).then((r) => setCategories(r.donnees)).catch(() => {});
  }, [base, hasFeature]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function open(s: Service | 'new') {
    setFormError(null);
    setForm(
      s === 'new'
        ? EMPTY
        : { nom: s.nom, description: s.description ?? '', prix: String(toNumber(s.prix)), duree_minutes: s.duree_minutes ? String(s.duree_minutes) : '', categorie_id: s.categorie?.id ?? null, actif: s.actif },
    );
    setEditing(s);
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      prix: cleanNumberInput(form.prix),
      duree_minutes: form.duree_minutes.trim() ? parseInt(form.duree_minutes, 10) : null,
      categorie_id: form.categorie_id,
      actif: form.actif,
    };
    try {
      if (editing === 'new') await api.post(`${base}/services`, payload);
      else if (editing) await api.put(`${base}/services/${editing.id}`, payload);
      setEditing(null);
      await reload();
    } catch (e) {
      setFormError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Service) {
    if (!(await confirm('Supprimer le service', `Supprimer « ${s.nom} » ?`, 'Supprimer', true))) return;
    try {
      await api.delete(`${base}/services/${s.id}`);
      setEditing(null);
      await reload();
    } catch (e) {
      notify('Suppression impossible', (e as ApiError).message);
    }
  }

  return (
    <Screen title="Services" refreshing={refreshing} onRefresh={reload} footer={can('services.creer') ? <Button title="Nouveau service" icon="add" onPress={() => open('new')} /> : undefined}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un service..." />
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState icon="construct-outline" title="Aucun service" message="Ajoutez les prestations que vous proposez." />}
      {data?.map((s) => (
        <Pressable key={s.id} disabled={!can('services.modifier')} onPress={() => open(s)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
          <Thumb name={s.nom} size={46} icon="construct" />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.name}>{s.nom}</Text>
            <Text style={styles.meta}>
              {s.categorie?.nom ?? 'Sans catégorie'}
              {s.duree_minutes ? ` · ${s.duree_minutes} min` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={styles.price}>{formatMoney(s.prix)}</Text>
            {!s.actif && <Badge label="Inactif" />}
          </View>
        </Pressable>
      ))}

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouveau service' : 'Modifier le service'}>
        {formError && Object.keys(formError.erreurs).length === 0 && <ErrorBox message={formError.message} />}
        <Field label="Nom du service" required value={form.nom} onChangeText={(v) => setForm((f) => ({ ...f, nom: v }))} placeholder="Ex : Coupe homme" error={formError?.field('nom') ?? formError?.field('slug')} />
        {hasFeature('categories') && (
          <SelectField label="Catégorie" placeholder="Aucune" value={form.categorie_id} onChange={(v) => setForm((f) => ({ ...f, categorie_id: v }))} options={categories.map((c) => ({ value: c.id, label: c.nom }))} />
        )}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Prix" required value={form.prix} onChangeText={(v) => setForm((f) => ({ ...f, prix: v }))} keyboardType="decimal-pad" suffix="FCFA" error={formError?.field('prix')} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Durée" value={form.duree_minutes} onChangeText={(v) => setForm((f) => ({ ...f, duree_minutes: v }))} keyboardType="number-pad" suffix="min" error={formError?.field('duree_minutes')} />
          </View>
        </View>
        <Field label="Description" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Optionnel" multiline />
        {editing !== 'new' && <ToggleRow label="Service actif" value={form.actif} onValueChange={(v) => setForm((f) => ({ ...f, actif: v }))} />}
        <Button title="Enregistrer" onPress={save} loading={saving} disabled={!form.nom.trim() || !form.prix.trim()} />
        {editing && editing !== 'new' && can('services.supprimer') && <Button title="Supprimer" variant="danger" onPress={() => remove(editing)} />}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  price: { fontSize: 14, fontWeight: '800', color: C.text },
});
