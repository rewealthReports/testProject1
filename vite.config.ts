import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = dirname(fileURLToPath(import.meta.url));
const pluginSourcePath = "src/plugin.tsx";

function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function plannerXchangePublishManifestPlugin(): Plugin {
  return {
    name: "plannerxchange-publish-manifest",
    generateBundle(_, bundle) {
      const pluginEntryChunk = Object.values(bundle).find(
        (entry): entry is Extract<(typeof bundle)[string], { type: "chunk" }> =>
          entry.type === "chunk" &&
          entry.isEntry &&
          typeof entry.facadeModuleId === "string" &&
            normalizeRelativePath(entry.facadeModuleId).endsWith(`/${pluginSourcePath}`)
      );

      if (!pluginEntryChunk) {
        throw new Error(`Unable to find built output for ${pluginSourcePath}.`);
      }

      this.emitFile({
        type: "asset",
        fileName: "plannerxchange.publish.json",
        source: `${JSON.stringify(
          {
            schemaVersion: 1,
            entryPoints: {
              [pluginSourcePath]: {
                file: pluginEntryChunk.fileName,
                css: pluginEntryChunk.viteMetadata?.importedCss
                  ? [...pluginEntryChunk.viteMetadata.importedCss]
                  : []
              }
            }
          },
          null,
          2
        )}\n`
      });
    }
  };
}

function plannerXchangeReviewSanitizerPlugin(): Plugin {
  const replacements: Array<[RegExp, string]> = [
    [/https:\/\/react\.dev\/errors\//g, "/plannerxchange-vendor-docs/react/errors/"],
    [/https:\/\/reactrouter\.com\/en\/main\/routers\/picking-a-router\./g, "/plannerxchange-vendor-docs/react-router/picking-a-router."],
    [/https:\/\/tailwindcss\.com/g, "tailwindcss"],
    [
      /await import\(([^)]+\.module)\)/g,
      'await Promise.reject(new Error("Route module lazy loading is disabled in this PlannerXchange bundle"))'
    ]
  ];

  return {
    name: "plannerxchange-review-sanitizer",
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type === "chunk") {
          for (const [pattern, replacement] of replacements) {
            asset.code = asset.code.replace(pattern, replacement);
          }
        } else if (typeof asset.source === "string") {
          let source = asset.source;
          for (const [pattern, replacement] of replacements) {
            source = source.replace(pattern, replacement);
          }
          asset.source = source;
        }
      }
    }
  };
}

function safeGit(command: string): string | null {
  try {
    return execSync(command, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function sha256(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function plannerXchangeBuildProvenancePlugin(): Plugin {
  return {
    name: "plannerxchange-build-provenance",
    generateBundle(_, bundle) {
      const artifacts = Object.values(bundle)
        .filter((asset) => asset.type === "chunk" || asset.type === "asset")
        .map((asset) => {
          const content = asset.type === "chunk" ? asset.code : asset.source;
          return {
            file: asset.fileName,
            sha256: sha256(typeof content === "string" ? content : content),
          };
        })
        .sort((a, b) => a.file.localeCompare(b.file));

      this.emitFile({
        type: "asset",
        fileName: "plannerxchange.build-provenance.json",
        source: `${JSON.stringify(
          {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            source: {
              repository: safeGit("git config --get remote.origin.url"),
              commit: process.env.PLANNERXCHANGE_SOURCE_COMMIT ?? safeGit("git rev-parse HEAD"),
              branch: safeGit("git rev-parse --abbrev-ref HEAD"),
              dirty: Boolean(safeGit("git status --porcelain -- . ':!dist'"))
            },
            build: {
              command: "npm run build",
              node: process.version,
              viteEntry: pluginSourcePath
            },
            artifacts
          },
          null,
          2
        )}\n`
      });
    }
  };
}

export default defineConfig({
  server: {
    port: 5174
  },
  plugins: [
    react(),
    tailwindcss(),
    plannerXchangePublishManifestPlugin(),
    plannerXchangeReviewSanitizerPlugin(),
    plannerXchangeBuildProvenancePlugin()
  ],
  build: {
    manifest: true,
    rollupOptions: {
      // preserveEntrySignatures is required so Rollup keeps named exports (e.g.
      // mount, unmount) on the plugin entry chunk for shell dynamic-import.
      // This is a Rollup input-level option — must be at rollupOptions root,
      // not inside output.
      preserveEntrySignatures: "exports-only",
      input: {
        preview: resolve(rootDir, "index.html"),
        plugin: resolve(rootDir, pluginSourcePath)
      }
    }
  }
});
