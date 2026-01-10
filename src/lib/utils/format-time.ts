function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// Accept plain number to work with OBS timestamps (which are plain numbers)
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return hours + ':' + pad(minutes) + ':' + pad(seconds);
  }
  return minutes + ':' + pad(seconds);
}

export function formatYouTubeChapter(ms: number): string {
  return formatTimestamp(ms);
}

export function parseTimeString(time: string): number {
  const parts = time.split(':').map(Number);
  
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours === undefined || minutes === undefined || seconds === undefined) {
      throw new Error('Invalid time format');
    }
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (minutes === undefined || seconds === undefined) {
      throw new Error('Invalid time format');
    }
    return (minutes * 60 + seconds) * 1000;
  }
  
  throw new Error('Invalid time format. Expected HH:MM:SS or MM:SS');
}
