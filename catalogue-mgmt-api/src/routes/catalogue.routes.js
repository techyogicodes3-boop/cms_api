const Joi = require("joi");
const CatalogueController = require("../controllers/catalogue.controller");
const { verifyToken, verifyTokenOptional, isAdmin } = require("../middlewares/auth.middleware");
const {
  createCatalogueSchema,
  updateCatalogueSchema,
  publishSchema
} = require("../validators/catalogue.validator");

module.exports = [
  {
    method: "GET",
    path: "/api/v1/catalogues",
    options: {
      tags: ["api"],
      pre: [verifyTokenOptional]
    },
    handler: CatalogueController.getCatalogues
  },
  {
    method: "GET",
    path: "/api/v1/catalogue-types",
    options: {
      tags: ["api"],
      description: "Get All Catalogue Types",
      pre: [verifyTokenOptional]
    },
    handler: CatalogueController.getAllCatalogueTypes
  },
  {
    method: "GET",
    path: "/api/v1/catalogues/{id}",
    options: {
      tags: ["api"],
      description: "Get a catalogue by id",
      pre: [verifyTokenOptional],
      validate: {
        params: Joi.object({ id: Joi.string().required() })
      }
    },
    handler: CatalogueController.getCatalogueById
  },
  {
    method: "POST",
    path: "/api/v1/admin/catalogues",
    options: {
      tags: ["api"],
      description: "Create a new Catalogue",
      pre: [verifyToken, isAdmin],
      validate: { payload: createCatalogueSchema }
    },
    handler: CatalogueController.createCatalogue
  },
  {
    method: "PUT",
    path: "/api/v1/admin/catalogues/{id}",
    options: {
      tags: ["api"],
      description: "Update a Catalogue",
      pre: [verifyToken, isAdmin],
      validate: {
        params: Joi.object({ id: Joi.string().required() }),
        payload: updateCatalogueSchema
      }
    },
    handler: CatalogueController.updateCatalogue
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/catalogues/{id}/publish",
    options: {
      tags: ["api"],
      description: "Publish a Catalogue",
      pre: [verifyToken, isAdmin],
      validate: {
        params: Joi.object({ id: Joi.string().required() }),
        payload: publishSchema
      }
    },
    handler: CatalogueController.publishCatalogue
  },
  {
    method: "DELETE",
    path: "/api/v1/admin/catalogues/{id}",
    options: {
      tags: ["api"],
      description: "Delete a Catalogue",
      pre: [verifyToken, isAdmin],
      validate: {
        params: Joi.object({ id: Joi.string().required() })
      }
    },
    handler: CatalogueController.deleteCatalogue
  }
];
