const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderItemSchema = new mongoose.Schema({
  catalogueItemId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: "" },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  uuid: { type: String, default: uuidv4, unique: true, index: true },
  userId: { type: String, default: null, index: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
  },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  shippingMethod: { type: String, default: "standard" },
  specialInstruction: { type: String, default: "" },
  status: {
    type: String,
    enum: ["inquiry_submitted", "confirmed", "completed", "cancelled"],
    default: "inquiry_submitted",
    index: true,
  },
  source: { type: String, default: "whatsapp_checkout" },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
