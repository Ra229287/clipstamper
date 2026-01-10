import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, errors, validateBody, getAuthUser } from '@/lib/api-utils';

// Validation schemas
const createExportSchema = z.object({
  streamId: z.string().uuid(),
  format: z.enum(['plain_text', 'youtube_chapters', 'obsidian_markdown', 'json']),
});

// Helper to format timestamp
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return hours + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
  }
  return minutes + ':' + seconds.toString().padStart(2, '0');
}

// Mock clips for demo
interface MockClip {
  timestampMs: number;
  label: string | null;
  notes: string | null;
}

// Generate export content based on format
function generateExport(
  format: string, 
  streamTitle: string, 
  clips: MockClip[]
): { content: string; filename: string; mimeType: string } {
  const sortedClips = [...clips].sort((a, b) => a.timestampMs - b.timestampMs);
  const date = new Date().toISOString().split('T')[0];
  
  switch (format) {
    case 'youtube_chapters': {
      const content = sortedClips
        .map(c => formatTimestamp(c.timestampMs) + ' ' + (c.label ?? 'Clip'))
        .join('\n');
      return {
        content: '0:00 Start\n' + content,
        filename: streamTitle.replace(/[^a-z0-9]/gi, '_') + '_chapters.txt',
        mimeType: 'text/plain',
      };
    }
    
    case 'obsidian_markdown': {
      const frontmatter = [
        '---',
        'title: "' + streamTitle + '"',
        'date: ' + date,
        'type: stream-clips',
        'tags: [clips, stream]',
        '---',
        '',
      ].join('\n');
      
      const content = sortedClips
        .map(c => {
          let line = '- [[' + formatTimestamp(c.timestampMs) + ']] ';
          line += c.label ?? 'Clip';
          if (c.notes) {
            line += '\n  - ' + c.notes;
          }
          return line;
        })
        .join('\n');
      
      return {
        content: frontmatter + '# Clips\n\n' + content,
        filename: date + '_' + streamTitle.replace(/[^a-z0-9]/gi, '_') + '.md',
        mimeType: 'text/markdown',
      };
    }
    
    case 'json': {
      const data = {
        stream: { title: streamTitle, exportedAt: new Date().toISOString() },
        clips: sortedClips.map(c => ({
          timestamp: formatTimestamp(c.timestampMs),
          timestampMs: c.timestampMs,
          label: c.label,
          notes: c.notes,
        })),
      };
      return {
        content: JSON.stringify(data, null, 2),
        filename: streamTitle.replace(/[^a-z0-9]/gi, '_') + '_clips.json',
        mimeType: 'application/json',
      };
    }
    
    case 'plain_text':
    default: {
      const content = sortedClips
        .map(c => formatTimestamp(c.timestampMs) + ' - ' + (c.label ?? 'Clip'))
        .join('\n');
      return {
        content: 'Stream: ' + streamTitle + '\nDate: ' + date + '\n\n' + content,
        filename: streamTitle.replace(/[^a-z0-9]/gi, '_') + '_clips.txt',
        mimeType: 'text/plain',
      };
    }
  }
}

// GET /api/exports - List user exports
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const searchParams = request.nextUrl.searchParams;
  const streamId = searchParams.get('streamId');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  
  // TODO: Replace with actual DB query
  const mockExports = [
    {
      id: 'export-1',
      streamId: streamId ?? 'stream-1',
      userId: user.id,
      format: 'youtube_chapters',
      filename: 'demo_stream_chapters.txt',
      createdAt: new Date().toISOString(),
    },
  ];
  
  return success({
    exports: mockExports,
    total: mockExports.length,
    limit,
  });
}

// POST /api/exports - Create a new export
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return errors.unauthorized();
  
  const validation = await validateBody(request, createExportSchema);
  if (!validation.success) return validation.error;
  
  const { streamId, format } = validation.data;
  
  // TODO: Replace with actual DB query to get stream and clips
  const mockStream = { title: 'Demo Stream' };
  const mockClips: MockClip[] = [
    { timestampMs: 60000, label: 'Funny moment', notes: null },
    { timestampMs: 180000, label: 'Epic play', notes: 'Worth clipping!' },
    { timestampMs: 300000, label: 'Highlight', notes: null },
  ];
  
  const { content, filename, mimeType } = generateExport(format, mockStream.title, mockClips);
  
  // TODO: Save export to database
  const newExport = {
    id: 'export-' + Date.now(),
    streamId,
    userId: user.id,
    format,
    filename,
    content,
    mimeType,
    createdAt: new Date().toISOString(),
  };
  
  return success(newExport, 201);
}
