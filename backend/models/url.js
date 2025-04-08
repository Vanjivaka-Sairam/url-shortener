import mongoose from "mongoose";

const urlSchema = new mongoose.Schema({
  shortID: { type: String, required: true, unique: true },
  redirectURL: { type: String, required: true},
  visithistory: [{ timestamp: Number }],
}, { timestamps: true });

const URL = mongoose.model("url", urlSchema);

export default URL;
