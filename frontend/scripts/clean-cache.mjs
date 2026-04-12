/**
 * Remove Next.js output and webpack caches so dev/server chunks cannot reference stale files.
 * Safe to run anytime (no-op if folders are missing).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function rm(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("removed:", path.relative(root, dir) || ".");
  } catch {
    /* ignore */
  }
}

rm(path.join(root, ".next"));
rm(path.join(root, "node_modules", ".cache"));
