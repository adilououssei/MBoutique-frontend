import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { formatNumber } from '@/lib/format';
import type { ImportReport } from '@/lib/types';

export default function ResultatImport() {
  const { rapport } = useLocalSearchParams<{ rapport: string }>();
  const [open, setOpen] = useState(false);
  let report: ImportReport = { total_lignes: 0, importes: 0, rejetes: 0, erreurs: [] };
  try {
    report = JSON.parse(rapport);
  } catch {}

  const ok = report.rejetes === 0;

  return (
    <Screen title="Résultat de l'import" footer={<Button title="Voir les produits" onPress={() => router.dismissTo('/produits')} />}>
      <View style={styles.hero}>
        <View style={[styles.check, !ok && { backgroundColor: report.importes > 0 ? C.warning : C.danger }]}>
          <Ionicons name={ok ? 'checkmark' : report.importes > 0 ? 'alert' : 'close'} size={40} color={C.white} />
        </View>
        <Text style={styles.title}>{ok ? 'Import terminé !' : report.importes > 0 ? 'Import partiel' : 'Aucun produit importé'}</Text>
        <Text style={styles.sub}>{formatNumber(report.total_lignes)} ligne(s) analysée(s)</Text>
        {!!report.stocks_initialises && <Text style={styles.sub}>Stock initial enregistré pour {formatNumber(report.stocks_initialises)} produit(s)</Text>}
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={[styles.statValue, { color: C.success }]}>{formatNumber(report.importes)}</Text>
          <Text style={styles.statLabel}>Produits importés</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={[styles.statValue, { color: C.primary }]}>{formatNumber(report.rejetes)}</Text>
          <Text style={styles.statLabel}>Erreur{report.rejetes > 1 ? 's' : ''}</Text>
        </Card>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailsTitle}>Détails</Text>
        <Pressable style={styles.detailsRow} onPress={() => setOpen((o) => !o)} disabled={report.erreurs.length === 0}>
          <Ionicons name="document-text-outline" size={18} color={C.text} />
          <Text style={styles.detailsText}>{report.erreurs.length ? 'Voir le rapport complet' : 'Toutes les lignes ont été importées'}</Text>
          {report.erreurs.length > 0 && <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={18} color={C.text} />}
        </Pressable>
        {open &&
          report.erreurs.map((e) => (
            <View key={e.ligne} style={styles.err}>
              <Text style={styles.errLine}>Ligne {e.ligne}</Text>
              {Object.entries(e.erreurs).map(([field, msgs]) => (
                <Text key={field} style={styles.errMsg}>
                  • {field} : {msgs.join(' ')}
                </Text>
              ))}
            </View>
          ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  check: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', color: C.text, marginTop: 10 },
  sub: { fontSize: 13, color: C.textMuted },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 6 },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 13, color: C.textMuted },
  details: { backgroundColor: C.background, borderRadius: R.md, padding: 14, gap: 10 },
  detailsTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: R.sm, padding: 12 },
  detailsText: { flex: 1, fontSize: 13, color: C.text },
  err: { backgroundColor: C.white, borderRadius: R.sm, padding: 12, gap: 4 },
  errLine: { fontSize: 13, fontWeight: '700', color: C.danger },
  errMsg: { fontSize: 12, color: C.textMuted },
});
