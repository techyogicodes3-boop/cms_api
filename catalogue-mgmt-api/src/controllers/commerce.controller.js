const CatalogueItem = require("../models/CatalogueItem");
const Inquiry = require("../models/Inquiry");
const Order = require("../models/Order");
const { createExcelWorkbook } = require("../utils/excel.helper");
const { isMockMode } = require("../utils/mockMode");

const mockInquiries = [];
const mockOrders = [];

function excelDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date;
}

function excelNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function publicOrder(order) {
  return {
    id: order.uuid,
    uuid: order.uuid,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
    shippingMethod: order.shippingMethod,
    specialInstruction: order.specialInstruction,
    status: order.status,
    createdAt: order.createdAt,
  };
}

exports.createInquiry = async (req, h) => {
  const payload = {
    ...req.payload,
    userId: req.authUser?.role === "user" ? req.authUser.id : null,
    subject: req.payload.subject || "Chocotraill inquiry",
  };

  if (isMockMode()) {
    const inquiry = { ...payload, uuid: `inquiry-${Date.now()}`, status: "new", createdAt: new Date() };
    mockInquiries.unshift(inquiry);
    return h.response({ success: true, data: inquiry }).code(201);
  }

  const inquiry = await Inquiry.create(payload);
  return h.response({ success: true, data: inquiry }).code(201);
};

exports.createOrder = async (req, h) => {
  const requestedItems = req.payload.items;
  let items;

  if (isMockMode()) {
    items = requestedItems.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.unitPrice) * item.quantity,
    }));
  } else {
    const ids = [...new Set(requestedItems.map((item) => item.catalogueItemId))];
    const products = await CatalogueItem.find({ uuid: { $in: ids }, isActive: true })
      .select("uuid name price imageUrls stock")
      .lean();
    const productMap = new Map(products.map((product) => [product.uuid, product]));

    const missing = ids.filter((id) => !productMap.has(id));
    if (missing.length) {
      return h.response({ success: false, message: "One or more products are no longer available." }).code(409);
    }

    items = requestedItems.map((requested) => {
      const product = productMap.get(requested.catalogueItemId);
      const quantity = Number(requested.quantity);
      if (Number.isFinite(product.stock) && product.stock < quantity) {
        return null;
      }
      return {
        catalogueItemId: product.uuid,
        name: product.name,
        quantity,
        unitPrice: Number(product.price),
        lineTotal: Number(product.price) * quantity,
        imageUrl: product.imageUrls?.[0] || "",
      };
    });

    if (items.some((item) => item === null)) {
      return h.response({ success: false, message: "The requested quantity is not available for one or more products." }).code(409);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const payload = {
    userId: req.authUser?.role === "user" ? req.authUser.id : null,
    customer: req.payload.customer,
    items,
    subtotal,
    total: subtotal,
    shippingMethod: req.payload.shippingMethod,
    specialInstruction: req.payload.specialInstruction || "",
  };

  if (isMockMode()) {
    const order = { ...payload, uuid: `order-${Date.now()}`, status: "inquiry_submitted", createdAt: new Date() };
    mockOrders.unshift(order);
    return h.response({ success: true, data: publicOrder(order) }).code(201);
  }

  const order = await Order.create(payload);
  return h.response({ success: true, data: publicOrder(order) }).code(201);
};

exports.getAdminActivity = async () => {
  const [orders, inquiries] = isMockMode()
    ? [mockOrders.slice(0, 20), mockInquiries.slice(0, 20)]
    : await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(20).lean(),
      Inquiry.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

  return {
    success: true,
    data: {
      orders: orders.map(publicOrder),
      inquiries,
    },
  };
};

function excelResponse(h, workbook, filename) {
  return h.response(workbook)
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .header("X-Content-Type-Options", "nosniff")
    .header("Cache-Control", "no-store");
}

exports.exportInquiries = async (req, h) => {
  const inquiries = isMockMode()
    ? mockInquiries
    : await Inquiry.find().sort({ createdAt: -1 }).lean();
  const columns = [
    { label: "Submitted At", value: (row) => excelDate(row.createdAt), width: 21, numFmt: "dd-mmm-yyyy hh:mm" },
    { label: "Customer Name", value: (row) => row.name || "", width: 24 },
    { label: "Company", value: (row) => row.company || "", width: 24 },
    { label: "Mobile Number", value: (row) => String(row.mobile || ""), width: 16 },
    { label: "Email Address", value: (row) => row.email || "", width: 30 },
    { label: "Subject", value: (row) => row.subject || "", width: 30 },
    { label: "Message", value: (row) => row.message || "", width: 45 },
    { label: "Status", value: (row) => row.status || "", width: 15 },
  ];
  const workbook = await createExcelWorkbook("Inquiries", columns, inquiries);
  return excelResponse(h, workbook, "chocotraill-inquiries.xlsx");
};

exports.exportOrders = async (req, h) => {
  const orders = isMockMode()
    ? mockOrders
    : await Order.find().sort({ createdAt: -1 }).lean();
  const rows = orders.flatMap((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    return items.length ? items.map((item) => ({ order, item })) : [{ order, item: {} }];
  });
  const columns = [
    { label: "Submitted At", value: ({ order }) => excelDate(order.createdAt), width: 21, numFmt: "dd-mmm-yyyy hh:mm" },
    { label: "Customer Name", value: ({ order }) => order.customer?.name || "", width: 24 },
    { label: "Email Address", value: ({ order }) => order.customer?.email || "", width: 30 },
    { label: "Phone Number", value: ({ order }) => String(order.customer?.phone || ""), width: 16 },
    { label: "Street Address", value: ({ order }) => order.customer?.streetAddress || "", width: 35 },
    { label: "City", value: ({ order }) => order.customer?.city || "", width: 18 },
    { label: "State", value: ({ order }) => order.customer?.state || "", width: 20 },
    { label: "PIN Code", value: ({ order }) => String(order.customer?.zipcode || ""), width: 12 },
    { label: "Product Name", value: ({ item }) => item.name || "", width: 30 },
    { label: "Quantity", value: ({ item }) => excelNumber(item.quantity), width: 12, numFmt: "0" },
    { label: "Unit Price (INR)", value: ({ item }) => excelNumber(item.unitPrice), width: 18, numFmt: "₹#,##0.00" },
    { label: "Line Total (INR)", value: ({ item }) => excelNumber(item.lineTotal, excelNumber(item.unitPrice) * excelNumber(item.quantity)), width: 18, numFmt: "₹#,##0.00" },
    { label: "Order Subtotal (INR)", value: ({ order }) => excelNumber(order.subtotal, excelNumber(order.total)), width: 21, numFmt: "₹#,##0.00" },
    { label: "Order Total (INR)", value: ({ order }) => excelNumber(order.total, excelNumber(order.subtotal)), width: 18, numFmt: "₹#,##0.00" },
    { label: "Shipping Method", value: ({ order }) => order.shippingMethod || "standard", width: 18 },
    { label: "Order Status", value: ({ order }) => order.status || "", width: 18 },
    { label: "Special Instructions", value: ({ order }) => order.specialInstruction || "", width: 40 },
  ];
  const workbook = await createExcelWorkbook("Orders", columns, rows);
  return excelResponse(h, workbook, "chocotraill-orders.xlsx");
};
