#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(
  new URL(
    "../skills/continuous-corners/scripts/vendor/continuous-corners/",
    import.meta.url,
  ),
);
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
);
const upstream = process.argv[2];
if (process.argv.length > 3)
  throw Error(
    "Usage: node scripts/check-continuous-corners-vendor.mjs [UPSTREAM_DIRECTORY]",
  );
if (upstream) {
  const pkg = JSON.parse(
    await readFile(resolve(upstream, "package.json"), "utf8"),
  );
  if (pkg.name !== manifest.package || pkg.version !== manifest.version)
    throw Error("Upstream package/version mismatch");
}
for (const [name, info] of Object.entries(manifest.files)) {
  const bytes = await readFile(resolve(root, name));
  if (createHash("sha256").update(bytes).digest("hex") !== info.sha256)
    throw Error(`Vendor hash mismatch: ${name}`);
  if (upstream && !bytes.equals(await readFile(resolve(upstream, info.source))))
    throw Error(`Upstream content mismatch: ${name}`);
}
console.log(
  `Verified ${manifest.package}@${manifest.version}: ${Object.keys(manifest.files).length} files${upstream ? " and upstream source" : ""}`,
);
