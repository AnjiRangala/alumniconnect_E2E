import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { User } from './models/User.js';
import { MentorshipRequest } from './models/MentorshipRequest.js';
import { Event } from './models/Event.js';
import { Job } from './models/Job.js';
import { JobApplication } from './models/JobApplication.js';
import { Announcement } from './models/Announcement.js';
import { Message } from './models/Message.js';
import { OfficeHour } from './models/OfficeHour.js';
import { RecentLogin } from './models/RecentLogin.js';

dotenv.config();

const AP_ENGINEERING_COLLEGES = [
  'Andhra University College of Engineering, Visakhapatnam',
  'JNTUA College of Engineering, Anantapur',
  'JNTUK University College of Engineering, Kakinada',
  'SVU College of Engineering, Tirupati',
  'GMR Institute of Technology, Rajam',
  'VR Siddhartha Engineering College, Vijayawada',
  'Vignan\'s Foundation for Science, Technology & Research, Guntur',
  'Vignan\'s Institute of Information Technology, Visakhapatnam',
  'RVR & JC College of Engineering, Guntur',
  'K L University, Guntur',
  'Lakireddy Bali Reddy College of Engineering, Mylavaram',
  'Vasireddy Venkatadri Institute of Technology, Guntur',
  'Narasaraopeta Engineering College, Narasaraopet',
  'Aditya Engineering College, Surampalem',
  'Pragati Engineering College, Surampalem',
  'GIET Engineering College, Rajahmundry',
  'VSM College of Engineering, Ramachandrapuram',
  'Sree Vidyanikethan Engineering College, Tirupati',
  'Madanapalle Institute of Technology & Science, Madanapalle',
  'Anil Neerukonda Institute of Technology & Sciences, Visakhapatnam',
  'Gayatri Vidya Parishad College of Engineering, Visakhapatnam',
  'Gayatri Vidya Parishad College for Degree & PG Courses (Engineering), Visakhapatnam',
  'Bapatla Engineering College, Bapatla',
  'DVR & Dr. HS MIC College of Technology, Kanchikacherla',
  'PVP Siddhartha Institute of Technology, Vijayawada',
  'NRI Institute of Technology, Guntur',
  'NRI Institute of Technology & Management, Visakhapatnam',
  'Sri Venkateswara College of Engineering & Technology, Chittoor',
  'Sasi Institute of Technology & Engineering, Tadepalligudem',
  'Sasi Institute of Technology, Tadepalligudem',
  'Dr. Lankapalli Bullayya College of Engineering, Visakhapatnam',
  'Chalapathi Institute of Engineering & Technology, Guntur',
  'Prasad V Potluri Siddhartha Institute of Technology, Vijayawada',
  'Bonam Venkata Chalamayya Engineering College, Odalarevu',
  'QIS College of Engineering & Technology, Ongole',
  'Pace Institute of Technology & Sciences, Ongole',
  'Ramachandra College of Engineering, Eluru',
  'Rajeev Gandhi Memorial College of Engineering & Technology, Nandyal',
  'MVR College of Engineering & Technology, Paritala',
  'St. Ann\'s College of Engineering & Technology, Chirala'
];
const AP_ENGINEERING_COLLEGES_NORMALIZED = new Set(
  AP_ENGINEERING_COLLEGES.map((name) => String(name).trim().toLowerCase())
);
const AP_ENGINEERING_COLLEGES_CANONICAL_MAP = new Map(
  AP_ENGINEERING_COLLEGES.map((name) => [String(name).trim().toLowerCase(), name])
);
const INSTITUTION_ALIAS_MAP = {
  vvit: 'Vasireddy Venkatadri Institute of Technology, Guntur',
  'vvit guntur': 'Vasireddy Venkatadri Institute of Technology, Guntur',
  'vasireddy venkatadri institute of technology': 'Vasireddy Venkatadri Institute of Technology, Guntur',
  'vasireddy venkatadri institute of technology guntur': 'Vasireddy Venkatadri Institute of Technology, Guntur',
  vits: 'Vignan\'s Institute of Information Technology, Visakhapatnam'
};

const normalizeInstitutionKey = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const resolveInstitutionName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const exactMatch = AP_ENGINEERING_COLLEGES_CANONICAL_MAP.get(raw.toLowerCase());
  if (exactMatch) return exactMatch;

  const normalizedKey = normalizeInstitutionKey(raw);
  const aliasMatch = INSTITUTION_ALIAS_MAP[normalizedKey];
  if (aliasMatch) return aliasMatch;

  for (const college of AP_ENGINEERING_COLLEGES) {
    if (normalizeInstitutionKey(college) === normalizedKey) return college;
  }

  return raw;
};

const app = express();
const PORT = process.env.PORT || 5173;
const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-key-12345';
const MONGODB_URI = process.env.MONGODB_URI;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForMongoReady = async (timeoutMs = 2500) => {
  if (!MONGODB_URI) return false;
  const start = Date.now();
  while (mongoose.connection.readyState === 2 && Date.now() - start < timeoutMs) {
    await sleep(100);
  }
  return mongoose.connection.readyState === 1;
};

app.use(cors());
app.use(express.json({ limit: '5mb' }));

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

// Email Configuration
const EMAIL_USER = String(process.env.EMAIL_USER || '').trim();
const EMAIL_PASSWORD = String(process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || '').trim();
const isEmailConfigured = Boolean(EMAIL_USER && EMAIL_PASSWORD);

if (!isEmailConfigured) {
  console.log('⚠️  Email service is not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
}

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      },
      connectionTimeout: 5000,
      socketTimeout: 5000
    })
  : null;

// Verify email transporter on startup if configured
if (transporter) {
  transporter.verify((err, success) => {
    if (err) {
      console.error('❌ Email transporter error:', err.message);
    } else if (success) {
      console.log('✅ Email service configured and verified');
    }
  });
}

// Email Templates
const sendEventRegistrationEmail = async (studentEmail, studentName, event) => {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = event.time || '10:00 AM';
  
  const mailOptions = {
    from: EMAIL_USER || 'noreply@alumniconnect.com',
    to: studentEmail,
    subject: `✅ Event Registration Confirmed: ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0;">✅ Registration Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You're all set for this event</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9; border: 1px solid #e0e0e0;">
          <p style="color: #333; margin-top: 0;">Hi <strong>${studentName}</strong>,</p>
          
          <p style="color: #555; line-height: 1.6;">
            Great news! You have successfully registered for the following event:
          </p>
          
          <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 24px;">${event.title}</h2>
            
            <div style="color: #666; margin: 10px 0;">
              <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${formattedTime}</p>
              <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${event.location || 'Online'}</p>
              <p style="margin: 8px 0;"><strong>📂 Category:</strong> ${event.category}</p>
            </div>
            
            <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p style="margin: 0 0 10px 0; color: #555;"><strong>Description:</strong></p>
              <p style="margin: 0; color: #666; line-height: 1.5;">${event.description}</p>
            </div>
            
            ${event.eventLink ? `
            <div style="margin-top: 20px; text-align: center;">
              <a href="${event.eventLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                🔗 Join Event
              </a>
            </div>
            ` : ''}
          </div>
          
          <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #0066cc;"><strong>💡 Tip:</strong> Add this event to your calendar so you don't forget!</p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            Registered by: AlumniConnect<br>
            If you need to unregister, please visit your student dashboard.<br>
            Questions? Contact us at support@alumniconnect.com
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
          <p style="margin: 0;">© 2026 AlumniConnect. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  try {
    if (!transporter) {
      console.log('⚠️  Skipping event email: transporter not configured');
      return false;
    }
    
    // Send with 8 second timeout
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout')), 8000)
    );
    
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ Event registration email sent to ${studentEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send email to ${studentEmail}:`, err.message);
    return false;
  }
};

// Alumni Connect Users Data (in-memory storage fallback)
const users = [];
let userIdCounter = 1;
let defaultJobSeedInProgress = false;
let defaultMentorSeedInProgress = false;
let defaultEventSeedInProgress = false;
const RECENT_LOGIN_LIMIT = 8;
const DEFAULT_ALUMNI_PASSWORD = '@ASdk2619';

const buildDefaultAlumniMentors = () => ([
  {
    fullName: 'Ananya Reddy',
    email: 'ananya2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'TechNova Labs',
    role: 'Senior Frontend Engineer',
    experience: '6 years',
    industry: 'Technology',
    availability: 'Weekends',
    institution: 'Andhra University College of Engineering, Visakhapatnam',
    skills: ['React', 'TypeScript', 'UI/UX', 'JavaScript']
  },
  {
    fullName: 'Rohit Kumar',
    email: 'rohit2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'CloudPeak Systems',
    role: 'Backend Engineer',
    experience: '7 years',
    industry: 'Software',
    availability: 'Evenings',
    institution: 'JNTUK University College of Engineering, Kakinada',
    skills: ['Node.js', 'Express', 'MongoDB', 'REST API']
  },
  {
    fullName: 'Sanjana Rao',
    email: 'sanjana2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'DataRiver Analytics',
    role: 'Data Scientist',
    experience: '5 years',
    industry: 'Data & AI',
    availability: 'Weekdays',
    institution: 'SVU College of Engineering, Tirupati',
    skills: ['Python', 'Machine Learning', 'SQL', 'Data Science']
  },
  {
    fullName: 'Karthik Varma',
    email: 'karthik2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'InfraNest Technologies',
    role: 'DevOps Engineer',
    experience: '8 years',
    industry: 'Cloud Infrastructure',
    availability: 'Flexible',
    institution: 'VR Siddhartha Engineering College, Vijayawada',
    skills: ['DevOps', 'AWS', 'Docker', 'Kubernetes']
  },
  {
    fullName: 'Meghana Iyer',
    email: 'meghana2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'FinEdge Software',
    role: 'Java Developer',
    experience: '6 years',
    industry: 'Fintech',
    availability: 'Weekends',
    institution: 'RVR & JC College of Engineering, Guntur',
    skills: ['Java', 'Spring Boot', 'Microservices', 'SQL']
  },
  {
    fullName: 'Nikhil Chandra',
    email: 'nikhil2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'PixelForge Studio',
    role: 'Product Designer',
    experience: '4 years',
    industry: 'Design',
    availability: 'Evenings',
    institution: 'GMR Institute of Technology, Rajam',
    skills: ['UI/UX', 'Figma', 'Design Systems', 'Prototyping']
  },
  {
    fullName: 'Priyanka Das',
    email: 'priyanka2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'SkyBridge Cloud',
    role: 'Cloud Solutions Architect',
    experience: '9 years',
    industry: 'Cloud',
    availability: 'Weekdays',
    institution: 'K L University, Guntur',
    skills: ['AWS', 'Networking', 'Linux', 'Security']
  },
  {
    fullName: 'Arun Teja',
    email: 'arun2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'InsightGrid',
    role: 'Analytics Manager',
    experience: '10 years',
    industry: 'Analytics',
    availability: 'Flexible',
    institution: 'Vignan\'s Foundation for Science, Technology & Research, Guntur',
    skills: ['Power BI', 'Data Analysis', 'SQL', 'Excel']
  },
  {
    fullName: 'Sai Kiran',
    email: 'saikiran2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'Vertex Innovations',
    role: 'Software Engineer',
    experience: '5 years',
    industry: 'Software Development',
    availability: 'Weekdays',
    institution: 'Vasireddy Venkatadri Institute of Technology, Guntur',
    skills: ['Java', 'Spring Boot', 'React', 'SQL']
  },
  {
    fullName: 'Divya Nandini',
    email: 'divya2619@alumniconnect.com',
    password: DEFAULT_ALUMNI_PASSWORD,
    userType: 'alumni',
    company: 'DataBridge Labs',
    role: 'Data Engineer',
    experience: '4 years',
    industry: 'Data & Analytics',
    availability: 'Evenings',
    institution: 'Vasireddy Venkatadri Institute of Technology, Guntur',
    skills: ['Python', 'Data Science', 'SQL', 'AWS']
  }
]);

const ensureDefaultMentorsSeeded = async () => {
  if (defaultMentorSeedInProgress) return;
  defaultMentorSeedInProgress = true;

  try {
    const defaultMentors = buildDefaultAlumniMentors();

    if (mongoose.connection.readyState === 1) {
      const emails = defaultMentors.map(m => String(m.email).toLowerCase());
      const existing = await User.find({ email: { $in: emails } }).select('email').lean();
      const existingSet = new Set((existing || []).map(item => String(item.email).toLowerCase()));

      const missing = defaultMentors.filter(m => !existingSet.has(String(m.email).toLowerCase()));
      if (missing.length === 0) return;

      for (const mentor of missing) {
        const doc = new User(mentor);
        await doc.save();
      }

      console.log(`✅ Seeded ${missing.length} default alumni mentors`);
      return;
    }

    const existingSet = new Set((users || []).map(u => String(u.email || '').toLowerCase()));
    const missing = defaultMentors.filter(m => !existingSet.has(String(m.email).toLowerCase()));
    if (missing.length === 0) return;

    for (const mentor of missing) {
      const hashedPassword = await bcrypt.hash(mentor.password, 10);
      users.push({
        id: userIdCounter++,
        fullName: mentor.fullName,
        email: mentor.email,
        password: hashedPassword,
        userType: 'alumni',
        company: mentor.company || null,
        role: mentor.role || null,
        experience: mentor.experience || null,
        industry: mentor.industry || null,
        availability: mentor.availability || 'Flexible',
        institution: mentor.institution || null,
        skills: mentor.skills || [],
        registrationDate: new Date().toISOString()
      });
    }

    console.log(`✅ Seeded ${missing.length} default alumni mentors (in-memory)`);
  } catch (err) {
    console.error('Failed to seed default mentors:', err);
  } finally {
    defaultMentorSeedInProgress = false;
  }
};

const buildDefaultEvents = (alumniUsers = []) => {
  const now = new Date();
  const makeDate = (daysOffset) => new Date(now.getTime() + (daysOffset * 24 * 60 * 60 * 1000));

  const findAlumni = (emailHint, fallbackIndex = 0) => {
    const matched = alumniUsers.find((u) => String(u?.email || '').toLowerCase() === String(emailHint || '').toLowerCase());
    if (matched) return matched;
    return alumniUsers[fallbackIndex] || alumniUsers[0] || null;
  };

  const eventFrom = (owner, payload) => ({
    ...payload,
    createdBy: {
      userId: owner?._id || owner?.id || null,
      userName: owner?.fullName || 'Alumni Mentor',
      userEmail: owner?.email || 'mentor@alumniconnect.com'
    },
    attendees: [],
    status: payload.status || 'upcoming'
  });

  const mentorA = findAlumni('saikiran2619@alumniconnect.com', 0);
  const mentorB = findAlumni('divya2619@alumniconnect.com', 1);
  const mentorC = findAlumni('harsha2619@alumniconnect.com', 2);
  const mentorD = findAlumni('ravada2619@alumniconnect.com', 3);
  const mentorE = findAlumni('dhanush2619@alumniconnect.com', 4);

  return [
    eventFrom(mentorA, {
      title: 'VVIT Career Launch Webinar 2026',
      description: 'A practical webinar on resume strategy, internship roadmap, and interview preparation for 2nd and 3rd year students.',
      date: makeDate(3),
      time: '06:30 PM',
      location: 'Online (Zoom)',
      category: 'Webinar',
      eventLink: 'https://meet.google.com/vvit-career-launch',
      maxAttendees: 300,
      tags: ['Career Guidance', 'Internships', 'Resume']
    }),
    eventFrom(mentorB, {
      title: 'Data Science Workshop: From CSV to Insights',
      description: 'Hands-on workshop to build an end-to-end analytics mini-project using Python, pandas, and dashboards.',
      date: makeDate(6),
      time: '10:00 AM',
      location: 'VVIT Seminar Hall - Block B',
      category: 'Workshop',
      maxAttendees: 120,
      tags: ['Python', 'Data Science', 'Workshop']
    }),
    eventFrom(mentorC, {
      title: 'Cloud & DevOps AMA Session',
      description: 'Ask-me-anything session on cloud architecture, DevOps roles, and getting your first cloud certification.',
      date: makeDate(9),
      time: '07:00 PM',
      location: 'Online (Teams)',
      category: 'Mentoring Session',
      maxAttendees: 200,
      tags: ['AWS', 'DevOps', 'Mentorship']
    }),
    eventFrom(mentorD, {
      title: 'Alumni Networking Evening',
      description: 'Connect with alumni across software, analytics, and product companies for referrals and career networking.',
      date: makeDate(12),
      time: '05:00 PM',
      location: 'VVIT Campus Auditorium',
      category: 'Networking',
      maxAttendees: 250,
      tags: ['Networking', 'Referrals', 'Alumni']
    }),
    eventFrom(mentorE, {
      title: 'System Design Masterclass',
      description: 'Masterclass focused on designing scalable applications with practical interview-oriented examples.',
      date: makeDate(15),
      time: '11:00 AM',
      location: 'Online (YouTube Live)',
      category: 'Conference',
      maxAttendees: 500,
      tags: ['System Design', 'Architecture', 'Interviews']
    }),
    eventFrom(mentorA, {
      title: 'Frontend Performance Webinar',
      description: 'Learn practical optimization techniques for React apps including rendering, code-splitting, and caching.',
      date: makeDate(-10),
      time: '06:00 PM',
      location: 'Online (Zoom)',
      category: 'Webinar',
      maxAttendees: 180,
      status: 'completed',
      completedAt: makeDate(-10),
      tags: ['React', 'Performance', 'Webinar']
    })
  ].filter((event) => event.createdBy?.userId);
};

