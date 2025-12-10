// popup.js

document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('list');
    const countEl = document.getElementById('count');

    // Find active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject script to scan videos
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const vids = Array.from(document.querySelectorAll('video'))
                .map(v => ({ src: v.currentSrc || v.src, w: v.videoWidth, h: v.videoHeight }))
                .filter(v => v.src);
            // Also look for iframes? (Hard due to cross-origin)
            return vids;
        }
    });

    const pageVideos = results?.[0]?.result || [];

    // Get network detected videos
    const networkVideos = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'GET_DETECTED_VIDEOS', tabId: tab.id }, (response) => {
            resolve(response && response.videos ? response.videos : []);
        });
    });

    // Merge lists, deduplicating by src
    const allVideos = [...pageVideos];
    networkVideos.forEach(nv => {
        if (!allVideos.find(v => v.src === nv.src)) {
            allVideos.push(nv);
        }
    });

    // Filter out blobs since the external app cannot access them
    // Users requested to see them, so we include them but they might fail in editor
    // const processableVideos = allVideos.filter(v => !v.src.startsWith('blob:'));
    const processableVideos = allVideos;

    countEl.textContent = processableVideos.length;

    list.innerHTML = '';

    const videos = processableVideos; // Use the filtered list

    if (videos.length === 0) {
        list.innerHTML = '<div class="empty">No videos found.<br>Try playing the video first.</div>';
        return;
    }

    // Helper to sanitize filename
    const getSafeName = (str) => {
        return str.replace(/[^a-z0-9à-úñ .-]/gim, "_").trim();
    };

    const pageTitle = tab.title || "Video";

    videos.forEach((vid, index) => {
        const div = document.createElement('div');
        div.className = 'item';

        // Use page title, append index if multiple videos
        let displayTitle = pageTitle;
        if (videos.length > 1) {
            displayTitle = `${pageTitle} (${index + 1})`;
        }

        // Fallback to URL name if title is empty/generic
        if (!displayTitle || displayTitle === "Video") {
            displayTitle = vid.src.split('/').pop().split('?')[0] || `Video ${index + 1}`;
        }

        const isBlob = vid.src.startsWith('blob:');

        div.innerHTML = `
        <div class="info">
            <strong style="color: #e2e8f0; display:block; margin-bottom:2px;">${displayTitle.substring(0, 50)}...</strong>
            <div style="font-size: 10px; color: #94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:4px;">${vid.src}</div>
            ${vid.w ? `${vid.w}x${vid.h}` : ''} • ${isBlob ? 'Blob (Secure)' : 'Remote File'}
        </div>
        <div class="actions">
            <button class="btn-edit" data-src="${vid.src}" data-title="${getSafeName(displayTitle)}" data-referer="${vid.referer || ''}">Edit</button>
            <button class="btn-dl" data-src="${vid.src}" data-title="${getSafeName(displayTitle)}" data-referer="${vid.referer || ''}">Download</button>
        </div>
      `;

        list.appendChild(div);
    });

    // Event Delegation
    list.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.classList.contains('btn-dl')) {
            const src = e.target.getAttribute('data-src');
            const currentTitle = e.target.getAttribute('data-title');
            const referer = e.target.getAttribute('data-referer');
            let type = 'video/mp4';
            if (src.includes('.m3u8') || src.includes('blob:')) type = 'application/x-mpegURL';

            chrome.runtime.sendMessage({ action: 'OPEN_EDITOR', url: src, type: type, title: currentTitle, referer: referer });
        }
    });
});
