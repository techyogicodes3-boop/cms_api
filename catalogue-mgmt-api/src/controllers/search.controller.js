const Catalogue = require("../models/Catalogue");
const CatalogueItem = require("../models/CatalogueItem");

// strip special characaters from text
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

exports.globalSearch = async (req, h) => {
    try {
        const { q, limit = 20, offset = 0 } = req.query;

        // validation
        if (!q || q.trim().length === 0) {
            return h.response({
                message: "Query `q` is required"
            }).code(400);
        }

        // saniatize q
        const cleanQ = escapeRegex(q.trim());

        // case-insensitive regex search expression
        const searchRegexQ = new RegExp(cleanQ, "i");

        // from query it comes as string so gotta prase em' to number
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        // Promise.all() -> run queries in parallel for performance else they run sequentially
        const [catalogues, items] = await Promise.all([
            //? Catalogue search
            /*
                Match name, type, OR description.
                Filter: isPublished: true.
                Apply limit & offset.
            */
            Catalogue.find({
                isPublished: true,
                $or: [
                    { name: searchRegexQ },
                    { type: searchRegexQ },
                    { description: searchRegexQ }
                ]
            }).skip(offsetNum).limit(limitNum),


            //? Item search
            /*
                Filter: isActive: true.
                Match name OR validatedDescription.
                Apply limit & offset.
            */
            CatalogueItem.find({
                isActive: true,
                $or: [
                    { name: searchRegexQ },
                    { validatedDescription: searchRegexQ }
                ]
            }).skip(offsetNum).limit(limitNum)
        ]);

        return h.response({
            success: true,
            meta: {
                count: catalogues.length + items.length,
                limit: limitNum,
                offset: offsetNum
            },
            data: {
                catalogues,
                items
            }
        }).code(200);
    }
    catch (err) {
        console.log(err);
        return h.response({
            error: "Internal Server Error"
        }).code(500);
    }


}
