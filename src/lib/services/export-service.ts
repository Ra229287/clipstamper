import type { ExportFormat } from '../types';

interface Clip {
  timestampMs: number;
  label?: string | null;
  notes?: string | null;
}

interface Stream {
  title: string;
  platform?: string;
  startedAt?: string;
}

interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

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

export function generateExport(
  format: ExportFormat,
  stream: Stream,
  clips: Clip[]
): ExportResult {
  const sortedClips = [...clips].sort((a, b) => a.timestampMs - b.timestampMs);
  const date = new Date().toISOString().split('T')[0] ?? '';
  const safeTitle = stream.title.replace(/[^a-z0-9]/gi, '_');
  
  switch (format) {
    case 'youtube_chapters': {
      const lines = ['0:00 Start'];
      for (const c of sortedClips) {
        lines.push(formatTimestamp(c.timestampMs) + ' ' + (c.label ?? 'Clip'));
      }
      return {
        content: lines.join('\n'),
        filename: safeTitle + '_chapters.txt',
        mimeType: 'text/plain',
      };
    }
    
    case 'obsidian_markdown': {
      const frontmatter = [
        '---',
        'title: "' + stream.title + '"',
        'date: ' + date,
        'platform: ' + (stream.platform ?? 'unknown'),
        'type: stream-clips',
        'tags: [clips, stream]',
        '---',
        '',
        '# ' + stream.title,
        '',
        '## Clips',
        '',
      ].join('\n');
      
      const clipLines: string[] = [];
      for (const c of sortedClips) {
        let line = '- **' + formatTimestamp(c.timestampMs) + '** - ';
        line += c.label ?? 'Clip';
        if (c.notes) {
          line += '\n  - ' + c.notes;
        }
        clipLines.push(line);
      }
      
      return {
        content: frontmatter + clipLines.join('\n'),
        filename: date + '_' + safeTitle + '.md',
        mimeType: 'text/markdown',
      };
    }
    
    case 'json': {
      const data = {
        stream: {
          title: stream.title,
          platform: stream.platform ?? null,
          startedAt: stream.startedAt ?? null,
          exportedAt: new Date().toISOString(),
        },
        clips: sortedClips.map(c => ({
          timestamp: formatTimestamp(c.timestampMs),
          timestampMs: c.timestampMs,
          label: c.label ?? null,
          notes: c.notes ?? null,
        })),
      };
      return {
        content: JSON.stringify(data, null, 2),
        filename: safeTitle + '_clips.json',
        mimeType: 'application/json',
      };
    }
    
    case 'plain_text':
    default: {
      const header = 'Stream: ' + stream.title + '\nDate: ' + date + '\n\n';
      const clipLines: string[] = [];
      for (const c of sortedClips) {
        clipLines.push(formatTimestamp(c.timestampMs) + ' - ' + (c.label ?? 'Clip'));
      }
      return {
        content: header + clipLines.join('\n'),
        filename: safeTitle + '_clips.txt',
        mimeType: 'text/plain',
      };
    }
  }
}

export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
