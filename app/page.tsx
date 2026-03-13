"use client";

import React, { useState, useEffect, useRef } from 'react';

interface BriefingItem {
  title: string;
  summary: string;
  sources: string[];
}

interface ShieldMetrics {
  jargon_removed: number;
  duplicates_merged: number;
  blocked_topics_filtered: number;
}

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [audioFormat, setAudioFormat] = useState("narration");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [briefingItems, setBriefingItems] = useState<BriefingItem[]>([]);
  const [metrics, setMetrics] = useState<ShieldMetrics | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await fetch('/api/briefing');
        const data = await res.json();
        if (data.briefing_items) {
          setBriefingItems(data.briefing_items);
          setMetrics(data.metrics);
        }
      } catch (error) {
        console.error("Failed to fetch briefing:", error);
      }
    };
    fetchBriefing();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.playbackRate = playbackSpeed;
      setIsPlaying(false);
    }
  }, [audioFormat, playbackSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const cycleSpeed = () => {
    setPlaybackSpeed(prev => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  };

  const handleUpdatePreference = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setFeedback("Thinking...");

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputValue,
          audio_format: audioFormat
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setFeedback(`✅ ${data.message || 'Preferences updated!'}`);
        setInputValue("");
      } else {
        setFeedback(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setFeedback("❌ Failed to reach the server.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedback(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#1DB954] selection:text-black pb-24 transition-colors duration-300">
      
      <audio 
        ref={audioRef} 
        src={audioFormat === 'podcast' ? '/podcast.mp3' : '/narration.mp3'} 
        onEnded={() => setIsPlaying(false)} 
      />

      <header className="border-b border-[#282828] p-6 flex justify-between items-center bg-[#000000]/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cognitive Shield</h1>
          <p className="text-sm text-[#B3B3B3] mt-1">Your Daily Signal. Zero Noise.</p>
        </div>
        <div className="text-xs font-bold font-mono bg-[#1DB954]/10 px-3 py-1 rounded-full border border-[#1DB954]/20 text-[#1DB954]">
          ● SYSTEM ACTIVE
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-[#181818] rounded-2xl p-6 transition-all">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B3B3B3] mb-4">Now Playing</h2>
            <div className="flex items-center space-x-4">
              
              {/* Spotify Green Play Button with scale animation */}
              <button 
                onClick={toggleAudio}
                className="w-14 h-14 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 rounded-full flex items-center justify-center text-black transition-all shrink-0"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              <button 
                onClick={cycleSpeed}
                className="h-8 px-3 rounded-full bg-[#282828] hover:bg-[#3E3E3E] text-xs font-bold font-mono text-white transition-colors shrink-0"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              <div className="flex-1 ml-2">
                <div className="h-2 bg-[#4D4D4D] rounded-full overflow-hidden flex items-center">
                  {/* Spotify Green Progress Bar */}
                  <div className={`h-full bg-[#1DB954] rounded-full transition-all duration-1000 ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                </div>
                <div className="flex justify-between text-xs text-[#B3B3B3] mt-2 font-semibold">
                  <span>{isPlaying ? "Playing..." : "Ready"}</span>
                  <span>{audioFormat === 'podcast' ? '2-Host Podcast' : 'Single Narration'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {briefingItems.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#181818] text-center text-[#B3B3B3] font-medium">
                No briefing data available for today.
              </div>
            ) : (
              briefingItems.map((item, index) => (
                <div key={index} className="p-6 rounded-2xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-default">
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-[#B3B3B3] mt-2 leading-relaxed">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#B3B3B3]">
                    {item.sources.map((source, sIdx) => (
                      <span key={sIdx} className="bg-[#282828] px-3 py-1 rounded-full">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-[#181818] rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B3B3B3] mb-6">Shield Analytics</h2>
            {metrics ? (
              <ul className="space-y-4 text-sm font-medium">
                <li className="flex justify-between items-center pb-4">
                  <span className="text-[#B3B3B3]">Marketing jargon removed</span>
                  <span className="text-[#1DB954] font-bold text-lg">{metrics.jargon_removed || 0}</span>
                </li>
                <li className="flex justify-between items-center pb-4">
                  <span className="text-[#B3B3B3]">Duplicate stories merged</span>
                  <span className="text-[#1DB954] font-bold text-lg">{metrics.duplicates_merged || 0}</span>
                </li>
                <li className="flex justify-between items-center pb-2">
                  <span className="text-[#B3B3B3]">Topics filtered</span>
                  <span className="text-[#1DB954] font-bold text-lg">{metrics.blocked_topics_filtered || 0}</span>
                </li>
              </ul>
            ) : (
              <div className="text-[#B3B3B3] text-sm font-medium">Metrics pending synthesis...</div>
            )}
          </div>
        </aside>

      </main>

      <div className="fixed bottom-0 w-full bg-[#000000]/95 backdrop-blur-xl border-t border-[#282828] p-4">
        <form onSubmit={handleUpdatePreference} className="max-w-4xl mx-auto">
          {feedback && (
            <div className="text-xs font-bold text-[#1DB954] mb-2 ml-2 transition-opacity">
              {feedback}
            </div>
          )}
          <div className="flex items-center space-x-3">
            
            <select 
              value={audioFormat}
              onChange={(e) => setAudioFormat(e.target.value)}
              className="bg-[#282828] text-white rounded-full px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1DB954] cursor-pointer appearance-none"
            >
              <option value="narration">Single Narration</option>
              <option value="podcast">2-Host Podcast</option>
            </select>

            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Update logic (e.g., 'Block crypto news')..." 
              className="flex-1 bg-[#282828] text-white rounded-full px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1DB954] transition-all placeholder:text-[#B3B3B3] disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isLoading} 
              className="bg-[#1DB954] text-black hover:bg-[#1ed760] hover:scale-105 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Update
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}