import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
// Add to package.json: "socket.io-client": "^4.7.2"
// Run: npm install socket.io-client
import { useToast } from '@/hooks/use-toast';

interface Student {
  id: string;
  name: string;
  focusScore: number;
  posture: number;
  timeDistracted: number;
  attentivenessState: 'attentive' | 'distracted' | 'unknown';
  joinedAt: string;
}

interface UseClassroomConnectionProps {
  classCode: string;
  isTeacher: boolean;
  userId: string;
  userName: string;
  enabled: boolean;
}

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

const useClassroomConnection = ({
  classCode,
  isTeacher,
  userId,
  userName,
  enabled
}: UseClassroomConnectionProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Connect to socket server
  useEffect(() => {
    if (!enabled || !classCode) return;

    const newSocket = io(SOCKET_URL, {
      query: {
        classCode,
        userId,
        userName,
        isTeacher: isTeacher ? 'true' : 'false'
      }
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to classroom socket');
      
      // Join classroom
      newSocket.emit('join-classroom', { classCode, userId, userName, isTeacher });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from classroom socket');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to connect to classroom server'
      });
    });

    newSocket.on('session-created', (data) => {
      setSessionId(data.sessionId);
      toast({
        title: 'Class Session Created',
        description: `Class code: ${data.classCode}`
      });
    });

    newSocket.on('student-joined', (student) => {
      if (isTeacher) {
        setStudents(prev => {
          // Check if student already exists
          if (prev.some(s => s.id === student.id)) {
            return prev;
          }
          return [...prev, student];
        });
        toast({
          title: 'Student Joined',
          description: `${student.name} has joined the class`
        });
      }
    });

    newSocket.on('student-left', (studentId) => {
      if (isTeacher) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
      }
    });

    newSocket.on('student-update', (data) => {
      if (isTeacher) {
        setStudents(prev => {
          return prev.map(student => {
            if (student.id === data.id) {
              return {
                ...student,
                focusScore: data.focusScore,
                posture: data.posture,
                timeDistracted: data.timeDistracted,
                attentivenessState: data.attentivenessState
              };
            }
            return student;
          });
        });
      }
    });

    newSocket.on('class-ended', () => {
      setStudents([]);
      setSessionId(null);
      toast({
        title: 'Class Session Ended',
        description: 'The teacher has ended the class session'
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [classCode, isTeacher, userId, userName, enabled, toast]);

  // Send focus update (for students)
  const sendFocusUpdate = useCallback((focusData: any) => {
    if (!socket || !connected || isTeacher) return;
    
    socket.emit('focus-update', {
      userId,
      classCode,
      focusData
    });
  }, [socket, connected, isTeacher, classCode, userId]);

  // Create a new session (for teachers)
  const createSession = useCallback(() => {
    if (!socket || !connected || !isTeacher) return;
    
    socket.emit('create-session', { teacherId: userId });
  }, [socket, connected, isTeacher, userId]);

  // End a session (for teachers)
  const endSession = useCallback(() => {
    if (!socket || !connected || !isTeacher || !sessionId) return;
    
    socket.emit('end-session', { sessionId });
  }, [socket, connected, isTeacher, sessionId]);

  return {
    connected,
    students,
    sessionId,
    sendFocusUpdate,
    createSession,
    endSession
  };
};

export default useClassroomConnection;