import generated from "./profile.mjs";

const controls = generated.segments.map((segment) =>
  Object.freeze(segment.map((point) => Object.freeze([...point]))),
);
Object.freeze(controls);

/** Frozen v1 profile; the geometry is not an Apple implementation contract. */
export const PROFILE = Object.freeze({
  id: generated.id,
  status: generated.status,
  model: generated.model,
  exponent: generated.exponent,
  diagonalInsetRatio: generated.diagonalInsetRatio,
  referenceContinuity: generated.referenceContinuity,
  exportContinuity: generated.exportContinuity,
  segmentsPerCorner: controls.length,
  limits: Object.freeze({ ...generated.limits }),
});

export const NUMERIC_LIMITS = Object.freeze({
  minDimension: 1e-6,
  maxDimension: 1e6,
  minExtentRatio: 1e-4,
});

function finiteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function dimension(value, name) {
  finiteNumber(value, name);
  if (
    value < NUMERIC_LIMITS.minDimension ||
    value > NUMERIC_LIMITS.maxDimension
  ) {
    throw new RangeError(`${name} must be between 1e-6 and 1e6 drawing units`);
  }
}

/**
 * Unit canonical corner; t is a piecewise x coordinate, NOT normalized arc length.
 * Curvature is dimensionless here; divide by cornerExtent for actual curvature.
 */
export function sampleCorner(t) {
  finiteNumber(t, "t");
  if (t < 0 || t > 1) throw new RangeError("t must be in [0, 1]");
  const reflected = t > 0.5;
  const x = 2 * (reflected ? 1 - t : t) * (1 - PROFILE.diagonalInsetRatio);
  const n = PROFILE.exponent;
  const y = -Math.expm1(Math.log1p(-(x ** n)) / n);
  const z = 1 - y;
  const tx = z ** (n - 1),
    ty = x ** (n - 1);
  const length = Math.hypot(tx, ty);
  const curvature =
    ((n - 1) * (x * z) ** (n - 2)) /
    (x ** (2 * n - 2) + z ** (2 * n - 2)) ** 1.5;
  return Object.freeze({
    point: Object.freeze(reflected ? [1 - y, 1 - x] : [x, y]),
    tangent: Object.freeze(
      reflected ? [ty / length, tx / length] : [tx / length, ty / length],
    ),
    curvature,
  });
}

/** Local coordinates only. Apply placement transforms in the renderer. */
export function createContinuousRect(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Expected {width, height, cornerExtent}");
  }
  for (const key of Object.keys(options)) {
    if (!["width", "height", "cornerExtent"].includes(key))
      throw new TypeError(`Unknown option: ${key}`);
  }
  const { width, height, cornerExtent } = options;
  dimension(width, "width");
  dimension(height, "height");
  finiteNumber(cornerExtent, "cornerExtent");
  if (cornerExtent < 0)
    throw new RangeError("cornerExtent must be nonnegative");
  const effectiveExtent = Math.min(cornerExtent, Math.min(width, height) / 2);
  // Division keeps the floor consistent with the short-side cap at aspect 5000.
  const numericalFloor =
    Math.max(width, height) / (1 / NUMERIC_LIMITS.minExtentRatio);
  if (effectiveExtent > 0 && effectiveExtent < numericalFloor) {
    throw new RangeError(
      "effective cornerExtent must be zero or at least 1e-4 times the longer side; increase the extent or use zero",
    );
  }
  const commands = [];
  if (effectiveExtent === 0) {
    commands.push(
      ["M", 0, 0],
      ["L", width, 0],
      ["L", width, height],
      ["L", 0, height],
      ["Z"],
    );
  } else {
    const p = effectiveExtent;
    const transform = [
      ([u, v]) => [width - p + p * u, p * v],
      ([u, v]) => [width - p * v, height - p + p * u],
      ([u, v]) => [p - p * u, height - p * v],
      ([u, v]) => [p * v, p - p * u],
    ];
    transform.forEach((map, corner) => {
      commands.push([corner === 0 ? "M" : "L", ...map(controls[0][0])]);
      for (const segment of controls)
        commands.push(["C", ...segment.slice(1).flatMap(map)]);
    });
    commands.push(["Z"]);
  }
  for (const command of commands) Object.freeze(command);
  return Object.freeze({
    width,
    height,
    requestedExtent: cornerExtent,
    effectiveExtent,
    clamped: cornerExtent > effectiveExtent,
    profile: PROFILE.id,
    continuity: effectiveExtent === 0 ? "sharp" : "G2",
    commands: Object.freeze(commands),
  });
}

/** Round-trip number strings avoid an additional fixed-decimal quantization. */
export function toSVGPath(rect) {
  return rect.commands
    .map(([kind, ...values]) => kind + values.join(" "))
    .join(" ");
}

/** Append to the caller's current path. Does not begin, fill, stroke, or clear it. */
export function appendToPath(context, rect) {
  for (const [kind, ...values] of rect.commands) {
    if (kind === "M") context.moveTo(...values);
    else if (kind === "L") context.lineTo(...values);
    else if (kind === "C") context.bezierCurveTo(...values);
    else context.closePath();
  }
}
