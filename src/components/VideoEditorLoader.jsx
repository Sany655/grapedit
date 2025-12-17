"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const VideoEditor = dynamic(() => import("./video-editor"), {
    ssr: false,
});

export default function VideoEditorLoader({ videoUrl = "", type = "", initialTitle = "", initialReferer = "" }) {
    const [editorProps, setEditorProps] = useState({
        initialVideo: videoUrl,
        initialType: type,
        initialTitle: initialTitle,
        initialReferer: initialReferer
    });

    useEffect(() => {
        const channel = new BroadcastChannel("grapedit-temporary-channel");

        const handleMessage = (event) => {
            try {
                // The extension sends data as a JSON string or object
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                if (data && data.url) {
                    console.log("Received video from extension:", data);
                    setEditorProps({
                        initialVideo: data.url,
                        initialType: data.type || (data.url.includes('.m3u8') ? 'hls' : 'mp4'),
                        initialTitle: data.title || "Imported Video",
                        initialReferer: data.url, // Using url as referer if not provided
                        initialResourceName: data.name || ""
                        // Note: Extension payload structure might vary, adjusting as needed
                    });
                }
            } catch (error) {
                console.error("Error processing extension message:", error);
            }
        };

        const handleStorage = () => {
            // Fallback: Check local storage if the extension uses that mechanism concurrently
            // Based on analysis, the extension uses BroadcastChannel for immediate handover
        };

        channel.addEventListener("message", handleMessage);

        // Notify extension that we are ready to receive data
        channel.postMessage("GRAPEDIT_READY");

        return () => {
            channel.removeEventListener("message", handleMessage);
            channel.close();
        };
    }, []);

    // Update state if props change (e.g. navigation)
    useEffect(() => {
        if (videoUrl) {
            setEditorProps({
                initialVideo: videoUrl,
                initialType: type,
                initialTitle: initialTitle,
                initialReferer: initialReferer,
                initialResourceName: ""
            });
        }
    }, [videoUrl, type, initialTitle, initialReferer]);

    return <VideoEditor key={editorProps.initialVideo} {...editorProps} />;
}
