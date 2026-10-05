import type { AppointmentStatus } from './types';

/**
 * Outils d'agenda. Tout est calculé à l'heure locale du téléphone, puis
 * envoyé à l'API en instants ISO (UTC) : le serveur n'a jamais à deviner un
 * fuseau horaire.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** « 2026-10-10 » (date locale). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Bornes [début, fin) de la journée locale, en ISO. */
export function dayBounds(key: string): { du: string; au: string } {
  const start = parseDayKey(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { du: start.toISOString(), au: end.toISOString() };
}

export function addDays(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** Instant ISO pour une date locale + « HH:MM ». */
export function toIso(key: string, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = parseDayKey(key);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** « 09:30 » (heure locale) depuis un instant ISO. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dayLabel(key: string): { weekday: string; day: string; month: string } {
  const d = parseDayKey(key);
  return { weekday: DAYS[d.getDay()], day: String(d.getDate()), month: MONTHS[d.getMonth()] };
}

export function longDayLabel(key: string): string {
  const today = dayKey(new Date());
  if (key === today) return "Aujourd'hui";
  if (key === addDays(today, 1)) return 'Demain';
  const { weekday, day, month } = dayLabel(key);
  return `${weekday} ${day} ${month}`;
}

/** Créneaux « HH:MM » de 07:00 à 21:00, toutes les 30 minutes. */
export function timeSlots(from = 7, to = 21, step = 30): string[] {
  const slots: string[] = [];
  for (let minutes = from * 60; minutes < to * 60; minutes += step) slots.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  return slots;
}

/** Intervalle [debut, fin) en ms qui chevauche un autre ? */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export const STATUS: Record<AppointmentStatus, { label: string; tone: 'primary' | 'success' | 'neutral' | 'danger' | 'warning' }> = {
  prevu: { label: 'Prévu', tone: 'primary' },
  confirme: { label: 'Confirmé', tone: 'success' },
  termine: { label: 'Terminé', tone: 'neutral' },
  annule: { label: 'Annulé', tone: 'danger' },
  absent: { label: 'Absent', tone: 'warning' },
};

/** Statuts qui occupent le créneau (même règle que le backend). */
export const BLOCKING: AppointmentStatus[] = ['prevu', 'confirme', 'termine'];
