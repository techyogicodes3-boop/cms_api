const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema({
  uuid: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  status: { type: String, enum: ["active", "disabled"], default: "active", index: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
