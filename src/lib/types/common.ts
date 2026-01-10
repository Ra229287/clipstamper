import { z } from 'zod';

// Branded types for type safety (H70 pattern)
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type ClipId = Brand<string, 'ClipId'>;
export type StreamId = Brand<string, 'StreamId'>;
export type Timestamp = Brand<number, 'Timestamp'>;

// Factory functions with validation
export function toUserId(id: string): UserId {
  if (!id || id.length === 0) throw new Error('Invalid UserId');
  return id as UserId;
}

export function toClipId(id: string): ClipId {
  if (!id || id.length === 0) throw new Error('Invalid ClipId');
  return id as ClipId;
}

export function toStreamId(id: string): StreamId {
  if (!id || id.length === 0) throw new Error('Invalid StreamId');
  return id as StreamId;
}

export function toTimestamp(ms: number): Timestamp {
  if (ms < 0) throw new Error('Invalid Timestamp');
  return ms as Timestamp;
}

// Result type for error handling (H70 pattern)
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Discriminated union for request states (H70 pattern)
export type RequestState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: number }
  | { status: 'success'; data: T; completedAt: number }
  | { status: 'error'; error: E; failedAt: number };

// Export types
export type { Brand };
