import React, { useEffect, useState } from "react";
import { Download, FileVideo, Trash2, RefreshCw, X, Play, Pause, AlertCircle } from "lucide-react";
import { getDownloads, deleteDownload } from "../utils/db";

export default function DownloadManager({
    isOpen,
    onClose,
    onLoadVideo,
    activeDownloadId,
    isPaused,
    onPause,
    onResume,
    onCancel,
    onRetry
}) {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDownloads = async () => {
        setLoading(true);
        try {
            const items = await getDownloads();
            // Sort by date desc
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setDownloads(items);
            setError(null);
        } catch (error) {
            console.error("Failed to load downloads:", error);
            setError("Database Error: Try restarting browser.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const loop = async () => {
            if (!isMounted) return;
            await loadDownloads();
            // Only schedule next run after completion, prevents stacking
            if (isOpen && isMounted) {
                timeoutId = setTimeout(loop, 2000);
            }
        };

        if (isOpen) {
            loop();
        }

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isOpen]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (confirm("Delete this download?")) {
            await deleteDownload(id);
            loadDownloads();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Download size={20} className="text-blue-400" />
                    Downloads
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {error ? (
                    <div className="text-center text-red-400 py-8 flex flex-col items-center">
                        <AlertCircle size={48} className="mb-2 opacity-50" />
                        <p className="font-medium">Connection Error</p>
                        <p className="text-sm mt-1 opacity-80">{error}</p>
                    </div>
                ) : loading && downloads.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">Loading...</div>
                ) : downloads.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 flex flex-col items-center">
                        <FileVideo size={48} className="mb-2 opacity-20" />
                        <p>No downloads yet</p>
                    </div>
                ) : (
                    downloads.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-slate-800 rounded-lg p-3 border border-slate-700 group relative transition-all ${item.status === 'completed'
                                ? 'hover:border-blue-500 cursor-pointer hover:bg-slate-750'
                                : 'border-slate-700'
                                }`}
                            onClick={() => item.status === 'completed' && onLoadVideo(item)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="min-w-0 pr-4">
                                    <h4 className="text-sm font-medium text-white truncate" title={item.fileName}>
                                        {item.fileName || "Untitled Video"}
                                    </h4>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                        {item.status === 'completed' && <span className="text-green-400">Completed</span>}
                                        {item.status === 'downloading' && <span className="text-blue-400">Downloading...</span>}
                                        {item.status === 'error' && <span className="text-red-400">Error</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Active Download Controls */}
                                    {item.id === activeDownloadId && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    isPaused ? onResume() : onPause();
                                                }}
                                                className="p-1 text-slate-300 hover:text-white bg-slate-700/50 rounded-full"
                                                title={isPaused ? "Resume" : "Pause"}
                                            >
                                                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCancel();
                                                }}
                                                className="p-1 text-red-400 hover:text-red-300 bg-red-500/10 rounded-full"
                                                title="Cancel"
                                            >
                                                <X size={14} />
                                            </button>
                                        </>
                                    )}

                                    {/* Retry for Failed/Error or Interrupted */}
                                    {(item.status === 'error' || (item.status === 'downloading' && item.id !== activeDownloadId)) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRetry(item.url);
                                            }}
                                            className="p-1 text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 rounded-full"
                                            title="Retry / Restart"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                    )}

                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {item.status === 'downloading' && item.id === activeDownloadId ? (
                                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${isPaused ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            ) : item.status === 'downloading' && item.id !== activeDownloadId ? (
                                <div className="text-xs text-red-400 flex items-center gap-1 mt-1 font-medium">
                                    <AlertCircle size={12} /> Interrupted
                                </div>
                            ) : null}
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
