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
  lastHeardAt: number | null; // Track when we last heard something
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
  abort: () => void;
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
}: UseVoiceCommandOptions): VoiceCommandState & {
  start: () => void;
  stop: () => void;
  restart: () => void;
} {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    isSupported: false,
    error: null,
    lastTranscript: '',
    lastHeardAt: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isEnabledRef = useRef(enabled);
  const isListeningRef = useRef(false);
  const lastTriggerTimeRef = useRef<number>(0);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartAttemptsRef = useRef(0);
  const maxRestartAttempts = 5;
  const COOLDOWN_MS = 3000; // 3 second cooldown between triggers
  const WATCHDOG_INTERVAL = 5000; // Check every 5 seconds
  const SILENCE_TIMEOUT = 30000; // Restart if no audio for 30 seconds

  // Update refs when values change
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isListeningRef.current = state.isListening;
  }, [state.isListening]);

  // Create recognition instance
  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    return recognition;
  }, []);

  // Setup recognition handlers
  const setupRecognition = useCallback((recognition: SpeechRecognition) => {
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const transcript = results
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .toLowerCase();

      const now = Date.now();
      setState(prev => ({ ...prev, lastTranscript: transcript, lastHeardAt: now }));

      // Check for trigger phrase with cooldown
      const phraseFound = transcript.includes(triggerPhrase.toLowerCase());
      const timeSinceLastTrigger = now - lastTriggerTimeRef.current;
      const cooldownActive = timeSinceLastTrigger < COOLDOWN_MS;

      if (phraseFound && isEnabledRef.current && !cooldownActive) {
        console.log('[Voice] CLIP IT detected - triggering!');
        lastTriggerTimeRef.current = now;
        onTrigger();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('[Voice] Error:', event.error);

      // Handle different error types
      if (event.error === 'not-allowed') {
        setState(prev => ({
          ...prev,
          error: 'Microphone access denied. Please allow microphone permission.',
          isListening: false,
        }));
      } else if (event.error === 'no-speech') {
        // This is normal - just means silence, don't show error
        console.log('[Voice] No speech detected, continuing...');
      } else if (event.error === 'network') {
        setState(prev => ({
          ...prev,
          error: 'Network error. Speech recognition requires internet.',
        }));
      } else if (event.error === 'aborted') {
        // User or system aborted, this is fine
        console.log('[Voice] Recognition aborted');
      } else {
        setState(prev => ({
          ...prev,
          error: `Speech error: ${event.error}`,
        }));
      }
    };

    recognition.onend = () => {
      console.log('[Voice] Recognition ended');

      // Auto-restart if we should still be listening
      if (isListeningRef.current && isEnabledRef.current) {
        if (restartAttemptsRef.current < maxRestartAttempts) {
          restartAttemptsRef.current++;
          console.log('[Voice] Auto-restarting... (attempt', restartAttemptsRef.current, ')');

          // Small delay before restart to avoid rapid cycling
          setTimeout(() => {
            try {
              recognition.start();
              restartAttemptsRef.current = 0; // Reset on successful start
            } catch (e) {
              console.log('[Voice] Restart failed:', e);
            }
          }, 100);
        } else {
          console.log('[Voice] Max restart attempts reached, stopping');
          setState(prev => ({
            ...prev,
            isListening: false,
            error: 'Voice recognition stopped. Click "Start Listening" to try again.',
          }));
          restartAttemptsRef.current = 0;
        }
      } else {
        setState(prev => ({ ...prev, isListening: false }));
      }
    };

    recognition.onstart = () => {
      console.log('[Voice] Recognition started');
      restartAttemptsRef.current = 0;
      setState(prev => ({ ...prev, error: null }));
    };

    recognition.onaudiostart = () => {
      setState(prev => ({ ...prev, lastHeardAt: Date.now() }));
    };

    return recognition;
  }, [triggerPhrase, onTrigger, COOLDOWN_MS]);

  // Initialize speech recognition
  useEffect(() => {
    const recognition = createRecognition();

    if (!recognition) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));
    setupRecognition(recognition);
    recognitionRef.current = recognition;

    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
      }
      try {
        recognition.abort();
      } catch {
        // Ignore
      }
    };
  }, [createRecognition, setupRecognition]);

  // Watchdog timer - detect silent failures and restart
  useEffect(() => {
    if (!state.isListening) {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      return;
    }

    watchdogRef.current = setInterval(() => {
      const now = Date.now();
      const lastHeard = state.lastHeardAt ?? now;
      const silenceDuration = now - lastHeard;

      // If we haven't heard anything for a while, recognition might have silently died
      if (silenceDuration > SILENCE_TIMEOUT && isListeningRef.current) {
        console.log('[Voice] Watchdog: No audio for', Math.round(silenceDuration / 1000), 's - restarting');

        // Force restart
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // Ignore
          }

          setTimeout(() => {
            try {
              recognitionRef.current?.start();
              setState(prev => ({ ...prev, lastHeardAt: Date.now() }));
            } catch (e) {
              console.log('[Voice] Watchdog restart failed:', e);
            }
          }, 200);
        }
      }
    }, WATCHDOG_INTERVAL);

    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [state.isListening, state.lastHeardAt, SILENCE_TIMEOUT, WATCHDOG_INTERVAL]);

  const start = useCallback(() => {
    if (!recognitionRef.current || !state.isSupported) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    try {
      recognitionRef.current.start();
      restartAttemptsRef.current = 0;
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        lastHeardAt: Date.now(),
      }));
    } catch (err) {
      // Might already be started
      if (err instanceof Error && err.message.includes('already started')) {
        setState(prev => ({ ...prev, isListening: true }));
      } else {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to start',
        }));
      }
    }
  }, [state.isSupported]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.abort();
      setState(prev => ({ ...prev, isListening: false, lastHeardAt: null }));
    } catch {
      // Ignore
    }
  }, []);

  const restart = useCallback(() => {
    console.log('[Voice] Manual restart requested');
    stop();

    // Recreate recognition instance for clean slate
    const newRecognition = createRecognition();
    if (newRecognition) {
      setupRecognition(newRecognition);
      recognitionRef.current = newRecognition;

      setTimeout(() => {
        start();
      }, 200);
    }
  }, [stop, start, createRecognition, setupRecognition]);

  return { ...state, start, stop, restart };
}
