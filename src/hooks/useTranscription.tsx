
import { useState, useEffect } from 'react';

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
}

interface UseTranscriptionProps {
  isRecording: boolean;
}

// This is a simulated hook - in a real app we would use Speech-to-Text API
const useTranscription = ({ isRecording }: UseTranscriptionProps) => {
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sample lecture content for simulation
  const lectureContent = [
    "Let's examine how neural networks process information through layers of neurons.",
    "The activation function determines whether a neuron should be activated based on weighted sum of inputs.",
    "Backpropagation allows the network to adjust weights by calculating the gradient of the loss function.",
    "Convolutional neural networks are particularly effective for image recognition tasks.",
    "The pooling layer reduces the spatial dimensions of the representation.",
    "Dropout is a regularization technique that prevents overfitting by randomly deactivating neurons.",
    "Recurrent neural networks have connections that form directed cycles, allowing them to maintain memory.",
    "Long Short-Term Memory networks solve the vanishing gradient problem in traditional RNNs.",
    "Transfer learning leverages pre-trained models to solve new but related problems.",
    "The softmax function converts a vector of numbers into a probability distribution.",
    "Gradient descent optimizes model parameters by iteratively moving toward the minimum of a function.",
    "Batch normalization accelerates training by normalizing layer inputs for each mini-batch.",
    "Attention mechanisms allow models to focus on specific parts of the input sequence.",
    "Transformers use self-attention to process sequential data without recurrence.",
    "The learning rate controls how much to adjust weights with respect to the loss gradient."
  ];

  // Start transcription
  const startTranscription = () => {
    setIsTranscribing(true);
    setErrorMessage(null);
    setTranscription([]);
  };

  // Stop transcription
  const stopTranscription = () => {
    setIsTranscribing(false);
  };

  // Clear transcription
  const clearTranscription = () => {
    setTranscription([]);
  };

  // Simulated transcription process
  useEffect(() => {
    if (!isRecording || !isTranscribing) return;

    let lectureIndex = 0;
    
    const addTranscriptionSegment = () => {
      // Get the next lecture segment
      const text = lectureContent[lectureIndex % lectureContent.length];
      lectureIndex += 1;
      
      // Create a new segment with unique ID
      const newSegment: TranscriptionSegment = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
        confidence: Math.random() * 0.2 + 0.8, // Random confidence between 0.8 and 1.0
      };
      
      // Add to transcription
      setTranscription(prev => [...prev, newSegment]);
    };
    
    // Add initial segment immediately
    addTranscriptionSegment();
    
    // Add new segments at random intervals (3-7 seconds)
    const interval = setInterval(() => {
      addTranscriptionSegment();
    }, Math.random() * 4000 + 3000);
    
    return () => clearInterval(interval);
  }, [isRecording, isTranscribing]);

  useEffect(() => {
    if (isRecording) {
      startTranscription();
    } else {
      stopTranscription();
    }
  }, [isRecording]);

  return {
    transcription,
    isTranscribing,
    errorMessage,
    startTranscription,
    stopTranscription,
    clearTranscription,
  };
};

export default useTranscription;
