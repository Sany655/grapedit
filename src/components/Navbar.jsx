
import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";

export default function Navbar() {
    return (
        <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Scissors size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Grapedit
                    </span>
                </Link>
                <div className="flex items-center gap-6">
                    <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        Documentation
                    </a>
                    <Link
                        href="/editor"
                        className="px-4 py-2 bg-white text-slate-900 rounded-full font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                        Open Editor <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </nav>
    );
}