const ensureDefaultEventsSeeded = async () => {
  if (defaultEventSeedInProgress) return;
  defaultEventSeedInProgress = true;

  try {
    await ensureDefaultMentorsSeeded();

    if (mongoose.connection.readyState === 1) {
      const alumniUsers = await User.find({ userType: 'alumni' })
        .select('_id fullName email')
        .lean();

      if (!alumniUsers.length) return;

      const defaults = buildDefaultEvents(alumniUsers);
      if (!defaults.length) return;

      const existingEvents = await Event.find({})
        .select('title createdBy.userId')
        .lean();

      const existingKeys = new Set(
        (existingEvents || []).map((e) => `${String(e?.title || '').trim().toLowerCase()}::${String(e?.createdBy?.userId || '').trim()}`)
      );

      const missingDefaults = defaults.filter((event) => {
        const key = `${String(event?.title || '').trim().toLowerCase()}::${String(event?.createdBy?.userId || '').trim()}`;
        return !existingKeys.has(key);
      });

      if (missingDefaults.length === 0) return;

      await Event.insertMany(missingDefaults);
      console.log(`✅ Seeded ${missingDefaults.length} default events/webinars`);
      return;
    }

    app.locals.events = app.locals.events || [];
    const alumniUsers = (users || []).filter((u) => String(u?.userType || '').toLowerCase() === 'alumni');
    if (!alumniUsers.length) return;

    const defaults = buildDefaultEvents(alumniUsers).map((event) => ({
      ...event,
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const existingKeys = new Set(
      (app.locals.events || []).map((e) => `${String(e?.title || '').trim().toLowerCase()}::${String(e?.createdBy?.userId || '').trim()}`)
    );

    const missingDefaults = defaults.filter((event) => {
      const key = `${String(event?.title || '').trim().toLowerCase()}::${String(event?.createdBy?.userId || '').trim()}`;
      return !existingKeys.has(key);
    });

    if (missingDefaults.length === 0) return;

    app.locals.events.push(...missingDefaults);
    console.log(`✅ Seeded ${missingDefaults.length} default events/webinars (in-memory)`);
  } catch (err) {
    console.error('Failed to seed default events/webinars:', err);
  } finally {
    defaultEventSeedInProgress = false;
  }
};

const normalizeRecentRole = (role) => {
  const value = String(role || '').toLowerCase().trim();
  if (value === 'student' || value === 'alumni') return value;
  return '';
};

const normalizeRecentEmail = (email) => String(email || '').trim().toLowerCase();

const saveRecentLoginCredential = async ({ email, password, role }) => {
  const normalizedRole = normalizeRecentRole(role);
  const normalizedEmail = normalizeRecentEmail(email);
  if (!normalizedRole || !normalizedEmail || !password) return;

  if (mongoose.connection.readyState === 1) {
    await RecentLogin.findOneAndUpdate(
      { email: normalizedEmail, role: normalizedRole },
      {
        email: normalizedEmail,
        password: String(password),
        role: normalizedRole,
        lastUsedAt: new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const overflow = await RecentLogin.find({})
      .sort({ lastUsedAt: -1 })
      .skip(RECENT_LOGIN_LIMIT)
      .select('_id')
      .lean();

    if (overflow.length > 0) {
      await RecentLogin.deleteMany({ _id: { $in: overflow.map(item => item._id) } });
    }

    return;
  }

  app.locals.recentLogins = app.locals.recentLogins || [];
  const existing = (app.locals.recentLogins || []).filter(
    (entry) => !(normalizeRecentEmail(entry?.email) === normalizedEmail && normalizeRecentRole(entry?.role) === normalizedRole)
  );

  app.locals.recentLogins = [
    {
      email: normalizedEmail,
      password: String(password),
      role: normalizedRole,
      lastUsedAt: new Date().toISOString()
    },
    ...existing
  ].slice(0, RECENT_LOGIN_LIMIT);
};

const getRecentLoginCredentials = async (role = '') => {
  const normalizedRole = normalizeRecentRole(role);

  if (mongoose.connection.readyState === 1) {
    const query = normalizedRole ? { role: normalizedRole } : {};
    const items = await RecentLogin.find(query)
      .sort({ lastUsedAt: -1 })
      .limit(RECENT_LOGIN_LIMIT)
      .lean();

    return items.map((item) => ({
      email: item.email,
      password: item.password,
      role: item.role,
      lastUsedAt: item.lastUsedAt
    }));
  }

  const items = (app.locals.recentLogins || [])
    .filter((item) => (normalizedRole ? normalizeRecentRole(item?.role) === normalizedRole : true))
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, RECENT_LOGIN_LIMIT)
    .map((item) => ({
      email: item.email,
      password: item.password,
      role: item.role,
      lastUsedAt: item.lastUsedAt
    }));

  return items;
};

const buildDefaultJobs = (alumniUsers = []) => {
  const now = new Date();
  const makeDeadline = (daysAhead) => new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const findAlumni = (emailHint, fallbackIndex = 0) => {
    const matched = alumniUsers.find((u) => normalizeEmailValue(u?.email) === normalizeEmailValue(emailHint));
    if (matched) return matched;
    return alumniUsers[fallbackIndex] || alumniUsers[0] || null;
  };

  const jobFrom = (owner, payload) => ({
    ...payload,
    postedBy: owner?._id || owner?.id || null,
    postedByName: owner?.fullName || 'Alumni Mentor',
    postedByEmail: owner?.email || null,
    isActive: true,
    applicationCount: 0
  });

  const mentorA = findAlumni('roshini2619@gmail.com', 0);
  const mentorB = findAlumni('harsha2619@alumniconnect.com', 1);
  const mentorC = findAlumni('saikiran2619@alumniconnect.com', 2);
  const mentorD = findAlumni('divya2619@alumniconnect.com', 3);
  const mentorE = findAlumni('ravada2619@alumniconnect.com', 4);

  return [
    jobFrom(mentorA, {
      title: 'Frontend Developer Intern',
      company: 'TechNova Solutions',
      description: 'Work with React and Tailwind to build responsive web interfaces. Collaborate with senior engineers on real client projects.',
      location: 'Bengaluru',
      jobType: 'Internship',
      requiredSkills: ['React', 'JavaScript', 'HTML', 'CSS', 'Tailwind'],
      salary: '₹20,000/month stipend',
      applicationDeadline: makeDeadline(20)
    }),
    jobFrom(mentorA, {
      title: 'Software Engineer I',
      company: 'Nexus Product Labs',
      description: 'Build product features end-to-end with React and Node.js in a fast-moving startup team.',
      location: 'Hyderabad',
      jobType: 'Full-time',
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'REST API'],
      salary: '₹7 - ₹10 LPA',
      applicationDeadline: makeDeadline(27)
    }),
    jobFrom(mentorB, {
      title: 'Backend Developer (Node.js)',
      company: 'CloudPeak Systems',
      description: 'Design and maintain REST APIs using Node.js and MongoDB. Focus on reliability, performance, and secure authentication flows.',
      location: 'Hyderabad',
      jobType: 'Full-time',
      requiredSkills: ['Node.js', 'Express', 'MongoDB', 'JWT', 'REST API'],
      salary: '₹6 - ₹9 LPA',
      applicationDeadline: makeDeadline(30)
    }),
    jobFrom(mentorB, {
      title: 'Cloud & DevOps Associate',
      company: 'SkyBridge Cloud',
      description: 'Support cloud workloads, monitor systems, and automate deployments using CI/CD pipelines.',
      location: 'Pune',
      jobType: 'Full-time',
      requiredSkills: ['AWS', 'Linux', 'Docker', 'CI/CD'],
      salary: '₹6 - ₹8 LPA',
      applicationDeadline: makeDeadline(24)
    }),
    jobFrom(mentorC, {
      title: 'Data Analyst Trainee',
      company: 'InsightGrid Analytics',
      description: 'Analyze datasets, build dashboards, and create business insights. Good role for students transitioning into analytics and AI.',
      location: 'Remote',
      jobType: 'Part-time',
      requiredSkills: ['Python', 'SQL', 'Excel', 'Power BI', 'Data Analysis'],
      salary: '₹25,000/month',
      applicationDeadline: makeDeadline(25)
    }),
    jobFrom(mentorC, {
      title: 'Full Stack Developer',
      company: 'AlumniConnect Labs',
      description: 'Build end-to-end features across React frontend and Node.js backend. Ideal for candidates with project experience.',
      location: 'Vijayawada',
      jobType: 'Full-time',
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'Git'],
      salary: '₹8 - ₹12 LPA',
      applicationDeadline: makeDeadline(35)
    }),
    jobFrom(mentorD, {
      title: 'UI/UX Designer',
      company: 'PixelForge Studio',
      description: 'Design user-centric web and mobile experiences. Work closely with product and frontend teams to ship polished interfaces.',
      location: 'Chennai',
      jobType: 'Full-time',
      requiredSkills: ['UI/UX', 'Figma', 'Wireframing', 'Prototyping', 'Design Systems'],
      salary: '₹5 - ₹8 LPA',
      applicationDeadline: makeDeadline(28)
    }),
    jobFrom(mentorD, {
      title: 'DevOps Engineer Trainee',
      company: 'InfraNest Technologies',
      description: 'Support CI/CD pipelines, infrastructure automation, and cloud monitoring. Great role for candidates entering platform engineering.',
      location: 'Pune',
      jobType: 'Internship',
      requiredSkills: ['DevOps', 'Docker', 'Kubernetes', 'AWS', 'CI/CD'],
      salary: '₹30,000/month stipend',
      applicationDeadline: makeDeadline(22)
    }),
    jobFrom(mentorE, {
      title: 'Java Developer',
      company: 'FinEdge Software',
      description: 'Develop and maintain backend services for fintech products using Java and Spring Boot with strong focus on clean architecture.',
      location: 'Mumbai',
      jobType: 'Full-time',
      requiredSkills: ['Java', 'Spring Boot', 'REST API', 'SQL', 'Microservices'],
      salary: '₹7 - ₹11 LPA',
      applicationDeadline: makeDeadline(32)
    }),
    jobFrom(mentorE, {
      title: 'Machine Learning Intern',
      company: 'VisionAI Labs',
      description: 'Assist in building ML models and experimentation pipelines for real-world prediction and recommendation use-cases.',
      location: 'Remote',
      jobType: 'Internship',
      requiredSkills: ['Machine Learning', 'Python', 'Pandas', 'Scikit-learn', 'SQL'],
      salary: '₹35,000/month stipend',
      applicationDeadline: makeDeadline(26)
    }),
    jobFrom(mentorB, {
      title: 'Cloud Support Associate',
      company: 'SkyBridge Cloud',
      description: 'Support cloud deployments, troubleshoot infrastructure issues, and assist engineering teams with production reliability.',
      location: 'Hyderabad',
      jobType: 'Part-time',
      requiredSkills: ['AWS', 'Linux', 'Networking', 'Monitoring', 'Scripting'],
      salary: '₹4 - ₹6 LPA',
      applicationDeadline: makeDeadline(24)
    }),
    jobFrom(mentorC, {
      title: 'Data Engineer',
      company: 'DataRiver Systems',
      description: 'Build scalable ETL pipelines and maintain analytics-ready datasets for business intelligence and AI teams.',
      location: 'Bengaluru',
      jobType: 'Full-time',
      requiredSkills: ['Python', 'SQL', 'ETL', 'Airflow', 'Data Warehousing'],
      salary: '₹9 - ₹14 LPA',
      applicationDeadline: makeDeadline(34)
    }),
    jobFrom(mentorC, {
      title: 'Campus Placement Prep Mentor (Part-time)',
      company: 'CareerSprint Academy',
      description: 'Guide students in aptitude, coding rounds, and interview preparation as part of placement-readiness cohorts.',
      location: 'Remote',
      jobType: 'Part-time',
      requiredSkills: ['DSA', 'Interview Preparation', 'Communication'],
      salary: '₹22,000/month',
      applicationDeadline: makeDeadline(18)
    }),
    jobFrom(mentorD, {
      title: 'Product Designer Intern',
      company: 'NovaUX Studio',
      description: 'Collaborate with product and engineering teams to craft intuitive app experiences and UX flows.',
      location: 'Bengaluru',
      jobType: 'Internship',
      requiredSkills: ['Figma', 'UX Research', 'Wireframing'],
      salary: '₹28,000/month stipend',
      applicationDeadline: makeDeadline(23)
    }),
    jobFrom(mentorE, {
      title: 'Java Spring Boot Trainee',
      company: 'ByteCore Finance Tech',
      description: 'Build backend modules with Java and Spring Boot, and learn enterprise patterns from senior engineers.',
      location: 'Hyderabad',
      jobType: 'Internship',
      requiredSkills: ['Java', 'Spring Boot', 'SQL'],
      salary: '₹32,000/month stipend',
      applicationDeadline: makeDeadline(21)
    }),
    jobFrom(mentorA, {
      title: 'Frontend Performance Engineer',
      company: 'RenderRush Web',
      description: 'Optimize large React applications and improve web vitals through profiling, caching, and architecture tuning.',
      location: 'Remote',
      jobType: 'Contract',
      requiredSkills: ['React', 'Performance', 'Web Vitals', 'JavaScript'],
      salary: '₹10 - ₹14 LPA',
      applicationDeadline: makeDeadline(29)
    })
  ].filter((job) => job.postedBy);
};

const ensureDefaultJobsSeeded = async () => {
  if (defaultJobSeedInProgress) return;
  defaultJobSeedInProgress = true;

  try {
    if (mongoose.connection.readyState === 1) {
      const alumniUsers = await User.find({ userType: 'alumni' }).select('_id fullName email').lean();
      const defaults = buildDefaultJobs(alumniUsers);
      const existingActiveJobs = await Job.find({ isActive: true })
        .select('title company')
        .lean();

      const existingKeys = new Set(
        (existingActiveJobs || []).map(j => `${String(j.title || '').trim().toLowerCase()}::${String(j.company || '').trim().toLowerCase()}`)
      );

      const missingDefaults = defaults.filter(j => {
        const key = `${String(j.title || '').trim().toLowerCase()}::${String(j.company || '').trim().toLowerCase()}`;
        return !existingKeys.has(key);
      });

      if (missingDefaults.length === 0) return;

      await Job.insertMany(missingDefaults);
      console.log(`✅ Seeded ${missingDefaults.length} default jobs`);
      return;
    }

    app.locals.jobs = app.locals.jobs || [];
    const alumniUsers = (users || []).filter((u) => String(u.userType || '').toLowerCase() === 'alumni');

    const defaults = buildDefaultJobs(alumniUsers).map((job) => ({
      ...job,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const existingKeys = new Set(
      (app.locals.jobs || [])
        .filter(j => j.isActive)
        .map(j => `${String(j.title || '').trim().toLowerCase()}::${String(j.company || '').trim().toLowerCase()}`)
    );

    const missingDefaults = defaults.filter((j) => {
      const key = `${String(j.title || '').trim().toLowerCase()}::${String(j.company || '').trim().toLowerCase()}`;
      return !existingKeys.has(key);
    });

    if (missingDefaults.length === 0) return;

    app.locals.jobs.push(...missingDefaults);
    console.log(`✅ Seeded ${missingDefaults.length} default jobs (in-memory)`);
  } catch (err) {
    console.error('Failed to seed default jobs:', err);
  } finally {
    defaultJobSeedInProgress = false;
  }
};

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

// Middleware to authenticate token (newer format with req.user)
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { userId: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// GET /api/institutions/ap-engineering - list AP engineering colleges
app.get('/api/institutions/ap-engineering', (_req, res) => {
  return res.json({ success: true, data: AP_ENGINEERING_COLLEGES });
});

// POST /api/events/send-demo-email - Send demo event registration email (for testing)
app.post('/api/events/send-demo-email', verifyToken, async (req, res) => {
  try {
    const { recipientEmail, eventId } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email required' });
    }
    
    let event = null;
    
    if (mongoose.connection.readyState === 1) {
      event = eventId ? await Event.findById(eventId) : null;
    }
    
    // Use sample event if none provided
    if (!event) {
      event = {
        title: 'React Advanced Patterns Workshop',
        description: 'Learn advanced React patterns and best practices for building scalable applications.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        time: '10:00 AM',
        location: 'Online (Zoom)',
        category: 'Workshop',
        eventLink: 'https://zoom.us/meeting/demo'
      };
    }
    
    const emailSent = await sendEventRegistrationEmail(recipientEmail, 'Student', event);
    
    if (emailSent) {
      res.json({ success: true, message: 'Demo email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  } catch (err) {
    console.error('Error sending demo email:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mentors are now dynamically fetched from the database (User collection where userType='alumni')

// Events are now dynamically fetched from the database

// Jobs are now dynamically fetched from the database

// POST /api/auth/register - Register a new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const mongoReady = await waitForMongoReady();
    const { fullName, email, password, userType, company, skills, institution, availability } = req.body;
    const normalizedInstitution = resolveInstitutionName(String(institution || '').trim());
    const normalizedAvailability = String(availability || '').trim();

    // Validation
    if (!fullName || !email || !password || !userType || !normalizedInstitution) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!AP_ENGINEERING_COLLEGES_NORMALIZED.has(normalizedInstitution.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Please select a valid institution from AP engineering colleges list' });
    }

    if (String(userType).toLowerCase() === 'alumni' && !normalizedAvailability) {
      return res.status(400).json({ success: false, message: 'Availability is required for alumni registration' });
    }

    // Check if user already exists
    let existingUser = null;
    if (mongoReady) {
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

    if (mongoReady) {
      // Save to MongoDB
      newUser = new User({
        fullName,
        email,
        password,
        userType,
        institution: normalizedInstitution,
        company: company || null,
        availability: String(userType).toLowerCase() === 'alumni' ? normalizedAvailability : null,
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
        institution: normalizedInstitution,
        company: company || null,
        availability: String(userType).toLowerCase() === 'alumni' ? normalizedAvailability : null,
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
      institution: newUser.institution,
      company: newUser.company,
      availability: newUser.availability || null,
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

      // Notify mentor about new mentorship request
      const canLookupMentorById = mongoose.Types.ObjectId.isValid(mentorIdString);
      const mentor = canLookupMentorById
        ? await User.findById(mentorIdString)
        : null;
      if (mentor) {
        mentor.notifications = mentor.notifications || [];
        mentor.notifications.push({
          type: 'mentorship_request',
          message: `${studentName} sent you a new mentorship request`,
          data: {
            requestId: String(r._id || ''),
            topic: topic || '',
            note: note || ''
          },
          actorId: String(studentId),
          actorName: studentName,
          read: false,
          createdAt: new Date()
        });
        await mentor.save();
      }

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

    const mentorUser = users.find(u => String(u._id || u.id) === mentorIdString || String(u.id) === mentorIdString);
    if (mentorUser) {
      mentorUser.notifications = mentorUser.notifications || [];
      mentorUser.notifications.push({
        type: 'mentorship_request',
        message: `${studentName} sent you a new mentorship request`,
        data: {
          requestId: String(fallback.id || ''),
          topic: topic || '',
          note: note || ''
        },
        actorId: String(studentId),
        actorName: studentName,
        read: false,
        createdAt: new Date()
      });
    }

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

      const mentorIds = Array.from(new Set(
        (list || [])
          .map(r => String(r.mentorId || '').trim())
          .filter(id => mongoose.Types.ObjectId.isValid(id))
      ));

      const mentors = mentorIds.length > 0
        ? await User.find({ _id: { $in: mentorIds } }).select('fullName avgRating ratingCount mentorRatings').lean()
        : [];

      const mentorMap = new Map(mentors.map(m => [String(m._id), m]));

      const enriched = (list || []).map((r) => {
        const mentor = mentorMap.get(String(r.mentorId || ''));
        if (!mentor) return r;

        const myRating = (mentor.mentorRatings || []).find(
          mr => String(mr.studentId || '') === String(studentId)
        );

        return {
          ...r,
          mentorName: mentor.fullName || r.mentorName || 'Mentor',
          mentorAvgRating: Number(mentor.avgRating || 0),
          mentorRatingCount: Number(mentor.ratingCount || 0),
          myMentorRating: myRating ? Number(myRating.rating || 0) : null,
          myMentorReview: myRating?.review || ''
        };
      });

      return res.json({ success:true, data: enriched });
    }
    const list = (app.locals.mentorshipRequests || []).filter(r => r.studentId === studentId);
    const enriched = (list || []).map((r) => {
      const mentor = users.find(u => String(u._id || u.id) === String(r.mentorId || ''));
      if (!mentor) return r;
      const myRating = (mentor.mentorRatings || []).find(
        mr => String(mr.studentId || '') === String(studentId)
      );
      return {
        ...r,
        mentorName: mentor.fullName || r.mentorName || 'Mentor',
        mentorAvgRating: Number(mentor.avgRating || 0),
        mentorRatingCount: Number(mentor.ratingCount || 0),
        myMentorRating: myRating ? Number(myRating.rating || 0) : null,
        myMentorReview: myRating?.review || ''
      };
    });
    return res.json({ success:true, data: enriched });
  } catch (err) {
    console.error('Error listing my requests', err);
    res.status(500).json({ success:false, message: 'Server error' });
  }
});

const rateMentorHandler = async (req, res) => {
  try {
    const studentId = String(req.userId || '');
    const { mentorId, rating, review } = req.body;
    const mentorIdString = String(mentorId || '').trim();
    const ratingNumber = Number(rating);

    if (!mentorIdString) {
      return res.status(400).json({ success: false, message: 'Mentor ID is required' });
    }

    if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    if (mongoose.connection.readyState === 1) {
      const mentorship = await MentorshipRequest.findOne({
        studentId,
        mentorId: mentorIdString,
        status: 'accepted'
      }).lean();

      if (!mentorship) {
        return res.status(403).json({ success: false, message: 'You can rate only your accepted mentor' });
      }

      if (!mongoose.Types.ObjectId.isValid(mentorIdString)) {
        return res.status(400).json({ success: false, message: 'Invalid mentor ID' });
      }

      const [mentor, student] = await Promise.all([
        User.findById(mentorIdString),
        User.findById(studentId).select('fullName')
      ]);

      if (!mentor || String(mentor.userType || '').toLowerCase() !== 'alumni') {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }

      mentor.mentorRatings = mentor.mentorRatings || [];
      const existingIndex = mentor.mentorRatings.findIndex(r => String(r.studentId || '') === studentId);

      const ratingPayload = {
        studentId,
        studentName: student?.fullName || 'Student',
        rating: Math.round(ratingNumber),
        review: String(review || '').trim(),
        updatedAt: new Date()
      };

      if (existingIndex >= 0) {
        mentor.mentorRatings[existingIndex] = { ...mentor.mentorRatings[existingIndex], ...ratingPayload };
      } else {
        mentor.mentorRatings.push(ratingPayload);
      }

      const ratings = (mentor.mentorRatings || [])
        .map(r => Number(r.rating))
        .filter(v => Number.isFinite(v) && v >= 1 && v <= 5);

      mentor.ratingCount = ratings.length;
      mentor.avgRating = ratings.length > 0
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
        : 0;
      mentor.lastActive = new Date();
      mentor.notifications = mentor.notifications || [];
      mentor.notifications.push({
        type: 'mentor_rating',
        message: `${student?.fullName || 'A student'} rated your mentorship ${Math.round(ratingNumber)}/5`,
        actorId: studentId,
        actorName: student?.fullName || 'Student',
        read: false,
        createdAt: new Date()
      });

      await mentor.save();

      return res.json({
        success: true,
        message: 'Rating submitted successfully',
        data: {
          mentorId: mentorIdString,
          myRating: Math.round(ratingNumber),
          mentorAvgRating: mentor.avgRating,
          mentorRatingCount: mentor.ratingCount
        }
      });
    }

    const mentorship = (app.locals.mentorshipRequests || []).find(r =>
      String(r.studentId || '') === studentId &&
      String(r.mentorId || '') === mentorIdString &&
      String(r.status || '').toLowerCase() === 'accepted'
    );

    if (!mentorship) {
      return res.status(403).json({ success: false, message: 'You can rate only your accepted mentor' });
    }

    const mentor = users.find(u => String(u._id || u.id) === mentorIdString || String(u.id) === mentorIdString);
    const student = users.find(u => String(u._id || u.id) === studentId || String(u.id) === studentId);

    if (!mentor || String(mentor.userType || '').toLowerCase() !== 'alumni') {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    mentor.mentorRatings = mentor.mentorRatings || [];
    const existingIndex = mentor.mentorRatings.findIndex(r => String(r.studentId || '') === studentId);
    const ratingPayload = {
      studentId,
      studentName: student?.fullName || 'Student',
      rating: Math.round(ratingNumber),
      review: String(review || '').trim(),
      updatedAt: new Date()
    };

    if (existingIndex >= 0) mentor.mentorRatings[existingIndex] = { ...mentor.mentorRatings[existingIndex], ...ratingPayload };
    else mentor.mentorRatings.push(ratingPayload);

    const ratings = (mentor.mentorRatings || [])
      .map(r => Number(r.rating))
      .filter(v => Number.isFinite(v) && v >= 1 && v <= 5);

    mentor.ratingCount = ratings.length;
    mentor.avgRating = ratings.length > 0
      ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
      : 0;
    mentor.lastActive = new Date();
    mentor.notifications = mentor.notifications || [];
    mentor.notifications.push({
      type: 'mentor_rating',
      message: `${student?.fullName || 'A student'} rated your mentorship ${Math.round(ratingNumber)}/5`,
      actorId: studentId,
      actorName: student?.fullName || 'Student',
      read: false,
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        mentorId: mentorIdString,
        myRating: Math.round(ratingNumber),
        mentorAvgRating: mentor.avgRating,
        mentorRatingCount: mentor.ratingCount
      }
    });
  } catch (err) {
    console.error('Error rating mentor:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/mentorship/rate-mentor - student rates an accepted mentor
app.post('/api/mentorship/rate-mentor', verifyToken, rateMentorHandler);

// POST /api/mentorship/rate - compatibility alias
app.post('/api/mentorship/rate', verifyToken, rateMentorHandler);

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
      const data = students.map(s=>({
        _id: s._id,
        fullName: s.fullName,
        sessions: s.sessions || 0,
        sessionsGoal: 10,
        progress: ((s.sessions||0)/10),
        userId: s._id,
        skills: Array.isArray(s.skills) ? s.skills : [],
        endorsements: Array.isArray(s.endorsements) ? s.endorsements : []
      }))
      return res.json({ success:true, data })
    }
    // in-memory fallback
    const list = (app.locals.mentorshipRequests || []).filter(r => r.mentorId === mentorId && r.status === 'accepted')
    const usersList = app.locals.users || []
    const data = list.map(l => {
      const user = usersList.find(u => String(u.id || u._id) === String(l.studentId)) || {}
      return {
        id: l.studentId,
        fullName: l.studentName,
        sessions: user.sessions || 0,
        sessionsGoal: 10,
        progress: (user.sessions || 0) / 10,
        skills: Array.isArray(user.skills) ? user.skills : [],
        endorsements: Array.isArray(user.endorsements) ? user.endorsements : []
      }
    })
    return res.json({ success:true, data })
  } catch (err) {
    console.error('Error listing mentees', err)
    return res.status(500).json({ success:false, message: 'Server error' })
  }
})

// GET /api/alumni/analytics - dashboard analytics for logged-in alumni
app.get('/api/alumni/analytics', verifyToken, async (req, res) => {
  try {
    const alumniId = req.userId

    if (mongoose.connection.readyState === 1) {
      const alumni = await User.findById(alumniId).lean()
      if (!alumni) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }

      // Accepted mentorships handled by this alumni
      const accepted = await MentorshipRequest.find({ mentorId: alumniId, status: 'accepted' }).lean()
      const menteeIds = accepted.map(r => r.studentId)

      const mentees = menteeIds.length > 0
        ? await User.find({ _id: { $in: menteeIds } }).select('sessions avgRating').lean()
        : []

      const mentorshipMatches = accepted.length
      const sessionsConducted = mentees.reduce((sum, m) => sum + (m.sessions || 0), 0)
      const ratedMentees = mentees.filter(m => typeof m.avgRating === 'number' && m.avgRating > 0)
      const avgRating = ratedMentees.length
        ? Number((ratedMentees.reduce((sum, m) => sum + (m.avgRating || 0), 0) / ratedMentees.length).toFixed(1))
        : Number((Number(alumni.avgRating || 0)).toFixed(1))

      return res.json({
        success: true,
        data: {
          mentorshipMatches,
          sessionsConducted,
          avgRating,
          activeMentees: mentees.length
        }
      })
    }

    // In-memory fallback
    const requests = (app.locals.mentorshipRequests || []).filter(r => String(r.mentorId) === String(alumniId) && r.status === 'accepted')
    const usersList = app.locals.users || []
    const mentees = usersList.filter(u => requests.some(r => String(r.studentId) === String(u.id || u._id)))

    const mentorshipMatches = requests.length
    const sessionsConducted = mentees.reduce((sum, m) => sum + (m.sessions || 0), 0)
    const ratedMentees = mentees.filter(m => typeof m.avgRating === 'number' && m.avgRating > 0)
    const avgRating = ratedMentees.length
      ? Number((ratedMentees.reduce((sum, m) => sum + (m.avgRating || 0), 0) / ratedMentees.length).toFixed(1))
      : 0

    return res.json({
      success: true,
      data: {
        mentorshipMatches,
        sessionsConducted,
        avgRating,
        activeMentees: mentees.length
      }
    })
  } catch (err) {
    console.error('Error fetching alumni analytics', err)
    return res.status(500).json({ success: false, message: 'Server error' })
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
  {
    key: 'first_step',
    name: 'First Step',
    description: 'Started the mentorship journey',
    tasks: ['Send first mentorship request', 'Attend first mentor interaction']
  },
  {
    key: 'skill_grower',
    name: 'Skill Grower',
    description: 'Demonstrated strong skill improvement',
    tasks: ['Complete at least 2 skill-building activities', 'Show progress in endorsed skills']
  },
  {
    key: 'project_builder',
    name: 'Project Builder',
    description: 'Built and shared impactful projects',
    tasks: ['Upload project details', 'Demonstrate practical implementation']
  },
  {
    key: 'event_achiever',
    name: 'Event Achiever',
    description: 'Actively participated in events/webinars',
    tasks: ['Attend alumni event/webinar', 'Engage through queries or feedback']
  },
  {
    key: 'community_contributor',
    name: 'Community Contributor',
    description: 'Contributed positively to the student community',
    tasks: ['Help peers or juniors', 'Maintain positive collaboration']
  },
  {
    key: 'career_ready',
    name: 'Career Ready',
    description: 'Showed readiness for internships/jobs',
    tasks: ['Complete profile and resume', 'Actively apply and prepare for opportunities']
  }
]

// GET /api/badges - list available badge types
app.get('/api/badges', (req, res) => {
  res.json({ success: true, data: BADGE_DEFINITIONS })
})

// POST /api/badges/award - award a badge to a user (requires auth)
app.post('/api/badges/award', verifyToken, async (req, res) => {
  try {
    const { targetUserId, badgeKey, message } = req.body;
    if (!targetUserId || !badgeKey) return res.status(400).json({ success:false, message: 'Missing fields' });
    
    const actorId = req.userId;
    
    // Only alumni can award badges
    let actor = null;
    if (mongoose.connection.readyState === 1) {
      actor = await User.findById(actorId).select('fullName userType');
      if (!actor || actor.userType !== 'alumni') {
        return res.status(403).json({ success: false, message: 'Only alumni can award badges' });
      }
    } else {
      actor = users.find(u => (u._id || u.id) === actorId || u.id === parseInt(actorId));
      if (!actor || actor.userType !== 'alumni') {
        return res.status(403).json({ success: false, message: 'Only alumni can award badges' });
      }
    }
    
    const def = BADGE_DEFINITIONS.find(b=>b.key===badgeKey);
    if (!def) return res.status(400).json({ success:false, message: 'Unknown badge' });

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(targetUserId);
      if (!user) return res.status(404).json({ success:false, message: 'User not found' });
      user.badges = user.badges || [];
      // Allow multiple awards of same badge from different alumni
      user.badges.push({ 
        key: badgeKey, 
        name: def.name, 
        description: def.description, 
        source: 'alumni',
        giverId: actorId,
        giverName: actor.fullName,
        message: message || null,
        awardedAt: new Date()
      });
      await user.save();
      
      // Create notification for target user
      user.notifications = user.notifications || [];
      user.notifications.push({ 
        type: 'badge', 
        message: `${actor.fullName} awarded you the "${def.name}" badge${message ? ': ' + message : ''}`, 
        actorId, 
        actorName: actor.fullName, 
        read: false 
      });
      await user.save();
      
      return res.json({success:true, data: { badge: user.badges[user.badges.length - 1], message: 'Badge awarded successfully' }});
    }

    // in-memory fallback
    const u = users.find(x=>String(x.id)===String(targetUserId));
    if (!u) return res.status(404).json({ success:false, message: 'User not found' });
    u.badges = u.badges || [];
    u.badges.push({ 
      key: badgeKey, 
      name: def.name, 
      description: def.description, 
      awardedAt: new Date(), 
      source: 'alumni',
      giverId: actorId,
      giverName: actor.fullName,
      message: message || null
    });
    
    u.notifications = u.notifications || [];
    u.notifications.push({ 
      type: 'badge', 
      message: `${actor.fullName} awarded you the "${def.name}" badge${message ? ': ' + message : ''}`, 
      actorId, 
      actorName: actor.fullName, 
      read: false 
    });
    
    return res.json({success:true, data: { badge: u.badges[u.badges.length - 1], message: 'Badge awarded successfully' }});
  } catch (err) {
    console.error('Error awarding badge', err);
    return res.status(500).json({ success:false, message: 'Server error' });
  }
});

// POST /api/auth/login - Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const mongoReady = await waitForMongoReady();
    const { email, password, loginAs } = req.body;

    await ensureDefaultMentorsSeeded();

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const normalizedLoginAs = loginAs ? String(loginAs).toLowerCase().trim() : '';
    if (normalizedLoginAs && !['student', 'alumni'].includes(normalizedLoginAs)) {
      return res.status(400).json({ success: false, message: 'Invalid login role' });
    }

    let user = null;

    if (mongoReady) {
      // Find user in MongoDB
      user = await User.findOne({ email });
    } else {
      // Fallback to in-memory storage
      user = users.find(u => u.email === email);
    }


    if (!user) {
      // User not found: generic error
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Compare password
    let isPasswordValid;
    if (mongoReady) {
      isPasswordValid = await user.comparePassword(password);
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      // Wrong password: generic error
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // User exists and password is correct, now check dashboard type
    const normalizedUserType = String(user.userType || '').toLowerCase().trim();
    if (normalizedLoginAs && normalizedUserType !== normalizedLoginAs) {
      return res.status(403).json({
        success: false,
        message: normalizedLoginAs === 'student'
          ? 'This is a student login. Please use the correct credentials for this student.'
          : 'This is an alumni login. Please use the correct credentials for alumni.'
      });
    }

    await saveRecentLoginCredential({
      email: user.email,
      password,
      role: normalizedUserType
    });

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

// POST /api/auth/forgot-password - Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const mongoReady = mongoose.connection.readyState === 1;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user = null;
    if (mongoReady) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else {
      user = users.find(u => u.email === email.toLowerCase().trim());
    }

    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({ success: true, message: 'If email exists, password reset link sent to your email' });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    if (mongoReady) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetToken: resetTokenHash,
            passwordResetExpires: resetExpires
          }
        }
      );
    } else {
      user.passwordResetToken = resetTokenHash;
      user.passwordResetExpires = resetExpires;
    }

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const isDevLike = process.env.NODE_ENV !== 'production';

    if (transporter) {
      // Fire-and-forget to keep API fast
      void transporter.sendMail({
        from: EMAIL_USER,
        to: email,
        subject: 'AlumniConnect - Password Reset Request',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>AlumniConnect Team</p>
        `
      }).then(() => {
        console.log(`✅ Password reset email sent to ${email}`);
      }).catch((emailErr) => {
        console.error('Error sending reset email:', emailErr.message);
      });
      return res.json({ success: true, message: 'If email exists, password reset link sent to your email' });
    }

    if (isDevLike) {
      return res.json({
        success: true,
        message: 'Email service is unavailable. Use the reset link below for development.',
        resetLink
      });
    }

    res.json({ success: true, message: 'If email exists, password reset link sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error during password reset request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const mongoReady = await waitForMongoReady();
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token, email, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    let user = null;
    if (mongoReady) {
      user = await User.findOne({
        email: email.toLowerCase().trim(),
        passwordResetToken: resetTokenHash,
        passwordResetExpires: { $gt: new Date() } // Token must not be expired
      });
    } else {
      user = users.find(u =>
        u.email === email.toLowerCase().trim() &&
        u.passwordResetToken === resetTokenHash &&
        u.passwordResetExpires > new Date()
      );
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Update password
    if (mongoReady) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null
          }
        }
      );
    } else {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
    }

    res.json({ success: true, message: 'Password reset successful. You can now login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
});

// GET /api/auth/recent-logins - Get backend saved recent login credentials
app.get('/api/auth/recent-logins', async (req, res) => {
  try {
    const role = String(req.query.role || '').toLowerCase().trim();
    if (role && !['student', 'alumni'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const data = await getRecentLoginCredentials(role);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching recent logins:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
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

    console.log('👤 Profile fetch - Bio value:', {
      userId: req.userId,
      bioExists: !!userResponse.bio,
      bioLength: userResponse.bio?.length || 0,
      bioPreview: userResponse.bio?.substring(0, 50)
    });

    res.json({ success: true, data: userResponse });
  } catch (err) {
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

// PUT /api/profile/skills - Update student skills
app.put('/api/profile/skills', verifyToken, async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ success: false, message: 'Skills must be an array' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { skills: skills.filter(s => s.trim()).map(s => s.trim()) },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      return res.json({ success: true, message: 'Skills updated', data: user });
    }

    res.json({ success: true, message: 'Skills updated' });
  } catch (err) {
    console.error('Error updating skills:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profile/projects - Update student projects
app.put('/api/profile/projects', verifyToken, async (req, res) => {
  try {
    const { projects } = req.body;
    
    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({ success: false, message: 'Projects must be an array' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { projects },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      return res.json({ success: true, message: 'Projects updated', data: user });
    }

    res.json({ success: true, message: 'Projects updated' });
  } catch (err) {
    console.error('Error updating projects:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/profile/upload-resume - Upload student resume
app.post('/api/profile/upload-resume', verifyToken, async (req, res) => {
  try {
    const { resumeBase64, fileName } = req.body;
    
    if (!resumeBase64 || !fileName) {
      return res.status(400).json({ success: false, message: 'Resume file and name required' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          resume: {
            fileName,
            filePath: `resumes/${req.userId}/${fileName}`,
            uploadedAt: new Date()
          }
        },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Store the base64 in app.locals for now (in production, use file storage)
      if (!app.locals.resumeStorage) {
        app.locals.resumeStorage = {};
      }
      app.locals.resumeStorage[`${req.userId}/${fileName}`] = resumeBase64;

      return res.json({ success: true, message: 'Resume uploaded successfully', data: user });
    }

    res.json({ success: true, message: 'Resume uploaded successfully' });
  } catch (err) {
    console.error('Error uploading resume:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/profile/upload-photo - Upload profile photo
app.post('/api/profile/upload-photo', verifyToken, async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    console.log('📸 Photo upload request received. User ID:', req.userId, 'Photo size:', photoBase64?.length || 0, 'bytes');

    if (!photoBase64) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { photo: photoBase64 },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      console.log('✅ Photo uploaded successfully for user:', req.userId);
      return res.json({ success: true, message: 'Photo uploaded successfully', data: user });
    }

    console.log('⚠️  MongoDB not connected, skipping photo save');
    res.json({ success: true, message: 'Photo uploaded successfully' });
  } catch (err) {
    console.error('❌ Error uploading photo:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

const removeCurrentUserPhoto = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { photo: null },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      return res.json({ success: true, message: 'Photo removed successfully', data: user });
    }

    const fallbackUser = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    if (!fallbackUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    fallbackUser.photo = null;
    return res.json({ success: true, message: 'Photo removed successfully', data: fallbackUser });
  } catch (err) {
    console.error('❌ Error deleting photo:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

// DELETE /api/profile/photo - Remove current user's profile photo
app.delete('/api/profile/photo', verifyToken, removeCurrentUserPhoto);

// POST /api/profile/delete-photo - Backward-compatible remove photo endpoint
app.post('/api/profile/delete-photo', verifyToken, removeCurrentUserPhoto);

// GET /api/students/:studentId/profile - Get student profile with skills, projects, resume
app.get('/api/students/:studentId/profile', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await User.findById(req.params.studentId)
        .select('fullName email photo skills projects resume linkedinUrl githubUrl');

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      return res.json({ success: true, data: student });
    }

    res.json({ success: true, message: 'Student profile fetched' });
  } catch (err) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/profile/resume/:studentId - Get student resume
app.get('/api/profile/resume/:studentId', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await User.findById(req.params.studentId).select('resume');

      if (!student || !student.resume || !student.resume.filePath) {
        return res.status(404).json({ success: false, message: 'Resume not found' });
      }

      // Get resume from storage
      const resumeBase64 = app.locals.resumeStorage?.[student.resume.filePath];
      if (!resumeBase64) {
        return res.status(404).json({ success: false, message: 'Resume file not found' });
      }

      return res.json({ 
        success: true, 
        data: {
          fileName: student.resume.fileName,
          base64: resumeBase64,
          uploadedAt: student.resume.uploadedAt
        }
      });
    }

    res.json({ success: false, message: 'Resume not available' });
  } catch (err) {
    console.error('Error fetching resume:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/profile - Update user profile
app.put('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const {
      fullName,
      company,
      skills,
      linkedinUrl,
      githubUrl,
      role,
      experience,
      industry,
      availability,
      bio,
      photo,
      institution
    } = req.body;
    let user = null;
    const normalizedInstitution = institution !== undefined ? String(institution || '').trim() : undefined;

    if (normalizedInstitution !== undefined && normalizedInstitution.length > 0) {
      if (!AP_ENGINEERING_COLLEGES_NORMALIZED.has(normalizedInstitution.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Please select a valid institution from AP engineering colleges list' });
      }
    }

    const normalizedSkills = skills !== undefined
      ? (Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean))
      : undefined;

    if (mongoose.connection.readyState === 1) {
      // Update in MongoDB
      const updateFields = {};
      if (fullName !== undefined) updateFields.fullName = fullName;
      if (company !== undefined) updateFields.company = company;
      if (linkedinUrl !== undefined) updateFields.linkedinUrl = linkedinUrl;
      if (githubUrl !== undefined) updateFields.githubUrl = githubUrl;
      if (normalizedSkills !== undefined) updateFields.skills = normalizedSkills;
      if (role !== undefined) updateFields.role = role;
      if (experience !== undefined) updateFields.experience = experience;
      if (industry !== undefined) updateFields.industry = industry;
      if (availability !== undefined) updateFields.availability = availability;
      if (bio !== undefined) updateFields.bio = bio;
      if (photo !== undefined) updateFields.photo = photo || null;
      if (normalizedInstitution !== undefined) updateFields.institution = normalizedInstitution || null;

      user = await User.findByIdAndUpdate(
        req.userId,
        updateFields,
        { new: true }
      ).select('-password');
    } else {
      // Fallback to in-memory storage
      user = users.find(u => u.id === req.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (fullName !== undefined) user.fullName = fullName;
      if (company !== undefined) user.company = company;
      if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
      if (githubUrl !== undefined) user.githubUrl = githubUrl;
      if (normalizedSkills !== undefined) user.skills = normalizedSkills;
      if (role !== undefined) user.role = role;
      if (experience !== undefined) user.experience = experience;
      if (industry !== undefined) user.industry = industry;
      if (availability !== undefined) user.availability = availability;
      if (bio !== undefined) user.bio = bio;
      if (photo !== undefined) user.photo = photo || null;
      if (normalizedInstitution !== undefined) user.institution = normalizedInstitution || null;
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

    const viewerId = req.userId;
    let viewer = null;
    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      viewer = await User.findById(viewerId).select('fullName userType');
      targetUser = await User.findById(targetUserId);
    } else {
      viewer = users.find(u => (u._id || u.id) === viewerId || u.id === parseInt(viewerId));
      targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
    }

    if (!viewer) return res.status(404).json({ success: false, message: 'Viewer not found' });
    if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });

    // Only alumni visits to student profiles are tracked
    if (viewer.userType !== 'alumni') {
      return res.status(403).json({ success: false, message: 'Only alumni profile visits are tracked' });
    }
    if (targetUser.userType !== 'student') {
      return res.status(400).json({ success: false, message: 'Only student profile visits are tracked' });
    }

    if (String(viewerId) === String(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Self profile views are not tracked' });
    }

    const viewerName = viewer.fullName || 'Someone';

    const visitRecord = { viewerId: viewerId.toString(), viewerName, viewedAt: new Date() };

    if (mongoose.connection.readyState === 1) {
      targetUser.visitors = targetUser.visitors || [];
      const existingIndex = targetUser.visitors.findIndex(v => String(v.viewerId) === String(viewerId));
      if (existingIndex >= 0) {
        targetUser.visitors[existingIndex].viewerName = viewerName;
        targetUser.visitors[existingIndex].viewedAt = new Date();
      } else {
        targetUser.visitors.push(visitRecord);
      }
      await targetUser.save();
    } else {
      targetUser.visitors = targetUser.visitors || [];
      const existingIndex = targetUser.visitors.findIndex(v => String(v.viewerId) === String(viewerId));
      if (existingIndex >= 0) {
        targetUser.visitors[existingIndex].viewerName = viewerName;
        targetUser.visitors[existingIndex].viewedAt = new Date();
      } else {
        targetUser.visitors.push(visitRecord);
      }
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

    const uniqueVisitorsMap = new Map();
    (user.visitors || []).forEach(v => {
      const key = String(v.viewerId || '').trim() || `anon-${v.viewerName || 'Someone'}`;
      const existing = uniqueVisitorsMap.get(key);
      if (!existing || new Date(v.viewedAt || 0) > new Date(existing.viewedAt || 0)) {
        uniqueVisitorsMap.set(key, v);
      }
    });

    const uniqueVisitors = Array.from(uniqueVisitorsMap.values())
      .sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0));

    if (mongoose.connection.readyState === 1) {
      const viewerIds = uniqueVisitors
        .map(v => String(v.viewerId || '').trim())
        .filter(Boolean)
        .filter(id => mongoose.Types.ObjectId.isValid(id));

      const viewerDocs = viewerIds.length > 0
        ? await User.find({ _id: { $in: viewerIds } }).select('_id fullName').lean()
        : [];

      const viewerNameMap = new Map(
        (viewerDocs || []).map(doc => [String(doc._id), String(doc.fullName || '').trim()])
      );

      const enrichedVisitors = uniqueVisitors.map((v) => {
        const resolvedName = viewerNameMap.get(String(v.viewerId || '').trim()) || v.viewerName || 'Someone';
        return {
          ...v,
          viewerName: resolvedName
        };
      });

      return res.json({ success: true, data: enrichedVisitors });
    }

    const viewerNameMap = new Map(
      (users || []).map(u => [String(u._id || u.id), String(u.fullName || '').trim()])
    );

    const enrichedVisitors = uniqueVisitors.map((v) => {
      const resolvedName = viewerNameMap.get(String(v.viewerId || '').trim()) || v.viewerName || 'Someone';
      return {
        ...v,
        viewerName: resolvedName
      };
    });

    res.json({ success: true, data: enrichedVisitors });
  } catch (err) {
    console.error('Error fetching visitors:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const parseExperienceYears = (value) => {
  const text = normalizeText(value);
  if (!text) return 0;
  const nums = text.match(/\d+/g) || [];
  if (nums.length === 0) return 0;
  if (nums.length >= 2) {
    const a = Number(nums[0]);
    const b = Number(nums[1]);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.round((a + b) / 2) : Number(nums[0]) || 0;
  }
  return Number(nums[0]) || 0;
};

const toExperienceBucket = (value) => {
  const years = parseExperienceYears(value);
  if (years >= 10) return '10+ years';
  if (years >= 5) return '5-10 years';
  if (years >= 2) return '2-5 years';
  return '0-2 years';
};

const inferIndustryFromSkills = (skills = []) => {
  const text = (skills || []).map(s => String(s || '').toLowerCase()).join(' ');
  if (!text) return 'Technology';
  if (/python|ml|ai|data|analytics|tensorflow|pytorch/.test(text)) return 'Data Science & AI';
  if (/aws|azure|gcp|cloud/.test(text)) return 'Cloud Computing';
  if (/security|cyber|pentest|soc/.test(text)) return 'Cybersecurity';
  if (/android|ios|flutter|react native|mobile/.test(text)) return 'Mobile Development';
  if (/ui|ux|figma|design/.test(text)) return 'UI/UX Design';
  if (/product|roadmap|agile|scrum/.test(text)) return 'Product Management';
  if (/devops|docker|kubernetes|ci\/cd/.test(text)) return 'DevOps';
  if (/react|node|java|spring|frontend|backend|web/.test(text)) return 'Software Development';
  return 'Technology';
};

const stableIndexFromValue = (value, size) => {
  const str = String(value || 'mentor');
  let sum = 0;
  for (let i = 0; i < str.length; i += 1) sum += str.charCodeAt(i);
  return size > 0 ? (sum % size) : 0;
};

const defaultAvailabilityFromIdentity = (mentor) => {
  const options = ['Weekdays', 'Weekends', 'Evenings', 'Flexible'];
  const key = mentor?._id || mentor?.id || mentor?.email || mentor?.fullName;
  return options[stableIndexFromValue(key, options.length)];
};

const normalizeAvailability = (value, fallbackMentor) => {
  const options = ['Weekdays', 'Weekends', 'Evenings', 'Flexible'];
  const raw = String(value || '').trim().toLowerCase();
  const found = options.find(opt => opt.toLowerCase() === raw);
  return found || defaultAvailabilityFromIdentity(fallbackMentor);
};

const normalizeIndustry = (value, skills) => {
  const options = [
    'Technology',
    'Software Development',
    'Data Science & AI',
    'Cloud Computing',
    'Cybersecurity',
    'Mobile Development',
    'Web Development',
    'DevOps',
    'Product Management',
    'UI/UX Design'
  ];
  const raw = String(value || '').trim().toLowerCase();
  const found = options.find(opt => opt.toLowerCase() === raw);
  return found || inferIndustryFromSkills(skills || []);
};

const buildMentorPayload = ({ user, requesterIsStudent, requester }) => {
  const displayRole = user.company ? `${user.role || 'Professional'} at ${user.company}` : (user.role || 'Alumni Professional');
  const experience = user.experience ? toExperienceBucket(user.experience) : '2-5 years';
  const industry = normalizeIndustry(user.industry, user.skills || []);
  const availability = normalizeAvailability(user.availability, user);

  return {
    id: user._id || user.id,
    name: user.fullName || user.name || 'Alumni',
    role: displayRole,
    company: user.company || 'AlumniConnect Network',
    skills: user.skills || [],
    matchPercentage: requesterIsStudent
      ? computeMentorMatchPercentage({ student: requester, mentor: user })
      : Math.max(45, Math.min(95, 50 + ((user.skills || []).length * 4) + (parseExperienceYears(user.experience) >= 5 ? 10 : 0))),
    photo: user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'Alumni')}&size=400&background=random`,
    experience,
    availability,
    industry,
    email: user.email,
    institution: user.institution || null
  };
};

const extractStudentLearningKeywords = (student) => {
  const words = new Set();
  const pushWords = (text) => {
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+.# ]/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length > 2)
      .forEach(w => words.add(w));
  };

  (student?.skills || []).forEach(pushWords);
  (student?.projects || []).forEach(project => {
    pushWords(project?.title);
    pushWords(project?.description);
    (project?.technologies || []).forEach(pushWords);
  });

  return words;
};

const computeMentorMatchPercentage = ({ student, mentor }) => {
  const studentSkills = (student?.skills || []).map(normalizeText).filter(Boolean);
  const mentorSkills = (mentor?.skills || []).map(normalizeText).filter(Boolean);
  const studentSkillSet = new Set(studentSkills);
  const mentorSkillSet = new Set(mentorSkills);

  const overlappingSkills = [...studentSkillSet].filter(skill => mentorSkillSet.has(skill));
  const skillScore = mentorSkillSet.size > 0
    ? Math.round((overlappingSkills.length / mentorSkillSet.size) * 55)
    : 0;

  const learningKeywords = extractStudentLearningKeywords(student);
  const mentorWorkText = [mentor?.company, mentor?.role, mentor?.industry].map(normalizeText).join(' ');
  let workplaceLearningMatches = 0;
  for (const keyword of learningKeywords) {
    if (mentorWorkText.includes(keyword)) workplaceLearningMatches += 1;
  }
  const workplaceLearningScore = Math.min(15, workplaceLearningMatches * 2);

  const mentorYears = parseExperienceYears(mentor?.experience);
  const experienceScore = mentorYears >= 10 ? 12 : mentorYears >= 5 ? 10 : mentorYears >= 2 ? 7 : mentorYears > 0 ? 4 : 2;

  const sameInstitution = normalizeText(student?.institution) && normalizeText(student?.institution) === normalizeText(mentor?.institution);
  const institutionScore = sameInstitution ? 10 : 0;

  const rawScore = skillScore + workplaceLearningScore + experienceScore + institutionScore;
  return Math.max(35, Math.min(98, rawScore));
};

// GET all mentors - Fetch real alumni users who can be mentors
app.get('/api/mentors', async (req, res) => {
  try {
    await ensureDefaultMentorsSeeded();

    let requester = null;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const requesterId = decoded?.id;
        if (requesterId) {
          if (mongoose.connection.readyState === 1) {
            requester = await User.findById(requesterId).select('userType institution skills projects').lean();
          } else {
            requester = users.find(u => String(u._id || u.id) === String(requesterId)) || null;
          }
        }
      } catch (_err) {
        requester = null;
      }
    }

    const requesterIsStudent = String(requester?.userType || '').toLowerCase() === 'student';
    const requesterInstitution = resolveInstitutionName(String(requester?.institution || '').trim());
    const requesterInstitutionKey = normalizeInstitutionKey(requesterInstitution);

    // Students must have institution configured to discover alumni
    if (requesterIsStudent && !requesterInstitution) {
      return res.json({ success: true, data: [] });
    }

    const shouldPrioritizeByInstitution = requesterIsStudent && Boolean(requesterInstitutionKey);

    if (mongoose.connection.readyState === 1) {
      // Fetch alumni users from MongoDB
      const alumniUsers = await User.find({ userType: 'alumni' })
        .select('-password')
        .lean();

      const sameInstitutionUsers = alumniUsers.filter(
        (user) => normalizeInstitutionKey(resolveInstitutionName(user?.institution)) === requesterInstitutionKey
      );
      const otherInstitutionUsers = alumniUsers.filter(
        (user) => normalizeInstitutionKey(resolveInstitutionName(user?.institution)) !== requesterInstitutionKey
      );
      const visibleAlumniUsers = shouldPrioritizeByInstitution
        ? [...sameInstitutionUsers, ...otherInstitutionUsers]
        : alumniUsers;
      
      // Transform to mentor format expected by frontend
      const mentorsList = visibleAlumniUsers.map(user => buildMentorPayload({ user, requesterIsStudent, requester }));
      
      return res.json({ success: true, data: mentorsList });
    }
    
    // Fallback: filter in-memory users for alumni
    const alumniUsers = users.filter((u) => u.userType === 'alumni');
    const sameInstitutionUsers = alumniUsers.filter(
      (u) => normalizeInstitutionKey(resolveInstitutionName(u.institution)) === requesterInstitutionKey
    );
    const otherInstitutionUsers = alumniUsers.filter(
      (u) => normalizeInstitutionKey(resolveInstitutionName(u.institution)) !== requesterInstitutionKey
    );
    const visibleAlumniUsers = shouldPrioritizeByInstitution
      ? [...sameInstitutionUsers, ...otherInstitutionUsers]
      : alumniUsers;
    const mentorsList = visibleAlumniUsers.map(user => buildMentorPayload({ user, requesterIsStudent, requester }));
    
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
    let requester = null;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const requesterId = decoded?.id;
        if (requesterId) {
          if (mongoose.connection.readyState === 1) {
            requester = await User.findById(requesterId)
              .select('userType institution skills projects')
              .lean();
          } else {
            requester = users.find(u => String(u._id || u.id) === String(requesterId)) || null;
          }
        }
      } catch (_err) {
        requester = null;
      }
    }
    const requesterIsStudent = String(requester?.userType || '').toLowerCase() === 'student';
    
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid mentor ID' });
      }
      
      const user = await User.findById(id).select('-password').lean();
      if (!user || user.userType !== 'alumni') {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }
      
      const mentor = buildMentorPayload({ user, requesterIsStudent, requester });
      
      return res.json({ success: true, data: mentor });
    }
    
    // Fallback
    const user = users.find(u => String(u.id) === String(id) || String(u._id) === String(id));
    if (!user || user.userType !== 'alumni') {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }
    
    const mentor = buildMentorPayload({ user, requesterIsStudent, requester });
    
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
    const normalizedSkill = String(skill || '').trim();
    if (!normalizedSkill) return res.status(400).json({ success: false, message: 'Skill is required' });

    const actorId = req.userId;
    
    // Prevent self-endorsement
    if (actorId === targetUserId) {
      return res.status(403).json({ success: false, message: 'You cannot endorse your own skills' });
    }

    let actorName = 'Someone';
    let actor = null;
    if (mongoose.connection.readyState === 1) {
      actor = await User.findById(actorId).select('fullName userType');
      if (actor) actorName = actor.fullName;
    } else {
      actor = users.find(u => (u._id || u.id) === actorId || u.id === parseInt(actorId));
      if (actor) actorName = actor.fullName;
    }

    // Only alumni can endorse
    if (!actor || actor.userType !== 'alumni') {
      return res.status(403).json({ success: false, message: 'Only alumni can endorse skills' });
    }

    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });

      const userSkills = Array.isArray(targetUser.skills) ? targetUser.skills : [];
      const hasSkill = userSkills.some(s => String(s).trim().toLowerCase() === normalizedSkill.toLowerCase());
      if (!hasSkill) {
        return res.status(400).json({ success: false, message: 'You can only endorse skills uploaded by the student' });
      }

      const existing = (targetUser.endorsements || []).find(e => e.skill.toLowerCase() === normalizedSkill.toLowerCase());
      if (existing) existing.count += 1;
      else targetUser.endorsements.push({ skill: normalizedSkill, count: 1 });
      await targetUser.save();
    } else {
      targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });

      const userSkills = Array.isArray(targetUser.skills) ? targetUser.skills : [];
      const hasSkill = userSkills.some(s => String(s).trim().toLowerCase() === normalizedSkill.toLowerCase());
      if (!hasSkill) {
        return res.status(400).json({ success: false, message: 'You can only endorse skills uploaded by the student' });
      }

      targetUser.endorsements = targetUser.endorsements || [];
      const existing = targetUser.endorsements.find(e => e.skill.toLowerCase() === normalizedSkill.toLowerCase());
      if (existing) existing.count += 1;
      else targetUser.endorsements.push({ skill: normalizedSkill, count: 1 });
    }

    // create notification for target user
    if (mongoose.connection.readyState === 1) {
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'endorsement', message: `${actorName} endorsed your skill: ${normalizedSkill}`, actorId, actorName, read: false });
      await targetUser.save();
    } else {
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'endorsement', message: `${actorName} endorsed your skill: ${normalizedSkill}`, actorId, actorName, read: false });
    }

    res.json({ success: true, message: 'Endorsed', data: { skill: normalizedSkill } });
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
      const actor = await User.findById(actorId).select('fullName userType');
      const target = await User.findById(targetUserId).select('fullName userType');
      if (!target) return res.status(404).json({ success: false, message: 'Target user not found' });
      if (actor) actorName = actor.fullName;

      // Students can only message mentors who are currently accepted mentors
      if (actor?.userType === 'student') {
        const mentorship = await MentorshipRequest.findOne({
          studentId: String(actorId),
          mentorId: String(targetUserId),
          status: 'accepted'
        }).lean();
        if (!mentorship) {
          return res.status(403).json({ success: false, message: 'You can only message your current mentor' });
        }
      }

      const conversationId = [String(actorId), String(targetUserId)].sort().join('_');
      const message = new Message({
        fromId: actorId,
        fromName: actorName,
        toId: targetUserId,
        toName: target.fullName,
        subject: subject || '',
        body,
        conversationId,
        isRead: false
      });

      await message.save();

      // Legacy inbox compatibility
      const targetUser = await User.findById(targetUserId);
      if (targetUser) {
        targetUser.messages = targetUser.messages || [];
        targetUser.messages.push({ fromId: actorId, fromName: actorName, subject: subject || '', body, read: false, messageId: message._id, createdAt: new Date() });
        targetUser.notifications = targetUser.notifications || [];
        targetUser.notifications.push({ type: 'message', message: `${actorName} sent you a message`, actorId, actorName, read: false });
        await targetUser.save();
      }

      return res.json({ success: true, message: 'Message sent', data: message });
    } else {
      const actor = users.find(u => (u._id || u.id) === actorId || u.id === parseInt(actorId));
      if (actor) actorName = actor.fullName;
      const targetUser = users.find(u => (u._id || u.id) === targetUserId || u.id === parseInt(targetUserId));
      if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });

      if ((actor?.userType || '').toLowerCase() === 'student') {
        const reqs = app.locals.mentorshipRequests || [];
        const ok = reqs.some(r => String(r.studentId) === String(actorId) && String(r.mentorId) === String(targetUserId) && r.status === 'accepted');
        if (!ok) return res.status(403).json({ success: false, message: 'You can only message your current mentor' });
      }

      app.locals.messages = app.locals.messages || [];
      const message = {
        id: Date.now().toString(),
        fromId: actorId,
        fromName: actorName,
        toId: targetUserId,
        toName: targetUser.fullName || 'User',
        subject: subject || '',
        body,
        conversationId: [String(actorId), String(targetUserId)].sort().join('_'),
        isRead: false,
        createdAt: new Date()
      };
      app.locals.messages.push(message);

      targetUser.messages = targetUser.messages || [];
      targetUser.messages.push({ fromId: actorId, fromName: actorName, subject: subject || '', body, read: false, messageId: message.id, createdAt: new Date() });
      targetUser.notifications = targetUser.notifications || [];
      targetUser.notifications.push({ type: 'message', message: `${actorName} sent you a message`, actorId, actorName, read: false });

      return res.json({ success: true, message: 'Message sent', data: message });
    }
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/messages - get messages for authenticated user
app.get('/api/messages', verifyToken, async (req, res) => {
  try {
    const currentUserId = String(req.userId);
    if (mongoose.connection.readyState === 1) {
      const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedId = escapeRegex(currentUserId);
      const [messages, user] = await Promise.all([
        // conversationId lookup is robust across ObjectId/string serialization differences
        Message.find({
          $or: [
            { conversationId: { $regex: `^${escapedId}_` } },
            { conversationId: { $regex: `_${escapedId}$` } }
          ]
        })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        User.findById(req.userId).select('fullName messages').lean()
      ]);

      // Include legacy inbox-only messages for backward compatibility
      const legacy = (user?.messages || []).map((m, idx) => ({
        id: String(m.messageId || `legacy-${idx}-${new Date(m.createdAt || Date.now()).getTime()}`),
        fromId: String(m.fromId || ''),
        fromName: m.fromName || 'User',
        toId: currentUserId,
        toName: user?.fullName || 'User',
        subject: m.subject || '',
        body: m.body || '',
        isRead: !!(m.read || m.isRead),
        createdAt: m.createdAt || new Date()
      }));

      // Prefer canonical conversation documents. Include legacy inbox entries
      // only when canonical history is empty (older data/backward compatibility).
      const merged = messages.length > 0 ? [...messages] : [...legacy];
      const dedupedMap = new Map();
      const canonicalMessages = messages
        .map((m) => ({
          id: String(m._id || m.id || ''),
          fromId: String(m.fromId || ''),
          toId: String(m.toId || ''),
          subject: String(m.subject || ''),
          body: String(m.body || ''),
          createdAt: new Date(m.createdAt || 0).getTime()
        }))
        .filter((m) => !!m.id);

      const findCanonicalId = (m) => {
        const fromId = String(m.fromId || '');
        const toId = String(m.toId || '');
        const subject = String(m.subject || '');
        const body = String(m.body || '');
        const createdAt = new Date(m.createdAt || 0).getTime();

        const match = canonicalMessages.find((c) => (
          c.fromId === fromId &&
          c.toId === toId &&
          c.subject === subject &&
          c.body === body &&
          Math.abs(c.createdAt - createdAt) <= 5000
        ));

        return match?.id || '';
      };

      merged.forEach((m) => {
        const stableId = String(m._id || m.id || '');
        const ts = new Date(m.createdAt || 0).getTime();
        const canonicalId = stableId ? '' : findCanonicalId(m);
        const key = canonicalId || stableId || `${String(m.fromId || '')}|${String(m.toId || '')}|${String(m.body || '')}|${ts}`;
        if (!dedupedMap.has(key)) dedupedMap.set(key, m);
      });

      const combined = Array.from(dedupedMap.values())
        .map((m) => ({
          ...m,
          _id: String(m._id || m.id || ''),
          id: String(m._id || m.id || ''),
          fromId: String(m.fromId || ''),
          toId: String(m.toId || ''),
          fromName: m.fromName || 'User',
          toName: m.toName || '',
          isRead: !!(m.isRead || m.read)
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: combined });
    }

    app.locals.messages = app.locals.messages || [];
    const fromStore = app.locals.messages.filter(m => String(m.toId) === currentUserId || String(m.fromId) === currentUserId);
    const user = users.find(u => (u._id || u.id) === req.userId || u.id === parseInt(req.userId));
    const legacy = (user?.messages || []).map((m, idx) => ({
      id: String(m.messageId || `legacy-${idx}-${new Date(m.createdAt || Date.now()).getTime()}`),
      fromId: String(m.fromId || ''),
      fromName: m.fromName || 'User',
      toId: currentUserId,
      toName: user?.fullName || 'User',
      subject: m.subject || '',
      body: m.body || '',
      isRead: !!(m.read || m.isRead),
      createdAt: m.createdAt || new Date()
    }));

    // Prefer canonical in-memory conversation store. Include legacy inbox
    // entries only when canonical history is empty.
    const merged = fromStore.length > 0 ? [...fromStore] : [...legacy];
    const dedupedMap = new Map();
    const canonicalMessages = fromStore
      .map((m) => ({
        id: String(m._id || m.id || ''),
        fromId: String(m.fromId || ''),
        toId: String(m.toId || ''),
        subject: String(m.subject || ''),
        body: String(m.body || ''),
        createdAt: new Date(m.createdAt || 0).getTime()
      }))
      .filter((m) => !!m.id);

    const findCanonicalId = (m) => {
      const fromId = String(m.fromId || '');
      const toId = String(m.toId || '');
      const subject = String(m.subject || '');
      const body = String(m.body || '');
      const createdAt = new Date(m.createdAt || 0).getTime();

      const match = canonicalMessages.find((c) => (
        c.fromId === fromId &&
        c.toId === toId &&
        c.subject === subject &&
        c.body === body &&
        Math.abs(c.createdAt - createdAt) <= 5000
      ));

      return match?.id || '';
    };

    merged.forEach((m) => {
      const stableId = String(m._id || m.id || '');
      const ts = new Date(m.createdAt || 0).getTime();
      const canonicalId = stableId ? '' : findCanonicalId(m);
      const key = canonicalId || stableId || `${String(m.fromId || '')}|${String(m.toId || '')}|${String(m.body || '')}|${ts}`;
      if (!dedupedMap.has(key)) dedupedMap.set(key, m);
    });

    const combined = Array.from(dedupedMap.values())
      .map((m) => ({
        ...m,
        _id: String(m._id || m.id || ''),
        id: String(m._id || m.id || ''),
        fromId: String(m.fromId || ''),
        toId: String(m.toId || ''),
        fromName: m.fromName || 'User',
        toName: m.toName || '',
        isRead: !!(m.isRead || m.read)
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, data: combined });
  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/messages/:id/read - mark a message as read by recipient
app.post('/api/messages/:id/read', verifyToken, async (req, res) => {
  try {
    const messageId = String(req.params.id || '');
    const currentUserId = String(req.userId || '');
    if (!messageId) return res.status(400).json({ success: false, message: 'Message id required' });

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message id' });
      }

      const message = await Message.findById(messageId);
      if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
      if (String(message.toId || '') !== currentUserId) {
        return res.status(403).json({ success: false, message: 'Only recipient can mark message as read' });
      }

      message.isRead = true;
      await message.save();

      const recipient = await User.findById(currentUserId);
      if (recipient) {
        recipient.messages = (recipient.messages || []).map((m) => {
          if (String(m.messageId || '') === messageId) {
            return { ...m, read: true, isRead: true };
          }
          return m;
        });
        await recipient.save();
      }

      return res.json({ success: true, message: 'Message marked as read' });
    }

    app.locals.messages = app.locals.messages || [];
    const msg = app.locals.messages.find((m) => String(m.id || m._id || '') === messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    if (String(msg.toId || '') !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Only recipient can mark message as read' });
    }

    msg.isRead = true;
    const recipient = users.find(u => String(u._id || u.id) === currentUserId || String(u.id) === currentUserId);
    if (recipient) {
      recipient.messages = (recipient.messages || []).map((m) => {
        if (String(m.messageId || '') === messageId) return { ...m, read: true, isRead: true };
        return m;
      });
    }

    return res.json({ success: true, message: 'Message marked as read' });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/messages/:id - delete a message sent by the authenticated user
app.delete('/api/messages/:id', verifyToken, async (req, res) => {
  try {
    const normalizeId = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'object') {
        if (value.$oid) return String(value.$oid);
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
      }
      return String(value);
    };

    const messageId = String(req.params.id || '');
    const currentUserId = normalizeId(req.userId);
    const fallbackToId = normalizeId(req.body?.toId || req.query?.toId || '');
    const fallbackBody = String(req.body?.body || req.query?.body || '');
    const fallbackSubject = String(req.body?.subject || req.query?.subject || '');
    const fallbackCreatedAtRaw = req.body?.createdAt || req.query?.createdAt;
    const fallbackCreatedAt = fallbackCreatedAtRaw ? new Date(fallbackCreatedAtRaw) : null;
    if (!messageId) return res.status(400).json({ success: false, message: 'Message id required' });

    if (mongoose.connection.readyState === 1) {
      let message = null;
      if (mongoose.Types.ObjectId.isValid(messageId)) {
        message = await Message.findById(messageId);
      }

      // Fallback for older/non-objectId ids visible in UI
      if (!message && fallbackBody) {
        const query = {
          fromId: currentUserId,
          body: fallbackBody
        };
        if (fallbackToId) query.toId = fallbackToId;
        if (fallbackSubject) query.subject = fallbackSubject;
        if (fallbackCreatedAt && !Number.isNaN(fallbackCreatedAt.getTime())) {
          const start = new Date(fallbackCreatedAt.getTime() - 2000);
          const end = new Date(fallbackCreatedAt.getTime() + 2000);
          query.createdAt = { $gte: start, $lte: end };
        }
        message = await Message.findOne(query).sort({ createdAt: -1 });
      }

      if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

      if (String(message.fromId || '') !== currentUserId) {
        return res.status(403).json({ success: false, message: 'You can only delete messages sent by you' });
      }

      // Remove duplicates of same sent message as well
      await Message.deleteMany({
        fromId: message.fromId,
        toId: message.toId,
        body: message.body,
        subject: message.subject || ''
      });

      // Remove linked legacy inbox copy from recipient for backward compatibility
      const recipient = await User.findById(message.toId);
      if (recipient) {
        const mid = String(message._id || '');
        const fromId = String(message.fromId || '');
        const body = String(message.body || '');
        const subject = String(message.subject || '');

        recipient.messages = (recipient.messages || []).filter((m) => {
          const legacyMid = String(m.messageId || '');
          if (legacyMid && legacyMid === mid) return false;

          const sameSender = String(m.fromId || '') === fromId;
          const sameBody = String(m.body || '') === body;
          const sameSubject = String(m.subject || '') === subject;

          // cleanup pre-messageId legacy entries too
          if (!legacyMid && sameSender && sameBody && sameSubject) return false;
          return true;
        });

        await recipient.save();
      }

      return res.json({ success: true, message: 'Message deleted' });
    }

    app.locals.messages = app.locals.messages || [];
    const idx = app.locals.messages.findIndex(m => String(m.id || m._id || '') === messageId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Message not found' });

    const message = app.locals.messages[idx];
    if (String(message.fromId || '') !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You can only delete messages sent by you' });
    }

    app.locals.messages.splice(idx, 1);

    const toId = String(message.toId || '');
    const recipient = users.find(u => String(u._id || u.id) === toId || String(u.id) === toId);
    if (recipient) {
      const fromId = String(message.fromId || '');
      const body = String(message.body || '');
      const subject = String(message.subject || '');
      recipient.messages = (recipient.messages || []).filter((m) => {
        const legacyMid = String(m.messageId || '');
        if (legacyMid && legacyMid === messageId) return false;
        const sameSender = String(m.fromId || '') === fromId;
        const sameBody = String(m.body || '') === body;
        const sameSubject = String(m.subject || '') === subject;
        if (!legacyMid && sameSender && sameBody && sameSubject) return false;
        return true;
      });
    }

    return res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err);
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
      const student = await User.findById(studentId).select('fullName userType');
      const studentName = student?.fullName || 'Student';

      if ((student?.userType || '').toLowerCase() === 'student') {
        const mentorship = await MentorshipRequest.findOne({
          studentId: String(studentId),
          mentorId: String(mentorId),
          status: 'accepted'
        }).lean();
        if (!mentorship) {
          return res.status(403).json({ success: false, message: 'You can only message your current mentor' });
        }
      }
      
      // Send message to mentor
      const mentor = await User.findById(mentorId);
      if (!mentor) {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }

      const conversationId = [String(studentId), String(mentorId)].sort().join('_');
      const message = new Message({
        fromId: studentId,
        fromName: studentName,
        toId: mentorId,
        toName: mentor.fullName || 'Mentor',
        subject: 'Reply',
        body,
        conversationId,
        isRead: false
      });
      await message.save();
      
      mentor.messages = mentor.messages || [];
      mentor.messages.push({
        fromId: studentId,
        fromName: studentName,
        subject: 'Reply',
        body,
        read: false,
        isReply: true,
        messageId: message._id,
        createdAt: new Date()
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

      return res.json({ success: true, message: 'Reply sent successfully', data: message });
    }

    // In-memory fallback
    const reqs = app.locals.mentorshipRequests || [];
    const ok = reqs.some(r => String(r.studentId) === String(studentId) && String(r.mentorId) === String(mentorId) && r.status === 'accepted');
    if (!ok) return res.status(403).json({ success: false, message: 'You can only message your current mentor' });

    const mentor = users.find(u => String(u._id || u.id) === String(mentorId));
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });

    app.locals.messages = app.locals.messages || [];
    const message = {
      id: Date.now().toString(),
      fromId: studentId,
      fromName: 'Student',
      toId: mentorId,
      toName: mentor.fullName || 'Mentor',
      subject: 'Reply',
      body,
      conversationId: [String(studentId), String(mentorId)].sort().join('_'),
      isRead: false,
      createdAt: new Date()
    };
    app.locals.messages.push(message);

    mentor.messages = mentor.messages || [];
    mentor.messages.push({ fromId: studentId, fromName: 'Student', subject: 'Reply', body, read: false, isReply: true, messageId: message.id, createdAt: new Date() });
    mentor.notifications = mentor.notifications || [];
    mentor.notifications.push({ type: 'message', message: `Student replied to your message`, actorId: studentId, actorName: 'Student', read: false });
    
    return res.json({ success: true, message: 'Reply sent successfully', data: message });
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
    const visitorsCount = new Set((user.visitors || []).map(v => String(v.viewerId || '').trim()).filter(Boolean)).size;
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
app.get('/api/events', async (req, res) => {
  try {
    await ensureDefaultEventsSeeded();

    if (mongoose.connection.readyState === 1) {
      // Fetch from MongoDB
      const events = await Event.find({})
        .sort({ date: -1 })
        .lean();
      return res.json({ success: true, data: events });
    }
    // In-memory fallback
    const events = app.locals.events || [];
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const normalizeEmailValue = (email) => String(email || '').trim().toLowerCase();

const isEventOwnedByUser = (event, userId, userEmail = '') => {
  const creatorId = String(event?.createdBy?.userId || event?.createdBy || '').trim();
  const creatorEmail = normalizeEmailValue(event?.createdBy?.userEmail);
  const currentUserId = String(userId || '').trim();
  const currentUserEmail = normalizeEmailValue(userEmail);

  if (creatorId && currentUserId && creatorId === currentUserId) return true;
  if (creatorEmail && currentUserEmail && creatorEmail === currentUserEmail) return true;
  return false;
};

// POST /api/events - Create a new event (alumni only)
app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { title, description, date, time, location, category, eventLink, maxAttendees, tags } = req.body;
    const createdById = req.userId;

    // Validation
    if (!title || !description || !date) {
      return res.status(400).json({ success: false, message: 'Title, description, and date are required' });
    }

    // Get user info
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(createdById);
    } else {
      user = users.find(u => (u._id || u.id) === createdById || u.id === parseInt(createdById));
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify user is alumni
    if (user.userType !== 'alumni') {
      return res.status(403).json({ success: false, message: 'Only alumni can create events' });
    }

    if (mongoose.connection.readyState === 1) {
      // Save to MongoDB
      const newEvent = new Event({
        title,
        description,
        date: new Date(date),
        time: time || '00:00',
        location: location || 'Online',
        category: category || 'Other',
        eventLink: eventLink || null,
        maxAttendees: maxAttendees || null,
        tags: tags || [],
        createdBy: {
          userId: createdById,
          userName: user.fullName,
          userEmail: user.email
        }
      });
      await newEvent.save();
      return res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: newEvent
      });
    }

    // In-memory fallback
    const fallbackEvent = {
      id: `evt_${Date.now()}`,
      title,
      description,
      date,
      time: time || '00:00',
      location: location || 'Online',
      category: category || 'Other',
      eventLink: eventLink || null,
      maxAttendees: maxAttendees || null,
      tags: tags || [],
      createdBy: {
        userId: createdById,
        userName: user.fullName,
        userEmail: user.email
      },
      attendees: [],
      status: 'upcoming',
      createdAt: new Date().toISOString()
    };
    app.locals.events = app.locals.events || [];
    app.locals.events.push(fallbackEvent);
    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: fallbackEvent
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      const event = await Event.findById(id).lean();
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      return res.json({ success: true, data: event });
    }

    const events = app.locals.events || [];
    const event = events.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, data: event });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET events by category
app.get('/api/events/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      const events = await Event.find({ category })
        .sort({ date: -1 })
        .lean();
      return res.json({ success: true, data: events });
    }

    const allEvents = app.locals.events || [];
    const filtered = allEvents.filter(e => e.category === category);
    return res.json({ success: true, data: filtered });
  } catch (err) {
    console.error('Error fetching events by category:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/jobs - Create a new job (alumni only)
app.post('/api/jobs', verifyToken, async (req, res) => {
  try {
    const { title, company, description, location, jobType, requiredSkills, salary, applicationDeadline } = req.body;
    const alumniId = req.userId;

    const parseDeadlineAsIstEndOfDay = (deadlineInput) => {
      if (!deadlineInput || typeof deadlineInput !== 'string') return null;
      const value = deadlineInput.trim();
      const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]);
        const day = Number(dateOnlyMatch[3]);
        if (!year || !month || !day) return null;
        // 23:59:59.999 IST => 18:29:59.999 UTC
        return new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    };

    const normalizedDeadline = parseDeadlineAsIstEndOfDay(applicationDeadline);

    // Validation
    if (!title || !company || !description || !applicationDeadline) {
      return res.status(400).json({ success: false, message: 'Title, company, description, and application deadline are required' });
    }

    if (!normalizedDeadline) {
      return res.status(400).json({ success: false, message: 'Invalid application deadline' });
    }

    if (normalizedDeadline.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Application deadline must be in the future' });
    }

    // Get alumni user info
    let alumniUser = null;
    if (mongoose.connection.readyState === 1) {
      alumniUser = await User.findById(alumniId);
      if (!alumniUser || alumniUser.userType !== 'alumni') {
        return res.status(403).json({ success: false, message: 'Only alumni can post jobs' });
      }

      const newJob = new Job({
        title,
        company,
        description,
        location: location || 'Remote',
        jobType: jobType || 'Full-time',
        requiredSkills: requiredSkills || [],
        salary: salary || null,
        postedBy: alumniId,
        postedByName: alumniUser.fullName,
        postedByEmail: alumniUser.email || null,
        isActive: true,
        applicationCount: 0,
        applicationDeadline: normalizedDeadline
      });

      await newJob.save();

      return res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        data: newJob
      });
    }

    // Fallback for in-memory storage
    const newJob = {
      _id: new mongoose.Types.ObjectId(),
      title,
      company,
      description,
      location: location || 'Remote',
      jobType: jobType || 'Full-time',
      requiredSkills: requiredSkills || [],
      salary: salary || null,
      postedBy: alumniId,
      postedByName: 'Alumni',
      postedByEmail: alumniUser?.email || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      applicationCount: 0,
      applicationDeadline: normalizedDeadline
    };

    app.locals.jobs = app.locals.jobs || [];
    app.locals.jobs.push(newJob);

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: newJob
    });
  } catch (err) {
    console.error('Error posting job:', err);
    res.status(500).json({ success: false, message: 'Server error during job posting' });
  }
});

