import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth } from '@/context/auth';
import { ROLE_LABELS } from '@/lib/permissions';

/** Pastille « Ma Boutique ▾ » du tableau de bord : change de boutique courante. */
export function StoreSwitcher() {
  const { store, stores, selectStore } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.pill} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Changer de boutique">
        <Ionicons name="storefront-outline" size={16} color={C.white} />
        <Text style={styles.pillText} numberOfLines={1}>
          {store?.nom ?? 'Ma Boutique'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.white} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Mes boutiques">
        {stores.map((s) => {
          const active = s.id === store?.id;
          return (
            <Pressable
              key={s.id}
              style={[styles.item, active && styles.itemActive]}
              onPress={async () => {
                setOpen(false);
                if (!active) await selectStore(s);
              }}>
              <View style={styles.itemIcon}>
                <Ionicons name="storefront" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{s.nom}</Text>
                <Text style={styles.itemMeta}>
                  {s.domaine_activite?.nom ?? '—'}
                  {s.mon_role ? ` · ${ROLE_LABELS[s.mon_role]}` : ''}
                </Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
            </Pressable>
          );
        })}
        <Button
          title="Nouvelle boutique"
          icon="add"
          variant="outline"
          onPress={() => {
            setOpen(false);
            router.push('/boutiques/nouvelle');
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: R.sm,
    paddingHorizontal: 12,
    height: 36,
    maxWidth: 240,
  },
  pillText: { color: C.white, fontWeight: '600', fontSize: 13, flexShrink: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  itemActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  itemIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  itemName: { fontSize: 15, fontWeight: '700', color: C.text },
  itemMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
});
