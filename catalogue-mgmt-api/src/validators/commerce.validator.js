const Joi = require("joi");

const text = (max) => Joi.string().trim().max(max);
const personName = (max) => text(max).min(2).pattern(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u);
const placeName = text(100).min(2).pattern(/^[\p{L}\p{M}][\p{L}\p{M}\s'.()-]*$/u);
const indianPhone = Joi.string().trim().pattern(/^[6-9]\d{9}$/);
const pinCode = Joi.string().trim().pattern(/^\d{6}$/);

exports.createInquirySchema = Joi.object({
  company: text(150).allow("").optional(),
  name: personName(120).required(),
  mobile: indianPhone.required(),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  subject: text(160).min(3).required(),
  message: text(2000).min(10).required(),
});

exports.createOrderSchema = Joi.object({
  customer: Joi.object({
    name: personName(160).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    phone: indianPhone.required(),
    streetAddress: text(300).min(5).required(),
    city: placeName.required(),
    state: placeName.required(),
    zipcode: pinCode.required(),
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
  name: personName(120).optional(),
  email: Joi.string().trim().lowercase().email().max(254).optional(),
  phone: indianPhone.allow("").optional(),
  address: Joi.object({
    streetAddress: text(300).min(5).allow("").optional(),
    city: placeName.allow("").optional(),
    state: placeName.allow("").optional(),
    zipcode: pinCode.allow("").optional(),
  }).optional(),
}).min(1);
