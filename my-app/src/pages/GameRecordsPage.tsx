import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { CardGridSkeleton } from '../components/TableSkeleton.tsx';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

type GameRecord = {
  game_id: number;
  game_date: string;
  opponent: string;
  is_friendly: number;
  score: number | null;
  opp_score: number | null;
};

const formatResult = (record: GameRecord, win: string, loss: string, draw: string) => {
  if (record.score == null || record.opp_score == null) {
    return '-';
  }
  if (record.score === 0 && record.opp_score === 0) {
    return '-';
  }
  const result = record.score > record.opp_score ? win : record.score < record.opp_score ? loss : draw;
  return `${record.score}-${record.opp_score} (${result})`;
};

type Season = {
  id: number;
  label: string;
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

export default function GameRecordsPage() {
  const { t, lang } = useLanguage();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/seasons`);
        if (!response.ok) {
          throw new Error(`Seasons API error: ${response.status}`);
        }
        const data = (await response.json()) as Season[];
        setSeasons(data);
        setSelectedSeasonId(data[0]?.id ?? null);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      }
    };

    loadSeasons();
  }, []);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (selectedSeasonId) {
          params.set('seasonId', String(selectedSeasonId));
        }
        const response = await fetch(`${API_BASE_URL}/api/games?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = (await response.json()) as GameRecord[];
        setRecords(data);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [selectedSeasonId]);

  const stats = useMemo(() => {
    const totalGames = records.length;
    return { totalGames };
  }, [records]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0b] via-[#111827] to-[#1f2937]">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('games.title')}
          subtitle={t('games.subtitle')}
          stats={[
            { label: t('games.totalGames'), value: `${stats.totalGames}${t('suffix.games')}` },
            { label: t('common.season'), value: selectedSeasonId ? t('games.selected') : t('games.all') },
            { label: t('roster.updated'), value: 'Live' },
          ]}
          action={(
            <Link
              to="/"
              className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
            >
              {t('common.home')}
            </Link>
          )}
        />

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-[#daaa00]" />
              <h2 className="text-xl font-bold text-[#daaa00]">{t('games.heading')}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{t('games.sortedRecent')}</span>
              <select
                value={selectedSeasonId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedSeasonId(value ? Number(value) : null);
                }}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-[#daaa00] focus:outline-none"
              >
                <option value="">{t('common.allSeasons')}</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <CardGridSkeleton count={6} />
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
          ) : records.length === 0 ? (
            <div className="text-center text-gray-400">{t('games.noRecords')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.map((record) => (
                <Link
                  key={record.game_id}
                  to={`/game?gameId=${record.game_id}`}
                  className="text-left rounded-xl border border-gray-700 bg-gray-800/80 p-5 text-white shadow transition hover:border-[#daaa00] block"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-400">{formatDate(record.game_date, lang)}</p>
                      <h3 className="text-lg font-semibold text-white">vs {formatValue(record.opponent)}</h3>
                      <p className="text-sm text-gray-400">
                        {record.is_friendly ? t('games.friendly') : t('games.regular')}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#daaa00] px-3 py-1 text-sm text-[#daaa00]">
                      {formatResult(record, t('games.win'), t('games.loss'), t('games.draw'))}
                    </span>
                  </div>
                  <div className="mt-4 text-sm text-gray-300">
                    {t('games.score')}: {formatValue(record.score)} - {formatValue(record.opp_score)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <Footer />
      </div>
    </div>
  );
}
