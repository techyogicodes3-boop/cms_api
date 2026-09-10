const cloudinary = require("../config/cloudinary");
const ImageAsset = require("../models/ImageAsset");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
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

const validateSliderMediaFile = (file) => {
  if (!file || typeof file.pipe !== "function") {
    throw new Error("Slider image or video file is required.");
  }

  const mimeType = file.hapi?.headers?.["content-type"] || file.hapi?.headers?.["Content-Type"];
  const mediaType = ALLOWED_IMAGE_TYPES.has(mimeType)
    ? "image"
    : ALLOWED_VIDEO_TYPES.has(mimeType)
      ? "video"
      : null;

  if (!mediaType) {
    throw new Error("Only JPG, PNG, WebP, MP4, MOV, and WebM files are allowed.");
  }

  const contentLength = Number(file.hapi?.headers?.["content-length"] || 0);
  const maxSize = mediaType === "video" ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
  if (contentLength > maxSize) {
    throw new Error(mediaType === "video" ? "Video must be 50 MB or smaller." : "Image must be 5 MB or smaller.");
  }

  return {
    mediaType,
    resourceType: mediaType,
    mimeType,
    originalName: file.hapi?.filename || `slider-${mediaType}`,
    size: contentLength || undefined,
  };
};

const uploadMedia = async ({ file, folder, uploadedBy, metadata }) => {
  ensureCloudinaryConfig();
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: metadata.resourceType },
      (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      }
    );

    file.on("error", reject);
    file.pipe(uploadStream);
  });

  let asset;
  try {
    asset = await ImageAsset.create({
      imageUrl: result.secure_url,
      mediaType: metadata.mediaType,
      resourceType: metadata.resourceType,
      publicId: result.public_id,
      folder,
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      size: result.bytes || metadata.size,
      width: result.width,
      height: result.height,
      duration: result.duration,
      uploadedBy,
    });
  } catch (error) {
    await cloudinary.uploader.destroy(result.public_id, { resource_type: metadata.resourceType });
    throw error;
  }

  return {
    ...asset.toObject(),
    mediaUrl: asset.imageUrl,
  };
};

const uploadSliderMedia = ({ file, uploadedBy }) => uploadMedia({
  file,
  folder: SLIDER_FOLDER,
  uploadedBy,
  metadata: validateSliderMediaFile(file),
});

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
    throw new Error("Media publicId is required.");
  }

  const asset = await ImageAsset.findOne({ publicId }).lean();
  const resourceType = asset?.resourceType || asset?.mediaType || (asset?.mimeType?.startsWith("video/") ? "video" : "image");
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  await ImageAsset.deleteOne({ publicId });

  return { publicId, mediaType: resourceType };
};

const replaceSliderMedia = async ({ id, file, uploadedBy }) => {
  const existing = await ImageAsset.findOne({ uuid: id, folder: SLIDER_FOLDER }).lean();
  if (!existing) {
    const error = new Error("Slider media not found.");
    error.statusCode = 404;
    throw error;
  }

  const replacement = await uploadSliderMedia({ file, uploadedBy });
  try {
    await deleteImage(existing.publicId);
    return replacement;
  } catch (error) {
    try {
      await deleteImage(replacement.publicId);
    } catch (rollbackError) {
      console.error("Failed to roll back replacement slider media:", rollbackError.message || rollbackError);
    }
    throw error;
  }
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
  MAX_VIDEO_SIZE_BYTES,
  uploadImage,
  uploadSliderMedia,
  replaceSliderMedia,
  listImages,
  deleteImage,
  deleteImages,
  deleteRemovedImages,
};
