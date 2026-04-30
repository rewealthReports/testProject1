import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");
const provenancePath = resolve(distDir, "plannerxchange.build-provenance.json");

const sourceRoots = ["src", "scripts"];
const sourceFiles = [
  "index.html",
  "package.json",
  "package-lock.json",
  "plannerxchange.app.json",
  "tsconfig.json",
  "vite.config.ts",
];
const lockfiles = ["package-lock.json"];

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function git(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function digestFile(path) {
  return {
    file: relative(repoRoot, path).replace(/\\/g, "/"),
    sha256: sha256(readFileSync(path)),
  };
}

function aggregateDigest(entries) {
  return sha256(JSON.stringify(entries.map(({ file, sha256 }) => ({ file, sha256 }))));
}

if (!existsSync(distDir)) {
  console.error("finalize-provenance FAILED - dist not found. Run npm run build first.");
  process.exit(1);
}

const sourceInputDigests = [
  ...sourceRoots.flatMap((root) => {
    const fullPath = resolve(repoRoot, root);
    return existsSync(fullPath) ? walkFiles(fullPath) : [];
  }),
  ...sourceFiles.map((file) => resolve(repoRoot, file)).filter(existsSync),
]
  .filter((file) => statSync(file).isFile())
  .map(digestFile)
  .sort((a, b) => a.file.localeCompare(b.file));

const lockfileDigests = lockfiles
  .map((file) => resolve(repoRoot, file))
  .filter(existsSync)
  .map(digestFile)
  .sort((a, b) => a.file.localeCompare(b.file));

const artifactDigests = walkFiles(distDir)
  .filter((file) => statSync(file).isFile())
  .filter((file) => resolve(file) !== provenancePath)
  .map(digestFile)
  .sort((a, b) => a.file.localeCompare(b.file));

const buildCommand = "npm run build";

const provenance = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repository: git("git config --get remote.origin.url"),
  commit: git("git rev-parse HEAD"),
  branch: git("git rev-parse --abbrev-ref HEAD"),
  sourceInputDigest: aggregateDigest(sourceInputDigests),
  sourceInputDigests,
  lockfileDigests,
  dependencyLockfileDigests: lockfileDigests,
  buildCommand,
  buildCommandEvidence: {
    packageManager: "npm",
    script: "build",
    commandLine: buildCommand,
    postbuild: "node scripts/finalize-provenance.mjs && node scripts/check-bundle.mjs",
  },
  node: process.version,
  viteEntry: "src/plugin.tsx",
  aggregateArtifactDigest: aggregateDigest(artifactDigests),
  artifactDigests,
};

writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`finalize-provenance wrote ${relative(repoRoot, provenancePath).replace(/\\/g, "/")}`);
