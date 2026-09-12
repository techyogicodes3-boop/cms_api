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

exports.getDashboard = async (req) => {
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
  const itemsOrdered = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
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
  if (req.payload.phone !== undefined) update.phone = req.payload.phone;
  if (req.payload.address !== undefined) {
    Object.entries(req.payload.address).forEach(([key, value]) => {
      update[`address.${key}`] = value;
    });
  }
  const user = await User.findOneAndUpdate({ uuid: req.authUser.id }, { $set: update }, { new: true })
    .select("uuid name email role phone address")
    .lean();
  if (!user) return h.response({ success: false, message: "User not found" }).code(404);
  return { success: true, data: { profile: toProfile(user) } };
};
