import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionOptions {
    onResult?: (transcript: string, isFinal: boolean) => void;
    onError?: (error: any) => void;
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
    const {
        language = 'fr-FR',
        continuous = false,
        interimResults = true
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const shouldRestartRef = useRef(false); // for continuous mode auto-restart

    // Keep callbacks in refs so they're always fresh without recreating recognition
    const onResultRef = useRef(options.onResult);
    const onErrorRef = useRef(options.onError);
    useEffect(() => { onResultRef.current = options.onResult; }, [options.onResult]);
    useEffect(() => { onErrorRef.current = options.onError; }, [options.onError]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = language;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            let isFinal = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const part = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += part;
                    isFinal = true;
                } else {
                    interimTranscript += part;
                }
            }

            const text = isFinal ? finalTranscript : interimTranscript;
            onResultRef.current?.(text, isFinal);
        };

        recognition.onerror = (event: any) => {
            // 'no-speech' and 'aborted' are not real errors
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                onErrorRef.current?.(event.error);
            }
            // Don't set listening to false for no-speech in continuous mode
            if (event.error !== 'no-speech') {
                isListeningRef.current = false;
                setIsListening(false);
                shouldRestartRef.current = false;
            }
        };

        recognition.onend = () => {
            // Auto-restart in continuous mode if we should still be listening
            if (shouldRestartRef.current && continuous) {
                try {
                    recognition.start();
                } catch {
                    isListeningRef.current = false;
                    setIsListening(false);
                    shouldRestartRef.current = false;
                }
            } else {
                isListeningRef.current = false;
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            shouldRestartRef.current = false;
            try { recognition.abort(); } catch { /* ignore */ }
        };
    }, [language, continuous, interimResults]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListeningRef.current) return;
        shouldRestartRef.current = continuous;
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error('Speech start error:', e);
        }
    }, [continuous]);

    const stopListening = useCallback(() => {
        shouldRestartRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
        isListeningRef.current = false;
        setIsListening(false);
    }, []);

    const toggleListening = useCallback(() => {
        if (isListeningRef.current) {
            stopListening();
        } else {
            startListening();
        }
    }, [startListening, stopListening]);

    return {
        isListening,
        isSupported,
        startListening,
        stopListening,
        toggleListening,
    };
};
