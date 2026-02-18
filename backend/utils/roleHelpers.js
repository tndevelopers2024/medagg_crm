const Role = require("../models/Role");

// Cache role ObjectIds in memory (cleared on process restart)
const _cache = {};

/**
 * Get a Role document's _id by its name (case-insensitive).
 * Results are cached in-memory for the lifetime of the process.
 */
async function getRoleIdByName(name) {
  const key = name.toLowerCase();
  if (_cache[key]) return _cache[key];

  const role = await Role.findOne({
    name: new RegExp(`^${name}$`, "i"),
  }).lean();

  if (role) {
    _cache[key] = role._id;
  }
  return role ? role._id : null;
}

/**
 * Clear the in-memory role cache (useful in tests).
 */
function clearRoleCache() {
  for (const k of Object.keys(_cache)) delete _cache[k];
}

module.exports = { getRoleIdByName, clearRoleCache };
