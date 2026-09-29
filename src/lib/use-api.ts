import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { ApiError } from './api';

/**
 * Charge une ressource à chaque fois que l'écran reprend le focus (retour
 * depuis un formulaire => données fraîches), avec états loading/erreur.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef(false);

  // `deps` décrit ce dont dépend `fetcher` (comme pour useEffect).
  const depKey = JSON.stringify(deps);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'silent') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await fetcher();
        setData(result);
        setError(null);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Une erreur est survenue.');
      } finally {
        loaded.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depKey],
  );

  useFocusEffect(
    useCallback(() => {
      load(loaded.current ? 'silent' : 'initial');
    }, [load]),
  );

  return { data, setData, error, loading, refreshing, reload: () => load('refresh') };
}
