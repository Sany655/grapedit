
import { useState } from "react";

export function useSegmentEditor(initialDuration = 0) {
    const [segments, setSegments] = useState([]);
    const [activeSegmentId, setActiveSegmentId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [duration, setDuration] = useState(initialDuration);

    const addToHistory = (newSegments, newActiveId) => {
        const newEntry = { segments: newSegments, activeId: newActiveId };
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
            setHistoryIndex(prevIndex);
        }
    };

    const initSegments = (dur) => {
        setDuration(dur);
        if (segments.length === 0) {
            const firstId = crypto.randomUUID();
            const initialSegments = [{ id: firstId, start: 0, end: dur }];
            setSegments(initialSegments);
            setActiveSegmentId(firstId);
            setHistory([{ segments: initialSegments, activeId: firstId }]);
            setHistoryIndex(0);
        }
    };

    const handleSplit = (currentTime) => {
        const activeSeg = segments.find(s => s.id === activeSegmentId);
        if (!activeSeg) return;

        if (currentTime > activeSeg.start + 0.5 && currentTime < activeSeg.end - 0.5) {
            const newSeg1 = { ...activeSeg, end: currentTime, id: crypto.randomUUID() };
            const newSeg2 = { ...activeSeg, start: currentTime, id: crypto.randomUUID() };

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
        const newSegments = segments.filter(s => s.id !== activeSegmentId);
        setSegments(newSegments);
        setActiveSegmentId(null);
        addToHistory(newSegments, null);
    };

    return {
        segments, activeSegmentId, historyIndex, duration,
        setSegments, setActiveSegmentId, initSegments, handleSplit, handleDeleteSegment, handleUndo
    };
}
