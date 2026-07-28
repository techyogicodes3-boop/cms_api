const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const CatalogueTypeScheme = new mongoose.Schema({
    uuid: { type: String, default: uuidv4 },
    name: { type: String, required: true },

}, { timestamps: true });

module.exports = mongoose.model("CatalogueType", CatalogueTypeScheme);
