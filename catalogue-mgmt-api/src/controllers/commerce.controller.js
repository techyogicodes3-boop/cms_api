const CatalogueItem = require("../models/CatalogueItem");
const Inquiry = require("../models/Inquiry");
const Order = require("../models/Order");
const { createExcelWorkbook } = require("../utils/excel.helper");
const { isMockMode } = require("../utils/mockMode");

const mockInquiries = [];
const mockOrders = [];

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
    .type("application/vnd.ms-excel; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .header("Cache-Control", "no-store");
}

exports.exportInquiries = async (req, h) => {
  const inquiries = isMockMode()
    ? mockInquiries
    : await Inquiry.find().sort({ createdAt: -1 }).lean();
  const columns = [
    { label: "Inquiry ID", value: (row) => row.uuid },
    { label: "Submitted At", value: (row) => new Date(row.createdAt).toISOString() },
    { label: "Name", value: (row) => row.name },
    { label: "Company", value: (row) => row.company },
    { label: "Mobile", value: (row) => row.mobile },
    { label: "Email", value: (row) => row.email },
    { label: "Subject", value: (row) => row.subject },
    { label: "Message", value: (row) => row.message },
    { label: "Status", value: (row) => row.status },
  ];
  return excelResponse(h, createExcelWorkbook("Inquiries", columns, inquiries), "chocotraill-inquiries.xls");
};

exports.exportOrders = async (req, h) => {
  const orders = isMockMode()
    ? mockOrders
    : await Order.find().sort({ createdAt: -1 }).lean();
  const rows = orders.flatMap((order) => order.items.map((item) => ({ order, item })));
  const columns = [
    { label: "Order ID", value: ({ order }) => order.uuid },
    { label: "Submitted At", value: ({ order }) => new Date(order.createdAt).toISOString() },
    { label: "Customer", value: ({ order }) => order.customer.name },
    { label: "Email", value: ({ order }) => order.customer.email },
    { label: "Phone", value: ({ order }) => order.customer.phone },
    { label: "Address", value: ({ order }) => [order.customer.streetAddress, order.customer.city, order.customer.state, order.customer.zipcode].filter(Boolean).join(", ") },
    { label: "Product ID", value: ({ item }) => item.catalogueItemId },
    { label: "Product", value: ({ item }) => item.name },
    { label: "Quantity", value: ({ item }) => item.quantity },
    { label: "Unit Price", value: ({ item }) => item.unitPrice },
    { label: "Line Total", value: ({ item }) => item.lineTotal },
    { label: "Order Total", value: ({ order }) => order.total },
    { label: "Status", value: ({ order }) => order.status },
    { label: "Instructions", value: ({ order }) => order.specialInstruction },
  ];
  return excelResponse(h, createExcelWorkbook("Orders", columns, rows), "chocotraill-orders.xls");
};
