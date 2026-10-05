import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PurchasePaymentFields, type PaymentDraft } from '@/components/purchase-payment-fields';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBox, SearchBar, Thumb, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { cleanNumberInput, formatMoney, toNumber, unitShort } from '@/lib/format';
import type { Product, Purchase, Supplier } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

type Line = { product: Product; qty: string; cost: string };

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const lineTotal = (l: Line) => toNumber(cleanNumberInput(l.qty)) * toNumber(cleanNumberInput(l.cost));

/** Réception de marchandise : entre en stock, met à jour les prix d'achat, règle ou non. */
export default function NouvelAchat() {
  const params = useLocalSearchParams<{ fournisseur_id?: string }>();
  const base = useStorePath();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number>(params.fournisseur_id ? Number(params.fournisseur_id) : 0);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [updateCosts, setUpdateCosts] = useState(true);
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentDraft>({ mode: 'credit', amount: '', registerId: null, note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Une même tentative garde sa clé : un double appui ne crée pas deux achats.
  const idempotencyKey = useRef(newKey());

  const products = usePagedList<Product>(pickerOpen ? `${base}/produits` : null, { recherche: search, actif: true }, 30);

  useEffect(() => {
    api.page<Supplier>(`${base}/fournisseurs`, { actif: true, par_page: 100 }).then((r) => setSuppliers(r.donnees)).catch(() => {});
  }, [base]);

  useEffect(() => {
    idempotencyKey.current = newKey();
  }, [lines, supplierId, payment, updateCosts, note]);

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  function addProduct(product: Product) {
    setLines((current) =>
      current.some((l) => l.product.id === product.id)
        ? current
        : [...current, { product, qty: '1', cost: product.prix_achat != null ? String(toNumber(product.prix_achat)) : '' }],
    );
    setPickerOpen(false);
    setSearch('');
  }

  const update = (i: number, patch: Partial<Line>) => setLines((c) => c.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => setLines((c) => c.filter((_, j) => j !== i));

  const linesValid = lines.length > 0 && lines.every((l) => toNumber(cleanNumberInput(l.qty)) > 0 && l.cost.trim() !== '');
  const paidAmount = toNumber(cleanNumberInput(payment.amount));
  const paymentValid = payment.mode === 'credit' || (paidAmount > 0 && paidAmount <= total && (payment.mode !== 'caisse' || !!payment.registerId));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post<Purchase>(`${base}/achats`, {
        fournisseur_id: supplierId || null,
        lignes: lines.map((l) => ({ produit_id: l.product.id, quantite: cleanNumberInput(l.qty), cout_unitaire: cleanNumberInput(l.cost) })),
        mettre_a_jour_prix_achat: updateCosts,
        note: note.trim() || null,
        paiement:
          payment.mode === 'credit'
            ? null
            : { montant: cleanNumberInput(payment.amount), mode: payment.mode, caisse_id: payment.mode === 'caisse' ? payment.registerId : null },
        cle_idempotence: idempotencyKey.current,
      });
      router.replace({ pathname: '/achats/[id]', params: { id: data.id, nouveau: '1' } });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Enregistrement impossible.', 0));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Nouvel achat"
      footer={<Button title={`Enregistrer l'achat · ${formatMoney(total)}`} onPress={submit} loading={saving} disabled={!linesValid || !paymentValid} />}>
      {error && <ErrorBox message={error.code === 'VALIDATION_ECHOUEE' ? (Object.values(error.erreurs)[0]?.[0] ?? error.message) : error.message} />}

      <SelectField
        label="Fournisseur"
        value={supplierId}
        onChange={setSupplierId}
        options={[{ value: 0, label: 'Sans fournisseur' }, ...suppliers.map((s) => ({ value: s.id, label: s.nom, description: s.telephone ?? undefined }))]}
        footer={<Button title="Nouveau fournisseur" icon="add" variant="outline" onPress={() => router.push('/fournisseurs/formulaire')} />}
      />

      <Text style={styles.section}>Marchandise reçue</Text>
      {lines.length === 0 && <EmptyState icon="cube-outline" title="Aucun produit" message="Ajoutez les produits livrés, avec la quantité et le coût unitaire." />}
      {lines.map((l, i) => (
        <View key={l.product.id} style={styles.line}>
          <View style={styles.lineHead}>
            <Thumb name={l.product.nom} size={36} uri={l.product.image_url} />
            <Text style={styles.lineName} numberOfLines={1}>
              {l.product.nom}
            </Text>
            <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityLabel="Retirer">
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </Pressable>
          </View>
          <View style={styles.inputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Quantité ({unitShort(l.product.unite)})</Text>
              <TextInput value={l.qty} onChangeText={(qty) => update(i, { qty })} keyboardType="decimal-pad" style={[styles.input, { outlineStyle: 'none' } as object]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Coût unitaire (FCFA)</Text>
              <TextInput value={l.cost} onChangeText={(cost) => update(i, { cost })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textLight} style={[styles.input, { outlineStyle: 'none' } as object]} />
            </View>
          </View>
          <Text style={styles.lineTotal}>
            Total : <Text style={{ color: C.text, fontWeight: '800' }}>{formatMoney(lineTotal(l))}</Text>
          </Text>
        </View>
      ))}
      <Button title="Ajouter un produit" icon="add-circle-outline" variant="outline" onPress={() => setPickerOpen(true)} />

      <ToggleRow label="Mettre à jour le prix d'achat" description="Le coût saisi devient le prix d'achat du produit (marges plus justes dans les rapports)." value={updateCosts} onValueChange={setUpdateCosts} />

      <Text style={styles.section}>Règlement</Text>
      <PurchasePaymentFields
        value={payment}
        onChange={(next) => setPayment(next.mode !== payment.mode && next.mode !== 'credit' && !next.amount ? { ...next, amount: String(total) } : next)}
        allowCredit
        error={paidAmount > total ? 'Le montant réglé dépasse le total de l’achat.' : error?.field('paiement.montant')}
      />

      <Field label="Note" value={note} onChangeText={setNote} placeholder="N° de bon de livraison, remarque…" multiline />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total de l&apos;achat</Text>
        <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
      </View>

      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Ajouter un produit">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." />
        {products.loading ? (
          <ActivityIndicator color={C.primary} style={{ margin: 16 }} />
        ) : products.items.length === 0 ? (
          <Text style={styles.none}>Aucun produit.</Text>
        ) : (
          products.items.map((p) => {
            const added = lines.some((l) => l.product.id === p.id);
            return (
              <Pressable key={p.id} onPress={() => addProduct(p)} disabled={added} style={[styles.pick, added && { opacity: 0.45 }]}>
                <Thumb name={p.nom} size={40} uri={p.image_url} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{p.nom}</Text>
                  <Text style={styles.inputLabel}>{p.prix_achat != null ? `Dernier coût : ${formatMoney(p.prix_achat)}` : 'Pas encore de prix d’achat'}</Text>
                </View>
                <Ionicons name={added ? 'checkmark-circle' : 'add-circle'} size={26} color={C.primary} />
              </Pressable>
            );
          })
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  line: { borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: 12, gap: 10 },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  inputs: { flexDirection: 'row', gap: 10 },
  inputLabel: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  input: { height: 42, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: C.text },
  lineTotal: { fontSize: 12, color: C.textMuted, textAlign: 'right' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.background, borderRadius: R.md, padding: 14 },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  summaryValue: { fontSize: 20, fontWeight: '800', color: C.primary },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  none: { textAlign: 'center', color: C.textMuted, padding: 16 },
});
