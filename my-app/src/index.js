import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PlayerDetailPage from './pages/PlayerDetailPage.tsx';
import AdminDashboard from './admin.tsx';
import ActiveRosterPage from './pages/ActiveRosterPage.tsx';
import GameRecordsPage from './pages/GameRecordsPage.tsx';
import GameDetailPage from './pages/GameDetailPage.tsx';
import PlayerComparisonPage from './pages/PlayerComparisonPage.tsx';
import GuidePage from './pages/GuidePage.tsx';
import Videos from './Videos.tsx';
import MainLayout from './components/MainLayout.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Support deployment with base path (e.g. /korebaps-app)
const publicUrl = process.env.PUBLIC_URL || '';
const basePath = publicUrl && publicUrl.startsWith('/') ? publicUrl.replace(/\/$/, '') : '';
const pathname = basePath && window.location.pathname.startsWith(basePath)
  ? window.location.pathname.slice(basePath.length) || '/'
  : window.location.pathname;
const isPlayerPage = pathname.startsWith('/player');
const isAdminPage = pathname.startsWith('/admin');
const isRosterPage = pathname.startsWith('/roster');
const isGamesPage = pathname.startsWith('/games');
const isGameDetailPage = pathname.startsWith('/game');
const isMediaPage = pathname.startsWith('/media');
const isComparePage = pathname.startsWith('/compare');
const isGuidePage = pathname.startsWith('/guide');
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
            : isComparePage
              ? PlayerComparisonPage
              : isGuidePage
                ? GuidePage
                : App;

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isAdminPage ? (
        <AdminDashboard />
      ) : (
        <LanguageProvider>
          <MainLayout>
            <RootComponent />
          </MainLayout>
        </LanguageProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
