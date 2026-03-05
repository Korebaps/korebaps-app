import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Calculator, Share2 } from 'lucide-react';
import Header from '../components/Header';
import { TableSkeleton } from '../components/TableSkeleton.tsx';
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

export default function PlayerDetailPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { pinPlayer, unpinPlayer, isPinned } = useMyPlayer();
  const [searchParams] = useSearchParams();
  const playerNumber = searchParams.get('playerNumber') ?? '';
  const playerName = searchParams.get('playerName') ?? '';
  const seasonIdParam = Number(searchParams.get('seasonId')) || null;

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
  const [shareCopied, setShareCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const nameParts = playerName.trim().split(' ').filter(Boolean);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

  useEffect(() => {
    if (playerName) {
      document.title = `${playerName} - Korebaps Stats`;
    }
    return () => {
      document.title = 'Korebaps Stats';
    };
  }, [playerName]);

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
  }, [firstName, lastName, playerName, playerNumber, retryCount]);

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
  }, [firstName, lastName, playerName, playerNumber, selectedSeasonId, retryCount]);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams({ playerNumber, playerName });
    if (selectedSeasonId) params.set('seasonId', String(selectedSeasonId));
    return `${window.location.origin}/player?${params.toString()}`;
  }, [playerNumber, playerName, selectedSeasonId]);

  const handleShare = async () => {
    const shareData = {
      title: `${playerName} - Korebaps Stats`,
      text: `Check out ${playerName}'s stats on Korebaps`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          await navigator.clipboard?.writeText(shareUrl);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        }
      }
    } else {
      await navigator.clipboard?.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const selectedSeasonLabel = useMemo(() => {
    if (!selectedSeasonId) {
      return t('common.allSeasons');
    }
    return seasons.find((season) => season.id === selectedSeasonId)?.label ?? '-';
  }, [seasons, selectedSeasonId, t]);

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
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg border border-gray-500 text-gray-400 hover:border-[#daaa00] hover:text-[#daaa00] transition"
              >
                {t('common.back')}
              </button>
              {playerNumber && playerName && (
                isPinned(playerNumber, playerName) ? (
                  <button
                    type="button"
                    onClick={() => unpinPlayer()}
                    className="px-4 py-2 rounded-lg border border-gray-500 text-gray-400 hover:border-[#daaa00] hover:text-[#daaa00] transition"
                  >
                    {t('player.unpinStats')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => pinPlayer(playerNumber, playerName)}
                    className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
                  >
                    {t('player.pinStats')}
                  </button>
                )
              )}
              <Link
                to="/roster"
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.activeRoster')}
              </Link>
              <Link
                to="/"
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.home')}
              </Link>
              {playerNumber && playerName && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {shareCopied ? t('player.shareCopied') : t('player.share')}
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
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-700 rounded w-8 mb-2" />
                  <div className="h-6 bg-gray-700 rounded w-12" />
                </div>
              ))}
            </div>
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
          <div className="flex items-center gap-2 mb-4">
            <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
            <h2 className={`text-xl font-bold tracking-wide ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.careerPitching')}</h2>
            {!isActive && <span className="text-xs text-gray-400 ml-2">(Inactive)</span>}
          </div>
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-700 rounded w-8 mb-2" />
                  <div className="h-6 bg-gray-700 rounded w-12" />
                </div>
              ))}
            </div>
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

        <section className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-8 ${isActive ? 'border-[#daaa00]' : 'border-gray-500'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
            <h2 className={`text-xl font-bold tracking-wide ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.gameBattingStats')}</h2>
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
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm text-white border-collapse min-w-[600px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.date')}</th>
                    <th className="py-2 px-2 text-left sticky left-[5rem] z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.opponent')}</th>
                    <th className="py-2 px-2">{t('common.score')}</th>
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
                  {gameStats.map((record) => (
                    <tr key={record.game_id} className="border-b border-gray-700">
                      <td className="py-2 px-2 text-left text-[#daaa00] sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{new Date(record.game_date).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}</td>
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
          )}
        </section>

        <section className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 mt-6 ${isActive ? 'border-[#daaa00]' : 'border-gray-500'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className={`w-6 h-6 ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`} />
            <h2 className={`text-xl font-bold ${isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>{t('player.gamePitchingStats')}</h2>
          </div>
          {!playerNumber || !playerName ? (
            <div className="text-center text-gray-400">{t('player.notFound')}</div>
          ) : loading ? (
            <TableSkeleton rows={5} cols={13} />
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
            <div className="text-center text-gray-400">{t('player.noGameRecords')}</div>
          ) : (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm text-white border-collapse min-w-[600px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.date')}</th>
                    <th className="py-2 px-2 text-left sticky left-[5rem] z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">{t('common.opponent')}</th>
                    <th className="py-2 px-2">{t('common.score')}</th>
                    <th className="py-2 px-2">IP</th>
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
                    <tr key={record.game_id} className="border-b border-gray-700">
                      <td className="py-2 px-2 text-left text-[#daaa00] sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[5rem]">
                        {new Date(record.game_date).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
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
