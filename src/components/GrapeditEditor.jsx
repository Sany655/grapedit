"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { Upload, Scissors, Download, Loader2, Play, History, Trash2, Undo, Settings, Edit2, Save, X, AlertCircle } from "lucide-react";
import DownloadManager from "./DownloadManager";
import { saveDownload, getDownloadById } from "../utils/db";
import { useSegmentEditor } from "./video-editor/useSegmentEditor";
import { useSearchParams, useRouter } from "next/navigation";
import toast, { Toaster } from 'react-hot-toast';

export default function GrapeditEditor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // FFmpeg State (Localized to Editor)
    const [loaded, setLoaded] = useState(false);
    const ffmpegRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);

    // Editor State
    const [clips, setClips] = useState([]); // { id, url, file, name, duration }
    const [activeClipId, setActiveClipId] = useState(null);
    const [exportFileName, setExportFileName] = useState("edit");
    const [currentTime, setCurrentTime] = useState(0);
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // For timeline drag
    const [resolutionMismatch, setResolutionMismatch] = useState(false);

    // Refs
    const videoRef = useRef(null);
    const timelineRef = useRef(null);
    const addNewClipRef = useRef(null); // Will be assigned below

    const {
        segments, activeSegmentId, historyIndex, duration,
        setActiveSegmentId, addClip, handleSplit, handleDeleteSegment, handleUndo, resetSegments, removeSegmentsByClipId
    } = useSegmentEditor();

    // Load FFmpeg
    useEffect(() => {
        const load = async () => {
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

            // Lazy Instantiation
            if (!ffmpegRef.current) {
                ffmpegRef.current = new FFmpeg();
            }

            const ffmpeg = ffmpegRef.current;

            if (!ffmpeg.loaded) {
                try {
                    await ffmpeg.load({
                        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                    });
                    setLoaded(true);
                } catch (error) {
                    console.error("Failed to load ffmpeg:", error);
                }
            } else {
                setLoaded(true);
            }
        };
        load();
    }, []);

    const formatTime = (seconds) => {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 8);
    };

    // Helper to parse time string/number to seconds
    const parseTimeInput = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };



    // Handle adding a new clip
    const addNewClip = (file, url, name) => {
        const clipId = crypto.randomUUID();
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
            const clipDuration = tempVideo.duration;
            const newClip = {
                id: clipId,
                file,
                url,
                name,
                duration: clipDuration,
                width: tempVideo.videoWidth,
                height: tempVideo.videoHeight
            };

            // Check mismatch against existing clips in scope (approximation to avoid reducer side-effect)
            if (clips.length > 0) {
                const first = clips[0];
                if (newClip.width && (newClip.width !== first.width || newClip.height !== first.height)) {
                    toast.error(`Resolution mismatch: ${newClip.width}x${newClip.height}. Export may fail.`, {
                        duration: 5000,
                        icon: '⚠️'
                    });
                    setResolutionMismatch(true);
                }
            }

            setClips(prev => {
                const nextClips = [...prev, newClip];
                return nextClips;
            });
            addClip(clipId, clipDuration);
        };
    };

    // Keep ref updated
    useEffect(() => {
        addNewClipRef.current = addNewClip;
    }, [clips]); // Dep on clips if needed, but addNewClip uses functional state update so it's stable-ish. 
    // Actually addNewClip closes over 'addClip' which is from hook.
    // Better store current function in ref.

    // Auto-generate filename
    useEffect(() => {
        if (clips.length > 0) {
            const generatedName = clips
                .map(c => c.name.replace(/\.[^/.]+$/, ""))
                .join("-");
            setExportFileName(generatedName);
        } else {
            setExportFileName("edit");
        }
    }, [clips]);

    // Handle File Upload
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            addNewClip(file, URL.createObjectURL(file), file.name);
        }
    };

    // Event Listener for Navbar Bin Button
    useEffect(() => {
        const openBin = () => setIsManagerOpen(true);
        window.addEventListener('open-grapedit-bin', openBin);
        return () => window.removeEventListener('open-grapedit-bin', openBin);
    }, []);

    // Listen for Extension Messages (if targeted at Editor)
    // Or if we decide the extension opens /editor, we need this.
    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.data && event.data.type === 'GEDIT_LOAD_VIDEO') {
                const { buffer, mimeType } = event.data;
                if (buffer) {
                    const blob = new Blob([buffer], { type: mimeType || 'video/mp4' });
                    const name = event.data.fileName || "extension-video.mp4";
                    if (addNewClipRef.current) {
                        addNewClipRef.current(blob, URL.createObjectURL(blob), name);
                    }
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Auto-load from URL param (e.g. from Downloader)
    const processedFileIdRef = useRef(null);

    useEffect(() => {
        const fileId = searchParams.get('fileId');
        if (fileId && addNewClipRef.current && processedFileIdRef.current !== fileId) {
            processedFileIdRef.current = fileId; // Mark as processing/processed

            const loadFromDb = async () => {
                try {
                    const item = await getDownloadById(fileId);
                    if (item && item.blob) {
                        const url = URL.createObjectURL(item.blob);
                        addNewClipRef.current(item.blob, url, item.fileName);
                        // Clear param to avoid duplicate add on refresh
                        router.replace('/editor', { scroll: false });
                    }
                } catch (e) {
                    console.error("Failed to auto-load text", e);
                }
            };
            loadFromDb();
        }
    }, [searchParams, router]);

    // Sync Player with Timeline (Virtual Player Logic)
    const [currentPlayerClipId, setCurrentPlayerClipId] = useState(null);

    useEffect(() => {
        if (!videoRef.current || segments.length === 0) return;

        const segment = segments.find(s => currentTime >= s.start && currentTime < s.end) || segments[segments.length - 1];
        if (!segment) return;

        const clip = clips.find(c => c.id === segment.clipId);
        if (!clip) return;

        if (currentPlayerClipId !== clip.id) {
            const wasPlaying = !videoRef.current.paused;
            videoRef.current.src = clip.url;
            setCurrentPlayerClipId(clip.id);
            const mappedTime = currentTime - segment.start + segment.sourceStart;
            videoRef.current.currentTime = mappedTime;
            if (wasPlaying) videoRef.current.play();
        }
    }, [currentTime, segments, clips, currentPlayerClipId]);

    const onTimeUpdate = () => {
        if (!videoRef.current || segments.length === 0 || isDragging) return;

        const playerTime = videoRef.current.currentTime;
        const currentSegment = segments.find(s => s.clipId === currentPlayerClipId && playerTime >= s.sourceStart && playerTime <= (s.sourceStart + (s.end - s.start)));

        if (currentSegment) {
            const globalTime = currentSegment.start + (playerTime - currentSegment.sourceStart);
            setCurrentTime(globalTime);
            setActiveSegmentId(currentSegment.id);

            if (globalTime >= currentSegment.end - 0.1) {
                const nextSegIndex = segments.findIndex(s => s.id === currentSegment.id) + 1;
                if (nextSegIndex < segments.length) {
                    const nextSeg = segments[nextSegIndex];
                    const nextClip = clips.find(c => c.id === nextSeg.clipId);
                    if (nextClip) {
                        videoRef.current.src = nextClip.url;
                        setCurrentPlayerClipId(nextClip.id);
                        videoRef.current.currentTime = nextSeg.sourceStart;
                        setCurrentTime(nextSeg.start); // Sync global time to next segment
                        videoRef.current.play();
                    }
                } else {
                    videoRef.current.pause();
                }
            }
        }
    };

    const handleTimelineClick = (e) => {
        updateTimeFromEvent(e);
    };

    const updateTimeFromEvent = (e) => {
        if (!timelineRef.current || duration === 0) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const clickTime = (x / rect.width) * duration;
        setCurrentTime(clickTime);

        // Sync Logic
        const segment = segments.find(s => clickTime >= s.start && clickTime <= s.end);
        if (segment) {
            setActiveSegmentId(segment.id);
            const clip = clips.find(c => c.id === segment.clipId);
            if (clip && videoRef.current) {
                if (currentPlayerClipId !== clip.id) {
                    videoRef.current.src = clip.url;
                    setCurrentPlayerClipId(clip.id);
                }
                videoRef.current.currentTime = clickTime - segment.start + segment.sourceStart;
            }
        }
    };

    const handleTimelineMouseDown = (e) => {
        setIsDragging(true);
        updateTimeFromEvent(e);
        if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
        window.addEventListener('mousemove', handleTimelineMouseMove);
        window.addEventListener('mouseup', handleTimelineMouseUp);
    };

    const handleTimelineMouseMove = (e) => {
        updateTimeFromEvent(e);
    };

    const handleTimelineMouseUp = (e) => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleTimelineMouseMove);
        window.removeEventListener('mouseup', handleTimelineMouseUp);
    };

    const trimVideo = async (destinations = ['disk']) => {
        if (clips.length === 0) return;
        if (!loaded) {
            alert("Video Engine is loading...");
            return;
        }

        const ffmpeg = ffmpegRef.current;

        if (resolutionMismatch) {
            if (!confirm("Warning: Your clips have different resolutions. Merging them might fail or cause video corruption. Do you want to proceed anyway?")) {
                return;
            }
        }

        setIsExporting(true);

        try {
            const activeSegments = segments.slice().sort((a, b) => a.start - a.start);
            if (activeSegments.length === 0) return;

            for (const clip of clips) {
                if (activeSegments.some(s => s.clipId === clip.id)) {
                    await ffmpeg.writeFile(clip.id + ".mp4", await fetchFile(clip.url));
                }
            }

            let concatList = '';

            for (let i = 0; i < activeSegments.length; i++) {
                const seg = activeSegments[i];
                const segmentName = `seg_${i}.mp4`;
                const segDuration = seg.end - seg.start;

                await ffmpeg.exec([
                    '-ss', seg.sourceStart.toFixed(3),
                    '-i', seg.clipId + ".mp4",
                    '-t', segDuration.toFixed(3),
                    '-c', 'copy',
                    segmentName
                ]);
                concatList += `file '${segmentName}'\n`;
            }

            await ffmpeg.writeFile('concat_list.txt', concatList);
            await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', 'output.mp4']);

            const data = await ffmpeg.readFile("output.mp4");
            const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
            const url = URL.createObjectURL(mp4Blob);

            if (destinations.includes('disk')) {
                const a = document.createElement("a");
                a.href = url;
                a.download = `${exportFileName || "video"}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            if (destinations.includes('db')) {
                const downloadId = crypto.randomUUID();
                await saveDownload({
                    id: downloadId,
                    url: "edited-local",
                    fileName: `${exportFileName || "video"}.mp4`,
                    status: 'completed',
                    progress: 100,
                    blob: mp4Blob,
                    createdAt: new Date().toISOString()
                });
                setIsManagerOpen(true);
            }

            // Cleanup
            await ffmpeg.deleteFile('concat_list.txt');
            await ffmpeg.deleteFile("output.mp4");
            for (let i = 0; i < activeSegments.length; i++) {
                try { await ffmpeg.deleteFile(`seg_${i}.mp4`); } catch (e) { }
            }
            for (const clip of clips) {
                if (activeSegments.some(s => s.clipId === clip.id)) {
                    try { await ffmpeg.deleteFile(clip.id + ".mp4"); } catch (e) { }
                }
            }

        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Export failed! Ensure clips match resolution.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleRemoveAll = () => {
        setClips([]);
        resetSegments();
        setCurrentTime(0);
        setCurrentPlayerClipId(null);
        setResolutionMismatch(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        }
    };

    const handleRemoveClip = (id) => {
        removeSegmentsByClipId(id);
        setClips(prev => prev.filter(c => c.id !== id));
        if (currentPlayerClipId === id) {
            setCurrentPlayerClipId(null);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            }
        }
    };

    return (
        <div className="p-3 md:p-6 text-slate-100 font-sans h-full">
            <DownloadManager
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                onLoadVideo={(item) => {
                    const url = URL.createObjectURL(item.blob);
                    addNewClip(item.blob, url, item.fileName);
                    setIsManagerOpen(false);
                }}
            />

            <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${loaded ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-slate-400">{loaded ? 'Engine Ready' : 'Loading Engine...'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                {/* Left Col: Player & Bin */}
                <div className="space-y-6">
                    <div className="bg-black rounded-xl overflow-hidden shadow-2xl aspect-video relative border border-slate-800">
                        <video
                            ref={videoRef}
                            controls
                            className="w-full h-full"
                            onTimeUpdate={onTimeUpdate}
                        />
                        {clips.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-slate-600 flex flex-col items-center">
                                    <Play size={48} />
                                    <span className="mt-2 text-sm">Add clips to start editing</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bin */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Upload size={16} /> Media Bin</h3>
                            {clips.length > 0 && <button onClick={handleRemoveAll} className="text-xs text-red-400 hover:text-red-300">Clear All</button>}
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
                            {clips.map((clip, idx) => {
                                const isCompatible = idx === 0 || (clip.width === clips[0].width && clip.height === clips[0].height);
                                return (
                                    <div key={clip.id} className={`min-w-[130px] w-[130px] h-28 bg-slate-900 rounded-lg border ${!isCompatible ? 'border-yellow-500/50' : 'border-slate-700'} p-2 relative group shrink-0 flex flex-col justify-between`}>
                                        <div>
                                            <div className="text-xs font-medium truncate text-white mb-1" title={clip.name}>{clip.name}</div>
                                            <div className="text-[10px] text-slate-500 flex justify-between">
                                                <span>{formatTime(clip.duration)}</span>
                                                {clip.width && <span className="opacity-70">{clip.width}x{clip.height}</span>}
                                            </div>
                                        </div>
                                        {!isCompatible && (
                                            <div className="bg-yellow-500/10 text-yellow-500 text-[10px] px-1 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1 mt-1">
                                                <AlertCircle size={10} />
                                                <span>Mismatch</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveClip(clip.id); }}
                                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )
                            })}
                            <label className="min-w-[120px] h-24 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-blue-400 transition-colors shrink-0">
                                <Upload size={20} />
                                <span className="text-xs mt-1">Import</span>
                                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Col: Timeline & Controls */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Scissors size={18} /> Timeline</h2>

                    <div className="mb-6">
                        <div className="flex justify-between items-center text-xs text-slate-400 mb-2 gap-2">
                            {/* Manual Time Input */}
                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-2 py-1">
                                <span className="text-slate-500">Time:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={duration}
                                    step="0.25"
                                    value={currentTime.toFixed(2)}
                                    onChange={(e) => {
                                        const t = parseTimeInput(e.target.value);
                                        setCurrentTime(t);
                                        // Trigger sync logic manually if needed or let effect handle it?
                                        // Effect handles player source switch, but we need instantaneous seek
                                        if (videoRef.current) {
                                            // Find segment
                                            const segment = segments.find(s => t >= s.start && t <= s.end);
                                            if (segment) {
                                                if (currentPlayerClipId !== segment.clipId) {
                                                    const clip = clips.find(c => c.id === segment.clipId);
                                                    if (clip) {
                                                        videoRef.current.src = clip.url;
                                                        setCurrentPlayerClipId(clip.id);
                                                    }
                                                }
                                                videoRef.current.currentTime = t - segment.start + segment.sourceStart;
                                            }
                                        }
                                    }}
                                    className="bg-transparent border-none text-white w-16 focus:outline-none text-right font-mono"
                                />
                                <span className="text-slate-500">s</span>
                            </div>
                            <span>{formatTime(duration)}</span>
                        </div>

                        <div
                            ref={timelineRef}
                            onMouseDown={handleTimelineMouseDown}
                            className={`relative h-full min-h-[40px] bg-slate-900 rounded-lg cursor-pointer overflow-hidden border border-slate-700 flex flex-col ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        >
                            {/* Track 1 */}
                            <div className="h-full relative w-full flex">
                                {segments.map((seg, idx) => {
                                    const widthPercent = ((seg.end - seg.start) / duration) * 100;
                                    return (
                                        <div
                                            key={seg.id}
                                            style={{ width: `${widthPercent}%` }}
                                            className={`h-full border-r border-slate-800/50 relative overflow-hidden group ${activeSegmentId === seg.id ? 'opacity-100 ring-2 ring-yellow-400 z-10' : 'opacity-90 hover:opacity-100'}`}
                                        >
                                            <div className={`absolute inset-0 ${idx % 2 === 0 ? 'bg-gradient-to-b from-blue-600 to-blue-800' : 'bg-gradient-to-b from-purple-600 to-purple-800'} opacity-60`}></div>
                                            <span className="absolute bottom-1 left-1 text-[10px] text-white/70 truncate w-full px-1 pointer-events-none">{clips.find(c => c.id === seg.clipId)?.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Playhead */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2 items-center bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                            <Edit2 size={14} className="text-slate-400" />
                            <input
                                type="text"
                                value={exportFileName}
                                onChange={(e) => setExportFileName(e.target.value)}
                                className="bg-transparent border-none text-sm text-white w-full focus:outline-none placeholder-slate-600"
                                placeholder="Export Filename"
                            />
                            <span className="text-xs text-slate-500">.mp4</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleSplit(currentTime)} disabled={!activeSegmentId} className="py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs sm:text-sm disabled:opacity-50 flex items-center justify-center"><Scissors size={14} className="sm:mr-1" /><span className="hidden sm:inline">Split</span></button>
                            <button onClick={handleDeleteSegment} disabled={!activeSegmentId} className="py-2 bg-slate-700 hover:bg-red-900/50 text-red-200 rounded text-xs sm:text-sm disabled:opacity-50 flex items-center justify-center"><Trash2 size={14} className="sm:mr-1" /><span className="hidden sm:inline">Delete</span></button>
                            <button onClick={handleUndo} disabled={historyIndex <= 0} className="py-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 flex items-center justify-center"><Undo size={14} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => trimVideo(['db'])}
                                disabled={!loaded || isExporting || segments.length === 0}
                                className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                To Bin
                            </button>
                            <button
                                onClick={() => trimVideo(['disk'])}
                                disabled={!loaded || isExporting || segments.length === 0}
                                className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Toaster position="bottom-center" toastOptions={{
                style: {
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155'
                }
            }} />
        </div>
    );
}
