import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, errors, validateBody, getAuthUser } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ clipId: string }>;
}

// Validation schemas
const updateClipSchema = z.object({
  label: z.string().max(200).optional(),
  notes: z.string().optional(),
  timestampMs: z.number().int().min(0).optional(),
});

// GET /api/clips/[clipId] - Get a specific clip
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const { clipId } = await params;
  
  // TODO: Replace with actual DB query
  const mockClip = {
    id: clipId,
    streamId: 'stream-1',
    userId: user.id,
    timestampMs: 60000,
    label: 'Funny moment',
    notes: null,
    source: 'voice',
    isProcessed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stream: {
      id: 'stream-1',
      title: 'Demo Stream',
      platform: 'twitch',
    },
  };
  
  return success(mockClip);
}

// PATCH /api/clips/[clipId] - Update a clip
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const { clipId } = await params;
  
  const validation = await validateBody(request, updateClipSchema);
  if (!validation.success) return validation.error;
  
  // TODO: Replace with actual DB update
  const updatedClip = {
    id: clipId,
    ...validation.data,
    updatedAt: new Date().toISOString(),
  };
  
  return success(updatedClip);
}

// DELETE /api/clips/[clipId] - Delete a clip
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const { clipId } = await params;
  
  // TODO: Replace with actual DB delete
  console.log('Deleting clip:', clipId);
  
  return success({ deleted: true });
}
