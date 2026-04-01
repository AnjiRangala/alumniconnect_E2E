import mongoose from 'mongoose';

const officeHourSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  mentorName: {
    type: String,
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  meetingMode: {
    type: String,
    enum: ['online', 'in-person'],
    default: 'online'
  },
  meetingLink: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  maxBookingsPerSlot: {
    type: Number,
    default: 1,
    min: 1,
    max: 20
  },
  bookings: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String },
    studentEmail: { type: String },
    note: { type: String, default: '' },
    bookedAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const OfficeHour = mongoose.model('OfficeHour', officeHourSchema);
