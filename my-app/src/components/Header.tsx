import type { ReactNode } from 'react';

type StatItem = {
  label: string;
  value: ReactNode;
};

type HeaderProps = {
  logoSrc: string;
  title: string;
  subtitle: string;
  stats: StatItem[];
  action?: ReactNode;
};

export default function Header({ logoSrc, title, subtitle, stats, action }: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-black via-gray-900 to-black rounded-2xl shadow-2xl p-8 mb-8 border-2 border-[#daaa00] overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <a href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-all duration-200 hover:scale-105">
          <img src={logoSrc} alt="코레밥스 로고" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-[#daaa00]" style={{ textShadow: '0 0 15px rgba(218, 170, 0, 0.4)' }}>{title}</h1>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>
        </a>
        {action ? <div className="w-full md:w-auto max-w-full overflow-x-auto">{action}</div> : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 rounded-xl p-5 shadow-lg transition-all duration-200 hover:border-[#daaa00]/50 hover:shadow-[#daaa00]/20">
            <p className="text-xs text-gray-400 font-semibold">{stat.label}</p>
            <p className="text-xl font-bold text-white font-mono">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
