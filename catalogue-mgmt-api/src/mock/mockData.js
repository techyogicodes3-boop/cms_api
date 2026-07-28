const catalogues = [];
const catalogueTypes = [];
const items = [];

const users = [
  { id: "dev-admin", uuid: "dev-admin", name: "Dev Admin", email: "admin@example.com", role: "admin", status: "Active" },
  { id: "user-1", uuid: "user-1", name: "Aarav Shah", email: "aarav@example.com", role: "user", status: "Active" },
  { id: "user-2", uuid: "user-2", name: "Mira Patel", email: "mira@example.com", role: "user", status: "Active" }
];

const dashboardStats = {
  activeCatalogues: 0,
  totalItems: 0,
  totalUsers: users.length,
  topSellingItems: []
};

const cataloguePerformance = [];
const weeklyPurchases = [];
const recentActivity = [];

module.exports = {
  catalogues,
  catalogueTypes,
  items,
  dashboardStats,
  cataloguePerformance,
  weeklyPurchases,
  recentActivity,
  users
};
