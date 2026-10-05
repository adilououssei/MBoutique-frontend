import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorBox, Loading, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/sheet';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { cleanNumberInput, toNumber } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import type { Employee, SalaryPeriod, StoreMember } from '@/lib/types';

const EMPTY = { nom: '', poste: '', telephone: '', adresse: '', date_embauche: '', salaire: '', periodicite: 'mensuel' as SalaryPeriod, notes: '', actif: true, utilisateur_id: 0 };

/** Création (sans ?id) ou modification (?id=) d'une fiche employé. */
export default function FormulaireEmploye() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const [form, setForm] = useState(EMPTY);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = <K extends keyof typeof EMPTY>(k: K) => (v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (can('membres.voir')) api.get<StoreMember[]>(`${base}/membres`).then(setMembers).catch(() => {});
    if (!id) return;
    api
      .get<Employee>(`${base}/employes/${id}`)
      .then((e) =>
        setForm({
          nom: e.nom,
          poste: e.poste ?? '',
          telephone: e.telephone ?? '',
          adresse: e.adresse ?? '',
          date_embauche: e.date_embauche ?? '',
          salaire: e.salaire != null ? String(toNumber(e.salaire)) : '',
          periodicite: e.periodicite_salaire ?? 'mensuel',
          notes: e.notes ?? '',
          actif: e.actif,
          utilisateur_id: e.compte?.id ?? 0,
        }),
      )
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [base, id, can]);

  async function submit() {
    setSaving(true);
    setError(null);
    const hasSalary = form.salaire.trim() !== '';
    const payload = {
      nom: form.nom.trim(),
      poste: form.poste.trim() || null,
      telephone: form.telephone.trim() || null,
      adresse: form.adresse.trim() || null,
      date_embauche: form.date_embauche.trim() || null,
      salaire: hasSalary ? cleanNumberInput(form.salaire) : null,
      periodicite_salaire: hasSalary ? form.periodicite : null,
      notes: form.notes.trim() || null,
      actif: form.actif,
      utilisateur_id: form.utilisateur_id || null,
    };
    try {
      if (id) {
        await api.put(`${base}/employes/${id}`, payload);
        goBack({ pathname: '/employes/[id]', params: { id } });
      } else {
        const { data } = await api.post<Employee>(`${base}/employes`, payload);
        router.replace({ pathname: '/employes/[id]', params: { id: data.id } });
      }
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={id ? "Modifier l'employé" : 'Nouvel employé'} footer={<Button title="Enregistrer" onPress={submit} loading={saving} disabled={!form.nom.trim() || loading} />}>
      {loading && <Loading />}
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      {!loading && (
        <>
          <Field label="Nom complet" required value={form.nom} onChangeText={set('nom')} placeholder="Ex : Awa Traoré" error={error?.field('nom')} />
          <Field label="Poste" value={form.poste} onChangeText={set('poste')} placeholder="Ex : Vendeuse, Coiffeur, Magasinier" />
          <Field label="Téléphone" value={form.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" placeholder="Optionnel" />
          <Field label="Adresse" value={form.adresse} onChangeText={set('adresse')} placeholder="Optionnel" />
          <Field label="Date d'embauche" value={form.date_embauche} onChangeText={set('date_embauche')} placeholder="AAAA-MM-JJ (optionnel)" error={error?.field('date_embauche')} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Salaire" value={form.salaire} onChangeText={set('salaire')} keyboardType="decimal-pad" placeholder="Optionnel" suffix="FCFA" error={error?.field('salaire')} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Par"
                value={form.periodicite}
                onChange={set('periodicite')}
                options={[
                  { value: 'mensuel', label: 'Mois' },
                  { value: 'hebdomadaire', label: 'Semaine' },
                  { value: 'journalier', label: 'Jour' },
                ]}
              />
            </View>
          </View>
          {members.length > 0 && (
            <SelectField
              label="Compte M Boutique lié"
              value={form.utilisateur_id}
              onChange={set('utilisateur_id')}
              options={[{ value: 0, label: 'Aucun (ne se connecte pas)' }, ...members.map((m) => ({ value: m.utilisateur.id, label: m.utilisateur.nom, description: m.utilisateur.email }))]}
              error={error?.field('utilisateur_id')}
            />
          )}
          <Field label="Notes" value={form.notes} onChangeText={set('notes')} placeholder="Horaires, contacts d'urgence…" multiline />
          {id && <ToggleRow label="Employé actif" description="Un employé parti peut être désactivé : son historique est conservé." value={form.actif} onValueChange={set('actif')} />}
        </>
      )}
    </Screen>
  );
}
