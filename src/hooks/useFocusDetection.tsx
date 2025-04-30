
import { useState, useEffect, useRef } from 'react';

interface FocusStats {
  attentionScore: number;
  eyeMovement: number;
  posture: number;
  timeDistracted: number;
  lastUpdate: Date;
}

interface UseFocusDetectionProps {
  enabled: boolean;
}

// This is a simulated hook - in a real app we would use ML models for actual attention detection
export const useFocusDetection = ({ enabled }: UseFocusDetectionProps) => {
  const [webcamReady, setWebcamReady] = useState(false);
  const [facingCamera, setFacingCamera] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [focusStats, setFocusStats] = useState<FocusStats>({
    attentionScore: 0,
    eyeMovement: 0,
    posture: 0,
    timeDistracted: 0,
    lastUpdate: new Date(),
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request webcam access
  const requestWebcamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      streamRef.current = stream;
      setWebcamReady(true);
      setPermission(true);
      return true;
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setPermission(false);
      return false;
    }
  };

  // Stop webcam access
  const stopWebcamAccess = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setWebcamReady(false);
  };

  // Simulate focus detection - in a real app, this would use ML models
  useEffect(() => {
    if (!enabled || !webcamReady) return;
    
    const simulateFocusDetection = () => {
      // Simulated focus metrics
      // In a real app, these would come from ML analysis of the webcam feed
      setFocusStats(prev => {
        // Randomize attention with a bias toward higher scores and some variability
        const baseAttention = Math.random() * 0.3 + 0.7; // Between 0.7 and 1.0
        const variability = (Math.sin(Date.now() / 10000) + 1) / 2 * 0.3; // Adds natural variability
        
        // Combine base attention with variability
        const newAttentionScore = Math.min(Math.max(baseAttention - variability, 0), 1);
        
        // Calculate other metrics based on attention
        const eyeMovement = Math.random() * 0.5 + 0.5;
        const posture = Math.random() * 0.3 + 0.7;
        const timeDistracted = prev.timeDistracted + (newAttentionScore < 0.5 ? 1 : 0);
        
        // Occasionally simulate looking away from camera
        const isFacingCamera = Math.random() > 0.1;
        setFacingCamera(isFacingCamera);
        
        return {
          attentionScore: isFacingCamera ? newAttentionScore : 0.1,
          eyeMovement,
          posture,
          timeDistracted,
          lastUpdate: new Date()
        };
      });
    };

    const interval = setInterval(simulateFocusDetection, 1000);
    return () => clearInterval(interval);
  }, [enabled, webcamReady]);

  return {
    videoRef,
    focusStats,
    facingCamera,
    webcamReady,
    permission,
    requestWebcamAccess,
    stopWebcamAccess,
  };
};

export default useFocusDetection;
