import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DayStrip } from '@/components/day-strip';
import { Badge, Chip, EmptyState, ErrorBox, Fab, Loading } from '@/components/ui/elements';
import { Screen } from '@/components/ui/screen';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { dayBounds, dayKey, formatTime, longDayLabel, STATUS } from '@/lib/agenda';
import { api } from '@/lib/api';
import type { Appointment, Employee } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Agenda du jour, filtrable par employé. */
export default function Agenda() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { can } = useAuth();
  const base = useStorePath();
  const [day, setDay] = useState(params.date ?? dayKey(new Date()));
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!can('employes.voir')) return;
    api.page<Employee>(`${base}/employes`, { actif: true, par_page: 100 }).then((r) => setEmployees(r.donnees)).catch(() => {});
  }, [base, can]);

  const { data, error, loading, reload, refreshing } = useApi(
    () => api.page<Appointment>(`${base}/rendez-vous`, { ...dayBounds(day), employe_id: employeeId, par_page: 100 }).then((r) => r.donnees),
    [base, day, employeeId],
  );

  const active = (data ?? []).filter((a) => a.statut !== 'annule');
  const cancelled = (data ?? []).filter((a) => a.statut === 'annule');

  return (
    <Screen title="Rendez-vous" scroll={false}>
      <View style={styles.top}>
        <DayStrip value={day} onChange={setDay} />
        {employees.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Tout le monde" active={employeeId === null} onPress={() => setEmployeeId(null)} />
            {employees.map((e) => (
              <Chip key={e.id} label={e.nom} active={employeeId === e.id} onPress={() => setEmployeeId(e.id)} />
            ))}
          </ScrollView>
        )}
        <Text style={styles.dayTitle}>
          {longDayLabel(day)} · {active.length} rendez-vous
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.primary} colors={[C.primary]} />}>
        {loading && !data && <Loading />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && active.length === 0 && (
          <EmptyState icon="calendar-outline" title="Aucun rendez-vous" message={can('rendez_vous.creer') ? 'Touchez + pour réserver un créneau.' : undefined} />
        )}
        {active.map((a) => (
          <AppointmentCard key={a.id} appointment={a} />
        ))}
        {cancelled.length > 0 && <Text style={styles.cancelledTitle}>Annulés</Text>}
        {cancelled.map((a) => (
          <AppointmentCard key={a.id} appointment={a} />
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {can('rendez_vous.creer') && <Fab icon="add" onPress={() => router.push({ pathname: '/rendez-vous/nouveau', params: { date: day, employe_id: employeeId ?? '' } })} />}
    </Screen>
  );
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const status = STATUS[a.statut];
  const dimmed = a.statut === 'annule' || a.statut === 'absent';
  return (
    <Pressable onPress={() => router.push({ pathname: '/rendez-vous/[id]', params: { id: a.id } })} style={({ pressed }) => [styles.card, dimmed && { opacity: 0.55 }, pressed && { backgroundColor: C.background }]}>
      <View style={styles.time}>
        <Text style={styles.timeStart}>{formatTime(a.debut_le)}</Text>
        <Text style={styles.timeEnd}>{formatTime(a.fin_le)}</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: a.statut === 'confirme' ? C.success : a.statut === 'prevu' ? C.primary : C.border }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.client} numberOfLines={1}>
          {a.nom_client ?? 'Client'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {a.service?.nom}
          {a.employe ? ` · ${a.employe.nom}` : ' · N’importe qui'}
        </Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 16, gap: 12, paddingBottom: 6 },
  chips: { gap: 8 },
  dayTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  time: { width: 46, alignItems: 'center' },
  timeStart: { fontSize: 15, fontWeight: '800', color: C.text },
  timeEnd: { fontSize: 11, color: C.textMuted },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  client: { fontSize: 15, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textMuted },
  cancelledTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, marginTop: 8 },
});
