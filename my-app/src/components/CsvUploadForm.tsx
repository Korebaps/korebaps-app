import { useState, useCallback, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Award } from 'lucide-react';

type Season = {
  id: number;
  label: string;
};

type GameRecord = {
  game_id: number;
  game_date: string;
  opponent: string;
  is_friendly: number;
  score: number | null;
  opp_score: number | null;
};

type ActivePlayer = {
  id: number;
  label: string;
  jerseyNumber?: number;
  firstName?: string;
  lastName?: string;
};

type CsvPlayerRow = {
  jerseyNumber: number;
  csvName: string;
  batting: Record<string, number>;
  pitching: Record<string, number>;
};

type MatchedPlayer = CsvPlayerRow & {
  matchedPlayerId: number | null;
  matchedPlayerLabel: string | null;
  autoMatched: boolean;
};

type Props = {
  seasons: Season[];
  activePlayers: ActivePlayer[];
  adminToken: string;
  apiBaseUrl: string;
};

const BATTING_COLUMN_MAP: Record<string, string> = {
  PA: 'plateAppearances',
  '1B': 'singles',
  '2B': 'doubles',
  '3B': 'triples',
  HR: 'homeRuns',
  R: 'runsScored',
  RBI: 'rbi',
  BB: 'walks',
  SO: 'strikeouts',
  HBP: 'hitByPitch',
  SAC: '_sac',
  SF: '_sf',
  SB: 'stolenBases',
  CS: 'caughtStealing',
};

const PITCHING_COLUMN_MAP: Record<string, string> = {
  IP: '_ip',
  '#P': 'pitchesThrown',
  H: 'hitsAllowed',
  R: 'runsAllowed',
  ER: 'earnedRuns',
  SO: 'strikeouts',
  BB: 'walksAllowed',
  HBP: 'hitBatters',
  W: 'w',
  L: 'l',
  SV: 'saveEarned',
};

function parseIpToOuts(ipStr: string): number {
  const ip = parseFloat(ipStr) || 0;
  const fullInnings = Math.floor(ip);
  const partialOuts = Math.round((ip % 1) * 10);
  return fullInnings * 3 + partialOuts;
}

function parseCsv(rawData: string[][]): CsvPlayerRow[] {
  if (rawData.length < 3) return [];

  const categoryRow = rawData[0];
  const headerRow = rawData[1];

  let battingStart = -1;
  let pitchingStart = -1;
  let fieldingStart = -1;

  for (let i = 0; i < categoryRow.length; i++) {
    const val = categoryRow[i].trim();
    if (val === 'Batting' && battingStart === -1) battingStart = i;
    else if (val === 'Pitching' && pitchingStart === -1) pitchingStart = i;
    else if (val === 'Fielding' && fieldingStart === -1) fieldingStart = i;
  }

  const battingEnd = pitchingStart > 0 ? pitchingStart : headerRow.length;
  const pitchingEnd = fieldingStart > 0 ? fieldingStart : headerRow.length;

  const battingColIndices: { csvCol: number; dbField: string }[] = [];
  for (let i = battingStart; i < battingEnd; i++) {
    const header = headerRow[i]?.trim();
    if (header && BATTING_COLUMN_MAP[header]) {
      battingColIndices.push({ csvCol: i, dbField: BATTING_COLUMN_MAP[header] });
    }
  }

  const pitchingColIndices: { csvCol: number; dbField: string }[] = [];
  for (let i = pitchingStart; i < pitchingEnd; i++) {
    const header = headerRow[i]?.trim();
    if (header && PITCHING_COLUMN_MAP[header]) {
      pitchingColIndices.push({ csvCol: i, dbField: PITCHING_COLUMN_MAP[header] });
    }
  }

  const players: CsvPlayerRow[] = [];

  for (let r = 2; r < rawData.length; r++) {
    const row = rawData[r];
    const numberStr = row[0]?.trim();

    if (!numberStr || numberStr === 'Totals' || numberStr === 'Glossary' || numberStr === '') continue;
    const jerseyNumber = parseInt(numberStr, 10);
    if (isNaN(jerseyNumber)) continue;

    const lastName = row[1]?.trim() ?? '';
    const firstName = row[2]?.trim() ?? '';
    const csvName = `${firstName} ${lastName}`.trim();

    const batting: Record<string, number> = {};
    for (const { csvCol, dbField } of battingColIndices) {
      const raw = row[csvCol]?.trim() ?? '0';
      batting[dbField] = parseInt(raw, 10) || 0;
    }
    batting.sacs = (batting._sac || 0) + (batting._sf || 0);
    delete batting._sac;
    delete batting._sf;

    const pitching: Record<string, number> = {};
    for (const { csvCol, dbField } of pitchingColIndices) {
      const raw = row[csvCol]?.trim() ?? '0';
      if (dbField === '_ip') {
        pitching.outsRecorded = parseIpToOuts(raw);
        pitching._ipRaw = parseFloat(raw) || 0;
      } else {
        pitching[dbField] = parseInt(raw, 10) || 0;
      }
    }

    const hasBattingStats = (batting.plateAppearances ?? 0) > 0;
    const hasPitchingStats = (pitching.outsRecorded ?? 0) > 0;
    if (!hasBattingStats && !hasPitchingStats) continue;

    players.push({ jerseyNumber, csvName, batting, pitching });
  }

  return players;
}

