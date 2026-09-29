import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * URL de l'API Laravel. Ordre de résolution :
 * 1. EXPO_PUBLIC_API_URL (fichier .env du frontend) ;
 * 2. l'IP de la machine qui sert le bundle Metro (téléphone réel sur le même Wi-Fi) ;
 * 3. l'émulateur Android (10.0.2.2) ou localhost.
 * Le backend doit écouter sur toutes les interfaces : `php artisan serve --host 0.0.0.0`.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'web') return 'http://localhost:8000/api';

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8000/api`;

  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
}

export const API_URL = resolveBaseUrl();

export type Paginated<T> = {
  donnees: T[];
  meta: { page_courante: number; derniere_page: number; par_page: number; total: number };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  erreurs: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, erreurs: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.erreurs = erreurs;
  }

  /** Premier message d'erreur d'un champ, pour l'affichage sous un input. */
  field(name: string): string | undefined {
    return this.erreurs[name]?.[0];
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'boolean' ? (v ? '1' : '0') : String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

async function request<T>(method: string, path: string, options: { body?: unknown; query?: Query; form?: FormData } = {}): Promise<{ data: T; message: string | null; raw: any }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form as unknown as BodyInit;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body });
  } catch {
    throw new ApiError(`Impossible de joindre le serveur (${API_URL}). Vérifiez votre connexion.`, 0, 'RESEAU');
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {}

  if (!response.ok || json?.succes === false) {
    if (response.status === 401 && token) onUnauthorized?.();
    throw new ApiError(
      json?.message ?? `Erreur inattendue (${response.status}).`,
      response.status,
      json?.code,
      json?.erreurs ?? {},
    );
  }

  return { data: json?.donnees as T, message: json?.message ?? null, raw: json };
}

export const api = {
  get: async <T>(path: string, query?: Query) => (await request<T>('GET', path, { query })).data,
  page: async <T>(path: string, query?: Query): Promise<Paginated<T>> => {
    const { raw } = await request<T[]>('GET', path, { query });
    return { donnees: raw.donnees, meta: raw.meta };
  },
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
};
