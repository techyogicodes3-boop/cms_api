const Catalogue = require("../models/Catalogue");
const CatalogueItem = require("../models/CatalogueItem");
const CatalogueType = require("../models/CatalogueType");
const {
  deleteRemovedImages
} = require("../services/image.service");
const { deleteExclusiveRecordImages } = require("../services/mediaCleanup.service");
const { isMockMode } = require("../utils/mockMode");
const mock = require("../mock/mockData");

const normalizeImageValues = (payload = {}) => {
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter(Boolean).slice(0, 10)
    : payload.imageUrl !== undefined
      ? [payload.imageUrl].filter(Boolean)
      : undefined;
  const imagePublicIds = Array.isArray(payload.imagePublicIds)
    ? payload.imagePublicIds.slice(0, 10)
    : payload.imagePublicId !== undefined
      ? [payload.imagePublicId].filter(Boolean)
      : undefined;

  return { imageUrls, imagePublicIds };
};

const withCatalogueImages = (catalogue) => {
  const imageUrls = catalogue.imageUrls?.length
    ? catalogue.imageUrls
    : [catalogue.imageUrl].filter(Boolean);
  const imagePublicIds = catalogue.imagePublicIds?.length
    ? catalogue.imagePublicIds
    : [catalogue.imagePublicId].filter(Boolean);

  return {
    ...catalogue,
    imageUrls,
    imagePublicIds,
    imageUrl: imageUrls[0] || "",
    imagePublicId: imagePublicIds[0] || "",
    image: imageUrls[0] || "",
    coverImage: imageUrls[0] || "",
  };
};



