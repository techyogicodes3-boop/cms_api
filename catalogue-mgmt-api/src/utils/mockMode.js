const mongoose = require("mongoose");

const isProduction = () => process.env.NODE_ENV === "production";
const isMockMode = () => mongoose.connection.readyState !== 1;
const shouldUseMockData = () => isMockMode() && !isProduction();

module.exports = { isMockMode, isProduction, shouldUseMockData };
