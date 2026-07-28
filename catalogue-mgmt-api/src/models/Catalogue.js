const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const catalogueSchema = new mongoose.Schema({
  uuid: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  // type: { type: String, required: true },
  catalogueTypeId: { type: String },
  description: { type: String },
  imageUrl: { type: String },
  imagePublicId: { type: String },
  isPublished: { type: Boolean, default: false },
  createdBy: { type: String },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Catalogue", catalogueSchema);
