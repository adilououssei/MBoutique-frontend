import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconCircle, type IconName } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useAuth } from '@/context/auth';

type Mode = { title: string; description: string; icon: IconName; href: Href; colors?: [string, string]; permission: string };

const MODES: Mode[] = [
  { title: 'Formulaire manuel', description: 'Remplissez le formulaire pour créer un produit.', icon: 'document-text', href: '/produits/formulaire', permission: 'produits.creer' },
  { title: 'Création vocale', description: 'Parlez et nous créons le produit pour vous.', icon: 'mic', href: '/produits/vocal', permission: 'produits.creer' },
  { title: 'Importer Excel', description: 'Importez un fichier Excel contenant vos produits.', icon: 'grid', href: '/produits/import', colors: ['#0B7A45', '#1DB36B'], permission: 'produits.importer' },
];

export default function ChoixCreation() {
  const { can } = useAuth();
  return (
    <Screen title="Créer un produit">
      {MODES.filter((m) => can(m.permission)).map((m) => (
        <Pressable key={m.title} onPress={() => router.push(m.href)} style={({ pressed }) => [styles.card, pressed && { backgroundColor: C.background }]}>
          <IconCircle name={m.icon} size={56} colors={m.colors} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>{m.title}</Text>
            <Text style={styles.desc}>{m.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    shadowColor: C.dark,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  desc: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
});
