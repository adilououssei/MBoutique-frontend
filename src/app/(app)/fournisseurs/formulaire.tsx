import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorBox, Loading, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import type { Supplier } from '@/lib/types';

const EMPTY = { nom: '', nom_contact: '', telephone: '', email: '', adresse: '', notes: '', actif: true };

/** Création (sans ?id) ou modification (?id=) d'un fournisseur. */
export default function FormulaireFournisseur() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const base = useStorePath();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof EMPTY) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!id) return;
    api
      .get<Supplier>(`${base}/fournisseurs/${id}`)
      .then((s) => setForm({ nom: s.nom, nom_contact: s.nom_contact ?? '', telephone: s.telephone ?? '', email: s.email ?? '', adresse: s.adresse ?? '', notes: s.notes ?? '', actif: s.actif }))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [base, id]);

  async function submit() {
    setSaving(true);
    setError(null);
    const payload = {
      nom: form.nom.trim(),
      nom_contact: form.nom_contact.trim() || null,
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      adresse: form.adresse.trim() || null,
      notes: form.notes.trim() || null,
      actif: form.actif,
    };
    try {
      if (id) {
        await api.put(`${base}/fournisseurs/${id}`, payload);
        goBack({ pathname: '/fournisseurs/[id]', params: { id } });
      } else {
        const { data } = await api.post<Supplier>(`${base}/fournisseurs`, payload);
        router.replace({ pathname: '/fournisseurs/[id]', params: { id: data.id } });
      }
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'} footer={<Button title="Enregistrer" onPress={submit} loading={saving} disabled={!form.nom.trim() || loading} />}>
      {loading && <Loading />}
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      {!loading && (
        <>
          <Field label="Nom du fournisseur" required value={form.nom} onChangeText={set('nom')} placeholder="Ex : Grossiste Diallo & Fils" error={error?.field('nom')} />
          <Field label="Personne à contacter" value={form.nom_contact} onChangeText={set('nom_contact')} placeholder="Optionnel" />
          <Field label="Téléphone" value={form.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" placeholder="Optionnel" error={error?.field('telephone')} />
          <Field label="E-mail" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholder="Optionnel" error={error?.field('email')} />
          <Field label="Adresse" value={form.adresse} onChangeText={set('adresse')} placeholder="Optionnel" />
          <Field label="Notes" value={form.notes} onChangeText={set('notes')} placeholder="Jours de livraison, conditions…" multiline />
          {id && <ToggleRow label="Fournisseur actif" value={form.actif} onValueChange={set('actif')} />}
        </>
      )}
    </Screen>
  );
}
