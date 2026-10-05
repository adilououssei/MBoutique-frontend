import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip, EmptyState, ErrorBox, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { cleanNumberInput, formatMoney, formatQty, toNumber } from '@/lib/format';
import type { CashRegister, Customer, PricingMode, Product, Sale, Service } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { usePagedList } from '@/lib/use-paged-list';

/** Une ligne du panier : un produit (avec son mode détail/gros) ou un service. */
type Line =
  | { kind: 'produit'; product: Product; mode: PricingMode; qty: number; discount: string }
  | { kind: 'service'; service: Service; qty: number; discount: string };

const lineName = (l: Line) => (l.kind === 'produit' ? l.product.nom : l.service.nom);
const lineKey = (l: Line) => (l.kind === 'produit' ? `p-${l.product.id}-${l.mode}` : `s-${l.service.id}`);
const unitPrice = (l: Line) => (l.kind === 'service' ? toNumber(l.service.prix) : toNumber(l.mode === 'detail' ? l.product.prix_detail : l.product.prix_gros));
const lineGross = (l: Line) => unitPrice(l) * l.qty;
const lineDiscount = (l: Line) => toNumber(cleanNumberInput(l.discount));
const lineNet = (l: Line) => lineGross(l) - lineDiscount(l);
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Point de vente : panier local puis POST /ventes/encaisser (espèces). */
export default function NouvelleVente() {
  // Arrivée depuis un rendez-vous : prestation et client pré-remplis.
  const params = useLocalSearchParams<{ service_id?: string; client_id?: string; rendez_vous_id?: string }>();
  const { hasFeature, can } = useAuth();
  const base = useStorePath();
  const insets = useSafeAreaInsets();
  const withServices = hasFeature('services');
  const withProducts = hasFeature('produits');
  const [tab, setTab] = useState<'produits' | 'services'>(withProducts && !params.service_id ? 'produits' : 'services');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(params.client_id ? Number(params.client_id) : null);
  const [discount, setDiscount] = useState('');
  const [received, setReceived] = useState('');
  // Vente à crédit : l'acompte entre en caisse, le reste va au compte du client.
  const [payMode, setPayMode] = useState<'especes' | 'credit'>('especes');
  const [deposit, setDeposit] = useState('');
  const canCredit = hasFeature('clients') && can('credits.gerer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Une même tentative d'encaissement garde sa clé : un double appui ou une
  // relance après coupure réseau ne crée pas deux ventes (idempotence backend).
  const idempotencyKey = useRef(newKey());

  const products = usePagedList<Product>(tab === 'produits' ? `${base}/produits` : null, { recherche: search, actif: true }, 30);
  const services = usePagedList<Service>(tab === 'services' ? `${base}/services` : null, { recherche: search, actif: true }, 30);
  const list = tab === 'produits' ? products : services;
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
  }, [cart, customerId, discount, registerId, payMode, deposit]);

  useEffect(() => {
    if (!params.service_id) return;
    api
      .get<Service>(`${base}/services/${params.service_id}`)
      .then((service) => setCart((c) => (c.some((l) => l.kind === 'service' && l.service.id === service.id) ? c : [...c, { kind: 'service', service, qty: 1, discount: '' }])))
      .catch(() => {});
  }, [base, params.service_id]);

  function addProduct(product: Product) {
    const mode: PricingMode = product.vente_detail_active ? 'detail' : 'gros';
    setCart((c) => {
      const i = c.findIndex((l) => l.kind === 'produit' && l.product.id === product.id && l.mode === mode);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { kind: 'produit', product, mode, qty: 1, discount: '' }];
    });
  }

  function addService(service: Service) {
    setCart((c) => {
      const i = c.findIndex((l) => l.kind === 'service' && l.service.id === service.id);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { kind: 'service', service, qty: 1, discount: '' }];
    });
  }

  const update = (i: number, patch: Partial<{ mode: PricingMode; qty: number; discount: string }>) =>
    setCart((c) => c.map((l, j) => (j === i ? ({ ...l, ...patch } as Line) : l)));
  const removeLine = (i: number) => setCart((c) => c.filter((_, j) => j !== i));

  const subtotal = cart.reduce((s, l) => s + lineNet(l), 0);
  const discountValue = toNumber(cleanNumberInput(discount));
  const total = Math.max(0, subtotal - discountValue);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const change = toNumber(cleanNumberInput(received)) - total;
  const invalidLine = cart.find((l) => lineDiscount(l) > lineGross(l));
  const onCredit = payMode === 'credit';
  const depositValue = toNumber(cleanNumberInput(deposit));
  const owed = Math.max(0, total - depositValue);
  const creditBlocked = onCredit && (!customerId || depositValue > total);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  async function checkout() {
    if (!activeRegisterId) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post<Sale>(`${base}/ventes/encaisser`, {
        caisse_id: activeRegisterId,
        client_id: customerId,
        mode_paiement: payMode,
        acompte: onCredit ? depositValue : null,
        montant_remise: discountValue > 0 ? discountValue : null,
        cle_idempotence: idempotencyKey.current,
        lignes: cart.map((l) => {
          const remise = lineDiscount(l) > 0 ? lineDiscount(l) : null;
          return l.kind === 'produit'
            ? { produit_id: l.product.id, mode_prix: l.mode, quantite: l.qty, remise }
            : { service_id: l.service.id, quantite: l.qty, remise };
        }),
      });
      setCheckoutOpen(false);
      if (params.rendez_vous_id) {
        // La vente est faite : le rendez-vous passe à « terminé » et la référence.
        await api.post(`${base}/rendez-vous/${params.rendez_vous_id}/statut`, { statut: 'termine', vente_id: data.id }).catch(() => {});
      }
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
        {withProducts && withServices && (
          <View style={styles.tabs}>
            <Chip label="Produits" active={tab === 'produits'} onPress={() => setTab('produits')} />
            <Chip label="Services" active={tab === 'services'} onPress={() => setTab('services')} />
          </View>
        )}
        <SearchBar value={search} onChangeText={setSearch} placeholder={tab === 'produits' ? 'Rechercher un produit...' : 'Rechercher un service...'} />
      </View>

      {list.loading ? (
        <Loading />
      ) : tab === 'produits' ? (
        <FlatList
          data={products.items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          onEndReached={products.loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={products.error ? <ErrorBox message={products.error} onRetry={products.reload} /> : null}
          ListFooterComponent={products.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={<EmptyState icon="search-outline" title="Aucun produit" />}
          renderItem={({ item }) => {
            const inCart = cart.filter((l) => l.kind === 'produit' && l.product.id === item.id).reduce((s, l) => s + l.qty, 0);
            const sellable = item.vente_detail_active || item.vente_gros_active;
            return (
              <CatalogRow
                name={item.nom}
                thumb={<Thumb name={item.nom} size={46} uri={item.image_url} />}
                price={[item.vente_detail_active ? formatMoney(item.prix_detail) : '', item.vente_gros_active ? `Gros ${formatMoney(item.prix_gros)}` : ''].filter(Boolean).join('  ·  ')}
                inCart={inCart}
                disabled={!sellable}
                onPress={() => addProduct(item)}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={services.items}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          onEndReached={services.loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={services.error ? <ErrorBox message={services.error} onRetry={services.reload} /> : null}
          ListFooterComponent={services.loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={<EmptyState icon="construct-outline" title="Aucun service" message="Ajoutez vos prestations depuis Plus → Services." />}
          renderItem={({ item }) => (
            <CatalogRow
              name={item.nom}
              thumb={<Thumb name={item.nom} size={46} icon="construct" />}
              price={`${formatMoney(item.prix)}${item.duree_minutes ? `  ·  ${item.duree_minutes} min` : ''}`}
              inCart={cart.filter((l) => l.kind === 'service' && l.service.id === item.id).reduce((s, l) => s + l.qty, 0)}
              onPress={() => addService(item)}
            />
          )}
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
          <Button title="Encaisser" onPress={() => setCheckoutOpen(true)} style={{ flex: 1, maxWidth: 170 }} disabled={!!invalidLine} />
        </View>
      )}

      <Sheet visible={cartOpen} onClose={() => setCartOpen(false)} title={`Panier (${cart.length})`}>
        {cart.map((l, i) => {
          const tooMuch = lineDiscount(l) > lineGross(l);
          return (
            <View key={lineKey(l)} style={styles.line}>
              <View style={styles.lineHead}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {lineName(l)}
                </Text>
                <Pressable onPress={() => removeLine(i)} hitSlop={8} accessibilityLabel="Retirer">
                  <Ionicons name="trash-outline" size={18} color={C.danger} />
                </Pressable>
              </View>
              <View style={styles.lineBody}>
                {l.kind === 'produit' && l.product.vente_detail_active && l.product.vente_gros_active ? (
                  <View style={styles.modes}>
                    {(['detail', 'gros'] as const).map((m) => (
                      <Pressable key={m} onPress={() => update(i, { mode: m })} style={[styles.mode, l.mode === m && styles.modeActive]}>
                        <Text style={[styles.modeText, l.mode === m && { color: C.white }]}>{m === 'detail' ? 'Détail' : 'Gros'}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.meta}>{l.kind === 'service' ? 'Service' : l.mode === 'detail' ? 'Détail' : 'Gros'}</Text>
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
              <View style={styles.discountRow}>
                <Ionicons name="pricetag-outline" size={16} color={C.textMuted} />
                <Text style={styles.meta}>Remise</Text>
                <TextInput
                  value={l.discount}
                  onChangeText={(v) => update(i, { discount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textLight}
                  style={[styles.discountInput, tooMuch && { borderColor: C.danger }, { outlineStyle: 'none' } as object]}
                />
                <Text style={styles.meta}>FCFA</Text>
              </View>
              {tooMuch ? (
                <Text style={styles.lineError}>La remise dépasse le montant de la ligne ({formatMoney(lineGross(l))}).</Text>
              ) : (
                <Text style={styles.lineTotal}>
                  {formatQty(l.qty)} × {formatMoney(unitPrice(l))}
                  {lineDiscount(l) > 0 ? ` − ${formatMoney(lineDiscount(l))}` : ''} = <Text style={{ color: C.text, fontWeight: '800' }}>{formatMoney(lineNet(l))}</Text>
                </Text>
              )}
            </View>
          );
        })}
        <Button
          title="Passer à l'encaissement"
          onPress={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          disabled={cart.length === 0 || !!invalidLine}
        />
      </Sheet>

      <Sheet visible={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Encaissement">
        {error && <ErrorBox message={error.code === 'VALIDATION_ECHOUEE' ? (Object.values(error.erreurs)[0]?.[0] ?? error.message) : error.message} />}
        {canCredit && (
          <View style={styles.tabs}>
            <Chip label="Espèces" active={!onCredit} onPress={() => setPayMode('especes')} />
            <Chip label="À crédit" active={onCredit} onPress={() => setPayMode('credit')} />
          </View>
        )}
        {hasFeature('clients') && (
          <SelectField
            label="Client"
            required={onCredit}
            placeholder={onCredit ? 'Choisir le client' : 'Client de passage'}
            value={onCredit ? customerId : (customerId ?? 0)}
            onChange={(v) => setCustomerId(v === 0 ? null : v)}
            options={[
              ...(onCredit ? [] : [{ value: 0, label: 'Client de passage' }]),
              ...customers.map((c) => ({
                value: c.id,
                label: c.nom,
                description: toNumber(c.solde) > 0 ? `Doit déjà ${formatMoney(c.solde)}` : (c.telephone ?? undefined),
              })),
            ]}
            error={error?.field('client_id')}
          />
        )}
        {onCredit && !customerId && <Text style={styles.creditHelp}>Une vente à crédit doit être attribuée à un client.</Text>}
        <Field label="Remise globale" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" suffix="FCFA" error={error?.field('montant_remise')} />
        {onCredit ? (
          <Field
            label="Acompte payé maintenant"
            value={deposit}
            onChangeText={setDeposit}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="FCFA"
            error={depositValue > total ? "L'acompte dépasse le total." : error?.field('acompte')}
          />
        ) : (
          <Field label="Montant reçu" value={received} onChangeText={setReceived} keyboardType="decimal-pad" placeholder="Pour calculer la monnaie" suffix="FCFA" />
        )}
        <View style={styles.summary}>
          <Row label="Sous-total" value={formatMoney(subtotal)} />
          {discountValue > 0 && <Row label="Remise globale" value={`− ${formatMoney(discountValue)}`} />}
          <Row label="Total" value={formatMoney(total)} strong />
          {onCredit ? (
            <>
              <Row label="Acompte (en caisse)" value={formatMoney(depositValue)} />
              <Row label="Reste à crédit" value={formatMoney(owed)} color={C.danger} strong />
              {selectedCustomer && toNumber(selectedCustomer.solde) > 0 && (
                <Row label="Nouvelle dette du client" value={formatMoney(toNumber(selectedCustomer.solde) + owed)} />
              )}
            </>
          ) : (
            received.trim() !== '' && <Row label="Monnaie à rendre" value={change >= 0 ? formatMoney(change) : `Manque ${formatMoney(-change)}`} color={change >= 0 ? C.success : C.danger} />
          )}
        </View>
        {!canCredit && <Text style={styles.cash}>Paiement en espèces</Text>}
        <Button
          title={onCredit ? `Valider · ${formatMoney(owed)} à crédit` : `Encaisser ${formatMoney(total)}`}
          onPress={checkout}
          loading={saving}
          disabled={!activeRegisterId || !!invalidLine || creditBlocked}
        />
      </Sheet>
    </Screen>
  );
}

function CatalogRow({ name, thumb, price, inCart, disabled, onPress }: { name: string; thumb: React.ReactNode; price: string; inCart: number; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.product, pressed && { backgroundColor: C.background }, disabled && { opacity: 0.5 }]}>
      {thumb}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.pPrice}>{price}</Text>
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
  creditHelp: { fontSize: 12, color: C.danger, marginTop: -6 },
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 120, flexGrow: 1 },
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
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountInput: { flex: 1, height: 36, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: C.text, textAlign: 'right' },
  lineTotal: { fontSize: 12, color: C.textMuted, textAlign: 'right' },
  lineError: { fontSize: 12, color: C.danger, textAlign: 'right' },
  summary: { backgroundColor: C.background, borderRadius: R.md, padding: 14, gap: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, color: C.textMuted },
  sumValue: { fontSize: 14, fontWeight: '700', color: C.text },
  cash: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
});
