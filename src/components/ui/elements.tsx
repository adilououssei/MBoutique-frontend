import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, R } from '@/constants/colors';
import { initials } from '@/lib/format';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { backgroundColor: C.background }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Pastille ronde orange dégradée avec pictogramme blanc (cartes de la maquette). */
export function IconCircle({ name, size = 52, colors = [C.primaryDeep, '#FF8A3D'] }: { name: IconName; size?: number; colors?: [string, string] }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.46} color={C.white} />
    </LinearGradient>
  );
}

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: C.successSoft, fg: C.success },
  warning: { bg: C.warningSoft, fg: '#E0701A' },
  danger: { bg: C.dangerSoft, fg: C.danger },
  neutral: { bg: C.infoSoft, fg: C.info },
  primary: { bg: C.primarySoft, fg: C.primary },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Vignette produit : la photo si elle existe, sinon les initiales (ou une icône). */
export function Thumb({ name, size = 52, icon, uri }: { name: string; size?: number; icon?: IconName; uri?: string | null }) {
  const box = { width: size, height: size, borderRadius: size * 0.24 };
  if (uri) {
    return <Image source={{ uri }} style={[box, styles.thumbImage]} contentFit="cover" transition={150} accessibilityLabel={name} />;
  }
  return (
    <View style={[styles.thumb, box]}>
      {icon ? <Ionicons name={icon} size={size * 0.45} color={C.primary} /> : <Text style={[styles.thumbText, { fontSize: size * 0.34 }]}>{initials(name)}</Text>}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder, right }: { value: string; onChangeText: (t: string) => void; placeholder: string; right?: ReactNode }) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={C.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textLight}
          style={[styles.searchInput, { outlineStyle: 'none' } as any]}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={C.textLight} />
          </Pressable>
        )}
      </View>
      {right}
    </View>
  );
}

export function SquareButton({ icon, onPress, active }: { icon: IconName; onPress?: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.square, active && { borderColor: C.primary, backgroundColor: C.primarySoft }]}>
      <Ionicons name={icon} size={19} color={active ? C.primary : C.text} />
    </Pressable>
  );
}

export function ToggleRow({ label, value, onValueChange, description }: { label: string; value: boolean; onValueChange: (v: boolean) => void; description?: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description && <Text style={styles.muted}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: C.border, true: C.primary }}
        thumbColor={C.white}
        ios_backgroundColor={C.border}
        // react-native-web applique sinon une pastille turquoise quand le switch est actif.
        {...({ activeThumbColor: C.white } as object)}
      />
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {action}
    </View>
  );
}

export function InfoRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? <Text style={[styles.infoValue, strong && { fontWeight: '800' }]}>{value}</Text> : value}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, action }: { icon?: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={C.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMsg}>{message}</Text>}
      {action}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={20} color={C.danger} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={styles.retry}>Réessayer</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Fab({ onPress, icon = 'add' }: { onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]} accessibilityRole="button" accessibilityLabel="Ajouter">
      <Ionicons name={icon} size={28} color={C.white} />
    </Pressable>
  );
}

export const text = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: C.text },
  h2: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { fontSize: 14, color: C.text },
  muted: { fontSize: 13, color: C.textMuted },
  small: { fontSize: 12, color: C.textMuted },
});

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 16 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  thumb: { backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  thumbText: { color: C.primary, fontWeight: '800' },
  thumbImage: { backgroundColor: C.background },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, justifyContent: 'center' },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: R.md, backgroundColor: C.background, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  square: { width: 46, height: 46, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  muted: { fontSize: 12, color: C.textMuted },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 15, fontWeight: '700', color: C.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, gap: 12 },
  infoLabel: { fontSize: 14, color: C.textMuted },
  infoValue: { fontSize: 14, color: C.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
  emptyMsg: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: R.md, backgroundColor: C.dangerSoft },
  errorText: { flex: 1, fontSize: 13, color: C.danger },
  retry: { fontSize: 13, fontWeight: '700', color: C.danger },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
