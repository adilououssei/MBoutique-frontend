import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { applyPhotoChoice, ProductPhotoPicker, type PhotoChoice } from '@/components/product-photo-picker';
import { Button } from '@/components/ui/button';
import { Card, ErrorBox, ToggleRow } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/dialog';
import { cleanNumberInput, UNITS } from '@/lib/format';
import type { Category, Product, ProductUnit } from '@/lib/types';

export type ProductDraft = {
  nom: string;
  description: string;
  categorie_id: number | null;
  unite: ProductUnit;
  prix_achat: string;
  sku: string;
  code_barres: string;
  vente_detail_active: boolean;
  prix_detail: string;
  vente_gros_active: boolean;
  prix_gros: string;
  actif: boolean;
  stock_initial: string;
  stock_minimum: string;
};

export function draftFrom(p?: Partial<Product> & { nom?: string }): ProductDraft {
  const str = (v: unknown) => {
    const n = parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? String(n) : '';
  };
  return {
    nom: p?.nom ?? '',
    description: p?.description ?? '',
    categorie_id: p?.categorie?.id ?? null,
    unite: p?.unite ?? 'piece',
    prix_achat: str(p?.prix_achat),
    sku: p?.sku ?? '',
    code_barres: p?.code_barres ?? '',
    vente_detail_active: p?.vente_detail_active ?? true,
    prix_detail: str(p?.prix_detail),
    vente_gros_active: p?.vente_gros_active ?? false,
    prix_gros: str(p?.prix_gros),
    actif: p?.actif ?? true,
    stock_initial: '',
    stock_minimum: '',
  };
}

type Props = {
  initial: ProductDraft;
  product?: Product;
  submitLabel: string;
  onSaved: (product: Product, message: string | null) => void;
};

/**
 * Formulaire unique création/modification — mêmes règles que ProductRules
 * côté backend (prix requis exactement quand le mode de vente est actif).
 */
