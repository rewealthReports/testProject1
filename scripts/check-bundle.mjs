import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

function committedFile(path) {
  return execFileSync("git", ["show", `HEAD:${path}`], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function fileDigest(path, body) {
  const buffer = Buffer.from(body);
  return { path, sha256: sha256(buffer), sizeBytes: buffer.length };
}

function sortDigests(files) {
  return files
    .map((file) => ({ path: file.path, sha256: file.sha256, sizeBytes: file.sizeBytes }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function aggregateDigest(files) {
  const hash = createHash("sha256");
  for (const file of sortDigests(files)) {
    hash.update(file.path, "utf8");
    hash.update("\0", "utf8");
    hash.update(file.sha256, "utf8");
    hash.update("\0", "utf8");
    hash.update(String(file.sizeBytes), "utf8");
    hash.update("\n", "utf8");
  }
  return hash.digest("hex");
}

function isDependencyLockfilePath(filePath) {
  const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
  return ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb"].includes(fileName);
}

function isBuildInputPath(filePath) {
  const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
  if (
    filePath.startsWith("dist/") ||
    filePath.startsWith("node_modules/") ||
    filePath.startsWith(".git/") ||
    filePath.startsWith("build/") ||
    filePath.startsWith("coverage/")
  ) {
    return false;
  }
  return (
    filePath === "plannerxchange.app.json" ||
    filePath === "package.json" ||
    isDependencyLockfilePath(filePath) ||
    fileName === "index.html" ||
    fileName === "tsconfig.json" ||
    fileName.startsWith("vite.config.") ||
    filePath.startsWith("src/") ||
    filePath.startsWith("public/")
  );
}

function gitFiles() {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
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

const dynamicImportPattern = new RegExp("import\\([^\"'`]", "u");
if (dynamicImportPattern.test(pluginBundle)) {
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
  "dependencyLockfileDigests",
]) {
  if (!provenance[field]) {
    fail(`build provenance is missing ${field}.`);
  }
}

const trackedFiles = gitFiles();
const expectedSourceDigest = aggregateDigest(
  trackedFiles
    .filter(isBuildInputPath)
    .map((path) => fileDigest(path, committedFile(path)))
);
if (provenance.sourceInputDigest !== expectedSourceDigest) {
  fail("build provenance sourceInputDigest does not match committed source inputs.");
}

const expectedLockfiles = sortDigests(
  trackedFiles
    .filter(isDependencyLockfilePath)
    .map((path) => fileDigest(path, committedFile(path)))
);
if (JSON.stringify(provenance.dependencyLockfileDigests) !== JSON.stringify(expectedLockfiles)) {
  fail("build provenance dependencyLockfileDigests do not match committed lockfiles.");
}

console.log(`check:bundle passed - ${pluginFiles[0]} is publish-review clean`);
