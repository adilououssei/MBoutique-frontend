import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorBox, Loading, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import type { Customer } from '@/lib/types';
import { goBack } from '@/lib/navigation';

const EMPTY = { nom: '', telephone: '', email: '', nom_entreprise: '', adresse: '', notes: '', actif: true };

/** Création (sans ?id) ou modification (?id=) d'un client. */
export default function FormulaireClient() {
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
      .get<Customer>(`${base}/clients/${id}`)
      .then((c) => setForm({ nom: c.nom, telephone: c.telephone ?? '', email: c.email ?? '', nom_entreprise: c.nom_entreprise ?? '', adresse: c.adresse ?? '', notes: c.notes ?? '', actif: c.actif }))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [base, id]);

  async function submit() {
    setSaving(true);
    setError(null);
    const payload = {
      nom: form.nom.trim(),
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      nom_entreprise: form.nom_entreprise.trim() || null,
      adresse: form.adresse.trim() || null,
      notes: form.notes.trim() || null,
      actif: form.actif,
    };
    try {
      if (id) {
        await api.put(`${base}/clients/${id}`, payload);
        goBack({ pathname: '/clients/[id]', params: { id } });
      } else {
        const { data } = await api.post<Customer>(`${base}/clients`, payload);
        router.replace({ pathname: '/clients/[id]', params: { id: data.id } });
      }
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={id ? 'Modifier le client' : 'Nouveau client'} footer={<Button title="Enregistrer" onPress={submit} loading={saving} disabled={!form.nom.trim() || loading} />}>
      {loading && <Loading />}
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      {!loading && (
        <>
          <Field label="Nom" required value={form.nom} onChangeText={set('nom')} placeholder="Ex : Moussa Koné" error={error?.field('nom')} />
          <Field label="Téléphone" value={form.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" placeholder="Optionnel" error={error?.field('telephone')} />
          <Field label="E-mail" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" placeholder="Optionnel" error={error?.field('email')} />
          <Field label="Entreprise" value={form.nom_entreprise} onChangeText={set('nom_entreprise')} placeholder="Optionnel" />
          <Field label="Adresse" value={form.adresse} onChangeText={set('adresse')} placeholder="Optionnel" />
          <Field label="Notes" value={form.notes} onChangeText={set('notes')} placeholder="Préférences, remarques…" multiline />
          {id && <ToggleRow label="Client actif" value={form.actif} onValueChange={set('actif')} />}
        </>
      )}
    </Screen>
  );
}
