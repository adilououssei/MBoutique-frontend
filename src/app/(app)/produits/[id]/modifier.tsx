import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { draftFrom, ProductForm } from '@/components/product-form';
import { ErrorBox, Loading, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import { notify } from '@/lib/dialog';
import type { Product } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { goBack } from '@/lib/navigation';

export default function ModifierProduit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useStorePath();
  const { data: product, error, loading } = useApi(() => api.get<Product>(`${base}/produits/${id}`), [base, id]);

  return (
    <Screen title="Modifier le produit">
      {loading && !product && <Loading />}
      {error && <ErrorBox message={error} />}
      {product && (
        <>
          <View style={styles.head}>
            <Thumb name={product.nom} size={64} uri={product.image_url} />
            <View>
              <Text style={styles.name}>{product.nom}</Text>
              <Text style={styles.cat}>{product.categorie?.nom ?? 'Sans catégorie'}</Text>
            </View>
          </View>
          <ProductForm
            key={product.id}
            product={product}
            initial={draftFrom(product)}
            submitLabel="Enregistrer"
            onSaved={(_, message) => {
              notify(message ?? 'Produit mis à jour.');
              goBack({ pathname: '/produits/[id]', params: { id } });
            }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 17, fontWeight: '800', color: C.text },
  cat: { fontSize: 13, color: C.textMuted, marginTop: 2 },
});
