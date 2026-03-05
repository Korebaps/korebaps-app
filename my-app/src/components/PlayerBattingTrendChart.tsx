import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type GamePoint = {
  game: number;
  date: string;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
};

type Props = {
  gameStats: Array<{
    game_date: string;
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
  }>;
};

function computeCumulativePoints(gameStats: Props['gameStats']): GamePoint[] {
  let pa = 0;
  let ab = 0;
  let h = 0;
  let bb = 0;
  let hbp = 0;
  let tb = 0;
  const points: GamePoint[] = [];

  gameStats.forEach((g, i) => {
    pa += g.plate_appearances ?? 0;
    ab += g.at_bats ?? 0;
    const singles = g.singles ?? 0;
    const doubles = g.doubles ?? 0;
    const triples = g.triples ?? 0;
    const hr = g.home_runs ?? 0;
    h += singles + doubles + triples + hr;
    bb += g.walks ?? 0;
    hbp += g.hit_by_pitch ?? 0;
    tb += singles + doubles * 2 + triples * 3 + hr * 4;

    const avg = ab > 0 ? Math.round((h / ab) * 1000) / 1000 : 0;
    const obp = pa > 0 ? Math.round(((h + bb + hbp) / pa) * 1000) / 1000 : 0;
    const slg = ab > 0 ? Math.round((tb / ab) * 1000) / 1000 : 0;
    const ops = avg + obp + slg;

    points.push({
      game: i + 1,
      date: new Date(g.game_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avg,
      obp,
      slg,
      ops,
    });
  });

  return points;
}

export default function PlayerBattingTrendChart({ gameStats }: Props) {
  if (!gameStats || gameStats.length < 2) return null;

  const data = computeCumulativePoints(gameStats);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
          <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 1.5]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value: number) => value.toFixed(3)}
          />
          <Legend />
          <Line type="monotone" dataKey="avg" stroke="#daaa00" strokeWidth={2} dot={{ r: 3 }} name="AVG" />
          <Line type="monotone" dataKey="obp" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="OBP" />
          <Line type="monotone" dataKey="slg" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="SLG" />
          <Line type="monotone" dataKey="ops" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="OPS" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
