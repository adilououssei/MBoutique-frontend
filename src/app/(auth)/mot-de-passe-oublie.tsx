import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { ErrorBox } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { C } from '@/constants/colors';
import { api, ApiError } from '@/lib/api';

/**
 * Deux étapes : demande du lien (e-mail), puis saisie du jeton reçu et du
 * nouveau mot de passe (POST /auth/reinitialiser-mot-de-passe).
 */
export default function MotDePasseOublie() {
  const [step, setStep] = useState<'demande' | 'reinitialisation' | 'termine'>('demande');
  const [email, setEmail] = useState('');
  const [jeton, setJeton] = useState('');
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requestLink() {
    setLoading(true);
    setError(null);
    try {
      const { message } = await api.post('/auth/mot-de-passe-oublie', { email: email.trim() });
      setInfo(message);
      setStep('reinitialisation');
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    setError(null);
    try {
      const { message } = await api.post('/auth/reinitialiser-mot-de-passe', { email: email.trim(), jeton: jeton.trim(), mot_de_passe: mdp, mot_de_passe_confirmation: mdp2 });
      setInfo(message);
      setStep('termine');
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell back title="Mot de passe oublié" subtitle="Recevez un code de réinitialisation par e-mail.">
      {error && Object.keys(error.erreurs).length === 0 && <ErrorBox message={error.message} />}
      {info && (
        <View style={styles.info}>
          <Text style={styles.infoText}>{info}</Text>
        </View>
      )}
      {step === 'demande' && (
        <>
          <Field label="Adresse e-mail" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="vous@exemple.com" error={error?.field('email')} />
          <Button title="Envoyer le lien" onPress={requestLink} loading={loading} disabled={!email} />
        </>
      )}
      {step === 'reinitialisation' && (
        <>
          <Field label="Code reçu par e-mail" required value={jeton} onChangeText={setJeton} autoCapitalize="none" placeholder="Collez le code ici" error={error?.field('jeton')} />
          <Field label="Nouveau mot de passe" required value={mdp} onChangeText={setMdp} password error={error?.field('mot_de_passe') ?? error?.field('email')} />
          <Field label="Confirmer le mot de passe" required value={mdp2} onChangeText={setMdp2} password />
          <Button title="Réinitialiser" onPress={reset} loading={loading} disabled={!jeton || !mdp} />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  info: { backgroundColor: C.successSoft, borderRadius: 12, padding: 14 },
  infoText: { color: C.success, fontSize: 13 },
});
