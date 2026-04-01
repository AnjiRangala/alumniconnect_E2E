import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: false,
    default: null
  },
  resume: {
    type: String,
    required: false,
    default: null
  },
  resumeFileName: {
    type: String,
    required: false,
    default: null
  },
  statementOfPurpose: {
    type: String,
    required: false,
    default: null
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'rejected', 'accepted', 'interview'],
    default: 'applied'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: null
  },
  alumniNotes: {
    type: String,
    default: null
  }
});

export const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);
