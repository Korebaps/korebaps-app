import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type BattingRecord = {
  playerName: string;
  ops?: number | string;
  playerNumber: string;
};

type PitchingRecord = {
  playerName: string;
  strikeouts?: number;
  playerNumber: string;
};

type Props = {
  battingRecords: BattingRecord[];
  pitchingRecords: PitchingRecord[];
};

const formatOPS = (v: number | string | undefined) => {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export default function TopPlayersChart({ battingRecords, pitchingRecords }: Props) {
  const topBatters = [...battingRecords]
    .filter((r) => formatOPS(r.ops) > 0)
    .sort((a, b) => formatOPS(b.ops) - formatOPS(a.ops))
    .slice(0, 5)
    .map((r) => ({ name: `#${r.playerNumber} ${r.playerName}`, value: formatOPS(r.ops) }));

  const topPitchers = [...pitchingRecords]
    .filter((r) => (r.strikeouts ?? 0) > 0)
    .sort((a, b) => (b.strikeouts ?? 0) - (a.strikeouts ?? 0))
    .slice(0, 5)
    .map((r) => ({ name: `#${r.playerNumber} ${r.playerName}`, value: r.strikeouts ?? 0 }));

  if (topBatters.length === 0 && topPitchers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {topBatters.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-[#daaa00] mb-3">Top 5 Batters (OPS)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBatters} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} domain={[0, 'auto']} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={10} width={55} tick={{ fill: '#e5e7eb' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(value: number) => value.toFixed(3)}
                />
                <Bar dataKey="value" fill="#daaa00" radius={[0, 4, 4, 0]} name="OPS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {topPitchers.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-[#daaa00] mb-3">Top 5 Pitchers (K)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPitchers} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={10} width={55} tick={{ fill: '#e5e7eb' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="K" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
