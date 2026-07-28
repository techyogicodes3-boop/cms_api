const Joi = require("joi");

exports.createCatalogueSchema = Joi.object({
  name: Joi.string().required(),
  // type: Joi.string().required(),
  catalogueTypeId: Joi.string().allow("", null),
  description: Joi.string().allow(""),
  imageUrl: Joi.string().uri().allow(""),
  imagePublicId: Joi.string().allow(""),
  shouldAutoPublish: Joi.boolean().required()
});

exports.updateCatalogueSchema = Joi.object({
  name: Joi.string(),
  type: Joi.string(),
  catalogueTypeId: Joi.string(),
  description: Joi.string().allow(""),
  imageUrl: Joi.string().uri().allow(""),
  imagePublicId: Joi.string().allow(""),
  isPublished: Joi.boolean()
});

exports.publishSchema = Joi.object({
  isPublished: Joi.boolean().required()
});
