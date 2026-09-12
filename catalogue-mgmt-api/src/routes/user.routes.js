const UserController = require("../controllers/user.controller");
const { updateProfileSchema } = require("../validators/commerce.validator");
const { verifyToken, requireRole } = require("../middlewares/auth.middleware");

const isUser = requireRole("user");

module.exports = [
  {
    method: "GET",
    path: "/api/v1/user/dashboard",
    options: { pre: [verifyToken, isUser] },
    handler: UserController.getDashboard,
  },
  {
    method: "PUT",
    path: "/api/v1/user/profile",
    options: { pre: [verifyToken, isUser], validate: { payload: updateProfileSchema } },
    handler: UserController.updateProfile,
  },
];
