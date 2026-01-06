import React from 'react';
import { X, Check } from 'lucide-react';

export function ExportOptionsModal({ isOpen, onClose, onConfirm, resolutionMismatch, totalDuration = 0 }) {
    if (!isOpen) return null;

    const formatEstimate = (videoDuration, multiplier) => {
        if (!videoDuration) return 'Unknown';
        const estSeconds = videoDuration * multiplier;
        if (estSeconds < 60) return `~${Math.ceil(estSeconds)}s`;
        const mins = Math.ceil(estSeconds / 60);
        return `~${mins} min${mins > 1 ? 's' : ''}`;
    };

    const options = [
        {
            id: 'fast',
            label: 'Fast Merge (Copy)',
            desc: 'Instant but requires identical resolutions. Fails or glitches if mixed.',
            recommended: !resolutionMismatch,
            icon: '⚡',
            speed: 'Faster',
            timeEst: 'Instant'
        },
        {
            id: 'fit',
            label: 'Fit to Screen (Letterbox)',
            desc: 'Safe. Adds black bars to fit. Re-encodes video.',
            recommended: resolutionMismatch,
            icon: '📺',
            speed: 'Slow',
            timeEst: formatEstimate(totalDuration, 5) // ~5x realtime
        },
        {
            id: 'fill',
            label: 'Crop to Fill',
            desc: 'Scales to fill screen, cuts off edges. Re-encodes video.',
            recommended: false,
            icon: '✂️',
            speed: 'Slow',
            timeEst: formatEstimate(totalDuration, 5) // ~5x realtime
        },
        {
            id: 'blur',
            label: 'Blur Background',
            desc: 'Professional look for vertical videos. Re-encodes video.',
            recommended: false,
            icon: '🌫️',
            speed: 'Slower',
            timeEst: formatEstimate(totalDuration, 7) // ~7x realtime
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-2">Export Options</h3>
                <p className="text-slate-400 text-sm mb-6">Choose how to handle your clips.</p>

                <div className="space-y-3">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => onConfirm(opt.id)}
                            className={`w-full text-left p-4 rounded-lg border transition-all hover:bg-slate-800 flex gap-4 ${opt.recommended ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900/50'}`}
                        >
                            <span className="text-2xl">{opt.icon}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">{opt.label}</span>
                                    {opt.recommended && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">Rec</span>}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide ${opt.speed === 'Faster' ? 'bg-green-500/20 text-green-400' :
                                            opt.speed === 'Slower' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {opt.speed}
                                    </span>
                                    {opt.timeEst && <span className="text-[10px] text-slate-500 font-mono border border-slate-700 rounded px-1.5 py-0.5">{opt.timeEst}</span>}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
