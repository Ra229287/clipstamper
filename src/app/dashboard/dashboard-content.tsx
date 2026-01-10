'use client';

import { useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOBS } from '@/lib/hooks/use-obs';
import { useVoiceCommand } from '@/lib/hooks/use-voice-command';
import { OBSConnection } from '@/components/obs-connection';
import { formatTimestamp } from '@/lib/utils/format-time';

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardContentProps {
  user: User;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const {
    isConnected,
    isStreaming,
    isRecording,
    streamDuration,
    clipMarkers,
    createClipMarker,
  } = useOBS();

  // Voice command handler - creates clip marker when "clip it" is detected
  const handleVoiceTrigger = useCallback(() => {
    if (isConnected && (isStreaming || isRecording)) {
      createClipMarker('voice');
    }
  }, [isConnected, isStreaming, isRecording, createClipMarker]);

  const voiceCommand = useVoiceCommand({
    triggerPhrase: 'clip it',
    onTrigger: handleVoiceTrigger,
    enabled: isConnected && (isStreaming || isRecording),
  });

  // Handle hotkey clip (Ctrl+Shift+C)
  const handleHotkeyClip = useCallback(() => {
    if (isConnected && (isStreaming || isRecording)) {
      createClipMarker('hotkey');
    }
  }, [isConnected, isStreaming, isRecording, createClipMarker]);

  // Determine overall status
  const getStatusBadge = () => {
    if (!isConnected) {
      return { variant: 'idle' as const, text: 'Not Connected' };
    }
    if (isStreaming) {
      return { variant: 'recording' as const, text: 'STREAMING' };
    }
    if (isRecording) {
      return { variant: 'recording' as const, text: 'RECORDING' };
    }
    return { variant: 'idle' as const, text: 'Connected' };
  };

  const status = getStatusBadge();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Clip Stamper</h1>
            <Badge variant={status.variant}>{status.text}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.name ?? user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - OBS Connection */}
          <OBSConnection />

          {/* Right Column - Controls & Stats */}
          <div className="space-y-6">
            {/* Voice Commands Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className={
                      'w-3 h-3 rounded-full ' +
                      (voiceCommand.isListening
                        ? 'bg-green-500 animate-pulse'
                        : voiceCommand.isSupported
                          ? 'bg-gray-400'
                          : 'bg-red-500')
                    }
                  />
                  Voice Commands
                </CardTitle>
                <CardDescription>
                  Say &quot;clip it&quot; to mark a clip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant="outline">
                    {!voiceCommand.isSupported
                      ? 'Not Supported'
                      : voiceCommand.isListening
                        ? 'Listening...'
                        : 'Inactive'}
                  </Badge>
                </div>

                {voiceCommand.error && (
                  <p className="text-xs text-red-500">{voiceCommand.error}</p>
                )}

                {voiceCommand.lastTranscript && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Heard: </span>
                    {voiceCommand.lastTranscript.slice(-50)}
                  </div>
                )}

                <div className="flex gap-2">
                  {!voiceCommand.isListening ? (
                    <Button
                      onClick={voiceCommand.start}
                      disabled={!voiceCommand.isSupported || !isConnected}
                      className="flex-1"
                    >
                      Start Listening
                    </Button>
                  ) : (
                    <Button
                      onClick={voiceCommand.stop}
                      variant="outline"
                      className="flex-1"
                    >
                      Stop Listening
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Voice recognition requires microphone permission and OBS
                  connection
                </p>
              </CardContent>
            </Card>

            {/* Session Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Session Stats</CardTitle>
                <CardDescription>Current stream/recording statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{clipMarkers.length}</p>
                    <p className="text-xs text-muted-foreground">Clips</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {streamDuration !== null
                        ? formatTimestamp(streamDuration)
                        : '--:--'}
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {isConnected ? (isStreaming || isRecording ? 'Live' : 'Idle') : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">Status</p>
                  </div>
                </div>

                {/* Quick Clip Button */}
                {isConnected && (isStreaming || isRecording) && (
                  <Button
                    onClick={handleHotkeyClip}
                    variant="success"
                    className="w-full mt-4"
                  >
                    Mark Clip (Ctrl+Shift+C)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Clip Timeline */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Clip Timeline</CardTitle>
            <CardDescription>
              {clipMarkers.length} clips marked this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clipMarkers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No clips yet. Connect to OBS, start streaming/recording, and mark
                your highlights!
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {clipMarkers.map((marker, index) => (
                  <div
                    key={marker.correlationId}
                    className="flex items-center justify-between p-3 rounded-md bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">
                        {formatTimestamp(marker.timestamp)}
                      </span>
                      <Badge
                        variant={
                          marker.source === 'voice'
                            ? 'secondary'
                            : marker.source === 'hotkey'
                              ? 'outline'
                              : 'default'
                        }
                      >
                        {marker.source}
                      </Badge>
                      {marker.label && (
                        <span className="text-sm text-muted-foreground">
                          {marker.label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
