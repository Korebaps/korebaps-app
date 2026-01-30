import { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar } from 'lucide-react';

interface VisitorStats {
  daily: number;
  monthly: number;
  accumulated: number;
}

interface VisitorTrackerProps {
  className?: string;
}

export default function VisitorTracker({ className = '' }: VisitorTrackerProps) {
  const [stats, setStats] = useState<VisitorStats>({
    daily: 0,
    monthly: 0,
    accumulated: 0
  });

  useEffect(() => {
    // Get visitor stats from localStorage
    const getVisitorStats = () => {
      const today = new Date().toDateString();
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Get stored data
      const storedData = localStorage.getItem('visitorStats');
      let visitorData = storedData ? JSON.parse(storedData) : {
        daily: {},
        monthly: {},
        accumulated: 0,
        lastVisit: null
      };

      // Check if this is a new visit (not just a page refresh)
      const now = Date.now();
      const lastVisit = visitorData.lastVisit;
      const isNewVisit = !lastVisit || (now - lastVisit) > 30 * 60 * 1000; // 30 minutes

      if (isNewVisit) {
        // Update daily count
        if (!visitorData.daily[today]) {
          visitorData.daily[today] = 0;
        }
        visitorData.daily[today]++;

        // Update monthly count
        if (!visitorData.monthly[currentMonth]) {
          visitorData.monthly[currentMonth] = 0;
        }
        visitorData.monthly[currentMonth]++;

        // Update accumulated count
        visitorData.accumulated++;

        // Update last visit time
        visitorData.lastVisit = now;

        // Save to localStorage
        localStorage.setItem('visitorStats', JSON.stringify(visitorData));
      }

      // Calculate current stats
      const dailyCount = visitorData.daily[today] || 0;
      const monthlyCount = visitorData.monthly[currentMonth] || 0;

      setStats({
        daily: dailyCount,
        monthly: monthlyCount,
        accumulated: visitorData.accumulated
      });
    };

    getVisitorStats();
  }, []);

  const statItems = [
    {
      icon: Calendar,
      label: "Today's Visitors",
      value: stats.daily.toLocaleString(),
      color: "text-blue-400"
    },
    {
      icon: TrendingUp,
      label: "This Month",
      value: stats.monthly.toLocaleString(),
      color: "text-green-400"
    },
    {
      icon: Users,
      label: "Total Visitors",
      value: stats.accumulated.toLocaleString(),
      color: "text-[#daaa00]"
    }
  ];

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statItems.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color} flex-shrink-0`} />
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
