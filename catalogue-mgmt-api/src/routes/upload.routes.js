const Joi = require("joi");
const ImageController = require("../controllers/image.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth.middleware");

const imageFolderSchema = Joi.string()
  .valid("chocotraill/products", "chocotraill/catalogues", "chocotraill/reviews", "chocotraill/sliders")
  .default("chocotraill/products");

module.exports = [
  {
    method: "GET",
    path: "/api/v1/sliders",
    options: {
      tags: ["api", "sliders"],
      description: "Fetch public home slider images",
      auth: false,
    },
    handler: ImageController.listSliderImages,
  },
  {
    method: "POST",
    path: "/api/v1/admin/sliders",
    options: {
      pre: [verifyToken, isAdmin],
      tags: ["api", "sliders"],
      description: "Upload a home slider image",
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 5 * 1024 * 1024,
      },
      validate: {
        payload: Joi.object({
          image: Joi.any().optional(),
          file: Joi.any().optional(),
        }).or("image", "file"),
      },
    },
    handler: ImageController.uploadSliderImage,
  },
  {
    method: "DELETE",
    path: "/api/v1/admin/sliders",
    options: {
      pre: [verifyToken, isAdmin],
      tags: ["api", "sliders"],
      description: "Delete a home slider image from Cloudinary and the database",
      validate: {
        payload: Joi.object({
          publicId: Joi.string().required(),
        }),
      },
    },
    handler: ImageController.deleteImage,
  },
  {
    method: "POST",
    path: "/api/v1/images/upload",
    options: {
      pre: [verifyToken, isAdmin],
      tags: ["api", "images"],
      description: "Upload an image through the backend to Cloudinary",
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 5 * 1024 * 1024,
      },
      validate: {
        payload: Joi.object({
          image: Joi.any().optional(),
          file: Joi.any().optional(),
          folder: imageFolderSchema.optional(),
        }).or("image", "file"),
      },
    },
    handler: ImageController.uploadImage,
  },
  {
    method: "GET",
    path: "/api/v1/images",
    options: {
      pre: [verifyToken, isAdmin],
      tags: ["api", "images"],
      description: "Fetch uploaded image records",
      validate: {
        query: Joi.object({
          folder: imageFolderSchema.optional(),
        }),
      },
    },
    handler: ImageController.listImages,
  },
  {
    method: "DELETE",
    path: "/api/v1/images",
    options: {
      pre: [verifyToken, isAdmin],
      tags: ["api", "images"],
      description: "Delete a Cloudinary image by publicId",
      validate: {
        payload: Joi.object({
          publicId: Joi.string().required(),
        }),
      },
    },
    handler: ImageController.deleteImage,
  },
];
