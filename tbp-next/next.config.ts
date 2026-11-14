import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Content sits beside this app in the repo (../content); a standalone checkout
// keeps it in a sibling tbp-website folder. CONTENT_DIR overrides both.
const contentDir =
  process.env.CONTENT_DIR ||
  [path.resolve(__dirname, "../content"), path.resolve(__dirname, "../tbp-website/content")].find(
    (dir) => fs.existsSync(dir),
  );
if (!contentDir) throw new Error("content directory not found; set CONTENT_DIR");

const nextConfig: NextConfig = {
  // The site is hosted on GitHub Pages, so it is built as plain static files in out/.
  output: "export",
  images: { unoptimized: true },
  // The repo root has its own lockfile (Quartz); this app is the project root.
  outputFileTracingRoot: __dirname,
  env: { CONTENT_DIR: contentDir },
};

export default nextConfig;
