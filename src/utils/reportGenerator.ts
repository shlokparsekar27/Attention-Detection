
interface SessionData {
  duration: number;
  averageFocus: number;
  timeDistracted: number;
  transcription: {
    id: string;
    text: string;
    timestamp: Date;
    confidence: number;
  }[];
}

interface SessionSummary {
  duration: number;
  averageFocus: number;
  timeDistracted: number;
  keyPoints: string[];
}

// Simple function to extract key points from transcription
// In a real app, this would use NLP techniques for extractive summarization
export const generateSessionSummary = (sessionData: SessionData): SessionSummary => {
  // Calculate duration in seconds
  const duration = sessionData.duration;
  
  // Calculate time distracted
  const timeDistracted = sessionData.timeDistracted;
  
  // Extract key points (in a real app, this would use ML/NLP)
  // For now, we'll simulate by selecting high-confidence segments
  const keyPoints: string[] = [];
  
  // Get transcriptions with confidence > 0.85 and take up to 5
  const highConfidenceSegments = sessionData.transcription
    .filter(segment => segment.confidence > 0.85)
    .map(segment => segment.text);
    
  // Use a simple heuristic - pick segments with key phrases
  const keyPhrases = ["neural networks", "activation function", "backpropagation", "learning rate", "model", 
    "training", "algorithm", "gradient descent", "parameters", "function", "data", "regularization"];
  
  for (const segment of highConfidenceSegments) {
    if (keyPoints.length >= 5) break;
    
    // Check if this segment contains key phrases
    for (const phrase of keyPhrases) {
      if (segment.toLowerCase().includes(phrase) && !keyPoints.includes(segment)) {
        keyPoints.push(segment);
        break;
      }
    }
  }
  
  // If we don't have enough key points, just add some high confidence segments
  while (keyPoints.length < 5 && highConfidenceSegments.length > keyPoints.length) {
    const nextSegment = highConfidenceSegments.find(segment => !keyPoints.includes(segment));
    if (nextSegment) {
      keyPoints.push(nextSegment);
    } else {
      break;
    }
  }
  
  return {
    duration,
    averageFocus: sessionData.averageFocus,
    timeDistracted,
    keyPoints,
  };
};

export default generateSessionSummary;
