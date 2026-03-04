import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PlayerDetailPage from './pages/PlayerDetailPage.tsx';
import AdminDashboard from './admin.tsx';
import ActiveRosterPage from './pages/ActiveRosterPage.tsx';
import GameRecordsPage from './pages/GameRecordsPage.tsx';
import GameDetailPage from './pages/GameDetailPage.tsx';
import Videos from './Videos.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname;
const isPlayerPage = pathname.startsWith('/player');
const isAdminPage = pathname.startsWith('/admin');
const isRosterPage = pathname.startsWith('/roster');
const isGamesPage = pathname.startsWith('/games');
const isGameDetailPage = pathname.startsWith('/game');
const isMediaPage = pathname.startsWith('/media');
const RootComponent = isPlayerPage
  ? PlayerDetailPage
  : isAdminPage
    ? AdminDashboard
    : isRosterPage
      ? ActiveRosterPage
      : isGamesPage
        ? GameRecordsPage
        : isGameDetailPage
          ? GameDetailPage
          : isMediaPage
            ? Videos
            : App;

root.render(
  <React.StrictMode>
    {isAdminPage ? (
      <AdminDashboard />
    ) : (
      <LanguageProvider>
        <RootComponent />
      </LanguageProvider>
    )}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
