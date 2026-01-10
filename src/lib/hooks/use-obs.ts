'use client';

import { useState, useEffect, useCallback } from 'react';
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
      })
    );

    unsubscribers.push(
      obsService.on('streamStopped', () => {
        setIsStreaming(false);
        setStreamDuration(null);
      })
    );

    // Recording events
    unsubscribers.push(
      obsService.on('recordingStarted', () => {
        setIsRecording(true);
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
  useEffect(() => {
    if (!isStreaming && !isRecording) return;

    const interval = setInterval(async () => {
      if (isStreaming) {
        const status = await obsService.getStreamStatus();
        if (status.ok) {
          setStreamDuration(status.data.outputDuration);
        }
      } else if (isRecording) {
        const status = await obsService.getRecordStatus();
        if (status.ok) {
          setStreamDuration(status.data.outputDuration);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isRecording]);

  // Check initial stream/record/replay status on connect
  useEffect(() => {
    if (state.status !== 'connected') return;

    const checkStatus = async () => {
      const streamStatus = await obsService.getStreamStatus();
      if (streamStatus.ok) {
        setIsStreaming(streamStatus.data.outputActive);
        if (streamStatus.data.outputActive) {
          setStreamDuration(streamStatus.data.outputDuration);
        }
      }

      const recordStatus = await obsService.getRecordStatus();
      if (recordStatus.ok) {
        setIsRecording(recordStatus.data.outputActive);
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
    clipMarkers,
    createClipMarker,
    clearClipMarkers,
    isReplayBufferActive,
    startReplayBuffer,
    stopReplayBuffer,
    saveReplayBuffer,
  };
}
