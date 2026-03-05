import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { CardGridSkeleton } from '../components/TableSkeleton.tsx';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

type ActivePlayer = {
  id: number;
  jerseyNumber: number | string;
  firstName: string;
  lastName: string;
  label: string;
};


export default function ActiveRosterPage() {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [inactivePlayers, setInactivePlayers] = useState<ActivePlayer[]>([]);
  const [seasons, setSeasons] = useState<{ id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/seasons`)
      .then((r) => r.json())
      .then((data) => setSeasons(Array.isArray(data) ? data : []))
      .catch(() => setSeasons([]));
  }, []);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const [activeResponse, inactiveResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/active-players`),
          fetch(`${API_BASE_URL}/api/inactive-players`),
        ]);

        if (!activeResponse.ok) {
          throw new Error(`API error: ${activeResponse.status}`);
        }

        if (!inactiveResponse.ok) {
          throw new Error(`API error: ${inactiveResponse.status}`);
        }

        const activeData = (await activeResponse.json()) as ActivePlayer[];
        const inactiveData = (await inactiveResponse.json()) as ActivePlayer[];
        setPlayers(activeData);
        setInactivePlayers(inactiveData);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('roster.title')}
          subtitle={t('roster.subtitle')}
          stats={[
            { label: t('roster.totalPlayers'), value: `${players.length}${t('suffix.players')}` },
            { label: t('roster.updated'), value: 'Live' },
            { label: t('common.status'), value: 'Active' },
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
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-[#daaa00]" />
            <h2 className="text-xl font-bold text-[#daaa00]">{t('roster.activeRoster')}</h2>
          </div>

          {loading ? (
            <CardGridSkeleton count={12} />
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
          ) : players.length === 0 ? (
            <div className="text-center text-gray-400">{t('roster.noActive')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {players.map((player) => (
                <Link
                  key={player.id}
                  to={`/player?${new URLSearchParams({
                    playerNumber: String(player.jerseyNumber),
                    playerName: `${player.firstName} ${player.lastName}`.trim(),
                    ...(seasons[0] && { seasonId: String(seasons[0].id) }),
                  }).toString()}`}
                  className="relative w-full text-left rounded-xl border border-gray-700 bg-gray-800/80 p-4 pt-7 text-white shadow transition hover:border-[#daaa00] block"
                >
                  <span className="absolute left-3 top-3 text-base font-bold text-[#daaa00]">#{player.jerseyNumber}</span>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-white flex items-center gap-2 tracking-wide">
                      <span>{player.firstName} {player.lastName}</span>
                    </div>
                    <span className="text-xs text-[#daaa00]">Active</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-700 mt-6">
          <details>
            <summary className="cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-gray-300" />
                <h2 className="text-xl font-bold text-gray-200">{t('roster.inactiveRoster')}</h2>
                <span className="ml-auto text-xs text-gray-400">{t('roster.clickExpand')}</span>
              </div>
            </summary>

            <div className="mt-4">
              {loading ? (
                <div className="text-center text-gray-400">{t('common.loading')}</div>
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
              ) : inactivePlayers.length === 0 ? (
                <div className="text-center text-gray-400">{t('roster.noInactive')}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {inactivePlayers.map((player) => (
                    <Link
                      key={player.id}
                      to={`/player?${new URLSearchParams({
                        playerNumber: String(player.jerseyNumber),
                        playerName: `${player.firstName} ${player.lastName}`.trim(),
                        ...(seasons[0] && { seasonId: String(seasons[0].id) }),
                      }).toString()}`}
                      className="relative w-full text-left rounded-xl border border-gray-700 bg-gray-800/80 p-4 pt-7 text-white shadow transition hover:border-gray-300 block"
                    >
                      <span className="absolute left-3 top-3 text-base font-bold text-gray-300">#{player.jerseyNumber}</span>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-white flex items-center gap-2 tracking-wide">
                          <span>{player.firstName} {player.lastName}</span>
                        </div>
                        <span className="text-xs text-gray-300">Inactive</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </details>
        </section>
        <Footer />
      </div>
    </div>
  );
}
