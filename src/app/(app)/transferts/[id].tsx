import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ErrorBox, InfoRow, Loading } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import { formatDateTime, formatQty } from '@/lib/format';
import type { StockTransfer } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function DetailTransfert() {
  const { id, nouveau } = useLocalSearchParams<{ id: string; nouveau?: string }>();
  const base = useStorePath();
  const { data: t, error, loading } = useApi(() => api.get<StockTransfer>(`${base}/transferts/${id}`), [base, id]);
  const out = t?.sens === 'sortant';
  const created = t?.lignes?.filter((l) => l.produit_cree).length ?? 0;

  return (
    <Screen title="Transfert">
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {t && (
        <>
          {nouveau === '1' && (
            <View style={styles.success}>
              <Text style={styles.successText}>
                Transfert effectué : la marchandise est sortie de votre stock et entrée dans celui de {t.destination.nom}.
                {created > 0 ? ` ${created} produit(s) ont été créés dans cette boutique.` : ''}
              </Text>
            </View>
          )}
          <Card style={{ gap: 10 }}>
            <View style={styles.headRow}>
              <View style={{ gap: 3, flex: 1 }}>
                <Text style={styles.ref}>{t.reference}</Text>
                <Text style={styles.meta}>{formatDateTime(t.cree_le)}</Text>
              </View>
              <Badge label={out ? 'Envoyé' : 'Reçu'} tone={out ? 'warning' : 'success'} />
            </View>
            <InfoRow label="De" value={t.source.nom} />
            <InfoRow label="Vers" value={t.destination.nom} />
            {t.par && <InfoRow label="Par" value={t.par.nom} />}
          </Card>

          <Text style={styles.section}>Articles</Text>
          <Card style={{ gap: 12 }}>
            {t.lignes?.map((l) => (
              <Pressable key={l.produit_id} onPress={() => router.push({ pathname: '/stock/[id]', params: { id: l.produit_id } })} style={styles.line}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.lineName}>{l.nom_produit}</Text>
                  {l.produit_cree && <Text style={styles.meta}>Fiche créée dans {t.destination.nom}</Text>}
                </View>
                <Text style={[styles.qty, { color: out ? C.danger : C.success }]}>
                  {out ? '−' : '+'} {formatQty(l.quantite)}
                </Text>
              </Pressable>
            ))}
          </Card>

          {t.note && (
            <Card>
              <Text style={styles.lineName}>Note</Text>
              <Text style={styles.meta}>{t.note}</Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { backgroundColor: '#E8F6EF', borderRadius: 12, padding: 14 },
  successText: { color: C.success, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ref: { fontSize: 16, fontWeight: '800', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { fontSize: 14, fontWeight: '700', color: C.text },
  qty: { fontSize: 15, fontWeight: '800' },
});
