import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PurchaseRow } from '@/components/purchase-row';
import { Button } from '@/components/ui/button';
import { Badge, Card, ErrorBox, InfoRow, Loading, Thumb } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { confirm, notify } from '@/lib/dialog';
import { formatMoney, toNumber } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import type { Purchase, Supplier } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailFournisseur() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const { data, error, loading, reload, refreshing } = useApi(async () => {
    const [supplier, purchases] = await Promise.all([
      api.get<Supplier>(`${base}/fournisseurs/${id}`),
      can('achats.voir') ? api.page<Purchase>(`${base}/achats`, { fournisseur_id: id, par_page: 10 }) : null,
    ]);
    return { supplier, purchases: purchases?.donnees ?? [] };
  }, [base, id]);

  const s = data?.supplier;
  const due = toNumber(s?.solde_du);

  async function remove() {
    if (!s || !(await confirm('Supprimer le fournisseur', `Supprimer « ${s.nom} » ? Ses achats passés sont conservés.`, 'Supprimer', true))) return;
    try {
      await api.delete(`${base}/fournisseurs/${id}`);
      goBack('/fournisseurs');
    } catch (e) {
      notify('Suppression impossible', (e as ApiError).message);
    }
  }

  return (
    <Screen
      title="Fournisseur"
      refreshing={refreshing}
      onRefresh={reload}
      right={
        s && can('fournisseurs.supprimer') ? (
          <Pressable onPress={remove} hitSlop={10} accessibilityLabel="Supprimer">
            <Ionicons name="trash-outline" size={21} color={C.white} />
          </Pressable>
        ) : undefined
      }
      footer={
        s && can('achats.creer') ? <Button title="Nouvel achat" icon="add" onPress={() => router.push({ pathname: '/achats/nouveau', params: { fournisseur_id: id } })} /> : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {s && (
        <>
          <View style={styles.head}>
            <Thumb name={s.nom} size={64} icon="business" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{s.nom}</Text>
              {s.nom_contact && <Text style={styles.meta}>{s.nom_contact}</Text>}
              {!s.actif && <Badge label="Inactif" />}
            </View>
            {can('fournisseurs.modifier') && (
              <Pressable onPress={() => router.push({ pathname: '/fournisseurs/formulaire', params: { id } })} hitSlop={10} accessibilityLabel="Modifier">
                <Ionicons name="create-outline" size={22} color={C.primary} />
              </Pressable>
            )}
          </View>

          <View style={[styles.balance, due > 0 ? { backgroundColor: C.dangerSoft } : { backgroundColor: C.successSoft }]}>
            <Text style={styles.balanceLabel}>{due > 0 ? 'Vous devez à ce fournisseur' : 'Aucune dette envers ce fournisseur'}</Text>
            <Text style={[styles.balanceValue, { color: due > 0 ? C.danger : C.success }]}>{formatMoney(due)}</Text>
            <Text style={styles.meta}>Total des achats : {formatMoney(s.total_achats)}</Text>
          </View>

          {s.telephone && (
            <View style={styles.quick}>
              <Button title="Appeler" icon="call" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${s.telephone}`)} />
              <Button title="WhatsApp" icon="logo-whatsapp" variant="outline" small style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${s.telephone?.replace(/[^\d]/g, '')}`)} />
            </View>
          )}

          <Card style={{ paddingVertical: 4 }}>
            <InfoRow label="Téléphone" value={s.telephone ?? '—'} />
            <InfoRow label="E-mail" value={s.email ?? '—'} />
            <InfoRow label="Adresse" value={s.adresse ?? '—'} />
          </Card>
          {s.notes && (
            <Card>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notes}>{s.notes}</Text>
            </Card>
          )}

          {can('achats.voir') && (
            <>
              <Text style={styles.section}>Derniers achats</Text>
              {data.purchases.length === 0 ? (
                <Text style={styles.none}>Aucun achat enregistré pour ce fournisseur.</Text>
              ) : (
                <View style={styles.group}>{data.purchases.map((p) => <PurchaseRow key={p.id} purchase={p} showSupplier={false} />)}</View>
              )}
            </>
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
  balance: { borderRadius: R.lg, padding: 16, gap: 4 },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  balanceValue: { fontSize: 26, fontWeight: '800' },
  quick: { flexDirection: 'row', gap: 10 },
  notesTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  notes: { fontSize: 14, color: C.text, lineHeight: 20 },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  none: { fontSize: 13, color: C.textMuted },
  group: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 },
});
