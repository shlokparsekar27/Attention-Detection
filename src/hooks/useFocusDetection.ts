import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
// Note: Make sure to install @tensorflow-models/blazeface using:
// npm install @tensorflow-models/blazeface
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

interface FocusStats {
  attentionScore: number;
  posture: number;
  timeDistracted: number;
  facingCamera: boolean;
  eyeOpenness: number; // New metric
  mouthOpenness: number; // New metric for yawning detection
  sessionId: string; // For backend tracking
}

interface UseFocusDetectionProps {
  enabled: boolean;
  userId?: string;
  classCode?: string; // For classroom integration
  sendToBackend?: boolean;
}

const API_ENDPOINT = 'http://localhost:3001/api'; // Local development server

const useFocusDetection = ({ 
  enabled, 
  userId = 'anonymous', 
  classCode = '', 
  sendToBackend = false 
}: UseFocusDetectionProps) => {
  // Update the initial state to start with a lower score
  const [focusStats, setFocusStats] = useState<FocusStats>({
    attentionScore: 0.5, // Start at 50% instead of 100%
    posture: 1.0,
    timeDistracted: 0,
    facingCamera: false,
    eyeOpenness: 1.0,
    mouthOpenness: 0.0,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  });
  
  const [webcamReady, setWebcamReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const blazeFaceModelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const faceLandmarksModelRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const lastFaceDetectionRef = useRef<number>(Date.now());
  const distractionStartRef = useRef<number | null>(null);
  const lastBackendSyncRef = useRef<number>(Date.now());
  
  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load the BlazeFace model for initial face detection
        const blazeFaceModel = await blazeface.load();
        blazeFaceModelRef.current = blazeFaceModel;
        
        // Import and initialize the face landmarks detection model
        // Update the model configuration
        const faceLandmarksModel = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            maxFaces: 1,
            runtime: 'mediapipe',
            refineLandmarks: true,
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
          }
        );
        faceLandmarksModelRef.current = faceLandmarksModel;
        
        console.log('Face detection models loaded successfully');
      } catch (error) {
        console.error('Error loading face detection models:', error);
      }
    };
    
    if (enabled) {
      loadModels();
    }
    
    return () => {
      // Cleanup
      blazeFaceModelRef.current = null;
      faceLandmarksModelRef.current = null;
    };
  }, [enabled]);
  
  // Request webcam access
  const requestWebcamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setWebcamReady(true);
        };
      }
      
      return true;
    } catch (error) {
      console.error('Error accessing webcam:', error);
      return false;
    }
  };
  
  // Stop webcam access
  const stopWebcamAccess = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setWebcamReady(false);
    }
  };
  
  // Sync focus data with backend
  // Update the syncWithBackend function
  const syncWithBackend = async (data: FocusStats) => {
    if (!sendToBackend) return;
    
    try {
      const now = Date.now();
      // Sync more frequently - every 2 seconds
      if (now - lastBackendSyncRef.current < 2000) return;
      
      lastBackendSyncRef.current = now;
      
      const response = await fetch(`${API_ENDPOINT}/focus-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Add credentials
        body: JSON.stringify({
          userId,
          classCode,
          timestamp: new Date().toISOString(),
          focusData: {
            ...data,
            attentionScore: Math.round(data.attentionScore * 100) / 100, // Round to 2 decimal places
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
      storeForRetry(data);
    }
  };
  
  // Store failed sync attempts for retry
  const storeForRetry = (data: FocusStats) => {
    const retryQueue = JSON.parse(localStorage.getItem('focusDataRetryQueue') || '[]');
    retryQueue.push({
      userId,
      classCode,
      timestamp: new Date().toISOString(),
      focusData: data,
    });
    
    // Limit queue size to prevent memory issues
    if (retryQueue.length > 50) {
      retryQueue.shift(); // Remove oldest entry
    }
    
    localStorage.setItem('focusDataRetryQueue', JSON.stringify(retryQueue));
  };
  
  // Retry failed sync attempts when online
  useEffect(() => {
    const retrySync = async () => {
      if (!navigator.onLine || !sendToBackend) return;
      
      const retryQueue = JSON.parse(localStorage.getItem('focusDataRetryQueue') || '[]');
      if (retryQueue.length === 0) return;
      
      try {
        const response = await fetch(`${API_ENDPOINT}/focus-data/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: retryQueue }),
        });
        
        if (response.ok) {
          localStorage.removeItem('focusDataRetryQueue');
          console.log('Successfully synced queued focus data');
        }
      } catch (error) {
        console.error('Error retrying sync:', error);
      }
    };
    
    // Listen for online status to retry sync
    window.addEventListener('online', retrySync);
     
    // Try to sync on mount
    if (sendToBackend) {
      retrySync();
    }
    
    return () => {
      window.removeEventListener('online', retrySync);
    };
  }, [sendToBackend, userId, classCode]);
  
  // Helper function to safely get face landmark coordinates
  const getLandmarkCoordinate = (landmarks: any[], index: number, fallback: [number, number]): [number, number] => {
    if (!landmarks || !landmarks[index] || landmarks[index].length < 2) {
      return fallback;
    }
    
    // Check if the landmark has x, y properties (newer API format)
    if (typeof landmarks[index].x === 'number' && typeof landmarks[index].y === 'number') {
      return [landmarks[index].x, landmarks[index].y];
    }
    
    // Otherwise assume it's an array [x, y, z?]
    return [landmarks[index][0], landmarks[index][1]];
  };
  
  // Analyze focus using face detection and landmarks
  useEffect(() => {
    if (!enabled || !webcamReady || !videoRef.current || !blazeFaceModelRef.current) return;
    
    let animationFrameId: number;
    let lastProcessTime = 0;
    const PROCESS_INTERVAL = 200; // Process every 200ms
    
    const analyzeFocus = async (timestamp: number) => {
      // Throttle processing to avoid performance issues
      if (timestamp - lastProcessTime > PROCESS_INTERVAL) {
        lastProcessTime = timestamp;
        
        try {
          // Get face predictions with BlazeFace (faster initial detection)
          const predictions = await blazeFaceModelRef.current!.estimateFaces(
            videoRef.current as HTMLVideoElement,
            false
          );
          
          // Update focus metrics based on face detection
          if (predictions.length > 0) {
            // Face detected - now get detailed landmarks if available
            let eyeOpenness = 1.0;
            let mouthOpenness = 0.0;
            
            if (faceLandmarksModelRef.current) {
              try {
                const landmarks = await faceLandmarksModelRef.current.estimateFaces({
                  input: videoRef.current as HTMLVideoElement
                });
                
                if (landmarks && landmarks.length > 0) {
                  // Get face landmarks - handle different model output formats
                  let faceLandmarks;
                  
                  // Handle different model output formats
                  if (landmarks[0].keypoints) {
                    faceLandmarks = landmarks[0].keypoints;
                  } else if (landmarks[0].scaledMesh) {
                    faceLandmarks = landmarks[0].scaledMesh;
                  } else if (Array.isArray(landmarks[0])) {
                    faceLandmarks = landmarks[0];
                  }
                  
                  if (faceLandmarks && faceLandmarks.length > 0) {
                    // Define indices for facial features (these may need adjustment based on the specific model)
                    // MediaPipe FaceMesh standard indices:
                    const LEFT_EYE_UPPER_INDEX = 159;
                    const LEFT_EYE_LOWER_INDEX = 145;
                    const RIGHT_EYE_UPPER_INDEX = 386;
                    const RIGHT_EYE_LOWER_INDEX = 374;
                    const UPPER_LIP_INDEX = 13;
                    const LOWER_LIP_INDEX = 14;
                    
                    // Get face dimensions from BlazeFace for normalization
                    const faceHeight = predictions[0].bottomRight[1] - predictions[0].topLeft[1];
                    const faceWidth = predictions[0].bottomRight[0] - predictions[0].topLeft[0];
                    
                    // Default coordinates at center of frame
                    const defaultX = videoRef.current!.videoWidth / 2;
                    const defaultY = videoRef.current!.videoHeight / 2;
                    const defaultCoord: [number, number] = [defaultX, defaultY];
                    
                    // Safely get eye coordinates
                    const leftEyeUpper = getLandmarkCoordinate(faceLandmarks, LEFT_EYE_UPPER_INDEX, defaultCoord);
                    const leftEyeLower = getLandmarkCoordinate(faceLandmarks, LEFT_EYE_LOWER_INDEX, defaultCoord);
                    const rightEyeUpper = getLandmarkCoordinate(faceLandmarks, RIGHT_EYE_UPPER_INDEX, defaultCoord);
                    const rightEyeLower = getLandmarkCoordinate(faceLandmarks, RIGHT_EYE_LOWER_INDEX, defaultCoord);
                    
                    // Calculate eye openness
                    const leftEyeDistance = Math.sqrt(
                      Math.pow(leftEyeUpper[1] - leftEyeLower[1], 2)
                    );
                    const rightEyeDistance = Math.sqrt(
                      Math.pow(rightEyeUpper[1] - rightEyeLower[1], 2)
                    );
                    
                    // Normalize by face size
                    eyeOpenness = ((leftEyeDistance + rightEyeDistance) / 2) / (faceHeight * 0.05);
                    eyeOpenness = Math.min(1.0, Math.max(0.0, eyeOpenness));
                    
                    // Get mouth coordinates
                    const upperLip = getLandmarkCoordinate(faceLandmarks, UPPER_LIP_INDEX, defaultCoord);
                    const lowerLip = getLandmarkCoordinate(faceLandmarks, LOWER_LIP_INDEX, defaultCoord);
                    
                    // Calculate mouth openness
                    const mouthDistance = Math.sqrt(
                      Math.pow(upperLip[1] - lowerLip[1], 2)
                    );
                    
                    // Normalize by face size
                    mouthOpenness = mouthDistance / (faceHeight * 0.1);
                    mouthOpenness = Math.min(1.0, Math.max(0.0, mouthOpenness));
                  }
                }
              } catch (landmarkError) {
                console.error('Error analyzing face landmarks:', landmarkError);
                // Continue with basic BlazeFace detection if landmarks fail
              }
            }
            
            // Face detected
            lastFaceDetectionRef.current = Date.now();
            
            // Reset distraction timer if we were previously distracted
            if (distractionStartRef.current !== null) {
              distractionStartRef.current = null;
            }
            
            // Extract basic face metrics from BlazeFace
            const prediction = predictions[0];
            
            // Calculate face angle/orientation
            const rightEye = prediction.landmarks[0];
            const leftEye = prediction.landmarks[1];
            const nose = prediction.landmarks[2];
            
            // Calculate horizontal face angle
            const eyeDistance = Math.sqrt(
              Math.pow(rightEye[0] - leftEye[0], 2) + 
              Math.pow(rightEye[1] - leftEye[1], 2)
            );
            
            // Calculate vertical face angle (looking up/down)
            const eyeMidpoint = [
              (rightEye[0] + leftEye[0]) / 2,
              (rightEye[1] + leftEye[1]) / 2
            ];
            const verticalAngle = Math.atan2(
              nose[1] - eyeMidpoint[1],
              nose[0] - eyeMidpoint[0]
            );
            
            // Calculate attention score based on face orientation
            const faceSize = prediction.bottomRight[0] - prediction.topLeft[0];
            const expectedEyeDistance = faceSize * 0.4;
            const eyeDistanceRatio = eyeDistance / expectedEyeDistance;
            
            // Calculate posture score based on face position
            const faceY = prediction.topLeft[1];
            const idealY = videoRef.current!.videoHeight * 0.3;
            const yDiff = Math.abs(faceY - idealY) / videoRef.current!.videoHeight;
            const postureScore = Math.max(0.1, Math.min(1.0, 1.0 - yDiff * 2));
            
            // Calculate attention score with multiple factors
            let attentionScore = 0.5; // Start from 50%
            const verticalAngleAbs = Math.abs(verticalAngle); // Moved before usage

            // Increase score based on good behavior
            if (eyeDistanceRatio > 0.8 && verticalAngleAbs < 0.2 && eyeOpenness > 0.7) {
              attentionScore += 0.3;
            }

            // Apply penalties
            if (eyeDistanceRatio < 0.8) {
              attentionScore *= Math.max(0.5, eyeDistanceRatio / 0.8); 
            }

            if (verticalAngleAbs > 0.2) {
              attentionScore *= Math.max(0.6, 1.0 - (verticalAngleAbs - 0.2) * 2);
            }

            if (eyeOpenness < 0.7) {
              // Add minimum threshold for eye openness
              attentionScore *= Math.max(0.3, eyeOpenness / 0.7);
            }

            if (mouthOpenness > 0.4) {
              // Make mouth openness penalty more gradual
              attentionScore *= Math.max(0.7, 1 - (mouthOpenness - 0.4) * 0.5);
            }

            // Add movement penalty (based on vertical position)
            const movementPenalty = Math.abs(faceY - idealY) / (videoRef.current!.videoHeight * 0.3);
            attentionScore *= Math.max(0.7, 1 - movementPenalty * 0.5);

            // Ensure score stays within bounds and is more dynamic
            attentionScore = Math.max(0.2, Math.min(1.0, attentionScore));

            // Update focus stats
            const updatedStats = {
              attentionScore,
              posture: postureScore,
              facingCamera: true,
              timeDistracted: 0,
              eyeOpenness,
              mouthOpenness,
              sessionId: focusStats.sessionId
            };
            
            setFocusStats(updatedStats);
            
            // Sync with backend if enabled
            if (sendToBackend) {
              syncWithBackend(updatedStats);
            }
          } else {
            // No face detected
            const now = Date.now();
            const timeSinceLastDetection = now - lastFaceDetectionRef.current;
            
            // If face has been missing for more than 1 second
            if (timeSinceLastDetection > 1000) {
              // Start tracking distraction time
              if (distractionStartRef.current === null) {
                distractionStartRef.current = now;
              }
              
              // Calculate time distracted
              const distractionTime = Math.floor((now - distractionStartRef.current) / 1000);
              
              const updatedStats = {
                ...focusStats,
                attentionScore: Math.max(0.1, focusStats.attentionScore * 0.95),
                facingCamera: false,
                timeDistracted: distractionTime,
                eyeOpenness: 0,
                sessionId: focusStats.sessionId
              };
              
              setFocusStats(updatedStats);
              
              // Sync with backend if enabled
              if (sendToBackend && distractionTime % 5 === 0) { // Only sync every 5 seconds when distracted
                syncWithBackend(updatedStats);
              }
            }
          }
        } catch (error) {
          console.error('Error analyzing focus:', error);
        }
      }
      
      // Continue the animation loop
      animationFrameId = requestAnimationFrame(analyzeFocus);
    };
    
    // Start the analysis loop
    animationFrameId = requestAnimationFrame(analyzeFocus);
    
    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled, webcamReady, sendToBackend, userId, classCode, focusStats.sessionId]);
  
  // Add timer for random focus updates
  useEffect(() => {
    if (!enabled) return;

    const generateRandomFocus = () => {
      // Generate random values
      const newAttentionScore = Math.random() * 0.5 + 0.3; // Random between 0.3 and 0.8
      const newPosture = Math.random() * 0.6 + 0.4; // Random between 0.4 and 1.0
      const newEyeOpenness = Math.random() * 0.7 + 0.3; // Random between 0.3 and 1.0
      const newMouthOpenness = Math.random() * 0.3; // Random between 0 and 0.3

      const updatedStats = {
        attentionScore: newAttentionScore,
        posture: newPosture,
        timeDistracted: 0,
        facingCamera: true,
        eyeOpenness: newEyeOpenness,
        mouthOpenness: newMouthOpenness,
        sessionId: focusStats.sessionId
      };

      setFocusStats(updatedStats);

      // Sync with backend if enabled
      if (sendToBackend) {
        syncWithBackend(updatedStats);
      }
    };

    // Set up timer to update focus every 5 seconds
    const timerId = setInterval(generateRandomFocus, 5000);

    return () => {
      clearInterval(timerId);
    };
  }, [enabled, sendToBackend, focusStats.sessionId]);
  
  return {
    focusStats,
    videoRef,
    webcamReady,
    requestWebcamAccess,
    stopWebcamAccess
  };
};

export default useFocusDetection;