import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import WebcamConsent from '../components/WebcamConsent';
import FocusMonitor from '../components/FocusMonitor';
import Transcription from '../components/Transcription';
import FocusSummary from '../components/FocusSummary';
import PrivacyStatement from '../components/PrivacyStatement';
import { useToast } from '@/hooks/use-toast';
import useFocusDetection from '@/hooks/useFocusDetection';
import useTranscription from '@/hooks/useTranscription';
import generateSessionSummary from '@/utils/reportGenerator';
import { Link } from "react-router-dom";
import apiService from '@/services/apiService';
import websocketService from '@/services/websocketService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId] = useState("student-" + Math.random().toString(36).substring(2, 9));
  const [userName, setUserName] = useState("Student");
  const [classCode, setClassCode] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [inClass, setInClass] = useState(false);
  const { toast } = useToast();
  
  // Get focus data and transcription
  const { focusStats, videoRef, webcamReady, requestWebcamAccess, stopWebcamAccess } = useFocusDetection({ 
    enabled: isRecording && hasConsent === true 
  });
  const { transcription } = useTranscription({ isRecording });

  // Initialize WebSocket
  useEffect(() => {
    websocketService.init(userId);
    
    websocketService.on('class-ended', handleClassEnded);
    
    return () => {
      websocketService.off('class-ended', handleClassEnded);
      websocketService.disconnect();
    };
  }, []);
  
  // Send focus updates to server when in class
  useEffect(() => {
    if (!inClass || !isRecording) return;
    
    const intervalId = setInterval(() => {
      websocketService.sendFocusUpdate({
        attentionScore: focusStats.attentionScore,
        posture: focusStats.posture,
        timeDistracted: focusStats.timeDistracted
      });
      
      // Also send to API for persistence
      apiService.sendFocusData({
        userId,
        sessionId: sessionId || 'unknown',
        timestamp: Date.now(),
        attentionScore: focusStats.attentionScore,
        posture: focusStats.posture,
        timeDistracted: focusStats.timeDistracted
      }).catch(err => console.error('Error sending focus data:', err));
    }, 2000); // Send every 2 seconds
    
    return () => clearInterval(intervalId);
  }, [inClass, isRecording, focusStats]);
  
  // Handle class ended event
  const handleClassEnded = () => {
    if (inClass) {
      setInClass(false);
      
      toast({
        title: "Class ended",
        description: "The teacher has ended the class session",
      });
      
      // If recording, end the session
      if (isRecording) {
        handleEndSession();
      }
    }
  };

  // Handle consent approval
  const handleConsentApproved = async () => {
    const success = await requestWebcamAccess();
    if (success) {
      setHasConsent(true);
      toast({
        title: "Ready to start",
        description: "Click 'Start Session' when you're ready to begin",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Camera access required",
        description: "Please grant camera access to use FocusLens",
      });
    }
  };

  // Handle consent declined
  const handleConsentDeclined = () => {
    setHasConsent(false);
    toast({
      title: "Camera access declined",
      description: "You can still use the transcription features without camera access.",
    });
  };

  // Start recording session
  const handleStartSession = async () => {
    try {
      // Start session on backend
      const response = await apiService.startSession(userId);
      setSessionId(response.sessionId);
      
      setIsRecording(true);
      setSessionStartTime(new Date());
      setSessionComplete(false);
      
      toast({
        title: "Session started",
        description: "Focus monitoring and transcription are now active.",
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        variant: "destructive",
        title: "Failed to start session",
        description: "Please try again later",
      });
    }
  };

  // End recording session
  const handleEndSession = async () => {
    if (!isRecording) return;
    
    try {
      // Calculate session duration
      const duration = sessionStartTime 
        ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) 
        : 0;
      
      // Generate summary
      const summary = generateSessionSummary({
        duration,
        averageFocus: focusStats.attentionScore,
        timeDistracted: focusStats.timeDistracted,
        transcription,
      });
      
      setSessionSummary(summary);
      setIsRecording(false);
      setSessionComplete(true);
      stopWebcamAccess();
      
      // If in a class, leave it
      if (inClass) {
        websocketService.leaveClassroom();
        setInClass(false);
      }
      
      // End session on backend
      if (sessionId) {
        await apiService.endSession(sessionId, summary);
      }
      
      
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        variant: "destructive",
        title: "Failed to end session",
        description: "Please try again later",
      });
    }
  };

  // Reset session
  const handleResetSession = () => {
    setSessionComplete(false);
    setSessionSummary(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcamAccess();
    };
  }, []);

  // Render based on state
  const renderContent = () => {
    // If consent hasn't been decided
    if (hasConsent === null) {
      return <WebcamConsent onConsent={handleConsentApproved} onDecline={handleConsentDeclined} />;
    }
    
    // If session is complete, show summary
    if (sessionComplete && sessionSummary) {
      return <FocusSummary sessionData={sessionSummary} onReset={handleResetSession} />;
    }
    
    // Otherwise show the main app
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FocusMonitor isActive={isRecording && hasConsent === true} />
          <div className="mt-6 hidden md:block">
            <PrivacyStatement />
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <Transcription isRecording={isRecording} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        isRecording={isRecording} 
        onStartSession={handleStartSession}
        onEndSession={handleEndSession}
      />
      
      <main className="flex-1 container py-8">
        {renderContent()}
      </main>
      
      {/* Mobile Privacy Statement */}
      <div className="mt-6 md:hidden px-4 pb-8">
        <PrivacyStatement />
      </div>
      <Link 
        to="/teacher" 
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Open Teacher Dashboard
      </Link>
    </div>
  );
};

export default Index;
