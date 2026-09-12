const CommerceController = require("../controllers/commerce.controller");
const { createInquirySchema, createOrderSchema } = require("../validators/commerce.validator");
const { verifyToken, verifyTokenOptional, isAdmin } = require("../middlewares/auth.middleware");

module.exports = [
  {
    method: "POST",
    path: "/api/v1/inquiries",
    options: { pre: [verifyTokenOptional], validate: { payload: createInquirySchema } },
    handler: CommerceController.createInquiry,
  },
  {
    method: "POST",
    path: "/api/v1/orders",
    options: { pre: [verifyTokenOptional], validate: { payload: createOrderSchema } },
    handler: CommerceController.createOrder,
  },
  {
    method: "GET",
    path: "/api/v1/admin/commerce/activity",
    options: { pre: [verifyToken, isAdmin] },
    handler: CommerceController.getAdminActivity,
  },
  {
    method: "GET",
    path: "/api/v1/admin/reports/inquiries.xls",
    options: { pre: [verifyToken, isAdmin] },
    handler: CommerceController.exportInquiries,
  },
  {
    method: "GET",
    path: "/api/v1/admin/reports/orders.xls",
    options: { pre: [verifyToken, isAdmin] },
    handler: CommerceController.exportOrders,
  },
];
