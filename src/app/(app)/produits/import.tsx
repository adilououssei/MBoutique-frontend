import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorBox } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import type { ImportReport } from '@/lib/types';

const MAX_BYTES = 5 * 1024 * 1024;
const COLUMNS = ['nom', 'categorie', 'description', 'sku', 'code_barres', 'unite', 'prix_achat', 'vente_detail_active', 'prix_detail', 'vente_gros_active', 'prix_gros', 'actif'];

function formatSize(bytes?: number) {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.ceil(bytes / 1024)} Ko`;
}

export default function ImportExcel() {
  const base = useStorePath();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (!/\.(xlsx|xls)$/i.test(asset.name)) {
      setError('Seuls les fichiers .xlsx et .xls sont acceptés.');
      return;
    }
    if (asset.size && asset.size > MAX_BYTES) {
      setError('Le fichier dépasse la taille maximale de 5 Mo.');
      return;
    }
    setFile(asset);
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      if (Platform.OS === 'web' && file.file) {
        form.append('fichier', file.file, file.name);
      } else {
        form.append('fichier', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as unknown as Blob);
      }
      const { data } = await api.upload<ImportReport>(`${base}/produits/importer`, form);
      router.replace({ pathname: '/produits/import-resultat', params: { rapport: JSON.stringify(data) } });
    } catch (e) {
      const err = e as ApiError;
      setError(err.field?.('fichier') ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Import Excel" footer={<Button title="Importer" onPress={upload} loading={loading} disabled={!file} />}>
      <Pressable onPress={pick} style={styles.drop}>
        <Ionicons name="document-attach-outline" size={34} color={C.text} />
        <Text style={styles.dropText}>{Platform.OS === 'web' ? 'Glissez votre fichier Excel ici' : 'Sélectionnez votre fichier Excel'}</Text>
        <Text style={styles.or}>ou</Text>
        <Button title="Choisir un fichier" small onPress={pick} style={{ paddingHorizontal: 28 }} />
        <Text style={styles.formats}>Formats acceptés : .xlsx, .xls (max 2 000 lignes, 5 Mo)</Text>
      </Pressable>

      {error && <ErrorBox message={error} />}

      {file && (
        <>
          <Text style={styles.section}>Aperçu du fichier</Text>
          <View style={styles.file}>
            <Ionicons name="document-text-outline" size={30} color={C.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
            </View>
            <Pressable onPress={() => setFile(null)} hitSlop={10} accessibilityLabel="Retirer le fichier">
              <Ionicons name="close" size={20} color={C.text} />
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Colonnes attendues :</Text>
        <Text style={styles.infoLine}>{COLUMNS.join(' · ')}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle" size={15} color={C.success} />
          <Text style={styles.infoLine}>La 1ʳᵉ ligne contient les en-têtes.</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle" size={15} color={C.success} />
          <Text style={styles.infoLine}>Les catégories doivent déjà exister dans la boutique.</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle" size={15} color={C.success} />
          <Text style={styles.infoLine}>Les lignes invalides sont ignorées et listées dans le rapport.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9D1DB',
    borderRadius: R.lg,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  dropText: { fontSize: 14, color: C.text, marginTop: 6 },
  or: { fontSize: 13, color: C.textMuted },
  formats: { fontSize: 11, color: C.textMuted, marginTop: 6 },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -4 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  fileName: { fontSize: 14, fontWeight: '600', color: C.text },
  fileSize: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  info: { backgroundColor: C.background, borderRadius: R.md, padding: 14, gap: 8 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoLine: { fontSize: 12, color: C.textMuted, flex: 1, lineHeight: 17 },
});
