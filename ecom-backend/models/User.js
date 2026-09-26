const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String },
  dateOfBirth: { type: Date },
  mobile: { type: String, required: true },
  active: { type: Boolean, default: true },
  // SHA-256 of the emailed reset token, never the token itself
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  // Tokens issued before this are rejected (set when the password changes)
  passwordChangedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
