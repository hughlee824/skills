import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  createContinuousRect,
  toSVGPath,
  sampleCorner,
  PROFILE,
} from "../skills/continuous-corners/scripts/vendor/continuous-corners/index.mjs";

const skill = fileURLToPath(
  new URL("../skills/continuous-corners/", import.meta.url),
);
const cli = join(skill, "scripts/generate.mjs");
const base = ["--width", "132", "--height", "208", "--extent", "28"];
const run = (args, script = cli) =>
  spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

test("standalone formats preserve one geometry, transparency, and regeneration metadata", () => {
  const json = run([...base, "--format", "json"]);
  assert.equal(json.status, 0, json.stderr);
  const data = JSON.parse(json.stdout);
  assert.equal(data.profile, "superellipse-balanced-v1");
  assert.equal(data.libraryVersion, "0.1.0");
  assert.equal(data.requestedExtent, 28);
  assert.equal(data.effectiveExtent, 28);
  const path = run([...base, "--format", "path"]);
  assert.equal(path.status, 0, path.stderr);
  assert.equal(path.stdout.trim(), data.svgPath);
  const svg = run([...base, "--fill", "#172554"]);
  assert.equal(svg.status, 0, svg.stderr);
  assert.equal(svg.stdout.match(/ d="([^"]+)"/)[1], data.svgPath);
  assert.ok(svg.stdout.includes('viewBox="0 0 132 208"'));
  assert.equal((svg.stdout.match(/<path\b/g) || []).length, 1);
  assert.ok(!/<rect\b|<image\b|<script\b|href=/.test(svg.stdout));
  const metadata = JSON.parse(
    svg.stdout.match(/<metadata>(.*?)<\/metadata>/)[1],
  );
  assert.equal(metadata.profile, data.profile);
  assert.equal(metadata.clamped, false);
});

test("CLI rejects ambiguous, malformed, and numerically unsupported requests", () => {
  const cases = [
    [],
    [...base, "--radius", "12"],
    [...base, "--width", "20"],
    [...base, "--format", "pdf"],
    [...base, "--format", "json", "--fill", "none"],
    [...base, "--fill", 'red" onload="alert(1)'],
    ["--width", "NaN", "--height", "100", "--extent", "20"],
    ["--width", "1e999", "--height", "100", "--extent", "20"],
    ["--width", "0", "--height", "100", "--extent", "20"],
    ["--width", "100", "--height", "100", "--extent", "-1"],
    ["--width", "100", "--height", "100", "--extent", "0.00001"],
    [...base, "--output"],
    ["--width", "1000000", "--height", "1", "--extent", "10000"],
  ];
  for (const args of cases) {
    const result = run(args);
    assert.notEqual(result.status, 0, args.join(" "));
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length);
  }
});

test("zero and maximum extent are explicit, with clamp diagnostics off stdout", () => {
  const zero = JSON.parse(
    run([
      "--width",
      "100",
      "--height",
      "50",
      "--extent",
      "0",
      "--format",
      "json",
    ]).stdout,
  );
  assert.equal(zero.continuity, "sharp");
  assert.equal(zero.commands.length, 5);
  const over = run([
    "--width",
    "100",
    "--height",
    "50",
    "--extent",
    "100",
    "--format",
    "json",
  ]);
  assert.equal(over.status, 0);
  assert.match(over.stderr, /capped/);
  const data = JSON.parse(over.stdout);
  assert.equal(data.effectiveExtent, 25);
  assert.equal(data.clamped, true);
  assert.equal(
    data.svgPath,
    toSVGPath(
      createContinuousRect({ width: 100, height: 50, cornerExtent: 25 }),
    ),
  );
});

