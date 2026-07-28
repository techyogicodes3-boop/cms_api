const CatalogueItem = require("../models/CatalogueItem");
const Catalogue = require("../models/Catalogue");
const User = require("../models/User");
const { isMockMode } = require("../utils/mockMode");
const mock = require("../mock/mockData");

const mapCatalogueRow = (catalogue) => ({
  id: catalogue.uuid,
  uuid: catalogue.uuid,
  name: catalogue.catalogueName || catalogue.name,
  type: catalogue.type,
  status: catalogue.isPublished === false || catalogue.status === "Inactive" ? "Inactive" : "Active",
  itemsCount: catalogue.itemsCount || 0,
  image: catalogue.image || catalogue.imageUrl || catalogue.coverImage || catalogue.thumbnail || null,
  imagePublicId: catalogue.imagePublicId || null,
  createdAt: catalogue.createdAt || catalogue.createdDate
});

const mapItemRow = (item, catalogueMap = {}) => ({
  id: item.uuid,
  uuid: item.uuid,
  name: item.name,
  catalogueId: item.catalogueId,
  catalogueName: catalogueMap[item.catalogueId] || item.catalogueName || item.catalogueId,
  price: item.price,
  stock: item.stock,
  status: item.isActive === false ? "Inactive" : "Active",
  image: item.image || item.imageUrl || item.thumbnail || item.imageUrls?.[0] || null,
  imagePublicIds: item.imagePublicIds || [],
  createdAt: item.createdAt
});

exports.getSummary = async () => {
  if (isMockMode()) {
    const catalogueMap = Object.fromEntries(
      mock.catalogues.map((cat) => [cat.uuid, cat.name || cat.catalogueName])
    );
    const catalogues = mock.catalogues.map(mapCatalogueRow);
    const items = mock.items.map((item) => mapItemRow(item, catalogueMap));
    const users = mock.users || [
      { id: "user-1", name: "Aarav Shah", email: "aarav@example.com", role: "user", status: "Active" },
      { id: "user-2", name: "Mira Patel", email: "mira@example.com", role: "user", status: "Active" },
      { id: "dev-admin", name: "Dev Admin", email: "admin@example.com", role: "admin", status: "Active" }
    ];

    return {
      success: true,
      data: {
        counts: {
          catalogues: catalogues.length,
          items: items.length,
          users: users.length
        },
        catalogues,
        items,
        users
      }
    };
  }

  const [cataloguesRaw, itemsRaw, usersRaw] = await Promise.all([
    Catalogue.aggregate([
      {
        $lookup: {
          from: "catalogueitems",
          localField: "uuid",
          foreignField: "catalogueId",
          as: "items"
        }
      },
      {
        $project: {
          _id: 0,
          uuid: 1,
          name: 1,
          type: 1,
          imageUrl: 1,
          imagePublicId: 1,
          isPublished: 1,
          createdAt: 1,
          itemsCount: { $size: "$items" }
        }
      }
    ]),
    CatalogueItem.find().select("uuid catalogueId name price stock imageUrls imagePublicIds isActive createdAt").lean(),
    User.find().select("uuid name email role status createdAt").lean()
  ]);

  const catalogueMap = Object.fromEntries(cataloguesRaw.map((cat) => [cat.uuid, cat.name]));
  const catalogues = cataloguesRaw.map((cat) => mapCatalogueRow({
    ...cat,
    catalogueName: cat.name,
    image: cat.imageUrl
  }));
  const items = itemsRaw.map((item) => mapItemRow(item, catalogueMap));
  const users = usersRaw.map((user) => ({
    id: user.uuid,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status === "disabled" ? "Inactive" : "Active",
    createdAt: user.createdAt
  }));

  return {
    success: true,
    data: {
      counts: {
        catalogues: catalogues.length,
        items: items.length,
        users: users.length
      },
      catalogues,
      items,
      users
    }
  };
};

exports.getWeeklyPurchases = async () => {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const data = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    data.push({
      day: formatter.format(date),
      value: 0,
    });
  }

  return { success: true, data };
};
