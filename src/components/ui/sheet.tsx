import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, R } from '@/constants/colors';

import { FieldLabel, fieldStyles } from './field';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * Position (écran) du haut du clavier, ou null s'il est fermé.
 * iOS : événements « will » pour suivre l'animation ; Android : « did ».
 */
function useKeyboardTop(): number | null {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setTop(e.endCoordinates.screenY));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return top;
}

/**
 * Feuille modale qui monte depuis le bas de l'écran.
 *
 * Le décalage clavier est calculé à la main : sur Android en bord à bord
 * (SDK 57), la fenêtre d'un Modal n'est plus redimensionnée à l'ouverture du
 * clavier, qui recouvrait alors la feuille — la saisie partait dans un champ
 * caché. On mesure le recouvrement réel (hauteur du Modal − haut du clavier) :
 * si le système a déjà redimensionné, il vaut 0 et rien n'est décalé deux fois.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardTop = useKeyboardTop();
  const [height, setHeight] = useState(0);
  const overlap = keyboardTop !== null && height > 0 ? Math.max(0, height - keyboardTop) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.overlay} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: overlap > 0 ? overlap + 12 : Math.max(insets.bottom, 16) + 4,
              maxHeight: height > 0 ? height - insets.top - 24 : '85%',
            },
          ]}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={C.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type Option<T> = { value: T; label: string; description?: string };

type SelectProps<T> = {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: T | null | undefined;
  options: Option<T>[];
  onChange: (value: T) => void;
  error?: string;
  footer?: ReactNode;
};

export function SelectField<T extends string | number>({ label, required, placeholder = 'Sélectionner', value, options, onChange, error, footer }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 7 }}>
      {label && <FieldLabel label={label} required={required} />}
      <Pressable style={[fieldStyles.box, !!error && { borderColor: C.danger }]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={[styles.value, !selected && { color: C.textLight }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.text} />
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        {options.length === 0 && <Text style={styles.empty}>Aucune option disponible.</Text>}
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, active && { color: C.primary }]}>{o.label}</Text>
                {o.description && <Text style={styles.optionDesc}>{o.description}</Text>}
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
            </Pressable>
          );
        })}
        {footer}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,26,38,0.45)' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  value: { flex: 1, fontSize: 15, color: C.text },
  error: { fontSize: 12, color: C.danger },
  empty: { color: C.textMuted, textAlign: 'center', paddingVertical: 20 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  optionText: { fontSize: 15, fontWeight: '600', color: C.text },
  optionDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
});
