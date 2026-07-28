const User = require("../models/User");

exports.getUserObjectIdByUuid = async (userUuid) => {
  const user = await User.findOne({ uuid: userUuid }, { _id: 1 });
  if (!user) {
    throw new Error("User not found");
  }
  return user._id;
};
