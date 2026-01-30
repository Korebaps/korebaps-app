import React, { useState, useEffect } from 'react';

const VisitorTracker = ({ className = '' }) => {
  const [stats, setStats] = useState({
    daily: 0,
    monthly: 0,
    accumulated: 0
  });

  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const storedData = localStorage.getItem('visitorStats');
      let visitorData = storedData ? JSON.parse(storedData) : {
        daily: {},
        monthly: {},
        accumulated: 0,
        lastVisit: null
      };

      const now = Date.now();
      const lastVisit = visitorData.lastVisit;
      const isNewVisit = !lastVisit || (now - lastVisit) > 30 * 60 * 1000;

      if (isNewVisit) {
        if (!visitorData.daily[today]) {
          visitorData.daily[today] = 0;
        }
        visitorData.daily[today]++;

        if (!visitorData.monthly[currentMonth]) {
          visitorData.monthly[currentMonth] = 0;
        }
        visitorData.monthly[currentMonth]++;

        visitorData.accumulated++;
        visitorData.lastVisit = now;

        localStorage.setItem('visitorStats', JSON.stringify(visitorData));
      }

      const dailyCount = visitorData.daily[today] || 0;
      const monthlyCount = visitorData.monthly[currentMonth] || 0;

      setStats({
        daily: dailyCount,
        monthly: monthlyCount,
        accumulated: visitorData.accumulated
      });
    } catch (error) {
      console.error('Visitor tracker error:', error);
    }
  }, []);

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 text-blue-400 flex-shrink-0">📅</div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">Today's Visitors</p>
            <p className="text-lg font-bold text-white">{stats.daily.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 text-green-400 flex-shrink-0">📈</div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">This Month</p>
            <p className="text-lg font-bold text-white">{stats.monthly.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 text-[#daaa00] flex-shrink-0">👥</div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">Total Visitors</p>
            <p className="text-lg font-bold text-white">{stats.accumulated.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitorTracker;
