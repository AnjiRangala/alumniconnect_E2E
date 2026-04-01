import mongoose from 'mongoose';

const recentLoginSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'alumni'],
    required: true
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  }
});

recentLoginSchema.index({ email: 1, role: 1 }, { unique: true });

export const RecentLogin = mongoose.model('RecentLogin', recentLoginSchema);
