import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R } from '@/constants/colors';
import { addDays, dayKey, dayLabel } from '@/lib/agenda';

/** Bandeau de 7 jours avec flèches semaine précédente/suivante. */
export function DayStrip({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const today = dayKey(new Date());
  // Premier jour affiché : la semaine qui contient la date choisie, à partir d'aujourd'hui par défaut.
  const [start, setStart] = useState(() => (value < today ? value : today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <View style={styles.row}>
      <Pressable onPress={() => setStart(addDays(start, -7))} hitSlop={8} style={styles.arrow} accessibilityLabel="Semaine précédente">
        <Ionicons name="chevron-back" size={18} color={C.text} />
      </Pressable>
      {days.map((key) => {
        const { weekday, day } = dayLabel(key);
        const active = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[styles.day, active && styles.dayActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[styles.weekday, active && styles.activeText]}>{weekday}</Text>
            <Text style={[styles.dayNum, active && styles.activeText]}>{day}</Text>
            {key === today && <View style={[styles.dot, active && { backgroundColor: C.white }]} />}
          </Pressable>
        );
      })}
      <Pressable onPress={() => setStart(addDays(start, 7))} hitSlop={8} style={styles.arrow} accessibilityLabel="Semaine suivante">
        <Ionicons name="chevron-forward" size={18} color={C.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { width: 24, alignItems: 'center' },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: R.md, gap: 2 },
  dayActive: { backgroundColor: C.primary },
  weekday: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 16, fontWeight: '800', color: C.text },
  activeText: { color: C.white },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary },
});
