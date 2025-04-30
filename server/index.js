import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
// Update Socket.io CORS config
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", // Frontend port
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Update Express CORS config
app.use(cors({
  origin: "http://localhost:8080",
  credentials: true
}));

// Middleware
app.use(bodyParser.json());

// File paths
const DATA_DIR = path.join(process.cwd(), 'server/data');
const CLASSROOMS_FILE = path.join(DATA_DIR, 'classrooms.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const FOCUS_DATA_FILE = path.join(DATA_DIR, 'focusData.json');

// Helper functions for file operations
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]');
      return [];
    }
    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join-class', async ({ userId, name, classCode, isTeacher }) => {
    try {
      socket.join(classCode);
      
      if (!isTeacher) {
        const students = await readJsonFile(STUDENTS_FILE);
        const student = {
          userId,
          name,
          classCode,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        
        const existingIndex = students.findIndex(s => s.userId === userId && s.classCode === classCode);
        if (existingIndex >= 0) {
          students[existingIndex] = student;
        } else {
          students.push(student);
        }
        
        await writeJsonFile(STUDENTS_FILE, students);
        
        io.to(classCode).emit('student-joined', {
          userId: student.userId,
          name: student.name,
          joinedAt: student.joinedAt,
          focusScore: 1.0,
          attentivenessState: 'attentive',
          timeDistracted: 0,
          posture: 1.0
        });
      }
    } catch (error) {
      console.error('Error joining class:', error);
    }
  });
  
  socket.on('focus-update', async (data) => {
    try {
      const { userId, classCode, focusData } = data;
      
      const focusDataArray = await readJsonFile(FOCUS_DATA_FILE);
      const newFocusData = {
        userId,
        classCode,
        sessionId: focusData.sessionId,
        timestamp: new Date().toISOString(),
        attentionScore: focusData.attentionScore,
        posture: focusData.posture,
        timeDistracted: focusData.timeDistracted,
        facingCamera: focusData.facingCamera,
        eyeOpenness: focusData.eyeOpenness,
        mouthOpenness: focusData.mouthOpenness
      };
      
      focusDataArray.push(newFocusData);
      await writeJsonFile(FOCUS_DATA_FILE, focusDataArray);
      
      const students = await readJsonFile(STUDENTS_FILE);
      const student = students.find(s => s.userId === userId && s.classCode === classCode);
      if (student) {
        student.lastActive = new Date().toISOString();
        await writeJsonFile(STUDENTS_FILE, students);
        
        io.to(classCode).emit('student-update', {
          userId: student.userId,
          name: student.name,
          focusScore: focusData.attentionScore,
          attentivenessState: focusData.attentionScore > 0.65 ? "attentive" : 
                           focusData.attentionScore < 0.4 ? "distracted" : "neutral",
          timeDistracted: focusData.timeDistracted,
          posture: focusData.posture,
          eyeOpenness: focusData.eyeOpenness,
          mouthOpenness: focusData.mouthOpenness
        });
      }
    } catch (error) {
      console.error('Error processing focus update:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
app.post('/api/classroom', async (req, res) => {
  try {
    const { teacherId, name } = req.body;
    const classCode = 'FCS-' + Math.floor(1000 + Math.random() * 9000);
    
    const classrooms = await readJsonFile(CLASSROOMS_FILE);
    const newClassroom = {
      classCode,
      teacherId,
      name,
      createdAt: new Date().toISOString(),
      active: true
    };
    
    classrooms.push(newClassroom);
    await writeJsonFile(CLASSROOMS_FILE, classrooms);
    
    res.status(201).json({ 
      success: true, 
      classroom: newClassroom 
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create classroom' 
    });
  }
});

// Get classroom details
app.get('/api/classroom/:classCode', async (req, res) => {
  try {
    const { classCode } = req.params;
    
    const classrooms = await readJsonFile(CLASSROOMS_FILE);
    const classroom = classrooms.find(c => c.classCode === classCode);
    
    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Classroom not found' 
      });
    }
    
    const students = await readJsonFile(STUDENTS_FILE);
    const classroomStudents = students.filter(s => s.classCode === classCode);
    
    res.json({ 
      success: true, 
      classroom, 
      students: classroomStudents 
    });
  } catch (error) {
    console.error('Error fetching classroom:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch classroom details' 
    });
  }
});

