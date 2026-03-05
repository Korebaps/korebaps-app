import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import BottomNav from './components/BottomNav.tsx';
import App from './App';
import PlayerDetailPage from './pages/PlayerDetailPage.tsx';
import AdminDashboard from './admin.tsx';
import ActiveRosterPage from './pages/ActiveRosterPage.tsx';
import GameRecordsPage from './pages/GameRecordsPage.tsx';
import GameDetailPage from './pages/GameDetailPage.tsx';
import Videos from './Videos.tsx';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route
          path="/*"
          element={
            <LanguageProvider>
              <>
                <BottomNav />
                <div className="pb-20 md:pb-0">
                  <Routes>
                <Route path="/" element={<App />} />
                <Route path="/player" element={<PlayerDetailPage />} />
                <Route path="/roster" element={<ActiveRosterPage />} />
                <Route path="/games" element={<GameRecordsPage />} />
                <Route path="/game" element={<GameDetailPage />} />
                <Route path="/media" element={<Videos />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </>
            </LanguageProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
