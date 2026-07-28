const CatalogueItem = require("../models/CatalogueItem");
const Catalogue = require("../models/Catalogue");
const { isMockMode } = require("../utils/mockMode");
const mock = require("../mock/mockData");

const {
  deleteImages,
  deleteRemovedImages
} = require("../services/image.service");

const normalizePayloadImageUrls = (payload = {}) => {
  if (Array.isArray(payload.imageUrls)) {
    return payload.imageUrls.filter(Boolean);
  }

  if (payload.imageUrl !== undefined) {
    return payload.imageUrl ? [payload.imageUrl] : [];
  }

  return undefined;
};

const normalizePayloadImagePublicIds = (payload = {}) => {
  if (Array.isArray(payload.imagePublicIds)) {
    return payload.imagePublicIds.filter(Boolean);
  }

  if (payload.imagePublicId !== undefined) {
    return payload.imagePublicId ? [payload.imagePublicId] : [];
  }

  return undefined;
};

/* PUBLIC */
// filters - price range, search, sort, pagination
exports.getItemsByCatalogue = async (req) => {
  const { catalogueId } = req.params;
  if (isMockMode()) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const maxPrice = req.query.maxPrice || null;
    const sortBy = req.query.sortBy || "newest";
    let filtered = mock.items.filter((item) => item.catalogueId === catalogueId);

    if (!req.authUser || req.authUser.role !== "admin") {
      filtered = filtered.filter((item) => item.isActive);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter((item) => item.price <= Number(maxPrice));
    }
    if (sortBy === "price_asc") filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_des") filtered.sort((a, b) => b.price - a.price);
    else filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const prices = filtered.map((item) => item.price);
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      success: true,
      page,
      limit,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
      priceRange: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0
      },
      data
    };
  }

  console.log("\n [getItemsByCatalogue] Request received");

  // sorting params
  const sortBy = req.query.sortBy || "newest";

  // sorting Map
  const sortMap = {
    'newest': { createdAt: -1 },
    'price_asc': { price: 1 },
    'price_des': { price: -1 }
  }

  // max price for price slider filter
  const maxPrice = req.query.maxPrice || null;

  console.log("⏳ Query params:", { sortBy, maxPrice, page: req.query.page, limit: req.query.limit });


  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const isAdmin = req.authUser && req.authUser.role === "admin";

  const catalogueFilter = isAdmin ? { uuid: catalogueId } : { uuid: catalogueId, isPublished: true };
  const catalogue = await Catalogue.findOne(catalogueFilter).select("uuid").lean();
  if (!catalogue) {
    return { success: true, page: 1, limit: 10, totalItems: 0, totalPages: 0, priceRange: { min: 0, max: 0 }, data: [] };
  }

  const filter = {
    catalogueId
  };

  // 👤 USER → only active items
  if (!isAdmin) {
    filter.isActive = true;
  }

  // Apply maxPrice filter if provided
  if (maxPrice !== null) {
    filter.price = { $lte: maxPrice };
    console.log("Applied maxPrice filter:", maxPrice);
  }

  const [totalItems, priceStats] = await Promise.all([
    CatalogueItem.countDocuments(filter),
    CatalogueItem.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          min: { $min: "$price" },
          max: { $max: "$price" }
        }
      }
    ])
  ]);

  const priceRange = {
    min: priceStats[0]?.min || 0,
    max: priceStats[0]?.max || 0
  };

  let items = await CatalogueItem.find(filter)
    .select("uuid catalogueId name validatedDescription price imageUrls imagePublicIds specifications isActive stock createdAt")
    .sort(sortMap[sortBy])
    .skip(skip)
    .limit(limit)
    .lean();

  console.log("[getItemsByCatalogue] Returning", items.length, "items (total:", totalItems, ")");
  return {
    success: true,
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    priceRange,
    data: items
  };
};


exports.getItemById = async (req, h) => {
  const { catalogueId, id } = req.params;
  if (isMockMode()) {
    const isAdmin = req.authUser?.role === "admin";
    const item = mock.items.find((entry) =>
      entry.uuid === id &&
      entry.catalogueId === catalogueId &&
      (isAdmin || entry.isActive !== false)
    );
    return { success: true, data: item || null };
  }

  const isAdmin = req.authUser?.role === "admin";
  const catalogueFilter = isAdmin ? { uuid: catalogueId } : { uuid: catalogueId, isPublished: true };
  const catalogue = await Catalogue.findOne(catalogueFilter).select("uuid").lean();
  if (!catalogue) {
    return h.response({ success: false, message: "Item not found", data: null }).code(404);
  }

  const itemFilter = isAdmin
    ? { uuid: id, catalogueId }
    : { uuid: id, catalogueId, isActive: true };
  const item = await CatalogueItem.findOne(itemFilter).lean();

  if (!item) {
    return h.response({ success: false, message: "Item not found", data: null }).code(404);
  }

  return { success: true, data: item };
};

