import { useLanguage } from '../i18n/LanguageContext';

export default function Footer() {
  var t = useLanguage().t;

  return (
    <footer className="mt-10 border-t border-[#daaa00]/40 pt-6 text-center text-xs text-gray-500">
      <p>{t('footer.copyright')}</p>
      <p className="mt-1 opacity-80">{t('footer.createdBy')}</p>
    </footer>
  );
}
