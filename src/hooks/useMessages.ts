import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types';
import { getMessages as fetchMessages } from '../api/sheets';
import { getCache, setCache } from '../utils/cache';

export function useMessages(month?: string) {
  const cacheKey = `messages_${month ?? 'all'}`;
  const cached = getCache<Message[]>(cacheKey);

  const [messages, setMessages] = useState<Message[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const hasCached = !!getCache<Message[]>(cacheKey);
    if (!hasCached) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMessages(month);
      setMessages(data);
      setCache(cacheKey, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [month, cacheKey]);

  useEffect(() => { load(); }, [load]);

  return { messages, isLoading, error, refetch: load };
}
