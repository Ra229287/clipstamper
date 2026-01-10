import { z } from 'zod';
import type { ClipId, StreamId, UserId, Timestamp } from './common';
import { toClipId, toStreamId, toUserId, toTimestamp } from './common';

// Clip schema with Zod validation
export const ClipSchema = z.object({
  id: z.string().transform(toClipId),
  streamId: z.string().transform(toStreamId),
  userId: z.string().transform(toUserId),
  timestamp: z.number().transform(toTimestamp),
  label: z.string().min(1).max(200).optional(),
  source: z.enum(['voice', 'hotkey', 'manual', 'api']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Clip = z.infer<typeof ClipSchema>;

// Clip creation input (without generated fields)
export const CreateClipSchema = ClipSchema.pick({
  streamId: true,
  timestamp: true,
  label: true,
  source: true,
});

export type CreateClipInput = z.input<typeof CreateClipSchema>;

// Stream schema
export const StreamSchema = z.object({
  id: z.string().transform(toStreamId),
  userId: z.string().transform(toUserId),
  platform: z.enum(['twitch', 'youtube', 'x', 'other']),
  title: z.string().min(1).max(500),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  clipCount: z.number().int().min(0).default(0),
});

export type Stream = z.infer<typeof StreamSchema>;

// Export format options
export const ExportFormatSchema = z.enum([
  'plain_text',
  'youtube_chapters',
  'obsidian_markdown',
  'json',
]);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// Export result
export const ExportResultSchema = z.object({
  format: ExportFormatSchema,
  content: z.string(),
  filename: z.string(),
  mimeType: z.string(),
});

export type ExportResult = z.infer<typeof ExportResultSchema>;
