import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");
const distAssets = resolve(distDir, "assets");

function fail(message) {
  console.error(`check:bundle FAILED - ${message}`);
  process.exit(1);
}

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

if (!existsSync(distAssets)) {
  fail("dist/assets not found. Run npm run build first.");
}

const pluginFiles = readdirSync(distAssets).filter(
  (file) => file.startsWith("plugin-") && file.endsWith(".js")
);

if (pluginFiles.length === 0) {
  fail("no plugin-*.js found in dist/assets.");
}

const pluginBundlePath = resolve(distAssets, pluginFiles[0]);
const pluginBundle = readFileSync(pluginBundlePath, "utf8");

const blockedDevSymbols = [
  "synthetic-marketplace-tenant",
  "synthetic-demo-firm",
  "Alex Testington",
  "cl_synthetic_001",
];

const devHits = blockedDevSymbols.filter((symbol) => pluginBundle.includes(symbol));
if (devHits.length > 0) {
  fail(`dev symbol(s) found in ${pluginFiles[0]}:\n  ${devHits.join("\n  ")}`);
}

const blockedExternalHosts = [
  `react${"."}dev`,
  `reactrouter${"."}com`,
  `tailwindcss${"."}com`,
];

const externalHits = [];
for (const file of walkFiles(distDir)) {
  if (!statSync(file).isFile()) continue;
  const content = readFileSync(file, "utf8");
  for (const host of blockedExternalHosts) {
    if (content.includes(host)) {
      externalHits.push(`${file}: ${host}`);
    }
  }
}

if (externalHits.length > 0) {
  fail(`blocked external host reference(s) found:\n  ${externalHits.join("\n  ")}`);
}

if (/import\([^"'`]/.test(pluginBundle)) {
  fail(`non-literal dynamic import expression found in ${pluginFiles[0]}`);
}

for (const sourceFile of ["src/lib/pxApi.ts", "src/lib/store.ts"]) {
  const content = readFileSync(resolve(repoRoot, sourceFile), "utf8");
  if (!content.includes("authenticatedFetch")) {
    fail(`${sourceFile} does not use ShellRuntimeContext.authenticatedFetch`);
  }
}

const provenancePath = resolve(distDir, "plannerxchange.build-provenance.json");
if (!existsSync(provenancePath)) {
  fail("dist/plannerxchange.build-provenance.json is missing.");
}

const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
for (const field of [
  "sourceInputDigest",
  "aggregateArtifactDigest",
  "buildCommand",
  "lockfileDigests",
]) {
  if (!provenance[field]) {
    fail(`build provenance is missing ${field}.`);
  }
}

console.log(`check:bundle passed - ${pluginFiles[0]} is publish-review clean`);
