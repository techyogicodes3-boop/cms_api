const isProduction = process.env.NODE_ENV === "production";
const developmentSecret = "dev-only-change-me";
const secret = process.env.JWT_SECRET || (!isProduction ? developmentSecret : "");

if (!secret) {
  throw new Error("JWT_SECRET is required in production.");
}

if (!process.env.JWT_SECRET && !isProduction) {
  console.warn("JWT_SECRET is missing. Using a development-only JWT secret.");
}

const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

function toSeconds(value) {
  if (typeof value === "number") return value;
  const match = String(value).trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return 24 * 60 * 60;

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 };
  return amount * multipliers[unit];
}

module.exports = {
  secret,
  expiresIn,
  cookieMaxAgeSeconds: toSeconds(expiresIn),
};
