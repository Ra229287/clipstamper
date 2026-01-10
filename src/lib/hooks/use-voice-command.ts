'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseVoiceCommandOptions {
  triggerPhrase?: string;
  onTrigger: () => void;
  enabled?: boolean;
}

interface VoiceCommandState {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  lastTranscript: string;
}

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoiceCommand({
  triggerPhrase = 'clip it',
  onTrigger,
  enabled = true,
}: UseVoiceCommandOptions): VoiceCommandState & { start: () => void; stop: () => void } {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    isSupported: false,
    error: null,
    lastTranscript: '',
  });
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isEnabledRef = useRef(enabled);
  const isListeningRef = useRef(false);
  const lastTriggerTimeRef = useRef<number>(0);
  const COOLDOWN_MS = 3000; // 3 second cooldown between triggers

  // Update refs when values change
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isListeningRef.current = state.isListening;
  }, [state.isListening]);
  
  // Initialize speech recognition
  useEffect(() => {
    console.log('[Voice] Initializing speech recognition...');
    console.log('[Voice] window defined:', typeof window !== 'undefined');

    if (typeof window === 'undefined') {
      console.log('[Voice] Window undefined, skipping init');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    console.log('[Voice] SpeechRecognition API available:', !!SpeechRecognitionAPI);

    if (!SpeechRecognitionAPI) {
      console.log('[Voice] Speech recognition NOT supported in this browser');
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    console.log('[Voice] Creating recognition instance...');
    setState(prev => ({ ...prev, isSupported: true }));

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    console.log('[Voice] Recognition configured: continuous=true, interimResults=true, lang=en-US');
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const transcript = results
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .toLowerCase();

      console.log('[Voice] Heard:', transcript);
      setState(prev => ({ ...prev, lastTranscript: transcript }));

      // Check for trigger phrase
      const phraseFound = transcript.includes(triggerPhrase.toLowerCase());
      const now = Date.now();
      const timeSinceLastTrigger = now - lastTriggerTimeRef.current;
      const cooldownActive = timeSinceLastTrigger < COOLDOWN_MS;

      console.log('[Voice] Looking for:', triggerPhrase, '| Found:', phraseFound, '| Enabled:', isEnabledRef.current, '| Cooldown:', cooldownActive ? `${Math.ceil((COOLDOWN_MS - timeSinceLastTrigger) / 1000)}s left` : 'ready');

      if (phraseFound && isEnabledRef.current && !cooldownActive) {
        console.log('[Voice] TRIGGERING callback!');
        lastTriggerTimeRef.current = now;
        onTrigger();
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState(prev => ({ 
        ...prev, 
        error: 'Speech recognition error: ' + event.error,
        isListening: false,
      }));
    };
    
    recognition.onend = () => {
      console.log('[Voice] onend fired, enabled:', isEnabledRef.current, 'isListening:', isListeningRef.current);
      // Auto-restart if still enabled and listening
      if (isEnabledRef.current && isListeningRef.current) {
        console.log('[Voice] Auto-restarting recognition...');
        try {
          recognition.start();
        } catch (e) {
          console.log('[Voice] Auto-restart failed (may already be started):', e);
        }
      } else {
        console.log('[Voice] Not restarting - setting isListening to false');
        setState(prev => ({ ...prev, isListening: false }));
      }
    };
    
    // Add onstart handler for debugging
    recognition.onstart = () => {
      console.log('[Voice] >>> Recognition STARTED - now listening for audio');
    };

    recognition.onaudiostart = () => {
      console.log('[Voice] >>> Audio capture STARTED - microphone active');
    };

    recognition.onaudioend = () => {
      console.log('[Voice] <<< Audio capture ended');
    };

    recognition.onsoundstart = () => {
      console.log('[Voice] Sound detected!');
    };

    recognition.onspeechstart = () => {
      console.log('[Voice] Speech detected!');
    };

    recognitionRef.current = recognition;
    console.log('[Voice] Recognition instance stored in ref');

    return () => {
      console.log('[Voice] Cleanup - stopping recognition');
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      recognition.onaudiostart = null;
      recognition.onaudioend = null;
      recognition.onsoundstart = null;
      recognition.onspeechstart = null;
      try {
        recognition.stop();
      } catch {
        // Already stopped, ignore
      }
    };
    // NOTE: Do NOT include state.isListening - it causes cleanup/reinit when starting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerPhrase, onTrigger]);
  
  const start = useCallback(() => {
    console.log('[Voice] start() called, isSupported:', state.isSupported, 'recognition:', !!recognitionRef.current);
    if (!recognitionRef.current || !state.isSupported) return;

    try {
      recognitionRef.current.start();
      console.log('[Voice] Recognition started successfully');
      setState(prev => ({ ...prev, isListening: true, error: null }));
    } catch (err) {
      console.error('[Voice] Failed to start:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start recognition',
      }));
    }
  }, [state.isSupported]);
  
  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setState(prev => ({ ...prev, isListening: false }));
    } catch {
      // Already stopped, ignore
    }
  }, []);
  
  return { ...state, start, stop };
}
