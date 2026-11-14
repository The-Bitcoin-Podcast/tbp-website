#!/usr/bin/env node
/**
 * Finish the static export in out/ for GitHub Pages.
 *
 * - Copies ../quartz/static to out/static, so the standalone report and
 *   dashboard pages that content links to (/static/reports/…) keep working.
 * - Adds .nojekyll so Pages serves the _next/ folder as is.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out");
if (!fs.existsSync(OUT_DIR)) throw new Error("out/ not found; run next build first");

const staticDirs = [
  path.resolve(ROOT, "..", "quartz", "static"),
  path.resolve(ROOT, "..", "tbp-website", "quartz", "static"),
];
const staticDir = staticDirs.find((dir) => fs.existsSync(dir));
if (staticDir) {
  fs.cpSync(staticDir, path.join(OUT_DIR, "static"), { recursive: true });
  console.log(`Copied ${path.relative(ROOT, staticDir)} to out/static`);
} else {
  console.warn("No quartz/static folder found; /static/ links will 404");
}

fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");
