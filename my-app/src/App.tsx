import { useEffect, useMemo, useState } from 'react';
import { Calculator, Download } from 'lucide-react';
import { PointTable } from './components/PointTable';
import TopPlayersChart from './components/TopPlayersChart.tsx';
import { StatTooltip } from './components/StatTooltip.tsx';
import Header from './components/Header';
import Footer from './components/Footer';
import logo from './assets/logo.png';
import API_BASE_URL from './apiBaseUrl';
import { useLanguage } from './i18n/LanguageContext';

type Season = {
  id: number;
  label: string;
  manager?: string;
}

type BattingStatsApiRow = {
  jersey_number: number | string;
  first_name: string;
  last_name: string;
  games_played?: number;
  total_games?: number;
  gamesPlayed?: number;
  total_ops?: number;
  total_pa: number;
  total_ab: number;
  total_1b: number;
  total_2b: number;
  total_3b: number;
  total_hr: number;
  total_runs: number;
  total_rbi: number;
  total_bb: number;
  total_hbp: number;
  total_strikeouts: number;
  total_sb: number;
  total_batting_points: number;
  season_owar?: number;
  is_active?: number;
};

type BattingRecord = {
  id: string;
  playerNumber: string;
  playerName: string;
  gamesPlayed: number;
  ops?: number;
  plateAppearances: number;
  atBats: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  stolenBases: number;
  isMVP: boolean;
  war: string;
  isActive: boolean;
  /** Season total from DB (sum of per-game batting_points); preferred for Score display */
  score?: number;
};

type GameRecord = {
  game_id: number;
  game_date: string;
};

type PitchingStatsApiRow = {
  jersey_number: number | string;
  first_name: string;
  last_name: string;
  games_played?: number;
  ip?: number | string | null;
  innings_pitched?: number | string | null;
  total_wins?: number;
  total_k?: number;
  total_runs_allowed?: number;
  total_er?: number;
  total_h?: number;
  total_bb?: number;
  total_hbp?: number;
  total_pitches_thrown?: number;
  era?: number;
  whip?: number;
  total_pitching_points?: number;
  is_active?: number;
};

type PitchingRecord = {
  id: string;
  playerNumber: string;
  playerName: string;
  gamesPlayed?: number;
  inningsPitched?: number | string;
  wins?: number;
  strikeouts?: number;
  runsAllowed?: number;
  earnedRuns?: number;
  hitsAllowed?: number;
  walks?: number;
  hitByPitch?: number;
  pitchCount?: number;
  era?: number | string;
  whip?: number | string;
  score?: number;
  isActive: boolean;
};

const mapApiNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
};

/** Baseball IP from API: "7.2" = 7 innings + 2 outs (matches MySQL concat of outs). */
function outsFromBaseballIpDisplay(ip: string | number | null | undefined): number {
  if (ip === null || ip === undefined || ip === '') return 0;
  const s = String(ip).trim();
  const dot = s.indexOf('.');
  if (dot === -1) {
    const n = Number(s);
    return Number.isFinite(n) ? n * 3 : 0;
  }
  const whole = Number(s.slice(0, dot)) || 0;
  const afterDot = s.slice(dot + 1);
  const fracDigit = afterDot.length ? Number(afterDot[0]) : 0;
  const outsPartial = fracDigit >= 0 && fracDigit <= 2 ? fracDigit : 0;
  return whole * 3 + outsPartial;
}

function calculatePitchingScoreKorebaps(record: PitchingRecord): number {
  const outs = outsFromBaseballIpDisplay(record.inningsPitched);
  const innings = outs / 3;
  let score = 0;
  score += innings * 1;
  score += (record.wins ?? 0) * 5;
  score += (record.strikeouts ?? 0) * 2;
  score -= (record.earnedRuns ?? 0) * 0.5;
  if (record.isMVP) score += 5;
  return score;
}

function calculateBattingScoreKorebaps(record: BattingRecord): number {
  let score = 0;
  score += (record.singles ?? 0) * 1;
  score += (record.doubles ?? 0) * 2;
  score += (record.triples ?? 0) * 3;
  score += (record.homeRuns ?? 0) * 5;
  score += (record.runs ?? 0) * 1;
  score += (record.rbi ?? 0) * 2;
  score += (record.walks ?? 0) * 0.5;
  score += (record.hitByPitch ?? 0) * 0.5;
  score += (record.stolenBases ?? 0) * 1;
  if (record.isMVP) score += 5;
  return score;
}


