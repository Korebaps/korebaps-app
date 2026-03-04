import { useEffect, useState } from 'react';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

type VisitorStats = { today: number; month: number; total: number };

const THROTTLE_KEY = 'korebaps_visitor_last_record';
const SESSION_MS = 30 * 60 * 1000;

function getFingerprint(): string {
  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function shouldRecord(): boolean {
  try {
    const last = parseInt(localStorage.getItem(THROTTLE_KEY) || '', 10);
    return !last || (Date.now() - last) > SESSION_MS;
  } catch {
    return true;
  }
}

function markRecorded() {
  try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch { /* noop */ }
}

export default function VisitorBanner() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let data: VisitorStats;

        if (shouldRecord()) {
          const res = await fetch(`${API_BASE_URL}/api/visitor/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: getFingerprint() }),
          });
          if (!res.ok) throw new Error();
          data = await res.json();
          markRecorded();
        } else {
          const res = await fetch(`${API_BASE_URL}/api/visitor/stats`);
          if (!res.ok) throw new Error();
          data = await res.json();
        }

        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="mt-4 pt-3 border-t border-[#daaa00]/30 text-center text-xs text-gray-500 font-mono">
        {t('visitor.unavailable')}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mt-4 pt-3 border-t border-[#daaa00]/30 text-center text-xs text-gray-500 font-mono">
        {t('visitor.loading')}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-[#daaa00]/30 text-center text-xs text-gray-400 font-mono tracking-wide">
      {t('visitor.today')}: {stats.today.toLocaleString()} &nbsp;|&nbsp; {t('visitor.month')}: {stats.month.toLocaleString()} &nbsp;|&nbsp; {t('visitor.total')}: {stats.total.toLocaleString()}
    </div>
  );
}