const BATTING_PREVIEW_COLUMNS = [
  { key: 'plateAppearances', label: 'PA' },
  { key: 'singles', label: '1B' },
  { key: 'doubles', label: '2B' },
  { key: 'triples', label: '3B' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'runsScored', label: 'R' },
  { key: 'rbi', label: 'RBI' },
  { key: 'walks', label: 'BB' },
  { key: 'strikeouts', label: 'SO' },
  { key: 'hitByPitch', label: 'HBP' },
  { key: 'sacs', label: 'SAC' },
  { key: 'stolenBases', label: 'SB' },
  { key: 'caughtStealing', label: 'CS' },
];

const PITCHING_PREVIEW_COLUMNS = [
  { key: '_ipRaw', label: 'IP' },
  { key: 'outsRecorded', label: 'Outs' },
  { key: 'pitchesThrown', label: '#P' },
  { key: 'hitsAllowed', label: 'H' },
  { key: 'runsAllowed', label: 'R' },
  { key: 'earnedRuns', label: 'ER' },
  { key: 'strikeouts', label: 'SO' },
  { key: 'walksAllowed', label: 'BB' },
  { key: 'hitBatters', label: 'HBP' },
  { key: 'w', label: 'W' },
  { key: 'l', label: 'L' },
  { key: 'saveEarned', label: 'SV' },
];

