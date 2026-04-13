/**
 * check-bundle.mjs — run after `npm run build` to assert no dev-only symbols
 * appear in the published plugin bundle.
 *
 * Run:  npm run check:bundle
 *
 * This script is the verifiable control backing the PRODUCTION BUILD EXCLUSION
 * claim in src/lib/pxApi.ts. It fails with a non-zero exit code if any of the
 * BLOCKED symbols are found, making it suitable as a CI gate.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distAssets = resolve(__dirname, "../dist/assets");

// Locate the plugin bundle (named plugin-<hash>.js by Vite).
let pluginFiles;
try {
  pluginFiles = readdirSync(distAssets).filter(
    (f) => f.startsWith("plugin-") && f.endsWith(".js")
  );
} catch {
  console.error("check:bundle FAILED — dist/assets not found. Run `npm run build` first.");
  process.exit(1);
}

if (pluginFiles.length === 0) {
  console.error("check:bundle FAILED — no plugin-*.js found in dist/assets. Run `npm run build` first.");
  process.exit(1);
}

const bundlePath = resolve(distAssets, pluginFiles[0]);
const content = readFileSync(bundlePath, "utf8");

/**
 * String values that must not appear in the published plugin bundle.
 * These are unique to dev-only source files; their presence would indicate
 * that tree-shaking failed to exclude a dev-only module.
 *
 * NOTE: "synthetic-installation-context" and "synthetic-dev-token" are
 * intentionally NOT listed here — they appear in isShellHosted() / isLive()
 * as comparison sentinels and are expected to be present in the plugin bundle.
 * The strings below only ever appear as data values inside dev-only files.
 */
const BLOCKED = [
  // dev-context.ts — tenantId/firmId values unique to the mock context object
  "synthetic-marketplace-tenant",
  "synthetic-demo-firm",
  // pxApi.ts MOCK_CLIENTS_SENSITIVE — fixture client data never used in live paths
  "Alex Testington",
  "cl_synthetic_001",
];

const hits = BLOCKED.filter((sym) => content.includes(sym));

if (hits.length > 0) {
  console.error(
    `check:bundle FAILED — dev symbol(s) found in ${pluginFiles[0]}:\n  ${hits.join("\n  ")}`
  );
  process.exit(1);
}

console.log(`check:bundle passed — no dev symbols found in ${pluginFiles[0]}`);
