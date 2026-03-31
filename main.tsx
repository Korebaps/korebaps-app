import { useState, useEffect } from 'react';
import { PlusCircle, Download, Trash2, Calculator, Award } from 'lucide-react';
import { BattingRecordForm } from './components/BattingRecordForm';
import { PitchingRecordForm } from './components/PitchingRecordForm';
import { RecordSummary } from './components/RecordSummary';
import { PointTable } from './components/PointTable';
import logo from './image/logo.png';

export interface BattingRecord {
  id: string;
  playerNumber: string;
  playerName: string;
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
  /** Season total from API (DB); preferred for Score */
  score?: number;
}

export interface PitchingRecord {
  id: string;
  playerName: string;
  inningsPitched: number | string;
  wins: number;
  strikeouts: number;
  runsAllowed: number;
  earnedRuns: number;
  hitsAllowed: number;
  walks: number;
  pitchCount: number;
  isMVP: boolean;
}

const mockPitchingRecords: PitchingRecord[] = [];

type BattingStatsApiRow = {
  jersey_number: number | string;
  first_name: string;
  last_name: string;
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
};

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

function calculateBattingScoreKorebaps(record: BattingRecord): number {
  let score = 0;
  score += record.singles * 1;
  score += record.doubles * 2;
  score += record.triples * 3;
  score += record.homeRuns * 5;
  score += record.runs * 1;
  score += record.rbi * 2;
  score += record.walks * 0.5;
  score += record.hitByPitch * 0.5;
  score += record.stolenBases * 1;
  if (record.isMVP) score += 5;
  return score;
}

function calculatePitchingScoreKorebaps(record: PitchingRecord): number {
  const outs = outsFromBaseballIpDisplay(record.inningsPitched);
  const innings = outs / 3;
  let score = 0;
  score += innings * 1;
  score += record.wins * 5;
  score += record.strikeouts * 2;
  score -= record.earnedRuns * 0.5;
  if (record.isMVP) score += 5;
  return score;
}

