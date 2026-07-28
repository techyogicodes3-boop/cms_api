const AuthController = require("../controllers/auth.controller");
const { registerSchema, loginSchema } = require("../validators/auth.validator");
const { verifyToken } = require("../middlewares/auth.middleware");
const { authRateLimit } = require("../middlewares/rateLimit.middleware");

module.exports = [
  {
    method: "POST",
    path: "/api/v1/auth/register",
    options: {
      tags: ["api"],
      description: "Register a new user",
      validate: { payload: registerSchema },
      pre: [authRateLimit({ limit: 8 })],
      auth: false // Public endpoint - no JWT required
    },
    handler: AuthController.register
  },
  {
    method: "POST",
    path: "/api/v1/auth/login",
    options: {
      tags: ["api"],
      description: "Login with email and password",
      validate: { payload: loginSchema },
      pre: [authRateLimit({ limit: 10 })],
      auth: false // Public endpoint - no JWT required
    },
    handler: AuthController.login
  },
  {
    method: "GET",
    path: "/api/v1/auth/me",
    options: {
      tags: ["api"],
      pre: [verifyToken]
    },
    handler: AuthController.me
  },
  {
    method: "POST",
    path: "/api/v1/auth/logout",
    options: {
      tags: ["api"],
      auth: false
    },
    handler: AuthController.logout
  }
];
