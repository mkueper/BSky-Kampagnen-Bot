const crypto = require('crypto');

const KEYLEN = 64;

/**
 * Erstellt einen Scrypt-basierten Passwort-Hash.
 * @param {string} password
 * @param {string} [salt]
 * @returns {string} format salt:hex
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  const derived = crypto.scryptSync(password, salt, KEYLEN);
  return `${salt}:${derived.toString('hex')}`;
}

/**
 * Vergleicht ein Passwort mit einem gespeicherten Salt:Hash-String.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, KEYLEN);
    const expected = Buffer.from(hash, 'hex');
    return (
      derived.length === expected.length &&
      crypto.timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
};