export function ProductForm({ initial, product, submitLabel, onSaved }: Props) {
  const { hasFeature, can } = useAuth();
  const base = useStorePath();
  const editing = !!product;
  const [d, setD] = useState<ProductDraft>(initial);
  const [categories, setCategories] = useState<Category[]>([]);
  const [more, setMore] = useState(editing && !!(initial.sku || initial.code_barres || initial.prix_achat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [photo, setPhoto] = useState<PhotoChoice>({ kind: 'keep' });

  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const withCategories = hasFeature('categories');
  const withStock = !editing && hasFeature('stock') && can('stock.ajuster');

  useEffect(() => {
    if (!withCategories) return;
    api.page<Category>(`${base}/categories`, { par_page: 100, actif: true }).then((r) => setCategories(r.donnees)).catch(() => {});
  }, [base, withCategories]);

  async function createCategory() {
    setCatSaving(true);
    try {
      const { data } = await api.post<Category>(`${base}/categories`, { nom: newCat.trim() });
      setCategories((c) => [...c, data].sort((a, b) => a.nom.localeCompare(b.nom)));
      set('categorie_id', data.id);
      setNewCat('');
      setCatOpen(false);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setCatSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const num = (v: string) => (v.trim() === '' ? null : cleanNumberInput(v));
    const payload: Record<string, unknown> = {
      nom: d.nom.trim(),
      description: d.description.trim() || null,
      categorie_id: d.categorie_id,
      unite: d.unite,
      prix_achat: num(d.prix_achat),
      sku: d.sku.trim() || null,
      code_barres: d.code_barres.trim() || null,
      vente_detail_active: d.vente_detail_active,
      prix_detail: d.vente_detail_active ? num(d.prix_detail) : null,
      vente_gros_active: d.vente_gros_active,
      prix_gros: d.vente_gros_active ? num(d.prix_gros) : null,
      actif: d.actif,
    };
    try {
      const { data, message } = editing ? await api.put<Product>(`${base}/produits/${product.id}`, payload) : await api.post<Product>(`${base}/produits`, payload);

      if (withStock && d.stock_initial.trim() !== '') {
        try {
          await api.post(`${base}/stocks/${data.id}/mouvements`, {
            type: 'initial',
            quantite: cleanNumberInput(d.stock_initial),
            quantite_minimum: d.stock_minimum.trim() ? cleanNumberInput(d.stock_minimum) : null,
            motif: 'Stock initial à la création',
          });
        } catch {
          // Le produit est créé ; le stock pourra être initialisé depuis « Gestion du stock ».
        }
      }

      // La photo est facultative et envoyée après coup : un échec ne doit pas
      // faire perdre le produit, déjà enregistré.
      let saved = data;
      try {
        saved = (await applyPhotoChoice(base, data, photo)) ?? data;
      } catch (e) {
        notify('Photo non enregistrée', `Le produit a bien été enregistré, mais la photo n'a pas pu être envoyée. ${(e as ApiError).message ?? ''}`.trim());
      }
      onSaved(saved, message);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Enregistrement impossible.', 0));
    } finally {
      setSaving(false);
    }
  }

  const generalError = error && Object.keys(error.erreurs).length === 0 ? error.message : null;
  const canSubmit = d.nom.trim() && (!d.vente_detail_active || d.prix_detail) && (!d.vente_gros_active || d.prix_gros);

  return (
    <View style={{ gap: 18 }}>
      {generalError && <ErrorBox message={generalError} />}

      <View style={styles.section}>
        {!editing && <Text style={styles.sectionTitle}>Informations générales</Text>}
        <Field label="Nom du produit" required value={d.nom} onChangeText={(v) => set('nom', v)} placeholder="Ex: Coca-Cola 50cl" error={error?.field('nom') ?? error?.field('slug')} />
        {withCategories && (
          <SelectField
            label="Catégorie"
            placeholder="Sélectionner une catégorie"
            value={d.categorie_id}
            onChange={(v) => set('categorie_id', v)}
            options={categories.map((c) => ({ value: c.id, label: c.nom }))}
            error={error?.field('categorie_id')}
            footer={can('categories.creer') ? <Button title="Nouvelle catégorie" icon="add" variant="outline" onPress={() => setCatOpen(true)} /> : undefined}
          />
        )}
        <Field label="Description" value={d.description} onChangeText={(v) => set('description', v)} placeholder="Description du produit (optionnel)" multiline />
      </View>

      <ProductPhotoPicker currentUrl={product?.image_url} value={photo} onChange={setPhoto} />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Modes de vente</Text>
        <ToggleRow label="Détail" value={d.vente_detail_active} onValueChange={(v) => set('vente_detail_active', v)} />
        <ToggleRow label="Gros" value={d.vente_gros_active} onValueChange={(v) => set('vente_gros_active', v)} />
      </Card>

      {(d.vente_detail_active || d.vente_gros_active) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prix</Text>
          <View style={styles.row}>
            {d.vente_detail_active && (
              <View style={{ flex: 1 }}>
                <Field label="Prix détail" required value={d.prix_detail} onChangeText={(v) => set('prix_detail', v)} keyboardType="decimal-pad" placeholder="0" suffix="FCFA" error={error?.field('prix_detail')} />
              </View>
            )}
            {d.vente_gros_active && (
              <View style={{ flex: 1 }}>
                <Field label="Prix gros" required value={d.prix_gros} onChangeText={(v) => set('prix_gros', v)} keyboardType="decimal-pad" placeholder="0" suffix="FCFA" error={error?.field('prix_gros')} />
              </View>
            )}
          </View>
        </View>
      )}

      {withStock && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Stock initial" value={d.stock_initial} onChangeText={(v) => set('stock_initial', v)} keyboardType="decimal-pad" placeholder="Optionnel" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Stock minimum" value={d.stock_minimum} onChangeText={(v) => set('stock_minimum', v)} keyboardType="decimal-pad" placeholder="Alerte" editable={d.stock_initial.trim() !== ''} />
            </View>
          </View>
        </View>
      )}

      <Pressable onPress={() => setMore((m) => !m)} style={styles.more}>
        <Text style={styles.moreText}>Plus d&apos;options</Text>
        <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={18} color={C.primary} />
      </Pressable>

      {more && (
        <View style={styles.section}>
          <SelectField label="Unité de vente" value={d.unite} onChange={(v) => set('unite', v)} options={UNITS.map((u) => ({ value: u.value, label: u.label }))} error={error?.field('unite')} />
          <Field label="Prix d'achat" value={d.prix_achat} onChangeText={(v) => set('prix_achat', v)} keyboardType="decimal-pad" placeholder="Optionnel" suffix="FCFA" error={error?.field('prix_achat')} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Code produit (SKU)" value={d.sku} onChangeText={(v) => set('sku', v)} autoCapitalize="characters" placeholder="PROD-001" error={error?.field('sku')} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Code-barres" value={d.code_barres} onChangeText={(v) => set('code_barres', v)} keyboardType="number-pad" placeholder="Optionnel" error={error?.field('code_barres')} />
            </View>
          </View>
          {editing && <ToggleRow label="Produit actif" description="Un produit inactif n'est plus proposé à la vente." value={d.actif} onValueChange={(v) => set('actif', v)} />}
        </View>
      )}

      <Button title={submitLabel} onPress={submit} loading={saving} disabled={!canSubmit} />

      <Sheet visible={catOpen} onClose={() => setCatOpen(false)} title="Nouvelle catégorie">
        <Field label="Nom de la catégorie" required value={newCat} onChangeText={setNewCat} placeholder="Ex : Boissons" autoFocus />
        <Button title="Créer la catégorie" onPress={createCategory} loading={catSaving} disabled={!newCat.trim()} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  card: { gap: 4 },
  row: { flexDirection: 'row', gap: 12 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  moreText: { color: C.primary, fontWeight: '700', fontSize: 14 },
});
