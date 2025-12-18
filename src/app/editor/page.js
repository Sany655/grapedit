import { Suspense } from "react";
import GrapeditEditor from "@/components/GrapeditEditor";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

export default function EditorPage() {
    return (
        <main className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="pt-20">
                <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[50vh]">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                }>
                    <GrapeditEditor />
                </Suspense>
            </div>
        </main>
    );
}
