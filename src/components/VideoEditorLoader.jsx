"use client";

import React from "react";
import dynamic from "next/dynamic";

const VideoEditor = dynamic(() => import("./video-editor"), {
    ssr: false,
});

export default function VideoEditorLoader({ videoUrl="", type="", initialTitle="", initialReferer="" }) {
    // if (!videoUrl) {
    //     return <div className="text-white text-center mt-20">No video URL provided.</div>;
    // }

    return <VideoEditor initialVideo={videoUrl} initialType={type} initialTitle={initialTitle} initialReferer={initialReferer} />;
}