export function CsvUploadForm({ seasons, activePlayers, adminToken, apiBaseUrl }: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);

  const [matchedPlayers, setMatchedPlayers] = useState<MatchedPlayer[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [battingMvps, setBattingMvps] = useState<Set<number>>(new Set());
  const [pitchingMvps, setPitchingMvps] = useState<Set<number>>(new Set());

  const [battingExpanded, setBattingExpanded] = useState(true);
  const [pitchingExpanded, setPitchingExpanded] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGames = useCallback(async (seasonId: number) => {
    setGamesLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/games?seasonId=${seasonId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGames(data);
    } catch {
      setGames([]);
    } finally {
      setGamesLoading(false);
    }
  }, [apiBaseUrl]);

  const handleSeasonChange = (seasonId: number) => {
    setSelectedSeasonId(seasonId);
    setSelectedGameId(null);
    setMatchedPlayers([]);
    setFileName(null);
    setSubmitResult(null);
    if (seasonId) loadGames(seasonId);
    else setGames([]);
  };

  const handleGameChange = (gameId: number) => {
    setSelectedGameId(gameId);
    setMatchedPlayers([]);
    setFileName(null);
    setSubmitResult(null);
  };

  const handleFileUpload = useCallback((file: File) => {
    setParseError(null);
    setSubmitResult(null);
    setFileName(file.name);

    Papa.parse(file, {
      complete: (results) => {
        try {
          const rawData = results.data as string[][];
          const csvPlayers = parseCsv(rawData);

          if (csvPlayers.length === 0) {
            setParseError('CSV에서 선수 데이터를 찾을 수 없습니다.');
            setMatchedPlayers([]);
            return;
          }

          const matched: MatchedPlayer[] = csvPlayers.map((p) => {
            const match = activePlayers.find((ap) => ap.jerseyNumber === p.jerseyNumber);
            return {
              ...p,
              matchedPlayerId: match?.id ?? null,
              matchedPlayerLabel: match?.label ?? null,
              autoMatched: !!match,
            };
          });

          setMatchedPlayers(matched);
          setBattingMvps(new Set());
          setPitchingMvps(new Set());
        } catch {
          setParseError('CSV 파싱 중 오류가 발생했습니다.');
          setMatchedPlayers([]);
        }
      },
      error: () => {
        setParseError('파일을 읽을 수 없습니다.');
        setMatchedPlayers([]);
      },
    });
  }, [activePlayers]);

  const handleManualMatch = (index: number, playerId: number) => {
    setMatchedPlayers((prev) => {
      const next = [...prev];
      const player = activePlayers.find((ap) => ap.id === playerId);
      next[index] = {
        ...next[index],
        matchedPlayerId: playerId,
        matchedPlayerLabel: player?.label ?? null,
        autoMatched: false,
      };
      return next;
    });
  };

  const battingRows = useMemo(
    () => matchedPlayers.filter((p) => (p.batting.plateAppearances ?? 0) > 0),
    [matchedPlayers],
  );

  const pitchingRows = useMemo(
    () => matchedPlayers.filter((p) => (p.pitching.outsRecorded ?? 0) > 0),
    [matchedPlayers],
  );

  const allMatched = matchedPlayers.length > 0 && matchedPlayers.every((p) => p.matchedPlayerId !== null);

  const handleSubmit = async () => {
    if (!selectedGameId || !allMatched) return;

    setSubmitting(true);
    setSubmitResult(null);

    const battingStats = battingRows.map((p) => ({
      playerId: p.matchedPlayerId,
      ...p.batting,
      isMVP: battingMvps.has(p.matchedPlayerId!),
    }));

    const pitchingStats = pitchingRows.map((p) => {
      const { _ipRaw, ...rest } = p.pitching;
      return {
        playerId: p.matchedPlayerId,
        ...rest,
        isMVP: pitchingMvps.has(p.matchedPlayerId!),
      };
    });

    try {
      const res = await fetch(`${apiBaseUrl}/api/upload-game-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          gameId: selectedGameId,
          battingStats,
          pitchingStats,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmitResult({
          ok: true,
          message: `타격 ${data.inserted.batting}건, 투구 ${data.inserted.pitching}건 등록 완료!`,
        });
      } else {
        setSubmitResult({ ok: false, message: data.error || '등록 실패' });
      }
    } catch {
      setSubmitResult({ ok: false, message: '서버 연결 실패' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGame = games.find((g) => g.game_id === selectedGameId);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFileUpload(file);
  }, [handleFileUpload]);

  return (
    <div className="space-y-6">
      {/* Step 1: Game Selection */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-6 h-6 text-[#daaa00]" />
          <h2 className="text-xl font-bold text-[#daaa00]">GameChanger CSV 업로드</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">시즌 선택</label>
            <select
              value={selectedSeasonId ?? ''}
              onChange={(e) => handleSeasonChange(Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-[#daaa00] focus:outline-none"
            >
              <option value="">-- 시즌 선택 --</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">경기 선택</label>
            <select
              value={selectedGameId ?? ''}
              onChange={(e) => handleGameChange(Number(e.target.value))}
              disabled={!selectedSeasonId || gamesLoading}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-[#daaa00] focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {gamesLoading ? '로딩 중...' : '-- 경기 선택 --'}
              </option>
              {games.map((g) => (
                <option key={g.game_id} value={g.game_id}>
                  {g.game_date} vs {g.opponent}
                  {g.score !== null ? ` (${g.score}-${g.opp_score})` : ''}
                  {g.is_friendly ? ' [친선]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: File Upload */}
        {selectedGameId && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-500 rounded-xl p-8 text-center cursor-pointer hover:border-[#daaa00] transition-colors"
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-300">
              {fileName
                ? <span className="text-[#daaa00] font-semibold">{fileName}</span>
                : 'CSV 파일을 드래그하거나 클릭하여 선택하세요'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        )}

        {parseError && (
          <div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
            {parseError}
          </div>
        )}
      </div>

      {/* Step 3: Player Matching */}
      {matchedPlayers.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <h2 className="text-lg font-bold text-[#daaa00] mb-4">선수 매칭</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">CSV 이름</th>
                  <th className="text-left py-2 px-3">매칭된 선수</th>
                  <th className="text-center py-2 px-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {matchedPlayers.map((p, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 px-3 text-white font-mono">{p.jerseyNumber}</td>
                    <td className="py-2 px-3 text-gray-300">{p.csvName}</td>
                    <td className="py-2 px-3">
                      {p.matchedPlayerId ? (
                        <span className="text-green-400">{p.matchedPlayerLabel}</span>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => handleManualMatch(i, Number(e.target.value))}
                          className="bg-gray-800 text-yellow-300 rounded px-2 py-1 border border-yellow-500 text-sm w-full"
                        >
                          <option value="">-- 선수 선택 --</option>
                          {activePlayers.map((ap) => (
                            <option key={ap.id} value={ap.id}>{ap.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {p.matchedPlayerId ? (
                        <CheckCircle className="w-5 h-5 text-green-400 inline" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-400 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!allMatched && (
            <p className="text-yellow-400 text-sm mt-3">
              모든 선수를 매칭해야 기록을 등록할 수 있습니다.
            </p>
          )}
        </div>
      )}

      {/* Step 4: Stats Preview */}
      {allMatched && battingRows.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <button
            onClick={() => setBattingExpanded(!battingExpanded)}
            className="flex items-center gap-2 w-full text-left mb-3"
          >
            {battingExpanded ? <ChevronUp className="w-5 h-5 text-[#daaa00]" /> : <ChevronDown className="w-5 h-5 text-[#daaa00]" />}
            <h2 className="text-lg font-bold text-[#daaa00]">타격 기록 미리보기 ({battingRows.length}명)</h2>
          </button>
          {battingExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">선수</th>
                    {BATTING_PREVIEW_COLUMNS.map((c) => (
                      <th key={c.key} className="text-center py-2 px-2">{c.label}</th>
                    ))}
                    <th className="text-center py-2 px-2">
                      <Award className="w-4 h-4 inline text-[#daaa00]" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {battingRows.map((p) => (
                    <tr key={p.matchedPlayerId} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-2 px-2 text-white font-mono">{p.jerseyNumber}</td>
                      <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{p.matchedPlayerLabel}</td>
                      {BATTING_PREVIEW_COLUMNS.map((c) => (
                        <td key={c.key} className="text-center py-2 px-2 text-white">
                          {p.batting[c.key] ?? 0}
                        </td>
                      ))}
                      <td className="text-center py-2 px-2">
                        <input
                          type="checkbox"
                          checked={battingMvps.has(p.matchedPlayerId!)}
                          onChange={(e) => {
                            const next = new Set(battingMvps);
                            if (e.target.checked) next.add(p.matchedPlayerId!);
                            else next.delete(p.matchedPlayerId!);
                            setBattingMvps(next);
                          }}
                          className="accent-[#daaa00] w-4 h-4"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {allMatched && pitchingRows.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <button
            onClick={() => setPitchingExpanded(!pitchingExpanded)}
            className="flex items-center gap-2 w-full text-left mb-3"
          >
            {pitchingExpanded ? <ChevronUp className="w-5 h-5 text-[#daaa00]" /> : <ChevronDown className="w-5 h-5 text-[#daaa00]" />}
            <h2 className="text-lg font-bold text-[#daaa00]">투구 기록 미리보기 ({pitchingRows.length}명)</h2>
          </button>
          {pitchingExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">선수</th>
                    {PITCHING_PREVIEW_COLUMNS.map((c) => (
                      <th key={c.key} className="text-center py-2 px-2">{c.label}</th>
                    ))}
                    <th className="text-center py-2 px-2">
                      <Award className="w-4 h-4 inline text-[#daaa00]" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pitchingRows.map((p) => (
                    <tr key={p.matchedPlayerId} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-2 px-2 text-white font-mono">{p.jerseyNumber}</td>
                      <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{p.matchedPlayerLabel}</td>
                      {PITCHING_PREVIEW_COLUMNS.map((c) => (
                        <td key={c.key} className="text-center py-2 px-2 text-white">
                          {p.pitching[c.key] ?? 0}
                        </td>
                      ))}
                      <td className="text-center py-2 px-2">
                        <input
                          type="checkbox"
                          checked={pitchingMvps.has(p.matchedPlayerId!)}
                          onChange={(e) => {
                            const next = new Set(pitchingMvps);
                            if (e.target.checked) next.add(p.matchedPlayerId!);
                            else next.delete(p.matchedPlayerId!);
                            setPitchingMvps(next);
                          }}
                          className="accent-[#daaa00] w-4 h-4"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Submit */}
      {allMatched && (battingRows.length > 0 || pitchingRows.length > 0) && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">
                <span className="text-white font-semibold">{selectedGame?.game_date}</span>
                {' vs '}
                <span className="text-white font-semibold">{selectedGame?.opponent}</span>
                {' — '}
                타격 {battingRows.length}명, 투구 {pitchingRows.length}명
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-xl font-bold text-black bg-[#daaa00] hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '기록 등록'}
            </button>
          </div>

          {submitResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              submitResult.ok
                ? 'bg-green-900/50 border border-green-500 text-green-300'
                : 'bg-red-900/50 border border-red-500 text-red-300'
            }`}>
              {submitResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
