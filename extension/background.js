// background.js

// Store detected videos: { tabId: [ videoObjects ] }
const videoCache = {};
// Store referers temporarily: { requestId: refererUrl }
const refererCache = {};

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.tabId === -1) return;
        const refererHeader = details.requestHeaders.find(h => h.name.toLowerCase() === 'referer');
        if (refererHeader) {
            refererCache[details.requestId] = refererHeader.value;
        }
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        if (details.tabId === -1) return;

        const responseHeaders = details.responseHeaders || [];
        const contentTypeHeader = responseHeaders.find(h => h.name.toLowerCase() === 'content-type');
        const contentType = contentTypeHeader ? contentTypeHeader.value.toLowerCase() : '';

        // Retrieve Referer from cache
        const referer = refererCache[details.requestId] || '';

        // Cleanup cache (optional: generic cleanup might be needed for cancelled requests, but this covers most)
        // keeping it for a bit might be safer if multiple events fire, but usually safely removable here
        // actually onCompleted/onErrorOccurred is better for cleanup, but let's try to just read it here.
        // We won't delete immediately in case of redirects, but let's just read.
        // To avoid memory leaks, we should probably delete it or use a clearing interval. 
        // For now, let's delete it here, assuming 1:1 match for header receipt.
        delete refererCache[details.requestId];

        const url = details.url;
        const lowerUrl = url.toLowerCase();

        // Detection Logic
        let isVideo = false;
        let type = 'unknown';

        // Known video MIME types
        if (contentType.startsWith('video/') ||
            contentType.includes('application/x-mpegurl') ||
            contentType.includes('application/vnd.apple.mpegurl') ||
            contentType.includes('application/dash+xml') ||
            contentType.includes('application/octet-stream') // risky but needed for some generic servers
        ) {
            // Refine octet-stream check to avoid false positives (check extension)
            if (contentType.includes('application/octet-stream')) {
                const ext = lowerUrl.split('?')[0].split('.').pop();
                if (['m3u8', 'mp4', 'ts', 'mkv', 'webm', 'mov', 'flv', 'avi'].includes(ext)) {
                    isVideo = true;
                }
            } else {
                isVideo = true;
            }

            if (isVideo) {
                if (contentType.includes('mpegurl') || lowerUrl.includes('.m3u8')) type = 'm3u8';
                else if (contentType.includes('dash+xml') || lowerUrl.includes('.mpd')) type = 'mpd';
                else type = 'video';
            }
        }

        // Extension fallback
        if (!isVideo) {
            const ext = lowerUrl.split('?')[0].split('.').pop();
            if (['m3u8', 'mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'mpd'].includes(ext)) {
                isVideo = true;
                if (ext === 'm3u8') type = 'm3u8';
                else if (ext === 'mpd') type = 'mpd';
                else type = 'video';
            }
        }

        // Exclude small segments to avoid flooding (TS, m4s, etc) unless it is a main manifest or significant file
        // YouTube uses 'videoplayback' often without extensions
        if (lowerUrl.includes('videoplayback')) {
            isVideo = true;
            type = 'video';
        }

        // Filter out tiny segments usually
        // But be careful - user wants "intercept mp4". 
        // We exclude TS files explicitly usually because they are part of m3u8
        if (lowerUrl.endsWith('.ts') || contentType.includes('video/mp2t') || lowerUrl.includes('.m4s')) {
            // Keep it false unless we want to debug segments
            isVideo = false;
        }

        if (isVideo) {
            // Avoid duplicates
            if (!videoCache[details.tabId]) {
                videoCache[details.tabId] = [];
            }

            const exists = videoCache[details.tabId].find(v => v.src === url);
            if (!exists) {
                console.log(`[Grapedit] Detected video: ${url} `);
                videoCache[details.tabId].push({
                    src: url,
                    type: type,
                    mime: contentType || type,
                    referer: referer // Save referer
                });

                // Optional: Update badge text
                chrome.action.setBadgeText({ tabId: details.tabId, text: String(videoCache[details.tabId].length) });
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"] // Removed requestHeaders, it caused the crash
);

// Listen for popup request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DETECTED_VIDEOS') {
        const tabId = request.tabId;
        sendResponse({ videos: videoCache[tabId] || [] });
    }

    if (request.action === 'OPEN_EDITOR') {
        const { url, type, title, referer } = request;
        const editorUrl = `http://localhost:3000/editor?video=${encodeURIComponent(url)}&type=${encodeURIComponent(type)}&title=${encodeURIComponent(title || "video")}&referer=${encodeURIComponent(referer || "")}`;
        chrome.tabs.create({ url: editorUrl });
    }

    // Clean up cache when tab is closed
    if (request.action === 'TAB_CLOSED') {
        delete videoCache[request.tabId];
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete videoCache[tabId];
});
