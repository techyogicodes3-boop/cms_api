const connectDB = require("../config/db");

exports.plugin = {
  name: "mongoPlugin",
  version: "1.0.0",
  register: async function (server, options) {
    await connectDB();
  }
};
