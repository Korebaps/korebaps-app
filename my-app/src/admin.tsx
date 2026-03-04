import { useState, useEffect } from 'react';
import { PlusCircle, Download, Trash2, Award } from 'lucide-react';
import { BattingRecordForm } from './components/BattingRecordForm';
import { PitchingRecordForm } from './components/PitchingRecordForm';
import { RecordSummary } from './components/RecordSummary';
import { PointTable } from './components/PointTable';
import { CsvUploadForm } from './components/CsvUploadForm.tsx';
import Header from './components/Header';
import Footer from './components/Footer';
import logo from './assets/logo.png';
import API_BASE_URL from './apiBaseUrl';

// --- CONFIGURATION ---

type Season = {
  id: number;
  label: string;
  manager?: string | null;
  managerPlayerId?: number | null;
  seasonYear?: number;
  seasonTerm?: string;
};

type GameRecord = {
  game_id: number;
  game_date: string;
  opponent: string;
  is_friendly: number;
  score: number | null;
  opp_score: number | null;
  batting_count?: number;
  pitching_count?: number;
};

type ActivePlayerOption = {
  id: number;
  label: string;
  jerseyNumber?: number;
  firstName?: string;
  lastName?: string;
};

type Player = {
  id: number;
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  isActive: number;
};

type WalkupSong = {
  song_id: number;
  player_id: number;
  song_title: string;
  artist_name: string;
  spotify_track_id: string | null;
  start_time_seconds: number;
  spotify_track_url?: string | null;
  album_art_url?: string | null;
};

