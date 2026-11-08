# Bundled generator

Requires Node.js 22+. The skill carries its own fixed runtime, so installing the skill folder is sufficient. No npm package has to be fetched. In the examples below, `SKILL_DIR` denotes the absolute directory containing this skill's `SKILL.md`; resolve it from the installed skill location, not the user's project or a hardcoded home path.

```sh
node "$SKILL_DIR/scripts/generate.mjs" --help
node "$SKILL_DIR/scripts/generate.mjs" --width 132 --height 208 --extent 28 --output phone-body.svg
node "$SKILL_DIR/scripts/generate.mjs" --width 132 --height 208 --extent 28 --format path
node "$SKILL_DIR/scripts/generate.mjs" --width 132 --height 208 --extent 28 --format json --output phone-body.json
```

Choose a task-owned output location. `--output` creates a new file exclusively and refuses to overwrite an existing file. Use a fresh candidate name when iterating; make any authorized replacement separately after inspection. Parent directories must already exist. Without `--output`, content goes to stdout; diagnostics and clamp notices go to stderr. Shell redirection can overwrite files independently of the tool, so prefer `--output` for candidates.

| Option | Meaning |
| --- | --- |
| `--width`, `--height` | Required finite drawing-unit dimensions, each in `[1e-6, 1e6]` |
| `--extent` | Required finite nonnegative corner footprint; capped at half the shorter side |
| `--format` | `svg` (default), `path`, or `json` |
| `--fill` | SVG only: `currentColor` (default), `none`, or a 3/4/6/8-digit hex color |
| `--output` | New output file; omit to print to stdout |
| `--help` | Print usage |

Unknown or duplicate options, missing values, unsupported formats, and invalid numbers fail with a nonzero exit status before writing a file. A positive effective extent must be at least one ten-thousandth of the longer side. Zero emits a sharp rectangle. The precision guard applies after capping; very elongated rectangles may only allow zero. Do not silently snap invalid inputs to a different shape.

SVG output is a transparent, filled silhouette with a matching viewBox and one path. It includes JSON metadata containing profile id, profile version, dimensions, requested/effective extent, and continuity. It does not add phone details, layout, strokes, masks, or a logo concept. Compose those elements to satisfy the brief. `currentColor` follows the rendering context; use an explicit hex fill when the exported asset needs a fixed color.

Path output is only the SVG `d` value. JSON output contains geometry commands, `svgPath`, profile metadata, and the requested/effective extent. Use it to compose paths without discarding regeneration information. All three formats use the same coordinates.

Example integration into a larger SVG:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <!-- profile: superellipse-balanced-v1; width:132; height:208; extent:28 -->
  <g transform="translate(54 16)">
    <!-- Insert the generated path here; retain its full coordinate precision. -->
  </g>
</svg>
```

For Canvas, the vendored ESM also exports `createContinuousRect`, `appendToPath`, and `toSVGPath`. `appendToPath` appends without beginning, filling, clearing, or transforming the caller's path. Call `beginPath()` yourself if needed. Read [geometry](geometry.md) before adopting it as a production project's shape dependency.
