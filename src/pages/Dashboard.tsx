import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, Mail, ChevronRight, Sparkles } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { useMessages } from '../hooks/useMessages';
import EventCard from '../components/EventCard';
import MessageCard from '../components/MessageCard';
import { toggleEventDone, syncToCalendar } from '../api/sheets';

export default function Dashboard() {
  const navigate = useNavigate();
  const { events, refetch: refetchEvents } = useEvents({ upcoming: true });
  const { messages } = useMessages();

  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => !e.isDone)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 10);
  }, [events]);

  const recentMessages = useMemo(() => {
    return [...messages]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, 5);
  }, [messages]);

  const handleToggleDone = async (id: number) => {
    try {
      await toggleEventDone(id);
      refetchEvents();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleSyncCalendar = async (id: number) => {
    try {
      await syncToCalendar(id);
      toast.success('已同步到日历');
      refetchEvents();
    } catch {
      toast.error('同步失败');
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-gray-800">ParentGate</h1>
      </div>

      {/* Upcoming Events */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium text-gray-700">近期活动</h2>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="flex items-center text-xs text-gray-400 hover:text-primary"
          >
            查看全部 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400">近期没有待办活动</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onToggleDone={handleToggleDone}
                onSyncCalendar={handleSyncCalendar}
                compact
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Messages */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium text-gray-700">最近消息</h2>
          </div>
          <button
            onClick={() => navigate('/messages')}
            className="flex items-center text-xs text-gray-400 hover:text-primary"
          >
            查看全部 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMessages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400">还没有消息</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMessages.map(msg => (
              <MessageCard key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
