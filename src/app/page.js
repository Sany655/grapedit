
"use client";

import Navbar from "@/components/Navbar";
import Link from 'next/link';
import { ArrowRight, Download, Layers, Scissors, Shield, Zap } from "lucide-react";




export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            New: HLS Stream Support
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
            Professional Video Editing,<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Directly in Browser
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Download protected streams, trim with frame accuracy, and merge clips instantly using FFmpeg WASM. No uploads, no software installation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <Link
              href="/editor"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              Start Editing for Free
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-lg border border-slate-700 transition-all flex items-center justify-center gap-2">
              <Download size={20} /> Install Extension
            </button>
          </div>
        </div>

        {/* Dashboard Preview / Visual */}
        <div className="mt-20 max-w-5xl mx-auto relative group animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
              </div>
              <div className="ml-4 w-60 h-6 bg-slate-800 rounded-md"></div>
            </div>
            <div className="aspect-video bg-slate-950 flex items-center justify-center text-slate-700">
              <div className="text-center">
                <Scissors size={64} className="mx-auto mb-4 opacity-50" />
                <p>Editor Interface Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">Everything you need</h2>
            <p className="text-slate-400 text-lg">Powerful tools packed into a lightweight browser experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="text-yellow-400" />}
              title="Instant Cut & Merge"
              desc="Trim unwanted parts and merge clips without re-encoding. Experience blazing fast exports."
            />
            <FeatureCard
              icon={<Shield className="text-green-400" />}
              title="Local Privacy"
              desc="Your videos never leave your browser. All processing is done locally using WebAssembly."
            />
            <FeatureCard
              icon={<Layers className="text-blue-400" />}
              title="HLS & Protected Video"
              desc="Advanced proxy support allows you to capture and edit m3u8 streams other tools can't touch."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 text-center text-slate-500">
        <p>&copy; 2025 Grapedit. Built for creators.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="mb-6 w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
