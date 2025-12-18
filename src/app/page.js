"use client";

import Navbar from "@/components/Navbar";
import { Suspense } from "react";
import GrapeditEditor from "@/components/GrapeditEditor";
import { Scissors, Layers, Zap, Lock, Wand2, Download, Share2, Upload, Loader2 } from "lucide-react";

export default function Home() {
  const scrollToHowItWorks = () => {
    const element = document.getElementById("how-it-works");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            New Generation Video Editor
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 animate-fade-in-up delay-100">
            Edit Videos with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Professional Precision
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-10 animate-fade-in-up delay-200">
            Powerful, browser-based video editing.
            Split, merge, and export your videos instantly.
            No registration required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
            <button
              onClick={() => document.getElementById('editor-section').scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Start Editing Now
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 hover:text-white rounded-full border border-slate-700 transition-all duration-200"
            >
              How It Works
            </button>
          </div>
        </div>
      </div>

      {/* Editor Section */}
      <div id="editor-section" className="relative z-10 -mt-10 sm:-mt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-800/50 shadow-2xl overflow-hidden ring-1 ring-white/10">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            }>
              <GrapeditEditor />
            </Suspense>
          </div>
        </div>
      </div>

      {/* SEO & Features Content Section */}
      <section className="py-20 px-6 bg-[#0F1115] border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          {/* SEO Header */}
          <div className="text-center mb-16">
            <span className="text-purple-400 font-medium text-sm tracking-wider uppercase bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Why Grapedit?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 text-white">
              The Ultimate Online Video Editor
            </h2>
            <p className="text-slate-400 mt-4 text-lg max-w-3xl mx-auto leading-relaxed">
              Grapedit is a powerful <strong>browser-based video editor</strong> designed for creators who need fast, privacy-focused tools.
              Edit <strong>local video files</strong> and merge clips without ever sending data to a server.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            <FeatureItem
              icon={<Scissors className="text-pink-400" />}
              title="Precise Trimming"
              description="Cut videos with frame-perfect accuracy. Remove unwanted segments in seconds."
            />
            <FeatureItem
              icon={<Layers className="text-blue-400" />}
              title="Merge & Join"
              description="Combine multiple clips into a single seamless video file instantly."
            />
            <FeatureItem
              icon={<Lock className="text-green-400" />}
              title="100% Private"
              description="All processing happens locally via WebAssembly. Your files never leave your device."
            />
            <FeatureItem
              icon={<Zap className="text-yellow-400" />}
              title="Blazing Fast"
              description="Powered by FFmpeg WASM for near-native performance right in Chrome or Edge."
            />
          </div>

          {/* How It Works / SEO Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center" id="how-it-works">
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wand2 className="text-purple-400" />
                How to Edit Videos Online
              </h3>
              <div className="space-y-6">
                <Step
                  number="1"
                  title="Upload or Import"
                  desc="Drag and drop your video files directly into the editor. We support most common web video formats."
                />
                <Step
                  number="2"
                  title="Edit on Timeline"
                  desc="Use the enhanced timeline to split, trim, and rearrange your clips. Add multiple segments from the same source."
                />
                <Step
                  number="3"
                  title="Export & Save"
                  desc="Merge your edits and export as MP4. Save the final video directly to your disk instantly."
                />
              </div>
            </div>

            {/* Dynamic Visual/Content Box */}
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
              <h4 className="text-xl font-bold text-white mb-4">Supported Formats</h4>
              <p className="text-slate-400 mb-6">
                We support all major video formats compatible with modern browsers, including:
              </p>
              <ul className="grid grid-cols-2 gap-3 text-sm text-slate-300 font-mono">
                <li className="bg-slate-800 px-3 py-2 rounded flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>MP4 (H.264)</li>
                <li className="bg-slate-800 px-3 py-2 rounded flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>WebM</li>
                <li className="bg-slate-800 px-3 py-2 rounded flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>MOV (QuickTime)</li>
                <li className="bg-slate-800 px-3 py-2 rounded flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>AVI</li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0A0A0B] border-t border-slate-800/50 text-center text-slate-600 text-sm">
        <p>&copy; 2025 Grapedit. The secure, client-side video editing solution.</p>
      </footer>
    </main>
  );
}

// Subcomponents for cleaner code
function FeatureItem({ icon, title, description }) {
  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-xl hover:bg-slate-800/60 transition-colors group">
      <div className="mb-4 w-12 h-12 bg-slate-800/80 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/20">
        {number}
      </div>
      <div>
        <h4 className="text-lg font-medium text-white mb-1">{title}</h4>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
