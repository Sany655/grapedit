
import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { saveDownload, updateDownloadProgress } from "../../utils/db";

export function useVideoDownload(initialVideo, initialType, initialTitle, initialReferer) {
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadedBytes, setDownloadedBytes] = useState(0);
    const [totalBytesEst, setTotalBytesEst] = useState(0);
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [processingText, setProcessingText] = useState("Processing...");
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadStarted, setDownloadStarted] = useState(false);
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(initialVideo || "");
    const [fileName, setFileName] = useState(initialTitle ? `${initialTitle}.mp4` : "source-video.mp4");
    const [loaded, setLoaded] = useState(false);
    const [currentDownloadId, setCurrentDownloadId] = useState(null);

    const pauseRef = useRef(false);
    const cancelRef = useRef(false);
    const abortControllerRef = useRef(null);
    const ffmpegRef = useRef(new FFmpeg());

    const load = async () => {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
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

    useEffect(() => {
        load();
        return () => {
            cancelRef.current = true;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const togglePause = () => {
        pauseRef.current = !pauseRef.current;
        setIsPaused(pauseRef.current);
    };

    const cancelDownload = () => {
        cancelRef.current = true;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const startDownloadProcess = async (overrideUrl = null) => {
        // Ensure overrideUrl is a string (it might be an event object from onClick)
        const targetVideo = (typeof overrideUrl === 'string' ? overrideUrl : null) || initialVideo;

        setDownloadStarted(true);
        if (targetVideo) {
            if (targetVideo.includes('.m3u8') || initialType === 'application/x-mpegURL') {
                setIsProcessing(true);
                setProcessingText("Downloading and converting segments...");
                setDownloadProgress(0);
                setDownloadedBytes(0);
                setTotalBytesEst(0);
                setDownloadSpeed(0);

                pauseRef.current = false;
                cancelRef.current = false;
                setIsPaused(false);

                const controller = new AbortController();
                abortControllerRef.current = controller;
                const signal = controller.signal;

                let localFileName = "video.mp4";
                if (initialTitle) {
                    localFileName = `${initialTitle}.mp4`;
                    setFileName(localFileName);
                } else {
                    try {
                        let name = targetVideo.split('?')[0].split('/').pop();
                        if (!name || name.trim() === '') name = "video";
                        if (!name.endsWith('.mp4') && !name.endsWith('.ts')) name += ".mp4";
                        name = name.replace('.m3u8', '.mp4');
                        setFileName(name);
                        localFileName = name;
                    } catch (e) {
                        setFileName("downloaded-video.mp4");
                        localFileName = "downloaded-video.mp4";
                    }
                }

                const downloadId = crypto.randomUUID();
                setCurrentDownloadId(downloadId);
                await saveDownload({
                    id: downloadId,
                    url: targetVideo,
                    fileName: localFileName,
                    status: 'downloading',
                    progress: 0,
                    createdAt: new Date().toISOString()
                });

                try {
                    const fetchProxy = (url) => `/api/proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(initialReferer || "")}`;
                    const response = await fetch(fetchProxy(targetVideo), { signal });
                    if (!response.ok) {
                        const errorText = await response.text();
                        alert(`Failed to fetch manifest: ${response.status} ${response.statusText} - ${errorText}`);
                        return;
                    }
                    const manifestText = await response.text();

                    const baseUrl = targetVideo.substring(0, targetVideo.lastIndexOf('/') + 1);
                    const lines = manifestText.split('\n');
                    const segments = [];

                    for (let line of lines) {
                        line = line.trim();
                        if (line && !line.startsWith('#')) {
                            let finalUrl = line;
                            if (!line.startsWith('http')) {
                                finalUrl = baseUrl + line;
                            }
                            segments.push(finalUrl);
                        }
                    }

                    if (segments.length === 0) throw new Error("No segments found in m3u8");

                    const segmentBuffers = [];
                    let completed = 0;
                    let totalBytes = 0;
                    let startTime = Date.now();
                    let lastSpeedUpdate = Date.now();

                    for (const segmentUrl of segments) {
                        if (cancelRef.current) throw new Error("Download cancelled by user");
                        while (pauseRef.current) {
                            if (cancelRef.current) throw new Error("Download cancelled by user");
                            await new Promise(r => setTimeout(r, 500));
                            lastSpeedUpdate = Date.now();
                        }

                        try {
                            const segResp = await fetch(fetchProxy(segmentUrl), { signal });
                            if (!segResp.ok) throw new Error(`Failed to fetch segment ${segResp.status}`);
                            const buffer = await segResp.arrayBuffer();
                            segmentBuffers.push(new Uint8Array(buffer));
                            completed++;
                            totalBytes += buffer.byteLength;

                            if (completed === 1) setTotalBytesEst(buffer.byteLength * segments.length);

                            const now = Date.now();
                            if (now - lastSpeedUpdate > 500) {
                                const timeDiff = (now - startTime) / 1000;
                                if (timeDiff > 0) setDownloadSpeed(totalBytes / timeDiff);
                                lastSpeedUpdate = now;
                            }

                            setDownloadProgress(Math.round((completed / segments.length) * 100));
                            setDownloadedBytes(totalBytes);

                            if (completed % 5 === 0 || completed === segments.length) {
                                updateDownloadProgress(downloadId, 'downloading', Math.round((completed / segments.length) * 100), totalBytes / ((Date.now() - startTime) / 1000));
                            }
                        } catch (err) {
                            if (err.name === 'AbortError') throw new Error("Download cancelled by user");
                            console.error("Failed to download segment", segmentUrl, err);
                        }
                    }

                    let totalLength = 0;
                    segmentBuffers.forEach(buf => totalLength += buf.length);
                    const mergedVideo = new Uint8Array(totalLength);
                    let offset = 0;
                    segmentBuffers.forEach(buf => {
                        mergedVideo.set(buf, offset);
                        offset += buf.length;
                    });

                    const tsBlob = new Blob([mergedVideo], { type: 'video/mp2t' });

                    try {
                        if (cancelRef.current) throw new Error("Download cancelled by user");
                        setProcessingText("Transmuxing to MP4...");
                        const ffmpeg = ffmpegRef.current;
                        if (!ffmpeg.loaded) await load();

                        const tsName = "download.ts";
                        const mp4Name = "download.mp4";

                        await ffmpeg.writeFile(tsName, await fetchFile(tsBlob));
                        await ffmpeg.exec(["-i", tsName, "-c", "copy", mp4Name]);
                        const mp4Data = await ffmpeg.readFile(mp4Name);
                        const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });

                        if (!cancelRef.current) {
                            setVideoFile(mp4Blob);
                            setVideoUrl(URL.createObjectURL(mp4Blob));
                            await saveDownload({
                                id: downloadId,
                                url: targetVideo,
                                fileName: localFileName,
                                status: 'completed',
                                progress: 100,
                                blob: mp4Blob,
                                createdAt: new Date().toISOString()
                            });
                        }
                        await ffmpeg.deleteFile(tsName);
                        await ffmpeg.deleteFile(mp4Name);

                    } catch (convErr) {
                        if (convErr.message === "Download cancelled by user") throw convErr;
                        console.error("Transmux failed:", convErr);
                        setVideoFile(tsBlob);
                        setVideoUrl(URL.createObjectURL(tsBlob));
                    }

                } catch (error) {
                    if (abortControllerRef.current === controller) {
                        if (error.message === "Download cancelled by user" || error.name === 'AbortError') {
                            console.log("Download process cancelled.");
                        } else {
                            console.error("HLS Process failed:", error);
                            alert("Failed to download HLS stream: " + error.message);
                        }
                        if (!cancelRef.current) setVideoUrl(initialVideo);
                    }
                } finally {
                    if (abortControllerRef.current === controller) {
                        setIsProcessing(false);
                        setDownloadProgress(0);
                        setDownloadedBytes(0);
                        setTotalBytesEst(0);
                        setDownloadSpeed(0);
                        pauseRef.current = false;
                        cancelRef.current = false;
                    }
                }
            } else {
                // Standard file download (MP4, etc.)
                try {
                    setIsProcessing(true);
                    setProcessingText("Downloading video file...");
                    setDownloadProgress(0);
                    setDownloadedBytes(0);
                    setTotalBytesEst(0);
                    setDownloadSpeed(0);

                    // Setup cancellation
                    cancelRef.current = false;
                    setIsPaused(false);
                    const controller = new AbortController();
                    abortControllerRef.current = controller;
                    const signal = controller.signal;

                    const downloadId = crypto.randomUUID();
                    setCurrentDownloadId(downloadId);

                    let localFileName = "video.mp4";
                    if (initialTitle) {
                        localFileName = `${initialTitle}.mp4`;
                        setFileName(localFileName);
                    } else {
                        const urlName = targetVideo.split('?')[0].split('/').pop();
                        if (urlName && urlName.length < 50) localFileName = urlName;
                    }

                    await saveDownload({
                        id: downloadId,
                        url: targetVideo,
                        fileName: localFileName,
                        status: 'downloading',
                        progress: 0,
                        createdAt: new Date().toISOString()
                    });

                    const fetchProxy = (url) => `/api/proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(initialReferer || "")}`;
                    const response = await fetch(fetchProxy(targetVideo), { signal });

                    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

                    const contentLength = response.headers.get('content-length');
                    const total = contentLength ? parseInt(contentLength, 10) : 0;
                    setTotalBytesEst(total);

                    const reader = response.body.getReader();
                    let receivedLength = 0;
                    let chunks = [];
                    let startTime = Date.now();
                    let lastUpdate = Date.now();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        if (cancelRef.current) {
                            reader.cancel();
                            throw new Error("Download cancelled by user");
                        }

                        chunks.push(value);
                        receivedLength += value.length;
                        setDownloadedBytes(receivedLength);

                        const now = Date.now();
                        if (now - lastUpdate > 500) {
                            if (total > 0) {
                                const prog = Math.round((receivedLength / total) * 100);
                                setDownloadProgress(prog);
                                updateDownloadProgress(downloadId, 'downloading', prog, receivedLength / ((now - startTime) / 1000));
                            }
                            setDownloadSpeed(receivedLength / ((now - startTime) / 1000));
                            lastUpdate = now;
                        }
                    }

                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const blobUrl = URL.createObjectURL(blob);

                    setVideoFile(blob);
                    setVideoUrl(blobUrl);

                    await saveDownload({
                        id: downloadId,
                        url: targetVideo,
                        fileName: localFileName,
                        status: 'completed',
                        progress: 100,
                        blob: blob,
                        createdAt: new Date().toISOString()
                    });

                } catch (error) {
                    console.error("Download failed:", error);
                    if (error.message !== "Download cancelled by user") {
                        alert("Failed to download file: " + error.message);
                    }
                } finally {
                    setIsProcessing(false);
                    setDownloadStarted(false);
                }
            }
        }
    };

    return {
        downloadProgress, downloadedBytes, totalBytesEst, downloadSpeed, isPaused, processingText, isProcessing,
        downloadStarted, videoFile, videoUrl, fileName, loaded, ffmpegRef, currentDownloadId,
        setVideoFile, setVideoUrl, setFileName, startDownloadProcess, togglePause, cancelDownload, formatSize
    };
}
