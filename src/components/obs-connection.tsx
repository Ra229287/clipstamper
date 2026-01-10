'use client';

import { useState } from 'react';
import { useOBS } from '@/lib/hooks/use-obs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimestamp } from '@/lib/utils/format-time';

function SetupGuide({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border rounded-md bg-muted/50">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium hover:bg-muted/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          How to enable OBS WebSocket
        </span>
        <svg
          className={'w-4 h-4 transition-transform ' + (isOpen ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-3 text-sm">
          <div className="border-t pt-3">
            <p className="font-medium mb-2">Step-by-step setup:</p>
            <ol className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">1</span>
                <span>Open <strong className="text-foreground">OBS Studio</strong> on your computer</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">2</span>
                <span>Go to <strong className="text-foreground">Tools</strong> menu in the top bar</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">3</span>
                <span>Click <strong className="text-foreground">WebSocket Server Settings</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">4</span>
                <span>Check <strong className="text-foreground">Enable WebSocket server</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">5</span>
                <span>Note the <strong className="text-foreground">Server Port</strong> (default: 4455)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">6</span>
                <span>If you set a password, enter it below</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">7</span>
                <span>Click <strong className="text-foreground">Apply</strong> in OBS, then connect here!</span>
              </li>
            </ol>
          </div>
          <div className="border-t pt-3">
            <p className="font-medium mb-1">Tip: Enable Replay Buffer for instant clips</p>
            <p className="text-muted-foreground text-xs">
              Go to <strong>Settings &gt; Output &gt; Replay Buffer</strong> in OBS and enable it.
              When you mark a clip, it will automatically save the last few seconds!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function OBSConnection() {
  const {
    state,
    isConnected,
    connect,
    disconnect,
    streamDuration,
    isStreaming,
    isRecording,
    clipMarkers,
    createClipMarker,
    clearClipMarkers,
    isReplayBufferActive,
    startReplayBuffer,
    stopReplayBuffer,
  } = useOBS();

  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connect({
        host,
        port: parseInt(port, 10),
        password: password || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnect();
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualClip = async () => {
    await createClipMarker('manual');
  };

  return (
    <div className="space-y-4">
      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span
              className={
                'w-3 h-3 rounded-full ' +
                (isConnected
                  ? 'bg-green-500'
                  : state.status === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : state.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-gray-400')
              }
            />
            OBS Connection
          </CardTitle>
          <CardDescription>
            {state.status === 'connected' && 'obsVersion' in state
              ? 'Connected to OBS WebSocket v' + state.obsVersion
              : state.status === 'connecting'
                ? 'Connecting...'
                : state.status === 'error' && 'error' in state
                  ? 'Error: ' + state.error
                  : 'Not connected'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              {/* Setup Guide - collapsible help section */}
              <SetupGuide isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="host" className="text-sm font-medium">
                    Host
                  </label>
                  <Input
                    id="host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="port" className="text-sm font-medium">
                    Port
                  </label>
                  <Input
                    id="port"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="4455"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password (optional)
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty if not set"
                />
              </div>
              <Button onClick={handleConnect} disabled={isLoading} className="w-full">
                {isLoading ? 'Connecting...' : 'Connect to OBS'}
              </Button>
            </>
          ) : (
            <Button onClick={handleDisconnect} variant="outline" disabled={isLoading} className="w-full">
              Disconnect
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stream Status Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Stream Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={
                    'w-3 h-3 rounded-full ' + (isStreaming ? 'bg-red-500 animate-pulse' : 'bg-gray-400')
                  }
                />
                <span>{isStreaming ? 'Streaming' : 'Not Streaming'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    'w-3 h-3 rounded-full ' + (isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400')
                  }
                />
                <span>{isRecording ? 'Recording' : 'Not Recording'}</span>
              </div>
            </div>

            {(isStreaming || isRecording) && streamDuration !== null && (
              <div className="text-center text-2xl font-mono">{formatTimestamp(streamDuration)}</div>
            )}

            {/* Replay Buffer Controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Replay Buffer</span>
              <div className="flex gap-2">
                {!isReplayBufferActive ? (
                  <Button size="sm" variant="outline" onClick={startReplayBuffer}>
                    Start Buffer
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={stopReplayBuffer}>
                    Stop Buffer
                  </Button>
                )}
              </div>
            </div>

            {/* Manual Clip Button */}
            <Button onClick={handleManualClip} className="w-full" disabled={!isStreaming && !isRecording}>
              Mark Clip Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clip Markers Card */}
      {isConnected && clipMarkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Clip Markers ({clipMarkers.length})</span>
              <Button size="sm" variant="ghost" onClick={clearClipMarkers}>
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {clipMarkers.map((marker, index) => (
                <div
                  key={marker.correlationId}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{formatTimestamp(marker.timestamp)}</span>
                    <span
                      className={
                        'px-2 py-0.5 text-xs rounded ' +
                        (marker.source === 'voice'
                          ? 'bg-purple-100 text-purple-800'
                          : marker.source === 'hotkey'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800')
                      }
                    >
                      {marker.source}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
