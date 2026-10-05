import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconCircle, type IconName } from '@/components/ui/elements';
import { C, R } from '@/constants/colors';
import { formatMoney, formatNumber, formatQty, toNumber } from '@/lib/format';
import type { DashboardReport, ReportPoint } from '@/lib/types';

const PAYMENT_LABELS: Record<string, string> = {
  especes: 'Espèces',
  mobile_money: 'Mobile Money',
  carte: 'Carte',
  virement: 'Virement',
  mixte: 'Mixte',
};

const PAYMENT_COLORS = [C.primary, C.dark, C.success, C.warning, C.info];

export function paymentLabel(mode: string): string {
  return PAYMENT_LABELS[mode] ?? mode;
}

/** « +12,5 % » vert, « −3 % » rouge, rien si la période précédente était vide. */
export function Trend({ value, onDark, suffix }: { value: number | null; onDark?: boolean; suffix?: string }) {
  if (value === null) {
    return <Text style={[styles.trendNeutral, onDark && { color: 'rgba(255,255,255,0.6)' }]}>Nouveau{suffix ? ` ${suffix}` : ''}</Text>;
  }
  const up = value > 0;
  const flat = value === 0;
  const fg = flat ? (onDark ? 'rgba(255,255,255,0.75)' : C.info) : up ? (onDark ? '#5EE6A5' : C.success) : onDark ? '#FF8A80' : C.danger;
  const bg = onDark ? 'rgba(255,255,255,0.1)' : flat ? C.infoSoft : up ? C.successSoft : C.dangerSoft;
  const sign = up ? '+' : flat ? '' : '−';
  return (
    <View style={[styles.trend, { backgroundColor: bg }]}>
      <Ionicons name={flat ? 'remove' : up ? 'trending-up' : 'trending-down'} size={13} color={fg} />
      <Text style={[styles.trendText, { color: fg }]}>
        {sign}
        {formatNumber(Math.abs(value), 1)} %{suffix ? ` ${suffix}` : ''}
      </Text>
    </View>
  );
}

export function KpiTile({ icon, label, value, trend, caption }: { icon: IconName; label: string; value: string; trend?: number | null; caption?: string }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiHead}>
        <IconCircle name={icon} size={30} />
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {trend !== undefined ? <Trend value={trend} /> : caption ? <Text style={styles.kpiCaption}>{caption}</Text> : null}
    </View>
  );
}

/**
 * Histogramme léger en simples View (pas de dépendance graphique). Toucher une
 * barre affiche son montant ; par défaut, la meilleure barre est sélectionnée.
 */
