// content.js

// 1. Listen for video transfer (Editor Page role)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TRANSFER_VIDEO') {
        console.log("Content Script: Received Video Data");
        // Convert base64 back to blob/buffer if needed, or just pass to window
        // Window postMessage is safest to reach React
        const base64 = request.payload;

        // Deconstruct base64 header if present, though fetchFile (ffmpeg) handles URLs too.
        // But better to convert to Blob here or in React. 
        // Let's pass the base64 string, VideoEditor will buffer it.

        // Helper to base64 -> ArrayBuffer
        fetch(base64).then(res => res.arrayBuffer()).then(buffer => {
            window.postMessage({
                type: 'GEDIT_LOAD_VIDEO',
                buffer: buffer,
                mimeType: 'video/mp4' // inferred or fixed
            }, '*');
        });
    }
});

// 2. Scan for videos (Source Page role) -> This is triggered by Popup usually via executeScript
// But we can also listen for a request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCAN_VIDEOS') {
        const videos = Array.from(document.querySelectorAll('video')).map(v => ({
            src: v.currentSrc || v.src,
            type: 'video',
            // Estimate size/quality?
            width: v.videoWidth,
            height: v.videoHeight
        })).filter(v => v.src);

        sendResponse({ videos });
    }
});
