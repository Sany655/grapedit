import GrapeditEditor from "../../components/GrapeditEditor";
import Navbar from "../../components/Navbar";

export default function EditorPage() {
    return (
        <main className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="pt-20">
                <GrapeditEditor />
            </div>
        </main>
    );
}
