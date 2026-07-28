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
  return { success: true, data: data.reverse() };
};

exports.uploadSliderImage = async (req, h) => {
  try {
    const file = req.payload?.image || req.payload?.file;
    const uploadedBy = req.authUser?.id;
    const data = await imageService.uploadImage({
      file,
      folder: imageService.SLIDER_FOLDER,
      uploadedBy,
    });

    return h.response({ success: true, data }).code(201);
  } catch (error) {
    if (/required|allowed|MB|credentials/i.test(error.message)) {
      return Boom.badRequest(error.message);
    }

    if (error.http_code === 401 || /invalid cloud_name|api key|signature/i.test(error.message || "")) {
      console.error("Slider image upload configuration failed:", error.message || error);
      return Boom.badGateway("Image upload service is not configured correctly. Check Cloudinary credentials.");
    }

    console.error("Slider image upload failed:", error);
    return Boom.internal("Failed to upload slider image.");
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
      console.error("Image delete configuration failed:", error.message || error);
      return Boom.badGateway("Image upload service is not configured correctly. Check Cloudinary credentials.");
    }

    console.error("Image delete failed:", error);
    return Boom.internal("Failed to delete image.");
  }
};
