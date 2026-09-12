const Order = require("../models/Order");
const User = require("../models/User");
const { isMockMode } = require("../utils/mockMode");

function toProfile(user) {
  return {
    id: user.uuid || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    address: user.address || { streetAddress: "", city: "", state: "", zipcode: "" },
  };
}

exports.getDashboard = async (req, h) => {
  if (isMockMode()) {
    return {
      success: true,
      data: { profile: toProfile(req.authUser), orders: [], stats: { orders: 0, itemsOrdered: 0, totalSpent: 0 } },
    };
  }

  const [user, orders] = await Promise.all([
    User.findOne({ uuid: req.authUser.id }).select("uuid name email role phone address").lean(),
    Order.find({
      $or: [
        { userId: req.authUser.id },
        { userId: null, "customer.email": req.authUser.email },
      ],
    }).sort({ createdAt: -1 }).lean(),
  ]);
  if (!user) return h.response({ success: false, message: "User not found" }).code(404);

  const itemsOrdered = orders.reduce(
    (sum, order) => sum + (Array.isArray(order.items) ? order.items : [])
      .reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0
  );
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    success: true,
    data: { profile: toProfile(user), orders, stats: { orders: orders.length, itemsOrdered, totalSpent } },
  };
};

exports.updateProfile = async (req, h) => {
  if (isMockMode()) {
    return { success: true, data: { profile: toProfile({ ...req.authUser, ...req.payload }) } };
  }

  const update = {};
  if (req.payload.name !== undefined) update.name = req.payload.name;
  if (req.payload.email !== undefined) {
    const email = req.payload.email.toLowerCase();
    const emailOwner = await User.findOne({ email, uuid: { $ne: req.authUser.id } }).select("uuid").lean();
    if (emailOwner) return h.response({ success: false, message: "This email address is already in use." }).code(409);
    update.email = email;
  }
  if (req.payload.phone !== undefined) update.phone = req.payload.phone;
  if (req.payload.address !== undefined) {
    const addressFields = ["streetAddress", "city", "state", "zipcode"];
    const addressValues = addressFields.map((key) => String(req.payload.address[key] || "").trim());
    if (addressValues.some(Boolean) && addressValues.some((value) => !value)) {
      return h.response({ success: false, message: "Complete every address field or leave the entire address blank." }).code(400);
    }
    Object.entries(req.payload.address).forEach(([key, value]) => {
      update[`address.${key}`] = value;
    });
  }

  if (update.email && update.email !== req.authUser.email) {
    await Order.updateMany(
      { userId: null, "customer.email": req.authUser.email },
      { $set: { userId: req.authUser.id } }
    );
  }
  let user;
  try {
    user = await User.findOneAndUpdate({ uuid: req.authUser.id }, { $set: update }, { new: true, runValidators: true })
      .select("uuid name email role phone address")
      .lean();
  } catch (error) {
    if (error?.code === 11000) {
      return h.response({ success: false, message: "This email address is already in use." }).code(409);
    }
    throw error;
  }
  if (!user) return h.response({ success: false, message: "User not found" }).code(404);
  return { success: true, data: { profile: toProfile(user) } };
};
