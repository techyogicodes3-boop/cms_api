const Joi = require("joi");
const SearchController = require("../controllers/search.controller");

module.exports = [
    {
        method: "GET",
        path: "/api/v1/search",
        options: {
            description: "Global search",
            notes: "Search catalogues & items",
            tags: ["api", "search"],
            validate: {
                query: Joi.object({
                    q: Joi.string().required().min(1).description("Search Query"),
                    limit: Joi.number().integer().min(1).max(30).default(20).description("Limit results"),
                    offset: Joi.number().integer().min(0).default(0).description("Offset results")
                })
            },
            handler: SearchController.globalSearch
        }
    }
]
