// API service for backend integration

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper function for making API requests
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  // Get auth token from localStorage or context
  const token = localStorage.getItem('auth_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
};

// Authentication
export const authService = {
  login: async (email: string, password: string) => {
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  
  register: async (userData: any) => {
    return fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  logout: async () => {
    localStorage.removeItem('auth_token');
    return { success: true };
  }
};

// Class sessions
export const sessionService = {
  createSession: async (teacherId: string) => {
    return fetchWithAuth('/sessions', {
      method: 'POST',
      body: JSON.stringify({ teacherId })
    });
  },
  
  joinSession: async (classCode: string, studentData: any) => {
    return fetchWithAuth(`/sessions/${classCode}/join`, {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },
  
  endSession: async (sessionId: string) => {
    return fetchWithAuth(`/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },
  
  getSessionData: async (sessionId: string) => {
    return fetchWithAuth(`/sessions/${sessionId}`);
  }
};

// Focus data
export const focusService = {
  sendFocusUpdate: async (sessionId: string, studentId: string, focusData: any) => {
    return fetchWithAuth(`/focus/${sessionId}/${studentId}`, {
      method: 'POST',
      body: JSON.stringify(focusData)
    });
  },
  
  getStudentFocusData: async (sessionId: string, studentId: string) => {
    return fetchWithAuth(`/focus/${sessionId}/${studentId}`);
  },
  
  getClassFocusData: async (sessionId: string) => {
    return fetchWithAuth(`/focus/${sessionId}`);
  }
};

// Transcription
export const transcriptionService = {
  sendTranscription: async (sessionId: string, transcriptionData: any) => {
    return fetchWithAuth(`/transcription/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(transcriptionData)
    });
  },
  
  getSessionTranscription: async (sessionId: string) => {
    return fetchWithAuth(`/transcription/${sessionId}`);
  }
};

export default {
  auth: authService,
  session: sessionService,
  focus: focusService,
  transcription: transcriptionService
};