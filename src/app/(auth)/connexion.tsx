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

export default function Connexion() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      // La redirection est faite par le layout (auth) une fois l'utilisateur chargé.
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Connexion impossible.', 0));
    } finally {
      setLoading(false);
    }
  }

  const general = error && !error.field('email') && !error.field('mot_de_passe') ? error.message : null;

  return (
    <AuthShell title="Connexion" subtitle="Heureux de vous revoir ! Connectez-vous pour gérer votre boutique.">
      {general && <ErrorBox message={general} />}
      <Field label="Adresse e-mail" required value={email} onChangeText={setEmail} placeholder="vous@exemple.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error?.field('email')} />
      <Field label="Mot de passe" required value={password} onChangeText={setPassword} placeholder="Votre mot de passe" password autoComplete="password" error={error?.field('mot_de_passe')} onSubmitEditing={submit} />
      <Link href="/mot-de-passe-oublie" style={styles.forgot}>
        Mot de passe oublié ?
      </Link>
      <Button title="Se connecter" onPress={submit} loading={loading} disabled={!email || !password} />
      <View style={styles.row}>
        <Text style={styles.muted}>Pas encore de compte ?</Text>
        <Link href="/inscription" style={styles.link}>
          Créer un compte
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', color: C.primary, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  muted: { color: C.textMuted, fontSize: 14 },
  link: { color: C.primary, fontWeight: '700', fontSize: 14 },
});
