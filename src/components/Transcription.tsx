
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import useTranscription from '@/hooks/useTranscription';

interface TranscriptionProps {
  isRecording: boolean;
}

const Transcription: React.FC<TranscriptionProps> = ({ isRecording }) => {
  const { transcription, isTranscribing } = useTranscription({ isRecording });
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom when new transcription segments arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcription]);

  // Download transcription as text file
  const handleDownload = () => {
    const text = transcription
      .map(segment => `[${segment.timestamp.toLocaleTimeString()}] ${segment.text}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `lecture-notes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-md flex flex-col h-full min-h-[300px]">
      <CardHeader className="pb-3 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Transcription</CardTitle>
          
          <div className="flex items-center space-x-2">
            {isRecording && (
              <span className="flex items-center">
                <span className="h-2 w-2 bg-focus-high rounded-full mr-2 animate-pulse"></span>
                <span className="text-xs text-muted-foreground">Recording</span>
              </span>
            )}
            
            {transcription.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                <span className="text-xs">Save</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden px-6 pb-6">
        <div className="transcript-container h-full">
          {transcription.length > 0 ? (
            <div className="space-y-4">
              {transcription.map((segment) => (
                <div key={segment.id} className="text-sm">
                  <span className="text-xs text-muted-foreground block mb-1">
                    {segment.timestamp.toLocaleTimeString()}
                  </span>
                  <p>{segment.text}</p>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-center">
              {isRecording ? (
                <p>Waiting for speech...</p>
              ) : (
                <p>Start a session to begin transcribing</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Transcription;
