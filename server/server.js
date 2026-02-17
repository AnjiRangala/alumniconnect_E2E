import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { MentorshipRequest } from './models/MentorshipRequest.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-key-12345';
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('⚠️  Running with in-memory storage (MongoDB connection failed)');
    });
} else {
  console.log('⚠️  MONGODB_URI not found in .env file');
  console.log('📝 Add your MongoDB connection string to .env file to enable persistence');
}

// Alumni Connect Users Data (in-memory storage fallback)
const users = [];
let userIdCounter = 1;

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Mentors are now dynamically fetched from the database (User collection where userType='alumni')

// Events are now dynamically fetched from the database

// Jobs are now dynamically fetched from the database

// POST /api/auth/register - Register a new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, userType, company, skills } = req.body;

    // Validation
    if (!fullName || !email || !password || !userType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if user already exists
    let existingUser = null;
    if (mongoose.connection.readyState === 1) {
      // Using MongoDB
      existingUser = await User.findOne({ email });
    } else {
      // Fallback to in-memory storage
      existingUser = users.find(u => u.email === email);
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    let newUser;

    if (mongoose.connection.readyState === 1) {
      // Save to MongoDB
      newUser = new User({
        fullName,
        email,
        password,
        userType,
        company: company || null,
        skills: skills ? skills.split(',').map(s => s.trim()) : []
      });
      await newUser.save();
    } else {
      // Fallback to in-memory storage
      const hashedPassword = await bcrypt.hash(password, 10);
      newUser = {
        id: userIdCounter++,
        fullName,
        email,
        password: hashedPassword,
        userType,
        company: company || null,
        skills: skills ? skills.split(',').map(s => s.trim()) : [],
        registrationDate: new Date().toISOString()
      };
      users.push(newUser);
    }

    // Generate JWT token
    const tokenData = {
      id: newUser._id || newUser.id,
      email: newUser.email
    };
    const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '24h' });

    // Return user data without password
    const userResponse = {
      _id: newUser._id || newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      userType: newUser.userType,
      company: newUser.company,
      skills: newUser.skills,
      registrationDate: newUser.registrationDate || new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: userResponse, token }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// POST /api/mentorship/requests - create a mentorship request (student)