function MainDashboard() {
  const { t, lang } = useLanguage();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [battingRecords, setBattingRecords] = useState<BattingRecord[]>([]);
  const [battingLoading, setBattingLoading] = useState(true);
  const [battingError, setBattingError] = useState<string | null>(null);
  const [battingSort, setBattingSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  );
  const [pitchingSort, setPitchingSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  );
  const [pitchingRecords, setPitchingRecords] = useState<PitchingRecord[]>([]);
  const [pitchingLoading, setPitchingLoading] = useState(true);
  const [pitchingError, setPitchingError] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showInactivePlayers, setShowInactivePlayers] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [latestGameDate, setLatestGameDate] = useState<string | null>(null);


  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/seasons`);
        const data = await response.json();

        if (!Array.isArray(data)) {
          setSeasons([]);
          return;
        }

        setSeasons(data);

        if (data.length > 0) {
          setSelectedSeasonId((current) => (current === null ? null : current ?? data[0].id));
        }
      } catch (error) {
        console.error('Failed to fetch seasons', error);
      }
    };

    fetchSeasons();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadLatestGame = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedSeasonId) {
          params.set('seasonId', String(selectedSeasonId));
        }

        const response = await fetch(`${API_BASE_URL}/api/games?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Games API error: ${response.status}`);
        }
        const data = (await response.json()) as GameRecord[];
        const latest = data
          .map((g) => g.game_date)
          .filter(Boolean)
          .map((d) => ({ raw: d, time: new Date(d).getTime() }))
          .filter((d) => !Number.isNaN(d.time))
          .sort((a, b) => b.time - a.time)[0]?.raw;

        setLatestGameDate(latest ?? null);
      } catch (e) {
        setLatestGameDate(null);
      }
    };

    loadLatestGame();
  }, [selectedSeasonId]);

    const handleCurrentSeasonClick = () => {
      if (seasons.length > 0) {
        setSelectedSeasonId(seasons[0].id);
      }
    };


  useEffect(() => {
    const loadBattingStats = async () => {
      try {
        setBattingLoading(true);
        setBattingError(null);

        const battingParams = new URLSearchParams();
        if (selectedSeasonId) {
          battingParams.set('seasonId', String(selectedSeasonId));
        }
        const response = await fetch(
          `${API_BASE_URL}/api/seasonal-batting-stats?${battingParams.toString()}`,
        );
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as BattingStatsApiRow[];
        const mapped = data.map((row) => ({
          id: `${row.jersey_number}-${row.first_name}-${row.last_name}`,
          playerNumber: String(row.jersey_number),
          playerName: `${row.first_name} ${row.last_name}`.trim(),
          gamesPlayed: mapApiNumber(row.games_played ?? row.total_games ?? row.gamesPlayed),
          ops: typeof row.total_ops === 'number' ? row.total_ops : undefined,
          plateAppearances: mapApiNumber(row.total_pa),
          atBats: mapApiNumber(row.total_ab),
          singles: mapApiNumber(row.total_1b),
          doubles: mapApiNumber(row.total_2b),
          triples: mapApiNumber(row.total_3b),
          homeRuns: mapApiNumber(row.total_hr),
          runs: mapApiNumber(row.total_runs),
          rbi: mapApiNumber(row.total_rbi),
          walks: mapApiNumber(row.total_bb),
          hitByPitch: mapApiNumber(row.total_hbp),
          strikeouts: mapApiNumber(row.total_strikeouts),
          stolenBases: mapApiNumber(row.total_sb),
          isMVP: false,
          war: row.season_owar ? Number(row.season_owar).toFixed(3) : '0.000',
          isActive: row.is_active === 1,
          score: mapApiNumber(row.total_batting_points),
        }));

        setBattingRecords(mapped);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setBattingError(message);
      } finally {
        setBattingLoading(false);
      }
    };

    loadBattingStats();
  }, [selectedSeasonId]);

  useEffect(() => {
    const loadPitchingStats = async () => {
      try {
        setPitchingLoading(true);
        setPitchingError(null);

        const pitchingParams = new URLSearchParams();
        if (selectedSeasonId) {
          pitchingParams.set('seasonId', String(selectedSeasonId));
        }
        const response = await fetch(
          `${API_BASE_URL}/api/seasonal-pitching-stats?${pitchingParams.toString()}`,
        );
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as PitchingStatsApiRow[];
        const mapped = data.map((row) => ({
          id: `${row.jersey_number}-${row.first_name}-${row.last_name}`,
          playerNumber: String(row.jersey_number),
          playerName: `${row.first_name} ${row.last_name}`.trim(),
          gamesPlayed: mapApiNumber(row.games_played),
          inningsPitched: row.ip ?? row.innings_pitched,
          wins: mapApiNumber(row.total_wins),
          strikeouts: mapApiNumber(row.total_k),
          runsAllowed: mapApiNumber(row.total_runs_allowed),
          earnedRuns: mapApiNumber(row.total_er),
          hitsAllowed: mapApiNumber(row.total_h),
          walks: mapApiNumber(row.total_bb),
          hitByPitch: mapApiNumber(row.total_hbp),
          pitchCount: mapApiNumber(row.total_pitches_thrown),
          era: mapApiNumber(row.era),
          whip: mapApiNumber(row.whip),
          score: mapApiNumber(row.total_pitching_points),
          isActive: row.is_active === 1,
        }));

        setPitchingRecords(mapped);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setPitchingError(message);
      } finally {
        setPitchingLoading(false);
      }
    };

    loadPitchingStats();
  }, [selectedSeasonId]);

  const calculateBattingAvg = (record: BattingRecord) => {
    if (!record.atBats) return '-.---';
    const hits =
      (record.singles ?? 0) +
      (record.doubles ?? 0) +
      (record.triples ?? 0) +
      (record.homeRuns ?? 0);
    return (hits / record.atBats).toFixed(3);
  };

  const calculateOBP = (record: BattingRecord) => {
    if (!record.plateAppearances) return '-.---';
    const hits =
      (record.singles ?? 0) +
      (record.doubles ?? 0) +
      (record.triples ?? 0) +
      (record.homeRuns ?? 0);
    return (
      (hits + (record.walks ?? 0) + (record.hitByPitch ?? 0)) / record.plateAppearances
    ).toFixed(3);
  };

  const calculateSLG = (record: BattingRecord) => {
    if (!record.atBats) return '-.---';
    const totalBases =
      (record.singles ?? 0) +
      (record.doubles ?? 0) * 2 +
      (record.triples ?? 0) * 3 +
      (record.homeRuns ?? 0) * 4;
    return (totalBases / record.atBats).toFixed(3);
  };

  const calculateOPS = (record: BattingRecord) => {
    if (typeof record.ops === 'number') return record.ops.toFixed(3);
    if (!record.plateAppearances || !record.atBats) return '-.---';
    const hits =
      (record.singles ?? 0) +
      (record.doubles ?? 0) +
      (record.triples ?? 0) +
      (record.homeRuns ?? 0);
    const obp = (hits + (record.walks ?? 0) + (record.hitByPitch ?? 0)) / record.plateAppearances;
    const totalBases =
      (record.singles ?? 0) +
      (record.doubles ?? 0) * 2 +
      (record.triples ?? 0) * 3 +
      (record.homeRuns ?? 0) * 4;
    const slg = totalBases / record.atBats;
    return (obp + slg).toFixed(3);
  };

  const calculateBattingScore = (record: BattingRecord) => calculateBattingScoreKorebaps(record);

  const calculatePitchingScore = (record: PitchingRecord) =>
    calculatePitchingScoreKorebaps(record);



  const getCurrentSeasonId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let label = `${year} Spring`;

    if (month >= 9) {
      label = `${year} Fall`;
    } else if (month <= 2) {
      label = `${year - 1} Fall`;
    }

    return seasons.find((season) => season.label === label)?.id ?? seasons[0]?.id ?? 1;
  };

  const battingRows = useMemo(() =>
    battingRecords.map((record) => ({
      ...record,
      avg: calculateBattingAvg(record),
      obp: calculateOBP(record),
      slg: calculateSLG(record),
      ops: calculateOPS(record),
      score: record.score ?? calculateBattingScore(record),
    })),
  [battingRecords]);

  const pitchingRows = useMemo(() =>
    pitchingRecords.map((record) => ({
      ...record,
      score: record.score ?? calculatePitchingScore(record),
    })),
  [pitchingRecords]);

  const filteredBattingRows = useMemo(() => {
    let rows = showInactivePlayers ? battingRows : battingRows.filter(row => row.isActive);
    const q = playerSearchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.playerName.toLowerCase().includes(q) ||
          String(r.playerNumber).toLowerCase().includes(q),
      );
    }
    return rows;
  }, [battingRows, showInactivePlayers, playerSearchQuery]);

  const filteredPitchingRows = useMemo(() => {
    let rows = showInactivePlayers ? pitchingRows : pitchingRows.filter(row => row.isActive);
    const q = playerSearchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.playerName.toLowerCase().includes(q) ||
          String(r.playerNumber).toLowerCase().includes(q),
      );
    }
    return rows;
  }, [pitchingRows, showInactivePlayers, playerSearchQuery]);

  const sortedBattingRecords = useMemo(() => {
    if (!battingSort) return filteredBattingRows;
    const { key, direction } = battingSort;
    const sorted = [...filteredBattingRows].sort((a, b) => {
      const aValue = a[key as keyof typeof a];
      const bValue = b[key as keyof typeof b];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aNumber = Number(aValue);
        const bNumber = Number(bValue);
        if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
          return aNumber - bNumber;
        }
        return aValue.localeCompare(bValue);
      }
      return Number(aValue) - Number(bValue);
    });
    return direction === 'asc' ? sorted : sorted.reverse();
  }, [filteredBattingRows, battingSort]);

  const sortedPitchingRecords = useMemo(() => {
    if (!pitchingSort) return filteredPitchingRows;
    const { key, direction } = pitchingSort;
    const sorted = [...filteredPitchingRows].sort((a, b) => {
      const aValue = a[key as keyof typeof a];
      const bValue = b[key as keyof typeof b];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aNumber = Number(aValue);
        const bNumber = Number(bValue);
        if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
          return aNumber - bNumber;
        }
        return aValue.localeCompare(bValue);
      }
      return Number(aValue) - Number(bValue);
    });
    return direction === 'asc' ? sorted : sorted.reverse();
  }, [filteredPitchingRows, pitchingSort]);

  const renderSortHeader = (
    label: string | React.ReactNode,
    key: string,
    activeSort: { key: string; direction: 'asc' | 'desc' } | null,
    onChange: (nextSort: { key: string; direction: 'asc' | 'desc' }) => void,
    align: 'left' | 'center' = 'center',
    tooltipAbbr?: string,
  ) => {
    const isActive = activeSort?.key === key;
    const nextDirection = isActive && activeSort?.direction === 'asc' ? 'desc' : 'asc';
    const icon = !isActive ? '↕' : activeSort?.direction === 'asc' ? '▲' : '▼';
    const displayLabel = tooltipAbbr ? <StatTooltip abbr={tooltipAbbr}>{label}</StatTooltip> : label;
    return (
      <button
        type="button"
        onClick={() => onChange({ key, direction: nextDirection })}
        className={`inline-flex items-center gap-1 text-xs font-semibold text-gray-200 hover:text-white ${
          align === 'left' ? '' : 'justify-center'
        }`}
      >
        <span>{displayLabel}</span>
        <span className="text-[#daaa00]">{icon}</span>
      </button>
    );
  };

  const renderStatValue = (value?: number | string | null) =>
    value === null || value === undefined || value === '' ? '-' : value;

  const downloadBattingCSV = () => {
    const seasonLabel = selectedSeasonId ? seasons.find((s) => s.id === selectedSeasonId)?.label ?? 'All' : 'All';
    const headers = ['#', 'Player', ...(selectedSeasonId ? ['G'] : []), 'PA', 'AB', '1B', '2B', '3B', 'HR', 'R', 'RBI', 'BB', 'HBP', 'SO', 'SB', 'AVG', 'OBP', 'SLG', 'OPS', ...(selectedSeasonId ? ['WAR'] : []), 'Score'];
    let csv = headers.join(',') + '\n';
    sortedBattingRecords.forEach((r) => {
      const row = [
        r.playerNumber,
        `"${(r.playerName || '').replace(/"/g, '""')}"`,
        ...(selectedSeasonId ? [r.gamesPlayed ?? ''] : []),
        r.plateAppearances ?? '',
        r.atBats ?? '',
        r.singles ?? '',
        r.doubles ?? '',
        r.triples ?? '',
        r.homeRuns ?? '',
        r.runs ?? '',
        r.rbi ?? '',
        r.walks ?? '',
        r.hitByPitch ?? '',
        r.strikeouts ?? '',
        r.stolenBases ?? '',
        r.avg ?? '',
        r.obp ?? '',
        r.slg ?? '',
        r.ops ?? '',
        ...(selectedSeasonId ? [r.war ?? ''] : []),
        r.score ?? '',
      ];
      csv += row.join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `batting_${seasonLabel.replace(/\s/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadPitchingCSV = () => {
    const seasonLabel = selectedSeasonId ? seasons.find((s) => s.id === selectedSeasonId)?.label ?? 'All' : 'All';
    const headers = ['#', 'Player', 'G', 'IP', 'W', 'K', 'RA', 'ER', 'H', 'BB', 'Pitches', 'ERA', 'WHIP', 'Score'];
    let csv = headers.join(',') + '\n';
    sortedPitchingRecords.forEach((r) => {
      csv += [
        r.playerNumber,
        `"${(r.playerName || '').replace(/"/g, '""')}"`,
        r.gamesPlayed ?? '',
        r.inningsPitched ?? '',
        r.wins ?? '',
        r.strikeouts ?? '',
        r.runsAllowed ?? '',
        r.earnedRuns ?? '',
        r.hitsAllowed ?? '',
        r.walks ?? '',
        r.pitchCount ?? '',
        r.era ?? '',
        r.whip ?? '',
        r.score ?? '',
      ].join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pitching_${seasonLabel.replace(/\s/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const carouselImages = [
    '/carousel-1.JPG',
    '/carousel-2.jpg',
    '/carousel-3.jpg',
    '/carousel-4.jpg',
    '/carousel-5.jpg',
    '/carousel-6.JPG',
    '/carousel-7.JPG',
    '/carousel-8.jpg',
  ];

  const handleCarouselPrev = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const handleCarouselNext = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="relative max-w-7xl mx-auto p-4 md:p-8 w-full overflow-x-hidden">
        <Header
          logoSrc={logo}
          title={t('app.title')}
          subtitle={t('app.subtitle')}
          stats={[
            {
              label: t('app.latestGame'),
              value: latestGameDate ? new Date(latestGameDate).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US') : '-',
            },
            { label: t('app.registeredPlayers'), value: `${battingRecords.length}${t('suffix.players')}` },
          ]}
          showMyStatsCard
          social={(
            <>
              <a
                href="https://www.youtube.com/@Korebaps"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition flex items-center justify-center"
                title="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/purdue_korebaps/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition flex items-center justify-center"
                title="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </>
          )}
          action={(
            <>
              <button
                onClick={() => { window.location.href = '/media'; }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm"
              >
                {t('common.videos')}
              </button>
              <button
                onClick={() => { window.location.href = '/roster'; }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm"
              >
                {t('common.roster')}
              </button>
              <button
                onClick={() => { window.location.href = '/games'; }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm"
              >
                {t('common.gameRecords')}
              </button>
              <button
                onClick={() => { window.location.href = '/compare'; }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm"
              >
                {t('common.comparePlayers')}
              </button>
            </>
          )}
        />

        <section className="relative overflow-hidden rounded-2xl border-2 border-[#daaa00] bg-gray-900 shadow-lg mb-6">
          <div className="relative h-64 w-full sm:h-80 md:h-96">
            {carouselImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`Korebaps carousel ${index + 1}`}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  index === carouselIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
          <button
            type="button"
            onClick={handleCarouselPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/40 px-3 py-2 text-2xl text-white transition hover:border-[#daaa00] hover:text-[#daaa00]"
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleCarouselNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/40 px-3 py-2 text-2xl text-white transition hover:border-[#daaa00] hover:text-[#daaa00]"
            aria-label="Next slide"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            {carouselImages.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                onClick={() => setCarouselIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === carouselIndex ? 'bg-[#daaa00]' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6">
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-4 border-2 border-[#daaa00]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#daaa00]">{t('app.seasonSelect')}</h2>
              </div>
              {/* Season Select Section */}
<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
  <div className="w-full sm:w-56">
    <select
      value={selectedSeasonId ?? ''}
      onChange={(event) => {
        const value = event.target.value;
        setSelectedSeasonId(value ? Number(value) : null);
      }}
      className="w-full rounded-lg border-2 border-[#daaa00] bg-gray-800 px-3 py-2 text-sm text-white focus:border-[#daaa00] focus:outline-none focus:ring-2 focus:ring-[#daaa00]"
    >
      {/* Show Loading if empty */}
      {seasons.length === 0 && <option>{t('app.loadingSeasons')}</option>}

      <option value="">{t('common.allSeasons')}</option>
      
      {/* Map through real data */}
      {seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {season.label}
        </option>
      ))}
    </select>
  </div>
  
  <button
    type="button"
    onClick={handleCurrentSeasonClick} // Updated function
    className="w-full rounded-lg border-2 border-[#daaa00] px-3 py-2 text-sm font-semibold text-[#daaa00] transition hover:bg-[#daaa00] hover:text-black sm:w-auto"
  >
    {t('common.currentSeason')}
  </button>
  
  <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
    <input
      type="checkbox"
      checked={showInactivePlayers}
      onChange={(e) => setShowInactivePlayers(e.target.checked)}
      className="accent-[#daaa00]"
    />
    {t('app.includeRetired')}
  </label>
  <input
    type="search"
    placeholder={t('app.searchPlayer')}
    value={playerSearchQuery}
    onChange={(e) => setPlayerSearchQuery(e.target.value)}
    className="w-full sm:w-48 rounded-lg border-2 border-[#daaa00] bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#daaa00] focus:outline-none focus:ring-2 focus:ring-[#daaa00]"
    aria-label={t('app.searchPlayer')}
  />
</div>
            </div>
          </section>
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calculator className="w-6 h-6 text-[#daaa00]" />
                <h2 className="text-xl font-bold text-[#daaa00]">{t('app.battingStats')}</h2>
              </div>
              {sortedBattingRecords.length > 0 && (
                <button
                  type="button"
                  onClick={downloadBattingCSV}
                  className="px-3 py-1.5 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('common.exportCSV')}
                </button>
              )}
            </div>
            {battingLoading ? (
              <div className="text-center text-gray-400">{t('common.loading')}</div>
            ) : battingError ? (
              <div className="text-center text-red-500">{battingError}</div>
            ) : (
              <div className="overflow-x-auto -mx-2 md:mx-0">
                <table className="w-full text-sm text-white border-collapse min-w-[640px]">
                  <thead className="text-xs text-gray-300">
                    <tr className="border-b border-[#daaa00]">
                      <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)]">
                        {renderSortHeader('#', 'playerNumber', battingSort, setBattingSort, 'left')}
                      </th>
                      <th className="py-2 px-2 text-left sticky left-[2.5rem] z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[6rem]">
                        {renderSortHeader(t('common.player'), 'playerName', battingSort, setBattingSort, 'left')}
                      </th>
                      {selectedSeasonId && (
                        <th className="py-2 px-2 text-left">
                          {renderSortHeader('G', 'gamesPlayed', battingSort, setBattingSort, 'left', 'G')}
                        </th>
                      )}
                      <th className="py-2 px-2">
                        {renderSortHeader('PA', 'plateAppearances', battingSort, setBattingSort, 'center', 'PA')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('AB', 'atBats', battingSort, setBattingSort, 'center', 'AB')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('1B', 'singles', battingSort, setBattingSort, 'center', '1B')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('2B', 'doubles', battingSort, setBattingSort, 'center', '2B')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('3B', 'triples', battingSort, setBattingSort, 'center', '3B')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('HR', 'homeRuns', battingSort, setBattingSort, 'center', 'HR')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('R', 'runs', battingSort, setBattingSort, 'center', 'R')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('RBI', 'rbi', battingSort, setBattingSort, 'center', 'RBI')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('BB', 'walks', battingSort, setBattingSort, 'center', 'BB')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('HBP', 'hitByPitch', battingSort, setBattingSort, 'center', 'HBP')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('SO', 'strikeouts', battingSort, setBattingSort, 'center', 'SO')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('SB', 'stolenBases', battingSort, setBattingSort, 'center', 'SB')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('AVG', 'avg', battingSort, setBattingSort, 'center', 'AVG')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('OBP', 'obp', battingSort, setBattingSort, 'center', 'OBP')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('SLG', 'slg', battingSort, setBattingSort, 'center', 'SLG')}
                      </th>
                      <th className="py-2 px-2">
                        {renderSortHeader('OPS', 'ops', battingSort, setBattingSort, 'center', 'OPS')}
                      </th>
                      {selectedSeasonId && (
                        <th className="py-2 px-2">
                          {renderSortHeader('WAR', 'war', battingSort, setBattingSort, 'center', 'WAR')}
                        </th>
                      )}
                      <th className="py-2 px-2">
                        {renderSortHeader('Score', 'score', battingSort, setBattingSort, 'center', 'Score')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBattingRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={`border-b border-gray-700 transition-colors hover:bg-[#daaa00]/10 ${!record.isActive ? 'opacity-70' : ''}`}
                      >
                        <td className={`py-2 px-2 text-left sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                          <button
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams({ playerNumber: record.playerNumber, playerName: record.playerName });
                              if (selectedSeasonId != null) params.set('seasonId', String(selectedSeasonId));
                              window.location.href = `/player?${params.toString()}`;
                            }}
                            className={`font-semibold ${record.isActive ? 'hover:text-white' : 'hover:text-gray-400'}`}
                          >
                            {record.playerNumber}
                          </button>
                        </td>
                        <td className={`py-2 px-2 text-left sticky left-[2.5rem] z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[6rem] font-semibold ${!record.isActive ? 'text-gray-400' : ''}`}>
                          <button
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams({ playerNumber: record.playerNumber, playerName: record.playerName });
                              if (selectedSeasonId != null) params.set('seasonId', String(selectedSeasonId));
                              window.location.href = `/player?${params.toString()}`;
                            }}
                            className={record.isActive ? 'hover:text-white' : 'hover:text-gray-400'}
                          >
                            {record.playerName}
                          </button>
                        </td>
                        {selectedSeasonId && (
                          <td className={`py-2 px-2 text-left ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                            {renderStatValue(record.gamesPlayed)}
                          </td>
                        )}
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.plateAppearances)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.atBats)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.singles)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.doubles)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.triples)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.homeRuns)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.runs)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.rbi)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.walks)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.hitByPitch)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.strikeouts)}
                        </td>
                        <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                          {renderStatValue(record.stolenBases)}
                        </td>
                        <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                          {renderStatValue(record.avg)}
                        </td>
                        <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                          {renderStatValue(record.obp)}
                        </td>
                        <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                          {renderStatValue(record.slg)}
                        </td>
                        <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                          {renderStatValue(record.ops)}
                        </td>
                        {selectedSeasonId && (
                          <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                            {renderStatValue(record.war)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center font-bold text-black">
                          <span className={`rounded px-2 py-1 inline-block ${record.isActive ? 'bg-[#daaa00]' : 'bg-gray-500'}`}>
                            {record.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calculator className="w-6 h-6 text-[#daaa00]" />
                <h2 className="text-xl font-bold text-[#daaa00]">{t('app.pitchingStats')}</h2>
              </div>
              {sortedPitchingRecords.length > 0 && (
                <button
                  type="button"
                  onClick={downloadPitchingCSV}
                  className="px-3 py-1.5 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('common.exportCSV')}
                </button>
              )}
            </div>
            {pitchingLoading ? (
              <div className="text-center text-gray-400">{t('common.loading')}</div>
            ) : pitchingError ? (
              <div className="text-center text-red-500">{pitchingError}</div>
            ) : (
              <div className="overflow-x-auto -mx-2 md:mx-0">
                <table className="w-full text-sm text-white border-collapse min-w-[640px]">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left sticky left-0 z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)]">
                      {renderSortHeader('#', 'playerNumber', pitchingSort, setPitchingSort, 'left')}
                    </th>
                    <th className="py-2 px-2 text-left sticky left-[2.5rem] z-20 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[6rem]">
                      {renderSortHeader(t('common.player'), 'playerName', pitchingSort, setPitchingSort, 'left')}
                    </th>
                    {selectedSeasonId && (
                      <th className="py-2 px-2 text-left">
                        {renderSortHeader('G', 'gamesPlayed', pitchingSort, setPitchingSort, 'left', 'G')}
                      </th>
                    )}
                    <th className="py-2 px-2">
                      {renderSortHeader('IP', 'inningsPitched', pitchingSort, setPitchingSort, 'center', 'IP')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('Win', 'wins', pitchingSort, setPitchingSort, 'center', 'W')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('K', 'strikeouts', pitchingSort, setPitchingSort, 'center', 'SO')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader(t('app.runsAllowed'), 'runsAllowed', pitchingSort, setPitchingSort, 'center', 'RA')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader(t('app.earnedRuns'), 'earnedRuns', pitchingSort, setPitchingSort, 'center', 'ER')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('H', 'hitsAllowed', pitchingSort, setPitchingSort, 'center', 'H')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('BB', 'walks', pitchingSort, setPitchingSort, 'center', 'BB')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader(t('app.pitchCount'), 'pitchCount', pitchingSort, setPitchingSort, 'center', 'Pitches')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('ERA', 'era', pitchingSort, setPitchingSort, 'center', 'ERA')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('WHIP', 'whip', pitchingSort, setPitchingSort, 'center', 'WHIP')}
                    </th>
                    <th className="py-2 px-2">
                      {renderSortHeader('Point', 'score', pitchingSort, setPitchingSort, 'center', 'Point')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPitchingRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`border-b border-gray-700 transition-colors hover:bg-[#daaa00]/10 ${!record.isActive ? 'opacity-70' : ''}`}
                    >
                      <td className={`py-2 px-2 text-left sticky left-0 z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({ playerNumber: record.playerNumber, playerName: record.playerName });
                            if (selectedSeasonId != null) params.set('seasonId', String(selectedSeasonId));
                            window.location.href = `/player?${params.toString()}`;
                          }}
                          className={`font-semibold ${record.isActive ? 'hover:text-white' : 'hover:text-gray-400'}`}
                        >
                          {record.playerNumber}
                        </button>
                      </td>
                      <td className={`py-2 px-2 text-left sticky left-[2.5rem] z-10 bg-gray-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] min-w-[6rem] font-semibold ${!record.isActive ? 'text-gray-400' : ''}`}>
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({ playerNumber: record.playerNumber, playerName: record.playerName });
                            if (selectedSeasonId != null) params.set('seasonId', String(selectedSeasonId));
                            window.location.href = `/player?${params.toString()}`;
                          }}
                          className={record.isActive ? 'hover:text-white' : 'hover:text-gray-400'}
                        >
                          {record.playerName}
                        </button>
                      </td>
                      {selectedSeasonId && (
                        <td className={`py-2 px-2 text-left ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                          {renderStatValue(record.gamesPlayed)}
                        </td>
                      )}
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.inningsPitched)}
                      </td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>{renderStatValue(record.wins)}</td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.strikeouts)}
                      </td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.runsAllowed)}
                      </td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.earnedRuns)}
                      </td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.hitsAllowed)}
                      </td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.walks)}
                      </td>
                      <td className={`py-2 px-2 text-center ${!record.isActive ? 'text-gray-400' : ''}`}>
                        {renderStatValue(record.pitchCount)}
                      </td>
                      <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                        {renderStatValue(record.era)}
                      </td>
                      <td className={`py-2 px-2 text-center ${record.isActive ? 'text-[#daaa00]' : 'text-gray-400'}`}>
                        {renderStatValue(record.whip)}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-black">
                        <span className={`rounded px-2 py-1 inline-block ${record.isActive ? 'bg-[#daaa00]' : 'bg-gray-500'}`}>
                          {record.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>

          {!battingLoading && !pitchingLoading && !battingError && !pitchingError && (
            <TopPlayersChart
              battingRecords={sortedBattingRecords}
              pitchingRecords={sortedPitchingRecords}
            />
          )}
        </div>

        <PointTable />
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => {
              window.location.href = '/admin';
            }}
            className="px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-[#daaa00] hover:text-[#daaa00] transition text-sm"
          >
            {t('common.admin')}
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return <MainDashboard />;
}
