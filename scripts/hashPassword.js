#!/usr/bin/env node
/**
 * Kleine CLI, um sichere Passwort-Hashes (salt:scrypt) zu erzeugen.
 *
 * Nutzung:
 *   node scripts/hashPassword.js
 *   # oder mit Parameter
 *   node scripts/hashPassword.js "meinPasswort"
 */
const readline = require('readline');
const path = require('path');

const { hashPassword } = require(path.join(__dirname, '..', 'backend', 'src', 'utils', 'password'));

function promptForPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl.question('Passwort eingeben: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const [, , argPassword] = process.argv;
  const password = argPassword || (await promptForPassword());

  if (!password) {
    console.error('Kein Passwort angegeben.');
    process.exit(1);
  }

  try {
    const hashed = hashPassword(password);
    console.log('Env-Wert (AUTH_PASSWORD_HASH):');
    console.log(hashed);
  } catch (err) {
    console.error('Hashing fehlgeschlagen:', err.message);
    process.exit(1);
  }
}

main();
