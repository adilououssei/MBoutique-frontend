import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorBox } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/sheet';
import { useAuth } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import type { Business, BusinessDomain, Store } from '@/lib/types';

/**
 * Création d'une boutique. Si l'utilisateur n'a encore aucune entreprise,
 * elle est créée dans la foulée (POST /entreprises puis /entreprises/{id}/boutiques).
 */
export function StoreForm({ onCreated, submitLabel = 'Créer la boutique' }: { onCreated: (store: Store) => void; submitLabel?: string }) {
  const { refreshStores, selectStore } = useAuth();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [domains, setDomains] = useState<BusinessDomain[]>([]);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [form, setForm] = useState({ nom: '', adresse: '', telephone: '' });
  const [domainId, setDomainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    Promise.all([api.get<Business[]>('/entreprises'), api.get<BusinessDomain[]>('/domaines-activite')])
      .then(([b, d]) => {
        setBusinesses(b);
        setBusinessId(b[0]?.id ?? null);
        setDomains(d);
      })
      .catch((e) => setError(e));
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      let entrepriseId = businessId;
      if (!entrepriseId) {
        const { data } = await api.post<Business>('/entreprises', { nom: businessName.trim(), devise: 'XOF' });
        entrepriseId = data.id;
        setBusinesses([data]);
        setBusinessId(data.id);
      }
      const { data: store } = await api.post<Store>(`/entreprises/${entrepriseId}/boutiques`, {
        nom: form.nom.trim(),
        domaine_activite_id: domainId,
        adresse: form.adresse.trim() || null,
        telephone: form.telephone.trim() || null,
        devise: 'XOF',
      });
      const list = await refreshStores();
      const created = list.find((s) => s.id === store.id);
      if (created) await selectStore(created);
      onCreated(created ?? store);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Création impossible.', 0));
    } finally {
      setLoading(false);
    }
  }

  const needsBusiness = businesses !== null && businesses.length === 0;

  return (
    <View style={{ gap: 16 }}>
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      {needsBusiness && (
        <Field label="Nom de votre entreprise" required value={businessName} onChangeText={setBusinessName} placeholder="Ex : Ets Traoré & Fils" error={error?.field('nom') && !form.nom ? error.field('nom') : undefined} />
      )}
      {businesses && businesses.length > 1 && (
        <SelectField label="Entreprise" required value={businessId} onChange={setBusinessId} options={businesses.map((b) => ({ value: b.id, label: b.nom }))} />
      )}
      <Field label="Nom de la boutique" required value={form.nom} onChangeText={(v) => setForm((f) => ({ ...f, nom: v }))} placeholder="Ex : Boutique du Marché" error={error?.field('nom')} />
      <SelectField
        label="Domaine d'activité"
        required
        placeholder="Sélectionner un domaine"
        value={domainId}
        onChange={setDomainId}
        options={domains.map((d) => ({ value: d.id, label: d.nom }))}
        error={error?.field('domaine_activite_id')}
      />
      <Field label="Adresse" value={form.adresse} onChangeText={(v) => setForm((f) => ({ ...f, adresse: v }))} placeholder="Optionnel" />
      <Field label="Téléphone" value={form.telephone} onChangeText={(v) => setForm((f) => ({ ...f, telephone: v }))} placeholder="Optionnel" keyboardType="phone-pad" />
      <Button title={submitLabel} onPress={submit} loading={loading} disabled={!form.nom || !domainId || (needsBusiness && !businessName)} />
    </View>
  );
}
