import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, errors, validateBody, getAuthUser } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ streamId: string }>;
}

// Validation schemas
const updateStreamSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  isLive: z.boolean().optional(),
});

// GET /api/streams/[streamId] - Get a specific stream
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const { streamId } = await params;
  
  // TODO: Replace with actual DB query
  const mockStream = {
    id: streamId,
    userId: user.id,
    title: 'Demo Stream',
    platform: 'twitch',
    isLive: false,
    startedAt: new Date().toISOString(),
    endedAt: null,
    clips: [
      { id: 'clip-1', timestampMs: 60000, label: 'Funny moment', source: 'voice' },
      { id: 'clip-2', timestampMs: 180000, label: 'Epic play', source: 'hotkey' },
    ],
  };
  
  return success(mockStream);
}

// PATCH /api/streams/[streamId] - Update a stream
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const { streamId } = await params;
  
  const validation = await validateBody(request, updateStreamSchema);
  if (!validation.success) return validation.error;
  
  // TODO: Replace with actual DB update
  const updatedStream = {
    id: streamId,
    ...validation.data,
    updatedAt: new Date().toISOString(),
  };
  
  return success(updatedStream);
}

// DELETE /api/streams/[streamId] - Delete a stream
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const { streamId } = await params;
  
  // TODO: Replace with actual DB delete
  console.log('Deleting stream:', streamId);
  
  return success({ deleted: true });
}
