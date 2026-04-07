import { useState, useEffect, useCallback } from 'react';
import type { SchoolEvent } from '../types';
import { getEvents as fetchEvents } from '../api/sheets';
import { getCache, setCache } from '../utils/cache';

export function useEvents(params?: { month?: string; upcoming?: boolean }) {
  const cacheKey = `events_${params?.month ?? 'all'}_${params?.upcoming ? 'upcoming' : ''}`;
  const cached = getCache<SchoolEvent[]>(cacheKey);

  const [events, setEvents] = useState<SchoolEvent[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const hasCached = !!getCache<SchoolEvent[]>(cacheKey);
    if (!hasCached) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEvents(params);
      setEvents(data);
      setCache(cacheKey, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [params?.month, params?.upcoming, cacheKey]);

  useEffect(() => { load(); }, [load]);

  return { events, isLoading, error, refetch: load };
}
