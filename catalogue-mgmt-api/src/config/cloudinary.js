require("dotenv").config();

const { v2: cloudinary } = require("cloudinary");

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim().toLowerCase();
const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

module.exports = cloudinary;
