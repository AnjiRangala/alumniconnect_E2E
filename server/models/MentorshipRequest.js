import mongoose from 'mongoose';

const mentorshipRequestSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  mentorId: { type: String, default: null },
  mentorName: { type: String, default: '' },
  topic: { type: String, default: '' },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending','accepted','declined'], default: 'pending' },
  mentorResponse: { type: String, default: '' }
});

export const MentorshipRequest = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
