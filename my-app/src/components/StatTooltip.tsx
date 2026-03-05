import { useLanguage } from '../i18n/LanguageContext';

type StatTooltipProps = {
  abbr: string;
  children: React.ReactNode;
  className?: string;
};

const STAT_KEYS: Record<string, string> = {
  PA: 'stat.pa',
  AB: 'stat.ab',
  '1B': 'stat.1b',
  '2B': 'stat.2b',
  '3B': 'stat.3b',
  HR: 'stat.hr',
  R: 'stat.r',
  K: 'stat.so',
  RBI: 'stat.rbi',
  BB: 'stat.bb',
  HBP: 'stat.hbp',
  SO: 'stat.so',
  SB: 'stat.sb',
  CS: 'stat.cs',
  AVG: 'stat.avg',
  OBP: 'stat.obp',
  SLG: 'stat.slg',
  OPS: 'stat.ops',
  WAR: 'stat.war',
  G: 'stat.g',
  IP: 'stat.ip',
  W: 'stat.w',
  RA: 'stat.ra',
  ER: 'stat.er',
  H: 'stat.h',
  Point: 'stat.point',
  Score: 'stat.score',
  Pitches: 'stat.pitches',
  ERA: 'stat.era',
  WHIP: 'stat.whip',
  'K/9': 'stat.k9',
};

export function StatTooltip({ abbr, children, className = '' }: StatTooltipProps) {
  const { t } = useLanguage();
  const key = STAT_KEYS[abbr];
  const tooltip = key ? t(key) : abbr;

  return (
    <span
      className={`cursor-help border-b border-dotted border-gray-400 border-opacity-60 hover:border-[#daaa00] ${className}`}
      title={tooltip}
    >
      {children}
    </span>
  );
}