exports.getCatalogues = async (req) => {
  if (isMockMode()) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search || "").toLowerCase();
    const filtered = mock.catalogues.filter((catalogue) =>
      !search || catalogue.catalogueName.toLowerCase().includes(search)
    );
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      success: true,
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
      data
    };
  }

  const { search } = req.query;

  // Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let matchStage = {};

  // Role based catalogue visibility
  if (!req.authUser || req.authUser.role !== "admin") {
    matchStage.isPublished = true;
  }

  // Search by name
  if (search) {
    matchStage.name = { $regex: search, $options: "i" };
  }

  //  role check
  const isAdmin = req.authUser && req.authUser.role === "admin";

  //  item lookup based on role
  const itemLookupStage = isAdmin
    ? {
        // ADMIN → all items
        $lookup: {
          from: "catalogueitems",
          localField: "uuid",
          foreignField: "catalogueId",
          as: "items"
        }
      }
    : {
        // USER only active items
        $lookup: {
          from: "catalogueitems",
          let: { catId: "$uuid" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$catalogueId", "$$catId"] },
                isActive: true
              }
            }
          ],
          as: "items"
        }
      };

  const pipeline = [
    { $match: matchStage },

    itemLookupStage,

    {
      $lookup: {
        from: "cataloguetypes",
        localField: "catalogueTypeId",
        foreignField: "uuid",
        as: "catalogueTypeInfo"
      }
    },

    {
      $project: {
        _id: 0,
        uuid: 1,
        catalogueName: "$name",
        description: "$description",
        imageUrl: "$imageUrl",
        imagePublicId: "$imagePublicId",
        imageUrls: 1,
        imagePublicIds: 1,
        image: "$imageUrl",
        coverImage: "$imageUrl",

        type: {
          $ifNull: [
            "$type",
            { $ifNull: [{ $arrayElemAt: ["$catalogueTypeInfo.name", 0] }, "General"] }
          ]
        },

        itemsCount: { $size: "$items" },

        status: {
          $cond: [
            { $eq: ["$isPublished", true] },
            "Active",
            "Inactive"
          ]
        },

        createdDate: "$createdAt"
      }
    },

    { $sort: { createdDate: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  const data = await Catalogue.aggregate(pipeline);

  // Total count (without pagination)
  const totalResult = await Catalogue.aggregate([
    { $match: matchStage },
    { $count: "total" }
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: data.map(withCatalogueImages)
  };
};

exports.getCatalogueById = async (req, h) => {
  const { id } = req.params;

  if (isMockMode()) {
    const catalogue = mock.catalogues.find((item) => item.uuid === id || item.id === id);
    if (!catalogue) {
      return h.response({ success: false, message: "Catalogue not found" }).code(404);
    }

    if (req.authUser?.role !== "admin" && catalogue.isPublished === false) {
      return h.response({ success: false, message: "Catalogue not found" }).code(404);
    }

    return { success: true, data: catalogue };
  }

  const isAdmin = req.authUser?.role === "admin";
  const filter = isAdmin ? { uuid: id } : { uuid: id, isPublished: true };
  const catalogue = await Catalogue.findOne(filter).lean();

  if (!catalogue) {
    return h.response({ success: false, message: "Catalogue not found" }).code(404);
  }

  const itemsCount = await CatalogueItem.countDocuments(
    isAdmin ? { catalogueId: catalogue.uuid } : { catalogueId: catalogue.uuid, isActive: true }
  );

  return {
    success: true,
    data: withCatalogueImages({
      uuid: catalogue.uuid,
      catalogueName: catalogue.name,
      name: catalogue.name,
      description: catalogue.description,
      imageUrl: catalogue.imageUrl,
      imagePublicId: catalogue.imagePublicId,
      imageUrls: catalogue.imageUrls,
      imagePublicIds: catalogue.imagePublicIds,
      isPublished: catalogue.isPublished,
      status: catalogue.isPublished ? "Active" : "Inactive",
      itemsCount,
      createdDate: catalogue.createdAt,
    }),
  };
};

exports.createCatalogue = async (req, h) => {
  if (isMockMode()) {
    return h.response({
      success: false,
      message: "MongoDB connection required to create catalogues."
    }).code(503);
  }

  const payload = { ...req.payload };
  payload.createdBy = req.authUser.id;

  const { imageUrls, imagePublicIds } = normalizeImageValues(payload);
  if (imageUrls !== undefined) {
    payload.imageUrls = imageUrls;
    payload.imageUrl = imageUrls[0] || "";
  }
  if (imagePublicIds !== undefined) {
    payload.imagePublicIds = imagePublicIds;
    payload.imagePublicId = imagePublicIds[0] || "";
  }

  // ✅ auto publish logic
  if (payload.shouldAutoPublish) {
    payload.isPublished = true;
    payload.publishedAt = new Date();
  }

  // Use the first available type when the admin form omits it, but allow catalogues without types.
  const catalogueType = payload.catalogueTypeId
    ? await CatalogueType.findOne({ uuid: payload.catalogueTypeId })
    : await CatalogueType.findOne().sort({ createdAt: 1 });
  if (payload.catalogueTypeId && !catalogueType) return h.response({ error: "CatalogueType not found" }).code(404);
  if (catalogueType) {
    payload.catalogueTypeId = catalogueType.uuid;
  } else {
    delete payload.catalogueTypeId;
  }

  const cat = await Catalogue.create(payload);
  return h.response({
    success: true,
    data: {
      ...cat.toObject(),
      type: catalogueType?.name
    }
  }).code(201);
};

exports.updateCatalogue = async (req) => {
  if (isMockMode()) {
    return { success: false, message: "MongoDB connection required to update catalogues." };
  }

  const { id } = req.params;
  const existing = await Catalogue.findOne({ uuid: id }).lean();

  if (!existing) {
    return { success: false, message: "Catalogue not found" };
  }

  const updatePayload = { ...req.payload };
  const imagesWereUpdated = Object.prototype.hasOwnProperty.call(req.payload, "imageUrls") ||
    Object.prototype.hasOwnProperty.call(req.payload, "imageUrl");
  const publicIdsWereUpdated = Object.prototype.hasOwnProperty.call(req.payload, "imagePublicIds") ||
    Object.prototype.hasOwnProperty.call(req.payload, "imagePublicId");
  const { imageUrls, imagePublicIds } = normalizeImageValues(req.payload);

  if (imagesWereUpdated) {
    updatePayload.imageUrls = imageUrls || [];
    updatePayload.imageUrl = imageUrls?.[0] || "";
  }
  if (publicIdsWereUpdated || imagesWereUpdated) {
    updatePayload.imagePublicIds = imagePublicIds || [];
    updatePayload.imagePublicId = imagePublicIds?.[0] || "";
  }

  const updated = await Catalogue.findOneAndUpdate(
    { uuid: id },
    updatePayload,
    { new: true }
  );

  if (imagesWereUpdated || publicIdsWereUpdated) {
    await deleteRemovedImages(
      existing.imagePublicIds?.length ? existing.imagePublicIds : [existing.imagePublicId].filter(Boolean),
      updated?.imagePublicIds || []
    );
  }

  return { success: true, data: withCatalogueImages(updated.toObject()) };
};

exports.publishCatalogue = async (req) => {
  if (isMockMode()) {
    return { success: false, message: "MongoDB connection required to publish catalogues." };
  }

  const { id } = req.params;
  const { isPublished } = req.payload;

  const data = await Catalogue.findOneAndUpdate(
    { uuid: id },
    { isPublished, publishedAt: isPublished ? new Date() : null },
    { new: true }
  );

  return { success: true, data };
};

exports.deleteCatalogue = async (req, h) => {
  if (isMockMode()) {
    return h.response({
      success: false,
      message: "MongoDB connection required to delete catalogues."
    }).code(503);
  }

  const { id } = req.params;
  const catalogue = await Catalogue.findOne({ uuid: id }).lean();
  if (!catalogue) {
    return h.response({ success: false, message: "Catalogue not found" }).code(404);
  }

  const items = await CatalogueItem.find({ catalogueId: id })
    .select("uuid imageUrls imagePublicIds imageUrl imagePublicId")
    .lean();

  let mediaResult;
  try {
    mediaResult = await deleteExclusiveRecordImages([catalogue, ...items], {
      catalogueIds: [id],
      itemIds: items.map((item) => item.uuid),
    });
  } catch (error) {
    console.error("Catalogue media cleanup failed:", error.message || error);
    return h.response({
      success: false,
      message: "Catalogue was not deleted because its Cloudinary images could not be removed. Please try again.",
    }).code(502);
  }

  await CatalogueItem.deleteMany({ catalogueId: id });
  await Catalogue.deleteOne({ uuid: id });

  return h.response({
    success: true,
    message: "Catalogue, related items, and images deleted permanently.",
    data: { deletedItems: items.length, deletedImages: mediaResult.deleted.length },
  }).code(200);
};


exports.getAllCatalogueTypes = async (req, h) => {
  try {
    if (isMockMode()) {
      return h.response({
        success: true,
        data: mock.catalogueTypes.map(({ uuid, name }) => ({ uuid, name }))
      }).code(200);
    }

    const types = await CatalogueType.find().select("uuid name -_id").lean();
    return h.response({
      success: true,
      data: types
    }).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ error: "Internal Server Error" }).code(500);
  }
};
