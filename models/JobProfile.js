const mongoose = require('mongoose');

const jobProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  jobId: { type: String, required: true },
  jobName: { type: String, required: true },
  level: { type: Number, default: 1 },
  earnings: { type: Number, default: 0 }, // Total all-time earnings
  clockedIn: { type: Boolean, default: false },
  cooldownUntil: { type: Date, default: null },
  lastWorkedAt: { type: Date, default: null }
});

jobProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('JobProfile', jobProfileSchema);
