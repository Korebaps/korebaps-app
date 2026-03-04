import { useEffect, useState } from 'react';
import API_BASE_URL from '../apiBaseUrl';
import { useLanguage } from '../i18n/LanguageContext';

const THROTTLE_KEY = 'korebaps_visitor_last_record';
const SESSION_MS = 30 * 60 * 1000;

function getFingerprint() {
  const raw = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

function shouldRecord() {
  try {
    const last = parseInt(localStorage.getItem(THROTTLE_KEY) || '', 10);
    return !last || (Date.now() - last) > SESSION_MS;
  } catch (e) {
    return true;
  }
}

function markRecorded() {
  try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch (e) { /* noop */ }
}

export default function VisitorBanner() {
  var t;
  try { t = useLanguage().t; } catch (e) { t = function(k) { return k; }; }

  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(function() {
    var cancelled = false;

    async function load() {
      try {
        var data;

        if (shouldRecord()) {
          var res = await fetch(API_BASE_URL + '/api/visitor/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: getFingerprint() }),
          });
          if (!res.ok) throw new Error('record failed');
          data = await res.json();
          markRecorded();
        } else {
          var res2 = await fetch(API_BASE_URL + '/api/visitor/stats');
          if (!res2.ok) throw new Error('stats failed');
          data = await res2.json();
        }

        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(true);
      }
    }

    load();
    return function() { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="mt-4 py-2 bg-gray-800/50 rounded-lg text-center text-sm text-gray-400 font-mono">
        {t('visitor.unavailable')}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mt-4 py-2 bg-gray-800/50 rounded-lg text-center text-sm text-gray-400 font-mono">
        {t('visitor.loading')}
      </div>
    );
  }

  return (
    <div className="mt-4 py-2 bg-gray-800/60 rounded-lg text-center text-sm text-[#daaa00]/80 font-mono tracking-wider">
      {t('visitor.today')}: <span className="text-white font-bold">{stats.today.toLocaleString()}</span>
      {' \u00A0|\u00A0 '}
      {t('visitor.month')}: <span className="text-white font-bold">{stats.month.toLocaleString()}</span>
      {' \u00A0|\u00A0 '}
      {t('visitor.total')}: <span className="text-white font-bold">{stats.total.toLocaleString()}</span>
    </div>
  );
}
