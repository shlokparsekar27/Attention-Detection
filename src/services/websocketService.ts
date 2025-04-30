import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

class WebSocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private isTeacher: boolean = false;
  private classCode: string | null = null;
  private eventHandlers: Record<string, Function[]> = {};

  // Initialize socket connection
  init(userId: string, isTeacher: boolean = false) {
    this.userId = userId;
    this.isTeacher = isTeacher;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL);

    // Setup default event listeners
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Forward events to registered handlers
    ['student-joined', 'student-left', 'focus-update', 'class-ended', 'session-created'].forEach(event => {
      this.socket.on(event, (data) => {
        this.triggerEvent(event, data);
      });
    });

    return this.socket;
  }

  // Register event handler
  on(event: string, callback: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  // Remove event handler
  off(event: string, callback: Function) {
    if (!this.eventHandlers[event]) return;
    
    this.eventHandlers[event] = this.eventHandlers[event].filter(
      handler => handler !== callback
    );
  }

  // Trigger event handlers
  private triggerEvent(event: string, data: any) {
    if (!this.eventHandlers[event]) return;
    
    this.eventHandlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  // Join a classroom
  joinClassroom(classCode: string) {
    if (!this.socket || !this.userId) return;
    
    this.classCode = classCode;
    
    this.socket.emit('join-classroom', {
      classCode,
      userId: this.userId,
      userName: this.isTeacher ? 'Teacher' : 'Student',
      isTeacher: this.isTeacher
    });
  }

  // Leave a classroom
  leaveClassroom() {
    if (!this.socket || !this.userId || !this.classCode) return;
    
    this.socket.emit('leave-classroom', {
      classCode: this.classCode,
      userId: this.userId,
      userName: this.isTeacher ? 'Teacher' : 'Student'
    });
    
    this.classCode = null;
  }

  // Send focus update (for students)
  sendFocusUpdate(focusData: any) {
    if (!this.socket || !this.userId || !this.classCode || this.isTeacher) return;
    
    this.socket.emit('focus-update', {
      userId: this.userId,
      classCode: this.classCode,
      focusData
    });
  }

  // Create a classroom session (for teachers)
  createClassroom() {
    if (!this.socket || !this.userId || !this.isTeacher) return;
    
    this.socket.emit('create-session', {
      teacherId: this.userId
    });
  }

  // End a classroom session (for teachers)
  endClassroom() {
    if (!this.socket || !this.userId || !this.isTeacher || !this.classCode) return;
    
    this.socket.emit('end-session', {
      sessionId: this.classCode
    });
    
    this.classCode = null;
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.classCode = null;
    this.eventHandlers = {};
  }
}

export default new WebSocketService();