app.post('/api/mentorship/requests', verifyToken, async (req, res) => {
  try {
    const { topic, note, mentorId, mentorName } = req.body;
    const studentId = req.userId;
    if (!studentId) return res.status(401).json({ success:false, message: 'Unauthorized' });
    if (!mentorId) return res.status(400).json({ success:false, message: 'Mentor ID required' });
    const mentorIdString = String(mentorId);
    
    // find user to get name
    let student = null;
    if (mongoose.connection.readyState === 1) {
      student = await User.findById(studentId);
    } else {
      student = users.find(u=>u.id==studentId);
    }

    const studentName = student?.fullName || (student?.name || 'Student');

    if (mongoose.connection.readyState === 1) {
      const existingRequest = await MentorshipRequest.findOne({
        studentId,
        mentorId: mentorIdString,
        status: { $in: ['pending', 'accepted', 'declined'] }
      }).lean();

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: existingRequest.status === 'accepted'
            ? 'You are already under this mentor.'
            : existingRequest.status === 'declined'
              ? 'This mentor has declined your request.'
              : 'You have already sent a request to this mentor.'
        });
      }

      // Store mentorId as string to match the mentor data structure
      const r = await MentorshipRequest.create({ 
        studentId, 
        studentName, 
        mentorId: mentorIdString, 
        mentorName: mentorName || 'Mentor',
        topic, 
        note 
      });
      return res.json({ success:true, data: r });
    }

    // in-memory fallback
    const allRequests = app.locals.mentorshipRequests || [];
    const existingRequest = allRequests.find(r =>
      String(r.studentId) === String(studentId) &&
      String(r.mentorId) === mentorIdString &&
      ['pending', 'accepted', 'declined'].includes(r.status)
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: existingRequest.status === 'accepted'
          ? 'You are already under this mentor.'
          : existingRequest.status === 'declined'
            ? 'This mentor has declined your request.'
            : 'You have already sent a request to this mentor.'
      });
    }

    const fallback = { 
      id: `r_${Date.now()}`, 
      studentId, 
      studentName, 
      mentorId: mentorIdString,
      mentorName: mentorName || 'Mentor',
      topic, 
      note, 
      status: 'pending', 
      createdAt: new Date() 
    };
    // store in array on app locals
    app.locals.mentorshipRequests = app.locals.mentorshipRequests || [];
    app.locals.mentorshipRequests.push(fallback);
    return res.json({ success:true, data: fallback });
  } catch (err) {
    console.error('Error creating mentorship request', err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

// GET /api/mentorship/requests - list mentorship requests for logged-in alumni/mentor
app.get('/api/mentorship/requests', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.userId;
    
    // Get user info to check if they're a mentor and get their mentor profile ID
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(currentUserId);
    } else {
      user = users.find(u => (u._id || u.id) === currentUserId || u.id === parseInt(currentUserId));
    }

    // For now, match by user's profile data - in production, you'd have a proper mentor-user mapping
    // Alumni can see requests where mentorId matches their account ID or user ID
    const mentorIds = [String(currentUserId), String(user?.id), String(user?._id)].filter(Boolean);
    
    if (mongoose.connection.readyState === 1) {
      // Filter requests for this specific mentor
      const list = await MentorshipRequest.find({ 
        mentorId: { $in: mentorIds } 
      }).sort({ createdAt: -1 }).lean();
      return res.json({ success:true, data: list });
    }
    
    // In-memory fallback - filter by mentorId
    const allRequests = app.locals.mentorshipRequests || [];
    const list = allRequests.filter(r => mentorIds.includes(String(r.mentorId)));
    return res.json({ success:true, data: list });
  } catch (err) {
    console.error('Error listing mentorship requests', err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

// GET /api/mentorship/my-requests - get student's own requests
app.get('/api/mentorship/my-requests', verifyToken, async (req, res) => {
  try {
    const studentId = req.userId;
    if (mongoose.connection.readyState === 1) {
      const list = await MentorshipRequest.find({ studentId }).sort({ createdAt: -1 }).lean();
      return res.json({ success:true, data: list });
    }
    const list = (app.locals.mentorshipRequests || []).filter(r => r.studentId === studentId);
    return res.json({ success:true, data: list });
  } catch (err) {
    console.error('Error listing my requests', err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

// PUT /api/mentorship/my-requests/:id - edit student's own request
app.put('/api/mentorship/my-requests/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { topic, note } = req.body;
    const studentId = req.userId;

    if (!topic || !note) {
      return res.status(400).json({ success: false, message: 'Topic and note are required' });
    }

    if (mongoose.connection.readyState === 1) {
      const request = await MentorshipRequest.findOne({ _id: id, studentId });
      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found or unauthorized' });
      }

      // Only allow editing if status is pending
      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot edit accepted or declined requests' });
      }

      request.topic = topic;
      request.note = note;
      await request.save();

      return res.json({ success: true, data: request });
    }

    // In-memory fallback
    const list = app.locals.mentorshipRequests || [];
    const requestIndex = list.findIndex(r => (r.id === id || r._id === id) && r.studentId === studentId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Request not found or unauthorized' });
    }

    if (list[requestIndex].status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot edit accepted or declined requests' });
    }

    list[requestIndex].topic = topic;
    list[requestIndex].note = note;

    return res.json({ success: true, data: list[requestIndex] });
  } catch (err) {
    console.error('Error updating request', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/mentorship/my-requests/:id - delete student's own request
app.delete('/api/mentorship/my-requests/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.userId;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID format' });
    }

    if (mongoose.connection.readyState === 1) {
      const request = await MentorshipRequest.findOne({ _id: id, studentId });
      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found or unauthorized' });
      }

      // Allow deleting pending or declined requests (accepted ones should remain as history)
      if (request.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Cannot delete accepted mentorship requests' });
      }

      await MentorshipRequest.deleteOne({ _id: id });
      return res.json({ success: true, message: 'Request deleted successfully' });
    }

    // In-memory fallback
    const list = app.locals.mentorshipRequests || [];
    const requestIndex = list.findIndex(r => (r.id === id || r._id === id) && r.studentId === studentId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Request not found or unauthorized' });
    }

    if (list[requestIndex].status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Cannot delete accepted mentorship requests' });
    }

    app.locals.mentorshipRequests.splice(requestIndex, 1);
    return res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) {
    console.error('Error deleting request', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/mentees - list mentees for the logged-in alumni
app.get('/api/mentees', verifyToken, async (req, res) => {
  try {
    const mentorId = req.userId
    if (mongoose.connection.readyState === 1) {
      // find accepted mentorships where mentorId === current
      const docs = await MentorshipRequest.find({ mentorId, status: 'accepted' }).lean()
      const studentIds = docs.map(d=>d.studentId)
      const students = await User.find({ _id: { $in: studentIds } }).select('-password').lean()
      // build simple stats per student
      const data = students.map(s=>({ _id: s._id, fullName: s.fullName, sessions: s.sessions || 0, sessionsGoal: 10, progress: ((s.sessions||0)/10), userId: s._id }))
      return res.json({ success:true, data })
    }
    // in-memory fallback
    const list = (app.locals.mentorshipRequests || []).filter(r => r.mentorId === mentorId && r.status === 'accepted')
    const data = list.map(l => ({ id: l.studentId, fullName: l.studentName, sessions: 0, sessionsGoal:10, progress:0 }))
    return res.json({ success:true, data })
  } catch (err) {
    console.error('Error listing mentees', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// POST /api/mentees/:id/note - add an internal note to a mentee (mentor)
app.post('/api/mentees/:id/note', verifyToken, async (req, res) => {
  try {
    const mentorId = req.userId
    const { id } = req.params
    const { body } = req.body
    if (!body) return res.status(400).json({ success:false, message: 'Missing body' })
    if (mongoose.connection.readyState === 1) {
      const mentee = await User.findById(id)
      if (!mentee) return res.status(404).json({ success:false, message: 'Mentee not found' })
      mentee.notes = mentee.notes || []
      mentee.notes.push({ fromId: mentorId, fromName: 'Mentor', body, createdAt: new Date() })
      await mentee.save()
      return res.json({ success:true, message: 'Note added' })
    }
    const u = users.find(x=>String(x.id)===String(id))
    if (!u) return res.status(404).json({ success:false, message: 'Mentee not found' })
    u.notes = u.notes || []
    u.notes.push({ fromId: mentorId, fromName: 'Mentor', body, createdAt: new Date() })
    return res.json({ success:true, message: 'Note added (in-memory)' })
  } catch (err) {
    console.error('Error adding note', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// POST /api/mentees/:id/task - assign a task to a mentee
app.post('/api/mentees/:id/task', verifyToken, async (req, res) => {
  try {
    const mentorId = req.userId
    const { id } = req.params
    const { title, due } = req.body
    if (!title) return res.status(400).json({ success:false, message: 'Missing title' })
    if (mongoose.connection.readyState === 1) {
      const mentee = await User.findById(id)
      if (!mentee) return res.status(404).json({ success:false, message: 'Mentee not found' })
      mentee.tasks = mentee.tasks || []
      mentee.tasks.push({ title, due: due ? new Date(due) : null, completed: false, createdAt: new Date() })
      await mentee.save()
      return res.json({ success:true, message: 'Task assigned' })
    }
    const u = users.find(x=>String(x.id)===String(id))
    if (!u) return res.status(404).json({ success:false, message: 'Mentee not found' })
    u.tasks = u.tasks || []
    u.tasks.push({ title, due: due?new Date(due):null, completed:false, createdAt: new Date() })
    return res.json({ success:true, message: 'Task assigned (in-memory)' })
  } catch (err) {
    console.error('Error assigning task', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// POST /api/mentees/:id/complete - mark a session complete for mentee (increments sessions)
app.post('/api/mentees/:id/complete', verifyToken, async (req, res) => {
  try {
    const mentorId = req.userId
    const { id } = req.params
    if (mongoose.connection.readyState === 1) {
      const mentee = await User.findById(id)
      if (!mentee) return res.status(404).json({ success:false, message: 'Mentee not found' })
      mentee.sessions = (mentee.sessions || 0) + 1
      await mentee.save()
      return res.json({ success:true, message: 'Session marked complete', sessions: mentee.sessions })
    }
    const u = users.find(x=>String(x.id)===String(id))
    if (!u) return res.status(404).json({ success:false, message: 'Mentee not found' })
    u.sessions = (u.sessions || 0) + 1
    return res.json({ success:true, message: 'Session marked complete (in-memory)', sessions: u.sessions })
  } catch (err) {
    console.error('Error marking complete', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// GET /api/mentees/:id/export - export mentee data as CSV
app.get('/api/mentees/:id/export', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    let s = null
    if (mongoose.connection.readyState === 1) {
      s = await User.findById(id).lean()
    } else {
      s = users.find(x=>String(x.id)===String(id))
    }
    if (!s) return res.status(404).json({ success:false, message: 'Mentee not found' })
    const rows = [ ['Name','Email','Sessions','AvgRating','LastActive'] ]
    rows.push([ s.fullName || s.name || '', s.email || '', String(s.sessions || 0), String(s.avgRating || 0), s.lastActive ? new Date(s.lastActive).toISOString() : '' ])
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="mentee-${id}.csv"`)
    return res.send(csv)
  } catch (err) {
    console.error('Error exporting CSV', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// POST /api/mentees/:id/message - send a message from mentor to mentee
app.post('/api/mentees/:id/message', verifyToken, async (req, res) => {
  try {
    const mentorId = req.userId
    const { id } = req.params
    const { body } = req.body
    if (!body) return res.status(400).json({ success:false, message: 'Missing body' })
    if (mongoose.connection.readyState === 1) {
      const mentee = await User.findById(id)
      if (!mentee) return res.status(404).json({ success:false, message: 'Mentee not found' })
      mentee.messages = mentee.messages || []
      mentee.messages.push({ fromId: mentorId, fromName: 'Mentor', subject: 'Message from mentor', body, createdAt: new Date() })
      mentee.notifications = mentee.notifications || []
      mentee.notifications.push({ type:'message', message:'You have a new message from your mentor', actorId: mentorId, createdAt: new Date() })
      await mentee.save()
      return res.json({ success:true, message: 'Message sent' })
    }
    const u = users.find(x=>String(x.id)===String(id))
    if (!u) return res.status(404).json({ success:false, message: 'Mentee not found' })
    u.messages = u.messages || []
    u.messages.push({ fromId: mentorId, fromName: 'Mentor', subject: 'Message from mentor', body, createdAt: new Date() })
    return res.json({ success:true, message: 'Message queued (in-memory)' })
  } catch (err) {
    console.error('Error sending message', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// POST /api/mentees/:id/schedule - schedule a session (simple placeholder)
app.post('/api/mentees/:id/schedule', verifyToken, async (req, res) => {
  try {
    const mentorId = req.userId
    const { id } = req.params
    const { date } = req.body
    // In a real app you'd create a calendar event; here we'll add a notification
    if (mongoose.connection.readyState === 1) {
      const mentee = await User.findById(id)
      if (!mentee) return res.status(404).json({ success:false, message: 'Mentee not found' })
      mentee.notifications = mentee.notifications || []
      mentee.notifications.push({ type:'session', message:`Mentor scheduled a session on ${date}`, actorId: mentorId, createdAt: new Date() })
      await mentee.save()
      return res.json({ success:true, message: 'Session scheduled' })
    }
    const u = users.find(x=>String(x.id)===String(id))
    if (!u) return res.status(404).json({ success:false, message: 'Mentee not found' })
    u.notifications = u.notifications || []
    u.notifications.push({ type:'session', message:`Mentor scheduled a session on ${date}`, actorId: mentorId, createdAt: new Date() })
    return res.json({ success:true, message: 'Session scheduled (in-memory)' })
  } catch (err) {
    console.error('Error scheduling', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// GET /api/mentees/:id/analytics - simple analytics for a mentee
app.get('/api/mentees/:id/analytics', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    if (mongoose.connection.readyState === 1) {
      const s = await User.findById(id).lean()
      if (!s) return res.status(404).json({ success:false, message: 'Mentee not found' })
      const data = {
        name: s.fullName,
        sessionsCompleted: s.sessions || 0,
        avgRating: s.avgRating || 0,
        lastActive: s.lastActive ? new Date(s.lastActive).toLocaleString() : 'N/A'
      }
      return res.json({ success:true, data })
    }
    const u = users.find(x=>String(x.id)===String(id))
    if (!u) return res.status(404).json({ success:false, message: 'Mentee not found' })
    const data = { name: u.fullName || u.name, sessionsCompleted: u.sessions || 0, avgRating: u.avgRating || 0, lastActive: 'N/A' }
    return res.json({ success:true, data })
  } catch (err) {
    console.error('Error fetching analytics', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// PUT /api/mentorship/requests/:id/respond - accept/decline a request
app.put('/api/mentorship/requests/:id/respond', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, response } = req.body; // action: 'accept' | 'decline'
    const mentorId = req.userId;
    if (!['accept','decline'].includes(action)) return res.status(400).json({ success:false, message: 'Invalid action' });

    if (mongoose.connection.readyState === 1) {
      const reqDoc = await MentorshipRequest.findById(id);
      if (!reqDoc) return res.status(404).json({ success:false, message: 'Request not found' });
      reqDoc.status = action === 'accept' ? 'accepted' : 'declined';
      reqDoc.mentorId = mentorId;
      if (response) reqDoc.mentorResponse = response;
      await reqDoc.save();

      // add notification to student
      const student = await User.findById(reqDoc.studentId);
      if (student) {
        student.notifications = student.notifications || [];
        student.notifications.push({ type: 'mentorship_response', message: `Your mentorship request was ${reqDoc.status}`, actorId: mentorId, createdAt: new Date() });
        await student.save();
      }

      return res.json({ success:true, data: reqDoc });
    }

    // in-memory fallback
    app.locals.mentorshipRequests = app.locals.mentorshipRequests || [];
    const list = app.locals.mentorshipRequests;
    const idx = list.findIndex(x=>x.id==id);
    if (idx === -1) return res.status(404).json({ success:false, message: 'Request not found' });
    list[idx].status = action === 'accept' ? 'accepted' : 'declined';
    list[idx].mentorId = mentorId;
    list[idx].mentorResponse = response || '';
    return res.json({ success:true, data: list[idx] });
  } catch (err) {
    console.error('Error responding to mentorship request', err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

// GET /api/users/:id - get public user profile by id
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success:false, message: 'Invalid user ID format' });
      }
      const user = await User.findById(id).select('-password').lean();
      if (!user) return res.status(404).json({ success:false, message: 'User not found' });
      return res.json({ success:true, data: user });
    }
    const u = users.find(x=>String(x.id) === String(id));
    if (!u) return res.status(404).json({ success:false, message: 'User not found' });
    return res.json({ success:true, data: u });
  } catch (err) {
    console.error('Error fetching user by id', err);
    return res.status(500).json({ success:false, message: 'Server error' });
  }
});

// Badge definitions (simple catalogue)
const BADGE_DEFINITIONS = [
  { key: 'mentor_starter', name: 'Mentor Starter', description: 'Completed first mentorship session', tasks: ['Accept first mentorship request', 'Complete session'] },
  { key: 'active_mentor', name: 'Active Mentor', description: 'Held 10 mentorship sessions', tasks: ['Hold 10 sessions'] },
  { key: 'top_rated', name: 'Top Rated', description: 'Average rating above 4.7', tasks: ['Maintain avg rating > 4.7'] },
  { key: 'community_builder', name: 'Community Builder', description: 'Invited 20 students', tasks: ['Invite 20 students'] },
  { key: 'event_host', name: 'Event Host', description: 'Hosted an event', tasks: ['Create event and host it'] }
]

// GET /api/badges - list available badge types
app.get('/api/badges', (req, res) => {
  res.json({ success: true, data: BADGE_DEFINITIONS })
})

// POST /api/badges/award - award a badge to a user (requires auth)
app.post('/api/badges/award', verifyToken, async (req, res) => {
  try {
    const { targetUserId, badgeKey, source } = req.body
    if (!targetUserId || !badgeKey) return res.status(400).json({ success:false, message: 'Missing fields' })
    const def = BADGE_DEFINITIONS.find(b=>b.key===badgeKey)
    if (!def) return res.status(400).json({ success:false, message: 'Unknown badge' })

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(targetUserId)
      if (!user) return res.status(404).json({ success:false, message: 'User not found' })
      user.badges = user.badges || []
      // avoid duplicates by key
      if (!user.badges.find(x=>x.key===badgeKey)) {
        user.badges.push({ key: badgeKey, name: def.name, description: def.description, source: source || null })
        await user.save()
      }
      return res.json({ success:true, data: user.badges })
    }

    // in-memory fallback: attach to users array if present
    const u = users.find(x=>String(x.id)===String(targetUserId))
    if (!u) return res.status(404).json({ success:false, message: 'User not found' })
    u.badges = u.badges || []
    if (!u.badges.find(x=>x.key===badgeKey)) {
      u.badges.push({ key: badgeKey, name: def.name, description: def.description, awardedAt: new Date(), source: source || null })
    }
    return res.json({ success:true, data: u.badges })
  } catch (err) {
    console.error('Error awarding badge', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// POST /api/auth/login - Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    let user = null;

    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findOne({ email });
    } else {
      // Fallback to in-memory storage
      user = users.find(u => u.email === email);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Compare password
    let isPasswordValid;
    if (mongoose.connection.readyState === 1) {
      isPasswordValid = await user.comparePassword(password);
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const tokenData = {
      id: user._id || user.id,
      email: user.email
    };
    const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '24h' });

    // Return user data without password
    const userResponse = {
      _id: user._id || user.id,
      fullName: user.fullName,
      email: user.email,
      userType: user.userType,
      company: user.company,
      skills: user.skills,
      registrationDate: user.registrationDate
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userResponse, token }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/profile - Get current user profile
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    let user = null;

    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findById(req.userId).select('-password');
    } else {
      // Fallback to in-memory storage
      user = users.find(u => u.id === req.userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userResponse = mongoose.connection.readyState === 1 
      ? user.toObject({ versionKey: false })
      : (() => {
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })();

    res.json({ success: true, data: userResponse });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/profile - Update current user profile
app.put('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const { role, company, experience, industry, availability, skills, linkedinUrl, githubUrl } = req.body;
    
    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          role,
          company,
          experience,
          industry,
          availability,
          skills,
          linkedinUrl,
          githubUrl
        },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      return res.json({ success: true, data: user });
    } else {
      // In-memory fallback
      const user = users.find(u => u.id === req.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      Object.assign(user, { role, company, experience, industry, availability, skills, linkedinUrl, githubUrl });
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ success: true, data: userWithoutPassword });
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/settings - Get authenticated user's settings
app.get('/api/auth/settings', verifyToken, async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select('settings');
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    }
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.settings || { emailNotifications: true, profileVisibility: 'public' } });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/settings - Update authenticated user's settings
app.put('/api/auth/settings', verifyToken, async (req, res) => {
  try {
    const { emailNotifications, profileVisibility } = req.body;
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.settings = user.settings || {};
      if (typeof emailNotifications === 'boolean') user.settings.emailNotifications = emailNotifications;
      if (profileVisibility) user.settings.profileVisibility = profileVisibility;
      await user.save();
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.settings = user.settings || {};
      if (typeof emailNotifications === 'boolean') user.settings.emailNotifications = emailNotifications;
      if (profileVisibility) user.settings.profileVisibility = profileVisibility;
    }

    res.json({ success: true, message: 'Settings updated', data: user.settings });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/profile - Update user profile
app.put('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, company, skills, linkedinUrl, githubUrl } = req.body;
    let user = null;

    if (mongoose.connection.readyState === 1) {
      // Update in MongoDB
      user = await User.findByIdAndUpdate(
        req.userId,
        {
          ...(fullName && { fullName }),
          ...(company && { company }),
          ...(linkedinUrl && { linkedinUrl }),
          ...(githubUrl && { githubUrl }),
          ...(skills && { skills: Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()) })
        },
        { new: true }
      ).select('-password');
    } else {
      // Fallback to in-memory storage
      user = users.find(u => u.id === req.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (fullName) user.fullName = fullName;
      if (company) user.company = company;
      if (linkedinUrl) user.linkedinUrl = linkedinUrl;
      if (githubUrl) user.githubUrl = githubUrl;
      if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userResponse = mongoose.connection.readyState === 1 
      ? user.toObject({ versionKey: false })
      : (() => {
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/share - Share current user's profile (returns a shareable URL/message)
app.post('/api/auth/share', verifyToken, async (req, res) => {
  try {
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select('-password');
    } else {
      user = users.find(u => u.id === req.userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userResponse = mongoose.connection.readyState === 1
      ? user.toObject({ versionKey: false })
      : (() => {
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })();

    const shareUrl = `https://alumniconnect.local/user/${userResponse._id || userResponse.id}`;

    res.json({
      success: true,
      message: 'Profile shared successfully',
      shareUrl,
      data: userResponse
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/profile/view - Record that the authenticated user viewed another user's profile
app.post('/api/auth/profile/view', verifyToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId required' });

    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      targetUser = await User.findById(targetUserId);
    } else {
      targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
    }

    if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });

    const viewerId = req.userId;
    // attempt to get viewer name
    let viewerName = 'Someone';
    if (mongoose.connection.readyState === 1) {
      const viewer = await User.findById(viewerId).select('fullName');
      if (viewer) viewerName = viewer.fullName;
    } else {
      const viewer = users.find(u => (u._id || u.id) === viewerId || u.id === parseInt(viewerId));
      if (viewer) viewerName = viewer.fullName;
    }

    const visitRecord = { viewerId: viewerId.toString(), viewerName, viewedAt: new Date() };

    if (mongoose.connection.readyState === 1) {
      targetUser.visitors = targetUser.visitors || [];
      targetUser.visitors.push(visitRecord);
      await targetUser.save();
    } else {
      targetUser.visitors = targetUser.visitors || [];
      targetUser.visitors.push(visitRecord);
    }

    res.json({ success: true, message: 'View recorded' });
  } catch (err) {
    console.error('Error recording view:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/profile/visitors - Get list of visitors for authenticated user
app.get('/api/auth/profile/visitors', verifyToken, async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select('visitors');
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user.visitors || [] });
  } catch (err) {
    console.error('Error fetching visitors:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET all mentors - Fetch real alumni users who can be mentors
app.get('/api/mentors', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      // Fetch alumni users from MongoDB
      const alumniUsers = await User.find({ userType: 'alumni' })
        .select('-password')
        .lean();
      
      // Transform to mentor format expected by frontend
      const mentorsList = alumniUsers.map(user => ({
        id: user._id,
        name: user.fullName || user.name || 'Alumni',
        role: user.company ? `${user.role || 'Professional'} at ${user.company}` : (user.role || 'Alumni Professional'),
        skills: user.skills || [],
        matchPercentage: Math.floor(Math.random() * 20) + 75, // 75-95% match
        photo: user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'Alumni')}&size=400&background=random`,
        experience: user.experience || `${Math.floor(Math.random() * 10) + 3} years`,
        availability: user.availability || 'Flexible',
        industry: user.industry || 'Technology',
        email: user.email
      }));
      
      return res.json({ success: true, data: mentorsList });
    }
    
    // Fallback: filter in-memory users for alumni
    const alumniUsers = users.filter(u => u.userType === 'alumni');
    const mentorsList = alumniUsers.map(user => ({
      id: user.id || user._id,
      name: user.fullName || user.name || 'Alumni',
      role: user.company ? `${user.role || 'Professional'} at ${user.company}` : (user.role || 'Alumni Professional'),
      skills: user.skills || [],
      matchPercentage: Math.floor(Math.random() * 20) + 75,
      photo: user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'Alumni')}&size=400&background=random`,
      experience: user.experience || `${Math.floor(Math.random() * 10) + 3} years`,
      availability: user.availability || 'Flexible',
      industry: user.industry || 'Technology',
      email: user.email
    }));
    
    return res.json({ success: true, data: mentorsList });
  } catch (err) {
    console.error('Error fetching mentors:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET mentor by ID - Fetch specific alumni user
app.get('/api/mentors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid mentor ID' });
      }
      
      const user = await User.findById(id).select('-password').lean();
      if (!user || user.userType !== 'alumni') {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }
      
      const mentor = {
        id: user._id,
        name: user.fullName || user.name || 'Alumni',
        role: user.company ? `${user.role || 'Professional'} at ${user.company}` : (user.role || 'Alumni Professional'),
        skills: user.skills || [],
        matchPercentage: Math.floor(Math.random() * 20) + 75,
        photo: user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'Alumni')}&size=400&background=random`,
        experience: user.experience || `${Math.floor(Math.random() * 10) + 3} years`,
        availability: user.availability || 'Flexible',
        industry: user.industry || 'Technology',
        email: user.email
      };
      
      return res.json({ success: true, data: mentor });
    }
    
    // Fallback
    const user = users.find(u => String(u.id) === String(id) || String(u._id) === String(id));
    if (!user || user.userType !== 'alumni') {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }
    
    const mentor = {
      id: user.id || user._id,
      name: user.fullName || user.name || 'Alumni',
      role: user.company ? `${user.role || 'Professional'} at ${user.company}` : (user.role || 'Alumni Professional'),
      skills: user.skills || [],
      matchPercentage: Math.floor(Math.random() * 20) + 75,
      photo: user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'Alumni')}&size=400&background=random`,
      experience: user.experience || `${Math.floor(Math.random() * 10) + 3} years`,
      availability: user.availability || 'Flexible',
      industry: user.industry || 'Technology',
      email: user.email
    };
    
    return res.json({ success: true, data: mentor });
  } catch (err) {
    console.error('Error fetching mentor:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/notifications - Get notifications for authenticated user
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select('notifications');
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const notifications = (user.notifications || []).slice().reverse();
    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/endorse - Endorse a user's skill
app.post('/api/endorse', verifyToken, async (req, res) => {
  try {
    const { targetUserId, skill } = req.body;
    if (!targetUserId || !skill) return res.status(400).json({ success: false, message: 'targetUserId and skill required' });

    const actorId = req.userId;
    let actorName = 'Someone';
    if (mongoose.connection.readyState === 1) {
      const actor = await User.findById(actorId).select('fullName');
      if (actor) actorName = actor.fullName;
    } else {
      const actor = users.find(u => (u._id || u.id) === actorId || u.id === parseInt(actorId));
      if (actor) actorName = actor.fullName;
    }

    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });
      const existing = (targetUser.endorsements || []).find(e => e.skill.toLowerCase() === skill.toLowerCase());
      if (existing) existing.count += 1;
      else targetUser.endorsements.push({ skill, count: 1 });
      await targetUser.save();
    } else {
      targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });
      targetUser.endorsements = targetUser.endorsements || [];
      const existing = targetUser.endorsements.find(e => e.skill.toLowerCase() === skill.toLowerCase());
      if (existing) existing.count += 1;
      else targetUser.endorsements.push({ skill, count: 1 });
    }

    // create notification for target user
    if (mongoose.connection.readyState === 1) {
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'endorsement', message: `${actorName} endorsed your skill: ${skill}`, actorId, actorName, read: false });
      await targetUser.save();
    } else {
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'endorsement', message: `${actorName} endorsed your skill: ${skill}`, actorId, actorName, read: false });
    }

    res.json({ success: true, message: 'Endorsed', data: { skill } });
  } catch (err) {
    console.error('Error endorsing skill:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/messages - send a message to a user
app.post('/api/messages', verifyToken, async (req, res) => {
  try {
    const { targetUserId, subject, body } = req.body;
    if (!targetUserId || !body) return res.status(400).json({ success: false, message: 'targetUserId and body required' });

    const actorId = req.userId;
    let actorName = 'Someone';
    if (mongoose.connection.readyState === 1) {
      const actor = await User.findById(actorId).select('fullName');
      if (actor) actorName = actor.fullName;
    } else {
      const actor = users.find(u => (u._id || u.id) === actorId || u.id === parseInt(actorId));
      if (actor) actorName = actor.fullName;
    }

    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });
      targetUser.messages = targetUser.messages || [];
      targetUser.messages.push({ fromId: actorId, fromName: actorName, subject: subject || '', body, read: false });
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'message', message: `${actorName} sent you a message`, actorId, actorName, read: false });
      await targetUser.save();
    } else {
      targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });
      targetUser.messages = targetUser.messages || [];
      targetUser.messages.push({ fromId: actorId, fromName: actorName, subject: subject || '', body, read: false });
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'message', message: `${actorName} sent you a message`, actorId, actorName, read: false });
    }

    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/messages - get messages for authenticated user
app.get('/api/messages', verifyToken, async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select('messages');
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    }
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: (user.messages || []).slice().reverse() });
  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/messages/reply - reply to a message from mentor
app.post('/api/messages/reply', verifyToken, async (req, res) => {
  try {
    const { mentorId, body } = req.body;
    if (!mentorId || !body) {
      return res.status(400).json({ success: false, message: 'mentorId and body required' });
    }

    const studentId = req.userId;
    
    if (mongoose.connection.readyState === 1) {
      // Get student name
      const student = await User.findById(studentId).select('fullName');
      const studentName = student?.fullName || 'Student';
      
      // Send message to mentor
      const mentor = await User.findById(mentorId);
      if (!mentor) {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }
      
      mentor.messages = mentor.messages || [];
      mentor.messages.push({
        fromId: studentId,
        fromName: studentName,
        subject: 'Reply',
        body,
        read: false,
        isReply: true
      });
      
      mentor.notifications = mentor.notifications || [];
      mentor.notifications.push({
        type: 'message',
        message: `${studentName} replied to your message`,
        actorId: studentId,
        actorName: studentName,
        read: false
      });
      
      await mentor.save();
    }
    
    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (err) {
    console.error('Error sending reply:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/stats - simple profile stats for authenticated user
app.get('/api/auth/stats', verifyToken, async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select('endorsements visitors messages notifications');
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    }
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const endorsementsCount = (user.endorsements || []).reduce((s, e) => s + (e.count || 0), 0);
    const visitorsCount = (user.visitors || []).length;
    const unreadMessages = (user.messages || []).filter(m => !m.read).length;
    const unreadNotifications = (user.notifications || []).filter(n => !n.read).length;

    res.json({ success: true, data: { endorsementsCount, visitorsCount, unreadMessages, unreadNotifications } });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/notifications - Create a notification for a target user
app.post('/api/notifications', verifyToken, async (req, res) => {
  try {
    const { targetUserId, type, message, data } = req.body;
    if (!targetUserId || !message) return res.status(400).json({ success: false, message: 'targetUserId and message required' });

    const actorId = req.userId;
    let actorName = 'Someone';
    if (mongoose.connection.readyState === 1) {
      const actor = await User.findById(actorId).select('fullName');
      if (actor) actorName = actor.fullName;
    } else {
      const actor = users.find(u => (u._id || u.id) === actorId || u.id === parseInt(actorId));
      if (actor) actorName = actor.fullName;
    }

    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type, message, data, actorId, actorName, read: false });
      await targetUser.save();
    } else {
      targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type, message, data, actorId, actorName, read: false });
    }

    res.json({ success: true, message: 'Notification created' });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/notifications/:id - update notification (e.g., mark read)
app.put('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const nid = req.params.id;
    const { read } = req.body;
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const notif = user.notifications.id(nid) || user.notifications.find(n => (n._id || '').toString() === nid);
      if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
      if (typeof read === 'boolean') notif.read = read;
      await user.save();
      return res.json({ success: true, data: notif });
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const notif = (user.notifications || []).find(n => (n._id || n.id || '').toString() === nid);
      if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
      if (typeof read === 'boolean') notif.read = read;
      return res.json({ success: true, data: notif });
    }
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/notifications/:id - delete a notification
app.delete('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const nid = req.params.id;
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.notifications = (user.notifications || []).filter(n => (n._id || '').toString() !== nid);
      await user.save();
      return res.json({ success: true, message: 'Deleted' });
    } else {
      user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.notifications = (user.notifications || []).filter(n => (n._id || n.id || '').toString() !== nid);
      return res.json({ success: true, message: 'Deleted' });
    }
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET all events - Events now fetched from database only
app.get('/api/events', (req, res) => {
  // TODO: Implement database query for events
  res.json({ success: true, data: [], message: 'Events feature coming soon' });
});

// GET event by ID
app.get('/api/events/:id', (req, res) => {
  // TODO: Implement database query for specific event
  res.status(404).json({ success: false, message: 'Event not found' });
});

// GET events by category
app.get('/api/events/category/:category', (req, res) => {
  // TODO: Implement database query for events by category
  res.json({ success: true, data: [], message: 'Events by category coming soon' });
});

// GET all jobs - Jobs now fetched from database only
app.get('/api/jobs', (req, res) => {
  // TODO: Implement database query for jobs
  res.json({ success: true, data: [], message: 'Jobs feature coming soon' });
});

// GET job by ID
app.get('/api/jobs/:id', (req, res) => {
  // TODO: Implement database query for specific job
  res.status(404).json({ success: false, message: 'Job not found' });
});

// GET jobs by type
app.get('/api/jobs/type/:type', (req, res) => {
  // TODO: Implement database query for jobs by type
  res.json({ success: true, data: [], message: 'Jobs by type coming soon' });
});

// GET jobs by location
app.get('/api/jobs/location/:location', (req, res) => {
  // TODO: Implement database query for jobs by location
  res.json({ success: true, data: [], message: 'Jobs by location coming soon' });
});

// GET jobs by skill
app.get('/api/jobs/skill/:skill', (req, res) => {
  // TODO: Implement database query for jobs by skill
  res.json({ success: true, data: [], message: 'Jobs by skill coming soon' });
});

// Search jobs by keyword
app.get('/api/jobs/search/:keyword', (req, res) => {
  // TODO: Implement database query for job search
  res.json({ success: true, data: [], message: 'Job search coming soon' });
});

// POST /api/jobs/apply - Apply for a job
app.post('/api/jobs/apply', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID required' });
    }

    // TODO: Implement database query for job application
    // For now, return success response
    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        jobId: jobId,
        appliedAt: new Date().toISOString(),
        status: 'Pending'
      }
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ success: false, message: 'Server error during application' });
  }
});

// GET Student Dashboard Stats
app.get('/api/student/dashboard', async (req, res) => {
  try {
    // Try to provide personalized stats when Authorization token is provided
    const authHeader = req.headers.authorization || '';
    let userId = null;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // invalid token -> treat as anonymous
        userId = null;
      }
    }

    if (userId) {
      let user = null;
      if (mongoose.connection.readyState === 1) {
        user = await User.findById(userId).select('skills endorsements visitors messages notifications');
      } else {
        user = users.find(u => (u._id || u.id) === userId || u.id === parseInt(userId));
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const userSkills = user.skills || [];
      // mentorsMatched: fetch from database where userType='alumni' and skills match
      let matched = [];
      if (mongoose.connection.readyState === 1) {
        const allMentors = await User.find({ userType: 'alumni' }).select('fullName skills role company');
        matched = allMentors.filter(m => (m.skills || []).some(s => userSkills.map(us => us.toLowerCase()).includes(s.toLowerCase())));
      }

      const endorsementsCount = (user.endorsements || []).reduce((s, e) => s + (e.count || 0), 0);
      const visitorsCount = (user.visitors || []).length;
      const unreadMessages = (user.messages || []).filter(m => !m.read).length;
      const unreadNotifications = (user.notifications || []).filter(n => !n.read).length;

      const dashboardData = {
        mentorsMatched: matched.length,
        eventsAttended: 0,
        skillsEndorsed: endorsementsCount,
        applications: 0,
        recentMentors: matched.slice(0, 2),
        upcomingEvents: [],
        unreadMessages,
        unreadNotifications
      };

      return res.json({ success: true, data: dashboardData });
    }

    // Anonymous / fallback dashboard (aggregated or sample data)
    const dashboardData = {
      mentorsMatched: 0,
      eventsAttended: 0,
      skillsEndorsed: 0,
      applications: 0,
      recentMentors: [],
      upcomingEvents: []
    };
    res.json({ success: true, data: dashboardData });
  } catch (err) {
    console.error('Error fetching student dashboard:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET Student Profile (placeholder)
app.get('/api/student/profile', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      fullName: 'Student User',
      email: 'student@example.com',
      major: 'Computer Science',
      graduationYear: 2025,
      skills: ['React', 'Node.js', 'Python']
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
