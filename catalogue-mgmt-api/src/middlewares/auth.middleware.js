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
  const authorization = String(request.headers.authorization || "").trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  return request.state?.auth_token || null;
}

function clearAuthState(response) {
  const options = { path: "/" };
  if (process.env.AUTH_COOKIE_DOMAIN) options.domain = process.env.AUTH_COOKIE_DOMAIN;
  return response
    .unstate("auth_token", options)
    .unstate("auth_role", options);
}

async function getCurrentAuthUser(decoded) {
  if (shouldUseMockData()) {
    return {
      id: decoded.id,
      uuid: decoded.id,
      name: decoded.name || (decoded.role === "admin" ? "Dev Admin" : "Dev Customer"),
      email: decoded.email || "mock@example.com",
      role: decoded.role,
      status: "active",
    };
  }

  const user = await User.findOne({ uuid: decoded.id })
    .select("uuid name email role status phone address")
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
    phone: user.phone || "",
    address: user.address || { streetAddress: "", city: "", state: "", zipcode: "" },
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
      return clearAuthState(h.response({ success:false, message:"Unauthorized" }).code(401)).takeover();
    }

    if (currentUser.disabled) {
      return clearAuthState(h.response({ success:false, message:"Account disabled" }).code(403)).takeover();
    }

    request.authUser = currentUser;
    return h.continue;
  } catch {
    return clearAuthState(h.response({ success:false, message:"Unauthorized" }).code(401)).takeover();
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
