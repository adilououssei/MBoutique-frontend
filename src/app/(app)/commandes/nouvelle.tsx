import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CatalogPicker, type PickedItem } from '@/components/catalog-picker';
import { DayStrip } from '@/components/day-strip';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBox } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { addDays, dayKey, toIso } from '@/lib/agenda';
import { api, ApiError } from '@/lib/api';
import { formatMoney, formatQty } from '@/lib/format';
import { ORDER_TYPES } from '@/lib/orders';
import type { Customer, DiningTable, Order, OrderType } from '@/lib/types';

type Line = PickedItem & { qty: number; note: string };

export default function NouvelleCommande() {
  const params = useLocalSearchParams<{ type?: OrderType; table_id?: string }>();
  const { hasFeature } = useAuth();
  const base = useStorePath();
  const withTables = hasFeature('tables');

  // Types proposés selon le métier : salle pour un restaurant, dépôt pour un atelier/pressing.
  const types: OrderType[] = [...(withTables ? (['sur_place'] as const) : []), 'a_emporter', 'livraison', ...(hasFeature('services') ? (['depot'] as const) : [])];
  const [type, setType] = useState<OrderType>(params.type ?? types[0]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [tableId, setTableId] = useState<number | null>(params.table_id ? Number(params.table_id) : null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [clientId, setClientId] = useState<number>(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [promiseDay, setPromiseDay] = useState(addDays(dayKey(new Date()), 2));
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (withTables) api.get<DiningTable[]>(`${base}/tables`, { actif: true }).then(setTables).catch(() => {});
    if (hasFeature('clients')) api.page<Customer>(`${base}/clients`, { actif: true, par_page: 100 }).then((r) => setCustomers(r.donnees)).catch(() => {});
  }, [base, withTables, hasFeature]);

  function pick(item: PickedItem) {
    setLines((current) => {
      const i = current.findIndex((l) => l.kind === item.kind && l.id === item.id);
      return i >= 0 ? current.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l)) : [...current, { ...item, qty: 1, note: '' }];
    });
    setPickerOpen(false);
  }

  const update = (i: number, patch: Partial<Line>) => setLines((c) => c.map((l, j) => (j === i ? ({ ...l, ...patch } as Line) : l)));
  const total = lines.reduce((s, l) => s + l.prix * l.qty, 0);
  const freeTables = tables.filter((t) => !t.occupee || t.id === tableId);
  const needsTable = type === 'sur_place' && !tableId;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post<Order>(`${base}/commandes`, {
        type,
        table_id: type === 'sur_place' ? tableId : null,
        client_id: clientId || null,
        nom_client: clientId ? null : name.trim() || null,
        telephone_client: clientId ? null : phone.trim() || null,
        adresse_livraison: type === 'livraison' ? address.trim() || null : null,
        date_promise: type === 'depot' ? toIso(promiseDay, '17:00') : null,
        note: note.trim() || null,
        lignes: lines.map((l) =>
          l.kind === 'produit' ? { produit_id: l.id, mode_prix: l.mode, quantite: l.qty, note: l.note.trim() || null } : { service_id: l.id, quantite: l.qty, note: l.note.trim() || null },
        ),
      });
      router.replace({ pathname: '/commandes/[id]', params: { id: data.id } });
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Nouvelle commande" footer={<Button title={`Envoyer la commande · ${formatMoney(total)}`} onPress={submit} loading={saving} disabled={lines.length === 0 || needsTable} />}>
      {error && <ErrorBox message={error.code === 'VALIDATION_ECHOUEE' ? (Object.values(error.erreurs)[0]?.[0] ?? error.message) : error.message} />}

      <View style={styles.types}>
        {types.map((t) => (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.type, type === t && styles.typeActive]}>
            <Ionicons name={ORDER_TYPES[t].icon} size={20} color={type === t ? C.white : C.primary} />
            <Text style={[styles.typeText, type === t && { color: C.white }]}>{ORDER_TYPES[t].label}</Text>
          </Pressable>
        ))}
      </View>

      {type === 'sur_place' && (
        <SelectField label="Table" required placeholder="Choisir une table libre" value={tableId} onChange={setTableId} options={freeTables.map((t) => ({ value: t.id, label: t.nom, description: t.capacite ? `${t.capacite} places` : undefined }))} />
      )}

      {customers.length > 0 && (
        <SelectField label="Client" value={clientId} onChange={setClientId} options={[{ value: 0, label: 'Non enregistré' }, ...customers.map((c) => ({ value: c.id, label: c.nom, description: c.telephone ?? undefined }))]} />
      )}
      {!clientId && type !== 'sur_place' && (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Nom du client" value={name} onChangeText={setName} placeholder={type === 'depot' ? 'Pour le ticket' : 'Optionnel'} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optionnel" />
          </View>
        </View>
      )}
      {type === 'livraison' && <Field label="Adresse de livraison" value={address} onChangeText={setAddress} placeholder="Quartier, repère…" />}
      {type === 'depot' && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>À retirer le</Text>
          <DayStrip value={promiseDay} onChange={setPromiseDay} />
        </View>
      )}

      <Text style={styles.section}>Articles</Text>
      {lines.length === 0 && <EmptyState icon="fast-food-outline" title="Aucun article" message="Ajoutez les plats, produits ou prestations." />}
      {lines.map((l, i) => (
        <View key={`${l.kind}-${l.id}`} style={styles.line}>
          <View style={styles.lineHead}>
            <Text style={styles.lineName} numberOfLines={1}>
              {l.nom}
            </Text>
            <Text style={styles.linePrice}>{formatMoney(l.prix * l.qty)}</Text>
          </View>
          <View style={styles.lineBody}>
            <TextInput
              value={l.note}
              onChangeText={(v) => update(i, { note: v })}
              placeholder={l.kind === 'service' ? 'Précision (ex : tache, retouche)' : 'Note (ex : sans piment)'}
              placeholderTextColor={C.textLight}
              style={[styles.note, { outlineStyle: 'none' } as object]}
            />
            <View style={styles.stepper}>
              <Pressable onPress={() => (l.qty > 1 ? update(i, { qty: l.qty - 1 }) : setLines((c) => c.filter((_, j) => j !== i)))} style={styles.step} hitSlop={6}>
                <Ionicons name={l.qty > 1 ? 'remove' : 'trash-outline'} size={16} color={l.qty > 1 ? C.text : C.danger} />
              </Pressable>
              <Text style={styles.qty}>{formatQty(l.qty)}</Text>
              <Pressable onPress={() => update(i, { qty: l.qty + 1 })} style={styles.step} hitSlop={6}>
                <Ionicons name="add" size={16} color={C.text} />
              </Pressable>
            </View>
          </View>
        </View>
      ))}
      <Button title="Ajouter un article" icon="add-circle-outline" variant="outline" onPress={() => setPickerOpen(true)} />

      <Field label="Note pour la commande" value={note} onChangeText={setNote} placeholder="Optionnel" multiline />

      <CatalogPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={pick} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  typeActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeText: { fontSize: 14, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, color: C.text, fontWeight: '500' },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  line: { borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: 12, gap: 8 },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  linePrice: { fontSize: 14, fontWeight: '800', color: C.text },
  lineBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { flex: 1, height: 36, borderRadius: 8, backgroundColor: C.background, paddingHorizontal: 10, fontSize: 13, color: C.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 15, fontWeight: '800', color: C.text, minWidth: 22, textAlign: 'center' },
});
