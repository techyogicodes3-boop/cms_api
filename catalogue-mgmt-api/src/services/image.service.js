const cloudinary = require("../config/cloudinary");
const ImageAsset = require("../models/ImageAsset");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_FOLDER = "chocotraill/products";
const SLIDER_FOLDER = "chocotraill/sliders";

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

const ensureCloudinaryConfig = () => {
  if (!hasCloudinaryConfig()) {
    throw new Error("Cloudinary credentials are missing.");
  }
};

const validateImageFile = (file) => {
  if (!file || typeof file.pipe !== "function") {
    throw new Error("Image file is required.");
  }

  const mimeType = file.hapi?.headers?.["content-type"] || file.hapi?.headers?.["Content-Type"];
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  const contentLength = Number(file.hapi?.headers?.["content-length"] || 0);
  if (contentLength > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  return {
    mimeType,
    originalName: file.hapi?.filename || "image",
    size: contentLength || undefined,
  };
};

const uploadImage = async ({ file, folder = DEFAULT_FOLDER, uploadedBy }) => {
  ensureCloudinaryConfig();
  const metadata = validateImageFile(file);

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(uploadResult);
      }
    );

    file.on("error", reject);
    file.pipe(uploadStream);
  });

  const asset = await ImageAsset.create({
    imageUrl: result.secure_url,
    publicId: result.public_id,
    folder,
    originalName: metadata.originalName,
    mimeType: metadata.mimeType,
    size: metadata.size,
    uploadedBy,
  });

  return {
    imageUrl: asset.imageUrl,
    publicId: asset.publicId,
    imagePublicId: asset.publicId,
    uuid: asset.uuid,
  };
};

const listImages = async ({ folder } = {}) => {
  const query = folder ? { folder } : {};
  return ImageAsset.find(query).sort({ createdAt: -1 }).lean();
};

const deleteImage = async (publicId) => {
  ensureCloudinaryConfig();
  if (!publicId) {
    throw new Error("Image publicId is required.");
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  await ImageAsset.deleteOne({ publicId });

  return { publicId };
};

const deleteImages = async (publicIds = []) => {
  const uniqueIds = [...new Set(publicIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const results = await Promise.allSettled(uniqueIds.map(deleteImage));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Cloudinary delete failed:", {
        publicId: uniqueIds[index],
        error: result.reason?.message || result.reason,
      });
    }
  });

  return results;
};

const deleteRemovedImages = async (oldPublicIds = [], newPublicIds = []) => {
  const next = new Set(newPublicIds.filter(Boolean));
  const removed = oldPublicIds.filter((publicId) => publicId && !next.has(publicId));
  return deleteImages(removed);
};

module.exports = {
  DEFAULT_FOLDER,
  SLIDER_FOLDER,
  MAX_IMAGE_SIZE_BYTES,
  uploadImage,
  listImages,
  deleteImage,
  deleteImages,
  deleteRemovedImages,
};
