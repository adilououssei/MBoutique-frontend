import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StockMovementRow } from '@/components/movement-row';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, ErrorBox, Loading, Thumb } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { cleanNumberInput, formatQty, toNumber, unitShort } from '@/lib/format';
import type { Product, Stock, StockMovement, StockMovementType } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const MANUAL_TYPES: { value: StockMovementType; label: string; description: string; permission: string }[] = [
  { value: 'achat', label: 'Achat / réapprovisionnement', description: 'Ajoute la quantité reçue au stock.', permission: 'stock.ajuster' },
  { value: 'retour', label: 'Retour client', description: 'Remet en stock un article rendu.', permission: 'stock.ajuster' },
  { value: 'ajustement_entree', label: 'Ajustement (+)', description: 'Correction à la hausse.', permission: 'stock.ajuster' },
  { value: 'ajustement_sortie', label: 'Ajustement (−)', description: 'Correction à la baisse.', permission: 'stock.ajuster' },
  { value: 'perte', label: 'Perte / casse', description: 'Retire un article abîmé ou perdu.', permission: 'stock.ajuster' },
  { value: 'inventaire', label: 'Inventaire', description: 'Saisissez la quantité réellement comptée.', permission: 'stock.inventorier' },
];

export default function GestionStock() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const [minimumDraft, setMinimum] = useState<string | null>(null);
  const [savingMin, setSavingMin] = useState(false);
  const [sheet, setSheet] = useState<'init' | 'mouvement' | null>(null);
  const [type, setType] = useState<StockMovementType>('achat');
  const [qty, setQty] = useState('');
  const [initMin, setInitMin] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);

  const { data, error, loading, reload, refreshing } = useApi(async () => {
    // Le produit est rechargé à part : la ressource Stock ne charge pas sa catégorie.
    const [stock, product, movements] = await Promise.all([
      api.get<Stock>(`${base}/stocks/${id}`),
      api.get<Product>(`${base}/produits/${id}`),
      api.page<StockMovement>(`${base}/stocks/${id}/mouvements`, { par_page: 5 }),
    ]);
    return { stock: { ...stock, produit: product }, movements: movements.donnees, total: movements.meta.total };
  }, [base, id]);

  const stock = data?.stock;
  const initialized = !!stock?.cree_le;
  const unit = unitShort(stock?.produit.unite);

  // Tant que l'utilisateur n'a rien saisi, on affiche la valeur du serveur.
  const serverMinimum = stock?.quantite_minimum != null ? String(toNumber(stock.quantite_minimum)) : '';
  const minimum = minimumDraft ?? serverMinimum;
  const minChanged = !!stock && minimum !== serverMinimum;

  async function saveMinimum() {
    setSavingMin(true);
    try {
      await api.put(`${base}/stocks/${id}`, { quantite_minimum: minimum.trim() ? cleanNumberInput(minimum) : null });
      await reload();
      setMinimum(null);
    } catch (e) {
      notify('Enregistrement impossible', (e as ApiError).message);
    } finally {
      setSavingMin(false);
    }
  }

  function openSheet(kind: 'init' | 'mouvement') {
    setQty('');
    setReason('');
    setInitMin('');
    setFormError(null);
    setType(can('stock.ajuster') ? 'achat' : 'inventaire');
    setSheet(kind);
  }

  async function submitMovement() {
    setSaving(true);
    setFormError(null);
    const payload: Record<string, unknown> =
      sheet === 'init'
        ? { type: 'initial', quantite: cleanNumberInput(qty), quantite_minimum: initMin.trim() ? cleanNumberInput(initMin) : null }
        : type === 'inventaire'
          ? { type, quantite_comptee: cleanNumberInput(qty) }
          : { type, quantite: cleanNumberInput(qty) };
    if (reason.trim()) payload.motif = reason.trim();
    try {
      await api.post(`${base}/stocks/${id}/mouvements`, payload);
      setSheet(null);
      await reload();
    } catch (e) {
      setFormError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  const types = MANUAL_TYPES.filter((t) => can(t.permission));

  return (
    <Screen
      title="Gestion du stock"
      refreshing={refreshing}
      onRefresh={reload}
      footer={
        initialized && data && data.total > 0 ? (
          <Button title="Historique complet" onPress={() => router.push({ pathname: '/stock/[id]/historique', params: { id } })} />
        ) : undefined
      }>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {stock && (
        <>
          <View style={styles.head}>
            <Thumb name={stock.produit.nom} size={60} uri={stock.produit.image_url} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{stock.produit.nom}</Text>
              <Text style={styles.cat}>{stock.produit.categorie?.nom ?? 'Sans catégorie'}</Text>
            </View>
          </View>

          {!initialized ? (
            <Card style={{ gap: 12 }}>
              <EmptyState icon="cube-outline" title="Stock non initialisé" message="Saisissez la quantité actuellement disponible pour commencer à suivre ce produit." />
              {can('stock.ajuster') && <Button title="Initialiser le stock" onPress={() => openSheet('init')} />}
            </Card>
          ) : (
            <>
              <Card style={styles.current}>
                <Text style={styles.label}>Stock actuel</Text>
                <View style={styles.currentRow}>
                  <Text style={[styles.big, { color: toNumber(stock.quantite) <= 0 ? C.danger : stock.stock_faible ? C.warning : C.success }]}>{formatQty(stock.quantite)}</Text>
                  <Text style={styles.unit}>{unit}</Text>
                </View>
              </Card>

              <Card style={{ gap: 10 }}>
                <Field label="Stock minimum" required value={minimum} onChangeText={setMinimum} keyboardType="decimal-pad" suffix={unit} placeholder="Seuil d'alerte" editable={can('stock.ajuster')} />
                {minChanged && can('stock.ajuster') && <Button title="Enregistrer le seuil" small onPress={saveMinimum} loading={savingMin} />}
              </Card>

              {types.length > 0 && <Button title="Nouveau mouvement" icon="swap-vertical" variant="outline" onPress={() => openSheet('mouvement')} />}

              <Text style={styles.section}>Historique des mouvements</Text>
              <Card style={{ paddingVertical: 0 }}>
                {data.movements.length === 0 ? <Text style={styles.none}>Aucun mouvement.</Text> : data.movements.map((m) => <StockMovementRow key={m.id} m={m} />)}
              </Card>
            </>
          )}
        </>
      )}

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'init' ? 'Initialiser le stock' : 'Nouveau mouvement'}>
        {formError && Object.keys(formError.erreurs).length === 0 && <ErrorBox message={formError.message} />}
        {sheet === 'mouvement' && <SelectField label="Type de mouvement" value={type} onChange={setType} options={types.map((t) => ({ value: t.value, label: t.label, description: t.description }))} />}
        <Field
          label={sheet === 'mouvement' && type === 'inventaire' ? 'Quantité comptée' : sheet === 'init' ? 'Quantité en stock' : 'Quantité'}
          required
          value={qty}
          onChangeText={setQty}
          keyboardType="decimal-pad"
          suffix={unit}
          autoFocus
          error={formError?.field('quantite') ?? formError?.field('quantite_comptee')}
        />
        {sheet === 'init' && <Field label="Stock minimum" value={initMin} onChangeText={setInitMin} keyboardType="decimal-pad" suffix={unit} placeholder="Seuil d'alerte (optionnel)" error={formError?.field('quantite_minimum')} />}
        <Field label="Motif" value={reason} onChangeText={setReason} placeholder="Optionnel" error={formError?.field('motif')} />
        <Button title="Enregistrer" onPress={submitMovement} loading={saving} disabled={!qty.trim()} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 18, fontWeight: '800', color: C.text },
  cat: { fontSize: 13, color: C.textMuted, marginTop: 3 },
  current: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.text },
  currentRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  big: { fontSize: 32, fontWeight: '800' },
  unit: { fontSize: 12, color: C.textMuted, marginBottom: 6 },
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  none: { color: C.textMuted, fontSize: 13, paddingVertical: 16, textAlign: 'center' },
});