// GET all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    await ensureDefaultJobsSeeded();

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let requestingUser = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (mongoose.connection.readyState === 1) {
          requestingUser = await User.findById(decoded.id).select('_id email userType').lean();
        } else {
          requestingUser = users.find((u) => String(u?._id || u?.id) === String(decoded.id) || u.id === parseInt(decoded.id));
        }
      } catch (_err) {
        requestingUser = null;
      }
    }

    if (mongoose.connection.readyState === 1) {
      const jobs = await Job.find({ isActive: true })
        .populate('postedBy', 'userType fullName')
        .sort({ createdAt: -1 })
        .lean();

      let alumniJobs = (jobs || [])
        .filter(job => String(job?.postedBy?.userType || '').toLowerCase() === 'alumni')
        .map(job => ({
          ...job,
          postedBy: job?.postedBy?._id || job?.postedBy,
          postedByEmail: job?.postedByEmail || null
        }));

      // If a student is logged in and already has accepted mentors,
      // show mentor-related jobs first by restricting to those mentors.
      if (requestingUser && String(requestingUser.userType || '').toLowerCase() === 'student') {
        const studentId = String(requestingUser._id || requestingUser.id || '');
        const accepted = await MentorshipRequest.find({ studentId, status: 'accepted' }).select('mentorId').lean();
        const mentorIds = new Set((accepted || []).map((r) => String(r?.mentorId || '').trim()).filter(Boolean));

        if (mentorIds.size > 0) {
          alumniJobs = alumniJobs.filter((job) => mentorIds.has(String(job?.postedBy || '').trim()));
        }
      }

      return res.json({ success: true, data: alumniJobs });
    }

    // Fallback for in-memory storage
    let jobs = (app.locals.jobs || []).filter(j => {
      if (!j?.isActive) return false;

      const poster = users.find(u => String(u?._id || u?.id) === String(j?.postedBy));
      if (poster) {
        return String(poster.userType || '').toLowerCase() === 'alumni';
      }

      // If poster record is missing, keep explicit alumni-authored jobs only
      return Boolean(j?.postedByName) && String(j.postedByName).toLowerCase() !== 'alumniconnect team';
    });

    if (requestingUser && String(requestingUser.userType || '').toLowerCase() === 'student') {
      const studentId = String(requestingUser._id || requestingUser.id || '');
      const accepted = (app.locals.mentorshipRequests || []).filter((r) => String(r?.studentId) === studentId && String(r?.status) === 'accepted');
      const mentorIds = new Set(accepted.map((r) => String(r?.mentorId || '').trim()).filter(Boolean));
      if (mentorIds.size > 0) {
        jobs = jobs.filter((j) => mentorIds.has(String(j?.postedBy || '').trim()));
      }
    }

    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const isJobOwnedByAlumni = (job, alumniId, alumniEmail = '') => {
  const ownerId = String(job?.postedBy || '').trim();
  const ownerEmail = normalizeEmailValue(job?.postedByEmail);
  const meId = String(alumniId || '').trim();
  const meEmail = normalizeEmailValue(alumniEmail);

  if (ownerId && meId && ownerId === meId) return true;
  if (ownerEmail && meEmail && ownerEmail === meEmail) return true;
  return false;
};

