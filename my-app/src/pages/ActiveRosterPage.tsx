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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
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
              className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
            >
              메인으로
            </button>
          )}
        />

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-[#daaa00]" />
            <h2 className="text-xl font-bold text-[#daaa00]">Active Roster</h2>
          </div>

          {loading ? (
            <div className="text-center text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : players.length === 0 ? (
            <div className="text-center text-gray-400">등록된 현역 선수가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  className="relative w-full text-left rounded-xl border border-gray-700 bg-gray-800/80 p-4 pt-7 text-white shadow transition hover:border-[#daaa00]"
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

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-700 mt-6">
          <details>
            <summary className="cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-gray-300" />
                <h2 className="text-xl font-bold text-gray-200">Inactive Roster</h2>
                <span className="ml-auto text-xs text-gray-400">(click to expand)</span>
              </div>
            </summary>

            <div className="mt-4">
              {loading ? (
                <div className="text-center text-gray-400">Loading...</div>
              ) : error ? (
                <div className="text-center text-red-500">{error}</div>
              ) : inactivePlayers.length === 0 ? (
                <div className="text-center text-gray-400">등록된 비현역 선수가 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      className="relative w-full text-left rounded-xl border border-gray-700 bg-gray-800/80 p-4 pt-7 text-white shadow transition hover:border-gray-300"
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
