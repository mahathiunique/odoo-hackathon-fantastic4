// Keeps Stage 4 routes decoupled from authentication internals while using the
// real Stage 3 middleware now present in the combined codebase.
const authenticate = require("../middleware/authMiddleware");
const { authorizeRoles: authorize } = require("../middleware/roleMiddleware");

module.exports = { authenticate, authorize };
