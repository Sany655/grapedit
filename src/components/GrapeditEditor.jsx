"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { Upload, Scissors, Download, Loader2, Play, History, Trash2, Undo, Settings, Edit2, Save, X, AlertCircle, ChevronLeft, ChevronRight, Rewind, FastForward, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import DownloadManager from "./DownloadManager";
import { saveDownload, getDownloadById, checkFileExists, deleteDownload } from "../utils/db";
import { useSegmentEditor } from "./video-editor/useSegmentEditor";
import { useSearchParams, useRouter } from "next/navigation";
import toast, { Toaster } from 'react-hot-toast';
import { ExportOptionsModal } from "./video-editor/ExportOptionsModal";

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
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportDestinations, setExportDestinations] = useState([]);
    const [mergeItems, setMergeItems] = useState([]);

    // Refs
    const videoRef = useRef(null);
    const timelineRef = useRef(null);
    const addNewClipRef = useRef(null); // Will be assigned below

    const {
        segments, activeSegmentId, historyIndex, duration,
        setActiveSegmentId, addClip, addClips, handleSplit, handleDeleteSegment, handleUndo, resetSegments, removeSegmentsByClipId, replaceSegments, reorderSegments
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
    const addNewClip = (file, url, name, dbId = null) => {
        const clipId = crypto.randomUUID();
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
            const clipDuration = tempVideo.duration;
            const newClip = {
                id: clipId,
                dbId,
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
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newClipsData = [];
        const newSegmentsData = [];

        for (const file of files) {
            // Check duplicate in DB
            const exists = await checkFileExists(file.name);
            if (exists) {
                toast.error(`File "${file.name}" already exists in library.`, { duration: 4000 });
                continue; // Skip processing
            }

            const url = URL.createObjectURL(file);
            const clipId = crypto.randomUUID();

            // Create a temporary video element to get metadata
            const tempVideo = document.createElement('video');
            tempVideo.src = url;

            await new Promise((resolve) => {
                tempVideo.onloadedmetadata = () => {
                    const clipDuration = tempVideo.duration;
                    newClipsData.push({
                        id: clipId,
                        file,
                        url,
                        name: file.name,
                        duration: clipDuration,
                        width: tempVideo.videoWidth,
                        height: tempVideo.videoHeight
                    });
                    newSegmentsData.push({ id: clipId, duration: clipDuration });
                    resolve();
                };
                tempVideo.onerror = (e) => {
                    toast.error("Failed to load video metadata. The file may be corrupted.", { duration: 5000 });
                    console.error("Video load error", e);
                    resolve();
                };
            });
        }

        // Check for resolution mismatch before updating state
        let hasMismatch = false;
        if (clips.length > 0 && newClipsData.length > 0) {
            const first = clips[0];
            const firstNew = newClipsData[0];
            if (firstNew.width && (firstNew.width !== first.width || firstNew.height !== first.height)) {
                hasMismatch = true;
            }
        } else if (newClipsData.length > 1) {
            const first = newClipsData[0];
            hasMismatch = newClipsData.some(c => c.width !== first.width || c.height !== first.height);
        }

        if (hasMismatch) {
            toast.error(`Resolution mismatch. Export may fail.`, { duration: 5000, icon: '⚠️' });
            setResolutionMismatch(true);
        }

        // Batch Update State
        setClips(prev => [...prev, ...newClipsData]);

        // Add to Timeline via Hook
        addClips(newSegmentsData);
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
        if (fileId && processedFileIdRef.current !== fileId) {
            processedFileIdRef.current = fileId; // Mark as processing/processed

            const loadFromDb = async () => {
                toast("Catching downloaded video...", { icon: '⏳' });
                try {
                    const item = await getDownloadById(fileId);
                    if (item && item.blob) {
                        const url = URL.createObjectURL(item.blob);
                        
                        // Fallback in case addNewClipRef is not ready instantly
                        let retries = 0;
                        const tryAdd = () => {
                            if (addNewClipRef.current) {
                                addNewClipRef.current(item.blob, url, item.fileName, item.id);
                                toast.success("Video added to editor!");
                                router.replace('/editor', { scroll: false });
                            } else if (retries < 10) {
                                retries++;
                                setTimeout(tryAdd, 100);
                            } else {
                                toast.error("Editor not ready to receive video.");
                            }
                        };
                        tryAdd();
                    } else {
                        toast.error("Video not found in local database.");
                    }
                } catch (e) {
                    console.error("Failed to auto-load video", e);
                    toast.error("Failed to load video from database.");
                }
            };
            loadFromDb();
        }
    }, [searchParams, router]);

    // Sync Player with Timeline (Virtual Player Logic)
    const [currentPlayerClipId, setCurrentPlayerClipId] = useState(null);
    const [timeStep, setTimeStep] = useState(0.25);
    const [playbackRate, setPlaybackRate] = useState(1);
    const currentPlayerClipRef = useRef(null); // Ref to track clip ID synchronously for event handlers
    const seekIntervalRef = useRef(null);

    const updateCurrentPlayerClipId = (id) => {
        setCurrentPlayerClipId(id);
        currentPlayerClipRef.current = id;
    };

    const handleSeekHold = (direction) => {
        if (seekIntervalRef.current) return;
        const delta = direction * timeStep;

        // Immediate move
        setCurrentTime(t => Math.min(Math.max(0, t + delta), duration));

        // Start repeating
        seekIntervalRef.current = setInterval(() => {
            setCurrentTime(t => Math.min(Math.max(0, t + delta), duration));
        }, 100);
    };

    const handleSeekStop = () => {
        if (seekIntervalRef.current) {
            clearInterval(seekIntervalRef.current);
            seekIntervalRef.current = null;
        }
    };

    const handleSpeedChange = (direction) => {
        const delta = direction * timeStep;
        setPlaybackRate(r => {
            const newRate = parseFloat((r + delta).toFixed(2));
            return Math.min(16, Math.max(0.1, newRate));
        });
    };

    const safePlay = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error("Playback failed", e);
                }
            }
        }
    };

    useEffect(() => {
        if (!videoRef.current || segments.length === 0) return;

        const segment = segments.find(s => currentTime >= s.start && currentTime < s.end) || segments[segments.length - 1];
        if (!segment) return;

        const clip = clips.find(c => c.id === segment.clipId);
        if (!clip) return;

        if (currentPlayerClipRef.current !== clip.id) {
            const wasPlaying = !videoRef.current.paused;
            videoRef.current.src = clip.url;
            updateCurrentPlayerClipId(clip.id);
            const mappedTime = currentTime - segment.start + segment.sourceStart;
            videoRef.current.currentTime = mappedTime;
            if (wasPlaying) safePlay();
        } else {
            // Only seek if difference is significant to avoid loop (Main fix for "Maximum update depth exceeded")
            const mappedTime = currentTime - segment.start + segment.sourceStart;
            if (Math.abs(videoRef.current.currentTime - mappedTime) > 0.2) {
                videoRef.current.currentTime = mappedTime;
            }
        }

        // Sync Playback Rate
        if (videoRef.current && videoRef.current.playbackRate !== playbackRate) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [currentTime, segments, clips, playbackRate]); // Removed currentPlayerClipId from dep array to avoid double triggered re-renders loops

    const onTimeUpdate = () => {
        if (!videoRef.current || segments.length === 0 || isDragging) return;

        const playerTime = videoRef.current.currentTime;
        // USE REF HERE instead of state to correctly identify segment during fast transitions
        const currentSegment = segments.find(s => s.clipId === currentPlayerClipRef.current && playerTime >= s.sourceStart && playerTime <= (s.sourceStart + (s.end - s.start) + 0.1));

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
                        updateCurrentPlayerClipId(nextClip.id);
                        videoRef.current.currentTime = nextSeg.sourceStart;
                        updateCurrentPlayerClipId(nextClip.id);
                        videoRef.current.currentTime = nextSeg.sourceStart;
                        setCurrentTime(nextSeg.start); // Sync global time to next segment
                        safePlay();
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

    const normalizeClip = async (file, id, mode, targetW = 1920, targetH = 1080) => {
        const ffmpeg = ffmpegRef.current;
        const inputName = `${id}_input.mp4`;
        const outputName = `${id}_norm.mp4`;

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        let filter = "";
        // Default to scale to fit (letterbox)
        if (mode === 'fit') {
            // scale keeping aspect, pad to 1920x1080
            filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`;
        } else if (mode === 'fill') {
            // scale to fill, crop
            filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}`;
        } else if (mode === 'blur') {
            // blurred background
            filter = `split[main][bg];[bg]scale=${targetW}:${targetH},boxblur=20:10[bg_blurred];[main]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fg];[bg_blurred][fg]overlay=(W-w)/2:(H-h)/2`;
        } // 'fast' shouldn't call this

        if (!filter) return inputName; // Fallback

        // Re-encode
        // Use ultrafast preset for speed in browser
        await ffmpeg.exec([
            '-i', inputName,
            '-vf', filter,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'copy', // Copy audio? might conflict if sample rates differ. Safer to re-encode audio too?
            // Let's copy audio for now to save 1 stream
            outputName
        ]);

        // Clean input
        await ffmpeg.deleteFile(inputName);

        return outputName;
    };

    const quickMerge = async (items, mode) => {
        if (!items || items.length === 0) return;

        if (!loaded) {
            toast.error("Engine loading...");
            return;
        }

        const ffmpeg = ffmpegRef.current;
        setIsExporting(true);
        setShowExportModal(false);

        const toastId = toast.loading("Merging videos...");

        try {
            // 1. Write files to FS & Normalize
            const fileMap = {};
            // We use the selected mode (fast/fit/fill/blur) from modal

            for (const item of items) {
                const id = item.id;
                const url = URL.createObjectURL(item.blob);

                if (mode === 'fast') {
                    // Fast: write original
                    const fname = `${id}.mp4`;
                    await ffmpeg.writeFile(fname, await fetchFile(url));
                    fileMap[id] = fname;
                } else {
                    // Normalize with selected mode
                    const normName = await normalizeClip(url, id, mode);
                    fileMap[id] = normName;
                }
                URL.revokeObjectURL(url);
            }

            // 2. Concat List
            let concatList = '';
            // Sort Oldest -> Newest
            const sortedItems = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            for (const item of sortedItems) {
                const fname = fileMap[item.id];
                concatList += `file '${fname}'\n`;
            }

            await ffmpeg.writeFile('concat_merge.txt', concatList);
            await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_merge.txt', '-c', 'copy', 'output_merge.mp4']);

            const data = await ffmpeg.readFile("output_merge.mp4");
            const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
            const url = URL.createObjectURL(mp4Blob);

            // Download
            const a = document.createElement("a");
            a.href = url;
            a.download = `merged-${items.length}-videos.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Save to DB
            await saveDownload({
                id: crypto.randomUUID(),
                url: "merged-local",
                fileName: `merged-${items.length}-videos.mp4`,
                status: 'completed',
                progress: 100,
                blob: mp4Blob,
                createdAt: new Date().toISOString()
            });

            toast.success("Merge Complete!", { id: toastId });

            // Cleanup
            await ffmpeg.deleteFile('concat_merge.txt');
            await ffmpeg.deleteFile("output_merge.mp4");
            for (const fname of Object.values(fileMap)) {
                try { await ffmpeg.deleteFile(fname); } catch (e) { }
            }

            if (clearSource) {
                const idsToDelete = items.map(i => i.id);
                for (const id of idsToDelete) {
                    await deleteDownload(id);
                }
                toast.success("Source files deleted to save space.");
            }

        } catch (e) {
            console.error("Merge failed", e);
            toast.error("Merge failed", { id: toastId });
        } finally {
            setIsExporting(false);
            setMergeItems([]); // Clear merge state
        }
    };



    const trimVideo = async (mode) => {
        // mode: 'fast' | 'fit' | 'fill' | 'blur'
        const destinations = exportDestinations;
        if (clips.length === 0) return;

        if (!loaded) {
            alert("Video Engine is loading...");
            return;
        }

        const ffmpeg = ffmpegRef.current;
        setIsExporting(true);
        setShowExportModal(false);

        try {
            const activeSegments = segments.slice().sort((a, b) => a.start - a.start);
            if (activeSegments.length === 0) return;

            // Find unique clips used
            const usedClipIds = [...new Set(activeSegments.map(s => s.clipId))];

            // Map clipId -> filename (either original or normalized)
            const fileMap = {};

            // 1. Prepare Files
            if (mode === 'fast') {
                // Fast Mode: write original files
                for (const clipId of usedClipIds) {
                    const clip = clips.find(c => c.id === clipId);
                    if (clip) {
                        const fname = `${clipId}.mp4`;
                        await ffmpeg.writeFile(fname, await fetchFile(clip.url));
                        fileMap[clipId] = fname;
                    }
                }
            } else {
                // Formatting Mode: Re-encode needed clips
                // For simplicity in this iteration, we normalize ALL used clips to ensure same codec/framerate for concat.
                // Optim: Only normalize if dimensions differ?
                // Risk: Codec diffs. Safe bet: Normalize all if we are already re-encoding.

                for (const clipId of usedClipIds) {
                    const clip = clips.find(c => c.id === clipId);
                    if (clip) {
                        const normName = await normalizeClip(clip.url, clipId, mode);
                        fileMap[clipId] = normName;
                    }
                }
            }

            // 2. Concat
            let concatList = '';

            for (let i = 0; i < activeSegments.length; i++) {
                const seg = activeSegments[i];
                const segmentName = `seg_${i}.mp4`;
                const segDuration = seg.end - seg.start;
                const sourceFile = fileMap[seg.clipId];

                // Extract segment
                // Note: -ss before -i is fast seek (keyframe). After -i is accurate.
                // fast mode: use stream copy
                // re-encode mode: stream copy should work on normalized files too!
                await ffmpeg.exec([
                    '-ss', seg.sourceStart.toFixed(3),
                    '-i', sourceFile,
                    '-t', segDuration.toFixed(3),
                    '-c', 'copy', // Copy because we either have original (fast) or normalized inputs!
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
            // Cleanup inputs
            for (const fname of Object.values(fileMap)) {
                try { await ffmpeg.deleteFile(fname); } catch (e) { }
            }

            if (clearSource) {
                for (const clipId of usedClipIds) {
                    const clip = clips.find(c => c.id === clipId);
                    if (clip && clip.dbId) {
                        await deleteDownload(clip.dbId);
                    }
                    removeSegmentsByClipId(clipId);
                }
                setClips(prev => prev.filter(c => !usedClipIds.includes(c.id)));
                updateCurrentPlayerClipId(null);
                toast.success("Source files deleted to save space.");
            }

        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Export failed! See console.");
        } finally {
            setIsExporting(false);
            setExportDestinations([]);
        }
    };

    // Trigger
    const handleExportClick = (dests) => {
        setExportDestinations(dests);
        setShowExportModal(true);
    }

    const handleRemoveAll = () => {
        setClips([]);
        resetSegments();
        setCurrentTime(0);
        updateCurrentPlayerClipId(null);
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
        if (currentPlayerClipRef.current === id) {
            updateCurrentPlayerClipId(null);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            }
        }
    };

    // Check if timeline is in "Virgin" state (1:1 match with current clips)
    const checkCanSync = (currentClips) => {
        if (segments.length !== currentClips.length) return false;

        // We match by index because we assume before reorder they are aligned
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const clip = currentClips[i]; // segments[i] should map to clips[i] in a virgin timeline

            // Check if segment matches full clip properties
            // 1. Same Clip ID
            if (seg.clipId !== clip.id) return false;
            // 2. Starts at 0 source
            if (Math.abs(seg.sourceStart) > 0.01) return false;
            // 3. Duration matches (approx for floats)
            const segDur = seg.end - seg.start;
            if (Math.abs(segDur - clip.duration) > 0.1) return false;
        }
        return true;
    };

    const handleMoveClip = (index, direction) => {
        const canSync = checkCanSync(clips);
        const newClips = [...clips];
        if (direction === 'left' && index > 0) {
            [newClips[index], newClips[index - 1]] = [newClips[index - 1], newClips[index]];
        } else if (direction === 'right' && index < newClips.length - 1) {
            [newClips[index], newClips[index + 1]] = [newClips[index + 1], newClips[index]];
        }
        setClips(newClips);

        if (canSync) {
            replaceSegments(newClips);
        }
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.setData('text/plain', index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        const canSync = checkCanSync(clips);
        const newClips = [...clips];
        const [movedClip] = newClips.splice(sourceIndex, 1);
        newClips.splice(targetIndex, 0, movedClip);
        setClips(newClips);

        if (canSync) {
            replaceSegments(newClips);
        }
    };

    return (
        <div className="p-3 md:p-6 text-slate-100 font-sans h-full">
            <DownloadManager
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                onLoadVideo={(item) => {
                    const url = URL.createObjectURL(item.blob);
                    addNewClip(item.blob, url, item.fileName, item.id);
                    setIsManagerOpen(false);
                }}
                onLoadMultiple={async (items) => {
                    if (!items || items.length === 0) return;

                    const newClipsData = [];
                    const newSegmentsData = [];

                    for (const item of items) {
                        // Check if file is already in library (by checking name or existing clips)
                        // Note: checkFileExists checks against DB, but here we check against in-memory clips too?
                        // checkFileExists(item.fileName) checks IndexedDB 'project files'.
                        // But these items come FROM download DB. Maybe they are already there?
                        // Let's just treat them as new imports to the editor.

                        // Avoid double add if clip with same name exists in current session?
                        if (clips.some(c => c.name === item.fileName)) {
                            toast(`${item.fileName} already in project`, { icon: 'ℹ️' });
                            continue;
                        }

                        const url = URL.createObjectURL(item.blob);
                        const clipId = crypto.randomUUID();

                        // Get metadata - we might already have it in 'item'
                        // but creating a video element is safer to verify it works
                        const tempVideo = document.createElement('video');
                        tempVideo.src = url;

                        await new Promise((resolve) => {
                            tempVideo.onloadedmetadata = () => {
                                const clipDuration = tempVideo.duration;
                                newClipsData.push({
                                    id: clipId,
                                    dbId: item.id,
                                    file: item.blob,
                                    url,
                                    name: item.fileName,
                                    duration: clipDuration,
                                    width: tempVideo.videoWidth,
                                    height: tempVideo.videoHeight
                                });
                                newSegmentsData.push({ id: clipId, duration: clipDuration });
                                resolve();
                            };
                            tempVideo.onerror = resolve; // Skip failed
                        });
                    }

                    if (newClipsData.length > 0) {
                        // Resolution check logic
                        let hasMismatch = false;
                        if (clips.length > 0) {
                            const first = clips[0];
                            if (newClipsData.some(c => c.width !== first.width || c.height !== first.height)) {
                                hasMismatch = true;
                            }
                        } else if (newClipsData.length > 1) {
                            const first = newClipsData[0];
                            hasMismatch = newClipsData.some(c => c.width !== first.width || c.height !== first.height);
                        }

                        if (hasMismatch) {
                            toast.error(`Resolution mismatch. Export may fail.`, { duration: 5000, icon: '⚠️' });
                            setResolutionMismatch(true);
                        }

                        setClips(prev => [...prev, ...newClipsData]);
                        addClips(newSegmentsData);
                        toast.success(`Added ${newClipsData.length} clips`);
                    }

                    setIsManagerOpen(false);
                }}
                onExport={(items) => {
                    // Check resolution mismatch for passed items?
                    // We can approx by checking 1st vs others
                    if (items.length > 1) {
                        const first = items[0];
                        const hasMismatch = items.some(i => i.width !== first.width || i.height !== first.height);
                        setResolutionMismatch(hasMismatch);
                    } else {
                        setResolutionMismatch(false);
                    }
                    setMergeItems(items);
                    setShowExportModal(true);
                    setIsManagerOpen(false);
                }}
            />

            <ExportOptionsModal
                isOpen={showExportModal}
                onClose={() => {
                    setShowExportModal(false);
                    setMergeItems([]); // Clear on cancel
                }}
                onConfirm={(mode) => {
                    if (mergeItems.length > 0) {
                        quickMerge(mergeItems, mode);
                    } else {
                        trimVideo(mode);
                    }
                }}
                resolutionMismatch={resolutionMismatch}
                totalDuration={mergeItems.length > 0 ? mergeItems.reduce((acc, i) => acc + (i.duration || 0), 0) : duration}
            />

            <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${loaded ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-slate-400">
                        {loaded ? 'Local Engine Ready' : 'Loading Local Engine...'}
                    </span>
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
                                    <div
                                        key={clip.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, idx)}
                                        className={`min-w-[130px] w-[130px] h-28 bg-slate-900 rounded-lg border ${!isCompatible ? 'border-yellow-500/50' : 'border-slate-700'} p-2 relative group shrink-0 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:border-blue-500/50 transition-all`}
                                    >
                                        {/* Hover Move Controls */}
                                        <div className="absolute inset-x-0 bottom-8 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveClip(idx, 'left'); }}
                                                className={`p-1 bg-black/60 hover:bg-blue-600 rounded-full text-white pointer-events-auto ${idx === 0 ? 'invisible' : ''}`}
                                            >
                                                <ChevronLeft size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveClip(idx, 'right'); }}
                                                className={`p-1 bg-black/60 hover:bg-blue-600 rounded-full text-white pointer-events-auto ${idx === clips.length - 1 ? 'invisible' : ''}`}
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                        </div>

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
                                <input type="file" multiple accept="video/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Col: Timeline & Controls */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Scissors size={18} /> Timeline</h2>

                    <div className="mb-6">
                        <div className="flex justify-between items-center text-xs text-slate-400 mb-2 gap-2">
                            {/* Time Display (Read Only) */}
                            <div className="font-mono text-white text-sm bg-slate-900 px-3 py-1 rounded border border-slate-700 select-none">
                                <span className={isDragging ? "text-blue-400" : ""}>{formatTime(currentTime)}</span>
                                <span className="text-slate-600 mx-1">/</span>
                                <span className="text-slate-500">{formatTime(duration)}</span>
                            </div>

                            {/* Unified Controller: Seek & Rate */}
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 select-none">
                                {/* Left Control */}
                                <button
                                    onMouseDown={() => handleSeekHold(-1)}
                                    onMouseUp={handleSeekStop}
                                    onMouseLeave={handleSeekStop}
                                    onDoubleClick={() => handleSpeedChange(-1)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors active:text-blue-400"
                                    title="Hold: Skip Back | Double-Click: Slower"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                {/* Shared Step Input */}
                                <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Step</span>
                                    <input
                                        type="number"
                                        min="0.01"
                                        max="60"
                                        step="0.01"
                                        value={timeStep}
                                        onChange={(e) => setTimeStep(parseFloat(e.target.value) || 0.1)}
                                        className="bg-transparent border-none text-white w-10 focus:outline-none text-center font-mono font-bold"
                                    />
                                    <span className="text-slate-500 text-[10px]">s</span>
                                </div>

                                {/* Right Control */}
                                <button
                                    onMouseDown={() => handleSeekHold(1)}
                                    onMouseUp={handleSeekStop}
                                    onMouseLeave={handleSeekStop}
                                    onDoubleClick={() => handleSpeedChange(1)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors active:text-blue-400"
                                    title="Hold: Skip Forward | Double-Click: Faster"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Speed Display with Reset */}
                            <div className="flex flex-col items-center justify-center w-12 relative group/rate">
                                {playbackRate !== 1 && (
                                    <button
                                        onClick={() => setPlaybackRate(1)}
                                        className="absolute -left-5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white rounded-full transition-colors"
                                        title="Reset Speed"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                )}
                                <span className="text-[10px] text-slate-500 uppercase">Rate</span>
                                <span className={`font-mono text-xs font-bold ${playbackRate !== 1 ? 'text-blue-400' : 'text-slate-300'}`}>
                                    {playbackRate.toFixed(2)}x
                                </span>
                            </div>
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
                                    const isSelected = activeSegmentId === seg.id;
                                    return (
                                        <div
                                            key={seg.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveSegmentId(seg.id);
                                            }}
                                            className={`h-full border-r border-slate-800/50 relative overflow-hidden group cursor-pointer ${activeSegmentId === seg.id ? 'opacity-100 ring-2 ring-yellow-400 z-10' : 'opacity-90 hover:opacity-100'}`}
                                            style={{ width: `${widthPercent}%` }}
                                        >
                                            <div className={`absolute inset-0 ${idx % 2 === 0 ? 'bg-gradient-to-b from-blue-600 to-blue-800' : 'bg-gradient-to-b from-purple-600 to-purple-800'} opacity-60`}></div>
                                            <span className="absolute bottom-1 left-1 text-[10px] text-white/70 truncate w-full px-1 pointer-events-none select-none">{clips.find(c => c.id === seg.clipId)?.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Playhead */}
                            {/* Playhead */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }}></div>
                        </div>


                    </div>
                    {/* Functional Buttons (Split, Delete, Undo) */}
                    <div className="flex items-center gap-2 my-3">
                        <button onClick={() => handleSplit(currentTime)} disabled={!activeSegmentId} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-50 flex items-center gap-2 transition-colors"><Scissors size={14} /> Split</button>
                        <button onClick={handleDeleteSegment} disabled={!activeSegmentId} className="px-3 py-1.5 bg-slate-700 hover:bg-red-900/50 text-red-200 rounded text-xs disabled:opacity-50 flex items-center gap-2 transition-colors"><Trash2 size={14} /> Delete</button>
                        <button onClick={handleUndo} disabled={historyIndex <= 0} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-50 flex items-center gap-2 transition-colors"><Undo size={14} /> Undo</button>
                    </div>
                    {/* Segment Sorter Strip */}
                    {segments.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">For Reorder</h4>
                            <div className="relative w-full h-20 bg-black/40 rounded-lg flex overflow-hidden border border-slate-800">
                                {segments.map((seg, idx) => {
                                    const clip = clips.find(c => c.id === seg.clipId);
                                    const isSelected = activeSegmentId === seg.id;
                                    const widthPercent = ((seg.end - seg.start) / duration) * 100;

                                    return (
                                        <div
                                            key={seg.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/grapedit-segment', idx);
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const sourceIndex = parseInt(e.dataTransfer.getData('text/grapedit-segment'), 10);
                                                if (!isNaN(sourceIndex)) {
                                                    reorderSegments(sourceIndex, idx);
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveSegmentId(seg.id);
                                            }}
                                            className={`h-full border-r border-slate-900/50 cursor-grab active:cursor-grabbing group transition-all relative ${isSelected ? 'bg-blue-600 z-10' : 'bg-slate-700 hover:bg-slate-600'}`}
                                            style={{ width: `${widthPercent}%` }}
                                        >
                                            {/* Info on Hover */}
                                            <div className="absolute inset-0 flex flex-col justify-center items-center p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 overflow-hidden">
                                                <span className="text-[10px] font-medium text-white truncate w-full text-center select-none">{clip?.name || 'Unknown'}</span>
                                                <span className="text-[9px] text-white/70 font-mono select-none">{formatTime(seg.end - seg.start)}</span>
                                            </div>

                                            {/* Base Visuals (Always visible) */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                                {/* Simple pill to show presence if text is hidden */}
                                                <div className="w-1/2 h-1 bg-white/20 rounded-full"></div>
                                            </div>

                                            {/* Hover Move Controls */}
                                            <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); reorderSegments(idx, idx - 1); }}
                                                    className={`p-0.5 bg-black/60 hover:bg-blue-600 rounded text-white ${idx === 0 ? 'invisible' : ''}`}
                                                    title="Move Left"
                                                >
                                                    <ChevronLeft size={10} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); reorderSegments(idx, idx + 1); }}
                                                    className={`p-0.5 bg-black/60 hover:bg-blue-600 rounded text-white ${idx === segments.length - 1 ? 'invisible' : ''}`}
                                                    title="Move Right"
                                                >
                                                    <ChevronRight size={10} />
                                                </button>
                                            </div>

                                            {isSelected && <div className="absolute inset-0 border-2 border-blue-400 pointer-events-none"></div>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

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

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => handleExportClick(['db'])}
                                disabled={!loaded || isExporting || segments.length === 0}
                                className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                To Bin
                            </button>
                            <button
                                onClick={() => handleExportClick(['disk'])}
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
