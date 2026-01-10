import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, errors, validateBody, getAuthUser } from '@/lib/api-utils';

// Validation schemas
const createStreamSchema = z.object({
  title: z.string().min(1).max(500),
  platform: z.enum(['twitch', 'youtube', 'x', 'other']).default('other'),
  description: z.string().optional(),
  externalId: z.string().optional(),
});

// GET /api/streams - List user streams
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  
  // TODO: Replace with actual DB query when DATABASE_URL is configured
  // For now, return mock data for development
  const mockStreams = [
    {
      id: 'stream-1',
      userId: user.id,
      title: 'Demo Stream',
      platform: 'twitch' as const,
      isLive: false,
      startedAt: new Date().toISOString(),
      endedAt: null,
      clipCount: 5,
    },
  ];
  
  return success({
    streams: mockStreams,
    total: mockStreams.length,
    limit,
    offset,
  });
}

// POST /api/streams - Create a new stream
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const validation = await validateBody(request, createStreamSchema);
  if (!validation.success) return validation.error;
  
  const { title, platform, description, externalId } = validation.data;
  
  // TODO: Replace with actual DB insert when DATABASE_URL is configured
  const newStream = {
    id: 'stream-' + Date.now(),
    userId: user.id,
    title,
    platform,
    description: description ?? null,
    externalId: externalId ?? null,
    isLive: true,
    startedAt: new Date().toISOString(),
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return success(newStream, 201);
}
