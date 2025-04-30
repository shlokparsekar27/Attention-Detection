const API_BASE_URL = 'http://localhost:3001/api';

// Interface for focus data
interface FocusData {
  userId: string;
  sessionId: string;
  timestamp: number;
  attentionScore: number;
  posture: number;
  timeDistracted: number;
}

// Interface for session data
interface SessionData {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  transcription?: string;
  summary?: any;
}

// Interface for classroom data
interface ClassroomData {
  classCode: string;
  teacherId: string;
  startTime: number;
  endTime?: number;
  students?: string[];
}

// API service
const apiService = {
  // User authentication
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Session management
  async startSession(userId: string, classCode?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          classCode,
          startTime: Date.now()
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start session');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Start session error:', error);
      throw error;
    }
  },
  
  async endSession(sessionId: string, summary: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          endTime: Date.now(),
          summary
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to end session');
      }
      
      return await response.json();
    } catch (error) {
      console.error('End session error:', error);
      throw error;
    }
  },
  
  // Focus data
  async sendFocusData(focusData: FocusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/focus-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(focusData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to send focus data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Send focus data error:', error);
      // Don't throw, just log error to prevent disrupting the user experience
      return null;
    }
  },
  
  // Classroom management
  // Update API calls to include credentials
  async createClassroom(teacherId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/classroom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ teacherId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create classroom');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create classroom error:', error);
      throw error;
    }
  },
  
  async joinClassroom(classCode: string, studentId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/classroom/${classCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: studentId,
          name: 'Student'
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to join classroom');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Join classroom error:', error);
      throw error;
    }
  },
  
  async getClassroomStudents(classCode: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/classroom/${classCode}/students`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get classroom students');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get classroom students error:', error);
      throw error;
    }
  }
};

export default apiService;