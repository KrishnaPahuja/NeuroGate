"use client";

import React, { useState, useEffect, useRef } from 'react';

// Define the shape of our data so TypeScript is happy
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
  // Command Center State
  const [inputValue, setInputValue] = useState("");
  const [audioFormat, setAudioFormat] = useState("narration"); // Format state
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Dashboard State
  const [briefingItems, setBriefingItems] = useState<BriefingItem[]>([]);
  const [metrics, setMetrics] = useState<ShieldMetrics | null>(null);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch the data when the page loads
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

  // 🚀 NEW CHANGE 1: Instantly pause and reload audio when dropdown changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      setIsPlaying(false);
    }
  }, [audioFormat]);

  // Handle the Audio Play/Pause button
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

  // Handle Command Center submission
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
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-900 selection:text-emerald-50 pb-24">
      
      {/* 🚀 NEW CHANGE 2: Dynamic Audio Source pointing to your new dual MP3s */}
      <audio 
        ref={audioRef} 
        src={audioFormat === 'podcast' ? '/podcast.mp3' : '/narration.mp3'} 
        onEnded={() => setIsPlaying(false)} 
      />

      {/* HEADER */}
      <header className="border-b border-zinc-800 p-6 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Cognitive Shield</h1>
          <p className="text-sm text-zinc-500 mt-1">Your Daily Signal. Zero Noise.</p>
        </div>
        <div className="text-xs font-mono bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-emerald-400">
          ● SYSTEM ACTIVE
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* LEFT COLUMN: The Daily Briefing */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AUDIO PLAYER */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Today's Synthesis</h2>
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleAudio}
                className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center text-zinc-950 transition-colors shadow-lg shadow-emerald-900/20"
              >
                {isPlaying ? (
                   // Pause Icon
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  // Play Icon
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <div className="flex-1">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-emerald-500 rounded-full transition-all duration-1000 ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                  <span>{isPlaying ? "Playing..." : "Ready"}</span>
                  {/* 🚀 NEW CHANGE 3: Dynamic Label */}
                  <span>{audioFormat === 'podcast' ? '2-Host Podcast' : 'Single Narration'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* DYNAMIC TEXT BRIEFING */}
          <section className="space-y-4">
            {briefingItems.length === 0 ? (
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 text-center text-zinc-500">
                No briefing data available for today.
              </div>
            ) : (
              briefingItems.map((item, index) => (
                <div key={index} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                  <h3 className="text-lg font-medium text-zinc-100">{item.title}</h3>
                  <p className="text-zinc-400 mt-2 leading-relaxed">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-zinc-600">
                    {item.sources.map((source, sIdx) => (
                      <span key={sIdx} className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        Source: {source}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: The Shield Metrics */}
        <aside className="space-y-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Shield Analytics</h2>
            {metrics ? (
              <ul className="space-y-4 text-sm">
                <li className="flex justify-between items-center border-b border-zinc-800 pb-4">
                  <span className="text-zinc-400">Marketing jargon removed</span>
                  <span className="text-emerald-400 font-mono text-lg">{metrics.jargon_removed || 0}</span>
                </li>
                <li className="flex justify-between items-center border-b border-zinc-800 pb-4">
                  <span className="text-zinc-400">Duplicate stories merged</span>
                  <span className="text-emerald-400 font-mono text-lg">{metrics.duplicates_merged || 0}</span>
                </li>
                <li className="flex justify-between items-center pb-2">
                  <span className="text-zinc-400">Topics filtered</span>
                  <span className="text-emerald-400 font-mono text-lg">{metrics.blocked_topics_filtered || 0}</span>
                </li>
              </ul>
            ) : (
              <div className="text-zinc-500 text-sm">Metrics pending synthesis...</div>
            )}
          </div>
        </aside>

      </main>

      {/* COMMAND CENTER */}
      <div className="fixed bottom-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-4">
        <form onSubmit={handleUpdatePreference} className="max-w-4xl mx-auto">
          {feedback && (
            <div className="text-xs font-mono text-emerald-400 mb-2 ml-2 transition-opacity">
              {feedback}
            </div>
          )}
          <div className="flex items-center space-x-3">
            
            {/* The Format Dropdown */}
            <select 
              value={audioFormat}
              onChange={(e) => setAudioFormat(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="narration">Single Narration</option>
              <option value="podcast">2-Host Podcast</option>
            </select>

            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Update logic (e.g., 'Stop showing me news about cricket')..." 
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600 disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isLoading} 
              className="bg-zinc-100 text-zinc-950 px-6 py-3 rounded-xl text-sm font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Logic
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}