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
        const handleMessage = (event) => {
            try {
                // Check if message is from our extension content script
                if (event.data && event.data.type === 'GRAPEDIT_DATA' && event.data.payload) {
                    const data = JSON.parse(event.data.payload);

                    if (data && data.url) {
                        console.log("Received video from extension:", data);
                        setEditorProps({
                            initialVideo: data.url,
                            initialType: data.type || (data.url.includes('.m3u8') ? 'hls' : 'mp4'),
                            initialTitle: data.title || "Imported Video",
                            initialReferer: data.url,
                            initialResourceName: data.name || ""
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing extension message:", error);
            }
        };

        window.addEventListener("message", handleMessage);

        // Notify extension that we are ready to receive data
        window.postMessage("GRAPEDIT_READY", "*");

        return () => {
            window.removeEventListener("message", handleMessage);
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
