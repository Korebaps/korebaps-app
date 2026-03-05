import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CalendarDays, Video } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/roster', icon: Users, labelKey: 'nav.roster' },
  { path: '/games', icon: CalendarDays, labelKey: 'nav.games' },
  { path: '/media', icon: Video, labelKey: 'nav.videos' },
];

export default function BottomNav() {
  const { t } = useLanguage();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-900/95 backdrop-blur border-t border-gray-700 safe-area-pb"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-14 max-w-7xl mx-auto">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition ${
                isActive ? 'text-[#daaa00]' : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
