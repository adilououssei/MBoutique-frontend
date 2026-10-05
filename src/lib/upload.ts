import { Platform } from 'react-native';

type LocalFile = {
  /** URI locale renvoyée par le sélecteur (file://… ou content://…). */
  uri: string;
  name: string;
  mimeType?: string | null;
  /** Objet File du navigateur (web uniquement). */
  webFile?: globalThis.File;
};

/**
 * Ajoute un fichier local à un FormData d'envoi.
 *
 * Sur mobile on garde la forme React Native `{ uri, name, type }` : le fichier
 * est lu par la couche réseau native au moment de l'envoi. L'envoi passe donc
 * par XMLHttpRequest (voir `api.upload`), car le `fetch` global d'Expo
 * (`expo/fetch`) ne comprend pas cette forme, et lire le fichier en JS via
 * expo-file-system échoue (« Missing 'READ' permission ») pour les fichiers
 * renvoyés par les sélecteurs.
 */
export function appendFile(form: FormData, field: string, file: LocalFile) {
  if (Platform.OS === 'web') {
    if (!file.webFile) throw new Error('Fichier introuvable.');
    form.append(field, file.webFile, file.name);
    return;
  }
  form.append(field, { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
}
