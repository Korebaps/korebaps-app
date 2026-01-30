import React, { useState, useEffect } from 'react';

const VisitorCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('visitorCount');
      const lastVisit = localStorage.getItem('lastVisit');
      const now = Date.now();
      
      const isNewVisit = !lastVisit || (now - parseInt(lastVisit)) > 30 * 60 * 1000;
      
      if (isNewVisit) {
        const newCount = stored ? parseInt(stored) + 1 : 1;
        localStorage.setItem('visitorCount', newCount.toString());
        localStorage.setItem('lastVisit', now.toString());
        setCount(newCount);
      } else {
        setCount(stored ? parseInt(stored) : 0);
      }
    } catch {
      setCount(0);
    }
  }, []);

  return (
    <span className="text-xs text-gray-600 ml-2">
      ({count.toLocaleString()} visitors)
    </span>
  );
};

export default VisitorCounter;
