import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState, ErrorBox, Loading, SearchBar, Thumb } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField, Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useStorePath } from '@/context/auth';
import { api, ApiError } from '@/lib/api';
import { cleanNumberInput, formatQty, toNumber, unitShort } from '@/lib/format';
import type { Stock, StockTransfer } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { usePagedList } from '@/lib/use-paged-list';

type Line = { stock: Stock; qty: string };

/** Envoi de marchandise vers une autre boutique de l'entreprise (sortie ici, entrée là-bas). */
export default function NouveauTransfert() {
  const base = useStorePath();
  const { data: destinations, loading: loadingDestinations } = useApi(() => api.get<{ id: number; nom: string }[]>(`${base}/transferts/destinations`), [base]);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Seuls les produits dont le stock est suivi ici peuvent partir.
  const stocks = usePagedList<Stock>(pickerOpen ? `${base}/stocks` : null, { recherche: search }, 30);
  const activeDestination = destinationId ?? (destinations?.length === 1 ? destinations[0].id : null);

  function addStock(stock: Stock) {
    setLines((current) => (current.some((l) => l.stock.produit.id === stock.produit.id) ? current : [...current, { stock, qty: '1' }]));
    setPickerOpen(false);
    setSearch('');
  }

  const update = (i: number, qty: string) => setLines((c) => c.map((l, j) => (j === i ? { ...l, qty } : l)));
  const remove = (i: number) => setLines((c) => c.filter((_, j) => j !== i));
  const tooMuch = (l: Line) => toNumber(cleanNumberInput(l.qty)) > toNumber(l.stock.quantite);
  const linesValid = lines.length > 0 && lines.every((l) => toNumber(cleanNumberInput(l.qty)) > 0 && !tooMuch(l));

  async function submit() {
    if (!activeDestination) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post<StockTransfer>(`${base}/transferts`, {
        boutique_destination_id: activeDestination,
        lignes: lines.map((l) => ({ produit_id: l.stock.produit.id, quantite: cleanNumberInput(l.qty) })),
        note: note.trim() || null,
      });
      router.replace({ pathname: '/transferts/[id]', params: { id: data.id, nouveau: '1' } });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Transfert impossible.', 0));
    } finally {
      setSaving(false);
    }
  }

  if (loadingDestinations && !destinations) {
    return (
      <Screen title="Nouveau transfert">
        <Loading />
      </Screen>
    );
  }

  if (destinations && destinations.length === 0) {
    return (
      <Screen title="Nouveau transfert">
        <EmptyState
          icon="storefront-outline"
          title="Aucune boutique de destination"
          message="Il faut une autre boutique dans votre entreprise, avec le suivi de stock activé, où vous pouvez ajuster le stock."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Nouveau transfert"
      footer={<Button title="Envoyer la marchandise" icon="paper-plane-outline" onPress={submit} loading={saving} disabled={!activeDestination || !linesValid} />}>
      {error && <ErrorBox message={error.code === 'VALIDATION_ECHOUEE' ? (Object.values(error.erreurs)[0]?.[0] ?? error.message) : error.message} />}

      <SelectField
        label="Boutique de destination"
        required
        value={activeDestination}
        onChange={setDestinationId}
        options={(destinations ?? []).map((d) => ({ value: d.id, label: d.nom }))}
      />

      <Text style={styles.section}>Marchandise envoyée</Text>
      {lines.length === 0 && <EmptyState icon="cube-outline" title="Aucun produit" message="Ajoutez les produits à envoyer et leur quantité." />}
      {lines.map((l, i) => (
        <View key={l.stock.produit.id} style={styles.line}>
          <View style={styles.lineHead}>
            <Thumb name={l.stock.produit.nom} size={36} uri={l.stock.produit.image_url} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lineName} numberOfLines={1}>
                {l.stock.produit.nom}
              </Text>
              <Text style={styles.inputLabel}>
                Disponible : {formatQty(l.stock.quantite)} {unitShort(l.stock.produit.unite)}
              </Text>
            </View>
            <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityLabel="Retirer">
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </Pressable>
          </View>
          <View>
            <Text style={styles.inputLabel}>Quantité à envoyer</Text>
            <TextInput
              value={l.qty}
              onChangeText={(qty) => update(i, qty)}
              keyboardType="decimal-pad"
              style={[styles.input, tooMuch(l) && { borderColor: C.danger }, { outlineStyle: 'none' } as object]}
            />
            {tooMuch(l) && <Text style={styles.lineError}>Plus que le stock disponible.</Text>}
          </View>
        </View>
      ))}
      <Button title="Ajouter un produit" icon="add-circle-outline" variant="outline" onPress={() => setPickerOpen(true)} />

      <Field label="Note" value={note} onChangeText={setNote} placeholder="Réassort, bon de sortie…" multiline />
      <Text style={styles.help}>Les produits absents de la boutique de destination y sont créés automatiquement (même nom, prix et code), sans photo.</Text>

      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Ajouter un produit">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." />
        {stocks.loading ? (
          <ActivityIndicator color={C.primary} style={{ margin: 16 }} />
        ) : stocks.items.length === 0 ? (
          <Text style={styles.none}>Aucun produit en stock.</Text>
        ) : (
          stocks.items.map((s) => {
            const added = lines.some((l) => l.stock.produit.id === s.produit.id);
            const empty = toNumber(s.quantite) <= 0;
            return (
              <Pressable key={s.produit.id} onPress={() => addStock(s)} disabled={added || empty} style={[styles.pick, (added || empty) && { opacity: 0.45 }]}>
                <Thumb name={s.produit.nom} size={40} uri={s.produit.image_url} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{s.produit.nom}</Text>
                  <Text style={styles.inputLabel}>
                    En stock : {formatQty(s.quantite)} {unitShort(s.produit.unite)}
                  </Text>
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
  lineName: { fontSize: 15, fontWeight: '700', color: C.text },
  inputLabel: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  input: { height: 42, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, color: C.text },
  lineError: { fontSize: 12, color: C.danger, marginTop: 4 },
  help: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  none: { textAlign: 'center', color: C.textMuted, padding: 16 },
});
