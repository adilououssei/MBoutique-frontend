import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BarChart, Trend } from '@/components/report-widgets';
import { StoreSwitcher } from '@/components/store-switcher';
import { Card, IconCircle, type IconName } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import { formatMoney, formatNumber, formatQty, todayIso, toNumber } from '@/lib/format';
import type { DashboardReport, Sale, Stock } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Tile = { title: string; subtitle: string; icon: IconName; href: Href; feature: string };

const TILES: Tile[] = [
  { title: 'Produits', subtitle: 'Gérer vos produits', icon: 'bag-handle', href: '/produits', feature: 'produits' },
  { title: 'Ventes', subtitle: 'Enregistrer une vente', icon: 'cart', href: '/ventes/nouvelle', feature: 'ventes' },
  { title: 'Stock', subtitle: 'Suivre le stock', icon: 'cube', href: '/stock', feature: 'stock' },
  { title: 'Caisse', subtitle: 'Gérer la caisse', icon: 'calculator', href: '/caisse', feature: 'caisse' },
  { title: 'Clients', subtitle: 'Votre clientèle', icon: 'people', href: '/clients', feature: 'clients' },
  { title: 'Services', subtitle: 'Prestations proposées', icon: 'construct', href: '/services', feature: 'services' },
];

export default function Accueil() {
  const { user, hasFeature, can, store } = useAuth();
  const base = useStorePath();
  const tiles = TILES.filter((t) => hasFeature(t.feature)).slice(0, 4);
  const canReport = hasFeature('rapports') && can('rapports.voir');

  // Aperçu du jour : le tableau de bord du module Rapports si l'utilisateur y a accès,
  // sinon un simple total des ventes du jour ; plus les alertes de stock.
  const { data: today, reload, refreshing } = useApi(async () => {
    const [report, sales, low] = await Promise.all([
      // Un rapport indisponible ne doit pas casser l'accueil.
      canReport ? api.get<DashboardReport>(`${base}/rapports/tableau-de-bord`, { periode: 'aujourdhui' }).catch(() => null) : null,
      !canReport && hasFeature('ventes') && can('ventes.voir')
        ? api.page<Sale>(`${base}/ventes`, { du: todayIso(), au: todayIso(), statut: 'terminee', par_page: 100 })
        : null,
      hasFeature('stock') ? api.page<Stock>(`${base}/stocks`, { stock_faible: 1, par_page: 1 }) : null,
    ]);
    return {
      report,
      total: sales?.donnees.reduce((s, v) => s + toNumber(v.total), 0) ?? null,
      count: sales?.meta.total ?? null,
      low: low?.meta.total ?? null,
    };
  }, [base, store?.id, canReport, hasFeature('ventes'), hasFeature('stock')]);

  const report = today?.report;
  const star = report?.meilleurs_produits[0];

  const firstName = user?.nom.split(' ')[0] ?? '';

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={reload}
      header={
        <View style={{ gap: 16 }}>
          <View style={styles.brandRow}>
            <View style={styles.brand}>
              <Image source={require('@/assets/images/logo-mark-fond-noir.png')} style={styles.logo} contentFit="contain" />
              <Text style={styles.brandText}>Boutique</Text>
            </View>
            <Pressable onPress={() => router.push('/profil')} style={styles.avatar} accessibilityLabel="Mon profil">
              <Ionicons name="person" size={18} color={C.dark} />
            </Pressable>
          </View>
          <StoreSwitcher />
        </View>
      }>
      <View>
        <Text style={styles.hello}>Bonjour, {firstName}</Text>
        <Text style={styles.question}>{report ? 'Voici votre activité du jour.' : "Que souhaitez-vous faire aujourd'hui ?"}</Text>
      </View>

      {report && (
        <Pressable
          onPress={() => router.push('/rapports')}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel="Voir les rapports">
          <View style={styles.heroHead}>
            <Text style={styles.heroLabel}>Chiffre d&apos;affaires du jour</Text>
            <View style={styles.heroLink}>
              <Text style={styles.heroLinkText}>Rapports</Text>
              <Ionicons name="chevron-forward" size={14} color={C.primary} />
            </View>
          </View>
          <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(report.resume.chiffre_affaires)}
          </Text>
          <View style={styles.heroTrend}>
            <Trend value={report.evolution.chiffre_affaires} onDark />
            <Text style={styles.heroCompare}>vs hier à la même heure</Text>
          </View>
          <BarChart points={report.courbe.points} onDark compact height={48} />
          <View style={styles.heroStats}>
            <HeroStat label="Ventes" value={formatNumber(report.resume.nombre_ventes)} />
            <View style={styles.heroDivider} />
            <HeroStat label="Panier moyen" value={formatMoney(report.resume.panier_moyen)} />
            <View style={styles.heroDivider} />
            <HeroStat label="Articles" value={formatQty(report.resume.articles_vendus)} />
          </View>
          {star && (
            <View style={styles.star}>
              <Ionicons name="trophy" size={15} color={C.warning} />
              <Text style={styles.starText} numberOfLines={1}>
                Produit star : <Text style={styles.starName}>{star.nom}</Text> ({formatQty(star.quantite)} vendu(s))
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {report && today?.low ? (
        <Card style={styles.alert} onPress={() => router.push({ pathname: '/stock', params: { filtre: 'faible' } })}>
          <Ionicons name="warning" size={20} color={C.danger} />
          <Text style={styles.alertText}>{formatNumber(today.low)} produit(s) en stock faible</Text>
          <Ionicons name="chevron-forward" size={16} color={C.danger} />
        </Card>
      ) : null}

      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable key={t.title} onPress={() => router.push(t.href)} style={({ pressed }) => [styles.tile, pressed && { backgroundColor: C.background }]}>
            <IconCircle name={t.icon} size={50} />
            <View style={{ gap: 3 }}>
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tileSub}>{t.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {today && !report && (today.total !== null || today.low !== null) && (
        <Card style={styles.today}>
          <Text style={styles.todayTitle}>Aperçu du jour</Text>
          <View style={styles.todayRow}>
            {today.total !== null && (
              <Pressable style={styles.stat} onPress={() => router.push('/ventes')}>
                <Text style={styles.statValue}>{formatMoney(today.total)}</Text>
                <Text style={styles.statLabel}>{formatNumber(today.count)} vente(s) aujourd&apos;hui</Text>
              </Pressable>
            )}
            {today.low !== null && (
              <Pressable style={styles.stat} onPress={() => router.push({ pathname: '/stock', params: { filtre: 'faible' } })}>
                <Text style={[styles.statValue, { color: today.low > 0 ? C.danger : C.success }]}>{formatNumber(today.low)}</Text>
                <Text style={styles.statLabel}>produit(s) en stock faible</Text>
              </Pressable>
            )}
          </View>
        </Card>
      )}
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logo: { width: 34, height: 34 },
  brandText: { color: C.primary, fontSize: 24, fontWeight: '800' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DDE2E8', alignItems: 'center', justifyContent: 'center' },
  hello: { fontSize: 22, fontWeight: '800', color: C.text },
  question: { fontSize: 14, color: C.text, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: 150,
    backgroundColor: C.white,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: C.dark,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  tileTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  tileSub: { fontSize: 12, color: C.textMuted },
  today: { gap: 12, backgroundColor: C.background, borderColor: C.background },
  todayTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  todayRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: C.white, borderRadius: R.md, padding: 12, gap: 4 },
  statValue: { fontSize: 17, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 12, color: C.textMuted },
  hero: { backgroundColor: C.dark, borderRadius: R.xl, padding: 18, gap: 10 },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  heroLinkText: { color: C.primary, fontSize: 13, fontWeight: '700' },
  heroValue: { color: C.white, fontSize: 28, fontWeight: '800' },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroCompare: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: R.md, paddingVertical: 10 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  heroStatValue: { color: C.white, fontSize: 15, fontWeight: '800' },
  heroStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' },
  star: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starText: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  starName: { fontWeight: '700', color: C.white },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.dangerSoft, borderColor: C.dangerSoft, paddingVertical: 12 },
  alertText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.danger },
});
