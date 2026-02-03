import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import API_BASE_URL from '../apiBaseUrl';

type ActivePlayer = {
  id: number;
  jerseyNumber: number | string;
  firstName: string;
  lastName: string;
  label: string;
};


export default function ActiveRosterPage() {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [inactivePlayers, setInactivePlayers] = useState<ActivePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-black">
      <div className="max-w-7xl mx-auto p-6 md:p-10 w-full">
        <Header
          logoSrc={logo}
          title="코레밥스 현역 로스터"
          subtitle="Korebaps Active Roster"
          stats={[
            { label: '총 선수', value: `${players.length}명` },
            { label: '업데이트', value: 'Live' },
            { label: '상태', value: 'Active' },
          ]}
          action={(
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-6 py-3 rounded-lg border-2 border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black hover:scale-105 hover:shadow-lg hover:shadow-[#daaa00]/20 transition-all duration-200 ease-out font-semibold"
            >
              메인으로
            </button>
          )}
        />

        <section className="bg-gradient-to-br from-gray-900 via-blue-900/10 to-gray-800 rounded-2xl shadow-lg p-8 border-2 border-[#daaa00] mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-7 h-7 text-[#daaa00]" />
            <h2 className="text-2xl font-bold text-[#daaa00]" style={{ textShadow: '0 0 10px rgba(218, 170, 0, 0.3)' }}>Active Roster</h2>
          </div>

          {loading ? (
            <div className="text-center text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : players.length === 0 ? (
            <div className="text-center text-gray-400">등록된 현역 선수가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      playerNumber: String(player.jerseyNumber),
                      playerName: `${player.firstName} ${player.lastName}`.trim(),
                    });
                    window.location.href = `/player?${params.toString()}`;
                  }}
                  className="relative w-full text-left rounded-xl border-2 border-gray-700 bg-gray-800/80 p-5 pt-8 text-white shadow-lg transition-all duration-200 hover:border-[#daaa00] hover:-translate-y-1 hover:shadow-[#daaa00]/30 active:scale-95"
                >
                  <span className="absolute left-3 top-3 text-base font-bold text-[#daaa00]">#{player.jerseyNumber}</span>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-white flex items-center gap-2 tracking-wide">
                      <span>{player.firstName} {player.lastName}</span>
                    </div>
                    <span className="text-xs text-[#daaa00]">Active</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl shadow-lg p-8 border-2 border-gray-700 mt-8">
          <details>
            <summary className="cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <Users className="w-7 h-7 text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-200" style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.1)' }}>Inactive Roster</h2>
                <span className="ml-auto text-sm text-gray-400">(click to expand)</span>
              </div>
            </summary>

            <div className="mt-6">
              {loading ? (
                <div className="text-center text-gray-400">Loading...</div>
              ) : error ? (
                <div className="text-center text-red-500">{error}</div>
              ) : inactivePlayers.length === 0 ? (
                <div className="text-center text-gray-400">등록된 비현역 선수가 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {inactivePlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          playerNumber: String(player.jerseyNumber),
                          playerName: `${player.firstName} ${player.lastName}`.trim(),
                        });
                        window.location.href = `/player?${params.toString()}`;
                      }}
                      className="relative w-full text-left rounded-xl border-2 border-gray-700 bg-gray-800/80 p-5 pt-8 text-white shadow-lg transition-all duration-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-gray-300/30 active:scale-95"
                    >
                      <span className="absolute left-3 top-3 text-base font-bold text-gray-300">#{player.jerseyNumber}</span>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-white flex items-center gap-2 tracking-wide">
                          <span>{player.firstName} {player.lastName}</span>
                        </div>
                        <span className="text-xs text-gray-300">Inactive</span>
                      </div>
                    </button>
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
