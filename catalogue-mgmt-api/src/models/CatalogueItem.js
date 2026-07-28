const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const catalogueItemSchema = new mongoose.Schema({
  uuid: { type: String, default: uuidv4, unique: true },
  catalogueId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  validatedDescription: { type: String },
  price: { type: Number, required: true },
  specifications: { type: Object },
  stock: { type: Number },
  imageUrls: [{ type: String }],
  imagePublicIds: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("CatalogueItem", catalogueItemSchema);
