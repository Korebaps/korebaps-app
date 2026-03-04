import { useLanguage } from '../i18n/LanguageContext';

export function RecordSummary({
  battingRecords,
  pitchingRecords,
  calculateBattingAvg,
  calculateOBP,
  calculateSLG,
  calculateERA,
}) {
  const topBatting = [...battingRecords]
    .map((record) => ({
      ...record,
      avg: calculateBattingAvg(record),
      obp: calculateOBP(record),
      slg: calculateSLG(record),
    }))
    .sort((a, b) => Number(b.avg) - Number(a.avg))
    .slice(0, 3);

  const topPitching = [...pitchingRecords]
    .map((record) => ({
      ...record,
      era: calculateERA(record),
    }))
    .sort((a, b) => Number(a.era) - Number(b.era))
    .slice(0, 3);

  const { t } = useLanguage();

  return (
    <section className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-[#daaa00] rounded-2xl p-6">
      <h2 className="text-xl font-bold text-[#daaa00] mb-4">{t('summary.heading')}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm text-gray-400 font-semibold">{t('summary.battingTop3')}</h3>
          {topBatting.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('summary.noBatting')}</p>
          ) : (
            topBatting.map((record) => (
              <div key={record.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between text-white font-semibold">
                  <span>{record.playerName}</span>
                  <span className="text-[#daaa00]">AVG {record.avg}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">OBP {record.obp} · SLG {record.slg}</div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm text-gray-400 font-semibold">{t('summary.pitchingTop3')}</h3>
          {topPitching.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('summary.noPitching')}</p>
          ) : (
            topPitching.map((record) => (
              <div key={record.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between text-white font-semibold">
                  <span>{record.playerName}</span>
                  <span className="text-[#daaa00]">ERA {record.era}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">K {record.strikeouts} · Win {record.wins}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
