import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Calendar,
  Users,
  Trophy,
  Upload,
  Edit3,
  Music,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import { useLanguage } from '../i18n/LanguageContext';

type AdminSection = {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  contentKey: string;
};

const sections: AdminSection[] = [
  { id: 'overview', titleKey: 'adminGuide.overview', icon: <Shield className="w-5 h-5" />, contentKey: 'adminGuide.overviewContent' },
  { id: 'login', titleKey: 'adminGuide.login', icon: <Shield className="w-5 h-5" />, contentKey: 'adminGuide.loginContent' },
  { id: 'seasons', titleKey: 'adminGuide.seasons', icon: <Calendar className="w-5 h-5" />, contentKey: 'adminGuide.seasonsContent' },
  { id: 'players', titleKey: 'adminGuide.players', icon: <Users className="w-5 h-5" />, contentKey: 'adminGuide.playersContent' },
  { id: 'games', titleKey: 'adminGuide.games', icon: <Trophy className="w-5 h-5" />, contentKey: 'adminGuide.gamesContent' },
  { id: 'editStats', titleKey: 'adminGuide.editStats', icon: <Edit3 className="w-5 h-5" />, contentKey: 'adminGuide.editStatsContent' },
  { id: 'csvUpload', titleKey: 'adminGuide.csvUpload', icon: <Upload className="w-5 h-5" />, contentKey: 'adminGuide.csvUploadContent' },
  { id: 'manualEntry', titleKey: 'adminGuide.manualEntry', icon: <PlusCircle className="w-5 h-5" />, contentKey: 'adminGuide.manualEntryContent' },
  { id: 'walkup', titleKey: 'adminGuide.walkup', icon: <Music className="w-5 h-5" />, contentKey: 'adminGuide.walkupContent' },
  { id: 'workflow', titleKey: 'adminGuide.workflow', icon: <AlertTriangle className="w-5 h-5" />, contentKey: 'adminGuide.workflowContent' },
];

function AdminSectionBlock({
  section,
  isOpen,
  onToggle,
  t,
}: {
  section: AdminSection;
  isOpen: boolean;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-800/50">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#daaa00] hover:bg-gray-700/50 transition"
      >
        {isOpen ? <ChevronDown className="w-5 h-5 shrink-0" /> : <ChevronRight className="w-5 h-5 shrink-0" />}
        <span className="shrink-0">{section.icon}</span>
        <span className="font-semibold">{t(section.titleKey)}</span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/50 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {t(section.contentKey)}
        </div>
      )}
    </div>
  );
}

export default function AdminGuidePage() {
  const { t } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('adminGuide.title')}
          subtitle={t('adminGuide.subtitle')}
          stats={[{ label: t('adminGuide.pageLabel'), value: t('adminGuide.pageValue') }]}
          action={
            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.location.href = '/admin';
                }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('adminGuide.goToAdmin')}
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2 rounded-lg border border-gray-500 text-gray-400 hover:bg-gray-700 transition"
              >
                {t('common.home')}
              </button>
            </div>
          }
        />

        <section className="mt-6 rounded-2xl border-2 border-amber-600/60 bg-gray-900/80 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-400">{t('adminGuide.confidentialTitle')}</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{t('adminGuide.confidentialContent')}</p>
        </section>

        <section className="mt-6 rounded-2xl border-2 border-[#daaa00]/60 bg-gray-900/80 p-6">
          <h2 className="text-xl font-bold text-[#daaa00] mb-2">{t('adminGuide.introTitle')}</h2>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{t('adminGuide.introContent')}</p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-bold text-[#daaa00]">{t('adminGuide.sectionsTitle')}</h2>
          {sections.map((section) => (
            <AdminSectionBlock
              key={section.id}
              section={section}
              isOpen={openSection === section.id}
              onToggle={() => setOpenSection((prev) => (prev === section.id ? null : section.id))}
              t={t}
            />
          ))}
        </section>

        <Footer />
      </div>
    </div>
  );
}
