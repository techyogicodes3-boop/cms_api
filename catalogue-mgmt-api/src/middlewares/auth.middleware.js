const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const User = require("../models/User");
const { shouldUseMockData } = require("../utils/mockMode");

const AUTH_BYPASS_ENABLED = false;
const DEV_ADMIN_USER = {
  id: "dev-admin",
  email: "admin@example.com",
  role: "admin",
};

function applyAuthBypass(request) {
  if (!AUTH_BYPASS_ENABLED) return false;
  request.authUser = DEV_ADMIN_USER;
  return true;
}

function getRequestToken(request) {
  const [scheme, bearerToken] = request.headers.authorization?.split(" ") || [];
  if (scheme === "Bearer" && bearerToken) return bearerToken;
  return request.state?.auth_token || null;
}

async function getCurrentAuthUser(decoded) {
  if (shouldUseMockData()) {
    return {
      id: decoded.id,
      uuid: decoded.id,
      email: decoded.email || "mock@example.com",
      role: decoded.role,
      status: "active",
    };
  }

  const user = await User.findOne({ uuid: decoded.id })
    .select("uuid name email role status")
    .lean();

  if (!user) return null;
  if (user.status === "disabled") {
    return { ...user, disabled: true };
  }

  return {
    id: user.uuid,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "active",
  };
}

exports.verifyToken = async (request, h) => {
  try {
    if (applyAuthBypass(request)) return h.continue;

    const token = getRequestToken(request);
    if (!token) throw new Error("No token");

    const decoded = jwt.verify(token, jwtConfig.secret);
    const currentUser = await getCurrentAuthUser(decoded);

    if (!currentUser) {
      return h.response({ success:false, message:"Unauthorized" }).code(401).unstate("auth_token", { path: "/" }).unstate("auth_role", { path: "/" }).takeover();
    }

    if (currentUser.disabled) {
      return h.response({ success:false, message:"Account disabled" }).code(403).unstate("auth_token", { path: "/" }).unstate("auth_role", { path: "/" }).takeover();
    }

    request.authUser = currentUser;
    return h.continue;
  } catch {
    return h.response({ success:false, message:"Unauthorized" }).code(401).unstate("auth_token", { path: "/" }).unstate("auth_role", { path: "/" }).takeover();
  }
};

exports.requireRole = (...roles) => {
  const allowedRoles = new Set(roles);

  return (request, h) => {
    if (applyAuthBypass(request)) return h.continue;

    if (!request.authUser || !allowedRoles.has(request.authUser.role)) {
      return h.response({ success:false, message:"Forbidden" }).code(403).takeover();
    }

    return h.continue;
  };
};

exports.isAdmin = exports.requireRole("admin");

exports.verifyTokenOptional = async (request, h) => {
  try {
    if (applyAuthBypass(request)) return h.continue;

    const token = getRequestToken(request);
    if (!token) return h.continue;

    const decoded = jwt.verify(token, jwtConfig.secret);
    const currentUser = await getCurrentAuthUser(decoded);
    if (!currentUser || currentUser.disabled) return h.continue;

    request.authUser = currentUser;
    return h.continue;
  } catch {
    return h.continue; // invalid token → treat as public
  }
};
