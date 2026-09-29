import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { C, R } from '@/constants/colors';

type Props = TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  suffix?: string;
  hint?: string;
  password?: boolean;
  left?: ReactNode;
};

export function Field({ label, required, error, suffix, hint, password, left, style, multiline, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      {label && <FieldLabel label={label} required={required} />}
      <View style={[styles.box, multiline && styles.multiline, focused && styles.focused, !!error && styles.errored]}>
        {left}
        <TextInput
          placeholderTextColor={C.textLight}
          style={[styles.input, multiline && { textAlignVertical: 'top', minHeight: 72 }, style]}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          secureTextEntry={password ? hidden : undefined}
          multiline={multiline}
          {...input}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {password && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Afficher le mot de passe">
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required && <Text style={{ color: C.text }}> *</Text>}
    </Text>
  );
}

export const fieldStyles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    gap: 8,
  },
});

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { fontSize: 13, color: C.text, fontWeight: '500' },
  box: fieldStyles.box,
  multiline: { alignItems: 'flex-start', paddingVertical: 10 },
  focused: { borderColor: C.primary },
  errored: { borderColor: C.danger },
  input: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 10, outlineStyle: 'none' } as any,
  suffix: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  error: { fontSize: 12, color: C.danger },
  hint: { fontSize: 12, color: C.textMuted },
});
