import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge, Chip, EmptyState, ErrorBox, Fab, Loading, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { formatTime } from '@/lib/agenda';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { formatDate, formatMoney } from '@/lib/format';
import { ORDER_TYPES, statusLabel } from '@/lib/orders';
import type { DiningTable, Order } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type View_ = 'salle' | 'en_cours' | 'terminees';

export default function Commandes() {
  const { can, hasFeature } = useAuth();
  const base = useStorePath();
  const withTables = hasFeature('tables');
  const [view, setView] = useState<View_>(withTables ? 'salle' : 'en_cours');
  const [manageOpen, setManageOpen] = useState(false);

  const { data, error, loading, reload, refreshing } = useApi(async () => {
    if (view === 'salle') return { tables: await api.get<DiningTable[]>(`${base}/tables`, { actif: true }), orders: [] as Order[] };
    const query = view === 'en_cours' ? { ouvertes: 1 } : { statut: 'payee,annulee' };
    return { tables: [] as DiningTable[], orders: (await api.page<Order>(`${base}/commandes`, { ...query, par_page: 50 })).donnees };
  }, [base, view]);

  return (
    <Screen
      title="Commandes"
      scroll={false}
      right={
        withTables && view === 'salle' && can('tables.gerer') ? (
          <Pressable onPress={() => setManageOpen(true)} hitSlop={10} accessibilityLabel="Gérer les tables">
            <Ionicons name="settings-outline" size={21} color={C.white} />
          </Pressable>
        ) : undefined
      }>
      <View style={styles.top}>
        {withTables && <Chip label="Salle" active={view === 'salle'} onPress={() => setView('salle')} />}
        <Chip label="En cours" active={view === 'en_cours'} onPress={() => setView('en_cours')} />
        <Chip label="Terminées" active={view === 'terminees'} onPress={() => setView('terminees')} />
      </View>

      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.primary} colors={[C.primary]} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}

        {data && view === 'salle' && (
          data.tables.length === 0 ? (
            <EmptyState icon="grid-outline" title="Aucune table" message={can('tables.gerer') ? 'Ajoutez vos tables avec la roue crantée en haut à droite.' : undefined} />
          ) : (
            <View style={styles.grid}>
              {data.tables.map((t) => (
                <TableCard key={t.id} table={t} />
              ))}
            </View>
          )
        )}

        {data && view !== 'salle' && (
          data.orders.length === 0 ? (
            <EmptyState icon="receipt-outline" title={view === 'en_cours' ? 'Aucune commande en cours' : 'Aucune commande terminée'} />
          ) : (
            data.orders.map((o) => <OrderRow key={o.id} order={o} />)
          )
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {can('commandes.creer') && <Fab icon="add" onPress={() => router.push('/commandes/nouvelle')} />}

      {withTables && <ManageTables visible={manageOpen} onClose={() => setManageOpen(false)} onChanged={reload} />}
    </Screen>
  );
}

function TableCard({ table: t }: { table: DiningTable }) {
  const order = t.commande;
  return (
    <Pressable
      onPress={() => (order ? router.push({ pathname: '/commandes/[id]', params: { id: order.id } }) : router.push({ pathname: '/commandes/nouvelle', params: { type: 'sur_place', table_id: t.id } }))}
      style={({ pressed }) => [styles.table, t.occupee ? styles.tableBusy : styles.tableFree, pressed && { opacity: 0.8 }]}>
      <View style={styles.tableHead}>
        <Text style={[styles.tableName, t.occupee && { color: C.white }]}>{t.nom}</Text>
        {t.capacite ? (
          <Text style={[styles.tableCap, t.occupee && { color: 'rgba(255,255,255,0.8)' }]}>
            <Ionicons name="people" size={11} /> {t.capacite}
          </Text>
        ) : null}
      </View>
      {order ? (
        <>
          <Text style={styles.tableTotal}>{formatMoney(order.total)}</Text>
          <Text style={styles.tableMeta}>
            {statusLabel(order.statut, 'sur_place').label} · depuis {formatTime(order.ouverte_le)}
          </Text>
        </>
      ) : (
        <Text style={styles.tableFreeText}>Libre · toucher pour commander</Text>
      )}
    </Pressable>
  );
}

function OrderRow({ order: o }: { order: Order }) {
  const status = statusLabel(o.statut, o.type);
  const type = ORDER_TYPES[o.type];
  return (
    <Pressable onPress={() => router.push({ pathname: '/commandes/[id]', params: { id: o.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.background }]}>
      <View style={styles.typeIcon}>
        <Ionicons name={type.icon} size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {o.table?.nom ?? o.nom_client ?? type.label}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {o.reference} · {type.label}
          {o.date_promise ? ` · pour le ${formatDate(o.date_promise)}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text style={styles.rowTotal}>{formatMoney(o.total)}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
    </Pressable>
  );
}

/** Ajout et désactivation des tables (permission tables.gerer). */
function ManageTables({ visible, onClose, onChanged }: { visible: boolean; onClose: () => void; onChanged: () => void }) {
  const base = useStorePath();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: tables, reload } = useApi(() => api.get<DiningTable[]>(`${base}/tables`), [base, visible]);

  async function add() {
    setSaving(true);
    try {
      await api.post(`${base}/tables`, { nom: name.trim(), capacite: capacity.trim() ? Number(capacity) : null });
      setName('');
      setCapacity('');
      await reload();
      onChanged();
    } catch (e) {
      notify('Ajout impossible', (e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: DiningTable, actif: boolean) {
    try {
      await api.put(`${base}/tables/${t.id}`, { actif });
      await reload();
      onChanged();
    } catch (e) {
      notify('Modification impossible', (e as ApiError).message);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Tables de la salle">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 2 }}>
          <Field label="Nouvelle table" value={name} onChangeText={setName} placeholder="Ex : Table 5, Terrasse 2" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Places" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="4" />
        </View>
      </View>
      <Button title="Ajouter la table" icon="add" onPress={add} loading={saving} disabled={!name.trim()} />
      {(tables ?? []).map((t) => (
        <ToggleRow key={t.id} label={t.nom} description={t.occupee ? 'Occupée en ce moment' : t.actif ? 'Active' : 'Désactivée'} value={t.actif} onValueChange={(v) => toggle(t, v)} />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  table: { width: '48%', flexGrow: 1, minHeight: 104, borderRadius: R.lg, padding: 14, gap: 6, borderWidth: 1.5 },
  tableFree: { backgroundColor: C.white, borderColor: C.success, borderStyle: 'dashed' },
  tableBusy: { backgroundColor: C.primary, borderColor: C.primary },
  tableHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableName: { fontSize: 16, fontWeight: '800', color: C.text },
  tableCap: { fontSize: 11, color: C.textMuted },
  tableTotal: { fontSize: 18, fontWeight: '800', color: C.white },
  tableMeta: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  tableFreeText: { fontSize: 12, color: C.success, fontWeight: '600', marginTop: 'auto' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  typeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  rowMeta: { fontSize: 12, color: C.textMuted },
  rowTotal: { fontSize: 15, fontWeight: '800', color: C.text },
});
