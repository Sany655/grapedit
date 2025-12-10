
import React from "react";
import { Play, Pause, X } from "lucide-react";

export function ProcessingScreen({
    isProcessing,
    isPaused,
    processingText,
    downloadedBytes,
    totalBytesEst,
    downloadSpeed,
    downloadProgress,
    onTogglePause,
    onCancel
}) {
    if (!isProcessing) return null;

    return (
        <div className="mb-8 bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-xl animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-white">Processing Video</h3>
                        <p className="text-slate-400 text-sm">
                            {isPaused ? "Paused..." : processingText}
                        </p>
                    </div>
                </div>

                {processingText.includes("Downloading") && (
                    <div className="flex-1 w-full md:w-auto">
                        <div className="flex justify-between text-sm font-mono text-blue-300 mb-2">
                            <span>{formatSize(downloadedBytes)} / {totalBytesEst > 0 ? formatSize(totalBytesEst) : '?'}</span>
                            <span>{formatSize(downloadSpeed)}/s</span>
                        </div>

                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden relative mb-2">
                            <div
                                className={`bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300 ease-out ${isPaused ? 'opacity-50' : ''}`}
                                style={{ width: `${downloadProgress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">{downloadProgress}%</span>

                            <div className="flex gap-2">
                                <button
                                    onClick={onTogglePause}
                                    className="px-3 py-1.5 rounded-md bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                                >
                                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                                    {isPaused ? "Resume" : "Pause"}
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