test("copied skill works in isolation and output creation never overwrites an existing file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "continuous-corners-skill-"));
  try {
    const installed = join(dir, "installed-skill");
    await cp(skill, installed, { recursive: true });
    const output = join(dir, "shape.svg");
    const result = run(
      [...base, "--output", output],
      join(installed, "scripts/generate.mjs"),
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    const before = await readFile(output);
    const again = run(
      [...base, "--output", output],
      join(installed, "scripts/generate.mjs"),
    );
    assert.notEqual(again.status, 0);
    assert.deepEqual(await readFile(output), before);
    const sentinel = join(dir, "sentinel.svg");
    await writeFile(sentinel, "keep");
    assert.notEqual(
      run([...base, "--fill", "invalid", "--output", sentinel]).status,
      0,
    );
    assert.equal(await readFile(sentinel, "utf8"), "keep");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("vendor snapshot and frozen profile remain intact", async () => {
  const checker = fileURLToPath(
    new URL("../scripts/check-continuous-corners-vendor.mjs", import.meta.url),
  );
  const result = run([], checker);
  assert.equal(result.status, 0, result.stderr);
  const profile = (
    await import(
      "../skills/continuous-corners/scripts/vendor/continuous-corners/profile.mjs"
    )
  ).default;
  assert.equal(
    createHash("sha256").update(JSON.stringify(profile.segments)).digest("hex"),
    "b8665a72672429b6ea195f2cebcf6690c67e3e3d9117750b786060937007f688",
  );
  assert.equal(PROFILE.segmentsPerCorner, 16);
});

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
function end(points, last) {
  const p = last ? points : [...points].reverse();
  const v = sub(p[3], p[2]).map((x) => 3 * x),
    a = p[3].map((x, i) => 6 * (x - 2 * p[2][i] + p[1][i]));
  return {
    v: last ? v : v.map((x) => -x),
    k: Math.abs(cross(v, a)) / Math.hypot(...v) ** 3,
  };
}
test("exported joins are numerically G2 across aspect ratios, scales, caps, and the precision floor", () => {
  let cases = 0;
  for (const width of [1e-6, 0.01, 1, 1e3, 1e6])
    for (const aspect of [1, 8, 1000, 5000]) {
      const height = width / aspect;
      if (height < 1e-6) continue;
      for (const extent of [width / 10000, height * 0.4, height / 2, height]) {
        if (Math.min(extent, height / 2) < width / 10000) continue;
        const shape = createContinuousRect({
          width,
          height,
          cornerExtent: extent,
        });
        let cursor;
        const curves = [];
        for (const [kind, ...v] of shape.commands) {
          for (let i = 0; i < v.length; i += 2) {
            assert.ok(v[i] >= -width * 1e-12 && v[i] <= width * (1 + 1e-12));
            assert.ok(
              v[i + 1] >= -width * 1e-12 && v[i + 1] <= height + width * 1e-12,
            );
          }
          if (kind === "C") {
            const p = [cursor, v.slice(0, 2), v.slice(2, 4), v.slice(4, 6)];
            curves.push(p);
            cursor = p[3];
          } else if (kind !== "Z") cursor = v;
        }
        assert.equal(curves.length, 64);
        for (let i = 0; i < curves.length; i++) {
          const a = end(curves[i], true),
            b = end(curves[(i + 1) % curves.length], false);
          assert.ok(a.v[0] * b.v[0] + a.v[1] * b.v[1] > 0);
          assert.ok(
            Math.abs(cross(a.v, b.v)) /
              Math.hypot(...a.v) /
              Math.hypot(...b.v) <
              1e-7,
          );
          assert.ok(Math.abs(a.k - b.k) * shape.effectiveExtent < 1e-5);
          if ((i + 1) % 16 === 0) {
            assert.ok(a.k * shape.effectiveExtent < 1e-7);
            assert.ok(b.k * shape.effectiveExtent < 1e-7);
          }
        }
        cases++;
      }
    }
  assert.ok(cases >= 60);
});

test("analytical reference retains symmetry and its defining equation", () => {
  for (let i = 0; i <= 1000; i++) {
    const a = sampleCorner(i / 1000),
      b = sampleCorner(1 - i / 1000),
      [x, y] = a.point;
    assert.ok(
      Math.abs(x ** PROFILE.exponent + (1 - y) ** PROFILE.exponent - 1) < 2e-14,
    );
    assert.ok(Math.abs(x + b.point[1] - 1) < 2e-14);
    assert.ok(Math.abs(y + b.point[0] - 1) < 2e-14);
  }
});

test("published paired case preserves original SVGs and generator coordinates", async () => {
  const root = new URL(
    "../skills/continuous-corners/assets/pocket-case/",
    import.meta.url,
  );
  const record = JSON.parse(await readFile(new URL("case.json", root), "utf8"));
  for (const [name, hash] of Object.entries(record.artifactsSha256)) {
    const bytes = await readFile(new URL(name, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, name);
  }
  const before = await readFile(new URL("without-skill.svg", root), "utf8");
  assert.match(before, /<rect\b[^>]*id="body"[^>]*rx="30"/);
  const after = await readFile(new URL("with-skill.svg", root), "utf8");
  const metadata = JSON.parse(
    after.match(/<metadata(?:\s[^>]*)?>([\s\S]*?)<\/metadata>/)[1],
  );
  const body = after.match(/<path\b[^>]*id="body"[^>]*\bd="([^"]+)"/)[1];
  const expected = toSVGPath(
    createContinuousRect({
      width: metadata.width,
      height: metadata.height,
      cornerExtent: metadata.requestedExtent,
    }),
  );
  const tokens = (value) =>
    value.match(/[MLCZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g);
  assert.deepEqual(tokens(body), tokens(expected));
  assert.equal(metadata.profile, PROFILE.id);
  assert.equal(record.withSkill.extent, metadata.effectiveExtent);
});
