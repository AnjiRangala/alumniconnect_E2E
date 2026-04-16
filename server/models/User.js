import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Alumni Connect User Schema
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  securityQuestion: {
    type: String,
    default: null,
    trim: true
  },
  securityAnswerHash: {
    type: String,
    default: null
  },
  userType: {
    type: String,
    enum: ['student', 'alumni'],
    required: true
  },
  company: {
    type: String,
    default: null
  },
  role: {
    type: String,
    default: null
  },
  experience: {
    type: String,
    default: null
  },
  industry: {
    type: String,
    default: null
  },
  availability: {
    type: String,
    default: null
  },
  photo: {
    type: String,
    default: null
  },
  linkedinUrl: {
    type: String,
    default: null
  },
  githubUrl: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: null
  },
  institution: {
    type: String,
    default: null,
    trim: true
  },
  skills: [{
    type: String
  }],
  projects: [{
    title: { type: String },
    description: { type: String },
    technologies: [{ type: String }],
    link: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  resume: {
    fileName: { type: String, default: null },
    filePath: { type: String, default: null },
    uploadedAt: { type: Date, default: null }
  },
  visitors: [{
    viewerId: { type: String },
    viewerName: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
  notifications: [{
    type: { type: String },
    message: { type: String },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    actorId: { type: String, default: null },
    actorName: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  endorsements: [{
    skill: { type: String },
    count: { type: Number, default: 0 }
  }],
  badges: [{
    key: { type: String },
    name: { type: String },
    description: { type: String },
    awardedAt: { type: Date, default: Date.now },
    source: { type: String, default: null },
    giverId: { type: String, default: null },
    giverName: { type: String, default: null },
    message: { type: String, default: null }
  }],
  sessions: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  mentorRatings: [{
    studentId: { type: String, required: true },
    studentName: { type: String, default: null },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  }],
  lastActive: { type: Date, default: null },
  notes: [{ fromId: { type: String }, fromName: { type: String }, body: { type: String }, createdAt: { type: Date, default: Date.now } }],
  tasks: [{ title: { type: String }, due: { type: Date }, completed: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }],
  messages: [{
    fromId: { type: String },
    fromName: { type: String },
    subject: { type: String },
    body: { type: String },
    messageId: { type: String, default: null },
    read: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  settings: {
    emailNotifications: { type: Boolean, default: true },
    jobAlerts: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    mentorMatchAlerts: { type: Boolean, default: true },
    profileTips: { type: Boolean, default: true },
    profileVisibility: { type: String, enum: ['public','connections','private'], default: 'public' }
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