/* ADMIN */
exports.createItem = async (req, h) => {
  const { catalogueId } = req.params;
  const payload = req.payload;
  if (isMockMode()) {
    return h.response({
      success: false,
      message: "MongoDB connection required to create items."
    }).code(503);
  }

  const { imageUrl, imageUrls, imagePublicId, imagePublicIds, ...itemPayload } = payload;
  const catalogue = await Catalogue.findOne({ uuid: catalogueId }).select("uuid").lean();
  if (!catalogue) {
    return h.response({ success: false, message: "Catalogue not found" }).code(404);
  }

  const normalizedImageUrls = normalizePayloadImageUrls({ imageUrl, imageUrls });
  const normalizedImagePublicIds = normalizePayloadImagePublicIds({ imagePublicId, imagePublicIds });

  const item = await CatalogueItem.create({
    ...itemPayload,
    ...(normalizedImageUrls !== undefined ? { imageUrls: normalizedImageUrls } : {}),
    ...(normalizedImagePublicIds !== undefined ? { imagePublicIds: normalizedImagePublicIds } : {}),
    catalogueId
  });

  return h.response({ success: true, data: item }).code(201);
};

exports.updateItem = async (req, h) => {
  if (isMockMode()) {
    return { success: false, message: "MongoDB connection required to update items." };
  }

  const { id } = req.params;
  const {
    name,
    price,
    catalogueId,
    imageUrl,
    imageUrls,
    imagePublicId,
    imagePublicIds,
    validatedDescription,
    stock,
    stockQuantity,
    isActive
  } = req.payload;

  const updateData = {};
  const existingItem = await CatalogueItem.findOne({ uuid: id }).lean();

  if (!existingItem) {
    return h.response({ success: false, message: "Item not found" }).code(404);
  }

  const normalizedImageUrls = normalizePayloadImageUrls({ imageUrl, imageUrls });
  const normalizedImagePublicIds = normalizePayloadImagePublicIds({ imagePublicId, imagePublicIds });

  if (catalogueId) {
    const targetCatalogue = await Catalogue.findOne({ uuid: catalogueId }).select("uuid").lean();
    if (!targetCatalogue) {
      return h.response({ success: false, message: "Catalogue not found" }).code(404);
    }
  }

  if (name) updateData.name = name;
  if (price !== undefined) updateData.price = price;
  if (catalogueId) updateData.catalogueId = catalogueId;
  if (normalizedImageUrls !== undefined) updateData.imageUrls = normalizedImageUrls;
  if (normalizedImagePublicIds !== undefined) updateData.imagePublicIds = normalizedImagePublicIds;
  if (validatedDescription) updateData.validatedDescription = validatedDescription;
  if (stock !== undefined) updateData.stock = stock;
  if (stockQuantity !== undefined) updateData.stock = stockQuantity; // 👈 mapping
  if (isActive !== undefined) updateData.isActive = isActive;

  const updatedItem = await CatalogueItem.findOneAndUpdate(
    { uuid: id },
    updateData,
    { new: true }
  );

  if (normalizedImagePublicIds !== undefined) {
    await deleteRemovedImages(existingItem.imagePublicIds || [], updatedItem.imagePublicIds || []);
  }

  return { success: true, data: updatedItem };
};


// 🗑 DELETE ITEM
exports.deleteItem = async (req, h) => {
  const { id } = req.params;
  if (isMockMode()) {
    return h.response({
      success: false,
      message: "MongoDB connection required to delete items."
    }).code(503);
  }

  const item = await CatalogueItem.findOneAndDelete({ uuid: id });

  if (!item) {
    return { success: false, message: "Item not found" };
  }

  await deleteImages(item.imagePublicIds || []);

  return h.response({ success: true, message: "Item deleted successfully" }).code(200);
};
exports.getItemAndHappyReviewStats = async (req, h) => {
  if (isMockMode()) {
    return {
      success: true,
      data: {
        activeItems: mock.items.filter((item) => item.isActive).length,
        totalItems: mock.items.length
      }
    };
  }

  // 1️⃣ Count Active Items
  const activeItems = await CatalogueItem.countDocuments({
    isActive: true
  });

  return {
    success: true,
    data: {
      activeItems,
      totalItems: await CatalogueItem.countDocuments()
    }
  };
};
