/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Video, ExternalLink, RefreshCw, Layers, Clock } from 'lucide-react';

interface InfoPost {
  post_id: string;
  content: string;
  link?: string;
  type: 'YouTube' | 'Link';
  created_at: string;
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export default function RuangInfo() {
  const [posts, setPosts] = useState<InfoPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/info-posts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPosts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="space-y-6" id="ruang_info">
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-amber-50 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Ruang Info & Edukasi Pedagang
          </span>
          <h3 className="text-lg font-bold text-slate-800 mt-1.5 font-sans">Edukasi & Info Terkini</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Dapatkan panduan jualan, tip operasional, video tutorial, serta pembaruan fitur multi-tenant langsung dari tim pusat Bucici Biz.
          </p>
        </div>

        <button
          id="info_refresh_btn"
          onClick={fetchPosts}
          disabled={loading}
          className="p-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-xl text-slate-600 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Segarkan Info
        </button>
      </div>

      {/* REVIEWS GRID LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="info_posts_grid">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold">Mengunduh pengumuman terbaru...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <BookOpen size={32} className="mx-auto stroke-1 mb-2" />
            <p className="text-xs font-bold text-slate-500">Belum Ada Pengumuman Aktif</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Pantau halaman ini secara berkala untuk menerima tips & promo eksklusif.</p>
          </div>
        ) : (
          posts.map((post) => {
            const isVideo = post.type === 'YouTube';
            return (
              <div 
                key={post.post_id} 
                id={`info_card_${post.post_id}`}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Decorative glow shape for YouTube style */}
                {isVideo && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
                )}

                <div className="space-y-3">
                  {/* Top row type indicators */}
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    {isVideo ? (
                      <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-red-100">
                        <Video size={10} />
                        Video Tutorial
                      </span>
                    ) : (
                      <span className="bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-sky-100">
                        <ExternalLink size={10} />
                        E-Artikel & Tips
                      </span>
                    )}

                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Body Content text */}
                  <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Inline YouTube Player */}
                  {isVideo && post.link && (() => {
                    const embedUrl = getYouTubeEmbedUrl(post.link);
                    return embedUrl ? (
                      <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-100 mt-2">
                        <iframe
                          className="w-full h-full"
                          src={embedUrl}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* External hyperlink launcher button */}
                {post.link && (
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <a
                      id={`info_link_launcher_${post.post_id}`}
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2 px-4 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 w-full transition-colors ${
                        isVideo 
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' 
                          : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
                      }`}
                    >
                      {isVideo ? <Video size={12} /> : <ExternalLink size={12} />}
                      {isVideo ? 'Tonton Video Tutorial' : 'Buka Panduan Selengkapnya'}
                    </a>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
