import React, { useEffect, useState, useRef } from "react";
import { Download, FileVideo, Trash2, RefreshCw, X, Play, Pause, AlertCircle, Monitor, Clock, HardDrive, Calendar, Edit2 } from "lucide-react";
import { getDownloads, deleteDownload, saveDownload } from "../utils/db";

export default function DownloadManager({
    isOpen,
    onClose,
    onLoadVideo,
    onLoadMultiple,
    onExport,
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
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const clickTimeout = useRef(null);

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

    // Backfill metadata for legacy/failed items (Self-Healing)
    useEffect(() => {
        const backfillMetadata = async () => {
            if (!downloads.length) return;

            for (const item of downloads) {
                // If incomplete metadata but we have the blob
                if (item.status === 'completed' && item.blob && (!item.width || !item.duration)) {
                    try {
                        console.log("Backfilling metadata for:", item.fileName);
                        const video = document.createElement('video');
                        video.preload = 'metadata';
                        video.muted = true;
                        video.playsInline = true;
                        const url = URL.createObjectURL(item.blob);
                        video.src = url;

                        await new Promise((resolve) => {
                            video.onloadedmetadata = () => {
                                const metadata = {
                                    duration: isFinite(video.duration) ? video.duration : 0,
                                    width: video.videoWidth,
                                    height: video.videoHeight
                                };

                                // Update DB
                                saveDownload({
                                    ...item,
                                    ...metadata
                                }).then(() => {
                                    // Update local state to reflect change immediately
                                    setDownloads(prev => prev.map(p => p.id === item.id ? { ...p, ...metadata } : p));
                                });
                                resolve();
                            };
                            video.onerror = resolve;
                            setTimeout(resolve, 2000);
                        });
                        URL.revokeObjectURL(url);
                    } catch (e) {
                        console.error("Backfill failed", e);
                    }
                }
            }
        };
        // Run once when downloads change (loaded)
        backfillMetadata();
    }, [downloads.length]); // Dep on length so it runs after load

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
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            loadDownloads();
        }
    };

    const handleToggleSelect = (id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === downloads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(downloads.map(d => d.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        if (confirm(`Delete ${selectedIds.size} items?`)) {
            for (const id of selectedIds) {
                await deleteDownload(id);
            }
            setSelectedIds(new Set());
            loadDownloads();
        }
    };

    const handleBulkEdit = () => {
        if (!onLoadMultiple || !selectedIds.size) return;
        const selectedItems = downloads.filter(d => selectedIds.has(d.id) && d.status === 'completed');
        onLoadMultiple(selectedItems);
    };

    const handleBulkExport = () => {
        if (!onExport || !selectedIds.size) return;
        const selectedItems = downloads.filter(d => selectedIds.has(d.id) && d.status === 'completed');
        onExport(selectedItems);
    };

    const handleStartEdit = (item, e) => {
        // e is optional here as it might be called from double click handler
        if (e) e.stopPropagation();
        setEditingId(item.id);
        setEditName(item.fileName);
    };

    const handleNameClick = (item, e) => {
        e.stopPropagation();

        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
            return;
        }

        clickTimeout.current = setTimeout(() => {
            if (item.status === 'completed') {
                onLoadVideo(item);
            }
            clickTimeout.current = null;
        }, 250);
    };

    const handleNameDoubleClick = (item, e) => {
        e.stopPropagation();
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
            return;
        }
        handleStartEdit(item, e);
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;

        const item = downloads.find(d => d.id === editingId);
        // Only update if name actually changed and is not empty
        if (item && editName.trim() !== "" && item.fileName !== editName) {
            const updated = { ...item, fileName: editName };

            // Optimistic update
            setDownloads(prev => prev.map(p => p.id === editingId ? updated : p));

            try {
                await saveDownload(updated);
            } catch (err) {
                console.error("Failed to rename:", err);
                // Revert on failure could be added here, but simplest is to just log
            }
        }

        setEditingId(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent accidental form submissions if any
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-slate-800"
                        checked={downloads.length > 0 && selectedIds.size === downloads.length}
                        onChange={handleSelectAll}
                    />
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Download size={20} className="text-blue-400" />
                        Downloads
                    </h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {selectedIds.size > 0 && (
                <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center text-sm">
                    <span className="text-slate-300">{selectedIds.size} selected</span>
                    <div className="flex items-center gap-2">
                        {onLoadMultiple && (
                            <button
                                onClick={handleBulkEdit}
                                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
                            >
                                <Edit2 size={14} />
                                Add
                            </button>
                        )}
                        {onExport && (
                            <button
                                onClick={handleBulkExport}
                                className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded hover:bg-purple-500/10"
                            >
                                <FileVideo size={14} /> // Using FileVideo as Merge/Export icon
                                Merge
                            </button>
                        )}
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    </div>
                </div>
            )}

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
                            className={`bg-slate-800 rounded-lg p-3 border group relative transition-all flex gap-3 ${selectedIds.has(item.id) ? 'border-blue-500 bg-slate-800/80' : 'border-slate-700'
                                } ${item.status === 'completed' ? 'hover:border-blue-500/50 cursor-pointer hover:bg-slate-700' : ''}`}
                            onClick={() => item.status === 'completed' && onLoadVideo(item)}
                        >
                            <div className="flex items-start pt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-slate-800 mt-1"
                                    checked={selectedIds.has(item.id)}
                                    onChange={(e) => handleToggleSelect(item.id, e)}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="min-w-0 pr-2 flex-1">
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                className="w-full text-sm font-medium text-white bg-slate-900 border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={handleSaveEdit}
                                                onKeyDown={handleKeyDown}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <h4
                                                className="text-sm font-medium text-white truncate hover:text-blue-400 transition-colors"
                                                title="Click to select, double click to rename"
                                                onClick={(e) => handleNameClick(item, e)}
                                                onDoubleClick={(e) => handleNameDoubleClick(item, e)}
                                            >
                                                {item.fileName || "Untitled Video"}
                                            </h4>
                                        )}
                                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                                            {item.status === 'completed' && (
                                                <div className="flex flex-wrap gap-3 items-center opacity-80 mt-2">
                                                    {/* Resolution */}
                                                    {item.width ? (
                                                        <span className="flex items-center gap-1.5 bg-slate-700/50 px-2 py-1 rounded text-[10px] text-slate-200" title="Resolution">
                                                            <Monitor size={10} className="text-blue-400" />
                                                            {item.width}x{item.height}
                                                        </span>
                                                    ) : <span className="text-[10px]">--</span>}

                                                    {/* Duration */}
                                                    {item.duration ? (
                                                        <span className="flex items-center gap-1 text-[10px]" title="Duration">
                                                            <Clock size={10} className="text-slate-500" />
                                                            {(() => {
                                                                const seconds = Math.round(item.duration);
                                                                const h = Math.floor(seconds / 3600);
                                                                const m = Math.floor((seconds % 3600) / 60);
                                                                const s = seconds % 60;
                                                                return h > 0
                                                                    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                                                                    : `${m}:${s.toString().padStart(2, '0')}`;
                                                            })()}
                                                        </span>
                                                    ) : null}

                                                    {/* Size */}
                                                    <span className="flex items-center gap-1 text-[10px]" title="File Size">
                                                        <HardDrive size={10} className="text-slate-500" />
                                                        {item.blob ? (item.blob.size / (1024 * 1024)).toFixed(1) + ' MB' : '-- MB'}
                                                    </span>

                                                    {/* Date */}
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto" title="Downloaded At">
                                                        <Calendar size={10} />
                                                        {new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                            {item.status === 'downloading' && <span className="text-blue-400 font-medium text-[10px]">Downloading...</span>}
                                            {item.status === 'error' && <span className="text-red-400 font-medium text-[10px]">Error</span>}
                                        </div>
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
                                            className="text-slate-500 hover:text-red-400 p-1 transition-colors"
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
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