export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  const [activeTab, setActiveTab] = useState('seasons');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');

  // New State for Dynamic Seasons
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  const [seasonYear, setSeasonYear] = useState<number>(new Date().getFullYear());
  const [seasonTerm, setSeasonTerm] = useState<string>('');
  const [seasonManagerPlayerId, setSeasonManagerPlayerId] = useState<number | null>(null);
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);

  const [activePlayers, setActivePlayers] = useState<ActivePlayerOption[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const [newPlayerFirstName, setNewPlayerFirstName] = useState('');
  const [newPlayerLastName, setNewPlayerLastName] = useState('');
  const [newPlayerJerseyNumber, setNewPlayerJerseyNumber] = useState('');
  const [newPlayerIsActive, setNewPlayerIsActive] = useState(true);
  const [playerSaving, setPlayerSaving] = useState(false);

  const [editingJerseyPlayerId, setEditingJerseyPlayerId] = useState<number | null>(null);
  const [editingJerseyValue, setEditingJerseyValue] = useState<string>('');

  const [editingNamePlayerId, setEditingNamePlayerId] = useState<number | null>(null);
  const [editingFirstName, setEditingFirstName] = useState<string>('');
  const [editingLastName, setEditingLastName] = useState<string>('');

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [walkupLoading, setWalkupLoading] = useState(false);
  const [walkupError, setWalkupError] = useState<string | null>(null);
  const [walkupSong, setWalkupSong] = useState<WalkupSong | null>(null);
  const [walkupSongTitle, setWalkupSongTitle] = useState('');
  const [walkupArtistName, setWalkupArtistName] = useState('');
  const [walkupSpotifyTrackId, setWalkupSpotifyTrackId] = useState('');
  const [walkupStartTimeSeconds, setWalkupStartTimeSeconds] = useState('0');

  const [games, setGames] = useState<GameRecord[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gameSaving, setGameSaving] = useState(false);
  const [gameIsFriendly, setGameIsFriendly] = useState(false);
  const [gameScore, setGameScore] = useState<string>('');
  const [gameOppScore, setGameOppScore] = useState<string>('');

  const [battingSelectedGameId, setBattingSelectedGameId] = useState<number | null>(null);
  const [battingSelectedPlayerId, setBattingSelectedPlayerId] = useState<number | null>(null);

  const [pitchingSelectedGameId, setPitchingSelectedGameId] = useState<number | null>(null);
  const [pitchingSelectedPlayerId, setPitchingSelectedPlayerId] = useState<number | null>(null);

  const [battingRecords, setBattingRecords] = useState<any[]>([]);
  const [pitchingRecords, setPitchingRecords] = useState<any[]>([]);

  const authFetch = (url: string, options?: RequestInit) => {
    const baseHeaders: Record<string, string> = {
      ...(options?.headers as Record<string, string> | undefined),
    };

    if (adminToken) {
      baseHeaders['X-Admin-Token'] = adminToken;
    }

    return fetch(url, {
      ...options,
      headers: baseHeaders,
    });
  };

  const validateAdminToken = async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/me`, {
      headers: {
        'X-Admin-Token': token,
      },
    });
    return response.ok;
  };

  const loginAdmin = async () => {
    try {
      setAdminAuthLoading(true);
      setAdminAuthError(null);

      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Login failed (${response.status})`);
      }

      const data = (await response.json()) as { token: string };
      localStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
      setAdminAuthed(true);
      setAdminPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setAdminAuthError(message);
      setAdminAuthed(false);
      setAdminToken(null);
      localStorage.removeItem('adminToken');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const logoutAdmin = async () => {
    try {
      if (adminToken) {
        await fetch(`${API_BASE_URL}/api/admin/logout`, {
          method: 'POST',
          headers: {
            'X-Admin-Token': adminToken,
          },
        });
      }
    } finally {
      localStorage.removeItem('adminToken');
      setAdminToken(null);
      setAdminAuthed(false);
    }
  };

  // 1. Fetch Seasons on Load
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        setSeasonError(null);

        const response = await authFetch(`${API_BASE_URL}/api/seasons`);
        if (!response.ok) throw new Error('Failed to fetch seasons');
        const data = await response.json();
        if (!Array.isArray(data)) {
          setSeasons([]);
          throw new Error('Seasons API returned invalid data');
        }
        setSeasons(data as Season[]);

        // Default to the most recent season
        if (data.length > 0) {
          setSelectedSeasonId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching seasons:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setSeasonError(message);
      }
    };
    if (adminAuthed) {
      fetchSeasons();
    }
  }, [adminAuthed]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setAdminAuthLoading(true);
        setAdminAuthError(null);
        const saved = localStorage.getItem('adminToken');
        if (!saved) {
          setAdminAuthed(false);
          setAdminToken(null);
          return;
        }

        const ok = await validateAdminToken(saved);
        if (!ok) {
          localStorage.removeItem('adminToken');
          setAdminAuthed(false);
          setAdminToken(null);
          return;
        }

        setAdminToken(saved);
        setAdminAuthed(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setAdminAuthError(message);
        setAdminAuthed(false);
        setAdminToken(null);
      } finally {
        setAdminAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const fetchActivePlayers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/active-players`);

        if (!response.ok) {
          throw new Error('Failed to fetch active players');
        }
        const data = (await response.json()) as ActivePlayerOption[];
        setActivePlayers(data);
      } catch {
        setActivePlayers([]);
      }
    };

    fetchActivePlayers();
  }, []);

  useEffect(() => {
    const loadGames = async () => {
      try {
        setGamesLoading(true);
        setGamesError(null);
        const url = selectedSeasonId
          ? `${API_BASE_URL}/api/games?${new URLSearchParams({ seasonId: String(selectedSeasonId) }).toString()}`
          : `${API_BASE_URL}/api/games`;
        const response = await authFetch(url);
        if (!response.ok) {
          throw new Error(`Games API error: ${response.status}`);
        }
        const data = (await response.json()) as GameRecord[];

        setGames(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setGamesError(message);
      } finally {
        setGamesLoading(false);
      }
    };

    if (adminAuthed && (activeTab === 'games' || activeTab === 'batting' || activeTab === 'pitching')) {
      loadGames();
    }
  }, [activeTab, selectedSeasonId, adminAuthed]);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setPlayersLoading(true);
        setPlayersError(null);
        const response = await authFetch(`${API_BASE_URL}/api/players`);
        if (!response.ok) {
          throw new Error(`Players API error: ${response.status}`);
        }
        const data = (await response.json()) as Player[];

        setPlayers(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setPlayersError(message);
      } finally {
        setPlayersLoading(false);
      }
    };

    if (adminAuthed && activeTab === 'players') {
      loadPlayers();
    }
  }, [activeTab, adminAuthed]);

  useEffect(() => {
    if (battingSelectedGameId) {
      loadBattingStatsForGame(battingSelectedGameId);
    }
  }, [battingSelectedGameId]);

  useEffect(() => {
    if (pitchingSelectedGameId) {
      loadPitchingStatsForGame(pitchingSelectedGameId);
    }
  }, [pitchingSelectedGameId]);

  useEffect(() => {
    const loadWalkupSong = async () => {
      if (!selectedPlayerId) {
        setWalkupSong(null);
        setWalkupSongTitle('');
        setWalkupArtistName('');
        setWalkupSpotifyTrackId('');
        setWalkupStartTimeSeconds('0');
        return;
      }

      try {
        setWalkupLoading(true);
        setWalkupError(null);
        const params = new URLSearchParams({ playerId: String(selectedPlayerId) });
        const response = await authFetch(`${API_BASE_URL}/api/player-walkup-song-by-id?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Walkup API error: ${response.status}`);
        }
        const data = (await response.json()) as WalkupSong | null;

        setWalkupSong(data);
        setWalkupSongTitle(data?.song_title ?? '');
        setWalkupArtistName(data?.artist_name ?? '');
        setWalkupSpotifyTrackId(data?.spotify_track_id ?? '');
        setWalkupStartTimeSeconds(String(data?.start_time_seconds ?? 0));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setWalkupError(message);
      } finally {
        setWalkupLoading(false);
      }
    };

    loadWalkupSong();
  }, [selectedPlayerId]);

  const loadBattingStatsForGame = async (gameId: number | null) => {
    if (!gameId) {
      setBattingRecords([]);
      return;
    }

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/game-batting-stats?${new URLSearchParams({ gameId: String(gameId) }).toString()}`,
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to load batting stats (${response.status})`);
      }
      const rows = (await response.json()) as any[];
      if (!Array.isArray(rows)) {
        setBattingRecords([]);
        return;
      }

      setBattingRecords(
        rows.map((row) => ({
          id: `${gameId}-${row.player_id}`,
          gameId,
          playerId: row.player_id,
          playerNumber: String(row.jersey_number ?? ''),
          playerName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
          plateAppearances: row.plate_appearances ?? 0,
          atBats: row.at_bats ?? 0,
          singles: row.singles ?? 0,
          doubles: row.doubles ?? 0,
          triples: row.triples ?? 0,
          homeRuns: row.home_runs ?? 0,
          runs: row.runs_scored ?? 0,
          rbi: row.rbi ?? 0,
          walks: row.walks ?? 0,
          hitByPitch: row.hit_by_pitch ?? 0,
          strikeouts: row.strikeouts ?? 0,
          stolenBases: row.stolen_bases ?? 0,
          caughtStealing: row.caught_stealing ?? 0,
          battingPoints: row.batting_points ?? 0,
          isMVP: false,
        })),
      );
    } catch {
      setBattingRecords([]);
    }
  };

  const saveBattingStats = async (gameId: number, playerId: number, record: any) => {
    const response = await authFetch(`${API_BASE_URL}/api/batting-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        playerId,
        plateAppearances: record.plateAppearances,
        atBats: record.atBats,
        singles: record.singles,
        doubles: record.doubles,
        triples: record.triples,
        homeRuns: record.homeRuns,
        runs: record.runs,
        rbi: record.rbi,
        walks: record.walks,
        hitByPitch: record.hitByPitch,
        strikeouts: record.strikeouts,
        stolenBases: record.stolenBases,
        caughtStealing: record.caughtStealing ?? 0,
        isMVP: record.isMVP ? 1 : 0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to save batting stats (${response.status})`);
    }
  };

  const loadPitchingStatsForGame = async (gameId: number | null) => {
    if (!gameId) {
      setPitchingRecords([]);
      return;
    }

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/game-pitching-stats?${new URLSearchParams({ gameId: String(gameId) }).toString()}`,
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to load pitching stats (${response.status})`);
      }
      const rows = (await response.json()) as any[];
      if (!Array.isArray(rows)) {
        setPitchingRecords([]);
        return;
      }

      setPitchingRecords(
        rows.map((row) => ({
          id: `${gameId}-${row.player_id}`,
          gameId,
          playerId: row.player_id,
          playerNumber: String(row.jersey_number ?? ''),
          playerName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
          inningsPitched: row.innings_pitched ?? '',
          wins: row.wins ?? 0,
          strikeouts: row.strikeouts ?? 0,
          runsAllowed: row.runs_allowed ?? 0,
          earnedRuns: row.earned_runs ?? 0,
          hitsAllowed: row.hits_allowed ?? 0,
          walks: row.walks ?? 0,
          hitByPitch: row.hit_by_pitch ?? 0,
          pitchCount: row.pitches_thrown ?? 0,
          pitchingPoints: row.pitching_points ?? 0,
          isMVP: false,
        })),
      );
    } catch {
      setPitchingRecords([]);
    }
  };

  const savePitchingStats = async (gameId: number, playerId: number, record: any) => {
    const response = await authFetch(`${API_BASE_URL}/api/pitching-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        playerId,
        outsRecorded: record.outsRecorded,
        pitchCount: record.pitchCount,
        hitsAllowed: record.hitsAllowed,
        runsAllowed: record.runsAllowed,
        earnedRuns: record.earnedRuns,
        strikeouts: record.strikeouts,
        walks: record.walks,
        hitByPitch: record.hitByPitch ?? 0,
        wins: record.wins,
        losses: record.losses ?? 0,
        saveEarned: record.saveEarned ?? 0,
        isMVP: record.isMVP ? 1 : 0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to save pitching stats (${response.status})`);
    }
  };

  const deleteBattingRecord = async (gameId: number | null, playerId: number | null) => {
    if (!gameId || !playerId) return;
    await authFetch(
      `${API_BASE_URL}/api/batting-stats?${new URLSearchParams({ gameId: String(gameId), playerId: String(playerId) }).toString()}`,
      { method: 'DELETE' },
    );
    await loadBattingStatsForGame(gameId);
  };

  const deletePitchingRecord = async (gameId: number | null, playerId: number | null) => {
    if (!gameId || !playerId) return;
    await authFetch(
      `${API_BASE_URL}/api/pitching-stats?${new URLSearchParams({ gameId: String(gameId), playerId: String(playerId) }).toString()}`,
      { method: 'DELETE' },
    );
    await loadPitchingStatsForGame(gameId);
  };

  const getCurrentSeasonLabel = () => {
    if (!selectedSeasonId) return 'All Seasons';
    const season = seasons.find((s) => s.id === selectedSeasonId);
    return season?.label ?? 'Unknown Season';
  };

  const addBattingRecord = async (record: any) => {
    if (!battingSelectedGameId || !battingSelectedPlayerId) return;
    try {
      await saveBattingStats(battingSelectedGameId, battingSelectedPlayerId, record);
      await loadBattingStatsForGame(battingSelectedGameId);
    } catch (err) {
      console.error('Failed to save batting record:', err);
      alert('Failed to save batting record');
    }
  };

  const addPitchingRecord = async (record: any) => {
    if (!pitchingSelectedGameId || !pitchingSelectedPlayerId) return;
    try {
      await savePitchingStats(pitchingSelectedGameId, pitchingSelectedPlayerId, record);
      await loadPitchingStatsForGame(pitchingSelectedGameId);
    } catch (err) {
      console.error('Failed to save pitching record:', err);
      alert('Failed to save pitching record');
    }
  };

  const toggleBattingMVP = (id: string) => {
    setBattingRecords(
      battingRecords.map((record) =>
        record.id === id ? { ...record, isMVP: !record.isMVP } : record,
      ),
    );
  };

  const togglePitchingMVP = (id: string) => {
    setPitchingRecords(
      pitchingRecords.map((record) =>
        record.id === id ? { ...record, isMVP: !record.isMVP } : record,
      ),
    );
  };

  const calculateBattingAvg = (record: any) => {
    if (record.atBats === 0) return '-.---';
    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
    return (hits / record.atBats).toFixed(3);
  };

  const calculateOBP = (record: any) => {
    if (record.plateAppearances === 0) return '-.---';
    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
    return ((hits + record.walks + record.hitByPitch) / record.plateAppearances).toFixed(3);
  };

  const calculateSLG = (record: any) => {
    if (record.atBats === 0) return '-.---';
    const totalBases =
      record.singles + record.doubles * 2 + record.triples * 3 + record.homeRuns * 4;
    return (totalBases / record.atBats).toFixed(3);
  };

  const calculateBattingScore = (record: any) => {
    let score = 0;
    score += record.singles * 1;
    score += record.doubles * 2;
    score += record.triples * 3;
    score += record.homeRuns * 5;
    score += record.runs * 1;
    score += record.rbi * 1;
    score += record.walks * 0.5;
    score += record.hitByPitch * 0.5;
    score += record.stolenBases * 1;
    if (record.isMVP) score += 5;
    return score;
  };

  const calculateERA = (record: any) => {
    if (record.inningsPitched === 0) return '-.--';
    return ((record.earnedRuns * 9) / record.inningsPitched).toFixed(2);
  };

  const calculatePitchingScore = (record: any) => {
    let score = 0;
    score += record.inningsPitched * 3;
    score += record.wins * 5;
    score += record.strikeouts * 1;
    score -= record.runsAllowed * 2;
    score -= record.earnedRuns * 1;
    score -= record.walks * 1;
    score -= record.hitsAllowed * 1;
    if (record.isMVP) score += 5;
    return score;
  };

  const downloadAsCSV = () => {
    const seasonLabel = getCurrentSeasonLabel();
    let csv = `경기일자,${gameDate}\n시즌,${seasonLabel}\n상대팀,${opponent}\n\n`;

    if (battingRecords.length > 0) {
      csv += '타격 기록\n';
      csv += '#,선수명,PA,AB,1B,2B,3B,HR,R,RBI,BB,HBP,SO,SB,타율,출루율,장타율,MVP,Score\n';
      battingRecords.forEach((record) => {
        csv += `${record.playerNumber},${record.playerName},${record.plateAppearances},${record.atBats},${record.singles},${record.doubles},${record.triples},${record.homeRuns},${record.runs},${record.rbi},${record.walks},${record.hitByPitch},${record.strikeouts},${record.stolenBases},${calculateBattingAvg(record)},${calculateOBP(record)},${calculateSLG(record)},${record.isMVP ? 'MVP' : ''},${calculateBattingScore(record)}\n`;
      });
      csv += '\n';
    }

    if (pitchingRecords.length > 0) {
      csv += '투구 기록\n';
      csv += '선수명,Inning,Win,K,실점,자책,H,BB,투구수,방어율,MVP,Total Point\n';
      pitchingRecords.forEach((record) => {
        csv += `${record.playerName},${record.inningsPitched},${record.wins},${record.strikeouts},${record.runsAllowed},${record.earnedRuns},${record.hitsAllowed},${record.walks},${record.pitchCount},${calculateERA(record)},${record.isMVP ? 'MVP' : ''},${calculatePitchingScore(record)}\n`;
      });
    }

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `야구기록_${seasonLabel}_${gameDate}_${opponent || '상대팀'}.csv`;
    link.click();
  };

  const refreshSeasons = async () => {
    try {
      setSeasonError(null);
      const response = await authFetch(`${API_BASE_URL}/api/seasons`);
      if (!response.ok) throw new Error('Failed to fetch seasons');
      const data = await response.json();
      if (!Array.isArray(data)) {
        setSeasons([]);
        throw new Error('Seasons API returned invalid data');
      }
      setSeasons(data as Season[]);
      if (!selectedSeasonId && data.length > 0) {
        setSelectedSeasonId(data[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSeasonError(message);
    }
  };

  const createSeason = async () => {
    try {
      setSeasonSaving(true);
      setSeasonError(null);

      const response = await authFetch(`${API_BASE_URL}/api/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonYear,
          seasonTerm,

          managerPlayerId: seasonManagerPlayerId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create season (${response.status})`);
      }

      setSeasonTerm('');
      setSeasonManagerPlayerId(null);
      await refreshSeasons();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSeasonError(message);
    } finally {
      setSeasonSaving(false);
    }
  };

  const createGame = async () => {
    if (!selectedSeasonId) {
      setGamesError('Select a season first');
      return;
    }

    try {
      setGameSaving(true);
      setGamesError(null);

      const response = await authFetch(`${API_BASE_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          gameDate,

          opponent,
          isFriendly: gameIsFriendly ? 1 : 0,
          score: gameScore.trim() ? Number(gameScore) : null,
          oppScore: gameOppScore.trim() ? Number(gameOppScore) : null,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create game (${response.status})`);
      }

      await (async () => {
        setGamesLoading(true);
        const listResponse = await authFetch(
          `${API_BASE_URL}/api/games?${new URLSearchParams({ seasonId: String(selectedSeasonId) }).toString()}`,
        );
        if (!listResponse.ok) {
          throw new Error(`Games API error: ${listResponse.status}`);
        }
        const data = (await listResponse.json()) as GameRecord[];

        setGames(data);
      })();

      setGameScore('');
      setGameOppScore('');
      setOpponent('');
      setGameIsFriendly(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setGamesError(message);
    } finally {
      setGameSaving(false);
      setGamesLoading(false);
    }
  };

  const createPlayer = async () => {
    try {
      setPlayerSaving(true);
      setPlayersError(null);

      const jerseyNumberValue = Number(newPlayerJerseyNumber);
      if (!Number.isFinite(jerseyNumberValue)) {
        setPlayersError('Invalid jersey number');
        return;
      }

      const response = await authFetch(`${API_BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newPlayerFirstName,
          lastName: newPlayerLastName,

          jerseyNumber: jerseyNumberValue,
          isActive: newPlayerIsActive ? 1 : 0,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create player (${response.status})`);
      }

      setNewPlayerFirstName('');
      setNewPlayerLastName('');
      setNewPlayerJerseyNumber('');
      setNewPlayerIsActive(true);

      const listResponse = await authFetch(`${API_BASE_URL}/api/players`);
      if (listResponse.ok) {
        const data = (await listResponse.json()) as Player[];
        setPlayers(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPlayersError(message);
    } finally {
      setPlayerSaving(false);
    }
  };

  const updatePlayer = async (playerId: number, patch: { jerseyNumber?: number; isActive?: number; firstName?: string; lastName?: string }) => {
    try {
      setPlayersError(null);
      const response = await authFetch(`${API_BASE_URL}/api/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to update player (${response.status})`);
      }

      const listResponse = await authFetch(`${API_BASE_URL}/api/players`);
      if (listResponse.ok) {
        const data = (await listResponse.json()) as Player[];
        setPlayers(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPlayersError(message);
    }
  };

  const saveWalkupSong = async () => {
    if (!selectedPlayerId) {
      setWalkupError('Select a player first');
      return;
    }

    try {
      setWalkupError(null);
      const startSeconds = Number(walkupStartTimeSeconds);
      if (!Number.isFinite(startSeconds) || startSeconds < 0) {
        setWalkupError('Invalid start time');
        return;
      }

      const response = await authFetch(`${API_BASE_URL}/api/player-walkup-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          songTitle: walkupSongTitle,
          artistName: walkupArtistName,
          spotifyTrackId: walkupSpotifyTrackId.trim() ? walkupSpotifyTrackId.trim() : null,
          startTimeSeconds: startSeconds,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to save walkup song (${response.status})`);
      }

      const params = new URLSearchParams({ playerId: String(selectedPlayerId) });
      const reloadResponse = await authFetch(`${API_BASE_URL}/api/player-walkup-song-by-id?${params.toString()}`);
      if (reloadResponse.ok) {
        const data = (await reloadResponse.json()) as WalkupSong | null;
        setWalkupSong(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setWalkupError(message);
    }
  };

  const selectedBattingPlayer = activePlayers.find((p) => p.id === battingSelectedPlayerId) ?? null;
  const selectedBattingPlayerNumber = selectedBattingPlayer?.jerseyNumber ?? '';
  const selectedBattingPlayerName = selectedBattingPlayer?.firstName && selectedBattingPlayer?.lastName
    ? `${selectedBattingPlayer.firstName} ${selectedBattingPlayer.lastName}`
    : '';

  const selectedPitchingPlayer = activePlayers.find((p) => p.id === pitchingSelectedPlayerId) ?? null;
  const selectedPitchingPlayerName = selectedPitchingPlayer?.firstName && selectedPitchingPlayer?.lastName
    ? `${selectedPitchingPlayer.firstName} ${selectedPitchingPlayer.lastName}`
    : '';

  if (adminAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminAuthed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Header
            logoSrc={logo}
            title="코레밥스 경기 기록 관리"
            subtitle="Korebaps Stats"
            stats={[]}
          />

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <h2 className="text-xl font-bold text-[#daaa00] mb-4">Admin Login</h2>

            {adminAuthError ? (
              <div className="mb-4 text-sm text-red-400">{adminAuthError}</div>
            ) : null}

            <label className="block text-sm font-medium text-[#daaa00] mb-2">Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
            />

            <div className="mt-4">
              <button
                type="button"
                onClick={loginAdmin}
                disabled={adminAuthLoading || !adminPassword.trim()}
                className="px-4 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              >
                {adminAuthLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title="코레밥스 경기 기록 관리"
          subtitle="Korebaps Stats"
          stats={[
            { label: '시즌', value: getCurrentSeasonLabel() },
            { label: '경기 날짜', value: gameDate },
            { label: '상대 팀', value: opponent || '미정' },
          ]}
          action={(
            <div className="flex flex-wrap gap-2">
              <button
                onClick={logoutAdmin}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                로그아웃
              </button>
              <button
                onClick={() => {
                  window.location.href = '/roster';
                }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                현역 로스터
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                메인으로
              </button>
            </div>
          )}
        />

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
              activeTab === 'players'
                ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
            }`}
          >
            선수 관리
          </button>
          <button
            onClick={() => setActiveTab('seasons')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
              activeTab === 'seasons'
                ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
            }`}
          >
            시즌 관리
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
              activeTab === 'games'
                ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
            }`}
          >
            경기 관리
          </button>
          <button
            onClick={() => setActiveTab('batting')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
              activeTab === 'batting'
                ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
            }`}
          >
            타격 기록
          </button>
          <button
            onClick={() => setActiveTab('pitching')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
              activeTab === 'pitching'
                ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
            }`}
          >
            투구 기록
          </button>
          <button
            onClick={() => setActiveTab('csvUpload')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
              activeTab === 'csvUpload'
                ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
            }`}
          >
            CSV 업로드
          </button>
        </div>

        {activeTab === 'seasons' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-6 h-6 text-[#daaa00]" />
                <h2 className="text-xl font-bold text-[#daaa00]">시즌 추가</h2>
              </div>

              {seasonError ? (
                <div className="mb-4 text-sm text-red-400">{seasonError}</div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">연도</label>
                  <input
                    type="number"
                    value={seasonYear}
                    onChange={(event) => setSeasonYear(Number(event.target.value))}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">Term</label>
                  <input
                    type="text"
                    value={seasonTerm}
                    onChange={(event) => setSeasonTerm(event.target.value)}
                    placeholder="Spring / Summer / Fall"
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">Manager (옵션)</label>
                  <select
                    value={seasonManagerPlayerId ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setSeasonManagerPlayerId(raw ? Number(raw) : null);
                    }}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  >
                    <option value="">None</option>
                    {activePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={createSeason}
                  disabled={seasonSaving || !seasonTerm.trim()}
                  className="px-4 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                  시즌 생성
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <h2 className="text-xl font-bold text-[#daaa00] mb-4">시즌 목록</h2>

              {seasons.length === 0 ? (
                <p className="text-gray-400 text-center py-8">아직 등록된 시즌이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(seasons) ? seasons : []).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSeasonId(s.id);
                        setActiveTab('games');
                      }}
                      className={`w-full text-left rounded-xl border p-4 transition ${
                        selectedSeasonId === s.id
                          ? 'border-[#daaa00] bg-gray-800'
                          : 'border-gray-700 bg-gray-800/50 hover:border-[#daaa00]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold">{s.label}</div>
                          <div className="text-xs text-gray-400">Manager: {s.manager ?? 'None'}</div>
                        </div>
                        <div className="text-xs text-gray-400">ID: {s.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'games' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-6 h-6 text-[#daaa00]" />
                <h2 className="text-xl font-bold text-[#daaa00]">경기 추가</h2>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#daaa00] mb-2">Season</label>
                <select
                  value={selectedSeasonId ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setSelectedSeasonId(raw ? Number(raw) : null);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                >
                  <option value="">All Seasons</option>
                  {(Array.isArray(seasons) ? seasons : []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedSeasonId ? (
                <div className="text-sm text-gray-400">All Seasons 선택 시에는 경기 생성이 비활성화됩니다. 시즌을 선택해주세요.</div>
              ) : null}

              {gamesError ? (
                <div className="mb-4 text-sm text-red-400">{gamesError}</div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">경기 날짜</label>
                  <input
                    type="date"
                    value={gameDate}
                    onChange={(event) => setGameDate(event.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">상대 팀</label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(event) => setOpponent(event.target.value)}
                    placeholder="상대 팀 이름"
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">점수 (옵션)</label>
                  <input
                    type="text"
                    value={gameScore}
                    onChange={(event) => setGameScore(event.target.value)}
                    placeholder="예: 10"
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">상대 점수 (옵션)</label>
                  <input
                    type="text"
                    value={gameOppScore}
                    onChange={(event) => setGameOppScore(event.target.value)}
                    placeholder="예: 8"
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={gameIsFriendly}
                    onChange={(event) => setGameIsFriendly(event.target.checked)}
                  />
                  Friendly
                </label>
                <button
                  type="button"
                  onClick={createGame}
                  disabled={gameSaving || !selectedSeasonId || !opponent.trim() || !gameDate}
                  className="ml-auto px-4 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                  경기 생성
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#daaa00]">경기 목록</h2>
                {games.length > 0 && (
                  <span className="text-xs text-gray-400">{games.length}경기</span>
                )}
              </div>
              {gamesLoading ? (
                <p className="text-gray-400 text-center py-8">Loading...</p>
              ) : games.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {selectedSeasonId
                    ? '이 시즌에 등록된 경기가 없습니다.'
                    : '시즌을 선택하거나 경기를 추가하세요.'}
                </p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {games.map((g) => {
                    const hasStats = (g.batting_count ?? 0) > 0 || (g.pitching_count ?? 0) > 0;
                    const dateStr = g.game_date?.includes('T')
                      ? g.game_date.split('T')[0]
                      : g.game_date;
                    const isWin = g.score !== null && g.opp_score !== null && g.score > g.opp_score;
                    const isLoss = g.score !== null && g.opp_score !== null && g.score < g.opp_score;
                    const isDraw = g.score !== null && g.opp_score !== null && g.score === g.opp_score;

                    return (
                      <div
                        key={g.game_id}
                        className={`rounded-xl p-4 transition border-2 ${
                          hasStats
                            ? 'bg-gray-800/80 border-green-800/60'
                            : 'bg-gray-800/50 border-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-bold text-base truncate">
                                vs {g.opponent}
                              </span>
                              {g.is_friendly ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-medium shrink-0">
                                  친선
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm text-gray-400 mb-2">{dateStr}</div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {g.score !== null && g.opp_score !== null ? (
                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                  isWin ? 'bg-green-900/50 text-green-300' :
                                  isLoss ? 'bg-red-900/50 text-red-300' :
                                  isDraw ? 'bg-gray-700/50 text-gray-300' : ''
                                }`}>
                                  {isWin ? 'W' : isLoss ? 'L' : 'D'} {g.score}-{g.opp_score}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">점수 미입력</span>
                              )}
                              {hasStats ? (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                  타격 {g.batting_count ?? 0} · 투구 {g.pitching_count ?? 0}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
                                  기록 없음
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const statsWarning = hasStats
                                ? `\n\n⚠️ 이 경기에는 타격 ${g.batting_count}건, 투구 ${g.pitching_count}건의 기록이 있습니다. 모두 삭제됩니다.`
                                : '';
                              if (window.confirm(`${dateStr} vs ${g.opponent} 경기를 삭제하시겠습니까?${statsWarning}`)) {
                                try {
                                  const response = await authFetch(`${API_BASE_URL}/api/games/${g.game_id}`, {
                                    method: 'DELETE',
                                  });
                                  if (!response.ok) {
                                    throw new Error('Failed to delete game');
                                  }
                                  const listResponse = await authFetch(
                                    `${API_BASE_URL}/api/games?${new URLSearchParams({ seasonId: String(selectedSeasonId) }).toString()}`,
                                  );
                                  if (listResponse.ok) {
                                    const data = (await listResponse.json()) as GameRecord[];
                                    setGames(data);
                                  }
                                } catch (err) {
                                  console.error('Failed to delete game:', err);
                                  alert('경기 삭제에 실패했습니다.');
                                }
                              }
                            }}
                            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition"
                            title="경기 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'players' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-6 h-6 text-[#daaa00]" />
                <h2 className="text-xl font-bold text-[#daaa00]">선수 추가</h2>
              </div>

              {playersError ? (
                <div className="mb-4 text-sm text-red-400">{playersError}</div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">First Name</label>
                  <input
                    type="text"
                    value={newPlayerFirstName}
                    onChange={(event) => setNewPlayerFirstName(event.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">Last Name</label>
                  <input
                    type="text"
                    value={newPlayerLastName}
                    onChange={(event) => setNewPlayerLastName(event.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#daaa00] mb-2">Jersey #</label>
                  <input
                    type="text"
                    value={newPlayerJerseyNumber}
                    onChange={(event) => setNewPlayerJerseyNumber(event.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={newPlayerIsActive}
                      onChange={(event) => setNewPlayerIsActive(event.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={createPlayer}
                  disabled={
                    playerSaving ||
                    !newPlayerFirstName.trim() ||
                    !newPlayerLastName.trim() ||
                    !newPlayerJerseyNumber.trim()
                  }
                  className="px-4 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                  선수 생성
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <h2 className="text-xl font-bold text-[#daaa00] mb-4">선수 목록</h2>

              {playersLoading ? (
                <p className="text-gray-400 text-center py-8">Loading...</p>
              ) : players.length === 0 ? (
                <p className="text-gray-400 text-center py-8">아직 등록된 선수가 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {players.map((p) => (
                    <div key={p.id} className="border-2 border-gray-700 rounded-lg p-4 bg-gray-800">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(p.id)}
                          className="text-left"
                        >
                          <div className="text-white font-bold">#{p.jerseyNumber} {p.firstName} {p.lastName}</div>
                          <div className="text-xs text-gray-400">ID: {p.id}</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updatePlayer(p.id, { isActive: p.isActive ? 0 : 1 })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            p.isActive ? 'bg-[#daaa00] text-black' : 'bg-gray-700 text-gray-200'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {editingJerseyPlayerId === p.id ? (
                          <>
                            <input
                              type="text"
                              value={editingJerseyValue}
                              onChange={(e) => setEditingJerseyValue(e.target.value)}
                              className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const value = Number(editingJerseyValue);
                                if (!Number.isFinite(value)) return;
                                updatePlayer(p.id, { jerseyNumber: value });
                                setEditingJerseyPlayerId(null);
                                setEditingJerseyValue('');
                              }}
                              className="px-3 py-2 rounded-lg bg-[#daaa00] text-black text-xs font-bold hover:bg-yellow-500 transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingJerseyPlayerId(null);
                                setEditingJerseyValue('');
                              }}
                              className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 text-xs font-bold hover:bg-gray-600 transition"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-200">Jersey #: <span className="font-bold">{p.jerseyNumber}</span></div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingJerseyPlayerId(p.id);
                                setEditingJerseyValue(String(p.jerseyNumber));
                              }}
                              className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 text-xs font-bold hover:bg-gray-600 transition"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        {editingNamePlayerId === p.id ? (
                          <>
                            <input
                              type="text"
                              value={editingFirstName}
                              onChange={(e) => setEditingFirstName(e.target.value)}
                              className="w-32 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                            />
                            <input
                              type="text"
                              value={editingLastName}
                              onChange={(e) => setEditingLastName(e.target.value)}
                              className="w-32 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updatePlayer(p.id, {
                                  firstName: editingFirstName,
                                  lastName: editingLastName,
                                });
                                setEditingNamePlayerId(null);
                                setEditingFirstName('');
                                setEditingLastName('');
                              }}
                              className="px-3 py-2 rounded-lg bg-[#daaa00] text-black text-xs font-bold hover:bg-yellow-500 transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNamePlayerId(null);
                                setEditingFirstName('');
                                setEditingLastName('');
                              }}
                              className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 text-xs font-bold hover:bg-gray-600 transition"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-200">Name: <span className="font-bold">{p.firstName} {p.lastName}</span></div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNamePlayerId(p.id);
                                setEditingFirstName(p.firstName);
                                setEditingLastName(p.lastName);
                              }}
                              className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 text-xs font-bold hover:bg-gray-600 transition"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>

                      {selectedPlayerId === p.id ? (
                        <div className="mt-4 border-t border-gray-700 pt-4">
                          <h3 className="text-sm font-bold text-[#daaa00] mb-2">Walkup Song</h3>

                          {walkupError ? (
                            <div className="mb-2 text-sm text-red-400">{walkupError}</div>
                          ) : null}

                          {walkupLoading ? (
                            <div className="text-sm text-gray-400">Loading...</div>
                          ) : (
                            <>
                              {walkupSong?.spotify_track_url ? (
                                <a
                                  href={walkupSong.spotify_track_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#daaa00] underline"
                                >
                                  Open in Spotify
                                </a>
                              ) : null}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Song Title</label>
                                  <input
                                    type="text"
                                    value={walkupSongTitle}
                                    onChange={(e) => setWalkupSongTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Artist</label>
                                  <input
                                    type="text"
                                    value={walkupArtistName}
                                    onChange={(e) => setWalkupArtistName(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Spotify Track ID / URL (옵션)</label>
                                  <input
                                    type="text"
                                    value={walkupSpotifyTrackId}
                                    onChange={(e) => setWalkupSpotifyTrackId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Start Time (seconds)</label>
                                  <input
                                    type="text"
                                    value={walkupStartTimeSeconds}
                                    onChange={(e) => setWalkupStartTimeSeconds(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={saveWalkupSong}
                                  disabled={!walkupSongTitle.trim() || !walkupArtistName.trim()}
                                  className="px-4 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                                >
                                  Save Walkup Song
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {(activeTab === 'batting' || activeTab === 'pitching') ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-6 h-6 text-[#daaa00]" />
                <h2 className="text-xl font-bold text-[#daaa00]">
                  {activeTab === 'batting' ? '타격 기록 추가' : '투구 기록 추가'}
                </h2>
              </div>

              {activeTab === 'batting' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#daaa00] mb-2">Game</label>
                      <select
                        value={battingSelectedGameId ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setBattingSelectedGameId(raw ? Number(raw) : null);
                        }}
                        className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                      >
                        <option value="">Select Game</option>
                        {games.map((g) => (
                          <option key={g.game_id} value={g.game_id}>
                            {g.game_date} vs {g.opponent}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#daaa00] mb-2">Player (Active)</label>
                      <select
                        value={battingSelectedPlayerId ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setBattingSelectedPlayerId(raw ? Number(raw) : null);
                        }}
                        className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                      >
                        <option value="">Select Player</option>
                        {activePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!battingSelectedGameId ? (
                    <div className="mb-2 text-sm text-gray-400">게임을 먼저 선택해주세요.</div>
                  ) : null}
                  {!battingSelectedPlayerId ? (
                    <div className="mb-2 text-sm text-gray-400">선수를 먼저 선택해주세요.</div>
                  ) : null}

                  <BattingRecordForm
                    onSubmit={(record: any) => {
                      if (!battingSelectedGameId || !battingSelectedPlayerId) return;
                      addBattingRecord(record);
                    }}
                    playerNumber={selectedBattingPlayerNumber}
                    playerName={selectedBattingPlayerName}
                  />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#daaa00] mb-2">Game</label>
                      <select
                        value={pitchingSelectedGameId ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setPitchingSelectedGameId(raw ? Number(raw) : null);
                        }}
                        className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                      >
                        <option value="">Select Game</option>
                        {games.map((g) => (
                          <option key={g.game_id} value={g.game_id}>
                            {g.game_date} vs {g.opponent}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#daaa00] mb-2">Player (Active)</label>
                      <select
                        value={pitchingSelectedPlayerId ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setPitchingSelectedPlayerId(raw ? Number(raw) : null);
                        }}
                        className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
                      >
                        <option value="">Select Player</option>
                        {activePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!pitchingSelectedGameId ? (
                    <div className="mb-2 text-sm text-gray-400">게임을 먼저 선택해주세요.</div>
                  ) : null}
                  {!pitchingSelectedPlayerId ? (
                    <div className="mb-2 text-sm text-gray-400">선수를 먼저 선택해주세요.</div>
                  ) : null}

                  <PitchingRecordForm
                    onSubmit={(record: any) => {
                      if (!pitchingSelectedGameId || !pitchingSelectedPlayerId) return;
                      addPitchingRecord(record);
                    }}
                    playerName={selectedPitchingPlayerName}
                  />
                </>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
              <h2 className="text-xl font-bold text-[#daaa00] mb-4">
                {activeTab === 'batting' ? '타격 기록 목록' : '투구 기록 목록'}
              </h2>

              {activeTab === 'batting' ? (
                battingRecords.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">아직 등록된 타격 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {battingRecords.map((record) => (
                      <div
                        key={record.id}
                        className="border-2 border-[#daaa00] rounded-lg p-4 bg-gray-800"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-white font-bold">#{record.playerNumber} {record.playerName}</div>
                            <div className="text-xs text-gray-400">PA {record.plateAppearances} | AB {record.atBats}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteBattingRecord(record.gameId, record.playerId)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                pitchingRecords.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">아직 등록된 투구 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {pitchingRecords.map((record) => (
                      <div
                        key={record.id}
                        className="border-2 border-[#daaa00] rounded-lg p-4 bg-gray-800"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-white font-bold">#{record.playerNumber} {record.playerName}</div>
                            <div className="text-xs text-gray-400">IP {record.inningsPitched} | K {record.strikeouts} | BB {record.walks}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deletePitchingRecord(record.gameId, record.playerId)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'csvUpload' ? (
          <CsvUploadForm
            seasons={seasons}
            activePlayers={activePlayers}
            adminToken={adminToken!}
            apiBaseUrl={API_BASE_URL}
          />
        ) : null}

        <PointTable />
        <Footer />
      </div>
    </div>
  );
}