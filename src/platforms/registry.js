const { PLATFORMS } = require("./types");

/** @type {Map<string, any>} */
const registry = new Map();

function registerProfile(profile) {
  if (!profile || typeof profile.id !== "string") {
    throw new Error("Profil muss eine eindeutige 'id' besitzen.");
  }

  registry.set(profile.id, profile);
}

function getProfile(id) {
  if (!id) {
    return null;
  }

  return registry.get(id) ?? null;
}

module.exports = {
  registerProfile,
  getProfile,
  PLATFORMS,
};
