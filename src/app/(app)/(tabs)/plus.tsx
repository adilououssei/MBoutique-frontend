import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, IconCircle, type IconName } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useAuth } from '@/context/auth';
import { confirm } from '@/lib/dialog';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';

type Item = { label: string; description: string; icon: IconName; href: Href; visible: boolean };

export default function Plus() {
  const { user, store, hasFeature, can, logout } = useAuth();

  const gestion: Item[] = [
    { label: 'Stock', description: 'Quantités, seuils et mouvements', icon: 'cube', href: '/stock', visible: hasFeature('stock') && can('stock.voir') },
    { label: 'Caisse', description: 'Sessions, entrées et sorties', icon: 'calculator', href: '/caisse', visible: hasFeature('caisse') && can('caisse.voir') },
    { label: 'Clients', description: 'Carnet de clients', icon: 'people', href: '/clients', visible: hasFeature('clients') && can('clients.voir') },
    { label: 'Catégories', description: 'Organisation du catalogue', icon: 'pricetags', href: '/categories', visible: hasFeature('categories') && can('categories.voir') },
    { label: 'Services', description: 'Prestations proposées', icon: 'construct', href: '/services', visible: hasFeature('services') && can('services.voir') },
  ];

  const compte: Item[] = [
    { label: 'Équipe', description: 'Membres de la boutique et rôles', icon: 'people-circle', href: '/membres', visible: can('membres.voir') },
    { label: 'Nouvelle boutique', description: 'Ajouter un point de vente', icon: 'storefront', href: '/boutiques/nouvelle', visible: true },
    { label: 'Mon profil', description: 'Informations et mot de passe', icon: 'person', href: '/profil', visible: true },
  ];

  async function signOut() {
    if (await confirm('Déconnexion', 'Voulez-vous vous déconnecter ?', 'Se déconnecter')) await logout();
  }

  return (
    <Screen title="Plus" back={false}>
      <Card style={styles.profile} onPress={() => router.push('/profil')}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.nom ?? '')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.nom}</Text>
          <Text style={styles.meta}>
            {store?.nom}
            {store?.mon_role ? ` · ${ROLE_LABELS[store.mon_role]}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </Card>

      <Section title="Gestion" items={gestion} />
      <Section title="Compte" items={compte} />

      <Pressable onPress={signOut} style={styles.logout}>
        <Ionicons name="log-out-outline" size={20} color={C.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </Screen>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  const visible = items.filter((i) => i.visible);
  if (!visible.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.group}>
        {visible.map((i, idx) => (
          <Pressable key={i.label} onPress={() => router.push(i.href)} style={({ pressed }) => [styles.item, idx > 0 && styles.itemBorder, pressed && { backgroundColor: C.background }]}>
            <IconCircle name={i.icon} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>{i.label}</Text>
              <Text style={styles.meta}>{i.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 17 },
  name: { fontSize: 16, fontWeight: '800', color: C.text },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  group: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: C.white },
  itemBorder: { borderTopWidth: 1, borderTopColor: C.border },
  itemLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: R.md, backgroundColor: C.dangerSoft },
  logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
});
