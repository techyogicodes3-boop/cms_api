const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const imageAssetSchema = new mongoose.Schema({
  uuid: { type: String, default: uuidv4, unique: true },
  imageUrl: { type: String, required: true },
  mediaType: { type: String, enum: ["image", "video"], default: "image" },
  resourceType: { type: String, enum: ["image", "video"], default: "image" },
  publicId: { type: String, required: true, unique: true, index: true },
  folder: { type: String, default: "chocotraill/products" },
  originalName: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number },
  uploadedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("ImageAsset", imageAssetSchema);
