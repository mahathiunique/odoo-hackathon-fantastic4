// Compatibility shim.
// Some Stage 5 modules (employee) import authentication helpers from
// "../middleware/auth". The real implementations live in authMiddleware.js and
// roleMiddleware.js. This file re-exports them under the expected names so the
// backend loads consistently regardless of which import style a module uses.
const authMiddleware = require("./authMiddleware");
const { authorizeRoles } = require("./roleMiddleware");

module.exports = {
  authMiddleware,
  authorize: authorizeRoles,
  authorizeRoles,
};
