/**
 * Palette officielle M Boutique. Toute couleur de l'application passe par ici.
 */
export const C = {
  primary: '#FE5F17',
  primaryDeep: '#FF5714',
  primarySoft: '#FFF1EA',
  dark: '#0F1A26',
  text: '#13202F',
  textMuted: '#6B7684',
  textLight: '#9AA3AF',
  white: '#FFFFFF',
  background: '#F5F6F9',
  border: '#E5E9EF',
  success: '#0B9253',
  successSoft: '#E6F5EE',
  danger: '#E53935',
  dangerSoft: '#FDECEC',
  warning: '#F2994A',
  warningSoft: '#FFF3E6',
  info: '#5B6B82',
  infoSoft: '#EEF1F5',
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: '#0F1A26',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
