import { useState, useMemo } from 'react';
import { Search, Inbox } from 'lucide-react';
import { useMessages } from '../hooks/useMessages';
import MessageCard from '../components/MessageCard';

export default function Messages() {
  const { messages, isLoading, error } = useMessages();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.source.toLowerCase().includes(q) ||
      m.notes.toLowerCase().includes(q)
    );
  }, [messages, search]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const msg of filtered) {
      const month = msg.receivedAt.slice(0, 7); // YYYY-MM
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(msg);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${y}年${parseInt(m)}月`;
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-800 mb-3">消息存档</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索消息..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-50 rounded-lg p-3 mb-3 break-all">{error}</p>
      )}
      {isLoading && messages.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">加载中...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">
            {search ? '没有找到匹配的消息' : '还没有消息'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([month, msgs]) => (
            <div key={month}>
              <h2 className="text-xs font-medium text-gray-400 mb-2">{formatMonth(month)}</h2>
              <div className="space-y-2">
                {msgs.map(msg => (
                  <MessageCard key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
