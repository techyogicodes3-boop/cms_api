const Catalogue = require("../models/Catalogue");
const CatalogueItem = require("../models/CatalogueItem");
const { deleteImagesStrict, resolveImagePublicIds } = require("./image.service");

function imageReferences(records = []) {
  const publicIds = [];
  const imageUrls = [];

  records.filter(Boolean).forEach((record) => {
    publicIds.push(...(Array.isArray(record.imagePublicIds) ? record.imagePublicIds : []));
    if (record.imagePublicId) publicIds.push(record.imagePublicId);
    imageUrls.push(...(Array.isArray(record.imageUrls) ? record.imageUrls : []));
    if (record.imageUrl) imageUrls.push(record.imageUrl);
  });

  return {
    publicIds: [...new Set(publicIds.filter(Boolean))],
    imageUrls: [...new Set(imageUrls.filter(Boolean))],
  };
}

function referenceQuery({ publicIds, imageUrls }) {
  const conditions = [];
  if (publicIds.length) {
    conditions.push({ imagePublicIds: { $in: publicIds } }, { imagePublicId: { $in: publicIds } });
  }
  if (imageUrls.length) {
    conditions.push({ imageUrls: { $in: imageUrls } }, { imageUrl: { $in: imageUrls } });
  }
  return conditions.length ? { $or: conditions } : null;
}

async function deleteExclusiveRecordImages(records, { catalogueIds = [], itemIds = [] } = {}) {
  const references = imageReferences(records);
  const candidateIds = await resolveImagePublicIds(references);
  if (candidateIds.length === 0) return { deleted: [], preserved: [] };

  const query = referenceQuery(references);
  const [sharedCatalogues, sharedItems] = query ? await Promise.all([
    Catalogue.find({ uuid: { $nin: catalogueIds }, ...query }).select("imageUrls imagePublicIds imageUrl imagePublicId").lean(),
    CatalogueItem.find({ uuid: { $nin: itemIds }, ...query }).select("imageUrls imagePublicIds imageUrl imagePublicId").lean(),
  ]) : [[], []];

  const sharedIds = new Set(await resolveImagePublicIds(imageReferences([...sharedCatalogues, ...sharedItems])));
  const exclusiveIds = candidateIds.filter((publicId) => !sharedIds.has(publicId));
  await deleteImagesStrict(exclusiveIds);

  return {
    deleted: exclusiveIds,
    preserved: candidateIds.filter((publicId) => sharedIds.has(publicId)),
  };
}

module.exports = { deleteExclusiveRecordImages, imageReferences };
