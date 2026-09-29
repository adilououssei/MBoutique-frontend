import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from './api';

type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * Liste paginée (?page=N) avec recherche/filtre, rechargée au focus et
 * quand `query` change (recherche avec anti-rebond de 300 ms).
 */
export function usePagedList<T>(path: string | null, query: Query, perPage = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(query);
  const request = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!path) {
        setItems([]);
        setLoading(false);
        return;
      }
      const id = ++request.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const res = await api.page<T>(path, { ...JSON.parse(key), page: 1, par_page: perPage });
        if (id !== request.current) return;
        setItems(res.donnees);
        setPage(1);
        setLastPage(res.meta.derniere_page);
        setTotal(res.meta.total);
        setError(null);
      } catch (e) {
        if (id === request.current) setError(e instanceof ApiError ? e.message : 'Erreur de chargement.');
      } finally {
        if (id === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path, key, perPage],
  );

  const first = useRef(true);
  useEffect(() => {
    if (first.current) return;
    const t = setTimeout(() => load('silent'), 300);
    return () => clearTimeout(t);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(first.current ? 'initial' : 'silent');
      first.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]),
  );

  const loadMore = useCallback(async () => {
    if (!path || loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const res = await api.page<T>(path, { ...JSON.parse(key), page: page + 1, par_page: perPage });
      setItems((prev) => [...prev, ...res.donnees]);
      setPage(page + 1);
      setLastPage(res.meta.derniere_page);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, [path, key, perPage, page, lastPage, loadingMore]);

  return { items, setItems, total, loading, refreshing, loadingMore, error, reload: () => load('refresh'), loadMore };
}
