import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { goBack } from '@/lib/navigation';

type Props = {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  /** Remplace entièrement la barre de titre (ex : tableau de bord). */
  header?: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Gabarit commun de la maquette : bandeau bleu nuit en haut, puis une feuille
 * blanche aux coins supérieurs arrondis qui porte le contenu.
 */
export function Screen({ title, back = true, right, header, scroll = true, footer, refreshing, onRefresh, contentStyle, children }: Props) {
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} /> : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {header ?? (
          <View style={styles.titleRow}>
            {back && (
              <Pressable
                onPress={() => goBack('/accueil')}
                hitSlop={12}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Retour">
                <Ionicons name="arrow-back" size={22} color={C.white} />
              </Pressable>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {right}
          </View>
        )}
      </View>
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{footer}</View>}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.dark },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 32 },
  backBtn: { width: 28, alignItems: 'flex-start' },
  title: { flex: 1, color: C.white, fontSize: 19, fontWeight: '700' },
  sheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -16,
    overflow: 'hidden',
  },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
});
