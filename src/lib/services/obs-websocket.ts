'use client';

import OBSWebSocket from 'obs-websocket-js';
import type {
  OBSConnectionState,
  OBSConfig,
  OBSResult,
  StreamStatus,
  RecordStatus,
  ReplayBufferStatus,
  ClipMarker,
} from '../types/obs';
import { OBSConfigSchema, ClipMarkerSchema } from '../types/obs';

// ============================================================
// OBS WebSocket Service
// Handles connection to OBS and provides type-safe methods
// ============================================================

type EventCallback = (data: unknown) => void;

class OBSWebSocketService {
  private obs: OBSWebSocket;
  private state: OBSConnectionState = { status: 'disconnected' };
  private config: OBSConfig | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private clipMarkers: ClipMarker[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.obs = new OBSWebSocket();
    this.setupEventHandlers();
  }

  // ============================================================
  // Connection Management
  // ============================================================

  async connect(config: Partial<OBSConfig> = {}): Promise<OBSResult<void>> {
    // Validate config with Zod (H70: Runtime validation)
    const parsed = OBSConfigSchema.safeParse(config);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.message, code: 'VALIDATION_ERROR' };
    }

    this.config = parsed.data;
    this.state = { status: 'connecting', startedAt: Date.now() };
    this.emit('stateChange', this.state);

    try {
      const url = `ws://${this.config.host}:${this.config.port}`;
      const result = await this.obs.connect(url, this.config.password);

      this.state = {
        status: 'connected',
        connectedAt: Date.now(),
        obsVersion: result.obsWebSocketVersion ?? 'unknown',
      };
      this.reconnectAttempts = 0;
      this.emit('stateChange', this.state);
      this.emit('connected', { obsVersion: this.state.obsVersion });

      return { ok: true, data: undefined };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      this.state = { status: 'error', error: errorMessage, occurredAt: Date.now() };
      this.emit('stateChange', this.state);
      this.emit('error', { error: errorMessage });

      return { ok: false, error: errorMessage, code: 'CONNECTION_ERROR' };
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    await this.obs.disconnect();
    this.state = { status: 'disconnected' };
    this.emit('stateChange', this.state);
    this.emit('disconnected', {});
  }

  getState(): OBSConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state.status === 'connected';
  }

  // ============================================================
  // Stream Information
  // ============================================================

  async getStreamStatus(): Promise<OBSResult<StreamStatus>> {
    if (!this.isConnected()) {
      return { ok: false, error: 'Not connected to OBS', code: 'NOT_CONNECTED' };
    }

    try {
      const response = await this.obs.call('GetStreamStatus');
      return {
        ok: true,
        data: {
          outputActive: response.outputActive,
          outputReconnecting: response.outputReconnecting,
          outputTimecode: response.outputTimecode,
          outputDuration: response.outputDuration,
          outputBytes: response.outputBytes,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to get stream status',
      };
    }
  }

  async getRecordStatus(): Promise<OBSResult<RecordStatus>> {
    if (!this.isConnected()) {
      return { ok: false, error: 'Not connected to OBS', code: 'NOT_CONNECTED' };
    }

    try {
      const response = await this.obs.call('GetRecordStatus');
      return {
        ok: true,
        data: {
          outputActive: response.outputActive,
          outputPaused: response.outputPaused,
          outputTimecode: response.outputTimecode,
          outputDuration: response.outputDuration,
          outputBytes: response.outputBytes,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to get record status',
      };
    }
  }

  // ============================================================
  // Replay Buffer (The Magic for Instant Clips!)
  // ============================================================

  async getReplayBufferStatus(): Promise<OBSResult<ReplayBufferStatus>> {
    if (!this.isConnected()) {
      return { ok: false, error: 'Not connected to OBS', code: 'NOT_CONNECTED' };
    }

    try {
      const response = await this.obs.call('GetReplayBufferStatus');
      return {
        ok: true,
        data: { outputActive: response.outputActive },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to get replay buffer status',
      };
    }
  }

  async startReplayBuffer(): Promise<OBSResult<void>> {
    if (!this.isConnected()) {
      return { ok: false, error: 'Not connected to OBS', code: 'NOT_CONNECTED' };
    }

    try {
      await this.obs.call('StartReplayBuffer');
      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to start replay buffer',
      };
    }
  }

  async stopReplayBuffer(): Promise<OBSResult<void>> {
    if (!this.isConnected()) {
      return { ok: false, error: 'Not connected to OBS', code: 'NOT_CONNECTED' };
    }

    try {
      await this.obs.call('StopReplayBuffer');
      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to stop replay buffer',
      };
    }
  }

  async saveReplayBuffer(): Promise<OBSResult<string>> {
    if (!this.isConnected()) {
      return { ok: false, error: 'Not connected to OBS', code: 'NOT_CONNECTED' };
    }

    try {
      await this.obs.call('SaveReplayBuffer');
      // OBS emits ReplayBufferSaved event with the path
      return { ok: true, data: 'Replay buffer save triggered' };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to save replay buffer',
      };
    }
  }

  // ============================================================
  // Clip Marking - The Core Feature!
  // ============================================================

  async createClipMarker(
    source: 'voice' | 'hotkey' | 'manual',
    label?: string
  ): Promise<OBSResult<ClipMarker>> {
    // Get current stream/record timestamp - use the LONGER duration
    // (same logic as display, in case recording started before streaming)
    let timestamp = 0;

    const streamStatus = await this.getStreamStatus();
    const recordStatus = await this.getRecordStatus();

    if (streamStatus.ok && streamStatus.data.outputActive) {
      timestamp = streamStatus.data.outputDuration;
    }

    if (recordStatus.ok && recordStatus.data.outputActive) {
      // Use recording duration if it's longer
      if (recordStatus.data.outputDuration > timestamp) {
        timestamp = recordStatus.data.outputDuration;
      }
    }

    console.log('[OBS] Creating clip marker at timestamp:', timestamp, 'ms =', Math.floor(timestamp / 1000 / 60), 'min');

    // Create clip marker with correlation ID (H70: Event tracing)
    const marker: ClipMarker = {
      timestamp,
      source,
      label,
      correlationId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };

    // Validate with Zod (H70: Runtime validation)
    const parsed = ClipMarkerSchema.safeParse(marker);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid clip marker data', code: 'VALIDATION_ERROR' };
    }

    // Store marker
    this.clipMarkers.push(parsed.data);

    // Try to save replay buffer if active
    const replayStatus = await this.getReplayBufferStatus();
    if (replayStatus.ok && replayStatus.data.outputActive) {
      await this.saveReplayBuffer();
    }

    // Emit event
    this.emit('clipMarkerCreated', parsed.data);

    return { ok: true, data: parsed.data };
  }

  getClipMarkers(): ClipMarker[] {
    return [...this.clipMarkers];
  }

  clearClipMarkers(): void {
    this.clipMarkers = [];
    this.emit('clipMarkersCleared', {});
  }

  // ============================================================
  // Event Handling
  // ============================================================

  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err);
      }
    });
  }

  private setupEventHandlers(): void {
    // Connection events
    this.obs.on('ConnectionClosed', () => {
      if (this.state.status === 'connected') {
        this.state = { status: 'disconnected' };
        this.emit('stateChange', this.state);
        this.emit('disconnected', {});
        this.attemptReconnect();
      }
    });

    this.obs.on('ConnectionError', (err) => {
      this.state = {
        status: 'error',
        error: err.message ?? 'Connection error',
        occurredAt: Date.now(),
      };
      this.emit('stateChange', this.state);
      this.emit('error', { error: this.state.error });
    });

    // Stream events
    this.obs.on('StreamStateChanged', (data) => {
      if (data.outputActive) {
        this.emit('streamStarted', data);
      } else {
        this.emit('streamStopped', data);
      }
    });

    // Recording events
    this.obs.on('RecordStateChanged', (data) => {
      if (data.outputActive) {
        this.emit('recordingStarted', data);
      } else {
        this.emit('recordingStopped', data);
      }
    });

    // Replay buffer events
    this.obs.on('ReplayBufferSaved', (data) => {
      this.emit('replayBufferSaved', data);
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    if (!this.config) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.config) {
        this.connect(this.config);
      }
    }, delay);
  }
}

// Singleton instance
export const obsService = new OBSWebSocketService();

// React hook for OBS connection state
export function useOBSConnection() {
  // This will be implemented as a proper React hook
  return obsService;
}
