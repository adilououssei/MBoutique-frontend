import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { priceLine } from '@/components/product-row';
import { Button } from '@/components/ui/button';
import { Card, Thumb } from '@/components/ui/elements';
import { C } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const CONFETTI = [
  { top: 30, left: 40, color: C.primary, r: 20 },
  { top: 10, left: 120, color: '#F7C948', r: -15 },
  { top: 60, left: 250, color: C.primary, r: 40 },
  { top: 120, left: 20, color: '#F7C948', r: 10 },
  { top: 150, left: 270, color: C.success, r: -30 },
  { top: 0, left: 210, color: C.success, r: 60 },
  { top: 180, left: 60, color: C.primary, r: 75 },
];

/** Confirmation de création (écran blanc de la maquette). */
export default function Succes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = useStorePath();
  const insets = useSafeAreaInsets();
  const [scale] = useState(() => new Animated.Value(0.4));
  const { data: product } = useApi(() => api.get<Product>(`${base}/produits/${id}`), [base, id]);

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />
      <View style={styles.hero}>
        {CONFETTI.map((c, i) => (
          <View key={i} style={[styles.confetti, { top: c.top, left: c.left, backgroundColor: c.color, transform: [{ rotate: `${c.r}deg` }] }]} />
        ))}
        <Animated.View style={[styles.check, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark" size={64} color={C.white} />
        </Animated.View>
      </View>
      <Text style={styles.title}>Produit créé avec succès !</Text>

      {product && (
        <Card style={styles.card} onPress={() => router.replace({ pathname: '/produits/[id]', params: { id: product.id } })}>
          <Thumb name={product.nom} size={56} uri={product.image_url} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.name}>{product.nom}</Text>
            <Text style={styles.meta}>{product.categorie?.nom ?? 'Sans catégorie'}</Text>
            <Text style={styles.meta}>{priceLine(product)}</Text>
          </View>
        </Card>
      )}

      <View style={{ flex: 1 }} />
      <View style={{ gap: 12 }}>
        <Button title="Créer un autre produit" onPress={() => router.replace('/produits/nouveau')} />
        <Button title="Voir la liste" variant="outline" onPress={() => router.dismissTo('/produits')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white, paddingHorizontal: 24 },
  hero: { height: 220, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', width: 10, height: 5, borderRadius: 2 },
  check: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: '#D5F0E2',
  },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center', marginTop: 12, marginBottom: 24 },
  card: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
});
