import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { ErrorBox } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { C } from '@/constants/colors';
import { useAuth } from '@/context/auth';
import { ApiError } from '@/lib/api';

export default function Inscription() {
  const { register } = useAuth();
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', mot_de_passe: '', mot_de_passe_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await register({ ...form, email: form.email.trim(), telephone: form.telephone.trim() || undefined });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Inscription impossible.', 0));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell back title="Créer un compte" subtitle="Quelques informations pour démarrer avec M Boutique.">
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      <Field label="Nom complet" required value={form.nom} onChangeText={set('nom')} placeholder="Ex : Awa Traoré" error={error?.field('nom')} />
      <Field label="Adresse e-mail" required value={form.email} onChangeText={set('email')} placeholder="vous@exemple.com" keyboardType="email-address" autoCapitalize="none" error={error?.field('email')} />
      <Field label="Téléphone" value={form.telephone} onChangeText={set('telephone')} placeholder="Optionnel" keyboardType="phone-pad" error={error?.field('telephone')} />
      <Field label="Mot de passe" required value={form.mot_de_passe} onChangeText={set('mot_de_passe')} placeholder="8 caractères minimum" password error={error?.field('mot_de_passe')} />
      <Field label="Confirmer le mot de passe" required value={form.mot_de_passe_confirmation} onChangeText={set('mot_de_passe_confirmation')} placeholder="Répétez le mot de passe" password />
      <Button title="Créer mon compte" onPress={submit} loading={loading} disabled={!form.nom || !form.email || !form.mot_de_passe} />
      <View style={styles.row}>
        <Text style={styles.muted}>Déjà inscrit ?</Text>
        <Link href="/connexion" style={styles.link}>
          Se connecter
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  muted: { color: C.textMuted, fontSize: 14 },
  link: { color: C.primary, fontWeight: '700', fontSize: 14 },
});
