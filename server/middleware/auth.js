const authMiddleware = require('./authMiddleware');
const { authorizeRoles } = require('./roleMiddleware');

const authorize = (...roles) => authorizeRoles(...roles);

module.exports = {
  authMiddleware,
  authorize,
};
