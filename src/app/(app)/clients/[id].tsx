import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import type { Customer } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { goBack } from '@/lib/navigation';

export default function DetailClient() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const { data: c, error, loading } = useApi(() => api.get<Customer>(`${base}/clients/${id}`), [base, id]);

  async function remove() {
    if (!c || !(await confirm('Supprimer le client', `Supprimer « ${c.nom} » ? Ses ventes passées sont conservées.`, 'Supprimer', true))) return;
    try {
      await api.delete(`${base}/clients/${id}`);
      goBack('/clients');
    } catch (e) {
      notify('Suppression impossible', (e as ApiError).message);
    }
  }

  return (
    <Screen
      title="Fiche client"
      right={
        c && can('clients.supprimer') ? (
          <Pressable onPress={remove} hitSlop={10} accessibilityLabel="Supprimer">
            <Ionicons name="trash-outline" size={21} color={C.white} />
          </Pressable>
        ) : undefined
      }
      footer={c && can('clients.modifier') ? <Button title="Modifier" onPress={() => router.push({ pathname: '/clients/formulaire', params: { id } })} /> : undefined}>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {c && (
        <>
          <View style={styles.head}>
            <Thumb name={c.nom} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{c.nom}</Text>
              {c.nom_entreprise && <Text style={styles.meta}>{c.nom_entreprise}</Text>}
              {!c.actif && <Badge label="Inactif" />}
            </View>
          </View>
          {c.telephone && (
            <View style={styles.quick}>
              <Button title="Appeler" icon="call" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${c.telephone}`)} />
              <Button title="WhatsApp" icon="logo-whatsapp" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${c.telephone?.replace(/[^\d]/g, '')}`)} />
            </View>
          )}
          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Téléphone" value={c.telephone ?? '—'} />
            <InfoRow label="E-mail" value={c.email ?? '—'} />
            <InfoRow label="Adresse" value={c.adresse ?? '—'} />
          </Card>
          {c.notes && (
            <Card>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notes}>{c.notes}</Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 19, fontWeight: '800', color: C.text },
  meta: { fontSize: 13, color: C.textMuted },
  quick: { flexDirection: 'row', gap: 10 },
  notesTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  notes: { fontSize: 14, color: C.text, lineHeight: 20 },
});
