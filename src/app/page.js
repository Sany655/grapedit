"use client";

import Navbar from "@/components/Navbar";
import GrapeditEditor from "@/components/GrapeditEditor";
import { Scissors, Layers, Zap, Lock, Wand2, Download, Share2, Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            New: Client-Side Processing
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
            Professional Video Editing,<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Directly in Browser
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Trim, merge, and edit videos securely. No uploads, no software installation, 100% private.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <button
              onClick={() => document.getElementById('editor').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              Start Editing Now <Scissors size={20} />
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-lg border border-slate-700 transition-all" onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}>
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Main Editor Section */}
      <section id="editor" className="py-12 px-4 md:px-6 relative z-10 scroll-mt-20">
        <div className="max-w-[1400px] mx-auto">
          {/* Premium Glass Container for Editor */}
          <div className="relative group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-1000"></div>

            <div className="relative bg-[#0F1115]/90 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5">
              <GrapeditEditor />
            </div>
          </div>
        </div>
      </section>

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
    </div>
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
