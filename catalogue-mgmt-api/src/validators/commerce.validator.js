const Joi = require("joi");

const text = (max) => Joi.string().trim().max(max);

exports.createInquirySchema = Joi.object({
  company: text(150).allow("").optional(),
  name: text(120).required(),
  mobile: Joi.string().trim().pattern(/^\d{10}$/).required(),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  subject: text(160).allow("").optional(),
  message: text(2000).allow("").optional(),
});

exports.createOrderSchema = Joi.object({
  customer: Joi.object({
    name: text(160).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,20}$/).required(),
    streetAddress: text(300).required(),
    city: text(100).required(),
    state: text(100).required(),
    zipcode: Joi.string().trim().pattern(/^\d{4,10}$/).required(),
  }).required(),
  items: Joi.array().min(1).max(100).items(Joi.object({
    catalogueItemId: Joi.string().trim().max(100).required(),
    name: text(200).required(),
    quantity: Joi.number().integer().min(1).max(999).required(),
    unitPrice: Joi.number().min(0).required(),
    imageUrl: Joi.string().trim().max(2048).allow("").optional(),
  })).required(),
  shippingMethod: text(50).default("standard"),
  specialInstruction: text(500).allow("").optional(),
});

exports.updateProfileSchema = Joi.object({
  name: text(120).min(3).optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,20}$/).allow("").optional(),
  address: Joi.object({
    streetAddress: text(300).allow("").optional(),
    city: text(100).allow("").optional(),
    state: text(100).allow("").optional(),
    zipcode: Joi.string().trim().max(10).allow("").optional(),
  }).optional(),
}).min(1);
