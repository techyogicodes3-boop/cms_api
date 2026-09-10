const Boom = require("@hapi/boom");
const imageService = require("../services/image.service");

exports.uploadImage = async (req, h) => {
  try {
    const file = req.payload?.image || req.payload?.file;
    const folder = req.payload?.folder || imageService.DEFAULT_FOLDER;
    const uploadedBy = req.authUser?.id;

    const data = await imageService.uploadImage({ file, folder, uploadedBy });
    return h.response({ success: true, data }).code(201);
  } catch (error) {
    if (/required|allowed|MB|credentials/i.test(error.message)) {
      return Boom.badRequest(error.message);
    }

    if (error.http_code === 401 || /invalid cloud_name|api key|signature/i.test(error.message || "")) {
      console.error("Image upload configuration failed:", error.message || error);
      return Boom.badGateway("Image upload service is not configured correctly. Check Cloudinary credentials.");
    }

    console.error("Image upload failed:", error);
    return Boom.internal("Failed to upload image.");
  }
};

exports.listImages = async (req) => {
  const data = await imageService.listImages({ folder: req.query.folder });
  return { success: true, data };
};

exports.listSliderImages = async () => {
  const data = await imageService.listImages({ folder: imageService.SLIDER_FOLDER });
  return {
    success: true,
    data: data.reverse().map((asset) => ({
      ...asset,
      mediaType: asset.mediaType || (asset.mimeType?.startsWith("video/") ? "video" : "image"),
      mediaUrl: asset.imageUrl,
    })),
  };
};

exports.uploadSliderImage = async (req, h) => {
  try {
    const file = req.payload?.image || req.payload?.file;
    const uploadedBy = req.authUser?.id;
    const data = await imageService.uploadSliderMedia({ file, uploadedBy });

    return h.response({ success: true, data }).code(201);
  } catch (error) {
    if (/required|allowed|MB|credentials/i.test(error.message)) {
      return Boom.badRequest(error.message);
    }

    if (error.http_code === 401 || /invalid cloud_name|api key|signature/i.test(error.message || "")) {
      console.error("Slider media upload configuration failed:", error.message || error);
      return Boom.badGateway("Media upload service is not configured correctly. Check Cloudinary credentials.");
    }

    console.error("Slider media upload failed:", error);
    return Boom.internal("Failed to upload slider media.");
  }
};

exports.replaceSliderMedia = async (req, h) => {
  try {
    const file = req.payload?.image || req.payload?.file;
    const data = await imageService.replaceSliderMedia({
      id: req.params.id,
      file,
      uploadedBy: req.authUser?.id,
    });
    return h.response({ success: true, data }).code(200);
  } catch (error) {
    if (error.statusCode === 404) return Boom.notFound(error.message);
    if (/required|allowed|MB|credentials/i.test(error.message)) return Boom.badRequest(error.message);
    if (error.http_code === 401 || /invalid cloud_name|api key|signature/i.test(error.message || "")) {
      return Boom.badGateway("Media upload service is not configured correctly. Check Cloudinary credentials.");
    }
    console.error("Slider media replacement failed:", error);
    return Boom.internal("Failed to replace slider media.");
  }
};

exports.deleteImage = async (req, h) => {
  try {
    const publicId = req.payload?.publicId;
    const data = await imageService.deleteImage(publicId);
    return h.response({ success: true, data }).code(200);
  } catch (error) {
    if (/required|credentials/i.test(error.message)) {
      return Boom.badRequest(error.message);
    }

    if (error.http_code === 401 || /invalid cloud_name|api key|signature/i.test(error.message || "")) {
      console.error("Media delete configuration failed:", error.message || error);
      return Boom.badGateway("Media service is not configured correctly. Check Cloudinary credentials.");
    }

    console.error("Media delete failed:", error);
    return Boom.internal("Failed to delete media.");
  }
};
