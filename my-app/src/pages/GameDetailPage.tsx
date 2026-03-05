import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { StatTooltip } from '../components/StatTooltip.tsx';
import { TableSkeleton } from '../components/TableSkeleton.tsx';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

type GameInfo = {
  game_id: number;
  game_date: string;
  opponent: string;
  is_friendly: number;
  score: number | null;
  opp_score: number | null;
  season_year?: number;
  season_term?: string;
};

type GameBattingRow = {
  jersey_number: number | string;
  first_name: string;
  last_name: string;
  plate_appearances: number;
  at_bats: number;
  singles: number;
  doubles: number;
  triples: number;
  home_runs: number;
  runs_scored: number;
  rbi: number;
  walks: number;
  hit_by_pitch: number;
  strikeouts: number;
  stolen_bases: number;
  caught_stealing: number;
  batting_points: number;
};

type GamePitchingRow = {
  jersey_number: number | string;
  first_name: string;
  last_name: string;
  innings_pitched: number | string | null;
  wins: number;
  strikeouts: number;
  runs_allowed: number;
  earned_runs: number;
  hits_allowed: number;
  walks: number;
  hit_by_pitch: number;
  pitches_thrown: number;
  pitching_points: number;
};

const formatValue = (value?: number | string | null) =>
  value === null || value === undefined || value === '' ? '-' : value;

