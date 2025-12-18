
import { useState } from "react";

export function useSegmentEditor(initialDuration = 0) {
    const [segments, setSegments] = useState([]);
    const [activeSegmentId, setActiveSegmentId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [duration, setDuration] = useState(initialDuration);

    const addToHistory = (newSegments, newActiveId, newDuration) => {
        const newEntry = { segments: newSegments, activeId: newActiveId, duration: newDuration !== undefined ? newDuration : duration };
        setHistory(prev => {
            const currentHistory = prev.slice(0, historyIndex + 1);
            return [...currentHistory, newEntry];
        });
        setHistoryIndex(prev => prev + 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const prevState = history[prevIndex];
            setSegments(prevState.segments);
            setActiveSegmentId(prevState.activeId);
            setDuration(prevState.duration);
            setHistoryIndex(prevIndex);
        }
    };

    const addClip = (clipId, clipDuration) => {
        const start = duration;
        const end = duration + clipDuration;
        const newSegment = {
            id: crypto.randomUUID(),
            start,
            end,
            clipId,
            sourceStart: 0
        };

        const newSegments = [...segments, newSegment];
        const newDuration = end;

        setSegments(newSegments);
        setDuration(newDuration);
        addToHistory(newSegments, null, newDuration);

        // Auto-select if first
        if (segments.length === 0) setActiveSegmentId(newSegment.id);
    };

    // Replaces initSegments - mostly used for single initial file or resets
    const initSegments = (dur) => {
        // Legacy support calling as addClip with a generic ID or wrapper
        // But for fresh init, we probably want to clear first? 
        // Let's assume this is strictly for the first file if we want to behave like before.
        // For multi-clip, use addClip.
        resetSegments();
        // We can't really init without an ID. 
        // This function might be deprecated or we assign a temp ID.
    };

    const handleSplit = (currentTime) => {
        const activeSeg = segments.find(s => s.id === activeSegmentId);
        if (!activeSeg) return;

        if (currentTime > activeSeg.start + 0.5 && currentTime < activeSeg.end - 0.5) {
            // Calculate where in the source video the split happens
            const splitOffset = currentTime - activeSeg.start;
            const sourceSplitPoint = activeSeg.sourceStart + splitOffset;

            const newSeg1 = {
                ...activeSeg,
                end: currentTime,
                id: crypto.randomUUID()
            };

            const newSeg2 = {
                ...activeSeg,
                start: currentTime,
                sourceStart: sourceSplitPoint,
                id: crypto.randomUUID()
            };

            const newSegments = [...segments];
            const idx = newSegments.findIndex(s => s.id === activeSegmentId);
            newSegments.splice(idx, 1, newSeg1, newSeg2);

            setSegments(newSegments);
            setActiveSegmentId(newSeg2.id);
            addToHistory(newSegments, newSeg2.id);
        } else {
            alert("Move playhead to the middle of a segment to split.");
        }
    };

    const handleDeleteSegment = () => {
        if (!activeSegmentId) return;

        // Deleting a segment works, but we also need to shift following segments back?
        // Or just leave a gap? Users usually expect a "Ripple Delete".
        // Let's implement Ripple Delete for consistency.

        const segmentToDelete = segments.find(s => s.id === activeSegmentId);
        if (!segmentToDelete) return;

        const durationDetail = segmentToDelete.end - segmentToDelete.start;

        const newSegments = segments.filter(s => s.id !== activeSegmentId).map(s => {
            if (s.start > segmentToDelete.start) {
                return {
                    ...s,
                    start: s.start - durationDetail,
                    end: s.end - durationDetail
                };
            }
            return s;
        });

        const newDuration = duration - durationDetail;

        setSegments(newSegments);
        setDuration(newDuration);
        setActiveSegmentId(null);
        addToHistory(newSegments, null, newDuration);
    };

    const resetSegments = () => {
        setSegments([]);
        setActiveSegmentId(null);
        setHistory([]);
        setHistoryIndex(-1);
        setDuration(0);
    };

    const removeSegmentsByClipId = (clipId) => {
        // Filter out segments belonging to this clip
        // and rebuild timeline to close gaps (magnetic)
        const keptSegments = segments.filter(s => s.clipId !== clipId);

        let currentStart = 0;
        const newSegments = keptSegments.map(seg => {
            const segDuration = seg.end - seg.start;
            const newSeg = {
                ...seg,
                start: currentStart,
                end: currentStart + segDuration
            };
            currentStart += segDuration;
            return newSeg;
        });

        setSegments(newSegments);
        setDuration(currentStart);
        addToHistory(newSegments, null, currentStart);

        if (activeSegmentId && segments.find(s => s.id === activeSegmentId)?.clipId === clipId) {
            setActiveSegmentId(null);
        }
    };

    return {
        segments, activeSegmentId, historyIndex, duration,
        setSegments, setActiveSegmentId, addClip, handleSplit, handleDeleteSegment, handleUndo, resetSegments, removeSegmentsByClipId
    };
}
