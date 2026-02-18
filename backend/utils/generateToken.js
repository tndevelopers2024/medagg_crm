const jwt = require('jsonwebtoken');

const generateToken = (id, roleId, roleName) => {
  return jwt.sign({ id, roleId, roleName }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

module.exports = generateToken;
