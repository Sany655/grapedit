"use client";

import Link from "next/link";
import { ArrowRight, Scissors, History } from "lucide-react";

export default function Navbar() {
    return (
        <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src="/icon.png" alt="Grapedit Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Grapedit
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.dispatchEvent(new Event('open-grapedit-bin'))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-sm"
                        title="History"
                    >
                        <History size={20} />
                        <span className="hidden sm:inline">History</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
