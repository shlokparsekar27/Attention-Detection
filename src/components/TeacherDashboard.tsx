import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, BookOpen, CheckCircle, Copy, Eye, EyeOff, Lightbulb, Users, ArrowLeft } from "lucide-react";
import ClassroomInsights from './ClassroomInsights';
import useClassroomConnection from '@/hooks/useClassroomConnection';
import apiService from "@/services/apiService";
import websocketService from "@/services/websocketService";
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Get user ID from localStorage or context
const getUserId = () => localStorage.getItem('user_id') || 'teacher-' + Math.random().toString(36).substring(2, 9);
const getUserName = () => localStorage.getItem('user_name') || 'Teacher';

// Student interface
interface Student {
  id: string;
  name: string;
  focusScore: number;
  posture: number;
  timeDistracted: number;
  attentivenessState: "attentive" | "distracted" | "unknown";
  joinedAt: number;
  lastUpdate: number;
}

// Mock student data for testing
const MOCK_STUDENTS: Student[] = [
  {
    id: 'student-1',
    name: 'Sanket Naik',
    focusScore: 0.85,
    posture: 0.9,
    timeDistracted: 0,
    attentivenessState: 'attentive',
    joinedAt: Date.now(),
    lastUpdate: Date.now()
  },
  {
    id: 'student-2',
    name: 'Shlok Parsekar',
    focusScore: 0.65,
    posture: 0.7,
    timeDistracted: 15,
    attentivenessState: 'attentive',
    joinedAt: Date.now(),
    lastUpdate: Date.now()
  },
  {
    id: 'student-3',
    name: 'Harshal Mardolkar',
    focusScore: 0.35,
    posture: 0.5,
    timeDistracted: 45,
    attentivenessState: 'distracted',
    joinedAt: Date.now(),
    lastUpdate: Date.now()
  },
  {
    id:'student-4',
    name: 'Om Mayekar',
    focusScore: 0.25,
    posture: 0.3,
    timeDistracted: 90,
    attentivenessState: 'distracted',
    joinedAt: Date.now(),
    lastUpdate: Date.now()
  },{
    id:'student-5',
    name: 'Gautam',
    focusScore: 0.25,
    posture: 0.9,
    timeDistracted: 60,
    attentivenessState: 'distracted',
    joinedAt: Date.now(),
    lastUpdate: Date.now()
  }
 
  
];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [sessionActive, setSessionActive] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const { toast } = useToast();
  const [teacherId, setTeacherId] = useState("teacher-" + Math.random().toString(36).substring(2, 9));
  
  // Initialize WebSocket when component mounts
  useEffect(() => {
    // Initialize WebSocket as teacher
    websocketService.init(teacherId, true);
    
    // Setup WebSocket event listeners
    websocketService.on('student-joined', handleStudentJoined);
    websocketService.on('student-left', handleStudentLeft);
    websocketService.on('focus-update', handleFocusUpdate);
    
    // Cleanup on unmount
    return () => {
      if (sessionActive) {
        endSession();
      }
      
      websocketService.off('student-joined', handleStudentJoined);
      websocketService.off('student-left', handleStudentLeft);
      websocketService.off('focus-update', handleFocusUpdate);
      websocketService.disconnect();
    };
  }, []);
  
  // Add effect for random updates - MOVED FROM OUTSIDE THE COMPONENT
  useEffect(() => {
    if (!sessionActive) return;

    // Initialize with mock data when session starts
    setStudents(MOCK_STUDENTS);

    const updateInterval = setInterval(() => {
      setStudents(prev => prev.map(student => {
        // Generate random changes with more realistic patterns
        const focusChange = (Math.random() - 0.5) * 0.1; // Smaller changes: -0.05 to +0.05
        const postureChange = (Math.random() - 0.5) * 0.15; // Slightly larger posture variations
        const distractionChange = Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0; // Less frequent distractions

        // Calculate new values with smoother transitions
        const newFocusScore = Math.max(0.2, Math.min(1.0, student.focusScore + focusChange));
        const newPosture = Math.max(0.3, Math.min(1.0, student.posture + postureChange));
        const newTimeDistracted = student.attentivenessState === 'distracted' 
          ? student.timeDistracted + distractionChange 
          : Math.max(0, student.timeDistracted - 1); // Gradually reduce distraction time when attentive

        // Determine attentiveness state with hysteresis to prevent rapid switching
        const attentivenessState = 
          student.attentivenessState === 'attentive' && newFocusScore > 0.35 ? 'attentive' :
          student.attentivenessState === 'distracted' && newFocusScore < 0.7 ? 'distracted' :
          newFocusScore > 0.65 ? 'attentive' :
          newFocusScore < 0.4 ? 'distracted' :
          student.attentivenessState;

        return {
          ...student,
          focusScore: newFocusScore,
          posture: newPosture,
          timeDistracted: newTimeDistracted,
          attentivenessState,
          lastUpdate: Date.now()
        };
      }));
    }, 3000); // Update more frequently (every 3 seconds)

    return () => clearInterval(updateInterval);
  }, [sessionActive]);
  
  // Handle student joined event
  const handleStudentJoined = (data: any) => {
    const { userId, name } = data;
    
    setStudents(prev => {
      // Check if student already exists
      if (prev.some(s => s.id === userId)) {
        return prev;
      }
      
      // Add new student
      return [...prev, {
        id: userId,
        name: name || `Student ${prev.length + 1}`,
        focusScore: 1.0,
        posture: 1.0,
        timeDistracted: 0,
        attentivenessState: "unknown",
        joinedAt: Date.now(),
        lastUpdate: Date.now()
      }];
    });
    
    toast({
      title: "Student joined",
      description: `${name || "A new student"} has joined the class`,
    });
  };
  
  // Handle student left event
  const handleStudentLeft = (data: any) => {
    const { userId, name } = data;
    
    setStudents(prev => prev.filter(s => s.id !== userId));
    
    toast({
      title: "Student left",
      description: `${name || "A student"} has left the class`,
    });
  };
  
  // Handle focus update event
  const handleFocusUpdate = (data: any) => {
    const { userId, attentionScore, posture, timeDistracted } = data;
    
    setStudents(prev => 
      prev.map(student => {
        if (student.id !== userId) return student;
        
        // Calculate attentiveness state
        const attentivenessState = attentionScore > 0.65 ? "attentive" : 
                                  attentionScore < 0.4 ? "distracted" : 
                                  student.attentivenessState;
        
        return {
          ...student,
          focusScore: attentionScore,
          posture,
          timeDistracted,
          attentivenessState,
          lastUpdate: Date.now()
        };
      })
    );
  };
  
  // Start a new class session
  const startSession = async () => {
    try {
      // Create classroom on backend
      const response = await apiService.createClassroom(teacherId);
      const { classCode: newCode } = response;
      
      setClassCode(newCode);
      setSessionActive(true);
      
      // Join classroom in WebSocket
      websocketService.joinClassroom(newCode);
      
      // toast({
      //   title: "Class session started",
      //   description: "Share the class code with your students to begin",
      // });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        variant: "destructive",
        title: "Failed to start session",
        description: "Please try again later",
      });
    }
  };
  
  // End the current class session
  const endSession = async () => {
    if (!sessionActive) return;
    
    try {
      // End classroom in WebSocket
      websocketService.endClassroom();
      
      setSessionActive(false);
      setStudents([]);
      
      toast({
        title: "Class session ended",
        description: "All student connections have been closed",
      });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        variant: "destructive",
        title: "Failed to end session",
        description: "Please try again later",
      });
    }
  };
  
  // Copy class code to clipboard
  const copyClassCode = () => {
    navigator.clipboard.writeText(classCode);
    
    toast({
      title: "Class code copied",
      description: "You can now share it with your students",
    });
  };
  
  // Helper function to get focus level color
  const getFocusLevel = (score: number) => {
    if (score > 0.7) return "bg-green-500";
    if (score > 0.4) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor student focus and engagement in real-time
            </p>
          </div>
        </div>
        <div>
          {sessionActive ? (
            <Button variant="destructive" onClick={endSession}>
              End Session
            </Button>
          ) : (
            <Button onClick={startSession}>
              Start Class Session
            </Button>
          )}
        </div>
      </div>

      {sessionActive && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Class Session</CardTitle>
              <CardDescription>
                Share this code with your students to join the session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-md px-3 py-1 border">
                  <code className="text-sm font-mono">{classCode}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 w-6 p-0"
                    onClick={copyClassCode}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="sr-only">Copy code</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs 
        defaultValue="dashboard" 
        value={selectedTab} 
        onValueChange={setSelectedTab}
        className="mx-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">
            <BookOpen className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-xs text-muted-foreground">
                  {sessionActive ? 'Currently connected' : 'Maximum capacity'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Focus Score
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {students.length > 0 
                    ? Math.round(students.reduce((sum, student) => sum + student.focusScore, 0) / students.length * 100) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {students.length > 0 
                    ? `Based on ${students.length} students` 
                    : 'No active students'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Distracted Students
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {students.filter(s => s.attentivenessState === "distracted").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {students.length > 0 
                    ? `${Math.round(students.filter(s => s.attentivenessState === "distracted").length / students.length * 100)}% of class` 
                    : 'No active students'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Attentive Students
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M12 2v20M2 12h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {students.filter(s => s.attentivenessState === "attentive").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {students.length > 0 
                    ? `${Math.round(students.filter(s => s.attentivenessState === "attentive").length / students.length * 100)}% of class` 
                    : 'No active students'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-1">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Student Focus Monitoring</CardTitle>
                <CardDescription>
                  Real-time focus and attentiveness tracking for your students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {students.length > 0 ? (
                  <div className="space-y-4">
                    {students.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            student.attentivenessState === "attentive" ? "bg-green-500" :
                            student.attentivenessState === "distracted" ? "bg-red-500" : "bg-yellow-500"
                          }`} />
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.timeDistracted > 0 ? `Distracted for ${student.timeDistracted}s` : 'Fully attentive'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-4">
                            <p className="text-xs text-muted-foreground mb-1">Focus Score</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  student.focusScore > 0.7 ? "bg-green-500" :
                                  student.focusScore > 0.4 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${student.focusScore * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Posture</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  student.posture > 0.7 ? "bg-green-500" :
                                  student.posture > 0.4 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${student.posture * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No students connected</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sessionActive 
                        ? 'Waiting for students to join using the class code' 
                        : 'Start a class session to connect with students'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="insights" className="mt-4">
          <ClassroomInsights classData={students} isLive={sessionActive} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;