export function BarChart({ points, height = 150, onDark, compact }: { points: ReportPoint[]; height?: number; onDark?: boolean; compact?: boolean }) {
  const values = points.map((p) => toNumber(p.chiffre_affaires));
  const max = Math.max(...values, 0);
  const best = max > 0 ? values.indexOf(max) : -1;
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected ?? best;

  // Une étiquette sur ~6 pour rester lisible (24 heures, 30 jours...).
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const barColor = onDark ? 'rgba(255,255,255,0.18)' : '#FFD9C7';
  const muted = onDark ? 'rgba(255,255,255,0.55)' : C.textMuted;

  return (
    <View style={{ gap: 8 }}>
      {!compact && (
        <View style={styles.chartInfo}>
          {active >= 0 ? (
            <>
              <Text style={[styles.chartInfoValue, onDark && { color: C.white }]}>{formatMoney(values[active])}</Text>
              <Text style={[styles.chartInfoLabel, { color: muted }]}>
                {points[active].libelle} · {formatNumber(points[active].nombre_ventes)} vente(s)
              </Text>
            </>
          ) : (
            <Text style={[styles.chartInfoLabel, { color: muted }]}>Aucune vente sur la période</Text>
          )}
        </View>
      )}
      <View style={[styles.bars, { height }]}>
        {points.map((p, i) => {
          const ratio = max > 0 ? values[i] / max : 0;
          return (
            <Pressable
              key={p.cle}
              style={styles.barSlot}
              onPress={compact ? undefined : () => setSelected(i)}
              accessibilityLabel={`${p.libelle} : ${formatMoney(values[i])}`}>
              <View
                style={[
                  styles.bar,
                  {
                    height: values[i] > 0 ? Math.max(4, ratio * height) : 2,
                    backgroundColor: i === active ? C.primary : barColor,
                    borderRadius: points.length > 14 ? 2 : 4,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {points.map((p, i) => (
          <Text key={p.cle} style={[styles.axisLabel, { color: muted }]} numberOfLines={1}>
            {i % labelEvery === 0 ? p.libelle : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function TopProducts({ products }: { products: DashboardReport['meilleurs_produits'] }) {
  const max = Math.max(...products.map((p) => toNumber(p.chiffre_affaires)), 0);
  return (
    <View style={{ gap: 14 }}>
      {products.map((p, i) => (
        <View key={p.produit_id} style={{ gap: 6 }}>
          <View style={styles.rankRow}>
            <View style={[styles.rank, i === 0 && { backgroundColor: C.primary }]}>
              <Text style={[styles.rankText, i === 0 && { color: C.white }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName} numberOfLines={1}>
                {p.nom}
              </Text>
              <Text style={styles.rankMeta}>{formatQty(p.quantite)} vendu(s)</Text>
            </View>
            <Text style={styles.rankAmount}>{formatMoney(p.chiffre_affaires)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${max > 0 ? (toNumber(p.chiffre_affaires) / max) * 100 : 0}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PaymentBreakdown({ methods }: { methods: DashboardReport['modes_paiement'] }) {
  const total = methods.reduce((s, m) => s + toNumber(m.montant), 0);
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.stack}>
        {methods.map((m, i) => (
          <View key={m.mode} style={{ flex: total > 0 ? toNumber(m.montant) / total : 1, backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
        ))}
      </View>
      {methods.map((m, i) => (
        <View key={m.mode} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }]} />
          <Text style={styles.legendLabel}>{paymentLabel(m.mode)}</Text>
          <Text style={styles.legendMeta}>
            {total > 0 ? `${formatNumber((toNumber(m.montant) / total) * 100)} %` : '—'} · {formatNumber(m.nombre_ventes)} vente(s)
          </Text>
          <Text style={styles.legendAmount}>{formatMoney(m.montant)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  trend: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.pill },
  trendText: { fontSize: 11, fontWeight: '700' },
  trendNeutral: { fontSize: 11, fontWeight: '600', color: C.textLight },
  kpi: { flexBasis: '46%', flexGrow: 1, backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 14, gap: 8 },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: C.textMuted },
  kpiValue: { fontSize: 19, fontWeight: '800', color: C.text },
  kpiCaption: { fontSize: 11, color: C.textLight },
  chartInfo: { gap: 2, minHeight: 40 },
  chartInfoValue: { fontSize: 18, fontWeight: '800', color: C.text },
  chartInfoLabel: { fontSize: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  axis: { flexDirection: 'row', gap: 3 },
  axisLabel: { flex: 1, fontSize: 9, overflow: 'visible' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800', color: C.primary },
  rankName: { fontSize: 14, fontWeight: '600', color: C.text },
  rankMeta: { fontSize: 12, color: C.textMuted },
  rankAmount: { fontSize: 14, fontWeight: '700', color: C.text },
  track: { height: 6, borderRadius: 3, backgroundColor: C.background, overflow: 'hidden', marginLeft: 36 },
  fill: { height: '100%', borderRadius: 3, backgroundColor: C.primary },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: C.background },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  legendMeta: { flex: 1, fontSize: 12, color: C.textMuted },
  legendAmount: { fontSize: 14, fontWeight: '700', color: C.text },
});
