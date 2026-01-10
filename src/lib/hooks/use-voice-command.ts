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
  
  // Update ref when enabled changes
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }
    
    setState(prev => ({ ...prev, isSupported: true }));
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const transcript = results
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .toLowerCase();
      
      setState(prev => ({ ...prev, lastTranscript: transcript }));
      
      // Check for trigger phrase
      if (transcript.includes(triggerPhrase.toLowerCase()) && isEnabledRef.current) {
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
      // Auto-restart if still enabled
      if (isEnabledRef.current && state.isListening) {
        try {
          recognition.start();
        } catch {
          // Already started, ignore
        }
      } else {
        setState(prev => ({ ...prev, isListening: false }));
      }
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Already stopped, ignore
      }
    };
  }, [triggerPhrase, onTrigger, state.isListening]);
  
  const start = useCallback(() => {
    if (!recognitionRef.current || !state.isSupported) return;
    
    try {
      recognitionRef.current.start();
      setState(prev => ({ ...prev, isListening: true, error: null }));
    } catch (err) {
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
