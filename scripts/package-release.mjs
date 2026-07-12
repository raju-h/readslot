import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, utimes, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const releaseDir = process.env.LYDRA_RELEASE_DIR
  ? resolve(process.env.LYDRA_RELEASE_DIR)
  : resolve(root, "release");
const archive = resolve(releaseDir, `lydra-${pkg.version}.zip`);
await mkdir(releaseDir, { recursive: true });

const listFiles = async (directory, prefix = "") => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      files.push(...(await listFiles(resolve(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files.sort();
};

const files = await listFiles(resolve(root, "dist"));
const forbidden = files.filter(
  (file) =>
    /(^|\/)(\.env|\.git)(\/|$)|\.(?:map|pem|crx)$/iu.test(file) || /(?:test|fixture)/iu.test(file)
);
if (forbidden.length > 0) throw new Error(`Forbidden release files: ${forbidden.join(", ")}`);
if (!files.includes("manifest.json"))
  throw new Error("Release manifest is missing from archive root.");

const stableTime = new Date("1980-01-01T00:00:00.000Z");
for (const file of files) await utimes(resolve(root, "dist", file), stableTime, stableTime);
await unlink(archive).catch(() => undefined);

const result = spawnSync("zip", ["-X", archive, "-@"], {
  cwd: resolve(root, "dist"),
  input: `${files.join("\n")}\n`,
  stdio: ["pipe", "inherit", "inherit"]
});
if (result.status !== 0) throw new Error("Failed to create release archive.");

const digest = createHash("sha256")
  .update(await readFile(archive))
  .digest("hex");
await writeFile(`${archive}.sha256`, `${digest}  lydra-${pkg.version}.zip\n`);
const archiveSize = (await stat(archive)).size;
if (archiveSize > 5 * 1024 * 1024)
  throw new Error("Release archive exceeds the preferred 5 MB budget.");
console.log(`Created ${archive}`);
