const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.DOATDASH_MONGODB_URI;

    if (!mongoUri) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("DOATDASH_MONGODB_URI is required in production.");
      }

      console.warn("MongoDB skipped: DOATDASH_MONGODB_URI is missing. Running with mock data.");
      return;
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    console.warn("Continuing with mock data.");
  }
};

module.exports = connectDB;
