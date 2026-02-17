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
  skills: [{
    type: String
  }],
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
    source: { type: String, default: null }
  }],
  sessions: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  lastActive: { type: Date, default: null },
  notes: [{ fromId: { type: String }, fromName: { type: String }, body: { type: String }, createdAt: { type: Date, default: Date.now } }],
  tasks: [{ title: { type: String }, due: { type: Date }, completed: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }],
  messages: [{
    fromId: { type: String },
    fromName: { type: String },
    subject: { type: String },
    body: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  settings: {
    emailNotifications: { type: Boolean, default: true },
    profileVisibility: { type: String, enum: ['public','connections','private'], default: 'public' }
  },
  registrationDate: {
    type: Date,
    default: Date.now
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
