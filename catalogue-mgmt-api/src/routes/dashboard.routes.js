const DashboardController = require("../controllers/dashboard.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth.middleware");

module.exports = [
  {
    method: "GET",
    path: "/api/v1/admin/dashboard/summary",
    options: {
      pre: [verifyToken, isAdmin]
    },
    handler: DashboardController.getSummary
  },
  {
    method: "GET",
    path: "/api/v1/admin/dashboard/weekly-purchases",
    options: {
      pre: [verifyToken, isAdmin]
    },
    handler: DashboardController.getWeeklyPurchases
  }
];
