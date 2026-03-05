import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

type PlayerOption = {
  id: number;
  jerseyNumber: number | string;
  firstName: string;
  lastName: string;
  playerName: string;
};

type CareerBattingStats = {
  games: number;
  pa: number;
  ab: number;
  h: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
} | null;

type CareerPitchingStats = {
  g: number;
  w: number;
  ip: string | number;
  era: number;
  whip: number;
} | null;

const formatValue = (value?: number | string | null) =>
  value === null || value === undefined || value === '' ? '-' : value;

export default function PlayerComparisonPage() {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [seasons, setSeasons] = useState<{ id: number; label: string }[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [playerA, setPlayerA] = useState<PlayerOption | null>(null);
  const [playerB, setPlayerB] = useState<PlayerOption | null>(null);
  const [battingA, setBattingA] = useState<CareerBattingStats>(null);
  const [battingB, setBattingB] = useState<CareerBattingStats>(null);
  const [pitchingA, setPitchingA] = useState<CareerPitchingStats>(null);
  const [pitchingB, setPitchingB] = useState<CareerPitchingStats>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [activeRes, inactiveRes, seasonsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/active-players`),
          fetch(`${API_BASE_URL}/api/inactive-players`),
          fetch(`${API_BASE_URL}/api/seasons`),
        ]);
        if (!activeRes.ok || !inactiveRes.ok) throw new Error('API error');
        const [active, inactive] = await Promise.all([activeRes.json(), inactiveRes.json()]);
        const all = [...(active || []), ...(inactive || [])].map((p: { id: number; jerseyNumber: number | string; firstName: string; lastName: string }) => ({
          id: p.id,
          jerseyNumber: p.jerseyNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          playerName: `${p.firstName} ${p.lastName}`.trim(),
        }));
        setPlayers(all);
        const seasonsData = (await seasonsRes.json()) || [];
        setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
        if (seasonsData?.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(seasonsData[0].id);
        }
      } catch {
        setPlayers([]);
        setSeasons([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!playerA || !playerB || playerA.id === playerB.id) {
      setBattingA(null);
      setBattingB(null);
      setPitchingA(null);
      setPitchingB(null);
      return;
    }
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const base = (p: PlayerOption) => ({
          jerseyNumber: String(p.jerseyNumber),
          firstName: p.firstName,
          lastName: p.lastName,
          ...(selectedSeasonId && { seasonId: String(selectedSeasonId) }),
        });
        const [batARes, batBRes, pitARes, pitBRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/player-career-batting-stats?${new URLSearchParams(base(playerA)).toString()}`),
          fetch(`${API_BASE_URL}/api/player-career-batting-stats?${new URLSearchParams(base(playerB)).toString()}`),
          fetch(`${API_BASE_URL}/api/player-career-pitching-stats?${new URLSearchParams(base(playerA)).toString()}`),
          fetch(`${API_BASE_URL}/api/player-career-pitching-stats?${new URLSearchParams(base(playerB)).toString()}`),
        ]);
        const [ba, bb, pa, pb] = await Promise.all([
          batARes.ok ? batARes.json() : null,
          batBRes.ok ? batBRes.json() : null,
          pitARes.ok ? pitARes.json() : null,
          pitBRes.ok ? pitBRes.json() : null,
        ]);
        setBattingA(ba);
        setBattingB(bb);
        setPitchingA(pa);
        setPitchingB(pb);
      } catch {
        setBattingA(null);
        setBattingB(null);
        setPitchingA(null);
        setPitchingB(null);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [playerA, playerB, selectedSeasonId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('compare.title')}
          subtitle={t('compare.subtitle')}
          stats={[
            { label: t('compare.selectPlayerA'), value: playerA?.playerName ?? '—' },
            { label: t('compare.selectPlayerB'), value: playerB?.playerName ?? '—' },
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

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <h2 className="text-xl font-bold text-[#daaa00] mb-4">{t('compare.title')}</h2>
          {loading ? (
            <p className="text-gray-400">{t('common.loading')}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t('common.season')}</label>
                  <select
                    value={selectedSeasonId ?? ''}
                    onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
                    className="bg-gray-900 border border-gray-500 text-white rounded-lg px-3 py-2 min-w-[10rem]"
                  >
                    <option value="">{t('common.allSeasons')}</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t('compare.selectPlayerA')}</label>
                  <select
                    value={playerA?.id ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setPlayerA(players.find((p) => p.id === id) ?? null);
                    }}
                    className="bg-gray-900 border border-gray-500 text-white rounded-lg px-3 py-2 min-w-[12rem]"
                  >
                    <option value="">—</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>#{p.jerseyNumber} {p.playerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t('compare.selectPlayerB')}</label>
                  <select
                    value={playerB?.id ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setPlayerB(players.find((p) => p.id === id) ?? null);
                    }}
                    className="bg-gray-900 border border-gray-500 text-white rounded-lg px-3 py-2 min-w-[12rem]"
                  >
                    <option value="">—</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>#{p.jerseyNumber} {p.playerName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(!playerA || !playerB || playerA.id === playerB.id) ? (
                <p className="text-gray-400 text-sm">{t('compare.selectTwoPlayers')}</p>
              ) : statsLoading ? (
                <p className="text-gray-400">{t('common.loading')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="border border-[#daaa00]/40 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-[#daaa00] mb-3">
                      #{playerA.jerseyNumber} {playerA.playerName}
                    </h3>
                    <div className="space-y-3 text-sm text-white">
                      {(battingA || pitchingA) && (
                        <>
                          {battingA && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">{t('compare.batting')}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <span>G / PA / AB:</span><span>{formatValue(battingA.games)} / {formatValue(battingA.pa)} / {formatValue(battingA.ab)}</span>
                                <span>AVG / OBP / SLG:</span><span>{formatValue(battingA.avg)} / {formatValue(battingA.obp)} / {formatValue(battingA.slg)}</span>
                                <span>OPS:</span><span>{formatValue(battingA.ops)}</span>
                              </div>
                            </div>
                          )}
                          {pitchingA && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">{t('compare.pitching')}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <span>G / IP / W:</span><span>{formatValue(pitchingA.g)} / {formatValue(pitchingA.ip)} / {formatValue(pitchingA.w)}</span>
                                <span>ERA / WHIP:</span><span>{formatValue(pitchingA.era)} / {formatValue(pitchingA.whip)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {!battingA && !pitchingA && <span className="text-gray-400">No stats</span>}
                    </div>
                  </div>
                  <div className="border border-[#daaa00]/40 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-[#daaa00] mb-3">
                      #{playerB.jerseyNumber} {playerB.playerName}
                    </h3>
                    <div className="space-y-3 text-sm text-white">
                      {(battingB || pitchingB) && (
                        <>
                          {battingB && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">{t('compare.batting')}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <span>G / PA / AB:</span><span>{formatValue(battingB.games)} / {formatValue(battingB.pa)} / {formatValue(battingB.ab)}</span>
                                <span>AVG / OBP / SLG:</span><span>{formatValue(battingB.avg)} / {formatValue(battingB.obp)} / {formatValue(battingB.slg)}</span>
                                <span>OPS:</span><span>{formatValue(battingB.ops)}</span>
                              </div>
                            </div>
                          )}
                          {pitchingB && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">{t('compare.pitching')}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <span>G / IP / W:</span><span>{formatValue(pitchingB.g)} / {formatValue(pitchingB.ip)} / {formatValue(pitchingB.w)}</span>
                                <span>ERA / WHIP:</span><span>{formatValue(pitchingB.era)} / {formatValue(pitchingB.whip)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {!battingB && !pitchingB && <span className="text-gray-400">No stats</span>}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <Footer />
      </div>
    </div>
  );
}
