'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { obsService } from '../services/obs-websocket';
import type { OBSConnectionState, OBSConfig, ClipMarker } from '../types/obs';

interface UseOBSReturn {
  // Connection state
  state: OBSConnectionState;
  isConnected: boolean;

  // Connection actions
  connect: (config?: Partial<OBSConfig>) => Promise<boolean>;
  disconnect: () => Promise<void>;

  // Stream info
  streamDuration: number | null;
  isStreaming: boolean;
  isRecording: boolean;

  // Manual stream start override (when OBS reconnected and lost time)
  setManualStartTime: (startTime: Date) => void;
  hasManualOverride: boolean;
  clearManualOverride: () => void;

  // Clip markers
  clipMarkers: ClipMarker[];
  createClipMarker: (source: 'voice' | 'hotkey' | 'manual', label?: string) => Promise<boolean>;
  clearClipMarkers: () => void;

  // Replay buffer
  isReplayBufferActive: boolean;
  startReplayBuffer: () => Promise<boolean>;
  stopReplayBuffer: () => Promise<boolean>;
  saveReplayBuffer: () => Promise<boolean>;
}

export function useOBS(): UseOBSReturn {
  const [state, setState] = useState<OBSConnectionState>({ status: 'disconnected' });
  const [clipMarkers, setClipMarkers] = useState<ClipMarker[]>([]);
  const [streamDuration, setStreamDuration] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplayBufferActive, setIsReplayBufferActive] = useState(false);

  // Track stream start time and max duration seen (to handle OBS reconnects)
  const streamStartRef = useRef<number | null>(null);
  const maxDurationSeenRef = useRef<number>(0);

  // Manual override for when OBS lost time due to reconnect
  const [manualStartTime, setManualStartTimeState] = useState<number | null>(null);
  const hasManualOverride = manualStartTime !== null;

  // Subscribe to OBS events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // State changes
    unsubscribers.push(
      obsService.on('stateChange', (data) => {
        setState(data as OBSConnectionState);
      })
    );

    // Clip markers
    unsubscribers.push(
      obsService.on('clipMarkerCreated', (data) => {
        setClipMarkers((prev) => [...prev, data as ClipMarker]);
      })
    );

    unsubscribers.push(
      obsService.on('clipMarkersCleared', () => {
        setClipMarkers([]);
      })
    );

    // Stream events
    unsubscribers.push(
      obsService.on('streamStarted', () => {
        setIsStreaming(true);
        // Reset tracking for new stream
        streamStartRef.current = Date.now();
        maxDurationSeenRef.current = 0;
      })
    );

    unsubscribers.push(
      obsService.on('streamStopped', () => {
        setIsStreaming(false);
        setStreamDuration(null);
        streamStartRef.current = null;
        maxDurationSeenRef.current = 0;
      })
    );

    // Recording events
    unsubscribers.push(
      obsService.on('recordingStarted', () => {
        setIsRecording(true);
        // Reset tracking for new recording if not streaming
        if (!streamStartRef.current) {
          streamStartRef.current = Date.now();
          maxDurationSeenRef.current = 0;
        }
      })
    );

    unsubscribers.push(
      obsService.on('recordingStopped', () => {
        setIsRecording(false);
      })
    );

    // Initialize state
    setState(obsService.getState());
    setClipMarkers(obsService.getClipMarkers());

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Poll stream duration when streaming
  // Handles OBS reconnects by tracking max duration seen
  // Also supports manual override when OBS lost time before we connected
  useEffect(() => {
    if (!isStreaming && !isRecording) return;

    const interval = setInterval(async () => {
      // If manual override is set, always use that
      if (manualStartTime !== null) {
        const manualDuration = Date.now() - manualStartTime;
        setStreamDuration(manualDuration);
        return;
      }

      // Get BOTH stream and record status, use the longer one
      let obsDuration = 0;

      if (isStreaming) {
        const status = await obsService.getStreamStatus();
        if (status.ok && status.data.outputActive) {
          obsDuration = status.data.outputDuration;
        }
      }

      if (isRecording) {
        const status = await obsService.getRecordStatus();
        if (status.ok && status.data.outputActive) {
          // Use recording duration if it's longer
          if (status.data.outputDuration > obsDuration) {
            obsDuration = status.data.outputDuration;
          }
        }
      }

      // If OBS duration dropped (reconnect happened), use our local tracking
      // OBS resets outputDuration when it reconnects to streaming service
      if (obsDuration < maxDurationSeenRef.current && streamStartRef.current) {
        // OBS reconnected - calculate duration from when we first saw the stream
        // Add what we had before the reconnect + current OBS duration
        const localDuration = Date.now() - streamStartRef.current;
        setStreamDuration(localDuration);
      } else {
        // Normal case - use OBS duration and track max seen
        maxDurationSeenRef.current = Math.max(maxDurationSeenRef.current, obsDuration);
        setStreamDuration(obsDuration);

        // If we don't have a start time yet, calculate it from OBS duration
        if (!streamStartRef.current && obsDuration > 0) {
          streamStartRef.current = Date.now() - obsDuration;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isRecording, manualStartTime]);

  // Check initial stream/record/replay status on connect
  useEffect(() => {
    if (state.status !== 'connected') return;

    const checkStatus = async () => {
      const streamStatus = await obsService.getStreamStatus();
      const recordStatus = await obsService.getRecordStatus();

      console.log('[OBS Debug] ===== STATUS CHECK =====');
      console.log('[OBS Debug] Stream status:', streamStatus);
      console.log('[OBS Debug] Record status:', recordStatus);

      if (streamStatus.ok) {
        console.log('[OBS Debug] Stream active:', streamStatus.data.outputActive);
        console.log('[OBS Debug] Stream duration:', streamStatus.data.outputDuration, 'ms =', Math.floor(streamStatus.data.outputDuration / 1000 / 60), 'min');
        console.log('[OBS Debug] Stream timecode:', streamStatus.data.outputTimecode);
        setIsStreaming(streamStatus.data.outputActive);
      }

      if (recordStatus.ok) {
        console.log('[OBS Debug] Record active:', recordStatus.data.outputActive);
        console.log('[OBS Debug] Record duration:', recordStatus.data.outputDuration, 'ms =', Math.floor(recordStatus.data.outputDuration / 1000 / 60), 'min');
        console.log('[OBS Debug] Record timecode:', recordStatus.data.outputTimecode);
        setIsRecording(recordStatus.data.outputActive);
      }

      // Use the LONGER duration (in case one started before the other)
      let bestDuration = 0;
      let durationSource = 'none';

      if (streamStatus.ok && streamStatus.data.outputActive) {
        bestDuration = streamStatus.data.outputDuration;
        durationSource = 'stream';
      }

      if (recordStatus.ok && recordStatus.data.outputActive) {
        if (recordStatus.data.outputDuration > bestDuration) {
          bestDuration = recordStatus.data.outputDuration;
          durationSource = 'record';
        }
      }

      console.log('[OBS Debug] Using duration from:', durationSource, '=', bestDuration, 'ms =', Math.floor(bestDuration / 1000 / 60), 'min');

      if (bestDuration > 0) {
        setStreamDuration(bestDuration);
        streamStartRef.current = Date.now() - bestDuration;
        maxDurationSeenRef.current = bestDuration;
      }

      const replayStatus = await obsService.getReplayBufferStatus();
      if (replayStatus.ok) {
        setIsReplayBufferActive(replayStatus.data.outputActive);
      }
    };

    checkStatus();
  }, [state.status]);

  const connect = useCallback(async (config?: Partial<OBSConfig>): Promise<boolean> => {
    const result = await obsService.connect(config);
    return result.ok;
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    await obsService.disconnect();
  }, []);

  const createClipMarker = useCallback(
    async (source: 'voice' | 'hotkey' | 'manual', label?: string): Promise<boolean> => {
      const result = await obsService.createClipMarker(source, label);
      return result.ok;
    },
    []
  );

  const clearClipMarkers = useCallback(() => {
    obsService.clearClipMarkers();
  }, []);

  // Manual start time override functions
  const setManualStartTime = useCallback((startTime: Date) => {
    setManualStartTimeState(startTime.getTime());
    console.log('[OBS] Manual start time set to:', startTime.toLocaleTimeString());
  }, []);

  const clearManualOverride = useCallback(() => {
    setManualStartTimeState(null);
    console.log('[OBS] Manual override cleared, using OBS duration');
  }, []);

  const startReplayBuffer = useCallback(async (): Promise<boolean> => {
    const result = await obsService.startReplayBuffer();
    if (result.ok) {
      setIsReplayBufferActive(true);
    }
    return result.ok;
  }, []);

  const stopReplayBuffer = useCallback(async (): Promise<boolean> => {
    const result = await obsService.stopReplayBuffer();
    if (result.ok) {
      setIsReplayBufferActive(false);
    }
    return result.ok;
  }, []);

  const saveReplayBuffer = useCallback(async (): Promise<boolean> => {
    const result = await obsService.saveReplayBuffer();
    return result.ok;
  }, []);

  return {
    state,
    isConnected: state.status === 'connected',
    connect,
    disconnect,
    streamDuration,
    isStreaming,
    isRecording,
    setManualStartTime,
    hasManualOverride,
    clearManualOverride,
    clipMarkers,
    createClipMarker,
    clearClipMarkers,
    isReplayBufferActive,
    startReplayBuffer,
    stopReplayBuffer,
    saveReplayBuffer,
  };
}