const formatDate = (value?: string | null, locale?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const loc = locale === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleDateString(loc, { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const formatScore = (score?: number | null, oppScore?: number | null) => {
  if (score === null || score === undefined || oppScore === null || oppScore === undefined) {
    return '-';
  }
  if (score === 0 && oppScore === 0) {
    return '-';
  }
  return `${score}-${oppScore}`;
};

export default function GameDetailPage() {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const gameId = Number(searchParams.get('gameId')) || 0;

  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [battingStats, setBattingStats] = useState<GameBattingRow[]>([]);
  const [pitchingStats, setPitchingStats] = useState<GamePitchingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!gameId) {
          setGameInfo(null);
          setBattingStats([]);
          setPitchingStats([]);
          return;
        }
        const apiParams = new URLSearchParams({ gameId: String(gameId) });
        const [infoResponse, battingResponse, pitchingResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/game-info?${apiParams.toString()}`),
          fetch(`${API_BASE_URL}/api/game-batting-stats?${apiParams.toString()}`),
          fetch(`${API_BASE_URL}/api/game-pitching-stats?${apiParams.toString()}`),
        ]);

        if (!infoResponse.ok) {
          throw new Error(`Game info API error: ${infoResponse.status}`);
        }
        if (!battingResponse.ok) {
          throw new Error(`Batting API error: ${battingResponse.status}`);
        }
        if (!pitchingResponse.ok) {
          throw new Error(`Pitching API error: ${pitchingResponse.status}`);
        }

        const infoData = (await infoResponse.json()) as GameInfo | null;
        const battingData = (await battingResponse.json()) as GameBattingRow[];
        const pitchingData = (await pitchingResponse.json()) as GamePitchingRow[];

        setGameInfo(infoData);
        setBattingStats(battingData);
        setPitchingStats(pitchingData);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [gameId]);

  const headerStats = useMemo(() => {
    const seasonLabel = gameInfo?.season_year && gameInfo?.season_term
      ? `${gameInfo.season_year} ${gameInfo.season_term}`
      : '-';
    return [
      { label: t('gameDetail.gameDate'), value: formatDate(gameInfo?.game_date) },
      { label: t('common.opponent'), value: formatValue(gameInfo?.opponent) },
      { label: t('common.season'), value: seasonLabel },
    ];
  }, [gameInfo, t, lang]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('gameDetail.title')}
          subtitle={t('gameDetail.subtitle')}
          stats={headerStats}
          action={(
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg border border-gray-500 text-gray-400 hover:border-[#daaa00] hover:text-[#daaa00] transition"
              >
                {t('common.back')}
              </button>
              <Link
                to="/games"
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.gameRecords')}
              </Link>
              <Link
                to="/"
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.home')}
              </Link>
            </div>
          )}
        />

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-6 h-6 text-[#daaa00]" />
            <h2 className="text-xl font-bold text-[#daaa00]">{t('gameDetail.battingStats')}</h2>
          </div>
          {!gameId ? (
            <div className="text-center text-gray-400">{t('gameDetail.notFound')}</div>
          ) : loading ? (
            <TableSkeleton rows={10} cols={15} />
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                type="button"
                onClick={() => { setError(null); setRetryCount((c) => c + 1); }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : battingStats.length === 0 ? (
            <div className="text-center text-gray-400">{t('gameDetail.noBatting')}</div>
          ) : (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm text-white border-collapse min-w-[500px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[7rem]">{t('common.player')}</th>
                    <th className="py-2 px-2">PA</th>
                    <th className="py-2 px-2">AB</th>
                    <th className="py-2 px-2">1B</th>
                    <th className="py-2 px-2">2B</th>
                    <th className="py-2 px-2">3B</th>
                    <th className="py-2 px-2">HR</th>
                    <th className="py-2 px-2">R</th>
                    <th className="py-2 px-2">RBI</th>
                    <th className="py-2 px-2">BB</th>
                    <th className="py-2 px-2">HBP</th>
                    <th className="py-2 px-2">SO</th>
                    <th className="py-2 px-2">SB</th>
                    <th className="py-2 px-2">CS</th>
                    <th className="py-2 px-2">Point</th>
                  </tr>
                </thead>
                <tbody>
                  {battingStats.map((record) => (
                    <tr key={`${record.jersey_number}-${record.first_name}-${record.last_name}`} className="border-b border-gray-700">
                      <td className="py-2 px-2 text-left text-[#daaa00] sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[7rem]">
                        #{record.jersey_number} {record.first_name} {record.last_name}
                      </td>
                      <td className="py-2 px-2 text-center">{formatValue(record.plate_appearances)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.at_bats)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.singles)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.doubles)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.triples)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.home_runs)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.runs_scored)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.rbi)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.walks)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.hit_by_pitch)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.strikeouts)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.stolen_bases)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.caught_stealing)}</td>
                      <td className="py-2 px-2 text-center font-bold text-black">
                        <span className="bg-[#daaa00] rounded px-2 py-1 inline-block">
                          {formatValue(record.batting_points)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00] mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-6 h-6 text-[#daaa00]" />
            <h2 className="text-xl font-bold text-[#daaa00]">{t('gameDetail.pitchingStats')}</h2>
          </div>
          {!gameId ? (
            <div className="text-center text-gray-400">{t('gameDetail.notFound')}</div>
          ) : loading ? (
            <TableSkeleton rows={8} cols={12} />
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                type="button"
                onClick={() => { setError(null); setRetryCount((c) => c + 1); }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : pitchingStats.length === 0 ? (
            <div className="text-center text-gray-400">{t('gameDetail.noPitching')}</div>
          ) : (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm text-white border-collapse min-w-[500px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[7rem]">{t('common.player')}</th>
                    <th className="py-2 px-2"><StatTooltip statKey="IP">IP</StatTooltip></th>
                    <th className="py-2 px-2">W</th>
                    <th className="py-2 px-2">K</th>
                    <th className="py-2 px-2">R</th>
                    <th className="py-2 px-2">ER</th>
                    <th className="py-2 px-2">H</th>
                    <th className="py-2 px-2">BB</th>
                    <th className="py-2 px-2">HBP</th>
                    <th className="py-2 px-2">Pitches</th>
                    <th className="py-2 px-2">Point</th>
                  </tr>
                </thead>
                <tbody>
                  {pitchingStats.map((record) => (
                    <tr key={`${record.jersey_number}-${record.first_name}-${record.last_name}`} className="border-b border-gray-700">
                      <td className="py-2 px-2 text-left text-[#daaa00] sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[7rem]">
                        #{record.jersey_number} {record.first_name} {record.last_name}
                      </td>
                      <td className="py-2 px-2 text-center">{formatValue(record.innings_pitched)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.wins)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.strikeouts)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.runs_allowed)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.earned_runs)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.hits_allowed)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.walks)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.hit_by_pitch)}</td>
                      <td className="py-2 px-2 text-center">{formatValue(record.pitches_thrown)}</td>
                      <td className="py-2 px-2 text-center font-bold text-black">
                        <span className="bg-[#daaa00] rounded px-2 py-1 inline-block">
                          {formatValue(record.pitching_points)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <Footer />
      </div>
    </div>
  );
}
