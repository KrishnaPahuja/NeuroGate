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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
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

  // Instantly pause and reload audio when dropdown changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.playbackRate = playbackSpeed;
      setIsPlaying(false);
    }
  }, [audioFormat, playbackSpeed]);

  // Apply playback speed whenever the user clicks the speed button
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

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

  // Function to cycle through speeds (1x -> 1.5x -> 2x -> 1x)
  const cycleSpeed = () => {
    setPlaybackSpeed(prev => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
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
    // 1. MAIN BACKGROUND: Beige/Light Slate
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#D3D3FF] selection:text-indigo-900 pb-24 transition-colors duration-300">
      
      {/* Dynamic Audio Source pointing to your new dual MP3s */}
      <audio 
        ref={audioRef} 
        src={audioFormat === 'podcast' ? '/podcast.mp3' : '/narration.mp3'} 
        onEnded={() => setIsPlaying(false)} 
      />

      {/* 2. HEADER: Light and frosty */}
      <header className="border-b border-slate-200 p-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">NeuroGate</h1>
          <p className="text-sm text-slate-500 mt-1">Your Daily Signal. Zero Noise.</p>
        </div>
        <div className="text-xs font-mono bg-white px-3 py-1 rounded-full border border-slate-200 text-teal-600 shadow-sm">
          ● SYSTEM ACTIVE
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* LEFT COLUMN: The Daily Briefing */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 3. AUDIO PLAYER: White and clean */}
          <section className="bg-white/60 border border-slate-200 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Today's Synthesis</h2>
            <div className="flex items-center space-x-4">
              
              {/* Play Button: Keeps Spotify Green with complimentary light hover */}
              <button 
                onClick={toggleAudio}
                className="w-14 h-14 bg-[#1DB954] hover:bg-[#1ed760] rounded-full flex items-center justify-center text-white transition-colors shadow-lg shadow-[#1DB954]/30 shrink-0"
              >
                {isPlaying ? (
                   // Pause Icon
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  // Play Icon
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              {/* Speed Button: White, clean, complimentary light hover */}
              <button 
                onClick={cycleSpeed}
                className="h-8 px-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 transition-colors shrink-0 shadow-sm"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              <div className="flex-1 ml-2">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  {/* Progress Bar: Keeps Spotify Green */}
                  <div className={`h-full bg-[#1DB954] rounded-full transition-all duration-1000 ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                  <span>{isPlaying ? "Playing..." : "Ready"}</span>
                  <span>{audioFormat === 'podcast' ? '2-Host Podcast' : 'Single Narration'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. DYNAMIC TEXT BRIEFING: White and clean */}
          <section className="space-y-4">
            {briefingItems.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-200 bg-white/40 text-center text-slate-500 shadow-sm">
                No briefing data available for today.
              </div>
            ) : (
              briefingItems.map((item, index) => (
                <div key={index} className="p-6 rounded-2xl border border-slate-200 bg-white/60 hover:bg-white transition-colors shadow-sm backdrop-blur-sm">
                  <h3 className="text-lg font-medium text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 mt-2 leading-relaxed">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-slate-500">
                    {item.sources.map((source, sIdx) => (
                      <span key={sIdx} className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        Source: {source}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* 5. RIGHT COLUMN: Shield Metrics: White and clean */}
        <aside className="space-y-6">
          <div className="bg-white/60 rounded-2xl border border-slate-200 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Shield Analytics</h2>
            {metrics ? (
              <ul className="space-y-4 text-sm font-medium">
                <li className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <span className="text-slate-600">Marketing jargon removed</span>
                  {/* Metrics text: Keeps Teal */}
                  <span className="text-teal-600 font-mono text-lg">{metrics.jargon_removed || 0}</span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <span className="text-slate-600">Duplicate stories merged</span>
                  <span className="text-teal-600 font-mono text-lg">{metrics.duplicates_merged || 0}</span>
                </li>
                <li className="flex justify-between items-center pb-2">
                  <span className="text-slate-600">Topics filtered</span>
                  <span className="text-teal-600 font-mono text-lg">{metrics.blocked_topics_filtered || 0}</span>
                </li>
              </ul>
            ) : (
              <div className="text-slate-400 text-sm">Metrics pending synthesis...</div>
            )}
          </div>
        </aside>

      </main>

      {/* 6. COMMAND CENTER: Light, frosty, complimentary light borders and text */}
      <div className="fixed bottom-0 w-full bg-[#F5F5DC]/90 backdrop-blur-xl border-t border-slate-200 p-4 shadow-inner">
        <form onSubmit={handleUpdatePreference} className="max-w-4xl mx-auto">
          {feedback && (
            <div className="text-xs font-mono text-teal-600 mb-2 ml-2 transition-opacity">
              {feedback}
            </div>
          )}
          <div className="flex items-center space-x-3">
            
            {/* Dropdown: White, complimentary light border and text */}
            <select 
              value={audioFormat}
              onChange={(e) => setAudioFormat(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none shadow-sm"
            >
              <option value="narration">Single Narration</option>
              <option value="podcast">2-Host Podcast</option>
            </select>

            {/* Input: White, complimentary light border and text */}
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Update logic (e.g., 'Block crypto news')..." 
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-400 disabled:opacity-50 shadow-sm"
            />
            {/* Submit Button: Spotify Green with dark text/white text */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="bg-[#1DB954] text-white hover:bg-[#1ed760] px-6 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Update
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}