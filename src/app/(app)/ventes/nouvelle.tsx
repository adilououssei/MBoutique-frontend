import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBox, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { cleanNumberInput, formatMoney, formatQty, toNumber } from '@/lib/format';
import type { CashRegister, Customer, PricingMode, Product, Sale } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { usePagedList } from '@/lib/use-paged-list';

type Line = { product: Product; mode: PricingMode; qty: number };

const unitPrice = (l: Line) => toNumber(l.mode === 'detail' ? l.product.prix_detail : l.product.prix_gros);
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Point de vente : panier local puis POST /ventes/encaisser (espèces). */
export default function NouvelleVente() {
  const { hasFeature } = useAuth();
  const base = useStorePath();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [discount, setDiscount] = useState('');
  const [received, setReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Une même tentative d'encaissement garde sa clé : un double appui ou une
  // relance après coupure réseau ne crée pas deux ventes (idempotence backend).
  const idempotencyKey = useRef(newKey());

  const products = usePagedList<Product>(`${base}/produits`, { recherche: search, actif: true }, 30);
  const { data: registers, loading: loadingRegisters } = useApi(() => api.page<CashRegister>(`${base}/caisses`, { actif: true, par_page: 100 }).then((r) => r.donnees), [base]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const openRegisters = useMemo(() => registers?.filter((r) => r.est_ouverte) ?? [], [registers]);

  // Par défaut, la première caisse ouverte.
  const activeRegisterId = registerId ?? openRegisters[0]?.id ?? null;

  useEffect(() => {
    if (!hasFeature('clients')) return;
    api.page<Customer>(`${base}/clients`, { actif: true, par_page: 100 }).then((r) => setCustomers(r.donnees)).catch(() => {});
  }, [base, hasFeature]);

  useEffect(() => {
    idempotencyKey.current = newKey();
  }, [cart, customerId, discount, registerId]);

  function add(product: Product) {
    const mode: PricingMode = product.vente_detail_active ? 'detail' : 'gros';
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === product.id && l.mode === mode);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { product, mode, qty: 1 }];
    });
  }

  const update = (i: number, patch: Partial<Line>) => setCart((c) => c.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setCart((c) => c.filter((_, j) => j !== i));

  const subtotal = cart.reduce((s, l) => s + unitPrice(l) * l.qty, 0);
  const discountValue = toNumber(cleanNumberInput(discount));
  const total = Math.max(0, subtotal - discountValue);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const change = toNumber(cleanNumberInput(received)) - total;

  async function checkout() {
    if (!activeRegisterId) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post<Sale>(`${base}/ventes/encaisser`, {
        caisse_id: activeRegisterId,
        client_id: customerId,
        mode_paiement: 'especes',
        montant_remise: discountValue > 0 ? discountValue : null,
        cle_idempotence: idempotencyKey.current,
        lignes: cart.map((l) => ({ produit_id: l.product.id, mode_prix: l.mode, quantite: l.qty })),
      });
      setCheckoutOpen(false);
      router.replace({ pathname: '/ventes/[id]', params: { id: data.id, nouvelle: '1' } });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Encaissement impossible.', 0));
    } finally {
      setSaving(false);
    }
  }

  if (loadingRegisters && !registers) {
    return (
      <Screen title="Nouvelle vente">
        <Loading />
      </Screen>
    );
  }

  if (hasFeature('caisse') && registers && openRegisters.length === 0) {
    return (
      <Screen title="Nouvelle vente">
        <EmptyState
          icon="lock-closed-outline"
          title="Aucune caisse ouverte"
          message="Une vente est encaissée dans une caisse : ouvrez une session de caisse avant de vendre."
          action={<Button title="Aller à la caisse" icon="calculator" onPress={() => router.replace('/caisse')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Nouvelle vente" scroll={false}>
      <View style={styles.top}>
        {openRegisters.length > 1 && (
          <SelectField label="Caisse" value={activeRegisterId} onChange={setRegisterId} options={openRegisters.map((r) => ({ value: r.id, label: r.nom }))} />
        )}
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." />
      </View>

      {products.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={products.items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, flexGrow: 1 }}
          onEndReached={products.loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={products.error ? <ErrorBox message={products.error} onRetry={products.reload} /> : null}
          ListFooterComponent={products.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={<EmptyState icon="search-outline" title="Aucun produit" />}
          renderItem={({ item }) => {
            const inCart = cart.filter((l) => l.product.id === item.id).reduce((s, l) => s + l.qty, 0);
            const sellable = item.vente_detail_active || item.vente_gros_active;
            return (
              <Pressable onPress={() => sellable && add(item)} disabled={!sellable} style={({ pressed }) => [styles.product, pressed && { backgroundColor: C.background }, !sellable && { opacity: 0.5 }]}>
                <Thumb name={item.nom} size={46} uri={item.image_url} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.pName} numberOfLines={1}>
                    {item.nom}
                  </Text>
                  <Text style={styles.pPrice}>
                    {item.vente_detail_active ? formatMoney(item.prix_detail) : ''}
                    {item.vente_detail_active && item.vente_gros_active ? '  ·  ' : ''}
                    {item.vente_gros_active ? `Gros ${formatMoney(item.prix_gros)}` : ''}
                  </Text>
                </View>
                {inCart > 0 ? (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{formatQty(inCart)}</Text>
                  </View>
                ) : (
                  <Ionicons name="add-circle" size={30} color={C.primary} />
                )}
              </Pressable>
            );
          }}
        />
      )}

      {cart.length > 0 && (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          <Pressable style={styles.barInfo} onPress={() => setCartOpen(true)}>
            <View style={styles.cartIcon}>
              <Ionicons name="cart" size={20} color={C.white} />
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{formatQty(count)}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.barLabel}>Panier · voir le détail</Text>
              <Text style={styles.barTotal}>{formatMoney(subtotal)}</Text>
            </View>
          </Pressable>
          <Button title="Encaisser" onPress={() => setCheckoutOpen(true)} style={{ flex: 1, maxWidth: 170 }} />
        </View>
      )}

      <Sheet visible={cartOpen} onClose={() => setCartOpen(false)} title={`Panier (${cart.length})`}>
        {cart.map((l, i) => (
          <View key={`${l.product.id}-${l.mode}`} style={styles.line}>
            <View style={styles.lineHead}>
              <Text style={styles.lineName} numberOfLines={1}>
                {l.product.nom}
              </Text>
              <Pressable onPress={() => removeLine(i)} hitSlop={8} accessibilityLabel="Retirer">
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </Pressable>
            </View>
            <View style={styles.lineBody}>
              {l.product.vente_detail_active && l.product.vente_gros_active ? (
                <View style={styles.modes}>
                  {(['detail', 'gros'] as const).map((m) => (
                    <Pressable key={m} onPress={() => update(i, { mode: m })} style={[styles.mode, l.mode === m && styles.modeActive]}>
                      <Text style={[styles.modeText, l.mode === m && { color: C.white }]}>{m === 'detail' ? 'Détail' : 'Gros'}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.meta}>{l.mode === 'detail' ? 'Détail' : 'Gros'}</Text>
              )}
              <View style={styles.stepper}>
                <Pressable onPress={() => (l.qty > 1 ? update(i, { qty: l.qty - 1 }) : removeLine(i))} style={styles.step} hitSlop={6}>
                  <Ionicons name="remove" size={18} color={C.text} />
                </Pressable>
                <Text style={styles.stepQty}>{formatQty(l.qty)}</Text>
                <Pressable onPress={() => update(i, { qty: l.qty + 1 })} style={styles.step} hitSlop={6}>
                  <Ionicons name="add" size={18} color={C.text} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.lineTotal}>
              {formatQty(l.qty)} × {formatMoney(unitPrice(l))} = <Text style={{ color: C.text, fontWeight: '800' }}>{formatMoney(unitPrice(l) * l.qty)}</Text>
            </Text>
          </View>
        ))}
        <Button
          title="Passer à l'encaissement"
          onPress={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          disabled={cart.length === 0}
        />
      </Sheet>

      <Sheet visible={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Encaissement">
        {error && <ErrorBox message={error.code === 'VALIDATION_ECHOUEE' ? Object.values(error.erreurs)[0]?.[0] ?? error.message : error.message} />}
        {hasFeature('clients') && (
          <SelectField
            label="Client"
            placeholder="Client de passage"
            value={customerId ?? 0}
            onChange={(v) => setCustomerId(v === 0 ? null : v)}
            options={[{ value: 0, label: 'Client de passage' }, ...customers.map((c) => ({ value: c.id, label: c.nom, description: c.telephone ?? undefined }))]}
          />
        )}
        <Field label="Remise" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" suffix="FCFA" error={error?.field('montant_remise')} />
        <Field label="Montant reçu" value={received} onChangeText={setReceived} keyboardType="decimal-pad" placeholder="Pour calculer la monnaie" suffix="FCFA" />
        <View style={styles.summary}>
          <Row label="Sous-total" value={formatMoney(subtotal)} />
          {discountValue > 0 && <Row label="Remise" value={`− ${formatMoney(discountValue)}`} />}
          <Row label="Total à payer" value={formatMoney(total)} strong />
          {received.trim() !== '' && <Row label="Monnaie à rendre" value={change >= 0 ? formatMoney(change) : `Manque ${formatMoney(-change)}`} color={change >= 0 ? C.success : C.danger} />}
        </View>
        <Text style={styles.cash}>Paiement en espèces</Text>
        <Button title={`Encaisser ${formatMoney(total)}`} onPress={checkout} loading={saving} disabled={!activeRegisterId} />
      </Sheet>
    </Screen>
  );
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, strong && { color: C.text, fontWeight: '800', fontSize: 15 }]}>{label}</Text>
      <Text style={[styles.sumValue, strong && { fontSize: 18, color: C.primary }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 12 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  pName: { fontSize: 15, fontWeight: '700', color: C.text },
  pPrice: { fontSize: 12, color: C.textMuted },
  qtyBadge: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  qtyBadgeText: { color: C.white, fontWeight: '800', fontSize: 13 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.dark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  barInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  cartCount: { position: 'absolute', top: -6, right: -6, backgroundColor: C.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartCountText: { color: C.white, fontSize: 11, fontWeight: '800' },
  barLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  barTotal: { color: C.white, fontSize: 18, fontWeight: '800' },
  line: { borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: 12, gap: 10 },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineName: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  lineBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modes: { flexDirection: 'row', backgroundColor: C.background, borderRadius: 10, padding: 3 },
  mode: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  modeActive: { backgroundColor: C.primary },
  modeText: { fontSize: 13, fontWeight: '700', color: C.text },
  meta: { fontSize: 13, color: C.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepQty: { fontSize: 16, fontWeight: '800', color: C.text, minWidth: 28, textAlign: 'center' },
  lineTotal: { fontSize: 12, color: C.textMuted, textAlign: 'right' },
  summary: { backgroundColor: C.background, borderRadius: R.md, padding: 14, gap: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, color: C.textMuted },
  sumValue: { fontSize: 14, fontWeight: '700', color: C.text },
  cash: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
});