// GET job by ID
app.get('/api/jobs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Let more specific routes handle reserved paths like /api/jobs/my-applications
    if (id === 'my-applications') {
      return next();
    }

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID' });
      }
      const job = await Job.findById(id).lean();
      if (!job || !job.isActive) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      return res.json({ success: true, data: job });
    }

    // Fallback for in-memory storage
    const job = (app.locals.jobs || []).find(j => j._id.toString() === id && j.isActive);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    return res.json({ success: true, data: job });
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET jobs by type
app.get('/api/jobs/type/:type', async (req, res) => {
  try {
    const { type } = req.params;

    if (mongoose.connection.readyState === 1) {
      const jobs = await Job.find({ isActive: true, jobType: type }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: jobs });
    }

    // Fallback for in-memory storage
    const jobs = (app.locals.jobs || []).filter(j => j.isActive && j.jobType === type);
    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Error fetching jobs by type:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET jobs by location
app.get('/api/jobs/location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const decodedLocation = decodeURIComponent(location);

    if (mongoose.connection.readyState === 1) {
      const jobs = await Job.find({
        isActive: true,
        location: { $regex: decodedLocation, $options: 'i' }
      }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: jobs });
    }

    // Fallback for in-memory storage
    const jobs = (app.locals.jobs || []).filter(j =>
      j.isActive && j.location.toLowerCase().includes(decodedLocation.toLowerCase())
    );
    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Error fetching jobs by location:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET jobs by skill
app.get('/api/jobs/skill/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    const decodedSkill = decodeURIComponent(skill);

    if (mongoose.connection.readyState === 1) {
      const jobs = await Job.find({
        isActive: true,
        requiredSkills: { $regex: decodedSkill, $options: 'i' }
      }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: jobs });
    }

    // Fallback for in-memory storage
    const jobs = (app.locals.jobs || []).filter(j =>
      j.isActive && j.requiredSkills.some(s => s.toLowerCase().includes(decodedSkill.toLowerCase()))
    );
    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Error fetching jobs by skill:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search jobs by keyword
app.get('/api/jobs/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const decodedKeyword = decodeURIComponent(keyword);

    if (mongoose.connection.readyState === 1) {
      const jobs = await Job.find({
        isActive: true,
        $or: [
          { title: { $regex: decodedKeyword, $options: 'i' } },
          { company: { $regex: decodedKeyword, $options: 'i' } },
          { description: { $regex: decodedKeyword, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: jobs });
    }

    // Fallback for in-memory storage
    const jobs = (app.locals.jobs || []).filter(j =>
      j.isActive && (
        j.title.toLowerCase().includes(decodedKeyword.toLowerCase()) ||
        j.company.toLowerCase().includes(decodedKeyword.toLowerCase()) ||
        j.description.toLowerCase().includes(decodedKeyword.toLowerCase())
      )
    );
    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Error searching jobs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/jobs/apply - Apply for a job
app.post('/api/jobs/apply', verifyToken, async (req, res) => {
  try {
    const { jobId, phoneNumber, resume, resumeFileName, statementOfPurpose } = req.body;
    const studentId = req.userId;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID required' });
    }

    // Validate required fields
    if (!phoneNumber || !resume || !statementOfPurpose) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number, resume, and statement of purpose are required' 
      });
    }

    if (mongoose.connection.readyState === 1) {
      // Check if job exists
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID' });
      }

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'Application deadline has passed for this job' });
      }

      // Get student info
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Check if already applied
      const existingApplication = await JobApplication.findOne({ jobId, studentId });
      if (existingApplication) {
        return res.status(400).json({ success: false, message: 'You have already applied for this job' });
      }

      // Create application with all details
      const application = new JobApplication({
        jobId,
        studentId,
        studentName: student.fullName,
        studentEmail: student.email,
        phoneNumber,
        resume,
        resumeFileName,
        statementOfPurpose,
        status: 'applied'
      });

      await application.save();

      console.log(`✅ Application created - Student: ${studentId}, Job: ${jobId}, Application: ${application._id}`);

      // Update job application count
      job.applicationCount = (job.applicationCount || 0) + 1;
      await job.save();

      // Notify job poster alumni about new application
      const poster = await User.findById(job.postedBy);
      if (poster && String(poster._id) !== String(studentId)) {
        poster.notifications = poster.notifications || [];
        poster.notifications.push({
          type: 'job_application',
          message: `${student.fullName} applied for your job "${job.title}"`,
          actorId: studentId,
          actorName: student.fullName,
          read: false,
          data: {
            jobId: String(job._id),
            jobTitle: job.title,
            applicationId: String(application._id),
            studentId: String(student._id),
            studentName: student.fullName,
            studentEmail: student.email
          }
        });
        await poster.save();
      }

      return res.json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    }

    // Fallback for in-memory storage
    const allJobs = app.locals.jobs || [];
    const targetJob = allJobs.find(j => String(j._id || j.id) === String(jobId) && j.isActive);
    if (!targetJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (targetJob.applicationDeadline && new Date(targetJob.applicationDeadline).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed for this job' });
    }

    app.locals.jobApplications = app.locals.jobApplications || [];
    const existingApplication = app.locals.jobApplications.find(a =>
      a.jobId === jobId && a.studentId === studentId
    );

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }

    const application = {
      _id: new mongoose.Types.ObjectId(),
      jobId,
      studentId,
      studentName: 'Student',
      studentEmail: 'student@email.com',
      phoneNumber,
      resume,
      resumeFileName,
      statementOfPurpose,
      status: 'applied',
      appliedAt: new Date(),
      updatedAt: new Date(),
      notes: null,
      alumniNotes: null
    };

    app.locals.jobApplications.push(application);

    targetJob.applicationCount = Number(targetJob.applicationCount || 0) + 1;
    targetJob.updatedAt = new Date();

    const poster = users.find((u) => String(u?._id || u?.id) === String(targetJob?.postedBy) || u.id === parseInt(targetJob?.postedBy));
    if (poster && String(poster?._id || poster?.id) !== String(studentId)) {
      poster.notifications = poster.notifications || [];
      poster.notifications.push({
        type: 'job_application',
        message: `${application.studentName} applied for your job "${targetJob.title}"`,
        actorId: studentId,
        actorName: application.studentName,
        read: false,
        createdAt: new Date(),
        data: {
          jobId: String(targetJob?._id || targetJob?.id || ''),
          jobTitle: targetJob.title,
          applicationId: String(application._id),
          studentId: String(studentId),
          studentName: application.studentName,
          studentEmail: application.studentEmail
        }
      });
    }

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ success: false, message: 'Server error during application' });
  }
});

