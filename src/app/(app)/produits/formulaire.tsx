import { router, useLocalSearchParams } from 'expo-router';

import { draftFrom, ProductForm } from '@/components/product-form';
import { Screen } from '@/components/ui/screen';

/** Création manuelle. Accepte un pré-remplissage (création vocale) via les paramètres. */
export default function CreationManuelle() {
  const params = useLocalSearchParams<{ nom?: string; prix_detail?: string; prix_gros?: string; source?: string }>();

  const initial = draftFrom();
  if (params.nom) initial.nom = params.nom;
  if (params.prix_detail) initial.prix_detail = params.prix_detail;
  if (params.prix_gros) {
    initial.vente_gros_active = true;
    initial.prix_gros = params.prix_gros;
  }
  if (params.source === 'vocal' && !params.prix_detail && params.prix_gros) initial.vente_detail_active = false;

  return (
    <Screen title={params.source === 'vocal' ? 'Vérifier le produit' : 'Création manuelle - Formulaire'}>
      <ProductForm
        initial={initial}
        submitLabel="Enregistrer le produit"
        onSaved={(p) => router.replace({ pathname: '/produits/succes', params: { id: p.id } })}
      />
    </Screen>
  );
}
