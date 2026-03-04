import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex rounded-lg border border-[#daaa00] overflow-hidden text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 transition ${
          lang === 'en'
            ? 'bg-[#daaa00] text-black'
            : 'bg-transparent text-[#daaa00] hover:bg-[#daaa00]/20'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ko')}
        className={`px-3 py-1.5 transition ${
          lang === 'ko'
            ? 'bg-[#daaa00] text-black'
            : 'bg-transparent text-[#daaa00] hover:bg-[#daaa00]/20'
        }`}
      >
        KO
      </button>
    </div>
  );
}
