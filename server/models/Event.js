import mongoose from 'mongoose';

// Event Schema for Alumni Connect
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    default: '00:00'
  },
  location: {
    type: String,
    default: 'Online'
  },
  category: {
    type: String,
    enum: ['Webinar', 'Networking', 'Workshop', 'Conference', 'Mentoring Session', 'Other'],
    default: 'Other'
  },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userEmail: { type: String }
  },
  attendees: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    registeredAt: { type: Date, default: Date.now }
  }],
  maxAttendees: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  eventLink: {
    type: String,
    default: null
  },
  tags: [{
    type: String
  }],
  completedAt: {
    type: Date,
    default: null
  },
  awardedBadges: [{
    attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendeeName: { type: String },
    badgeKey: { type: String },
    badgeName: { type: String },
    message: { type: String, default: null },
    awardedAt: { type: Date, default: Date.now }
  }],
  studentQueries: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String },
    question: { type: String },
    askedAt: { type: Date, default: Date.now },
    answer: { type: String, default: null },
    answeredAt: { type: Date, default: null },
    answeredBy: { type: String, default: null }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const Event = mongoose.model('Event', eventSchema);
