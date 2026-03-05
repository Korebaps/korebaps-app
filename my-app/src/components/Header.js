import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import API_BASE_URL from '../apiBaseUrl';

const THROTTLE_KEY = 'korebaps_visitor_last_record';
const SESSION_MS = 30 * 60 * 1000;

function getFingerprint() {
  var raw = [
    navigator.userAgent,
    window.screen.width + 'x' + window.screen.height,
    window.screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  var h = 0;
  for (var i = 0; i < raw.length; i++) {
    h = ((h << 5) - h) + raw.charCodeAt(i);
    h |= 0;
  }
  return 'fp_' + Math.abs(h).toString(36);
}

function shouldRecord() {
  try {
    var last = parseInt(localStorage.getItem(THROTTLE_KEY) || '', 10);
    return !last || (Date.now() - last) > SESSION_MS;
  } catch (e) { return true; }
}

function markRecorded() {
  try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch (e) { /* */ }
}

export default function Header({ logoSrc, title, subtitle, stats, action }) {
  var ctx = useLanguage();
  var lang = ctx.lang;
  var setLang = ctx.setLang;
  var t = ctx.t;

  var _vs = useState(null);
  var vStats = _vs[0];
  var setVStats = _vs[1];

  var _ve = useState(false);
  var vError = _ve[0];
  var setVError = _ve[1];

  useEffect(function () {
    var cancelled = false;
    (async function () {
      try {
        var data;
        if (shouldRecord()) {
          var res = await fetch(API_BASE_URL + '/api/visitor/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: getFingerprint() }),
          });
          if (!res.ok) throw new Error();
          data = await res.json();
          markRecorded();
        } else {
          var res2 = await fetch(API_BASE_URL + '/api/visitor/stats');
          if (!res2.ok) throw new Error();
          data = await res2.json();
        }
        if (!cancelled) setVStats(data);
      } catch (e) {
        if (!cancelled) setVError(true);
      }
    })();
    return function () { cancelled = true; };
  }, []);

  var visitorRow;
  if (vError) {
    visitorRow = (
      <div className="mt-4 py-2 bg-gray-800/50 rounded-lg text-center text-sm text-gray-400 font-mono">
        {t('visitor.unavailable')}
      </div>
    );
  } else if (!vStats) {
    visitorRow = (
      <div className="mt-4 py-2 bg-gray-800/50 rounded-lg text-center text-sm text-gray-400 font-mono animate-pulse">
        {t('visitor.loading')}
      </div>
    );
  } else {
    visitorRow = (
      <div className="mt-4 py-2 bg-gray-800/60 rounded-lg text-center text-sm text-[#daaa00]/80 font-mono tracking-wider">
        {t('visitor.today')}: <span className="text-white font-bold">{vStats.today.toLocaleString()}</span>
        {' \u00A0|\u00A0 '}
        {t('visitor.month')}: <span className="text-white font-bold">{vStats.month.toLocaleString()}</span>
        {' \u00A0|\u00A0 '}
        {t('visitor.total')}: <span className="text-white font-bold">{vStats.total.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border-2 border-[#daaa00] overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <a href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition">
          <img src={logoSrc} alt={t('header.logoAlt')} className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-[#daaa00]">{title}</h1>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>
        </a>
        <div className="flex items-center gap-3 w-full md:w-auto max-w-full overflow-x-auto">
          <div className="inline-flex shrink-0 rounded-lg border-2 border-[#daaa00] overflow-hidden text-sm font-bold">
            <button
              type="button"
              onClick={function () { setLang('en'); }}
              className={'px-4 py-2 transition ' + (lang === 'en' ? 'bg-[#daaa00] text-black' : 'bg-transparent text-[#daaa00] hover:bg-[#daaa00]/20')}
            >
              EN
            </button>
            <button
              type="button"
              onClick={function () { setLang('ko'); }}
              className={'px-4 py-2 transition ' + (lang === 'ko' ? 'bg-[#daaa00] text-black' : 'bg-transparent text-[#daaa00] hover:bg-[#daaa00]/20')}
            >
              KO
            </button>
          </div>
          {action ? <div className="flex-1 min-w-0 overflow-x-auto">{action}</div> : null}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(function (stat) {
          return (
            <div key={stat.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>
      {visitorRow}
    </div>
  );
}
