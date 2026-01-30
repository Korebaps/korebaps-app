import React from 'react';
import VisitorCounter from './VisitorCounter';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#daaa00]/40 pt-6 text-center text-xs text-gray-500">
      <p>
        © 2026 Korebaps Stats Dashboard. All rights reserved.<br />
        Made by Junsu Yoon(17), Taerim Kim(66)
        <VisitorCounter />
      </p>
    </footer>
  );
}
