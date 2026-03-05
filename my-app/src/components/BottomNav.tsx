import { useLanguage } from '../i18n/LanguageContext';
import { Home, Users, Calendar, Video } from 'lucide-react';

const navItems = [
  { path: '/', labelKey: 'common.home', icon: Home },
  { path: '/roster', labelKey: 'common.roster', icon: Users },
  { path: '/games', labelKey: 'common.gameRecords', icon: Calendar },
  { path: '/media', labelKey: 'common.videos', icon: Video },
];

export default function BottomNav() {
  const { t } = useLanguage();
  const pathname = window.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900/95 backdrop-blur border-t border-gray-700 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, labelKey, icon: Icon }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <button
              key={path}
              type="button"
              onClick={() => { window.location.href = path; }}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition ${
                isActive ? 'text-[#daaa00]' : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-label={t(labelKey)}
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-xs font-medium">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
