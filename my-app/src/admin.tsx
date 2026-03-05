import { useState, useEffect } from 'react';
import { PlusCircle, Download, Trash2, Award, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [showManualTabs, setShowManualTabs] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
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

  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [gameEditBatting, setGameEditBatting] = useState<any[]>([]);
  const [gameEditPitching, setGameEditPitching] = useState<any[]>([]);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editRowValues, setEditRowValues] = useState<Record<string, any>>({});
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [savedRowKey, setSavedRowKey] = useState<string | null>(null);
  const [statsEditorLoading, setStatsEditorLoading] = useState(false);
  const [statsEditorError, setStatsEditorError] = useState<string | null>(null);
  const [showBattingEditor, setShowBattingEditor] = useState(true);
  const [showPitchingEditor, setShowPitchingEditor] = useState(true);

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
        singles: record.singles,
        doubles: record.doubles,
        triples: record.triples,
        homeRuns: record.homeRuns,
        runs: record.runs,
        rbi: record.rbi,
        walks: record.walks,
        hitByPitch: record.hitByPitch,
        strikeouts: record.strikeouts,
        sacs: record.sacs ?? 0,
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

  const loadGameEditStats = async (gameId: number) => {
    try {
      setStatsEditorLoading(true);
      setStatsEditorError(null);
      const params = new URLSearchParams({ gameId: String(gameId) });
      const [battingRes, pitchingRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/game-batting-stats?${params.toString()}`),
        authFetch(`${API_BASE_URL}/api/game-pitching-stats?${params.toString()}`),
      ]);
      if (battingRes.ok) {
        const data = await battingRes.json();
        setGameEditBatting(Array.isArray(data) ? data : []);
      }
      if (pitchingRes.ok) {
        const data = await pitchingRes.json();
        setGameEditPitching(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatsEditorError(message);
    } finally {
      setStatsEditorLoading(false);
    }
  };

  const startEditRow = (type: 'batting' | 'pitching', row: any) => {
    const key = `${type}-${row.player_id}`;
    if (editingRowKey === key) return;
    setEditingRowKey(key);
    if (type === 'batting') {
      setEditRowValues({
        plate_appearances: row.plate_appearances ?? 0,
        singles: row.singles ?? 0,
        doubles: row.doubles ?? 0,
        triples: row.triples ?? 0,
        home_runs: row.home_runs ?? 0,
        runs_scored: row.runs_scored ?? 0,
        rbi: row.rbi ?? 0,
        walks: row.walks ?? 0,
        hit_by_pitch: row.hit_by_pitch ?? 0,
        strikeouts: row.strikeouts ?? 0,
        sacs: row.sacs ?? 0,
        stolen_bases: row.stolen_bases ?? 0,
        caught_stealing: row.caught_stealing ?? 0,
        is_mvp: row.is_mvp ?? 0,
      });
    } else {
      setEditRowValues({
        outs_recorded: row.outs_recorded ?? 0,
        pitches_thrown: row.pitches_thrown ?? 0,
        hits_allowed: row.hits_allowed ?? 0,
        runs_allowed: row.runs_allowed ?? 0,
        earned_runs: row.earned_runs ?? 0,
        strikeouts: row.strikeouts ?? 0,
        walks: row.walks ?? 0,
        hit_by_pitch: row.hit_by_pitch ?? 0,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        save_earned: row.save_earned ?? 0,
        is_mvp: row.is_mvp ?? 0,
      });
    }
  };

  const cancelEditRow = () => {
    setEditingRowKey(null);
    setEditRowValues({});
  };

  const saveEditRow = async () => {
    if (!editingRowKey || !editingGameId) return;
    const [type, playerIdStr] = editingRowKey.split('-');
    const playerId = Number(playerIdStr);
    try {
      setSavingRowKey(editingRowKey);
      if (type === 'batting') {
        await saveBattingStats(editingGameId, playerId, {
          plateAppearances: editRowValues.plate_appearances,
          singles: editRowValues.singles,
          doubles: editRowValues.doubles,
          triples: editRowValues.triples,
          homeRuns: editRowValues.home_runs,
          runs: editRowValues.runs_scored,
          rbi: editRowValues.rbi,
          walks: editRowValues.walks,
          hitByPitch: editRowValues.hit_by_pitch,
          strikeouts: editRowValues.strikeouts,
          sacs: editRowValues.sacs,
          stolenBases: editRowValues.stolen_bases,
          caughtStealing: editRowValues.caught_stealing,
          isMVP: editRowValues.is_mvp,
        });
      } else {
        await savePitchingStats(editingGameId, playerId, {
          outsRecorded: editRowValues.outs_recorded,
          pitchCount: editRowValues.pitches_thrown,
          hitsAllowed: editRowValues.hits_allowed,
          runsAllowed: editRowValues.runs_allowed,
          earnedRuns: editRowValues.earned_runs,
          strikeouts: editRowValues.strikeouts,
          walks: editRowValues.walks,
          hitByPitch: editRowValues.hit_by_pitch,
          wins: editRowValues.wins,
          losses: editRowValues.losses,
          saveEarned: editRowValues.save_earned,
          isMVP: editRowValues.is_mvp,
        });
      }
      const savedKey = editingRowKey;
      setSavedRowKey(savedKey);
      setEditingRowKey(null);
      setEditRowValues({});
      await loadGameEditStats(editingGameId);
      setTimeout(() => setSavedRowKey(null), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatsEditorError(message);
    } finally {
      setSavingRowKey(null);
    }
  };

  const updateEditValue = (field: string, value: any) => {
    setEditRowValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleGameCardClick = async (gameId: number) => {
    if (editingGameId === gameId) {
      setEditingGameId(null);
      setGameEditBatting([]);
      setGameEditPitching([]);
      cancelEditRow();
      return;
    }
    cancelEditRow();
    setEditingGameId(gameId);
    await loadGameEditStats(gameId);
  };

  const formatOuts = (outs: number | null) => {
    if (outs === null || outs === undefined) return '-';
    return `${Math.floor(outs / 3)}.${outs % 3}`;
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

  const renderPlayerCard = (p: Player) => {
    const isEditing = editingJerseyPlayerId === p.id || editingNamePlayerId === p.id;
    const isSelected = selectedPlayerId === p.id;
    const hasWalkup = isSelected && walkupSong?.song_title;

    return (
      <div
        key={p.id}
        className={`rounded-xl p-4 transition border ${
          isSelected
            ? 'border-[#daaa00]/60 bg-gray-800'
            : p.isActive
              ? 'border-gray-700/50 bg-gray-800/60 hover:border-gray-600'
              : 'border-gray-700/30 bg-gray-800/30 opacity-70 hover:opacity-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg font-bold text-[#daaa00] w-8 text-center shrink-0">
              {p.jerseyNumber}
            </span>
            <div className="min-w-0">
              {editingNamePlayerId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingFirstName}
                    onChange={(e) => setEditingFirstName(e.target.value)}
                    placeholder="First"
                    className="w-24 px-2 py-1 bg-gray-900 border border-gray-600 text-white rounded text-sm focus:border-[#daaa00] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editingLastName}
                    onChange={(e) => setEditingLastName(e.target.value)}
                    placeholder="Last"
                    className="w-24 px-2 py-1 bg-gray-900 border border-gray-600 text-white rounded text-sm focus:border-[#daaa00] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      updatePlayer(p.id, { firstName: editingFirstName, lastName: editingLastName });
                      setEditingNamePlayerId(null);
                    }}
                    className="text-[#daaa00] hover:text-yellow-300 text-xs font-bold"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => { setEditingNamePlayerId(null); setEditingFirstName(''); setEditingLastName(''); }}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingNamePlayerId(p.id);
                    setEditingFirstName(p.firstName);
                    setEditingLastName(p.lastName);
                  }}
                  className="text-white font-semibold text-sm hover:text-[#daaa00] transition text-left truncate"
                  title="클릭하여 이름 수정"
                >
                  {p.firstName} {p.lastName}
                </button>
              )}
              {editingJerseyPlayerId === p.id ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">#</span>
                  <input
                    type="text"
                    value={editingJerseyValue}
                    onChange={(e) => setEditingJerseyValue(e.target.value)}
                    className="w-14 px-2 py-0.5 bg-gray-900 border border-gray-600 text-white rounded text-xs focus:border-[#daaa00] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const v = Number(editingJerseyValue);
                      if (Number.isFinite(v)) updatePlayer(p.id, { jerseyNumber: v });
                      setEditingJerseyPlayerId(null);
                      setEditingJerseyValue('');
                    }}
                    className="text-[#daaa00] hover:text-yellow-300 text-xs font-bold"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => { setEditingJerseyPlayerId(null); setEditingJerseyValue(''); }}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingJerseyPlayerId(p.id);
                    setEditingJerseyValue(String(p.jerseyNumber));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition"
                  title="클릭하여 번호 수정"
                >
                  #{p.jerseyNumber} 수정
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedPlayerId(isSelected ? null : p.id)}
              className="text-gray-400 hover:text-[#daaa00] transition"
              title="Walkup Song"
            >
              {walkupSong?.song_title && isSelected ? '♫' : '♪'}
            </button>
            <button
              type="button"
              onClick={() => updatePlayer(p.id, { isActive: p.isActive ? 0 : 1 })}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                p.isActive
                  ? 'bg-green-900/50 text-green-300 hover:bg-green-900/80'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
              }`}
            >
              {p.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>
    );
  };

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

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'players', label: '선수 관리' },
            { id: 'seasons', label: '시즌 관리' },
            { id: 'games', label: '경기 관리' },
            { id: 'csvUpload', label: 'CSV 업로드' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all border-2 ${
                activeTab === tab.id
                  ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                  : 'bg-gray-900 text-[#daaa00] border-[#daaa00] hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowManualTabs(!showManualTabs)}
              className={`py-3 px-4 rounded-lg font-medium transition-all border-2 text-sm ${
                activeTab === 'batting' || activeTab === 'pitching'
                  ? 'bg-[#daaa00] text-black border-[#daaa00] shadow-lg'
                  : 'bg-gray-900 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              수동 입력 ▾
            </button>
            {showManualTabs && (
              <div className="absolute top-full mt-1 right-0 z-10 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { setActiveTab('batting'); setShowManualTabs(false); }}
                  className={`block w-full text-left px-4 py-2.5 text-sm transition ${
                    activeTab === 'batting' ? 'bg-[#daaa00] text-black font-bold' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  타격 기록
                </button>
                <button
                  onClick={() => { setActiveTab('pitching'); setShowManualTabs(false); }}
                  className={`block w-full text-left px-4 py-2.5 text-sm transition ${
                    activeTab === 'pitching' ? 'bg-[#daaa00] text-black font-bold' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  투구 기록
                </button>
              </div>
            )}
          </div>
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
          <>
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

                    const isSelected = editingGameId === g.game_id;

                    return (
                      <div
                        key={g.game_id}
                        onClick={() => handleGameCardClick(g.game_id)}
                        className={`rounded-xl p-4 transition border-2 cursor-pointer ${
                          isSelected
                            ? 'border-[#daaa00] bg-gray-800 ring-1 ring-[#daaa00]/30'
                            : hasStats
                              ? 'bg-gray-800/80 border-green-800/60 hover:border-green-700'
                              : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
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
                            onClick={async (e) => {
                              e.stopPropagation();
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
                                  if (editingGameId === g.game_id) {
                                    setEditingGameId(null);
                                    setGameEditBatting([]);
                                    setGameEditPitching([]);
                                    cancelEditRow();
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

          {editingGameId && (() => {
            const editGame = games.find((g) => g.game_id === editingGameId);
            const editGameLabel = editGame
              ? `${editGame.game_date?.includes('T') ? editGame.game_date.split('T')[0] : editGame.game_date} vs ${editGame.opponent}`
              : '';

            const battingFields: { key: string; label: string }[] = [
              { key: 'plate_appearances', label: 'PA' },
              { key: 'singles', label: '1B' },
              { key: 'doubles', label: '2B' },
              { key: 'triples', label: '3B' },
              { key: 'home_runs', label: 'HR' },
              { key: 'runs_scored', label: 'R' },
              { key: 'rbi', label: 'RBI' },
              { key: 'walks', label: 'BB' },
              { key: 'strikeouts', label: 'SO' },
              { key: 'hit_by_pitch', label: 'HBP' },
              { key: 'sacs', label: 'SAC' },
              { key: 'stolen_bases', label: 'SB' },
              { key: 'caught_stealing', label: 'CS' },
            ];

            const pitchingFields: { key: string; label: string }[] = [
              { key: 'outs_recorded', label: 'Outs' },
              { key: 'pitches_thrown', label: '#P' },
              { key: 'hits_allowed', label: 'H' },
              { key: 'runs_allowed', label: 'R' },
              { key: 'earned_runs', label: 'ER' },
              { key: 'strikeouts', label: 'SO' },
              { key: 'walks', label: 'BB' },
              { key: 'hit_by_pitch', label: 'HBP' },
              { key: 'wins', label: 'W' },
              { key: 'losses', label: 'L' },
              { key: 'save_earned', label: 'SV' },
            ];

            return (
              <div className="mt-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#daaa00]">
                    {editGameLabel} — 기록 수정
                  </h2>
                  <button
                    onClick={() => { setEditingGameId(null); setGameEditBatting([]); setGameEditPitching([]); cancelEditRow(); }}
                    className="text-gray-400 hover:text-white text-sm transition"
                  >
                    닫기 ✕
                  </button>
                </div>

                {statsEditorError && (
                  <div className="mb-3 text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{statsEditorError}</div>
                )}

                {statsEditorLoading ? (
                  <p className="text-gray-400 text-center py-8">Loading...</p>
                ) : (
                  <div className="space-y-6">
                    {/* Batting section */}
                    <div>
                      <button
                        onClick={() => setShowBattingEditor(!showBattingEditor)}
                        className="flex items-center gap-2 text-[#daaa00] font-bold text-sm mb-3 hover:text-yellow-300 transition"
                      >
                        {showBattingEditor ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        타격 기록 ({gameEditBatting.length})
                      </button>
                      {showBattingEditor && (
                        gameEditBatting.length === 0 ? (
                          <p className="text-gray-500 text-sm pl-6">이 경기에 등록된 타격 기록이 없습니다.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-gray-700">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-800 text-gray-400 border-b border-gray-700">
                                  <th className="px-2 py-2 text-left font-medium">#</th>
                                  <th className="px-2 py-2 text-left font-medium">Name</th>
                                  {battingFields.map((f) => (
                                    <th key={f.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">{f.label}</th>
                                  ))}
                                  <th className="px-2 py-2 text-center font-medium">MVP</th>
                                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gameEditBatting.map((row) => {
                                  const rowKey = `batting-${row.player_id}`;
                                  const isEditing = editingRowKey === rowKey;
                                  const isSaving = savingRowKey === rowKey;
                                  const justSaved = savedRowKey === rowKey;

                                  return (
                                    <tr
                                      key={row.player_id}
                                      onClick={() => { if (!isEditing) startEditRow('batting', row); }}
                                      className={`border-b border-gray-700/50 transition-colors duration-500 ${
                                        justSaved
                                          ? 'bg-green-900/30'
                                          : isEditing
                                            ? 'bg-gray-800/80'
                                            : 'hover:bg-gray-800/40 cursor-pointer'
                                      }`}
                                    >
                                      <td className="px-2 py-2 text-[#daaa00] font-bold">{row.jersey_number}</td>
                                      <td className="px-2 py-2 text-white whitespace-nowrap">
                                        {row.first_name} {row.last_name}
                                      </td>
                                      {battingFields.map((f) => (
                                        <td key={f.key} className="px-2 py-2 text-center">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              value={editRowValues[f.key] ?? 0}
                                              onChange={(e) => updateEditValue(f.key, Number(e.target.value) || 0)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-12 px-1 py-0.5 bg-gray-900 border border-[#daaa00]/40 text-white rounded text-center text-xs focus:border-[#daaa00] focus:outline-none"
                                            />
                                          ) : (
                                            <span className="text-gray-300">{row[f.key] ?? 0}</span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="px-2 py-2 text-center">
                                        {isEditing ? (
                                          <input
                                            type="checkbox"
                                            checked={!!editRowValues.is_mvp}
                                            onChange={(e) => updateEditValue('is_mvp', e.target.checked ? 1 : 0)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="accent-[#daaa00] w-4 h-4"
                                          />
                                        ) : (
                                          row.is_mvp ? <Award className="w-3.5 h-3.5 text-[#daaa00] mx-auto" /> : <span className="text-gray-600">-</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center whitespace-nowrap">
                                        {isEditing ? (
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); saveEditRow(); }}
                                              disabled={isSaving}
                                              className="px-2 py-1 rounded bg-[#daaa00] text-black text-[10px] font-bold hover:bg-yellow-500 disabled:opacity-50 transition"
                                            >
                                              {isSaving ? '...' : '저장'}
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); cancelEditRow(); }}
                                              className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-[10px] font-medium hover:bg-gray-600 transition"
                                            >
                                              취소
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-gray-600 text-[10px]">클릭하여 수정</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>

                    {/* Pitching section */}
                    <div>
                      <button
                        onClick={() => setShowPitchingEditor(!showPitchingEditor)}
                        className="flex items-center gap-2 text-[#daaa00] font-bold text-sm mb-3 hover:text-yellow-300 transition"
                      >
                        {showPitchingEditor ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        투구 기록 ({gameEditPitching.length})
                      </button>
                      {showPitchingEditor && (
                        gameEditPitching.length === 0 ? (
                          <p className="text-gray-500 text-sm pl-6">이 경기에 등록된 투구 기록이 없습니다.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-gray-700">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-800 text-gray-400 border-b border-gray-700">
                                  <th className="px-2 py-2 text-left font-medium">#</th>
                                  <th className="px-2 py-2 text-left font-medium">Name</th>
                                  <th className="px-2 py-2 text-center font-medium">IP</th>
                                  {pitchingFields.filter((f) => f.key !== 'outs_recorded').map((f) => (
                                    <th key={f.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">{f.label}</th>
                                  ))}
                                  <th className="px-2 py-2 text-center font-medium">MVP</th>
                                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gameEditPitching.map((row) => {
                                  const rowKey = `pitching-${row.player_id}`;
                                  const isEditing = editingRowKey === rowKey;
                                  const isSaving = savingRowKey === rowKey;
                                  const justSaved = savedRowKey === rowKey;

                                  return (
                                    <tr
                                      key={row.player_id}
                                      onClick={() => { if (!isEditing) startEditRow('pitching', row); }}
                                      className={`border-b border-gray-700/50 transition-colors duration-500 ${
                                        justSaved
                                          ? 'bg-green-900/30'
                                          : isEditing
                                            ? 'bg-gray-800/80'
                                            : 'hover:bg-gray-800/40 cursor-pointer'
                                      }`}
                                    >
                                      <td className="px-2 py-2 text-[#daaa00] font-bold">{row.jersey_number}</td>
                                      <td className="px-2 py-2 text-white whitespace-nowrap">
                                        {row.first_name} {row.last_name}
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            value={editRowValues.outs_recorded ?? 0}
                                            onChange={(e) => updateEditValue('outs_recorded', Number(e.target.value) || 0)}
                                            onClick={(e) => e.stopPropagation()}
                                            title={`Outs recorded (${formatOuts(editRowValues.outs_recorded)} IP)`}
                                            className="w-12 px-1 py-0.5 bg-gray-900 border border-[#daaa00]/40 text-white rounded text-center text-xs focus:border-[#daaa00] focus:outline-none"
                                          />
                                        ) : (
                                          <span className="text-gray-300">{row.innings_pitched ?? '-'}</span>
                                        )}
                                      </td>
                                      {pitchingFields.filter((f) => f.key !== 'outs_recorded').map((f) => (
                                        <td key={f.key} className="px-2 py-2 text-center">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              value={editRowValues[f.key] ?? 0}
                                              onChange={(e) => updateEditValue(f.key, Number(e.target.value) || 0)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-12 px-1 py-0.5 bg-gray-900 border border-[#daaa00]/40 text-white rounded text-center text-xs focus:border-[#daaa00] focus:outline-none"
                                            />
                                          ) : (
                                            <span className="text-gray-300">{row[f.key] ?? 0}</span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="px-2 py-2 text-center">
                                        {isEditing ? (
                                          <input
                                            type="checkbox"
                                            checked={!!editRowValues.is_mvp}
                                            onChange={(e) => updateEditValue('is_mvp', e.target.checked ? 1 : 0)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="accent-[#daaa00] w-4 h-4"
                                          />
                                        ) : (
                                          row.is_mvp ? <Award className="w-3.5 h-3.5 text-[#daaa00] mx-auto" /> : <span className="text-gray-600">-</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center whitespace-nowrap">
                                        {isEditing ? (
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); saveEditRow(); }}
                                              disabled={isSaving}
                                              className="px-2 py-1 rounded bg-[#daaa00] text-black text-[10px] font-bold hover:bg-yellow-500 disabled:opacity-50 transition"
                                            >
                                              {isSaving ? '...' : '저장'}
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); cancelEditRow(); }}
                                              className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-[10px] font-medium hover:bg-gray-600 transition"
                                            >
                                              취소
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-gray-600 text-[10px]">클릭하여 수정</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          </>
        ) : null}

        {activeTab === 'players' ? (() => {
          const searchLower = playerSearch.toLowerCase();
          const filtered = players.filter((p) =>
            !searchLower ||
            p.firstName.toLowerCase().includes(searchLower) ||
            p.lastName.toLowerCase().includes(searchLower) ||
            String(p.jerseyNumber).includes(searchLower)
          );
          const activePl = filtered.filter((p) => p.isActive);
          const inactivePl = filtered.filter((p) => !p.isActive);

          return (
            <div className="space-y-6">
              {/* Add Player Form */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
                <div className="flex items-center gap-2 mb-4">
                  <PlusCircle className="w-6 h-6 text-[#daaa00]" />
                  <h2 className="text-xl font-bold text-[#daaa00]">선수 추가</h2>
                </div>

                {playersError && <div className="mb-4 text-sm text-red-400">{playersError}</div>}

                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium text-gray-400 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newPlayerFirstName}
                      onChange={(e) => setNewPlayerFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newPlayerLastName}
                      onChange={(e) => setNewPlayerLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-400 mb-1">#</label>
                    <input
                      type="text"
                      value={newPlayerJerseyNumber}
                      onChange={(e) => setNewPlayerJerseyNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={createPlayer}
                    disabled={playerSaving || !newPlayerFirstName.trim() || !newPlayerLastName.trim() || !newPlayerJerseyNumber.trim()}
                    className="px-5 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* Player List */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#daaa00]">선수 목록</h2>
                  <span className="text-xs text-gray-400">
                    활성 {players.filter((p) => p.isActive).length} / 전체 {players.length}
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="이름 또는 번호로 검색..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full px-4 py-2 mb-4 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none placeholder-gray-500"
                />

                {playersLoading ? (
                  <p className="text-gray-400 text-center py-8">Loading...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    {playerSearch ? '검색 결과가 없습니다.' : '아직 등록된 선수가 없습니다.'}
                  </p>
                ) : (
                  <div className="space-y-6 max-h-[700px] overflow-y-auto pr-1">
                    {/* Active Players */}
                    {activePl.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          <h3 className="text-sm font-semibold text-green-400">활성 선수 ({activePl.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activePl.map((p) => renderPlayerCard(p))}
                        </div>
                      </div>
                    )}

                    {/* Inactive Players */}
                    {inactivePl.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-gray-500" />
                          <h3 className="text-sm font-semibold text-gray-400">비활성 선수 ({inactivePl.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {inactivePl.map((p) => renderPlayerCard(p))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Walkup Song Editor - shown when a player is selected */}
              {selectedPlayerId && (() => {
                const sp = players.find((p) => p.id === selectedPlayerId);
                if (!sp) return null;
                return (
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-[#daaa00]">
                        Walkup Song — #{sp.jerseyNumber} {sp.firstName} {sp.lastName}
                      </h2>
                      <button
                        onClick={() => setSelectedPlayerId(null)}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        닫기 ✕
                      </button>
                    </div>

                    {walkupError && <div className="mb-3 text-sm text-red-400">{walkupError}</div>}

                    {walkupLoading ? (
                      <div className="text-sm text-gray-400 py-4">Loading...</div>
                    ) : (
                      <>
                        {walkupSong?.spotify_track_url && (
                          <a
                            href={walkupSong.spotify_track_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mb-3 text-xs text-[#daaa00] underline hover:text-yellow-300"
                          >
                            Open in Spotify
                          </a>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Song Title</label>
                            <input
                              type="text"
                              value={walkupSongTitle}
                              onChange={(e) => setWalkupSongTitle(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Artist</label>
                            <input
                              type="text"
                              value={walkupArtistName}
                              onChange={(e) => setWalkupArtistName(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Spotify ID / URL</label>
                            <input
                              type="text"
                              value={walkupSpotifyTrackId}
                              onChange={(e) => setWalkupSpotifyTrackId(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Start (sec)</label>
                            <input
                              type="text"
                              value={walkupStartTimeSeconds}
                              onChange={(e) => setWalkupStartTimeSeconds(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:border-[#daaa00] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={saveWalkupSong}
                            disabled={!walkupSongTitle.trim() || !walkupArtistName.trim()}
                            className="px-5 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                          >
                            저장
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })() : null}

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