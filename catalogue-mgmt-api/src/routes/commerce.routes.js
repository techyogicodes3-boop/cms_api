const CommerceController = require("../controllers/commerce.controller");
const { createInquirySchema, createOrderSchema } = require("../validators/commerce.validator");
const { verifyToken, verifyTokenOptional, isAdmin } = require("../middlewares/auth.middleware");
const { validationFailAction } = require("../utils/validation");

module.exports = [
  {
    method: "POST",
    path: "/api/v1/inquiries",
    options: { pre: [verifyTokenOptional], validate: { payload: createInquirySchema, failAction: validationFailAction } },
    handler: CommerceController.createInquiry,
  },
  {
    method: "POST",
    path: "/api/v1/orders",
    options: { pre: [verifyTokenOptional], validate: { payload: createOrderSchema, failAction: validationFailAction } },
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
    path: "/api/v1/admin/reports/inquiries.xlsx",
    options: { pre: [verifyToken, isAdmin] },
    handler: CommerceController.exportInquiries,
  },
  {
    method: "GET",
    path: "/api/v1/admin/reports/orders.xlsx",
    options: { pre: [verifyToken, isAdmin] },
    handler: CommerceController.exportOrders,
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
