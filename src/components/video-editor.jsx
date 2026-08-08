"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchFile } from "@ffmpeg/util";
import { Link } from "next/link"; // If using Next.js Link, wait, standard <a> or next/link?
// Importing Link from next/link is standard for app router.
import { Upload, Scissors, Download, Loader2, Play, History, Trash2, Undo, Settings, Edit2, Save, X, Film } from "lucide-react";
import DownloadManager from "./DownloadManager";
import { saveDownload } from "../utils/db";
import { useVideoDownload } from "./video-editor/useVideoDownload";
import { ProcessingScreen } from "./video-editor/ProcessingScreen";
import { useRouter } from "next/navigation";

export default function VideoEditor({ initialVideo, initialType, initialTitle, initialReferer, initialResourceName }) {
    const router = useRouter();
    const {
        downloadProgress, downloadedBytes, totalBytesEst, downloadSpeed, isPaused, processingText, isProcessing, isFFmpegBusy,
        downloadStarted, videoFile: dlVideoFile, videoUrl: dlVideoUrl, fileName: dlFileName, loaded, ffmpegRef, currentDownloadId, resolutions, selectedResolution, setSelectedResolution,
        setVideoFile: setDlVideoFile, setVideoUrl: setDlVideoUrl, setFileName: setDlFileName, startDownloadProcess, togglePause, cancelDownload, formatSize
    } = useVideoDownload(initialVideo, initialType, initialTitle, initialReferer);

    const [isManagerOpen, setIsManagerOpen] = useState(false);

    // Global Event Listener for Bin
    useEffect(() => {
        const openBin = () => setIsManagerOpen(true);
        window.addEventListener('open-grapedit-bin', openBin);
        return () => window.removeEventListener('open-grapedit-bin', openBin);
    }, []);

    // Legacy support for loading extension video directly (optional, maybe redirect?)
    // For now, let's keep it simple: if extension loads video here, we just show it/download it.

    // We can remove complex trimming logic.

    return (
        <div className="max-w-4xl mx-auto p-6 bg-slate-900 text-slate-100 min-h-screen font-sans">
            <DownloadManager
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                activeDownloadId={currentDownloadId}
                isPaused={isPaused}
                onPause={togglePause}
                onResume={togglePause}
                onCancel={cancelDownload}
                onRetry={(url) => startDownloadProcess(url)}
                onLoadVideo={(item) => {
                    // If user clicks a downloaded item, maybe we ask if they want to EDIT it?
                    if (confirm("Open in Editor?")) {
                        // We can't easily pass the blob via URL. 
                        // But since it's in IndexedDB, the Editor can pick it up if we pass the ID?
                        // User request said: "video editor can be more advace and easy to expand".
                        // For now, let's just go to Editor.
                        router.push(`/editor?fileId=${item.id}`);
                    }
                }}
            />

            <ProcessingScreen
                isProcessing={isProcessing}
                isPaused={isPaused}
                processingText={processingText}
                downloadedBytes={downloadedBytes}
                totalBytesEst={totalBytesEst}
                downloadSpeed={downloadSpeed}
                downloadProgress={downloadProgress}
                onTogglePause={togglePause}
                onCancel={cancelDownload}
                fileName={dlFileName}
            />

            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-500 bg-clip-text text-transparent">ProVideo Downloader</h1>
                    <p className="text-slate-400 text-sm">Download and save streams</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* History button moved to Navbar */}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {!isProcessing && !downloadStarted && (
                    <div className="bg-slate-800 p-8 rounded-2xl border border-blue-500/30 shadow-xl animate-in fade-in slide-in-from-top-4">
                        <div className="flex flex-col gap-6">
                            <div className="text-center mb-4">
                                <h2 className="text-2xl font-bold text-white mb-2">Ready to Download</h2>
                                <p className="text-slate-400">Review settings before starting</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Target URL / Source</label>
                                    <div className="p-3 bg-slate-900 rounded border border-slate-700 text-slate-300 text-sm truncate font-mono">
                                        {initialVideo || "Waiting for extension..."}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">File Name</label>
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={dlFileName} onChange={(e) => setDlFileName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500" />
                                        <span className="text-slate-500">.mp4</span>
                                    </div>
                                </div>

                                {resolutions.length > 0 && (
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Quality</label>
                                        <div className="flex flex-wrap gap-2">
                                            {resolutions.map((res, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedResolution(res)}
                                                    className={`px-3 py-1 text-xs rounded border ${selectedResolution === res ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                                >
                                                    {res.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center mt-4">
                                {initialVideo ? (
                                    <button onClick={() => startDownloadProcess()} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl gap-2 flex items-center font-bold text-lg shadow-lg shadow-blue-900/20 transition-transform active:scale-95">
                                        <Download size={24} /> Start Download
                                    </button>
                                ) : (
                                    <div className="text-slate-500 text-sm flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} /> Waiting for video source...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Show local preview if download finished? */}
                {dlVideoUrl && (
                    <div className="">
                        <video controls src={dlVideoUrl} className="w-full max-h-[500px]" />
                        <div className="p-4 bg-slate-800 flex justify-between items-center rounded-b-xl border border-t-0 border-slate-700">
                            <span className="text-sm text-slate-300 truncate max-w-[200px]">Preview: {dlFileName}</span>
                            <div className="flex items-center gap-2">
                                {dlVideoUrl && (
                                    <a 
                                        href={dlVideoUrl} 
                                        download={`${dlFileName}.mp4`}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                                    >
                                        <Download size={16} /> Save to PC
                                    </a>
                                )}
                                {dlVideoFile && (
                                    <button onClick={() => router.push(`/editor?fileId=${currentDownloadId}`)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
                                        <Edit2 size={16} /> Open in Editor
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}