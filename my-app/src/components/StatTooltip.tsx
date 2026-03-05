import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type StatTooltipProps = {
  statKey: string;
  children: React.ReactNode;
  className?: string;
};

export function StatTooltip({ statKey, children, className = '' }: StatTooltipProps) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tooltipText = t(`stats.${statKey}`);
  const hasTooltip = tooltipText && tooltipText !== `stats.${statKey}`;

  useEffect(() => {
    if (!show) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  if (!hasTooltip) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {children}
      <div className="relative inline-block" ref={ref}>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          onBlur={() => setTimeout(() => setShow(false), 150)}
          className="text-gray-400 hover:text-[#daaa00] transition p-0.5 rounded-full focus:outline-none focus:ring-1 focus:ring-[#daaa00]"
          aria-label={tooltipText}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        {show && (
          <div
            className="absolute z-50 left-0 top-full mt-1 px-2 py-1.5 text-xs text-white bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-w-[200px] whitespace-normal"
            role="tooltip"
          >
            {tooltipText}
          </div>
        )}
      </div>
    </span>
  );
}
