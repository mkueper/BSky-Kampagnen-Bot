// Ensure Node resolves our runtime aliases during Vitest runs
try {
  require('module-alias/register');
} catch {
  // alias module optional in CI; vitest resolve aliases may cover ESM imports
}
