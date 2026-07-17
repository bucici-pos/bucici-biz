/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, MessageSquare, ArrowRight, BookOpen } from 'lucide-react';

interface AiSistenBuciciProps {
  tenantId: string;
  user: any;
  onRefresh?: () => void;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AiSistenBucici({ tenantId, user, onRefresh }: AiSistenBuciciProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Halo! Saya **AI-sisten Bucici**, sahabat setia bisnismu. 🌸\n\nSaya telah menganalisis sisa stok barang, omzet harian, dan mutasi laci kas tokomu secara otomatis. \n\nAda yang bisa saya bantu analisa hari ini? Silakan tanya saya tentang strategi promosi, analisis stok menipis, atau tips pembukuan kasir!`,
      timestamp: new Date()
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollChat = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollChat();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          role: user.role, // 'Owner' or 'Employee'
          tenant_id: tenantId
        })
      });

      const data = await res.json();
      if (data.success && data.data?.text) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: data.data.text,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: `Maaf, saya mengalami kendala teknis saat menghubungi otak AI. ${data.error || 'Silakan coba lagi beberapa saat.'}`,
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Maaf, terjadi masalah koneksi jaringan internet. Silakan coba kembali.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick prompt suggestions
  const suggestions = [
    { label: 'Bagaimana cara menaikkan omzet?', prompt: 'Berikan saya strategi taktis dan konkret untuk meningkatkan omzet penjualan warung/toko saya berdasarkan data stok saat ini!' },
    { label: 'Analisa produk stok menipis', prompt: 'Tolong analisa produk saya yang stoknya hampir habis. Berikan rekomendasi kapan harus restock dan ide promosi barang lain.' },
    { label: 'Tips kelola laci kas', prompt: 'Bagaimana cara terbaik mengawasi selisih kas laci antara kasir pagi dan malam?' },
    { label: 'Ide promosi hari ini', prompt: 'Buatkan saya 3 contoh konsep promosi beli 2 gratis 1 atau paket bundling makanan minuman yang paling menarik untuk pembeli hari ini!' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[450px]" id="ai_sisten_tab">
      
      {/* 1. TOP HEADER BRAND */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-4 text-white shadow-md flex justify-between items-center shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner text-blue-100">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              AI-sisten Bucici
              <span className="text-[9px] bg-blue-500 px-1.5 py-0.5 rounded font-extrabold tracking-wider animate-bounce">PRO</span>
            </h4>
            <p className="text-[10px] text-blue-100">Pakar Ritel & Konsultan UMKM Pribadi Anda.</p>
          </div>
        </div>
        
        <span className="text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
          Smart Business Mode
        </span>
      </div>

      {/* 2. CHAT VIEW AREA */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 overflow-y-auto space-y-4 shadow-inner flex flex-col min-h-0" id="chat_view_area">
        {messages.map((m, idx) => {
          const isAI = m.sender === 'ai';
          return (
            <div 
              key={idx} 
              id={`chat_bubble_${idx}`}
              className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start' : 'self-end flex-row-reverse'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isAI ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-800 text-white'
              }`}>
                {isAI ? <Bot size={16} /> : <User size={16} />}
              </div>

              <div className={`p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed shadow-sm font-sans ${
                isAI 
                  ? 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none' 
                  : 'bg-blue-600 text-white rounded-tr-none'
              }`}>
                
                {/* Minimalist custom markdown formatter helper */}
                <div className="whitespace-pre-wrap">
                  {m.text.split('\n').map((line, lIdx) => {
                    // Check for bold notation **text**
                    let renderedLine = line;
                    
                    // Simple bold replacement
                    const boldRegex = /\*\*(.*?)\*\*/g;
                    const parts = [];
                    let lastIndex = 0;
                    let match;
                    
                    while ((match = boldRegex.exec(line)) !== null) {
                      if (match.index > lastIndex) {
                        parts.push(line.substring(lastIndex, match.index));
                      }
                      parts.push(<strong key={match.index} className={isAI ? "text-slate-900 font-extrabold" : "text-white font-bold"}>{match[1]}</strong>);
                      lastIndex = boldRegex.lastIndex;
                    }
                    
                    if (lastIndex < line.length) {
                      parts.push(line.substring(lastIndex));
                    }

                    const finalContent = parts.length > 0 ? parts : line;

                    // Bullet lists
                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                      return (
                        <div key={lIdx} className="pl-4 flex items-start gap-1.5 mt-1">
                          <span className={isAI ? "text-blue-600" : "text-blue-200"}>•</span>
                          <span className="flex-1">{finalContent}</span>
                        </div>
                      );
                    }
                    return <p key={lIdx}>{finalContent}</p>;
                  })}
                </div>

                <span className={`text-[8px] block text-right mt-1.5 ${isAI ? 'text-slate-400 font-medium' : 'text-blue-100 font-medium'}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-3 self-start items-center" id="ai_typing_bubble">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center animate-spin">
              <RefreshCw size={14} />
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 3. SUGGESTIONS LIST ROW */}
      <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar shrink-0" id="suggestions_row">
        {suggestions.map((s, i) => (
          <button
            key={i}
            id={`ai_suggest_btn_${i}`}
            onClick={() => handleSend(s.prompt)}
            disabled={loading}
            className="bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 p-2 rounded-xl text-[10px] font-bold text-slate-600 whitespace-nowrap flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <MessageSquare size={10} className="text-blue-600" />
            {s.label}
            <ArrowRight size={10} />
          </button>
        ))}
      </div>

      {/* 4. CHAT INPUT PANEL */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputPrompt);
        }} 
        className="flex gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 shrink-0"
        id="chat_input_form"
      >
        <input
          id="ai_chat_input_text"
          type="text"
          placeholder="Tanyakan analisa omzet atau strategi promosi di sini..."
          className="flex-1 bg-white px-3.5 py-2.5 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          disabled={loading}
          autoFocus
        />
        
        <button
          id="ai_chat_send_submit"
          type="submit"
          disabled={!inputPrompt.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
