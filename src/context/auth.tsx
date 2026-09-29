import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setToken, setUnauthorizedHandler } from '@/lib/api';
import { roleCan } from '@/lib/permissions';
import { getItem, removeItem, setItem } from '@/lib/storage';
import type { Store, User } from '@/lib/types';

const TOKEN_KEY = 'mb_jeton';
const STORE_KEY = 'mb_boutique';

type AuthState = {
  ready: boolean;
  user: User | null;
  stores: Store[];
  store: Store | null;
  features: Record<string, boolean>;
  login: (email: string, motDePasse: string) => Promise<void>;
  register: (data: { nom: string; email: string; telephone?: string; mot_de_passe: string; mot_de_passe_confirmation: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshStores: () => Promise<Store[]>;
  selectStore: (store: Store) => Promise<void>;
  /** Fonctionnalité active pour la boutique courante (FeatureGate backend). */
  hasFeature: (slug: string) => boolean;
  /** Permission du rôle courant sur la boutique courante. */
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const clear = useCallback(async () => {
    setToken(null);
    setUser(null);
    setStores([]);
    setStore(null);
    setFeatures({});
    await removeItem(TOKEN_KEY);
  }, []);

  const loadFeatures = useCallback(async (s: Store) => {
    try {
      const res = await api.get<{ fonctionnalites: { slug: string; activee: boolean }[] }>(`/boutiques/${s.id}/fonctionnalites`);
      setFeatures(Object.fromEntries(res.fonctionnalites.map((f) => [f.slug, f.activee])));
    } catch {
      setFeatures({});
    }
  }, []);

  const selectStore = useCallback(
    async (s: Store) => {
      // Les fonctionnalités d'abord : les écrans montés au changement de
      // boutique doivent déjà savoir quels modules sont actifs.
      await loadFeatures(s);
      setStore(s);
      await setItem(STORE_KEY, String(s.id));
    },
    [loadFeatures],
  );

  const refreshStores = useCallback(async () => {
    const list = await api.get<Store[]>('/boutiques');
    setStores(list);
    const savedId = await getItem(STORE_KEY);
    const current = list.find((s) => String(s.id) === savedId) ?? list[0] ?? null;
    if (current) {
      await selectStore(current);
    } else {
      setStore(null);
      setFeatures({});
    }
    return list;
  }, [selectStore]);

  const bootstrap = useCallback(
    async (jeton: string) => {
      setToken(jeton);
      const me = await api.get<User>('/auth/moi');
      // Boutiques avant l'utilisateur : sinon les gardes de navigation voient
      // un utilisateur sans boutique et redirigent brièvement vers /bienvenue.
      await refreshStores();
      setUser(me);
    },
    [refreshStores],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clear();
    });
    (async () => {
      const saved = await getItem(TOKEN_KEY);
      if (saved) {
        try {
          await bootstrap(saved);
        } catch {
          await clear();
        }
      }
      setReady(true);
    })();
    return () => setUnauthorizedHandler(null);
  }, [bootstrap, clear]);

  const login = useCallback(
    async (email: string, motDePasse: string) => {
      const { data } = await api.post<{ utilisateur: User; jeton: string }>('/auth/connexion', {
        email,
        mot_de_passe: motDePasse,
        nom_appareil: 'mobile',
      });
      await setItem(TOKEN_KEY, data.jeton);
      await bootstrap(data.jeton);
    },
    [bootstrap],
  );

  const register = useCallback<AuthState['register']>(
    async (payload) => {
      const { data } = await api.post<{ utilisateur: User; jeton: string }>('/auth/inscription', payload);
      await setItem(TOKEN_KEY, data.jeton);
      await bootstrap(data.jeton);
    },
    [bootstrap],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/deconnexion');
    } catch {}
    await clear();
  }, [clear]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      stores,
      store,
      features,
      login,
      register,
      logout,
      refreshStores,
      selectStore,
      hasFeature: (slug) => features[slug] === true,
      can: (permission) => roleCan(store?.mon_role, permission),
    }),
    [ready, user, stores, store, features, login, register, logout, refreshStores, selectStore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}

/** Préfixe d'URL de la boutique courante : `/boutiques/12`. */
export function useStorePath(): string {
  const { store } = useAuth();
  return `/boutiques/${store?.id ?? 0}`;
}