function MainDashboard() {
  const [battingRecords, setBattingRecords] = useState<BattingRecord[]>([]);
  const [battingLoading, setBattingLoading] = useState(true);
  const [battingError, setBattingError] = useState<string | null>(null);

  useEffect(() => {
    const loadBattingStats = async () => {
      try {
        setBattingLoading(true);
        setBattingError(null);

        const response = await fetch('https://statcalculator-backend.onrender.com/api/seasonal-batting-stats?seasonId=1');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as BattingStatsApiRow[];
        const mapped = data.map((row) => ({
          id: `${row.jersey_number}-${row.first_name}-${row.last_name}`,
          playerNumber: String(row.jersey_number),
          playerName: `${row.first_name} ${row.last_name}`.trim(),
          plateAppearances: Number(row.total_pa) || 0,
          atBats: Number(row.total_ab) || 0,
          singles: Number(row.total_1b) || 0,
          doubles: Number(row.total_2b) || 0,
          triples: Number(row.total_3b) || 0,
          homeRuns: Number(row.total_hr) || 0,
          runs: Number(row.total_runs) || 0,
          rbi: Number(row.total_rbi) || 0,
          walks: Number(row.total_bb) || 0,
          hitByPitch: Number(row.total_hbp) || 0,
          strikeouts: Number(row.total_strikeouts) || 0,
          stolenBases: Number(row.total_sb) || 0,
          isMVP: false,
          score: Number(row.total_batting_points) || undefined,
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
  }, []);

  const calculateBattingAvg = (record: BattingRecord) => {
    if (record.atBats === 0) return '-.---';
    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
    return (hits / record.atBats).toFixed(3);
  };

  const calculateOBP = (record: BattingRecord) => {
    if (record.plateAppearances === 0) return '-.---';
    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
    return ((hits + record.walks + record.hitByPitch) / record.plateAppearances).toFixed(3);
  };

  const calculateSLG = (record: BattingRecord) => {
    if (record.atBats === 0) return '-.---';
    const totalBases = record.singles + (record.doubles * 2) + (record.triples * 3) + (record.homeRuns * 4);
    return (totalBases / record.atBats).toFixed(3);
  };

  const calculateBattingScore = (record: BattingRecord) => calculateBattingScoreKorebaps(record);

  const calculatePitchingScore = (record: PitchingRecord) => calculatePitchingScoreKorebaps(record);

  const calculateERA = (record: PitchingRecord) => {
    const inn = outsFromBaseballIpDisplay(record.inningsPitched) / 3;
    if (inn === 0) return '-.--';
    return ((record.earnedRuns * 9) / inn).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border-2 border-[#daaa00]">
          <div className="flex items-center gap-4 mb-6">
            <img src={logo} alt="코레밥스 로고" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-[#daaa00]">코레밥스 선수 기록</h1>
              <p className="text-gray-400 text-sm mt-1">Korebaps Stats Dashboard</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-400">기록 기준일</p>
              <p className="text-xl font-bold text-white">2026-01-20</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-400">등록 선수</p>
              <p className="text-xl font-bold text-white">{battingRecords.length}명</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-400">투구 기록</p>
              <p className="text-xl font-bold text-white">{mockPitchingRecords.length}명</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-6 h-6 text-[#daaa00]" />
              <h2 className="text-xl font-bold text-[#daaa00]">타격 스탯</h2>
            </div>
            {battingLoading ? (
              <div className="text-center text-gray-400">Loading...</div>
            ) : battingError ? (
              <div className="text-center text-red-500">{battingError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-white border-collapse">
                  <thead className="text-xs text-gray-300">
                    <tr className="border-b border-[#daaa00]">
                      <th className="py-2 px-2 text-left">#</th>
                      <th className="py-2 px-2 text-left">선수명</th>
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
                      <th className="py-2 px-2">AVG</th>
                      <th className="py-2 px-2">OBP</th>
                      <th className="py-2 px-2">SLG</th>
                      <th className="py-2 px-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battingRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-700">
                        <td className="py-2 px-2 text-[#daaa00]">{record.playerNumber}</td>
                        <td className="py-2 px-2 font-semibold">{record.playerName}</td>
                        <td className="py-2 px-2 text-center">{record.plateAppearances}</td>
                        <td className="py-2 px-2 text-center">{record.atBats}</td>
                        <td className="py-2 px-2 text-center">{record.singles}</td>
                        <td className="py-2 px-2 text-center">{record.doubles}</td>
                        <td className="py-2 px-2 text-center">{record.triples}</td>
                        <td className="py-2 px-2 text-center">{record.homeRuns}</td>
                        <td className="py-2 px-2 text-center">{record.runs}</td>
                        <td className="py-2 px-2 text-center">{record.rbi}</td>
                        <td className="py-2 px-2 text-center">{record.walks}</td>
                        <td className="py-2 px-2 text-center">{record.hitByPitch}</td>
                        <td className="py-2 px-2 text-center">{record.strikeouts}</td>
                        <td className="py-2 px-2 text-center">{record.stolenBases}</td>
                        <td className="py-2 px-2 text-center text-[#daaa00]">{calculateBattingAvg(record)}</td>
                        <td className="py-2 px-2 text-center text-[#daaa00]">{calculateOBP(record)}</td>
                        <td className="py-2 px-2 text-center text-[#daaa00]">{calculateSLG(record)}</td>
                        <td className="py-2 px-2 text-center font-bold text-black">
                          <span className="bg-[#daaa00] rounded px-2 py-1 inline-block">
                            {record.score ?? calculateBattingScore(record)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-6 h-6 text-[#daaa00]" />
              <h2 className="text-xl font-bold text-[#daaa00]">투구 스탯</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white border-collapse">
                <thead className="text-xs text-gray-300">
                  <tr className="border-b border-[#daaa00]">
                    <th className="py-2 px-2 text-left">선수명</th>
                    <th className="py-2 px-2">IP</th>
                    <th className="py-2 px-2">Win</th>
                    <th className="py-2 px-2">K</th>
                    <th className="py-2 px-2">실점</th>
                    <th className="py-2 px-2">자책</th>
                    <th className="py-2 px-2">H</th>
                    <th className="py-2 px-2">BB</th>
                    <th className="py-2 px-2">투구수</th>
                    <th className="py-2 px-2">ERA</th>
                    <th className="py-2 px-2">Point</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPitchingRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-700">
                      <td className="py-2 px-2 font-semibold">{record.playerName}</td>
                      <td className="py-2 px-2 text-center">{record.inningsPitched}</td>
                      <td className="py-2 px-2 text-center">{record.wins}</td>
                      <td className="py-2 px-2 text-center">{record.strikeouts}</td>
                      <td className="py-2 px-2 text-center">{record.runsAllowed}</td>
                      <td className="py-2 px-2 text-center">{record.earnedRuns}</td>
                      <td className="py-2 px-2 text-center">{record.hitsAllowed}</td>
                      <td className="py-2 px-2 text-center">{record.walks}</td>
                      <td className="py-2 px-2 text-center">{record.pitchCount}</td>
                      <td className="py-2 px-2 text-center text-[#daaa00]">{calculateERA(record)}</td>
                      <td className="py-2 px-2 text-center font-bold text-black">
                        <span className="bg-[#daaa00] rounded px-2 py-1 inline-block">
                          {calculatePitchingScore(record)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <PointTable />
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'batting' | 'pitching'>('batting');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [season, setSeason] = useState('');
  const [opponent, setOpponent] = useState('');

  const [battingRecords, setBattingRecords] = useState<BattingRecord[]>([]);
  const [pitchingRecords, setPitchingRecords] = useState<PitchingRecord[]>([]);

  const addBattingRecord = (record: Omit<BattingRecord, 'id'>) => {
    setBattingRecords([...battingRecords, { ...record, id: Date.now().toString() }]);
  };

  const addPitchingRecord = (record: Omit<PitchingRecord, 'id'>) => {
    setPitchingRecords([...pitchingRecords, { ...record, id: Date.now().toString() }]);
  };

  const deleteBattingRecord = (id: string) => {
    setBattingRecords(battingRecords.filter(r => r.id !== id));
  };

  const deletePitchingRecord = (id: string) => {
    setPitchingRecords(pitchingRecords.filter(r => r.id !== id));
  };

  const toggleBattingMVP = (id: string) => {
    setBattingRecords(battingRecords.map(r => 
      r.id === id ? { ...r, isMVP: !r.isMVP } : r
    ));
  };

  const togglePitchingMVP = (id: string) => {
    setPitchingRecords(pitchingRecords.map(r => 
      r.id === id ? { ...r, isMVP: !r.isMVP } : r
    ));
  };

  const calculateBattingAvg = (record: BattingRecord) => {
    if (record.atBats === 0) return '-.---';
    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
    return (hits / record.atBats).toFixed(3);
  };

  const calculateOBP = (record: BattingRecord) => {
    if (record.plateAppearances === 0) return '-.---';
    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
    return ((hits + record.walks + record.hitByPitch) / record.plateAppearances).toFixed(3);
  };

  const calculateSLG = (record: BattingRecord) => {
    if (record.atBats === 0) return '-.---';
    const totalBases = record.singles + (record.doubles * 2) + (record.triples * 3) + (record.homeRuns * 4);
    return (totalBases / record.atBats).toFixed(3);
  };

  const calculateBattingScore = (record: BattingRecord) => calculateBattingScoreKorebaps(record);

  const calculatePitchingScore = (record: PitchingRecord) => calculatePitchingScoreKorebaps(record);

  const calculateERA = (record: PitchingRecord) => {
    const inn = outsFromBaseballIpDisplay(record.inningsPitched) / 3;
    if (inn === 0) return '-.--';
    return ((record.earnedRuns * 9) / inn).toFixed(2);
  };

  const downloadAsCSV = () => {
    let csv = `경기일자,${gameDate}\n시즌,${season}\n상대팀,${opponent}\n\n`;
    
    if (battingRecords.length > 0) {
      csv += '타격 기록\n';
      csv += '#,선수명,PA,AB,1B,2B,3B,HR,R,RBI,BB,HBP,SO,SB,타율,출루율,장타율,MVP,Score\n';
      battingRecords.forEach(record => {
        const hits = record.singles + record.doubles + record.triples + record.homeRuns;
        csv += `${record.playerNumber},${record.playerName},${record.plateAppearances},${record.atBats},${record.singles},${record.doubles},${record.triples},${record.homeRuns},${record.runs},${record.rbi},${record.walks},${record.hitByPitch},${record.strikeouts},${record.stolenBases},${calculateBattingAvg(record)},${calculateOBP(record)},${calculateSLG(record)},${record.isMVP ? 'MVP' : ''},${record.score ?? calculateBattingScore(record)}\n`;
      });
      csv += '\n';
    }

    if (pitchingRecords.length > 0) {
      csv += '투구 기록\n';
      csv += '선수명,Inning,Win,K,실점,자책,H,BB,투구수,방어율,MVP,Total Point\n';
      pitchingRecords.forEach(record => {
        csv += `${record.playerName},${record.inningsPitched},${record.wins},${record.strikeouts},${record.runsAllowed},${record.earnedRuns},${record.hitsAllowed},${record.walks},${record.pitchCount},${calculateERA(record)},${record.isMVP ? 'MVP' : ''},${calculatePitchingScore(record)}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `야구기록_${season}_${gameDate}_${opponent || '상대팀'}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border-2 border-[#daaa00]">
          <div className="flex items-center gap-4 mb-6">
            <img src={logo} alt="코레밥스 로고" className="w-16 h-16 object-contain" /> 
            <div>
              <h1 className="text-3xl font-bold text-[#daaa00]">코레밥스 경기 기록 관리</h1>
              <p className="text-gray-400 text-sm mt-1">Korebaps Stats</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#daaa00] mb-2">시즌</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
              >
                <option value="2025-Spring">2025 Spring</option>
                <option value="2025-Fall">2025 Fall</option>
                <option value="2026-Spring">2026 Spring</option>
                <option value="2026-Fall">2026 Fall</option>
                <option value="2027-Spring">2027 Spring</option>
                <option value="2027-Fall">2027 Fall</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#daaa00] mb-2">경기 날짜</label>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#daaa00] mb-2">상대 팀</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="상대 팀 이름"
                className="w-full px-4 py-2 bg-gray-800 border-2 border-[#daaa00] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#daaa00] focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={downloadAsCSV}
                disabled={battingRecords.length === 0 && pitchingRecords.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#daaa00] text-black font-bold rounded-lg hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-5 h-5" />
                CSV 다운로드
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
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
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-6 h-6 text-[#daaa00]" />
              <h2 className="text-xl font-bold text-[#daaa00]">
                {activeTab === 'batting' ? '타격 기록 추가' : '투구 기록 추가'}
              </h2>
            </div>
            
            {activeTab === 'batting' ? (
              <BattingRecordForm onSubmit={addBattingRecord} />
            ) : (
              <PitchingRecordForm onSubmit={addPitchingRecord} />
            )}
          </div>

          {/* Records List */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <h2 className="text-xl font-bold text-[#daaa00] mb-4">
              {activeTab === 'batting' ? '타격 기록 목록' : '투구 기록 목록'}
            </h2>
            
            {activeTab === 'batting' ? (
              battingRecords.length === 0 ? (
                <p className="text-gray-400 text-center py-8">아직 등록된 타격 기록이 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {battingRecords.map((record) => {
                    const hits = record.singles + record.doubles + record.triples + record.homeRuns;
                    return (
                      <div key={record.id} className="border-2 border-[#daaa00] rounded-lg p-4 bg-gray-800 hover:shadow-lg hover:shadow-[#daaa00]/20 transition-shadow relative">
                        {record.isMVP && (
                          <div className="absolute top-2 right-2">
                            <Award className="w-6 h-6 text-[#daaa00] fill-[#daaa00]" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-sm text-[#daaa00]">#{record.playerNumber}</span>
                            <h3 className="font-bold text-lg text-white">{record.playerName}</h3>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleBattingMVP(record.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                record.isMVP 
                                  ? 'bg-[#daaa00] text-black' 
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              MVP
                            </button>
                            <button
                              onClick={() => deleteBattingRecord(record.id)}
                              className="text-red-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                          <div><span className="text-gray-400">PA:</span> <span className="font-medium text-white">{record.plateAppearances}</span></div>
                          <div><span className="text-gray-400">AB:</span> <span className="font-medium text-white">{record.atBats}</span></div>
                          <div><span className="text-gray-400">H:</span> <span className="font-medium text-white">{hits}</span></div>
                          <div><span className="text-gray-400">1B:</span> <span className="font-medium text-white">{record.singles}</span></div>
                          <div><span className="text-gray-400">2B:</span> <span className="font-medium text-white">{record.doubles}</span></div>
                          <div><span className="text-gray-400">3B:</span> <span className="font-medium text-white">{record.triples}</span></div>
                          <div><span className="text-gray-400">HR:</span> <span className="font-medium text-white">{record.homeRuns}</span></div>
                          <div><span className="text-gray-400">R:</span> <span className="font-medium text-white">{record.runs}</span></div>
                          <div><span className="text-gray-400">RBI:</span> <span className="font-medium text-white">{record.rbi}</span></div>
                          <div><span className="text-gray-400">BB:</span> <span className="font-medium text-white">{record.walks}</span></div>
                          <div><span className="text-gray-400">HBP:</span> <span className="font-medium text-white">{record.hitByPitch}</span></div>
                          <div><span className="text-gray-400">SO:</span> <span className="font-medium text-white">{record.strikeouts}</span></div>
                          <div><span className="text-gray-400">SB:</span> <span className="font-medium text-white">{record.stolenBases}</span></div>
                        </div>
                        <div className="pt-3 border-t border-[#daaa00] flex justify-between items-center">
                          <div className="grid grid-cols-3 gap-2 text-sm flex-1">
                            <div className="bg-gray-700 rounded px-2 py-1">
                              <span className="text-gray-400">타율:</span> <span className="font-bold text-[#daaa00]">{calculateBattingAvg(record)}</span>
                            </div>
                            <div className="bg-gray-700 rounded px-2 py-1">
                              <span className="text-gray-400">출루율:</span> <span className="font-bold text-[#daaa00]">{calculateOBP(record)}</span>
                            </div>
                            <div className="bg-gray-700 rounded px-2 py-1">
                              <span className="text-gray-400">장타율:</span> <span className="font-bold text-[#daaa00]">{calculateSLG(record)}</span>
                            </div>
                          </div>
                          <div className="bg-[#daaa00] rounded px-3 py-2 ml-2">
                            <span className="text-black text-sm font-medium">Score:</span> <span className="font-bold text-black text-lg">{record.score ?? calculateBattingScore(record)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              pitchingRecords.length === 0 ? (
                <p className="text-gray-400 text-center py-8">아직 등록된 투구 기록이 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {pitchingRecords.map((record) => (
                    <div key={record.id} className="border-2 border-[#daaa00] rounded-lg p-4 bg-gray-800 hover:shadow-lg hover:shadow-[#daaa00]/20 transition-shadow relative">
                      {record.isMVP && (
                        <div className="absolute top-2 right-2">
                          <Award className="w-6 h-6 text-[#daaa00] fill-[#daaa00]" />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-white">{record.playerName}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePitchingMVP(record.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              record.isMVP 
                                ? 'bg-[#daaa00] text-black' 
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            MVP
                          </button>
                          <button
                            onClick={() => deletePitchingRecord(record.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                        <div><span className="text-gray-400">Inning:</span> <span className="font-medium text-white">{record.inningsPitched}</span></div>
                        <div><span className="text-gray-400">Win:</span> <span className="font-medium text-white">{record.wins}</span></div>
                        <div><span className="text-gray-400">K:</span> <span className="font-medium text-white">{record.strikeouts}</span></div>
                        <div><span className="text-gray-400">실점:</span> <span className="font-medium text-white">{record.runsAllowed}</span></div>
                        <div><span className="text-gray-400">자책:</span> <span className="font-medium text-white">{record.earnedRuns}</span></div>
                        <div><span className="text-gray-400">H:</span> <span className="font-medium text-white">{record.hitsAllowed}</span></div>
                        <div><span className="text-gray-400">BB:</span> <span className="font-medium text-white">{record.walks}</span></div>
                        <div><span className="text-gray-400">투구수:</span> <span className="font-medium text-white">{record.pitchCount}</span></div>
                      </div>
                      <div className="pt-3 border-t border-[#daaa00] flex justify-between items-center">
                        <div className="bg-gray-700 rounded px-3 py-2">
                          <span className="text-gray-400">방어율:</span> <span className="font-bold text-[#daaa00] text-lg">{calculateERA(record)}</span>
                        </div>
                        <div className="bg-[#daaa00] rounded px-3 py-2">
                          <span className="text-black font-medium">Total Point:</span> <span className="font-bold text-black text-lg">{calculatePitchingScore(record)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Summary Section */}
        {(battingRecords.length > 0 || pitchingRecords.length > 0) && (
          <RecordSummary 
            battingRecords={battingRecords}
            pitchingRecords={pitchingRecords}
            calculateBattingAvg={calculateBattingAvg}
            calculateOBP={calculateOBP}
            calculateSLG={calculateSLG}
            calculateERA={calculateERA}
          />
        )}

        {/* Point Table */}
        <PointTable />
      </div>
    </div>
  );
}

export default function App() {
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';
  return isAdmin ? <AdminDashboard /> : <MainDashboard />;
}