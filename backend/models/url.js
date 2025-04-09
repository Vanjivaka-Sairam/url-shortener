import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  deviceType: { type: String },
  browser: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  country: { type: String },
  city: { type: String }
});

const urlSchema = new mongoose.Schema({
  shortID: { type: String, required: true, unique: true },
  redirectURL: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  visithistory: [visitSchema],
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  totalClicks: { type: Number, default: 0 }
}, { timestamps: true });

// Add indexes for faster queries
urlSchema.index({ expiresAt: 1 });
urlSchema.index({ userId: 1 });

const URL = mongoose.model("url", urlSchema);

export default URL;
