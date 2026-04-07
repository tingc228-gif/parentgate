import { Calendar, MapPin, Check, CalendarSync, Trash2 } from 'lucide-react';
import type { SchoolEvent } from '../types';
import { EVENT_CATEGORIES } from '../types';
import { formatDateTimeCN, daysUntil, isToday, isTomorrow } from '../utils/date';

interface Props {
  event: SchoolEvent;
  onToggleDone?: (id: number) => void;
  onSyncCalendar?: (id: number) => void;
  onDelete?: (id: number) => void;
  compact?: boolean;
}

export default function EventCard({ event, onToggleDone, onSyncCalendar, onDelete, compact }: Props) {
  const category = EVENT_CATEGORIES.find(c => c.name === event.category);
  const days = daysUntil(event.eventDate);
  const isSynced = !!event.gcalEventId;

  let urgencyClass = 'border-l-gray-300';
  let badge = '';
  if (!event.isDone && days >= 0) {
    if (isToday(event.eventDate)) {
      urgencyClass = 'border-l-danger';
      badge = '今天';
    } else if (isTomorrow(event.eventDate)) {
      urgencyClass = 'border-l-warning';
      badge = '明天';
    } else if (days <= 7) {
      urgencyClass = 'border-l-primary-light';
      badge = `${days}天后`;
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-3 border-l-4 ${urgencyClass} ${event.isDone ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{category?.emoji ?? '📌'}</span>
            <h3 className={`font-medium text-sm truncate ${event.isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {event.title}
            </h3>
            {badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                isToday(event.eventDate) ? 'bg-red-100 text-red-600' :
                isTomorrow(event.eventDate) ? 'bg-amber-100 text-amber-600' :
                'bg-indigo-100 text-indigo-600'
              }`}>
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateTimeCN(event.eventDate, event.eventTime || undefined)}
            </span>
            {event.location && !compact && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && !compact && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onSyncCalendar && !event.isDone && (
            <button
              onClick={() => onSyncCalendar(event.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                isSynced ? 'text-success bg-green-50' : 'text-gray-300 hover:text-primary hover:bg-indigo-50'
              }`}
              title={isSynced ? '已同步日历' : '同步到日历'}
              disabled={isSynced}
            >
              <CalendarSync className="w-4 h-4" />
            </button>
          )}
          {onToggleDone && (
            <button
              onClick={() => onToggleDone(event.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                event.isDone ? 'text-success bg-green-50' : 'text-gray-300 hover:text-success hover:bg-green-50'
              }`}
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('删除这个活动？')) onDelete(event.id);
              }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-danger hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
