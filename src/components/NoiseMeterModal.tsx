import React, { useState, useEffect, useRef } from 'react';
import { X, Settings2 } from 'lucide-react';

interface NoiseMeterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NoiseMeterModal: React.FC<NoiseMeterModalProps> = ({ isOpen, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [volume, setVolume] = useState(0);
    const [sensitivity, setSensitivity] = useState(50); // 1-100
    const [error, setError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);

    // Initial Start
    useEffect(() => {
        if (isOpen && !isListening) {
            startListening();
        }
        return () => stopListening();
    }, [isOpen]);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (!audioContextRef.current) return;

            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;

            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);

            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);

            setIsListening(true);
            setError(null);
            tick();
        } catch (err) {
            console.error("Microphone access denied:", err);
            setError("Accès au micro refusé ou impossible.");
        }
    };

    const stopListening = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        setIsListening(false);
        setVolume(0);
    };

    const tick = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        // Calculate average volume
        const array = dataArrayRef.current;
        let values = 0;
        for (let i = 0; i < array.length; i++) {
            values += array[i];
        }
        const average = values / array.length;

        // Apply sensitivity factor
        // Higher sensitivity value = Lower threshold to reach max volume
        // We normalize input (0-255) to 0-100 based on sensitivity
        const factor = 1 + (sensitivity / 20); // 1 to 6x multiplier
        const adjustedVol = Math.min(100, (average / 255) * 100 * factor);

        // Smooth transition
        setVolume(prev => prev + (adjustedVol - prev) * 0.2);

        rafRef.current = requestAnimationFrame(tick);
    };

    if (!isOpen) return null;

    // Determine state
    const getState = (vol: number) => {
        if (vol < 30) return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Calme', emoji: '😌' };
        if (vol < 60) return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Bruyant', emoji: '😐' };
        return { color: 'text-rose-500', bg: 'bg-rose-500', label: 'Trop fort !', emoji: '🤯' };
    };

    const currentState = getState(volume);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl text-center">

                {/* Header Actions */}
                <div className="absolute top-6 right-6 flex gap-4">
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Visual */}
                <div className="relative mb-12">
                    <div className="text-[150px] leading-none mb-4 animate-in zoom-in duration-300 drop-shadow-2xl">
                        {currentState.emoji}
                    </div>
                    <h2 className={`text-6xl font-black uppercase tracking-tight transition-colors duration-300 ${currentState.color}`}>
                        {currentState.label}
                    </h2>
                </div>

                {/* Gauge */}
                <div className="max-w-md mx-auto relative h-12 bg-gray-800 rounded-full overflow-hidden border-4 border-white/10 shadow-inner">
                    <div
                        className={`h-full transition-all duration-100 ease-out ${currentState.bg}`}
                        style={{ width: `${volume}%` }}
                    />
                    {/* Markers */}
                    <div className="absolute top-0 left-[30%] h-full w-0.5 bg-white/20"></div>
                    <div className="absolute top-0 left-[60%] h-full w-0.5 bg-white/20"></div>
                </div>

                {/* Controls */}
                <div className="mt-12 bg-black/40 backdrop-blur-sm rounded-2xl p-6 inline-block text-left max-w-sm w-full border border-white/10">
                    {error ? (
                        <div className="text-rose-400 text-center font-bold">{error}</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-gray-400 text-sm font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-2"><Settings2 size={16} /> Sensibilité</span>
                                <span>{sensitivity}%</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={sensitivity}
                                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-xs text-center text-gray-500 pt-2">
                                Ajustez si le micro est trop/pas assez sensible.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default NoiseMeterModal;
