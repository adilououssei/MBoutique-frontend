import { router } from 'expo-router';

import { StoreForm } from '@/components/store-form';
import { Screen } from '@/components/ui/screen';

export default function NouvelleBoutique() {
  return (
    <Screen title="Nouvelle boutique">
      <StoreForm onCreated={() => router.dismissTo('/accueil')} />
    </Screen>
  );
}
