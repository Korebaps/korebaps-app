export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#daaa00]/40 pt-6 text-center text-xs text-gray-500">
      <div className="mb-3 flex justify-center gap-4">
        {/* YouTube */}
        <a
          href="https://www.youtube.com/@Korebaps"   
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#daaa00] transition"
        >
          YouTube
        </a>

        {/* Instagram */}
        <a
          href="https://www.instagram.com/purdue_korebaps/"  
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#daaa00] transition"
        >
          Instagram
        </a>
      </div>

      <p>© 2026 Korebaps Stats Dashboard. All rights reserved.</p>
      <p>Made by Junsu Yoon(17), Taerim Kim(66)</p>
    </footer>
  );
}
