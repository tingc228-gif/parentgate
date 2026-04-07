import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react';
import dayjs from 'dayjs';
import { useEvents } from '../hooks/useEvents';
import EventCard from '../components/EventCard';
import { toggleEventDone, syncToCalendar, deleteEvent } from '../api/sheets';
import { clearAllCache } from '../utils/cache';
import { EVENT_CATEGORIES } from '../types';
import { getCurrentMonth } from '../utils/date';

export default function Events() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { events, refetch } = useEvents({ month });

  const filtered = useMemo(() => {
    let list = events;
    if (activeCategory) {
      list = list.filter(e => e.category === activeCategory);
    }
    return list.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [events, activeCategory]);

  const prevMonth = () => setMonth(dayjs(month + '-01').subtract(1, 'month').format('YYYY-MM'));
  const nextMonth = () => setMonth(dayjs(month + '-01').add(1, 'month').format('YYYY-MM'));

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${y}年${parseInt(m)}月`;
  };

  const handleToggleDone = async (id: number) => {
    try {
      await toggleEventDone(id);
      refetch();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleSyncCalendar = async (id: number) => {
    try {
      await syncToCalendar(id);
      toast.success('已同步到日历');
      refetch();
    } catch {
      toast.error('同步失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEvent(id);
      clearAllCache();
      refetch();
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-800 mb-3">活动日程</h1>

      {/* Month Picker */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-3 mb-3">
        <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-primary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-700">{formatMonth(month)}</span>
        <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-primary">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
            !activeCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          全部
        </button>
        {EVENT_CATEGORIES.map(c => (
          <button
            key={c.name}
            onClick={() => setActiveCategory(activeCategory === c.name ? null : c.name)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeCategory === c.name ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {/* Event List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <CalendarOff className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">本月没有活动</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onToggleDone={handleToggleDone}
              onSyncCalendar={handleSyncCalendar}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
