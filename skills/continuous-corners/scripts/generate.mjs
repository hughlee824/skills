#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import {
  createContinuousRect,
  toSVGPath,
  PROFILE,
} from "./vendor/continuous-corners/index.mjs";

const help = `Generate a transparent SVG with numerically validated continuous corners.
Usage: node generate.mjs --width N --height N --extent N [options]
  --format svg|path|json   Output format (default: svg)
  --fill COLOR             SVG only: currentColor, none, or hex (default: currentColor)
  --output FILE            Create a new file; never overwrite (default: stdout)
  --help                   Show this help
Dimensions: 1e-6..1e6. Extent: nonnegative; capped at half the shorter side.
Positive effective extent must be >= longer side / 10000. Zero is sharp.
Profile: superellipse-balanced-v1, experimental. Not Apple/Figma-exact.
Requires Node.js 22+. No runtime dependencies or network access.
`;

function parse(args) {
  const values = {};
  const allowed = new Set([
    "width",
    "height",
    "extent",
    "format",
    "fill",
    "output",
  ]);
  for (let i = 0; i < args.length; i++) {
    const key = args[i].slice(2);
    if (!args[i].startsWith("--") || !allowed.has(key))
      throw Error(`Unknown option: ${args[i]}`);
    if (Object.hasOwn(values, key)) throw Error(`Duplicate option: --${key}`);
    if (i + 1 === args.length || args[i + 1].startsWith("--"))
      throw Error(`Missing value: --${key}`);
    values[key] = args[++i];
  }
  for (const key of ["width", "height", "extent"]) {
    if (!Object.hasOwn(values, key)) throw Error(`Required option: --${key}`);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(values[key]))
      throw Error(`--${key} must be a finite decimal number`);
    values[key] = Number(values[key]);
  }
  values.format ??= "svg";
  if (!["svg", "path", "json"].includes(values.format))
    throw Error("Format must be svg, path, or json");
  if (values.fill !== undefined && values.format !== "svg")
    throw Error("--fill is only available for SVG");
  values.fill ??= "currentColor";
  if (
    !/^(?:currentColor|none|#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8}))$/i.test(
      values.fill,
    )
  )
    throw Error("Fill must be currentColor, none, or a hex color");
  if (values.output === "") throw Error("Output path cannot be empty");
  return values;
}

try {
  if (process.argv.length === 3 && process.argv[2] === "--help") {
    process.stdout.write(help);
  } else {
    const options = parse(process.argv.slice(2));
    const shape = createContinuousRect({
      width: options.width,
      height: options.height,
      cornerExtent: options.extent,
    });
    const svgPath = toSVGPath(shape);
    const metadata = {
      generator: "continuous-corners-skill",
      libraryVersion: "0.1.0",
      profile: PROFILE.id,
      status: PROFILE.status,
      width: shape.width,
      height: shape.height,
      requestedExtent: shape.requestedExtent,
      effectiveExtent: shape.effectiveExtent,
      clamped: shape.clamped,
      continuity: shape.continuity,
    };
    const result =
      options.format === "path"
        ? svgPath + "\n"
        : options.format === "json"
          ? JSON.stringify(
              { ...metadata, commands: shape.commands, svgPath },
              null,
              2,
            ) + "\n"
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${shape.width} ${shape.height}" width="${shape.width}" height="${shape.height}">\n  <metadata>${JSON.stringify(metadata)}</metadata>\n  <path fill="${options.fill}" d="${svgPath}"/>\n</svg>\n`;
    if (options.output !== undefined)
      await writeFile(options.output, result, { flag: "wx" });
    else process.stdout.write(result);
    if (shape.clamped)
      process.stderr.write(
        `Extent capped from ${shape.requestedExtent} to ${shape.effectiveExtent}.\n`,
      );
  }
} catch (error) {
  process.stderr.write(`continuous-corners: ${error.message}\n`);
  process.exitCode = 1;
}
