
"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchFile } from "@ffmpeg/util";
import { Upload, Scissors, Download, Loader2, Play, History, Trash2, Undo } from "lucide-react";
import DownloadManager from "./DownloadManager";
import { useVideoDownload } from "./video-editor/useVideoDownload";
import { useSegmentEditor } from "./video-editor/useSegmentEditor";
import { ProcessingScreen } from "./video-editor/ProcessingScreen";

export default function VideoEditor({ initialVideo, initialType, initialTitle, initialReferer }) {
    const {
        downloadProgress, downloadedBytes, totalBytesEst, downloadSpeed, isPaused, processingText, isProcessing,
        downloadStarted, videoFile, videoUrl, fileName, loaded, ffmpegRef, currentDownloadId,
        setVideoFile, setVideoUrl, setFileName, startDownloadProcess, togglePause, cancelDownload, formatSize
    } = useVideoDownload(initialVideo, initialType, initialTitle, initialReferer);

    const {
        segments, activeSegmentId, historyIndex, duration,
        setActiveSegmentId, initSegments, handleSplit, handleDeleteSegment, handleUndo
    } = useSegmentEditor();

    const [currentTime, setCurrentTime] = useState(0);
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const videoRef = useRef(null);
    const timelineRef = useRef(null);

    const formatTime = (seconds) => {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 8);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setFileName(file.name);
        }
    };

    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.data && event.data.type === 'GEDIT_LOAD_VIDEO') {
                const { buffer, mimeType } = event.data;
                console.log("Received video data from extension", mimeType);
                if (buffer) {
                    const blob = new Blob([buffer], { type: mimeType || 'video/mp4' });
                    setVideoFile(blob);
                    setVideoUrl(URL.createObjectURL(blob));
                    if (event.data.fileName) {
                        setFileName(event.data.fileName);
                    } else {
                        setFileName("extension-video.mp4");
                    }
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [setVideoFile, setVideoUrl, setFileName]);

    const onLoadedMetadata = (e) => {
        initSegments(e.target.duration);
    };

    const onTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || duration === 0) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickTime = (x / rect.width) * duration;

        if (videoRef.current) {
            videoRef.current.currentTime = clickTime;
        }
        setCurrentTime(clickTime);

        const seg = segments.find(s => clickTime >= s.start && clickTime <= s.end);
        if (seg) setActiveSegmentId(seg.id);
        else setActiveSegmentId(null);
    };

    const handleManualTimeChange = (e) => {
        const time = parseFloat(e.target.value);
        if (!isNaN(time) && time >= 0 && time <= duration) {
            setCurrentTime(time);
            if (videoRef.current) {
                videoRef.current.currentTime = time;
            }
        }
    };

    const trimVideo = async () => {
        if (!loaded) return;
        if (!videoFile && (initialVideo?.includes('.m3u8') || initialType === 'application/x-mpegURL')) {
            alert("Please wait for the video to finish downloading before editing.");
            return;
        }
        if (!videoFile && !videoUrl) return;

        const ffmpeg = ffmpegRef.current;
        setIsExporting(true);

        try {
            const activeSegments = segments.slice().sort((a, b) => a.start - a.start);
            if (activeSegments.length === 0) {
                setIsExporting(false);
                return;
            }

            const inputName = "input.mp4";
            await ffmpeg.writeFile(inputName, await fetchFile(videoFile || videoUrl));

            let concatList = '';

            // Extract segments using stream copy (fastest)
            for (let i = 0; i < activeSegments.length; i++) {
                const seg = activeSegments[i];
                const segmentName = `seg_${i}.mp4`;
                const duration = seg.end - seg.start;

                // Using -ss before -i is faster. -c copy avoids re-encoding.
                // Note regarding precision: -ss before -i snaps to keyframes.
                // If user wants frame accurate, we need re-encode, but they asked for speed ("instant").
                await ffmpeg.exec([
                    '-ss', seg.start.toFixed(3),
                    '-i', inputName,
                    '-t', duration.toFixed(3),
                    '-c', 'copy',
                    segmentName
                ]);

                concatList += `file '${segmentName}'\n`;
            }

            await ffmpeg.writeFile('concat_list.txt', concatList);

            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat_list.txt',
                '-c', 'copy',
                'output.mp4'
            ]);

            const data = await ffmpeg.readFile("output.mp4");
            const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));

            const a = document.createElement("a");
            a.href = url;
            a.download = `edited-${fileName || "video.mp4"}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile('concat_list.txt');
            await ffmpeg.deleteFile("output.mp4");
            for (let i = 0; i < activeSegments.length; i++) {
                try { await ffmpeg.deleteFile(`seg_${i}.mp4`); } catch (e) { }
            }

        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed! See console.");
        } finally {
            setIsExporting(false);
        }
    };

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
                    const url = URL.createObjectURL(item.blob);
                    setVideoUrl(url);
                    setVideoFile(item.blob);
                    setFileName(item.fileName);
                    setIsManagerOpen(false);
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
            />

            {!isProcessing && !downloadStarted && initialVideo && (
                <div className="mb-8 bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-xl animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Ready to Download</h3>
                            <p className="text-slate-400 text-sm">Target: {fileName}</p>
                        </div>
                        <button
                            onClick={startDownloadProcess}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                        >
                            <Download size={20} /> Start Download
                        </button>
                    </div>
                </div>
            )}

            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        ProVideo Editor
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsManagerOpen(true)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 transition-colors border border-slate-700"
                    >
                        <History size={18} />
                        <span className="hidden md:inline">Downloads</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${loaded ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm text-slate-400">{loaded ? 'Engine Ready' : 'Loading Engine...'}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Input */}
                {/* <div className="space-y-6">
                </div> */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Upload size={20} className="text-blue-400" />
                        Source
                    </h2>

                    {!videoUrl ? (
                        <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                            <p className="text-slate-400">Drag & drop or click to upload</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                className="w-full rounded-lg bg-black aspect-video"
                                onLoadedMetadata={onLoadedMetadata}
                                onTimeUpdate={onTimeUpdate}
                            />
                            <div className="flex justify-between text-sm text-slate-400">
                                <div className="flex justify-between items-center w-full">
                                    <button onClick={() => { setVideoUrl(""); setVideoFile(null); }} className="text-red-400 hover:text-red-300">
                                        Remove
                                    </button>

                                    {videoFile && (
                                        <a
                                            href={videoUrl}
                                            download={fileName}
                                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Download size={16} /> Save Original
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {videoUrl && (
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Scissors size={20} className="text-purple-400" />
                            Edit
                        </h2>

                        <div className="mb-6 px-1 space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Timeline</span>
                                <div className="flex gap-2 text-white">
                                    <span>Current: <input type="number" min="0" max={duration} step="0.25" value={currentTime} onChange={handleManualTimeChange} className="w-20 bg-slate-700 border-none rounded px-2 py-0.5 text-xs" /></span>
                                    <span>Total: {formatTime(duration)}</span>
                                </div>
                            </div>
                            <div
                                ref={timelineRef}
                                onClick={handleTimelineClick}
                                className="relative h-16 bg-slate-900 rounded-lg cursor-pointer overflow-hidden border border-slate-700"
                            >
                                <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#7f1d1d_10px,#7f1d1d_20px)]"></div>
                                {segments.map(seg => (
                                    <div
                                        key={seg.id}
                                        className={`absolute h-full top-0 border-r border-slate-800/50 transition-colors ${activeSegmentId === seg.id ? 'bg-blue-600/80 z-10' : 'bg-green-600/60 hover:bg-green-500/70'}`}
                                        style={{
                                            left: `${(seg.start / duration) * 100}%`,
                                            width: `${((seg.end - seg.start) / duration) * 100}%`
                                        }}
                                    >
                                        {activeSegmentId === seg.id && (
                                            <div className="absolute inset-0 border-2 border-yellow-400 pointer-events-none"></div>
                                        )}
                                    </div>
                                ))}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    style={{ left: `${(currentTime / duration) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={historyIndex <= 0}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    <Undo size={18} /> Undo
                                </button>
                                <button
                                    onClick={handleDeleteSegment}
                                    disabled={!activeSegmentId}
                                    className="px-4 py-2 bg-slate-700 hover:bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    <Trash2 size={18} /> Delete
                                </button>
                                <button
                                    onClick={() => handleSplit(currentTime)}
                                    disabled={!activeSegmentId}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    <Scissors size={18} /> Split
                                </button>
                            </div>

                            <button
                                onClick={trimVideo}
                                disabled={!loaded || isProcessing || isExporting || segments.length === 0}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                            >
                                {isProcessing || isExporting ? (
                                    <><Loader2 className="animate-spin" /> Processing...</>
                                ) : (
                                    <><Download size={18} /> Export Merged Video</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}