// POST /api/jobs/applications/:applicationId/withdraw - Withdraw a job application
app.post('/api/jobs/applications/:applicationId/withdraw', verifyToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const studentId = req.userId;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'Application ID required' });
    }

    if (mongoose.connection.readyState === 1) {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return res.status(400).json({ success: false, message: 'Invalid application ID' });
      }

      // Find the application
      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      // Verify the application belongs to the current student
      if (String(application.studentId) !== String(studentId)) {
        return res.status(403).json({ success: false, message: 'You can only withdraw your own applications' });
      }

      // Cannot withdraw if already accepted or rejected
      if (application.status === 'accepted' || application.status === 'rejected') {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot withdraw an ${application.status} application` 
        });
      }

      // Delete the application
      await JobApplication.findByIdAndDelete(applicationId);

      // Update job application count
      const job = await Job.findById(application.jobId);
      if (job) {
        job.applicationCount = Math.max(0, (job.applicationCount || 1) - 1);
        await job.save();
      }

      return res.json({
        success: true,
        message: 'Application withdrawn successfully',
        data: { applicationId }
      });
    }

    // Fallback for in-memory storage
    app.locals.jobApplications = app.locals.jobApplications || [];
    const appIndex = app.locals.jobApplications.findIndex(a => a._id === applicationId);
    
    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = app.locals.jobApplications[appIndex];
    
    // Verify the application belongs to the current student
    if (application.studentId !== studentId) {
      return res.status(403).json({ success: false, message: 'You can only withdraw your own applications' });
    }

    // Cannot withdraw if already accepted or rejected
    if (application.status === 'accepted' || application.status === 'rejected') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot withdraw an ${application.status} application` 
      });
    }

    // Remove the application
    app.locals.jobApplications.splice(appIndex, 1);

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: { applicationId }
    });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ success: false, message: 'Server error during withdrawal' });
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
      const mongoReady = await waitForMongoReady();
      let user = null;
      if (mongoReady) {
        user = await User.findById(userId).select('email skills endorsements visitors messages notifications');
      } else {
        user = users.find(u => (u._id || u.id) === userId || u.id === parseInt(userId));
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const userSkills = user.skills || [];
      // mentorsMatched: fetch from database where userType='alumni' and skills match
      let matched = [];
      if (mongoReady) {
        const allMentors = await User.find({ userType: 'alumni' }).select('fullName skills role company');
        matched = allMentors.filter(m => (m.skills || []).some(s => userSkills.map(us => us.toLowerCase()).includes(s.toLowerCase())));
      }

      const normalizedEmail = normalizeEmailValue(user.email);
      const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      let applicationsCount = 0;
      let eventsAttendedCount = 0;

      if (mongoReady) {
        const appFilter = normalizedEmail
          ? {
              $or: [
                { studentId: userId },
                { studentEmail: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') }
              ]
            }
          : { studentId: userId };

        applicationsCount = await JobApplication.countDocuments(appFilter);
        eventsAttendedCount = await Event.countDocuments({ 'attendees.userId': userId });
      } else {
        const appList = app.locals.jobApplications || [];
        applicationsCount = appList.filter((a) => {
          const byId = String(a?.studentId || '') === String(userId);
          const byEmail = normalizedEmail && normalizeEmailValue(a?.studentEmail) === normalizedEmail;
          return byId || byEmail;
        }).length;

        const eventList = app.locals.events || [];
        eventsAttendedCount = eventList.filter((e) =>
          Array.isArray(e?.attendees) && e.attendees.some((a) => String(a?.userId || '') === String(userId))
        ).length;
      }

      const endorsementsCount = (user.endorsements || []).reduce((s, e) => s + (e.count || 0), 0);
      const visitorsCount = (user.visitors || []).length;
      const unreadMessages = (user.messages || []).filter(m => !m.read).length;
      const unreadNotifications = (user.notifications || []).filter(n => !n.read).length;

      const dashboardData = {
        mentorsMatched: matched.length,
        eventsAttended: eventsAttendedCount,
        skillsEndorsed: endorsementsCount,
        applications: applicationsCount,
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

const parseEventTimeTo24Hour = (timeValue) => {
  const fallback = { hours: 23, minutes: 59 };
  if (!timeValue || typeof timeValue !== 'string') return fallback;

  const raw = timeValue.trim().toUpperCase();
  if (!raw) return fallback;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return fallback;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3] || null;

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) return fallback;

  if (meridiem) {
    if (hours < 1 || hours > 12) return fallback;
    if (meridiem === 'AM') hours = hours % 12;
    if (meridiem === 'PM') hours = (hours % 12) + 12;
  } else if (hours < 0 || hours > 23) {
    return fallback;
  }

  return { hours, minutes };
};

const getIstDateParts = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);

  if (!year || !month || !day) return null;
  return { year, month, day };
};

