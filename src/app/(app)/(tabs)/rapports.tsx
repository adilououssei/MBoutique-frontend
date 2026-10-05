import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart, KpiTile, PaymentBreakdown, TopProducts, Trend } from '@/components/report-widgets';
import { Button } from '@/components/ui/button';
import { Card, Chip, EmptyState, ErrorBox, Loading, SectionTitle } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import { formatMoney, formatNumber, formatQty } from '@/lib/format';
import type { DashboardReport, ReportPeriod } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const PERIODS: { value: ReportPeriod; label: string; comparison: string }[] = [
  { value: 'aujourdhui', label: "Aujourd'hui", comparison: 'vs hier à la même heure' },
  { value: '7_jours', label: '7 jours', comparison: 'vs les 7 jours précédents' },
  { value: '30_jours', label: '30 jours', comparison: 'vs les 30 jours précédents' },
  { value: 'ce_mois', label: 'Ce mois', comparison: 'vs le mois dernier à date' },
];

export default function Rapports() {
  const { store, can } = useAuth();
  const base = useStorePath();
  const [period, setPeriod] = useState<ReportPeriod>('aujourdhui');
  const current = PERIODS.find((p) => p.value === period)!;

  const { data, error, loading, refreshing, reload } = useApi(
    () => api.get<DashboardReport>(`${base}/rapports/tableau-de-bord`, { periode: period }),
    [base, store?.id, period],
  );

  // Les données affichées doivent correspondre à la période choisie (pas l'ancienne pendant le chargement).
  const report = data?.periode.code === period ? data : undefined;
  const resume = report?.resume;

  return (
    <Screen title="Rapports" back={false} refreshing={refreshing} onRefresh={reload}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PERIODS.map((p) => (
          <Chip key={p.value} label={p.label} active={p.value === period} onPress={() => setPeriod(p.value)} />
        ))}
      </ScrollView>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!report && !error && (loading || data) && <Loading />}

      {report && resume && (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Chiffre d&apos;affaires · {report.periode.libelle.toLowerCase()}</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(resume.chiffre_affaires)}
            </Text>
            <View style={styles.heroTrend}>
              <Trend value={report.evolution.chiffre_affaires} onDark />
              <Text style={styles.heroCompare}>{current.comparison}</Text>
            </View>
            <View style={{ marginTop: 14 }}>
              <BarChart points={report.courbe.points} onDark height={120} />
            </View>
          </View>

          <View style={styles.grid}>
            <KpiTile icon="receipt" label="Ventes" value={formatNumber(resume.nombre_ventes)} trend={report.evolution.nombre_ventes} />
            <KpiTile icon="basket" label="Panier moyen" value={formatMoney(resume.panier_moyen)} trend={report.evolution.panier_moyen} />
            <KpiTile icon="cube" label="Articles vendus" value={formatQty(resume.articles_vendus)} trend={report.evolution.articles_vendus} />
            <KpiTile
              icon="wallet"
              label="Bénéfice estimé"
              value={resume.benefice_estime === null ? '—' : formatMoney(resume.benefice_estime)}
              caption={
                resume.benefice_estime === null
                  ? "Ajoutez les prix d'achat"
                  : resume.produits_sans_prix_achat > 0
                    ? `${resume.produits_sans_prix_achat} produit(s) sans prix d'achat`
                    : 'Prix de vente − prix d’achat'
              }
            />
          </View>

          {Number(resume.remises) > 0 && (
            <Text style={styles.note}>Remises accordées sur la période : {formatMoney(resume.remises)}</Text>
          )}

          {resume.nombre_ventes === 0 ? (
            <EmptyState
              icon="bar-chart-outline"
              title="Aucune vente sur cette période"
              message="Les statistiques apparaîtront dès votre première vente."
              action={can('ventes.creer') ? <Button title="Nouvelle vente" onPress={() => router.push('/ventes/nouvelle')} /> : undefined}
            />
          ) : (
            <>
              <Card style={styles.section}>
                <SectionTitle>Meilleurs produits</SectionTitle>
                <TopProducts products={report.meilleurs_produits} />
              </Card>

              <Card style={styles.section}>
                <SectionTitle>Modes de paiement</SectionTitle>
                <PaymentBreakdown methods={report.modes_paiement} />
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingRight: 8 },
  hero: { backgroundColor: C.dark, borderRadius: R.xl, padding: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: C.white, fontSize: 30, fontWeight: '800', marginTop: 6 },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  heroCompare: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  note: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  section: { gap: 16 },
});
