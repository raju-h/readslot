import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const release = process.argv.includes("--release");
const manifestPath = resolve(root, "dist/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3");
if (manifest.name !== "ReadSlot") errors.push("extension name must be ReadSlot");
if (manifest.permissions?.includes("tabs")) errors.push("broad tabs permission is forbidden");
if (manifest.host_permissions?.includes("<all_urls>")) errors.push("<all_urls> is forbidden");
if (manifest.content_security_policy?.extension_pages.includes("unsafe-eval"))
  errors.push("unsafe-eval is forbidden");
if (release && !manifest.oauth2?.client_id)
  errors.push("release manifest requires an OAuth client ID");
if (
  manifest.oauth2?.client_id &&
  !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/u.test(manifest.oauth2.client_id)
)
  errors.push("OAuth client ID has an invalid format");

for (const file of [
  "background.js",
  "content.js",
  "queue.html",
  "planner.html",
  "session.html",
  "options.html"
]) {
  try {
    await access(resolve(root, "dist", file));
  } catch {
    errors.push(`missing build artifact: ${file}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Manifest and extension artifacts are valid.");
}
