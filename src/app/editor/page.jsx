import VideoEditorLoader from "@/components/VideoEditorLoader";

export const metadata = {
    title: "Video Editor",
    description: "Trimming and editing videos in the browser",
};

export default async function EditorPage({ searchParams }) {
    const resolvedParams = await searchParams;
    const { video: videoUrl, type, title, referer } = resolvedParams;

    return (
        <main className="min-h-screen bg-slate-950">
            <VideoEditorLoader
                videoUrl={videoUrl}
                type={type}
                initialTitle={title}
                initialReferer={referer}
            />
        </main>
    );
}
