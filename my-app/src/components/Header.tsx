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
    <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border-2 border-[#daaa00] overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <a href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition">
          <img src={logoSrc} alt="코레밥스 로고" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-[#daaa00]">{title}</h1>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>
        </a>
        {action ? <div className="w-full md:w-auto max-w-full">{action}</div> : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
