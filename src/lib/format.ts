import type { Decimal, ProductUnit } from './types';

export function toNumber(value: Decimal | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** 18000 -> "18 000" (séparateur d'espace, sans dépendre d'Intl). */
export function formatNumber(value: Decimal | null | undefined, decimals = 0): string {
  const n = toNumber(value);
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = n < 0 ? '-' : '';
  return dec && /[1-9]/.test(dec) ? `${sign}${grouped},${dec}` : `${sign}${grouped}`;
}

export function formatMoney(value: Decimal | null | undefined, currency = 'FCFA'): string {
  return `${formatNumber(value)} ${currency}`;
}

/** Quantité : jusqu'à 3 décimales, sans zéros inutiles. */
export function formatQty(value: Decimal | null | undefined): string {
  const n = toNumber(value);
  return Number.isInteger(n) ? formatNumber(n) : formatNumber(n, 3).replace(/,?0+$/, '');
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const UNITS: { value: ProductUnit; label: string; short: string }[] = [
  { value: 'piece', label: 'Pièce', short: 'unités' },
  { value: 'kg', label: 'Kilogramme', short: 'kg' },
  { value: 'g', label: 'Gramme', short: 'g' },
  { value: 'litre', label: 'Litre', short: 'L' },
  { value: 'ml', label: 'Millilitre', short: 'ml' },
  { value: 'boite', label: 'Boîte', short: 'boîtes' },
  { value: 'paquet', label: 'Paquet', short: 'paquets' },
];

/** Suffixe d'affichage d'un salaire : « 75 000 FCFA / mois ». */
export const SALARY_PERIOD_LABELS = { mensuel: '/ mois', hebdomadaire: '/ semaine', journalier: '/ jour' } as const;

export function unitShort(unit: ProductUnit | undefined): string {
  return UNITS.find((u) => u.value === unit)?.short ?? 'unités';
}

/** Nettoie une saisie numérique (virgule -> point, espaces retirés). */
export function cleanNumberInput(text: string): string {
  return text.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
}

export function initials(name: string): string {
  // « Coca-Cola 50cl » -> « C », « Savon Palmolive » -> « SP » : on ignore les mots
  // qui commencent par un chiffre (contenances, poids).
  const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return (words.length ? words : [name])
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
