const bcrypt = require("bcryptjs");
const config = require("../config/environment");

const hashPassword = async (password) => {
  const saltRounds = Number(config.bcryptSaltRounds || 12);
  return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
