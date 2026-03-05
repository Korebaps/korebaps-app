import { useEffect, useMemo, useState } from 'react';
import { Calculator, Download, Pin, PinOff, Share2 } from 'lucide-react';
import Header from '../components/Header';
import { StatTooltip } from '../components/StatTooltip.tsx';
import PlayerBattingTrendChart from '../components/PlayerBattingTrendChart.tsx';
import { useMyPlayer } from '../hooks/useMyPlayer.ts';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

type PlayerGameBattingRow = {
  game_id: number;
  game_date: string;
  opponent: string;
  is_friendly: number;
  score: number;
  opp_score: number;
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

type PlayerGamePitchingRow = {
  game_id: number;
  game_date: string;
  opponent: string;
  is_friendly: number;
  score: number;
  opp_score: number;
  innings_pitched: number | string;
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

type Season = {
  id: number;
  label: string;
  manager?: string;
};

type CareerBattingStats = {
  games: number;
  pa: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  r: number;
  rbi: number;
  bb: number;
  hbp: number;
  so: number;
  sb: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
} | null;

type CareerPitchingStats = {
  g: number;
  w: number;
  ip: string | number;
  so: number;
  bb: number;
  h: number;
  er: number;
  era: number;
  whip: number;
  k_9: number;
} | null;

type WalkupSong = {
  song_id: number;
  player_id: number;
  song_title: string;
  artist_name: string;
  spotify_track_id: string | null;
  spotify_track_url?: string | null;
  album_art_url?: string | null;
  start_time_seconds: number;
} | null;

const formatScore = (score?: number | null, oppScore?: number | null) => {
  if (score === null || score === undefined || oppScore === null || oppScore === undefined) {
    return '-';
  }
  if (score === 0 && oppScore === 0) {
    return '-';
  }
  return `${score}-${oppScore}`;
};

const formatValue = (value?: number | string | null) =>
  value === null || value === undefined || value === '' ? '-' : value;

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default function PlayerDetailPage() {
  const { t } = useLanguage();
  const { isPinned, pinPlayer, unpinPlayer } = useMyPlayer();
  const params = new URLSearchParams(window.location.search);
  const playerNumber = params.get('playerNumber') ?? '';
  const playerName = params.get('playerName') ?? '';
  const seasonIdParam = Number(params.get('seasonId')) || null;

  const [gameStats, setGameStats] = useState<PlayerGameBattingRow[]>([]);
  const [pitchingStats, setPitchingStats] = useState<PlayerGamePitchingRow[]>([]);
  const [careerBatting, setCareerBatting] = useState<CareerBattingStats>(null);
  const [careerPitching, setCareerPitching] = useState<CareerPitchingStats>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(seasonIdParam);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [walkupSong, setWalkupSong] = useState<WalkupSong>(null);
  const [walkupArtUrl, setWalkupArtUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareSeasonA, setCompareSeasonA] = useState<number | null>(null);
  const [compareSeasonB, setCompareSeasonB] = useState<number | null>(null);
  const [compareBattingA, setCompareBattingA] = useState<CareerBattingStats | null>(null);
  const [compareBattingB, setCompareBattingB] = useState<CareerBattingStats | null>(null);
  const [comparePitchingA, setComparePitchingA] = useState<CareerPitchingStats | null>(null);
  const [comparePitchingB, setComparePitchingB] = useState<CareerPitchingStats | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const nameParts = playerName.trim().split(' ').filter(Boolean);

  const handleShare = () => {
    const params = new URLSearchParams({ playerNumber, playerName });
    if (selectedSeasonId != null) params.set('seasonId', String(selectedSeasonId));
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!playerNumber || !playerName) {
          setGameStats([]);
          setPitchingStats([]);
          setCareerBatting(null);
          setCareerPitching(null);
          setSeasons([]);
          setSelectedSeasonId(null);
          setWalkupSong(null);
          setWalkupArtUrl(null);
          return;
        }

        const baseParams = new URLSearchParams({
          jerseyNumber: playerNumber,
          firstName,
          lastName,
        });

        const [seasonsResponse, walkupResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/player-seasons?${baseParams.toString()}`),
          fetch(`${API_BASE_URL}/api/player-walkup-song?${baseParams.toString()}`),
        ]);

        if (!seasonsResponse.ok) {
          throw new Error(`Seasons API error: ${seasonsResponse.status}`);
        }
        if (!walkupResponse.ok) {
          throw new Error(`Walkup song API error: ${walkupResponse.status}`);
        }

        const [seasonsData, walkupData] = await Promise.all([
          seasonsResponse.json() as Promise<{ seasons: Season[]; isActive: number }>,
          walkupResponse.json() as Promise<WalkupSong>,
        ]);

        setSeasons(seasonsData.seasons);
        setIsActive(seasonsData.isActive === 1);
        setWalkupSong(walkupData);
        setWalkupArtUrl(walkupData?.album_art_url ?? null);

        setSelectedSeasonId((current) => {
          if (current === null) {
            return null;
          }
          if (current && seasonsData.seasons.some((season) => season.id === current)) {
            return current;
          }
          return seasonsData.seasons[0]?.id ?? null;
        });
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [firstName, lastName, playerName, playerNumber]);

  useEffect(() => {
    const loadCareerStats = async () => {
      if (!playerNumber || !playerName) {
        setCareerBatting(null);
        setCareerPitching(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const baseParams = new URLSearchParams({
          jerseyNumber: playerNumber,
          firstName,
          lastName,
        });
        if (selectedSeasonId) {
          baseParams.set('seasonId', String(selectedSeasonId));
        }

        const [careerBattingResponse, careerPitchingResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/player-career-batting-stats?${baseParams.toString()}`),
          fetch(`${API_BASE_URL}/api/player-career-pitching-stats?${baseParams.toString()}`),
        ]);

        if (!careerBattingResponse.ok) {
          throw new Error(`Career batting API error: ${careerBattingResponse.status}`);
        }
        if (!careerPitchingResponse.ok) {
          throw new Error(`Career pitching API error: ${careerPitchingResponse.status}`);
        }

        const [careerBattingData, careerPitchingData] = await Promise.all([
          careerBattingResponse.json() as Promise<CareerBattingStats>,
          careerPitchingResponse.json() as Promise<CareerPitchingStats>,
        ]);

        setCareerBatting(careerBattingData);
        setCareerPitching(careerPitchingData);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCareerStats();
  }, [firstName, lastName, playerName, playerNumber, selectedSeasonId]);

  useEffect(() => {
    const loadCompareStats = async () => {
      if (!playerNumber || !playerName || !compareSeasonA || !compareSeasonB || compareSeasonA === compareSeasonB) {
        setCompareBattingA(null);
        setCompareBattingB(null);
        setComparePitchingA(null);
        setComparePitchingB(null);
        return;
      }
      try {
        setCompareLoading(true);
        const baseParams = { jerseyNumber: playerNumber, firstName, lastName };
        const [batA, batB, pitA, pitB] = await Promise.all([
          fetch(`${API_BASE_URL}/api/player-career-batting-stats?${new URLSearchParams({ ...baseParams, seasonId: String(compareSeasonA) }).toString()}`).then((r) => r.ok ? r.json() : null),
          fetch(`${API_BASE_URL}/api/player-career-batting-stats?${new URLSearchParams({ ...baseParams, seasonId: String(compareSeasonB) }).toString()}`).then((r) => r.ok ? r.json() : null),
          fetch(`${API_BASE_URL}/api/player-career-pitching-stats?${new URLSearchParams({ ...baseParams, seasonId: String(compareSeasonA) }).toString()}`).then((r) => r.ok ? r.json() : null),
          fetch(`${API_BASE_URL}/api/player-career-pitching-stats?${new URLSearchParams({ ...baseParams, seasonId: String(compareSeasonB) }).toString()}`).then((r) => r.ok ? r.json() : null),
        ]);
        setCompareBattingA(batA);
        setCompareBattingB(batB);
        setComparePitchingA(pitA);
        setComparePitchingB(pitB);
      } catch {
        setCompareBattingA(null);
        setCompareBattingB(null);
        setComparePitchingA(null);
        setComparePitchingB(null);
      } finally {
        setCompareLoading(false);
      }
    };
    loadCompareStats();
  }, [firstName, lastName, playerName, playerNumber, compareSeasonA, compareSeasonB]);

  useEffect(() => {
    const loadGameStats = async () => {
      if (!playerNumber || !playerName) {
        setGameStats([]);
        setPitchingStats([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const apiParams = new URLSearchParams({
          jerseyNumber: playerNumber,
          firstName,
          lastName,
        });
        if (selectedSeasonId) {
          apiParams.set('seasonId', String(selectedSeasonId));
        }
        const [battingResponse, pitchingResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/player-game-batting-stats?${apiParams.toString()}`),
          fetch(`${API_BASE_URL}/api/player-game-pitching-stats?${apiParams.toString()}`),
        ]);

        if (!battingResponse.ok) {
          throw new Error(`Batting API error: ${battingResponse.status}`);
        }
        if (!pitchingResponse.ok) {
          throw new Error(`Pitching API error: ${pitchingResponse.status}`);
        }

        const battingData = (await battingResponse.json()) as PlayerGameBattingRow[];
        const pitchingData = (await pitchingResponse.json()) as PlayerGamePitchingRow[];
        setGameStats(battingData);
        setPitchingStats(pitchingData);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadGameStats();
  }, [firstName, lastName, playerName, playerNumber, selectedSeasonId]);

  const selectedSeasonLabel = useMemo(() => {
    if (!selectedSeasonId) {
      return t('common.allSeasons');
    }
    return seasons.find((season) => season.id === selectedSeasonId)?.label ?? '-';
  }, [seasons, selectedSeasonId, t]);

  const safeName = (playerName || playerNumber || 'player').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  const seasonSuffix = selectedSeasonLabel.replace(/\s/g, '_');

  const handleExportCareerBatting = () => {
    if (!careerBatting) return;
    const headers = ['G', 'PA', 'AB', 'H', '2B', '3B', 'HR', 'R', 'RBI', 'BB', 'HBP', 'SO', 'SB', 'AVG', 'OBP', 'SLG', 'OPS'];
    const row = [
      careerBatting.games,
      careerBatting.pa,
      careerBatting.ab,
      careerBatting.h,
      careerBatting.doubles,
      careerBatting.triples,
      careerBatting.hr,
      careerBatting.r,
      careerBatting.rbi,
      careerBatting.bb,
      careerBatting.hbp,
      careerBatting.so,
      careerBatting.sb,
      careerBatting.avg,
      careerBatting.obp,
      careerBatting.slg,
      careerBatting.ops,
    ];
    const csv = headers.join(',') + '\n' + row.join(',') + '\n';
    downloadCSV(csv, `${safeName}_career_batting_${seasonSuffix}.csv`);
  };

  const handleExportCareerPitching = () => {
    if (!careerPitching) return;
    const headers = ['G', 'W', 'IP', 'SO', 'BB', 'H', 'ER', 'ERA', 'WHIP', 'K/9'];
    const row = [
      careerPitching.g,
      careerPitching.w,
      careerPitching.ip,
      careerPitching.so,
      careerPitching.bb,
      careerPitching.h,
      careerPitching.er,
      careerPitching.era,
      careerPitching.whip,
      careerPitching.k_9,
    ];
    const csv = headers.join(',') + '\n' + row.join(',') + '\n';
    downloadCSV(csv, `${safeName}_career_pitching_${seasonSuffix}.csv`);
  };

  const handleExportGameBatting = () => {
    const headers = ['Date', 'Opponent', 'Score', 'PA', 'AB', '1B', '2B', '3B', 'HR', 'R', 'RBI', 'BB', 'HBP', 'SO', 'SB', 'CS', 'Point'];
    let csv = headers.join(',') + '\n';
    gameStats.forEach((r) => {
      const scoreStr = formatScore(r.score, r.opp_score) ?? '-';
      csv += [
        r.game_date,
        `"${(r.opponent || '').replace(/"/g, '""')}"`,
        scoreStr,
        r.plate_appearances ?? '',
        r.at_bats ?? '',
        r.singles ?? '',
        r.doubles ?? '',
        r.triples ?? '',
        r.home_runs ?? '',
        r.runs_scored ?? '',
        r.rbi ?? '',
        r.walks ?? '',
        r.hit_by_pitch ?? '',
        r.strikeouts ?? '',
        r.stolen_bases ?? '',
        r.caught_stealing ?? '',
        r.batting_points ?? '',
      ].join(',') + '\n';
    });
    downloadCSV(csv, `${safeName}_game_batting_${seasonSuffix}.csv`);
  };

  const handleExportGamePitching = () => {
    const headers = ['Date', 'Opponent', 'Score', 'IP', 'W', 'K', 'R', 'ER', 'H', 'BB', 'HBP', 'Pitches', 'Point'];
    let csv = headers.join(',') + '\n';
    pitchingStats.forEach((r) => {
      const scoreStr = formatScore(r.score, r.opp_score) ?? '-';
      csv += [
        r.game_date,
        `"${(r.opponent || '').replace(/"/g, '""')}"`,
        scoreStr,
        r.innings_pitched ?? '',
        r.wins ?? '',
        r.strikeouts ?? '',
        r.runs_allowed ?? '',
        r.earned_runs ?? '',
        r.hits_allowed ?? '',
        r.walks ?? '',
        r.hit_by_pitch ?? '',
        r.pitches_thrown ?? '',
        r.pitching_points ?? '',
      ].join(',') + '\n';
    });
    downloadCSV(csv, `${safeName}_game_pitching_${seasonSuffix}.csv`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('player.title')}
          subtitle={t('player.subtitle')}
          stats={[
            { label: t('player.name'), value: playerName || '-' },
            { label: t('player.jerseyNumber'), value: playerNumber || '-' },
            { label: t('player.selectedSeason'), value: selectedSeasonLabel },
            { label: t('common.status'), value: isActive ? 'Active' : 'Inactive' },
          ]}
          action={(
            <div className="flex flex-wrap gap-2">
              {playerNumber && playerName && (
                isPinned(playerNumber, playerName) ? (
                  <button
                    onClick={() => unpinPlayer()}
                    className="px-4 py-2 rounded-lg border border-[#daaa00] bg-[#daaa00]/20 text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition flex items-center gap-2"
                    title={t('player.unpinMyStats')}
                  >
                    <PinOff className="w-4 h-4" />
                    {t('player.unpinMyStats')}
                  </button>
                ) : (
                  <button
                    onClick={() => pinPlayer(playerNumber, playerName)}
                    className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition flex items-center gap-2"
                    title={t('player.pinMyStats')}
                  >
                    <Pin className="w-4 h-4" />
                    {t('player.pinMyStats')}
                  </button>
                )
              )}
              <button
                onClick={() => {
                  window.location.href = '/roster';
                }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.activeRoster')}
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.home')}
              </button>
              {playerNumber && playerName && (
                <button
                  onClick={handleShare}
                  className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition flex items-center gap-2"
                  title={t('player.shareLink')}
                >
                  <Share2 className="w-4 h-4" />
                  {shareCopied ? t('player.linkCopied') : t('player.shareLink')}
                </button>
              )}
            </div>
          )}
        />

        {!isActive && playerNumber && playerName && (
          <div className="mt-4 p-4 rounded-xl bg-gray-700/50 border border-gray-500 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
            <span className="text-gray-300 font-medium">
              {t('player.inactiveMsg')} <span className="text-gray-200 font-bold">{t('player.inactiveStatus')}</span>
            </span>
          </div>
        )}

        {playerNumber && playerName && walkupSong ? (
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00] mt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-black/30 border border-gray-700 overflow-hidden flex items-center justify-center">
                  {walkupArtUrl ? (
                    <img
                      src={walkupArtUrl}
                      alt={`${walkupSong.song_title} album art`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-gray-400 text-center px-2">{t('player.noAlbumArt')}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-300">{t('player.walkupSong')}</div>
                  <div className="text-lg font-bold text-[#daaa00]">{walkupSong.song_title}</div>
                  <div className="text-sm text-gray-200">{walkupSong.artist_name}</div>
                </div>
              </div>

              {walkupSong.spotify_track_id ? (
                <a
                  href={walkupSong.spotify_track_url ?? `https://open.spotify.com/track/${walkupSong.spotify_track_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
                >
                  {t('player.openSpotify')}
                </a>
              ) : null}
            </div>

            {walkupSong.spotify_track_id ? (
              <div className="mt-4">
                <iframe
                  style={{ borderRadius: 12 }}
                  src={`https://open.spotify.com/embed/track/${walkupSong.spotify_track_id}?utm_source=generator`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify player"
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-6 ${isActive ? 'border-[#daaa00]' : 'border-gray-500'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
              <h2 className={`text-xl font-bold ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.careerBatting')}</h2>
              {!isActive && <span className="text-xs text-gray-400 ml-2">(Inactive)</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {careerBatting && (
                <button
                  type="button"
                  onClick={handleExportCareerBatting}
                  className="px-3 py-1.5 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('common.exportCSV')}
                </button>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>{t('common.selectSeason')}</span>
              <select
                value={selectedSeasonId ?? ''}
                onChange={(event) => {
                  const value = Number(event.target.value) || null;
                  setSelectedSeasonId(value);
                }}
                className="bg-gray-900 border border-gray-500 text-white rounded-lg px-3 py-2"
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
          </div>
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <div className="text-center text-gray-400">{t('common.loading')}</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : !careerBatting ? (
            <div className="text-center text-gray-400">{t('player.noBattingStats')}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm text-white">
              <div>
                <div className="text-xs text-gray-400">G</div>
                <div className="text-lg font-semibold">{formatValue(careerBatting.games)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">PA</div>
                <div className="text-lg font-semibold">{formatValue(careerBatting.pa)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">AB</div>
                <div className="text-lg font-semibold">{formatValue(careerBatting.ab)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">H</div>
                <div className="text-lg font-semibold">{formatValue(careerBatting.h)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">2B / 3B / HR</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerBatting.doubles)} / {formatValue(careerBatting.triples)} / {formatValue(careerBatting.hr)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">R / RBI</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerBatting.r)} / {formatValue(careerBatting.rbi)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">BB / HBP</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerBatting.bb)} / {formatValue(careerBatting.hbp)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">SO / SB</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerBatting.so)} / {formatValue(careerBatting.sb)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">AVG / OBP / SLG</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerBatting.avg)} / {formatValue(careerBatting.obp)} / {formatValue(careerBatting.slg)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">OPS</div>
                <div className="text-lg font-semibold">{formatValue(careerBatting.ops)}</div>
              </div>
            </div>
          )}
        </section>

        <section className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-6 ${isActive ? 'border-[#daaa00]' : 'border-gray-500'}`}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
              <h2 className={`text-xl font-bold tracking-wide ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.careerPitching')}</h2>
              {!isActive && <span className="text-xs text-gray-400 ml-2">(Inactive)</span>}
            </div>
            {careerPitching && (
              <button
                type="button"
                onClick={handleExportCareerPitching}
                className="px-3 py-1.5 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('common.exportCSV')}
              </button>
            )}
          </div>
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <div className="text-center text-gray-400">{t('common.loading')}</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : !careerPitching ? (
            <div className="text-center text-gray-400">{t('player.noPitchingStats')}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm text-white">
              <div>
                <div className="text-xs text-gray-400">G</div>
                <div className="text-lg font-semibold">{formatValue(careerPitching.g)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">W</div>
                <div className="text-lg font-semibold">{formatValue(careerPitching.w)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">IP</div>
                <div className="text-lg font-semibold">{formatValue(careerPitching.ip)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">SO / BB</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerPitching.so)} / {formatValue(careerPitching.bb)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">H / ER</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerPitching.h)} / {formatValue(careerPitching.er)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">ERA / WHIP / K/9</div>
                <div className="text-lg font-semibold">
                  {formatValue(careerPitching.era)} / {formatValue(careerPitching.whip)} / {formatValue(careerPitching.k_9)}
                </div>
              </div>
            </div>
          )}
        </section>

        {seasons.length >= 2 && playerNumber && playerName && (
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-6 border-[#daaa00]/60">
            <h2 className="text-xl font-bold text-[#daaa00] mb-4">{t('player.compareSeasons')}</h2>
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t('player.seasonA')}</label>
                <select
                  value={compareSeasonA ?? ''}
                  onChange={(e) => setCompareSeasonA(e.target.value ? Number(e.target.value) : null)}
                  className="bg-gray-900 border border-gray-500 text-white rounded-lg px-3 py-2 min-w-[8rem]"
                >
                  <option value="">—</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t('player.seasonB')}</label>
                <select
                  value={compareSeasonB ?? ''}
                  onChange={(e) => setCompareSeasonB(e.target.value ? Number(e.target.value) : null)}
                  className="bg-gray-900 border border-gray-500 text-white rounded-lg px-3 py-2 min-w-[8rem]"
                >
                  <option value="">—</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {(!compareSeasonA || !compareSeasonB || compareSeasonA === compareSeasonB) ? (
              <p className="text-gray-400 text-sm">{t('player.selectTwoSeasons')}</p>
            ) : compareLoading ? (
              <p className="text-gray-400">{t('common.loading')}</p>
            ) : (compareBattingA || compareBattingB || comparePitchingA || comparePitchingB) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#daaa00] mb-2">{seasons.find((s) => s.id === compareSeasonA)?.label ?? 'A'}</h3>
                  <div className="space-y-2 text-sm text-white">
                    {compareBattingA && (
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-400">G/PA/AB:</span><span>{formatValue(compareBattingA.games)}/{formatValue(compareBattingA.pa)}/{formatValue(compareBattingA.ab)}</span>
                        <span className="text-gray-400">AVG/OBP/SLG:</span><span>{formatValue(compareBattingA.avg)}/{formatValue(compareBattingA.obp)}/{formatValue(compareBattingA.slg)}</span>
                      </div>
                    )}
                    {comparePitchingA && (
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-400">IP/W/ERA:</span><span>{formatValue(comparePitchingA.ip)}/{formatValue(comparePitchingA.w)}/{formatValue(comparePitchingA.era)}</span>
                      </div>
                    )}
                    {!compareBattingA && !comparePitchingA && <span className="text-gray-400">No stats</span>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#daaa00] mb-2">{seasons.find((s) => s.id === compareSeasonB)?.label ?? 'B'}</h3>
                  <div className="space-y-2 text-sm text-white">
                    {compareBattingB && (
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-400">G/PA/AB:</span><span>{formatValue(compareBattingB.games)}/{formatValue(compareBattingB.pa)}/{formatValue(compareBattingB.ab)}</span>
                        <span className="text-gray-400">AVG/OBP/SLG:</span><span>{formatValue(compareBattingB.avg)}/{formatValue(compareBattingB.obp)}/{formatValue(compareBattingB.slg)}</span>
                      </div>
                    )}
                    {comparePitchingB && (
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-400">IP/W/ERA:</span><span>{formatValue(comparePitchingB.ip)}/{formatValue(comparePitchingB.w)}/{formatValue(comparePitchingB.era)}</span>
                      </div>
                    )}
                    {!compareBattingB && !comparePitchingB && <span className="text-gray-400">No stats</span>}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-8 ${isActive ? 'border-[#daaa00]' : 'border-gray-500'}`}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
              <h2 className={`text-xl font-bold tracking-wide ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.gameBattingStats')}</h2>
            </div>
            {gameStats.length > 0 && (
              <button
                type="button"
                onClick={handleExportGameBatting}
                className="px-3 py-1.5 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('common.exportCSV')}
              </button>
            )}
          </div>
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <div className="text-center text-gray-400">{t('common.loading')}</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : gameStats.length === 0 ? (
            <div className="text-center text-gray-400">{t('player.noGameRecords')}</div>
          ) : (
            <>
            {gameStats.length >= 2 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#daaa00] mb-2">{t('player.battingTrend')}</h3>
                <PlayerBattingTrendChart gameStats={gameStats} />
              </div>
            )}
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm text-white border-collapse min-w-[600px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.date')}</th>
                    <th className="py-2 px-2 text-left sticky left-[5rem] z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.opponent')}</th>
                    <th className="py-2 px-2">{t('common.score')}</th>
                    <th className="py-2 px-2"><StatTooltip abbr="PA">PA</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="AB">AB</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="1B">1B</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="2B">2B</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="3B">3B</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="HR">HR</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="R">R</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="RBI">RBI</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="BB">BB</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="HBP">HBP</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="SO">SO</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="SB">SB</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="CS">CS</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="Point">Point</StatTooltip></th>
                  </tr>
                </thead>
                <tbody>
                  {gameStats.map((record) => (
                    <tr key={record.game_id} className="border-b border-gray-700">
                      <td className="py-2 px-2 text-left text-[#daaa00] sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{new Date(record.game_date).toLocaleDateString()}</td>
                      <td className="py-2 px-2 text-left font-semibold sticky left-[5rem] z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{record.opponent}</td>
                      <td className="py-2 px-2 text-center">
                        {formatScore(record.score, record.opp_score)}
                      </td>
                      <td className="py-2 px-2 text-center">{record.plate_appearances}</td>
                      <td className="py-2 px-2 text-center">{record.at_bats}</td>
                      <td className="py-2 px-2 text-center">{record.singles}</td>
                      <td className="py-2 px-2 text-center">{record.doubles}</td>
                      <td className="py-2 px-2 text-center">{record.triples}</td>
                      <td className="py-2 px-2 text-center">{record.home_runs}</td>
                      <td className="py-2 px-2 text-center">{record.runs_scored}</td>
                      <td className="py-2 px-2 text-center">{record.rbi}</td>
                      <td className="py-2 px-2 text-center">{record.walks}</td>
                      <td className="py-2 px-2 text-center">{record.hit_by_pitch}</td>
                      <td className="py-2 px-2 text-center">{record.strikeouts}</td>
                      <td className="py-2 px-2 text-center">{record.stolen_bases}</td>
                      <td className="py-2 px-2 text-center">{record.caught_stealing}</td>
                      <td className="py-2 px-2 text-center font-bold text-black">
                        <span className="bg-[#daaa00] rounded px-2 py-1 inline-block">
                          {record.batting_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <section className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-6 ${isActive ? 'border-[#daaa00]' : 'border-gray-500'}`}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
              <h2 className={`text-xl font-bold ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.gamePitchingStats')}</h2>
            </div>
            {pitchingStats.length > 0 && (
              <button
                type="button"
                onClick={handleExportGamePitching}
                className="px-3 py-1.5 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('common.exportCSV')}
              </button>
            )}
          </div>
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <div className="text-center text-gray-400">{t('common.loading')}</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : pitchingStats.length === 0 ? (
            <div className="text-center text-gray-400">{t('player.noGameRecords')}</div>
          ) : (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm text-white border-collapse min-w-[600px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.date')}</th>
                    <th className="py-2 px-2 text-left sticky left-[5rem] z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.opponent')}</th>
                    <th className="py-2 px-2">{t('common.score')}</th>
                    <th className="py-2 px-2"><StatTooltip abbr="IP">IP</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="W">W</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="SO">K</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="RA">R</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="ER">ER</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="H">H</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="BB">BB</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="HBP">HBP</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="Pitches">Pitches</StatTooltip></th>
                    <th className="py-2 px-2"><StatTooltip abbr="Point">Point</StatTooltip></th>
                  </tr>
                </thead>
                <tbody>
                  {pitchingStats.map((record) => (
                    <tr key={record.game_id} className="border-b border-gray-700">
                      <td className="py-2 px-2 text-left text-[#daaa00] sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">
                        {new Date(record.game_date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2 text-left font-semibold sticky left-[5rem] z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{record.opponent}</td>
                      <td className="py-2 px-2 text-center">
                        {formatScore(record.score, record.opp_score)}
                      </td>
                      <td className="py-2 px-2 text-center">{record.innings_pitched}</td>
                      <td className="py-2 px-2 text-center">{record.wins}</td>
                      <td className="py-2 px-2 text-center">{record.strikeouts}</td>
                      <td className="py-2 px-2 text-center">{record.runs_allowed}</td>
                      <td className="py-2 px-2 text-center">{record.earned_runs}</td>
                      <td className="py-2 px-2 text-center">{record.hits_allowed}</td>
                      <td className="py-2 px-2 text-center">{record.walks}</td>
                      <td className="py-2 px-2 text-center">{record.hit_by_pitch}</td>
                      <td className="py-2 px-2 text-center">{record.pitches_thrown}</td>
                      <td className="py-2 px-2 text-center font-bold text-black">
                        <span className="bg-[#daaa00] rounded px-2 py-1 inline-block">
                          {record.pitching_points}
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
