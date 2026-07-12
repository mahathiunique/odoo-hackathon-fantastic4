// Stage 12 spec expects `npm run seed:stage11`.
// Stage 11 in this repo already maps to notifications + activity.
// Keep this wrapper idempotent and safe to run multiple times.

require("./seedNotificationsAndActivity");
