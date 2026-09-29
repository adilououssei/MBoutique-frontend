import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { goBack } from '@/lib/navigation';

/** En-tête de marque + feuille blanche pour les écrans hors application. */
export function AuthShell({ title, subtitle, back, children }: { title: string; subtitle: string; back?: boolean; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        {back && (
          <Pressable onPress={() => goBack('/connexion')} hitSlop={12} style={styles.back} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>
        )}
        <View style={styles.brandRow}>
          <Image source={require('@/assets/images/logo-fond-noir.png')} style={styles.logo} contentFit="contain" accessibilityLabel="M Boutique" />
        </View>
      </View>
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={{ gap: 16, marginTop: 8 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.dark },
  header: { paddingHorizontal: 20, paddingBottom: 44, alignItems: 'center' },
  back: { position: 'absolute', left: 20, bottom: 58 },
  brandRow: { alignItems: 'center', marginTop: 8 },
  logo: { width: 150, height: 117 },
  sheet: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 },
  content: { padding: 24, gap: 6 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 14, color: C.textMuted, marginBottom: 8 },
});
