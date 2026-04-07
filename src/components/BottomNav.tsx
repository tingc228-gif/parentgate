import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mail, CalendarDays } from 'lucide-react';

const tabs = [
  { to: '/', label: '首页', icon: LayoutDashboard },
  { to: '/messages', label: '消息', icon: Mail },
  { to: '/events', label: '活动', icon: CalendarDays },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto flex">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                isActive ? 'text-primary font-medium' : 'text-gray-400'
              }`
            }
          >
            <tab.icon className="w-5 h-5 mb-0.5" />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
