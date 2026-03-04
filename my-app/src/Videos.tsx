import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import logo from './assets/logo.png';
import { useLanguage } from './i18n/LanguageContext';

function Videos() {
  const { t } = useLanguage();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const feedUrl = useMemo(() => (
    process.env.REACT_APP_YOUTUBE_RSS_URL
    || 'https://www.youtube.com/feeds/videos.xml?channel_id=UCfiC15GKrgL4LcYKWcjfgpQ'
  ), []);

  type VideoItem = {
    id: string;
    title: string;
    thumbnailUrl: string;
    watchUrl: string;
    publishedAt?: string;
  };

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);

        const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
        const res = await fetch(proxiedUrl);
        if (!res.ok) {
          throw new Error(`Failed to load feed (${res.status})`);
        }

        const xmlText = await res.text();
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
          throw new Error('Failed to parse RSS feed');
        }

        const entries = Array.from(doc.getElementsByTagName('entry'));
        const items: VideoItem[] = [];
        for (const entry of entries) {
          const videoId = entry.getElementsByTagName('yt:videoId')[0]?.textContent?.trim();
          if (!videoId) continue;

          const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() || 'Untitled';
          const published = entry.getElementsByTagName('published')[0]?.textContent?.trim();

          const links = Array.from(entry.getElementsByTagName('link'));
          const watchUrl = links
            .find((l) => l.getAttribute('rel') === 'alternate')
            ?.getAttribute('href')
            || `https://www.youtube.com/watch?v=${videoId}`;

          const thumbnailUrl = entry.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url')
            || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

          items.push({
            id: videoId,
            title,
            thumbnailUrl,
            watchUrl,
            publishedAt: published,
          });
        }

        if (!cancelled) {
          setVideos(items);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        if (!cancelled) {
          setError(message);
          setVideos([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFeed();

    return () => {
      cancelled = true;
    };
  }, [feedUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header
          logoSrc={logo}
          title={t('videos.title')}
          subtitle={t('videos.subtitle')}
          stats={[
            { label: 'YouTube', value: '@Korebaps' },
            
          ]}
          action={(
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 rounded-lg border border-[#daaa00] text-[#daaa00] hover:bg-[#daaa00] hover:text-black transition"
              >
                {t('common.home')}
              </button>
              <a
                href="https://www.youtube.com/@Korebaps?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                {t('videos.subscribe')}
              </a>
            </div>
          )}
        />

        {selectedVideo && (
          <div className="mb-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#daaa00]">{t('videos.nowPlaying')}</h2>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
              >
                {t('common.close')}
              </button>
            </div>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 border-2 border-[#daaa00]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#daaa00]">{t('videos.latestVideos')}</h2>
            <a
              href="https://www.youtube.com/@Korebaps/videos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 transition"
            >
              {t('videos.viewAll')}
            </a>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="aspect-video bg-gray-800 rounded-lg border-2 border-gray-700" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-5/6" />
                    <div className="h-3 bg-gray-700 rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-700/60 bg-red-900/20 p-4 text-red-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{t('videos.loadError')}</p>
                  <p className="text-sm mt-1 opacity-90">{error}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
                >
                  {t('common.refresh')}
                </button>
              </div>
            </div>
          )}

          {!loading && !error && videos.length === 0 && (
            <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-6 text-gray-200">
              <p className="font-semibold">{t('videos.noVideos')}</p>
              <p className="text-sm mt-1 text-gray-400">{t('videos.tryLater')}</p>
            </div>
          )}

          {!loading && !error && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group cursor-pointer"
                onClick={() => setSelectedVideo(video.id)}
              >
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 group-hover:border-[#daaa00] transition-all">
                  <img
                    src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-white font-semibold group-hover:text-[#daaa00] transition-colors line-clamp-2">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <p className="text-gray-400 text-sm">@Korebaps</p>
                    <a
                      href={video.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-300 text-sm hover:text-[#daaa00] transition"
                    >
                      YouTube
                    </a>
                  </div>
                  {video.publishedAt && (
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-400 mb-4">
              {t('videos.visitChannel')}
            </p>
            <a
              href="https://www.youtube.com/@Korebaps/videos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              {t('videos.viewAllYouTube')}
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}

export default Videos;
