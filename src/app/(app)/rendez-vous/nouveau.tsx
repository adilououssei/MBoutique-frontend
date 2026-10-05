import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DayStrip } from '@/components/day-strip';
import { Button } from '@/components/ui/button';
import { Chip, ErrorBox, Loading } from '@/components/ui/elements';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/sheet';
import { C, R } from '@/constants/colors';
import { useAuth, useStorePath } from '@/context/auth';
import { BLOCKING, dayBounds, dayKey, formatTime, longDayLabel, overlaps, timeSlots, toIso } from '@/lib/agenda';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import type { Appointment, Customer, Employee, Service } from '@/lib/types';

const DEFAULT_DURATION = 30;

/** Réservation (sans ?id) ou déplacement/modification (?id=) d'un rendez-vous. */
export default function Reserver() {
  const params = useLocalSearchParams<{ id?: string; date?: string; employe_id?: string }>();
  const editingId = params.id;
  const { hasFeature } = useAuth();
  const base = useStorePath();

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number>(params.employe_id ? Number(params.employe_id) : 0);
  const [clientMode, setClientMode] = useState<'nouveau' | 'enregistre'>('nouveau');
  const [clientId, setClientId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [day, setDay] = useState(params.date ?? dayKey(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Heure d'ouverture de l'écran : les créneaux déjà passés sont grisés.
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    api.page<Service>(`${base}/services`, { actif: true, par_page: 100 }).then((r) => setServices(r.donnees)).catch(() => {});
    api.page<Employee>(`${base}/employes`, { actif: true, par_page: 100 }).then((r) => setEmployees(r.donnees)).catch(() => {});
    if (hasFeature('clients')) api.page<Customer>(`${base}/clients`, { actif: true, par_page: 100 }).then((r) => setCustomers(r.donnees)).catch(() => {});
    if (!editingId) return;
    api
      .get<Appointment>(`${base}/rendez-vous/${editingId}`)
      .then((a) => {
        setServiceId(a.service?.id ?? null);
        setEmployeeId(a.employe?.id ?? 0);
        if (a.client) {
          setClientMode('enregistre');
          setClientId(a.client.id);
        } else {
          setName(a.nom_client ?? '');
          setPhone(a.telephone_client ?? '');
        }
        setDay(dayKey(new Date(a.debut_le)));
        setTime(formatTime(a.debut_le));
        setNotes(a.notes ?? '');
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [base, editingId, hasFeature]);

  // Rendez-vous de l'employé choisi ce jour-là, pour griser les créneaux pris.
  useEffect(() => {
    if (!employeeId) return;
    api
      .page<Appointment>(`${base}/rendez-vous`, { ...dayBounds(day), employe_id: employeeId, par_page: 100 })
      .then((r) => setBusy(r.donnees.filter((a) => BLOCKING.includes(a.statut) && String(a.id) !== editingId)))
      .catch(() => setBusy([]));
  }, [base, day, employeeId, editingId]);

  const service = services.find((s) => s.id === serviceId);
  const duration = service?.duree_minutes ?? DEFAULT_DURATION;

  const slots = useMemo(() => {
    // Sans employé choisi (« n'importe qui »), aucun planning individuel à respecter.
    const relevant = employeeId ? busy : [];
    return timeSlots().map((slot) => {
      const start = new Date(toIso(day, slot)).getTime();
      const end = start + duration * 60000;
      const taken = relevant.some((a) => overlaps(start, end, new Date(a.debut_le).getTime(), new Date(a.fin_le).getTime()));
      return { slot, taken, past: start < openedAt };
    });
  }, [day, duration, busy, employeeId, openedAt]);

  const chosen = slots.find((s) => s.slot === time);
  const clientOk = clientMode === 'enregistre' ? !!clientId : name.trim().length > 0;
  const canSubmit = !!serviceId && !!time && clientOk && !chosen?.taken;

  async function submit() {
    if (!time || !serviceId) return;
    setSaving(true);
    setError(null);
    const payload = {
      service_id: serviceId,
      employe_id: employeeId || null,
      client_id: clientMode === 'enregistre' ? clientId : null,
      nom_client: clientMode === 'nouveau' ? name.trim() : null,
      telephone_client: clientMode === 'nouveau' ? phone.trim() || null : null,
      debut_le: toIso(day, time),
      notes: notes.trim() || null,
    };
    try {
      if (editingId) {
        await api.put(`${base}/rendez-vous/${editingId}`, payload);
        goBack({ pathname: '/rendez-vous/[id]', params: { id: editingId } });
      } else {
        const { data } = await api.post<Appointment>(`${base}/rendez-vous`, payload);
        router.replace({ pathname: '/rendez-vous/[id]', params: { id: data.id } });
      }
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={editingId ? 'Déplacer le rendez-vous' : 'Nouveau rendez-vous'}
      footer={<Button title={time ? `Réserver · ${longDayLabel(day)} à ${time}` : 'Choisissez un créneau'} onPress={submit} loading={saving} disabled={!canSubmit || loading} />}>
      {loading && <Loading />}
      {error && <ErrorBox message={error.code === 'VALIDATION_ECHOUEE' ? (Object.values(error.erreurs)[0]?.[0] ?? error.message) : error.message} />}
      {!loading && (
        <>
          <SelectField
            label="Prestation"
            required
            placeholder="Choisir une prestation"
            value={serviceId}
            onChange={setServiceId}
            options={services.map((s) => ({ value: s.id, label: s.nom, description: `${formatMoney(s.prix)}${s.duree_minutes ? ` · ${s.duree_minutes} min` : ''}` }))}
          />
          <SelectField
            label="Avec"
            value={employeeId}
            onChange={(v) => {
              setEmployeeId(v);
              setTime(null);
            }}
            options={[{ value: 0, label: 'N’importe qui de disponible' }, ...employees.map((e) => ({ value: e.id, label: e.nom, description: e.poste ?? undefined }))]}
          />

          <Text style={styles.section}>Client</Text>
          {customers.length > 0 && (
            <View style={styles.chips}>
              <Chip label="Nouveau / de passage" active={clientMode === 'nouveau'} onPress={() => setClientMode('nouveau')} />
              <Chip label="Client enregistré" active={clientMode === 'enregistre'} onPress={() => setClientMode('enregistre')} />
            </View>
          )}
          {clientMode === 'enregistre' ? (
            <SelectField label="Client" required placeholder="Choisir un client" value={clientId} onChange={setClientId} options={customers.map((c) => ({ value: c.id, label: c.nom, description: c.telephone ?? undefined }))} />
          ) : (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Nom" required value={name} onChangeText={setName} placeholder="Ex : Fatou" error={error?.field('nom_client')} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optionnel" />
              </View>
            </View>
          )}

          <Text style={styles.section}>Date et heure</Text>
          <DayStrip
            value={day}
            onChange={(d) => {
              setDay(d);
              setTime(null);
            }}
          />
          <Text style={styles.help}>
            Durée : {duration} min{employeeId ? ' · les heures grisées sont déjà prises' : ''}
          </Text>
          <View style={styles.slots}>
            {slots.map(({ slot, taken, past }) => {
              const disabled = taken || past;
              const active = time === slot;
              return (
                <Pressable
                  key={slot}
                  disabled={disabled}
                  onPress={() => setTime(slot)}
                  style={[styles.slot, active && styles.slotActive, disabled && styles.slotDisabled]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}>
                  <Text style={[styles.slotText, active && { color: C.white }, disabled && styles.slotTextDisabled]}>{slot}</Text>
                </Pressable>
              );
            })}
          </View>

          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Ex : tresses longues, apporter les mèches" multiline />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: -6 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: 12 },
  help: { fontSize: 12, color: C.textMuted },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '22.5%', paddingVertical: 10, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  slotActive: { backgroundColor: C.primary, borderColor: C.primary },
  slotDisabled: { backgroundColor: C.background, borderColor: C.background },
  slotText: { fontSize: 14, fontWeight: '700', color: C.text },
  slotTextDisabled: { color: C.textLight, textDecorationLine: 'line-through' },
});
