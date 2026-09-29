import { Redirect, router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { StoreForm } from '@/components/store-form';
import { C } from '@/constants/colors';
import { useAuth } from '@/context/auth';

/** Premier lancement : l'utilisateur n'est membre d'aucune boutique. */
export default function Bienvenue() {
  const { user, store, logout } = useAuth();
  if (store) return <Redirect href="/accueil" />;

  return (
    <AuthShell title={`Bienvenue, ${user?.nom.split(' ')[0] ?? ''} !`} subtitle="Créez votre première boutique pour commencer. Si un collègue vous a invité, demandez-lui de vous ajouter à sa boutique.">
      <StoreForm onCreated={() => router.replace('/accueil')} />
      <Pressable onPress={logout} style={{ alignSelf: 'center', padding: 8 }}>
        <Text style={{ color: C.textMuted, fontWeight: '600' }}>Se déconnecter</Text>
      </Pressable>
    </AuthShell>
  );
}
