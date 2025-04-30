
import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isRecording: boolean;
  onStartSession: () => void;
  onEndSession: () => void;
}

const Header: React.FC<HeaderProps> = ({ isRecording, onStartSession, onEndSession }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center py-4 px-6 bg-white shadow-sm border-b">
      <div className="flex items-center mb-4 sm:mb-0">
        <Eye className="h-6 w-6 text-focus mr-2" />
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-focus-light to-focus">
          FocusLens
        </h1>
        <span className="ml-2 text-xs px-2 py-1 bg-secondary rounded-full">prototype</span>
      </div>
      
      <div className="flex space-x-3">
        {!isRecording ? (
          <Button 
            onClick={onStartSession}
            className="bg-focus hover:bg-focus/90"
          >
            Start Session
          </Button>
        ) : (
          <Button 
            onClick={onEndSession} 
            variant="destructive"
          >
            End Session
          </Button>
        )}
        <Button variant="outline"><a href='/'>Home</a></Button>
      </div>
    </div>
  );
};

export default Header;
