
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, LineChart } from 'lucide-react';

interface FocusSummaryProps {
  sessionData: {
    duration: number;
    averageFocus: number;
    timeDistracted: number;
    keyPoints: string[];
  };
  onReset: () => void;
}

const FocusSummary: React.FC<FocusSummaryProps> = ({ sessionData, onReset }) => {
  // Format minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDownload = () => {
    const summaryText = `
Focus Study Session Summary
--------------------------
Date: ${new Date().toLocaleDateString()}
Session Duration: ${formatTime(sessionData.duration)}
Average Focus Level: ${Math.round(sessionData.averageFocus * 100)}%
Time Distracted: ${formatTime(sessionData.timeDistracted)}

Key Learning Points:
${sessionData.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Focus Analysis:
- You maintained strong focus for approximately ${Math.round(sessionData.averageFocus * sessionData.duration)}s of your session.
- Your attention was highest during discussions of neural network architectures.
- Consider taking short breaks every 25 minutes to maintain optimal focus.

Recommendations:
- Try the Pomodoro technique (25min focus, 5min break)
- Minimize background distractions
- Position your camera at eye level for better posture tracking
    `.trim();

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-summary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center pb-4">
        <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
        <p className="text-muted-foreground">Here's a summary of your focus and learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Focus Analysis</CardTitle>
            <CardDescription>Your attention metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Average Focus Level</span>
                  <span className="font-medium">{Math.round(sessionData.averageFocus * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full">
                  <div 
                    className={`h-full rounded-full ${sessionData.averageFocus > 0.7 ? 'bg-focus-high' : 'bg-focus-medium'}`}
                    style={{ width: `${sessionData.averageFocus * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Session Duration</p>
                  <p className="text-xl font-bold">{formatTime(sessionData.duration)}</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Time Distracted</p>
                  <p className="text-xl font-bold">{formatTime(sessionData.timeDistracted)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Learning Points</CardTitle>
            <CardDescription>Main concepts from your session</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sessionData.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-focus text-xs text-white mr-2 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Button className="bg-focus hover:bg-focus/90" onClick={onReset}>
          Start New Session
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download Summary
        </Button>
      </div>
    </div>
  );
};

export default FocusSummary;