const getEventTimestampInIST = (event) => {
  if (!event?.date) return null;

  const dateParts = getIstDateParts(event.date);
  if (!dateParts) return null;

  const { hours, minutes } = parseEventTimeTo24Hour(event.time);
  const utcMs = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    hours - 5,
    minutes - 30,
    0,
    0
  );

  return Number.isNaN(utcMs) ? null : utcMs;
};

const isEventCompletedByIST = (event, now = Date.now()) => {
  if (!event) return false;
  if (String(event.status || '').toLowerCase() === 'completed') return true;

  const eventTs = getEventTimestampInIST(event);
  if (!eventTs) return false;

  const nowTs = now instanceof Date ? now.getTime() : Number(now);
  if (Number.isNaN(nowTs)) return false;

  return nowTs >= eventTs;
};

// POST /api/events/:id/register - Register for an event (students)
app.post('/api/events/:id/register', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get user info
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(userId);
    } else {
      user = users.find(u => (u._id || u.id) === userId || u.id === parseInt(userId));
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (mongoose.connection.readyState === 1) {
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Check if event is completed by status or IST date/time
      if (isEventCompletedByIST(event)) {
        if (String(event.status || '').toLowerCase() !== 'completed') {
          event.status = 'completed';
          event.completedAt = event.completedAt || new Date();
          await event.save();
        }
        return res.status(400).json({ success: false, message: 'This event has already been completed and registrations are closed' });
      }

      // Check if already registered
      const alreadyRegistered = event.attendees.some(a => String(a.userId) === String(userId));
      if (alreadyRegistered) {
        return res.status(400).json({ success: false, message: 'Already registered for this event' });
      }

      // Add to attendees
      event.attendees.push({
        userId,
        userName: user.fullName
      });
      await event.save();

      // Notify related event alumni (owner) in-app so they can share meeting link directly
      const creatorUserId = String(event?.createdBy?.userId || '').trim();
      const creatorEmail = normalizeEmailValue(event?.createdBy?.userEmail);

      let eventOwner = null;
      if (creatorUserId) {
        eventOwner = await User.findById(creatorUserId);
      }
      if (!eventOwner && creatorEmail) {
        eventOwner = await User.findOne({ email: creatorEmail });
      }

      if (eventOwner && String(eventOwner._id) !== String(userId)) {
        eventOwner.notifications = eventOwner.notifications || [];
        eventOwner.notifications.push({
          type: 'event_registration',
          message: `${user.fullName} registered for your event "${event.title}". Share the meeting link with this student.`,
          actorId: userId,
          actorName: user.fullName,
          read: false,
          createdAt: new Date(),
          data: {
            eventId: event._id,
            eventTitle: event.title,
            studentId: user._id,
            studentName: user.fullName,
            studentEmail: user.email || null
          }
        });
        await eventOwner.save();
      }

      return res.json({
        success: true,
        message: 'Successfully registered for the event',
        data: event
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if event is completed by status or IST date/time
    if (isEventCompletedByIST(event)) {
      if (String(event.status || '').toLowerCase() !== 'completed') {
        event.status = 'completed';
        event.completedAt = event.completedAt || new Date().toISOString();
      }
      return res.status(400).json({ success: false, message: 'This event has already been completed and registrations are closed' });
    }

    const alreadyRegistered = event.attendees?.some(a => String(a.userId) === String(userId));
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    event.attendees = event.attendees || [];
    event.attendees.push({
      userId,
      userName: user.fullName
    });

    // Notify related event alumni (owner) in-app so they can share meeting link directly
    const creatorUserId = String(event?.createdBy?.userId || '').trim();
    const creatorEmail = normalizeEmailValue(event?.createdBy?.userEmail);
    const eventOwner = users.find((u) => {
      const uid = String(u?._id || u?.id || '').trim();
      const uemail = normalizeEmailValue(u?.email);
      if (creatorUserId && uid === creatorUserId) return true;
      if (creatorEmail && uemail === creatorEmail) return true;
      return false;
    });

    if (eventOwner && String(eventOwner._id || eventOwner.id) !== String(userId)) {
      eventOwner.notifications = eventOwner.notifications || [];
      eventOwner.notifications.push({
        type: 'event_registration',
        message: `${user.fullName} registered for your event "${event.title}". Share the meeting link with this student.`,
        actorId: userId,
        actorName: user.fullName,
        read: false,
        createdAt: new Date(),
        data: {
          eventId: event.id,
          eventTitle: event.title,
          studentId: user._id || user.id,
          studentName: user.fullName,
          studentEmail: user.email || null
        }
      });
    }

    return res.json({
      success: true,
      message: 'Successfully registered for the event',
      data: event
    });
  } catch (err) {
    console.error('Error registering for event:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/events/created/by-me - Get events created by the logged-in alumni
app.get('/api/events/created/by-me', verifyToken, async (req, res) => {
  try {
    await ensureDefaultEventsSeeded();

    const userId = req.userId;

    if (mongoose.connection.readyState === 1) {
      const me = await User.findById(userId).select('email userType').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (String(me.userType || '').toLowerCase() !== 'alumni') {
        return res.status(403).json({ success: false, message: 'Only alumni can manage events' });
      }

      const normalizedEmail = normalizeEmailValue(me.email);
      const ownerFilter = normalizedEmail
        ? { $or: [{ 'createdBy.userId': userId }, { 'createdBy.userEmail': normalizedEmail }] }
        : { 'createdBy.userId': userId };

      const events = await Event.find(ownerFilter).sort({ date: -1 });
      return res.json({
        success: true,
        data: events
      });
    }

    // In-memory fallback
    const me = users.find(u => String(u._id || u.id) === String(userId) || u.id === parseInt(userId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (String(me.userType || '').toLowerCase() !== 'alumni') {
      return res.status(403).json({ success: false, message: 'Only alumni can manage events' });
    }

    const allEvents = app.locals.events || [];
    const myEvents = allEvents.filter(e => isEventOwnedByUser(e, userId, me.email));
    res.json({
      success: true,
      data: myEvents.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (err) {
    console.error('Error fetching created events:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/events/:id/attendees - Get all attendees for an event (alumni only)
app.get('/api/events/:id/attendees', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (mongoose.connection.readyState === 1) {
      const me = await User.findById(userId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Verify the user created this event
      if (!isEventOwnedByUser(event, userId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only view attendees for events you created' });
      }

      return res.json({
        success: true,
        data: {
          eventId: event._id,
          eventTitle: event.title,
          totalAttendees: event.attendees?.length || 0,
          maxAttendees: event.maxAttendees || 'Unlimited',
          attendees: event.attendees || [],
          registrationDeadline: event.date
        }
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const me = users.find(u => String(u._id || u.id) === String(userId) || u.id === parseInt(userId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!isEventOwnedByUser(event, userId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only view attendees for events you created' });
    }

    res.json({
      success: true,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        totalAttendees: event.attendees?.length || 0,
        maxAttendees: event.maxAttendees || 'Unlimited',
        attendees: event.attendees || [],
        registrationDeadline: event.date
      }
    });
  } catch (err) {
    console.error('Error fetching attendees:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/events/registered/by-me - Get events the student registered for
app.get('/api/events/registered/by-me', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    if (mongoose.connection.readyState === 1) {
      const events = await Event.find({ 'attendees.userId': userId }).sort({ date: -1 });
      return res.json({
        success: true,
        data: events
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const registeredEvents = allEvents.filter(e =>
      e.attendees?.some(a => String(a.userId) === String(userId))
    );
    res.json({
      success: true,
      data: registeredEvents.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (err) {
    console.error('Error fetching registered events:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/events/:id/unregister - Unregister from an event
app.post('/api/events/:id/unregister', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (mongoose.connection.readyState === 1) {
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const attendeeIndex = event.attendees.findIndex(a => String(a.userId) === String(userId));
      if (attendeeIndex === -1) {
        return res.status(400).json({ success: false, message: 'You are not registered for this event' });
      }

      event.attendees.splice(attendeeIndex, 1);
      await event.save();

      return res.json({
        success: true,
        message: 'Successfully unregistered from the event',
        data: event
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const attendeeIndex = event.attendees?.findIndex(a => String(a.userId) === String(userId));
    if (attendeeIndex === -1 || attendeeIndex === undefined) {
      return res.status(400).json({ success: false, message: 'You are not registered for this event' });
    }

    event.attendees.splice(attendeeIndex, 1);

    res.json({
      success: true,
      message: 'Successfully unregistered from the event',
      data: event
    });
  } catch (err) {
    console.error('Error unregistering from event:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/events/:id/complete - Mark event as completed by alumni
app.post('/api/events/:id/complete', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('Complete event request:', { eventId: id, userId });

    if (mongoose.connection.readyState === 1) {
      const me = await User.findById(userId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ObjectId format:', id);
        return res.status(400).json({ success: false, message: 'Invalid event ID format' });
      }

      const event = await Event.findById(id);
      if (!event) {
        console.log('Event not found in MongoDB:', id);
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Verify the user created this event (handle ObjectId comparison)
      if (!isEventOwnedByUser(event, userId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only complete events you created' });
      }

      event.status = 'completed';
      event.completedAt = new Date();
      await event.save();

      console.log('Event completed successfully:', { eventId: event._id, status: event.status });

      return res.json({
        success: true,
        message: 'Event marked as completed',
        data: {
          eventId: event._id,
          eventTitle: event.title,
          status: event.status,
          completedAt: event.completedAt,
          totalAttendees: event.attendees?.length || 0,
          awardedBadges: event.awardedBadges || [],
          studentQueries: event.studentQueries || []
        }
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      console.log('Event not found in memory:', id);
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const me = users.find(u => String(u._id || u.id) === String(userId) || u.id === parseInt(userId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!isEventOwnedByUser(event, userId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only complete events you created' });
    }

    event.status = 'completed';
    event.completedAt = new Date();

    res.json({
      success: true,
      message: 'Event marked as completed',
      data: {
        eventId: event.id,
        eventTitle: event.title,
        status: event.status,
        completedAt: event.completedAt,
        totalAttendees: event.attendees?.length || 0,
        awardedBadges: event.awardedBadges || [],
        studentQueries: event.studentQueries || []
      }
    });
  } catch (err) {
    console.error('Error completing event:', err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
});

// POST /api/events/:id/award-badge - Award badge to event attendees
app.post('/api/events/:id/award-badge', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { attendeeId, badgeKey, message } = req.body;
    const userId = req.userId;

    if (!attendeeId || !badgeKey) {
      return res.status(400).json({ success: false, message: 'Missing attendeeId or badgeKey' });
    }

    // Verify badge exists
    const badgeDef = BADGE_DEFINITIONS.find(b => b.key === badgeKey);
    if (!badgeDef) {
      return res.status(400).json({ success: false, message: 'Unknown badge' });
    }

    if (mongoose.connection.readyState === 1) {
      const me = await User.findById(userId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Verify the user created this event
      if (!isEventOwnedByUser(event, userId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only award badges for events you created' });
      }

      // Verify attendee exists
      const attendee = event.attendees.find(a => String(a.userId) === String(attendeeId));
      if (!attendee) {
        return res.status(404).json({ success: false, message: 'Attendee not found' });
      }

      // Add to event awardedBadges
      event.awardedBadges = event.awardedBadges || [];
      event.awardedBadges.push({
        attendeeId,
        attendeeName: attendee.userName,
        badgeKey,
        badgeName: badgeDef.name,
        message: message || null,
        awardedAt: new Date()
      });

      // Also award badge to user in User model
      const user = await User.findById(attendeeId);
      if (user) {
        user.badges = user.badges || [];
        user.badges.push({
          key: badgeKey,
          name: badgeDef.name,
          description: badgeDef.description,
          source: `event: ${event.title}`,
          giverId: userId,
          giverName: event.createdBy.userName,
          message: message || null,
          awardedAt: new Date()
        });

        // Create notification
        user.notifications = user.notifications || [];
        user.notifications.push({
          type: 'badge',
          message: `You earned the "${badgeDef.name}" badge from the event "${event.title}"${message ? ': ' + message : ''}`,
          actorId: userId,
          actorName: event.createdBy.userName,
          read: false
        });

        await user.save();
      }

      await event.save();

      return res.json({
        success: true,
        message: 'Badge awarded successfully',
        data: {
          badge: event.awardedBadges[event.awardedBadges.length - 1],
          eventTitle: event.title
        }
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const me = users.find(u => String(u._id || u.id) === String(userId) || u.id === parseInt(userId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!isEventOwnedByUser(event, userId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only award badges for events you created' });
    }

    const attendee = event.attendees?.find(a => String(a.userId) === String(attendeeId));
    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }

    event.awardedBadges = event.awardedBadges || [];
    event.awardedBadges.push({
      attendeeId,
      attendeeName: attendee.userName,
      badgeKey,
      badgeName: badgeDef.name,
      message: message || null,
      awardedAt: new Date()
    });

    // Also update user badges in-memory
    const user = users.find(u => String(u._id || u.id) === String(attendeeId) || u.id === parseInt(attendeeId));
    if (user) {
      user.badges = user.badges || [];
      user.badges.push({
        key: badgeKey,
        name: badgeDef.name,
        description: badgeDef.description,
        source: `event: ${event.title}`,
        giverId: userId,
        giverName: event.createdBy.userName,
        message: message || null,
        awardedAt: new Date()
      });

      user.notifications = user.notifications || [];
      user.notifications.push({
        type: 'badge',
        message: `You earned the "${badgeDef.name}" badge from the event "${event.title}"${message ? ': ' + message : ''}`,
        actorId: userId,
        actorName: event.createdBy.userName,
        read: false
      });
    }

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      data: {
        badge: event.awardedBadges[event.awardedBadges.length - 1],
        eventTitle: event.title
      }
    });
  } catch (err) {
    console.error('Error awarding badge:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/events/:id/answer-query - Alumni answers student query
app.post('/api/events/:id/answer-query', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { queryIndex, answer } = req.body;
    const userId = req.userId;

    if (typeof queryIndex !== 'number' || !answer) {
      return res.status(400).json({ success: false, message: 'Missing queryIndex or answer' });
    }

    if (mongoose.connection.readyState === 1) {
      const me = await User.findById(userId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Verify the user created this event
      if (!isEventOwnedByUser(event, userId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only answer queries for events you created' });
      }

      if (!event.studentQueries || !event.studentQueries[queryIndex]) {
        return res.status(404).json({ success: false, message: 'Query not found' });
      }

      const query = event.studentQueries[queryIndex];
      query.answer = answer;
      query.answeredAt = new Date();
      query.answeredBy = event.createdBy.userName;

      // Notify student
      const student = await User.findById(query.studentId);
      if (student) {
        student.notifications = student.notifications || [];
        student.notifications.push({
          type: 'event_answer',
          message: `Your question in "${event.title}" was answered: ${answer.substring(0, 50)}...`,
          actorId: userId,
          actorName: event.createdBy.userName,
          read: false
        });
        await student.save();
      }

      await event.save();

      return res.json({
        success: true,
        message: 'Answer posted successfully',
        data: {
          query: event.studentQueries[queryIndex],
          eventTitle: event.title
        }
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const me = users.find(u => String(u._id || u.id) === String(userId) || u.id === parseInt(userId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!isEventOwnedByUser(event, userId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only answer queries for events you created' });
    }

    if (!event.studentQueries || !event.studentQueries[queryIndex]) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const query = event.studentQueries[queryIndex];
    query.answer = answer;
    query.answeredAt = new Date();
    query.answeredBy = event.createdBy.userName;

    const student = users.find(u => String(u._id || u.id) === String(query.studentId) || u.id === parseInt(query.studentId));
    if (student) {
      student.notifications = student.notifications || [];
      student.notifications.push({
        type: 'event_answer',
        message: `Your question in "${event.title}" was answered: ${answer.substring(0, 50)}...`,
        actorId: userId,
        actorName: event.createdBy.userName,
        read: false
      });
    }

    res.json({
      success: true,
      message: 'Answer posted successfully',
      data: {
        query: event.studentQueries[queryIndex],
        eventTitle: event.title
      }
    });
  } catch (err) {
    console.error('Error answering query:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/events/:id/ask-question - Student asks question during event
app.post('/api/events/:id/ask-question', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    const userId = req.userId;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Question cannot be empty' });
    }

    if (mongoose.connection.readyState === 1) {
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const user = await User.findById(userId).select('fullName');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      event.studentQueries = event.studentQueries || [];
      event.studentQueries.push({
        studentId: userId,
        studentName: user.fullName,
        question,
        askedAt: new Date(),
        answer: null,
        answeredAt: null,
        answeredBy: null
      });

      await event.save();

      return res.json({
        success: true,
        message: 'Question submitted',
        data: {
          query: event.studentQueries[event.studentQueries.length - 1]
        }
      });
    }

    // In-memory fallback
    const allEvents = app.locals.events || [];
    const event = allEvents.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const user = users.find(u => String(u._id || u.id) === String(userId) || u.id === parseInt(userId));
    const userName = user?.fullName || 'Anonymous';

    event.studentQueries = event.studentQueries || [];
    event.studentQueries.push({
      studentId: userId,
      studentName: userName,
      question,
      askedAt: new Date(),
      answer: null,
      answeredAt: null,
      answeredBy: null
    });

    res.json({
      success: true,
      message: 'Question submitted',
      data: {
        query: event.studentQueries[event.studentQueries.length - 1]
      }
    });
  } catch (err) {
    console.error('Error asking question:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/jobs/my-applications - Get student's job applications
app.get('/api/jobs/my-applications', verifyToken, async (req, res) => {
  try {
    const studentId = req.userId;
    console.log(`📋 Fetching applications for student: ${studentId}`);

    const mongoReady = await waitForMongoReady();
    if (mongoReady) {
      const student = await User.findById(studentId).select('email').lean();
      const normalizedEmail = normalizeEmailValue(student?.email);
      const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const query = normalizedEmail
        ? {
            $or: [
              { studentId },
              { studentEmail: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') }
            ]
          }
        : { studentId };

      const applications = await JobApplication.find(query)
        .populate('jobId', 'title company location jobType salary description requiredSkills')
        .sort({ appliedAt: -1 })
        .lean();
      
      console.log(`✅ Found ${applications.length} applications for student: ${studentId}`);
      // Filter out applications where job doesn't exist and include them anyway for display
      return res.json({ success: true, data: applications });
    }

    // Fallback for in-memory storage
    const me = users.find(u => String(u?._id || u?.id || '') === String(studentId) || u.id === parseInt(studentId));
    const myEmail = normalizeEmailValue(me?.email);
    const applications = (app.locals.jobApplications || [])
      .filter((a) => {
        const byId = String(a?.studentId || '') === String(studentId);
        const byEmail = myEmail && normalizeEmailValue(a?.studentEmail) === myEmail;
        return byId || byEmail;
      })
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    
    console.log(`✅ Found ${applications.length} applications (in-memory) for student: ${studentId}`);
    return res.json({ success: true, data: applications });
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/jobs/:jobId/applications - Get applications for a job (alumni only)
app.get('/api/jobs/:jobId/applications', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const alumniId = req.userId;

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID' });
      }

      // Verify the user posted this job
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const me = await User.findById(alumniId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!isJobOwnedByAlumni(job, alumniId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only view applications for jobs you posted' });
      }

      const applications = await JobApplication.find({ jobId })
        .sort({ appliedAt: -1 })
        .lean();
      return res.json({
        success: true,
        data: {
          jobId: job._id,
          jobTitle: job.title,
          jobCompany: job.company,
          totalApplications: applications.length,
          applications: applications
        }
      });
    }

    // Fallback for in-memory storage
    const me = users.find(u => String(u?._id || u?.id) === String(alumniId) || u.id === parseInt(alumniId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ownedJob = (app.locals.jobs || []).find(j => String(j?._id) === String(jobId) || String(j?.id) === String(jobId));
    if (!ownedJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (!isJobOwnedByAlumni(ownedJob, alumniId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only view applications for jobs you posted' });
    }

    const applications = (app.locals.jobApplications || [])
      .filter(a => a.jobId === jobId)
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.json({
      success: true,
      data: {
        jobId: jobId,
        totalApplications: applications.length,
        applications: applications
      }
    });
  } catch (err) {
    console.error('Error fetching job applications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/jobs/:jobId/applications/:applicationId/status - Update application status (alumni only)
app.put('/api/jobs/:jobId/applications/:applicationId/status', verifyToken, async (req, res) => {
  try {
    const { jobId, applicationId } = req.params;
    const { status, notes } = req.body;
    const alumniId = req.userId;

    const validStatuses = ['applied', 'shortlisted', 'rejected', 'accepted', 'interview'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
        return res.status(400).json({ success: false, message: 'Invalid IDs' });
      }

      // Verify the user posted this job
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const me = await User.findById(alumniId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!isJobOwnedByAlumni(job, alumniId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only update applications for jobs you posted' });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      application.status = status;
      if (notes) application.alumniNotes = notes;
      application.updatedAt = new Date();
      await application.save();

      return res.json({
        success: true,
        message: 'Application status updated successfully',
        data: application
      });
    }

    // Fallback for in-memory storage
    app.locals.jobApplications = app.locals.jobApplications || [];
    const appIndex = app.locals.jobApplications.findIndex(a => a._id.toString() === applicationId);

    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    app.locals.jobApplications[appIndex].status = status;
    if (notes) app.locals.jobApplications[appIndex].alumniNotes = notes;
    app.locals.jobApplications[appIndex].updatedAt = new Date();

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: app.locals.jobApplications[appIndex]
    });
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/jobs/posted/by-me - Get jobs posted by alumni
app.get('/api/jobs/posted/by-me', verifyToken, async (req, res) => {
  try {
    const alumniId = req.userId;

    if (mongoose.connection.readyState === 1) {
      const me = await User.findById(alumniId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const normalizedEmail = normalizeEmailValue(me.email);
      const query = normalizedEmail
        ? { isActive: true, $or: [{ postedBy: alumniId }, { postedByEmail: normalizedEmail }] }
        : { isActive: true, postedBy: alumniId };

      const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: jobs });
    }

    // Fallback for in-memory storage
    const me = users.find(u => String(u?._id || u?.id) === String(alumniId) || u.id === parseInt(alumniId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const jobs = (app.locals.jobs || [])
      .filter(j => j.isActive && isJobOwnedByAlumni(j, alumniId, me.email))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Error fetching posted jobs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/jobs/:jobId - Delete a job (alumni only)
app.delete('/api/jobs/:jobId', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const alumniId = req.userId;

    console.log(`🔍 Delete request for job ${jobId} by alumni ${alumniId}`);

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID' });
      }

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const me = await User.findById(alumniId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!isJobOwnedByAlumni(job, alumniId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only delete jobs you posted' });
      }

      // Soft delete - mark as inactive
      const deletedJob = await Job.findByIdAndUpdate(jobId, { isActive: false }, { new: true });
      console.log(`✅ Job marked as inactive in MongoDB: ${deletedJob._id}`);
      
      // Also delete all applications for this job
      const result = await JobApplication.deleteMany({ jobId: jobId });
      console.log(`✅ ${result.deletedCount} applications deleted for job ${jobId}`);

      return res.json({
        success: true,
        message: 'Job and all its applications deleted successfully'
      });
    }

    // Fallback for in-memory storage
    console.log(`📝 Using in-memory storage for job deletion`);
    const jobIndex = (app.locals.jobs || []).findIndex(j => j._id.toString() === jobId);
    if (jobIndex === -1) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const me = users.find(u => String(u?._id || u?.id) === String(alumniId) || u.id === parseInt(alumniId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ownedJob = (app.locals.jobs || [])[jobIndex];
    if (!isJobOwnedByAlumni(ownedJob, alumniId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only delete jobs you posted' });
    }

    const removedJob = app.locals.jobs[jobIndex];
    // Remove job from in-memory storage
    app.locals.jobs.splice(jobIndex, 1);
    console.log(`✅ Job removed from memory: ${removedJob._id}`);
    
    // Also remove related applications
    const appsBefore = (app.locals.jobApplications || []).length;
    app.locals.jobApplications = (app.locals.jobApplications || []).filter(app => String(app.jobId) !== jobId);
    const appsRemoved = appsBefore - (app.locals.jobApplications || []).length;
    console.log(`✅ ${appsRemoved} applications removed from memory for job ${jobId}`);

    res.json({
      success: true,
      message: 'Job and all its applications deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting job:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/jobs/:jobId/applications - Delete all applications for a job (alumni only)
app.delete('/api/jobs/:jobId/applications', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const alumniId = req.userId;

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID' });
      }

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const me = await User.findById(alumniId).select('email').lean();
      if (!me) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!isJobOwnedByAlumni(job, alumniId, me.email)) {
        return res.status(403).json({ success: false, message: 'You can only delete applications for jobs you posted' });
      }

      const deletedCount = await JobApplication.deleteMany({ jobId: new mongoose.Types.ObjectId(jobId) });

      return res.json({
        success: true,
        message: `Deleted ${deletedCount.deletedCount} applications successfully`,
        data: { deletedCount: deletedCount.deletedCount }
      });
    }

    // Fallback for in-memory storage
    if (!app.locals.jobApplications) {
      return res.json({
        success: true,
        message: 'No applications to delete',
        data: { deletedCount: 0 }
      });
    }

    const me = users.find(u => String(u?._id || u?.id) === String(alumniId) || u.id === parseInt(alumniId));
    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ownedJob = (app.locals.jobs || []).find(j => String(j?._id) === String(jobId) || String(j?.id) === String(jobId));
    if (!ownedJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (!isJobOwnedByAlumni(ownedJob, alumniId, me.email)) {
      return res.status(403).json({ success: false, message: 'You can only delete applications for jobs you posted' });
    }

    const beforeCount = (app.locals.jobApplications || []).length;
    app.locals.jobApplications = (app.locals.jobApplications || []).filter(app => app.jobId.toString() !== jobId);
    const deletedCount = beforeCount - app.locals.jobApplications.length;

    res.json({
      success: true,
      message: `Deleted ${deletedCount} applications successfully`,
      data: { deletedCount }
    });
  } catch (err) {
    console.error('Error deleting applications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============= OFFICE HOURS API =============

// Get office hours created by current alumni
app.get('/api/office-hours/me', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    if (mongoose.connection.readyState === 1) {
      const officeHours = await OfficeHour.find({ mentorId: userId, isActive: true })
        .sort({ dayOfWeek: 1, startTime: 1, createdAt: -1 })
        .lean();

      return res.json({ success: true, data: officeHours });
    }

    const officeHours = (app.locals.officeHours || [])
      .filter(slot => String(slot.mentorId) === String(userId) && slot.isActive !== false)
      .sort((a, b) => {
        if (a.dayOfWeek === b.dayOfWeek) return String(a.startTime).localeCompare(String(b.startTime));
        return String(a.dayOfWeek).localeCompare(String(b.dayOfWeek));
      });

    return res.json({ success: true, data: officeHours });
  } catch (err) {
    console.error('Error fetching my office hours:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create office hours (alumni only)
app.post('/api/office-hours', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      dayOfWeek,
      startTime,
      endTime,
      timezone,
      meetingMode,
      meetingLink,
      location,
      notes,
      maxBookingsPerSlot
    } = req.body || {};

    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Day, start time, and end time are required' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.userType !== 'alumni') {
        return res.status(403).json({ success: false, message: 'Only alumni can schedule office hours' });
      }

      const slot = new OfficeHour({
        mentorId: userId,
        mentorName: user.fullName,
        dayOfWeek,
        startTime,
        endTime,
        timezone: timezone || 'Asia/Kolkata',
        meetingMode: meetingMode || 'online',
        meetingLink: meetingLink || '',
        location: location || '',
        notes: notes || '',
        maxBookingsPerSlot: Number(maxBookingsPerSlot) || 1,
        isActive: true
      });

      await slot.save();
      return res.status(201).json({ success: true, message: 'Office hour scheduled successfully', data: slot });
    }

    const users = app.locals.users || [];
    const user = users.find(u => String(u.id || u._id) === String(userId));
    if (!user || user.userType !== 'alumni') {
      return res.status(403).json({ success: false, message: 'Only alumni can schedule office hours' });
    }

    app.locals.officeHours = app.locals.officeHours || [];
    const slot = {
      id: Date.now().toString(),
      mentorId: userId,
      mentorName: user.fullName || 'Alumni Mentor',
      dayOfWeek,
      startTime,
      endTime,
      timezone: timezone || 'Asia/Kolkata',
      meetingMode: meetingMode || 'online',
      meetingLink: meetingLink || '',
      location: location || '',
      notes: notes || '',
      maxBookingsPerSlot: Number(maxBookingsPerSlot) || 1,
      bookings: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    app.locals.officeHours.push(slot);
    return res.status(201).json({ success: true, message: 'Office hour scheduled successfully', data: slot });
  } catch (err) {
    console.error('Error creating office hour:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete office hour slot (owner only)
app.delete('/api/office-hours/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const slot = await OfficeHour.findById(id);
      if (!slot) {
        return res.status(404).json({ success: false, message: 'Office hour not found' });
      }

      if (String(slot.mentorId) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You can only delete your own office hours' });
      }

      await OfficeHour.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Office hour removed successfully' });
    }

    app.locals.officeHours = app.locals.officeHours || [];
    const idx = app.locals.officeHours.findIndex(slot => (String(slot.id) === String(id) || String(slot._id) === String(id)) && String(slot.mentorId) === String(userId));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Office hour not found' });
    }

    app.locals.officeHours.splice(idx, 1);
    return res.json({ success: true, message: 'Office hour removed successfully' });
  } catch (err) {
    console.error('Error deleting office hour:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get office hours for a mentor (students can book)
app.get('/api/office-hours/mentor/:mentorId', verifyToken, async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const slots = await OfficeHour.find({ mentorId, isActive: true })
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();
      return res.json({ success: true, data: slots });
    }

    const slots = (app.locals.officeHours || [])
      .filter(slot => String(slot.mentorId) === String(mentorId) && slot.isActive !== false);
    return res.json({ success: true, data: slots });
  } catch (err) {
    console.error('Error fetching mentor office hours:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Book an office hour slot (student)
app.post('/api/office-hours/:id/book', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { note } = req.body || {};

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      if (user.userType !== 'student') {
        return res.status(403).json({ success: false, message: 'Only students can book office hours' });
      }

      const slot = await OfficeHour.findById(id);
      if (!slot || !slot.isActive) {
        return res.status(404).json({ success: false, message: 'Office hour slot not found' });
      }

      if ((slot.bookings || []).some(b => String(b.studentId) === String(userId))) {
        return res.status(409).json({ success: false, message: 'You already booked this slot' });
      }

      if ((slot.bookings || []).length >= slot.maxBookingsPerSlot) {
        return res.status(409).json({ success: false, message: 'This slot is already full' });
      }

      slot.bookings.push({
        studentId: userId,
        studentName: user.fullName,
        studentEmail: user.email,
        note: note || ''
      });
      await slot.save();

      return res.status(201).json({ success: true, message: 'Office hour booked successfully', data: slot });
    }

    const users = app.locals.users || [];
    const user = users.find(u => String(u.id || u._id) === String(userId));
    if (!user || user.userType !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can book office hours' });
    }

    app.locals.officeHours = app.locals.officeHours || [];
    const slot = app.locals.officeHours.find(s => String(s.id || s._id) === String(id) && s.isActive !== false);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Office hour slot not found' });
    }

    slot.bookings = slot.bookings || [];
    if (slot.bookings.some(b => String(b.studentId) === String(userId))) {
      return res.status(409).json({ success: false, message: 'You already booked this slot' });
    }

    if (slot.bookings.length >= (slot.maxBookingsPerSlot || 1)) {
      return res.status(409).json({ success: false, message: 'This slot is already full' });
    }

    slot.bookings.push({
      studentId: userId,
      studentName: user.fullName,
      studentEmail: user.email,
      note: note || '',
      bookedAt: new Date()
    });

    return res.status(201).json({ success: true, message: 'Office hour booked successfully', data: slot });
  } catch (err) {
    console.error('Error booking office hour:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============= ANNOUNCEMENTS API =============

// Get all active announcements (for students)
app.get('/api/announcements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const query = {
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      };

      // If user is a student, show announcements for all or students
      if (user.userType === 'student') {
        query.targetAudience = { $in: ['all', 'students'] };
      }

      const announcements = await Announcement.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(50)
        .lean();

      return res.json({
        success: true,
        data: announcements
      });
    }

    // Fallback for in-memory storage
    const announcements = (app.locals.announcements || [])
      .filter(a => a.isActive && (!a.expiresAt || new Date(a.expiresAt) > new Date()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: announcements });
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new announcement (alumni only)
app.post('/api/announcements', authenticateToken, async (req, res) => {
  try {
    const { title, body, targetAudience, priority, expiresAt } = req.body;
    const userId = req.user.userId;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.userType !== 'alumni') {
        return res.status(403).json({ success: false, message: 'Only alumni can post announcements' });
      }

      const announcement = new Announcement({
        title,
        body,
        createdBy: userId,
        createdByName: user.fullName,
        targetAudience: targetAudience || 'all',
        priority: priority || 'normal',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      });

      await announcement.save();

      return res.status(201).json({
        success: true,
        message: 'Announcement posted successfully',
        data: announcement
      });
    }

    // Fallback for in-memory storage
    if (!app.locals.announcements) {
      app.locals.announcements = [];
    }

    const announcement = {
      id: Date.now().toString(),
      title,
      body,
      createdBy: userId,
      createdByName: 'Alumni',
      targetAudience: targetAudience || 'all',
      priority: priority || 'normal',
      expiresAt: expiresAt || null,
      isActive: true,
      readBy: [],
      createdAt: new Date()
    };

    app.locals.announcements.push(announcement);

    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      data: announcement
    });
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark announcement as read
app.post('/api/announcements/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Announcement not found' });
      }

      if (!announcement.readBy.includes(userId)) {
        announcement.readBy.push(userId);
        await announcement.save();
      }

      return res.json({
        success: true,
        message: 'Announcement marked as read'
      });
    }

    // Fallback for in-memory storage
    const announcement = (app.locals.announcements || []).find(a => a.id === id);
    if (announcement && !announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId);
    }

    res.json({ success: true, message: 'Announcement marked as read' });
  } catch (err) {
    console.error('Error marking announcement as read:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete announcement (alumni only)
app.delete('/api/announcements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (mongoose.connection.readyState === 1) {
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ success: false, message: 'Announcement not found' });
      }

      if (String(announcement.createdBy) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You can only delete your own announcements' });
      }

      await Announcement.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: 'Announcement deleted successfully'
      });
    }

    // Fallback for in-memory storage
    if (!app.locals.announcements) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const index = app.locals.announcements.findIndex(a => a.id === id && a.createdBy === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    app.locals.announcements.splice(index, 1);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
});

export default app;
