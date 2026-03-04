import { createContext, useCallback, useContext, useState } from 'react';
import en from './en';
import ko from './ko';

const STORAGE_KEY = 'korebaps_lang';

const dictionaries = { en, ko };

function getInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ko' || stored === 'en') return stored;
  } catch { /* noop */ }
  return 'en';
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
  }, []);

  const t = useCallback((key) => {
    return dictionaries[lang][key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
