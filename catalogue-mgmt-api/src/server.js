const Hapi = require("@hapi/hapi");
const HapiRateLimit = require("hapi-rate-limit");
const Inert = require("@hapi/inert");
const Vision = require("@hapi/vision");
const HapiSwagger = require("hapi-swagger");
const Pack = require("../package.json");
require("dotenv").config();
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const catalogueRoutes = require("./routes/catalogue.routes");
const itemRoutes = require("./routes/item.routes");
const uploadRoutes = require("./routes/upload.routes");
const searchRoutes = require("./routes/search.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

function getAllowedOrigins() {
  const configured = (process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGINS is required in production.");
  }

  return ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];
}

const start = async () => {
  await connectDB();

  const server = Hapi.server({
    port: process.env.PORT || 9000,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: getAllowedOrigins(),
        credentials: true
      }
    }
  });

  await server.register({
    plugin: HapiRateLimit,
    options: { userLimit: 100, userCache: { expiresIn: 60000 } }
  });

  const swaggerOptions = {
    info: {
      title: "Catalogue Management API Documentation",
      version: Pack.version,
      description: "API documentation for the Catalogue Management System."
    },
    grouping: "tags",
    // JWT Bearer token auth in Swagger
    securityDefinitions: {
      jwt: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        description: "Enter your JWT token in the format: Bearer {token}"
      }
    },
    // Apply JWT auth globally (routes can override if needed)
    security: [{ jwt: [] }]
  };

  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    }
  ]);

  server.route(authRoutes);
  server.route(catalogueRoutes);
  server.route(itemRoutes);
  server.route(uploadRoutes);
  server.route(searchRoutes);
  server.route(dashboardRoutes);

  await server.start();
  console.log("Server running at", server.info.uri);
};

start();
