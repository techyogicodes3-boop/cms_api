const Joi = require("joi");

exports.createItemSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
  specifications: Joi.object().optional(),

  // accept both stock & stockQuantity
  stock: Joi.number().optional(),
  stockQuantity: Joi.number().optional(),

  // accept both imageUrl (string) and imageUrls (array)
  imageUrl: Joi.string().uri().allow("").optional(),
  imageUrls: Joi.array().items(Joi.string().uri().allow("")).optional(),
  imagePublicId: Joi.string().allow("").optional(),
  imagePublicIds: Joi.array().items(Joi.string().allow("")).optional(),
  validatedDescription: Joi.string().allow("").optional(),

  isActive: Joi.boolean().optional()
});

exports.updateItemSchema = Joi.object({
  name: Joi.string().optional(),
  price: Joi.number().optional(),
  catalogueId: Joi.string().optional(),
  imageUrl: Joi.string().uri().allow("").optional(),
  imageUrls: Joi.array().items(Joi.string().uri().allow("")).optional(),
  imagePublicId: Joi.string().allow("").optional(),
  imagePublicIds: Joi.array().items(Joi.string().allow("")).optional(),
  validatedDescription: Joi.string().optional(),
  stock: Joi.number().optional(),
  stockQuantity: Joi.number().optional(),
  isActive: Joi.boolean().optional()
});


// filter
exports.getItemsQuerySchema = Joi.object({
  sortBy: Joi.string().valid('newest', 'price_asc', 'price_des').default('newest'),
  maxPrice: Joi.number().integer().min(0).optional(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
})
