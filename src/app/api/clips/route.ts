import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, errors, validateBody, getAuthUser } from '@/lib/api-utils';

// Validation schemas
const createClipSchema = z.object({
  streamId: z.string().uuid(),
  timestampMs: z.number().int().min(0),
  label: z.string().max(200).optional(),
  notes: z.string().optional(),
  source: z.enum(['voice', 'hotkey', 'manual', 'api']).default('manual'),
});

// GET /api/clips - List clips (optionally filtered by stream)
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const searchParams = request.nextUrl.searchParams;
  const streamId = searchParams.get('streamId');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  
  // TODO: Replace with actual DB query
  const mockClips = [
    {
      id: 'clip-1',
      streamId: streamId ?? 'stream-1',
      userId: user.id,
      timestampMs: 60000,
      label: 'Funny moment',
      notes: null,
      source: 'voice',
      isProcessed: true,
      createdAt: new Date().toISOString(),
    },
  ];
  
  return success({
    clips: mockClips,
    total: mockClips.length,
    limit,
    offset,
  });
}

// POST /api/clips - Create a new clip
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const validation = await validateBody(request, createClipSchema);
  if (!validation.success) return validation.error;
  
  const { streamId, timestampMs, label, notes, source } = validation.data;
  
  // TODO: Replace with actual DB insert
  const newClip = {
    id: 'clip-' + Date.now(),
    streamId,
    userId: user.id,
    timestampMs,
    label: label ?? null,
    notes: notes ?? null,
    source,
    isProcessed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return success(newClip, 201);
}
