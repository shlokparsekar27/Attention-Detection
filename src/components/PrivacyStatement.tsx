
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, Ban } from 'lucide-react';

const PrivacyStatement: React.FC = () => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Shield className="h-4 w-4 mr-2 text-focus" />
          Privacy Commitment
        </CardTitle>
        <CardDescription>
          How we protect your data and privacy
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4 text-sm">
          <div className="flex items-start">
            <div className="p-2 rounded-full bg-primary/10 mr-3 mt-1">
              <Lock className="h-4 w-4 text-focus" />
            </div>
            <div>
              <p className="font-medium">On-device processing only</p>
              <p className="text-muted-foreground">
                All facial recognition and focus analysis happens directly on your device.
                Your webcam feed never leaves your computer.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="p-2 rounded-full bg-primary/10 mr-3 mt-1">
              <Eye className="h-4 w-4 text-focus" />
            </div>
            <div>
              <p className="font-medium">Transparent data usage</p>
              <p className="text-muted-foreground">
                We only collect anonymized metrics to improve the accuracy of our focus detection
                algorithm. You can opt out of this at any time.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="p-2 rounded-full bg-primary/10 mr-3 mt-1">
              <Ban className="h-4 w-4 text-focus" />
            </div>
            <div>
              <p className="font-medium">No surveillance or monitoring</p>
              <p className="text-muted-foreground">
                FocusLens is designed to help you, not monitor you. We do not provide tools for
                teachers or employers to track individual students or employees.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivacyStatement;
