import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  var ctx = useLanguage();
  var lang = ctx.lang;
  var setLang = ctx.setLang;

  return (
    <div className="inline-flex shrink-0 rounded-lg border-2 border-[#daaa00] overflow-hidden text-sm font-bold">
      <button
        type="button"
        onClick={function() { setLang('en'); }}
        className={
          'px-4 py-2 transition ' +
          (lang === 'en'
            ? 'bg-[#daaa00] text-black'
            : 'bg-transparent text-[#daaa00] hover:bg-[#daaa00]/20')
        }
      >
        EN
      </button>
      <button
        type="button"
        onClick={function() { setLang('ko'); }}
        className={
          'px-4 py-2 transition ' +
          (lang === 'ko'
            ? 'bg-[#daaa00] text-black'
            : 'bg-transparent text-[#daaa00] hover:bg-[#daaa00]/20')
        }
      >
        KO
      </button>
    </div>
  );
}
