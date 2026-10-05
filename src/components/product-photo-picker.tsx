import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { C, R } from '@/constants/colors';
import { api } from '@/lib/api';
import { notify } from '@/lib/dialog';
import type { Product } from '@/lib/types';
import { appendFile } from '@/lib/upload';

/** Choix de l'utilisateur pour la photo : garder l'actuelle, en mettre une nouvelle, ou la retirer. */
export type PhotoChoice = { kind: 'keep' } | { kind: 'new'; asset: ImagePicker.ImagePickerAsset } | { kind: 'remove' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  // Photo de téléphone compressée : reste bien sous la limite de 5 Mo de l'API.
  quality: 0.7,
};

type Props = {
  currentUrl: string | null | undefined;
  value: PhotoChoice;
  onChange: (choice: PhotoChoice) => void;
};

export function ProductPhotoPicker({ currentUrl, value, onChange }: Props) {
  const preview = value.kind === 'new' ? value.asset.uri : value.kind === 'keep' ? currentUrl : null;

  async function pick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        notify('Appareil photo refusé', "Autorisez l'accès à l'appareil photo dans les réglages pour photographier vos produits.");
        return;
      }
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) onChange({ kind: 'new', asset: result.assets[0] });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        Photo du produit <Text style={styles.optional}>(optionnel)</Text>
      </Text>
      <View style={styles.row}>
        <Pressable onPress={() => pick('library')} style={styles.preview} accessibilityRole="button" accessibilityLabel="Choisir une photo">
          {preview ? (
            <Image source={{ uri: preview }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="camera-outline" size={28} color={C.primary} />
              <Text style={styles.placeholderText}>Ajouter</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.actions}>
          {Platform.OS !== 'web' && <Button title="Appareil photo" icon="camera-outline" variant="outline" small onPress={() => pick('camera')} />}
          <Button title="Galerie" icon="images-outline" variant="outline" small onPress={() => pick('library')} />
          {preview && (
            <Button title="Retirer la photo" icon="trash-outline" variant="danger" small onPress={() => onChange({ kind: 'remove' })} />
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Applique le choix de photo sur un produit déjà enregistré.
 * Renvoie le produit à jour, ou `null` si rien n'a changé.
 */
export async function applyPhotoChoice(base: string, product: Product, choice: PhotoChoice): Promise<Product | null> {
  const url = `${base}/produits/${product.id}/image`;

  if (choice.kind === 'remove') {
    if (!product.image_url) return null;
    return (await api.delete<Product>(url)).data;
  }
  if (choice.kind !== 'new') return null;

  const { asset } = choice;
  const form = new FormData();
  const name = asset.fileName ?? `produit-${product.id}.jpg`;
  appendFile(form, 'image', { uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg', webFile: asset.file });
  return (await api.upload<Product>(url, form)).data;
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  optional: { fontSize: 13, fontWeight: '400', color: C.textMuted },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  preview: { width: 112, height: 112, borderRadius: R.lg, overflow: 'hidden' },
  image: { width: '100%', height: '100%', backgroundColor: C.background },
  placeholder: {
    flex: 1,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9D1DB',
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: { fontSize: 12, fontWeight: '600', color: C.primary },
  actions: { flex: 1, gap: 8 },
});
