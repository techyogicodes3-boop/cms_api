const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = async function ensureBootstrapAdmin() {
  const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
  const name = String(process.env.ADMIN_BOOTSTRAP_NAME || "Chocotraill Admin").trim();
  const resetPassword = process.env.ADMIN_BOOTSTRAP_RESET_PASSWORD === "true";

  if (!email && !password) return;
  if (!email || password.length < 8) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL and an ADMIN_BOOTSTRAP_PASSWORD of at least 8 characters are required together.");
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB must be connected before provisioning the bootstrap admin.");
  }

  const existing = await User.findOne({ email });
  if (existing?.role === "admin" && existing.status === "active" && !resetPassword) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate(
    { email },
    {
      $set: { name: name || "Chocotraill Admin", password: passwordHash, role: "admin", status: "active" },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, runValidators: true }
  );
  console.log("Bootstrap admin account is ready.");
};
