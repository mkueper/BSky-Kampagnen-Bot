const { PLATFORMS } = require("./types");

/**
 * Zentrale Registrierungsstelle für Plattform-Profile.
 *
 * Profile werden beim Bootstrapping über `setupPlatforms()` eingetragen und
 * sind danach über `getProfile()` abrufbar. Die Map erlaubt schnelles Lookup
 * und verhindert doppelte Registrierungen.
 */
/** @type {Map<string, any>} */
const registry = new Map();

/**
 * Registriert ein Profil-Objekt anhand seiner eindeutigen ID.
 *
 * @param {{ id: string }} profile
 */
function registerProfile(profile) {
  if (!profile || typeof profile.id !== "string") {
    throw new Error("Profil muss eine eindeutige 'id' besitzen.");
  }

  registry.set(profile.id, profile);
}

/**
 * Gibt das registrierte Profil zur ID zurück.
 *
 * @param {string} id
 * @returns {any | null}
 */
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
