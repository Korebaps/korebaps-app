import { useState } from 'react';
import { ChevronDown, ChevronRight, Home, Users, BarChart3, Share2, Download, Pin } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import { useLanguage } from '../i18n/LanguageContext';

type GuideSection = {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  contentKey: string;
};

const sections: GuideSection[] = [
  { id: 'quickstart', titleKey: 'guide.quickStart', icon: <Home className="w-5 h-5" />, contentKey: 'guide.quickStartContent' },
  { id: 'dashboard', titleKey: 'guide.dashboard', icon: <BarChart3 className="w-5 h-5" />, contentKey: 'guide.dashboardContent' },
  { id: 'mystats', titleKey: 'guide.myStats', icon: <Pin className="w-5 h-5" />, contentKey: 'guide.myStatsContent' },
  { id: 'player', titleKey: 'guide.playerPage', icon: <Users className="w-5 h-5" />, contentKey: 'guide.playerPageContent' },
  { id: 'compare', titleKey: 'guide.compare', icon: <BarChart3 className="w-5 h-5" />, contentKey: 'guide.compareContent' },
  { id: 'export', titleKey: 'guide.export', icon: <Download className="w-5 h-5" />, contentKey: 'guide.exportContent' },
  { id: 'share', titleKey: 'guide.share', icon: <Share2 className="w-5 h-5" />, contentKey: 'guide.shareContent' },
];

function GuideSectionBlock({ section, isOpen, onToggle, t }: { section: GuideSection; isOpen: boolean; onToggle: () => void; t: (k: string) => string }) {
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

export default function GuidePage() {
  const { t } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>('quickstart');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('guide.title')}
          subtitle={t('guide.subtitle')}
          stats={[
            { label: t('guide.pageLabel'), value: t('guide.pageValue') },
          ]}
          action={(
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
            >
              {t('common.home')}
            </button>
          )}
        />

        <section className="mt-6 rounded-2xl border-2 border-[#daaa00]/60 bg-gray-900/80 p-6">
          <h2 className="text-xl font-bold text-[#daaa00] mb-2">{t('guide.introTitle')}</h2>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {t('guide.introContent')}
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-bold text-[#daaa00]">{t('guide.featuresTitle')}</h2>
          {sections.map((section) => (
            <GuideSectionBlock
              key={section.id}
              section={section}
              isOpen={openSection === section.id}
              onToggle={() => setOpenSection((prev) => (prev === section.id ? null : section.id))}
              t={t}
            />
          ))}
        </section>

        <section className="mt-8 p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-center text-sm text-gray-400">
          {t('guide.tips')}
        </section>

        <Footer />
      </div>
    </div>
  );
}
