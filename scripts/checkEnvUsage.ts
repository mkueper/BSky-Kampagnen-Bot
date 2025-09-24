import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = process.cwd();
const BAD_PATTERNS = [
  /process\.env\.BLUESKY_(SERVER|HANDLE|PASSWORD|IDENTIFIER|APP_PASSWORD)/,
  /config\.BLUESKY_SERVER/,
  /https?:\/\/bsky\.social["']/ // harte URL im Code
];

const ALLOWED_FILES = new Set([
  "src/env.js", // hier ist process.env erlaubt
]);

function walk(dir: string, files: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist" || name === "dist-scripts") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else {
      const ext = extname(name);
      if ([".ts", ".tsx", ".js", ".mjs", ".cjs"].includes(ext)) files.push(p);
    }
  }
  return files;
}

const files = walk(ROOT);
let errors = 0;

for (const file of files) {
  const rel = file.replace(ROOT + "/", "");
  const text = readFileSync(file, "utf8");
  for (const pat of BAD_PATTERNS) {
    if (pat.test(text) && !ALLOWED_FILES.has(rel)) {
      console.error(`❌ Verbotenes Muster in ${rel}: ${pat}`);
      errors++;
    }
  }
}

if (errors === 0) {
  console.log("✅ Alle Bluesky-Env-Verwendungen sind sauber (nur env-Helper).");
  process.exit(0);
} else {
  console.error(`\n${errors} Problem(e) gefunden. Bitte oben gelistete Stellen anpassen.`);
  process.exit(1);
}
