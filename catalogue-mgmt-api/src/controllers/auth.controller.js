const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const { isMockMode, shouldUseMockData } = require("../utils/mockMode");

const TOKEN_COOKIE = "auth_token";
const ROLE_COOKIE = "auth_role";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getCookieOptions({ httpOnly = true } = {}) {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE || "Lax";
  const secure = process.env.AUTH_COOKIE_SECURE
    ? process.env.AUTH_COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

  return {
    ttl: jwtConfig.cookieMaxAgeSeconds * 1000,
    isHttpOnly: httpOnly,
    isSecure: secure,
    isSameSite: sameSite,
    path: "/",
  };
}

function attachAuthCookies(response, token, role) {
  return response
    .state(TOKEN_COOKIE, token, getCookieOptions({ httpOnly: true }))
    .state(ROLE_COOKIE, role, getCookieOptions({ httpOnly: false }));
}

function clearAuthCookies(response) {
  return response
    .unstate(TOKEN_COOKIE, { path: "/" })
    .unstate(ROLE_COOKIE, { path: "/" });
}

const getMockAuth = (email = "admin@example.com", role = "admin") => ({
  success: true,
  data: {
    user: {
      id: "dev-admin",
      name: "Dev Admin",
      email,
      role
    },
    token: jwt.sign({ id: "dev-admin", role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
  }
});

const toClientAuthPayload = (auth) => ({
  success: true,
  data: {
    user: auth.data.user
  }
});

exports.register = async (req, h) => {
  const { name, password } = req.payload;
  const email = normalizeEmail(req.payload.email);
  const requestedRole = req.payload.role === "admin" ? "admin" : "user";

  if (isMockMode()) {
    if (!shouldUseMockData()) {
      return h.response({ success: false, message: "Authentication service unavailable" }).code(503);
    }

    const mockAuth = getMockAuth(email, requestedRole);
    return attachAuthCookies(h.response(toClientAuthPayload(mockAuth)).code(201), mockAuth.data.token, mockAuth.data.user.role);
  }

  const exists = await User.findOne({ email });
  if (exists) return h.response({ success:false, message:"Email exists" }).code(400);

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: requestedRole
  });

  const token = jwt.sign(
    { id: user.uuid, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  return attachAuthCookies(h.response({
    success: true,
    data: {
      user: { id: user.uuid, name, email, role: user.role }
    }
  }).code(201), token, user.role);
};

exports.login = async (req, h) => {
  const { password } = req.payload;
  const email = normalizeEmail(req.payload.email);

  if (isMockMode()) {
    if (!shouldUseMockData()) {
      return h.response({ success: false, message: "Authentication service unavailable" }).code(503);
    }

    const mockAuth = getMockAuth(email, "user");
    return attachAuthCookies(h.response(toClientAuthPayload(mockAuth)), mockAuth.data.token, mockAuth.data.user.role);
  }

  const user = await User.findOne({ email });
  if (!user) return h.response({ success:false, message:"Invalid credentials" }).code(401);

  if (user.status === "disabled") {
    return h.response({ success:false, message:"Account disabled" }).code(403);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return h.response({ success:false, message:"Invalid credentials" }).code(401);

  const token = jwt.sign(
    { id: user.uuid, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  return attachAuthCookies(h.response({
    success: true,
    data: {
      user: { id: user.uuid, name: user.name, email, role: user.role }
    }
  }), token, user.role);
};

exports.me = async (req) => ({
  success: true,
  data: {
    user: {
      id: req.authUser.id,
      name: req.authUser.name,
      email: req.authUser.email,
      role: req.authUser.role,
      status: req.authUser.status || "active",
    },
  },
});

exports.logout = async (req, h) => clearAuthCookies(
  h.response({ success: true, message: "Logged out successfully" })
);
