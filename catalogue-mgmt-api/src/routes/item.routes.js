const Joi = require("joi");
const ItemController = require("../controllers/item.controller");
const { verifyToken, verifyTokenOptional, isAdmin } = require("../middlewares/auth.middleware");
const {
  createItemSchema,
  updateItemSchema,
  getItemsQuerySchema
} = require("../validators/item.validator");

module.exports = [
  // PUBLIC
  {
    method: "GET",
    path: "/api/v1/catalogues/{catalogueId}/items",
    options: {
      pre: [verifyTokenOptional],
      validate: {
        params: Joi.object({ catalogueId: Joi.string().required() }),
        query: getItemsQuerySchema
      }
    },
    handler: ItemController.getItemsByCatalogue
  },
  {
    method: "GET",
    path: "/api/v1/catalogues/{catalogueId}/items/{id}",
    options: {
      pre: [verifyTokenOptional],
      validate: {
        params: Joi.object({
          catalogueId: Joi.string().required(),
          id: Joi.string().required()
        })
      }
    },
    handler: ItemController.getItemById
  },
  {
    method: "GET",
    path: "/api/v1/item-review-stats",
    options: {
      pre: [verifyTokenOptional]
    },
    handler: ItemController.getItemAndHappyReviewStats
  },
  // ADMIN
{
  method: "GET",
  path: "/api/v1/admin/catalogues/{catalogueId}/items",
  options: {
    pre: [verifyToken, isAdmin],
    validate: {
      params: Joi.object({ catalogueId: Joi.string().required() }),
      query: getItemsQuerySchema
    }
  },
  handler: ItemController.getItemsByCatalogue
},



  {
    method: "POST",
    path: "/api/v1/admin/catalogues/{catalogueId}/items",
    options: {
      pre: [verifyToken, isAdmin],
      validate: {
        params: Joi.object({ catalogueId: Joi.string().required() }),
        payload: createItemSchema
      }
    },
    handler: ItemController.createItem
  },
  // UPDATE ITEM
  {
    method: "PUT",
    path: "/api/v1/admin/items/{id}",
    options: {
      pre: [verifyToken, isAdmin],
      validate: {
        params: Joi.object({ id: Joi.string().required() }),
        payload: updateItemSchema
      }
    },
    handler: ItemController.updateItem
  },

  // DELETE ITEM
  {
    method: "DELETE",
    path: "/api/v1/admin/items/{id}",
    options: {
      pre: [verifyToken, isAdmin],
      validate: {
        params: Joi.object({ id: Joi.string().required() })
      }
    },
    handler: ItemController.deleteItem
  },

  // Filter Items: 

];
