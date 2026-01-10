import { z } from 'zod';

// ============================================================
// OBS WebSocket Types (H70: Branded types for nominal safety)
// ============================================================

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

// Branded types for OBS-specific identifiers
export type SceneName = Brand<string, 'SceneName'>;
export type SourceName = Brand<string, 'SourceName'>;

// ============================================================
// Connection State (H70: Discriminated unions for state)
// ============================================================

export type OBSConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting'; startedAt: number }
  | { status: 'connected'; connectedAt: number; obsVersion: string }
  | { status: 'error'; error: string; occurredAt: number };

// ============================================================
// OBS Configuration Schema (H70: Zod for runtime validation)
// ============================================================

export const OBSConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().int().min(1).max(65535).default(4455),
  password: z.string().optional(),
});

export type OBSConfig = z.infer<typeof OBSConfigSchema>;

// ============================================================
// Stream/Recording Status
// ============================================================

export const StreamStatusSchema = z.object({
  outputActive: z.boolean(),
  outputReconnecting: z.boolean().optional(),
  outputTimecode: z.string(), // HH:MM:SS.mmm format
  outputDuration: z.number(), // milliseconds
  outputBytes: z.number(),
});

export type StreamStatus = z.infer<typeof StreamStatusSchema>;

export const RecordStatusSchema = z.object({
  outputActive: z.boolean(),
  outputPaused: z.boolean().optional(),
  outputTimecode: z.string(),
  outputDuration: z.number(),
  outputBytes: z.number(),
});

export type RecordStatus = z.infer<typeof RecordStatusSchema>;

// ============================================================
// Replay Buffer Status
// ============================================================

export const ReplayBufferStatusSchema = z.object({
  outputActive: z.boolean(),
});

export type ReplayBufferStatus = z.infer<typeof ReplayBufferStatusSchema>;

// ============================================================
// Clip Marker Event (emitted when user says "clip it")
// ============================================================

export const ClipMarkerSchema = z.object({
  timestamp: z.number(), // Stream timestamp in ms
  source: z.enum(['voice', 'hotkey', 'manual']),
  label: z.string().optional(),
  correlationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
});

export type ClipMarker = z.infer<typeof ClipMarkerSchema>;

// ============================================================
// OBS Service Result Type (H70: Error handling pattern)
// ============================================================

export type OBSResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

// ============================================================
// OBS Events (for event listeners)
// ============================================================

export type OBSEventType =
  | 'connected'
  | 'disconnected'
  | 'streamStarted'
  | 'streamStopped'
  | 'recordingStarted'
  | 'recordingStopped'
  | 'replayBufferSaved'
  | 'error';

export interface OBSEvent {
  type: OBSEventType;
  timestamp: number;
  data?: unknown;
}
