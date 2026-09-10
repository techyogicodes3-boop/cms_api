const Joi = require("joi");

exports.createCatalogueSchema = Joi.object({
  name: Joi.string().required(),
  // type: Joi.string().required(),
  catalogueTypeId: Joi.string().allow("", null),
  description: Joi.string().allow(""),
  imageUrl: Joi.string().uri().allow(""),
  imagePublicId: Joi.string().allow(""),
  imageUrls: Joi.array().max(10).items(Joi.string().uri().allow("")).optional(),
  imagePublicIds: Joi.array().max(10).items(Joi.string().allow("")).optional(),
  shouldAutoPublish: Joi.boolean().required()
});

exports.updateCatalogueSchema = Joi.object({
  name: Joi.string(),
  type: Joi.string(),
  catalogueTypeId: Joi.string(),
  description: Joi.string().allow(""),
  imageUrl: Joi.string().uri().allow(""),
  imagePublicId: Joi.string().allow(""),
  imageUrls: Joi.array().max(10).items(Joi.string().uri().allow("")).optional(),
  imagePublicIds: Joi.array().max(10).items(Joi.string().allow("")).optional(),
  isPublished: Joi.boolean()
});

exports.publishSchema = Joi.object({
  isPublished: Joi.boolean().required()
});
