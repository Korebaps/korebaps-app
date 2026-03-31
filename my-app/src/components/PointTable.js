import { useLanguage } from '../i18n/LanguageContext';

// Aligned with MySQL batting_stats.batting_points (GENERATED column) and server/index.js
const battingRows = [
  { label: '1B', points: '+1' },
  { label: '2B', points: '+2' },
  { label: '3B', points: '+3' },
  { label: 'HR', points: '+5' },
  { label: 'R', points: '+1' },
  { label: 'RBI', points: '+2' },
  { label: 'BB/HBP', points: '+0.5' },
  { label: 'SB', points: '+1' },
  { label: 'MVP', points: '+5' },
];

// Aligned with MySQL pitching_stats.pitching_points (GENERATED) and server/index.js
const pitchingRows = [
  { label: 'IP', points: '+1 per inning' },
  { label: 'Win', points: '+5' },
  { label: 'K', points: '+2' },
  { label: 'ER', points: '-0.5' },
  { label: 'RA', points: '0' },
  { label: 'BB', points: '0' },
  { label: 'H', points: '0' },
  { label: 'MVP', points: '+5' },
];

export function PointTable() {
  const { t } = useLanguage();

  return (
    <section className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-[#daaa00] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#daaa00]">{t('points.heading')}</h2>
        <span className="text-xs text-gray-500">{t('points.rules')}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold text-gray-300 mb-3">{t('points.batting')}</div>
          <div className="grid grid-cols-2 gap-3">
            {battingRows.map((row) => (
              <div key={row.label} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">{row.label}</div>
                <div className="text-lg font-bold text-[#daaa00]">{row.points}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-300 mb-3">{t('points.pitching')}</div>
          <div className="grid grid-cols-2 gap-3">
            {pitchingRows.map((row) => (
              <div key={row.label} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-400">{row.label}</div>
                <div className="text-lg font-bold text-[#daaa00]">{row.points}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
