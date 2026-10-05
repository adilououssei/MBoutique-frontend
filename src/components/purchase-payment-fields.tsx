import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/sheet';
import { C } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { api } from '@/lib/api';
import type { CashRegister } from '@/lib/types';

export type PaymentMode = 'credit' | 'caisse' | 'externe';

export type PaymentDraft = { mode: PaymentMode; amount: string; registerId: number | null; note: string };

/**
 * Choix du règlement d'un achat : à crédit, sorti de la caisse (session
 * ouverte requise) ou payé hors caisse (banque, Mobile Money…).
 */
export function PurchasePaymentFields({
  value,
  onChange,
  allowCredit,
  error,
}: {
  value: PaymentDraft;
  onChange: (next: PaymentDraft) => void;
  allowCredit: boolean;
  error?: string;
}) {
  const { hasFeature } = useAuth();
  const base = useStorePath();
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const withCash = hasFeature('caisse');

  useEffect(() => {
    if (!withCash) return;
    api
      .page<CashRegister>(`${base}/caisses`, { actif: true, par_page: 100 })
      .then((r) => setRegisters(r.donnees.filter((c) => c.est_ouverte)))
      .catch(() => setRegisters([]));
  }, [base, withCash]);

  const set = (patch: Partial<PaymentDraft>) => onChange({ ...value, ...patch });

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.modes}>
        {allowCredit && <Chip label="À crédit" active={value.mode === 'credit'} onPress={() => set({ mode: 'credit' })} />}
        {withCash && <Chip label="Payé en caisse" active={value.mode === 'caisse'} onPress={() => set({ mode: 'caisse', registerId: value.registerId ?? registers[0]?.id ?? null })} />}
        <Chip label="Payé hors caisse" active={value.mode === 'externe'} onPress={() => set({ mode: 'externe' })} />
      </View>

      {value.mode === 'credit' && <Text style={styles.help}>Rien n’est payé maintenant : le montant s’ajoute à ce que vous devez au fournisseur.</Text>}

      {value.mode === 'caisse' &&
        (registers.length === 0 ? (
          <Text style={[styles.help, { color: C.danger }]}>Aucune caisse ouverte : ouvrez une session de caisse ou choisissez « Payé hors caisse ».</Text>
        ) : (
          <SelectField label="Caisse" required value={value.registerId} onChange={(registerId) => set({ registerId })} options={registers.map((r) => ({ value: r.id, label: r.nom }))} />
        ))}

      {value.mode === 'externe' && <Text style={styles.help}>Payé par banque, Mobile Money ou autre : la caisse n’est pas touchée.</Text>}

      {value.mode !== 'credit' && (
        <>
          <Field label="Montant réglé" required value={value.amount} onChangeText={(amount) => set({ amount })} keyboardType="decimal-pad" suffix="FCFA" error={error} />
          <Field label="Note" value={value.note} onChangeText={(note) => set({ note })} placeholder="Optionnel (n° de transaction…)" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  help: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
});
