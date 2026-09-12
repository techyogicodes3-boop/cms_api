const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const inquirySchema = new mongoose.Schema({
  uuid: { type: String, default: uuidv4, unique: true, index: true },
  userId: { type: String, default: null, index: true },
  company: { type: String, default: "" },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, default: "Chocotraill inquiry" },
  message: { type: String, default: "" },
  status: { type: String, enum: ["new", "contacted", "closed"], default: "new", index: true },
}, { timestamps: true });

module.exports = mongoose.model("Inquiry", inquirySchema);
