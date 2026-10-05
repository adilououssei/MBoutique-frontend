import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/components/ui/elements';
import { C } from '@/constants/colors';
import { formatDateTime, formatMoney, formatQty, toNumber } from '@/lib/format';
import type { CashMovement, CashMovementType, StockMovement, StockMovementType } from '@/lib/types';

type Look = { label: string; icon: IconName; color: string };

export const STOCK_MOVEMENTS: Record<StockMovementType, Look> = {
  initial: { label: 'Entrée initiale', icon: 'archive', color: C.success },
  achat: { label: 'Achat / réapprovisionnement', icon: 'arrow-down-circle', color: C.success },
  retour: { label: 'Retour client', icon: 'return-down-back', color: C.success },
  vente: { label: 'Vente', icon: 'cart', color: C.danger },
  perte: { label: 'Perte / casse', icon: 'trash', color: C.danger },
  ajustement_entree: { label: 'Ajustement', icon: 'swap-vertical', color: C.info },
  ajustement_sortie: { label: 'Ajustement', icon: 'swap-vertical', color: C.info },
  inventaire: { label: 'Inventaire', icon: 'clipboard', color: C.info },
  transfert_sortie: { label: 'Transfert envoyé', icon: 'arrow-forward-circle', color: C.warning },
  transfert_entree: { label: 'Transfert reçu', icon: 'arrow-back-circle', color: C.success },
};

export const CASH_MOVEMENTS: Record<CashMovementType, Look> = {
  ouverture: { label: 'Ouverture de caisse', icon: 'lock-open', color: C.info },
  entree: { label: 'Entrée d’argent', icon: 'arrow-down-circle', color: C.success },
  sortie: { label: 'Sortie d’argent', icon: 'arrow-up-circle', color: C.danger },
  ajustement: { label: 'Ajustement', icon: 'swap-vertical', color: C.info },
  vente: { label: 'Vente', icon: 'cart', color: C.success },
  remboursement: { label: 'Remboursement', icon: 'return-down-back', color: C.danger },
};

function Row({ look, title, subtitle, delta, deltaText }: { look: Look; title?: string; subtitle: string; delta: number; deltaText: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: look.color }]}>
        <Ionicons name={look.icon} size={15} color={C.white} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.label} numberOfLines={1}>
          {title ?? look.label}
        </Text>
        <Text style={styles.date} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.delta, { color: delta < 0 ? C.danger : delta > 0 ? C.success : C.textMuted }]}>{deltaText}</Text>
    </View>
  );
}

export function StockMovementRow({ m }: { m: StockMovement }) {
  const delta = toNumber(m.quantite_apres) - toNumber(m.quantite_avant);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const who = m.cree_par?.nom ? ` · ${m.cree_par.nom}` : '';
  return <Row look={STOCK_MOVEMENTS[m.type]} subtitle={`${formatDateTime(m.cree_le)}${who}${m.motif ? ` · ${m.motif}` : ''}`} delta={delta} deltaText={`${sign}${formatQty(Math.abs(delta))}`} />;
}

export function CashMovementRow({ m }: { m: CashMovement }) {
  const delta = toNumber(m.solde_apres) - toNumber(m.solde_avant);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return (
    <Row
      look={CASH_MOVEMENTS[m.type]}
      title={m.motif && m.type !== 'vente' ? `${CASH_MOVEMENTS[m.type].label} · ${m.motif}` : undefined}
      subtitle={`${formatDateTime(m.cree_le)}${m.cree_par?.nom ? ` · ${m.cree_par.nom}` : ''}`}
      delta={m.type === 'ouverture' ? 1 : delta}
      deltaText={`${sign}${formatMoney(Math.abs(m.type === 'ouverture' ? toNumber(m.montant) : delta))}`}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  icon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.textMuted },
  delta: { fontSize: 14, fontWeight: '800' },
});
