
import React from 'react';
import { Webcam, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface WebcamConsentProps {
  onConsent: () => void;
  onDecline: () => void;
}

const WebcamConsent: React.FC<WebcamConsentProps> = ({ onConsent, onDecline }) => {
  const { toast } = useToast();

  const handleConsent = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        onConsent();
        toast({
          title: "Webcam access granted",
          description: "Thank you for your consent. Your privacy is our priority.",
        });
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
        toast({
          variant: "destructive",
          title: "Could not access webcam",
          description: "Please check your browser permissions and try again.",
        });
      });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md focus-card animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Webcam className="h-8 w-8 text-focus" />
            </div>
          </div>
          <CardTitle className="text-center text-xl">Camera Access Request</CardTitle>
          <CardDescription className="text-center">
            FocusLens needs camera permission to analyze your attention levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center p-3 border border-border rounded-lg bg-secondary/50">
              <Shield className="h-5 w-5 text-focus mr-3" />
              <div className="text-sm">
                <p className="font-medium">Your privacy is guaranteed</p>
                <p className="text-muted-foreground text-xs">All processing happens on your device. No data is sent to our servers.</p>
              </div>
            </div>
            
            <p className="text-sm text-center">
              We use your webcam feed to analyze attention patterns and provide helpful feedback. 
              You can revoke access at any time.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onDecline}>Decline</Button>
          <Button className="bg-focus hover:bg-focus/90" onClick={handleConsent}>Allow Access</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WebcamConsent;