// End a classroom session
app.post('/api/classroom/:classCode/end', async (req, res) => {
  try {
    const { classCode } = req.params;
    
    const classrooms = await readJsonFile(CLASSROOMS_FILE);
    const classroom = classrooms.find(c => c.classCode === classCode);
    
    if (classroom) {
      classroom.active = false;
      await writeJsonFile(CLASSROOMS_FILE, classrooms);
      
      io.to(classCode).emit('class-ended');
      
      res.json({ 
        success: true, 
        message: 'Classroom session ended' 
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }
  } catch (error) {
    console.error('Error ending classroom session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to end classroom session' 
    });
  }
});

// Session management routes
app.post('/api/sessions', async (req, res) => {
  try {
    const { userId, classCode, startTime } = req.body;
    
    // If classCode is provided, verify the classroom exists
    if (classCode) {
      const classrooms = await readJsonFile(CLASSROOMS_FILE);
      const classroom = classrooms.find(c => c.classCode === classCode);
      
      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found'
        });
      }
    }
    
    const sessions = await readJsonFile('server/data/sessions.json');
    const newSession = {
      id: Date.now().toString(),
      userId,
      classCode,
      startTime: startTime || new Date().toISOString(),
      active: true
    };
    
    sessions.push(newSession);
    await writeJsonFile('server/data/sessions.json', sessions);
    
    res.status(201).json({
      success: true,
      session: newSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
});

// Endpoint to receive individual focus data updates
app.post('/api/focus-data', async (req, res) => {
  try {
    const { userId, classCode, timestamp, focusData } = req.body;

    if (!userId || !timestamp || !focusData) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const focusDataArray = await readJsonFile(FOCUS_DATA_FILE);
    const newFocusEntry = {
      userId,
      classCode: classCode || null, // Handle optional classCode
      timestamp,
      ...focusData
    };

    focusDataArray.push(newFocusEntry);
    await writeJsonFile(FOCUS_DATA_FILE, focusDataArray);

    // Optionally, emit update via Socket.io if needed for real-time dashboard
    if (classCode) {
      // Find student name (optional, could be optimized)
      const students = await readJsonFile(STUDENTS_FILE);
      const student = students.find(s => s.userId === userId && s.classCode === classCode);
      
      io.to(classCode).emit('student-update', {
        userId: userId,
        name: student ? student.name : 'Unknown',
        focusScore: focusData.attentionScore,
        attentivenessState: focusData.attentionScore > 0.65 ? "attentive" : 
                         focusData.attentionScore < 0.4 ? "distracted" : "neutral",
        timeDistracted: focusData.timeDistracted,
        posture: focusData.posture,
        eyeOpenness: focusData.eyeOpenness,
        mouthOpenness: focusData.mouthOpenness
        // Add any other relevant fields from focusData
      });
    }

    res.status(201).json({ success: true, message: 'Focus data received' });

  } catch (error) {
    console.error('Error receiving focus data:', error);
    res.status(500).json({ success: false, message: 'Failed to process focus data' });
  }
});

// Endpoint to receive batched focus data updates (for offline retry)
app.post('/api/focus-data/batch', async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid batch data' });
    }

    const focusDataArray = await readJsonFile(FOCUS_DATA_FILE);
    
    // Simple append, could add validation or merging logic if needed
    const processedData = data.map(item => ({
      userId: item.userId,
      classCode: item.classCode || null,
      timestamp: item.timestamp,
      ...item.focusData
    }));

    focusDataArray.push(...processedData);
    await writeJsonFile(FOCUS_DATA_FILE, focusDataArray);

    console.log(`Received batch of ${data.length} focus data entries.`);
    res.status(200).json({ success: true, message: 'Batch focus data received' });

  } catch (error) {
    console.error('Error receiving batch focus data:', error);
    res.status(500).json({ success: false, message: 'Failed to process batch focus data' });
  }
});


// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});