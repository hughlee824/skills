# Geometry and scope

The bundled `superellipse-balanced-v1` profile is experimental. It is derived from `@hughlee824/continuous-corners` 0.1.0, whose first distribution is local and unpublished. This skill vendors the runtime; users do not need that package or its repository. The vendor manifest identifies source files by SHA-256 and retains their MIT license. The skill's own instructions and wrapper use the repository's Apache-2.0 license.

## Reference versus export

The canonical local corner goes from `(0, 0)` with a horizontal tangent to `(1, 1)` with a vertical tangent:

```text
x^n + (1 - y)^n = 1
n = -ln(2) / ln(0.8) ≈ 3.1062837195
midpoint = (0.8, 0.2)
```

It is scaled uniformly into a square footprint, then rotated for each corner. Changing rectangle aspect ratio changes straight-edge lengths rather than stretching the corner. `extent` is the footprint along each edge; it is not the radius of a circle and has no automatic equivalence to Apple's or Figma's radius parameter.

The analytical reference meets straight edges with G3 behavior. The portable export uses 16 cubic Bézier spans per corner (64 per rounded rectangle), constrained to match endpoint position, tangent direction, and curvature. Floating-point and serialization residuals remain: numerical G2 checks are not exact G3 output or an interval-certified proof. More segments do not by themselves establish better visual quality or runtime performance.

The frozen normalized profile budgets are:

- position residual / extent: `1e-5`;
- curvature residual × extent: `1e-4`;
- half-corner curvature backtracking: `1e-8`.

Position and curvature compare the cubic to the analytical reference at matching x, with the second half reflected to keep the reference slope bounded. These are numerical verification budgets, not certified global Hausdorff bounds. Small residual curvature reversals can remain. Runtime inputs use a conservative minimum positive extent of `max(width, height) / 10000` to limit cancellation when placing control points. Uniform rescaling does not fix an invalid ratio.

At maximum extent, straight segments on the shorter side collapse to zero length. Adjacent corners meet with matching direction and zero endpoint curvature; this is not necessarily a circular capsule. Zero extent deliberately produces a sharp rectangle.

## Select by required behavior

- **New SVG/device silhouettes:** the bundled generator offers a reproducible candidate; judge its character and proportions in the final composition.
- **Existing brand:** preserve the authorized silhouette. Improving corner mathematics does not authorize changing identity.
- **Apple native UI:** use the target platform's continuous-corner API when native behavior is the goal. The bundled profile is not an Apple specification or exact match.
- **Figma-matched UI:** use the project's chosen Figma-compatible implementation and check the match. A similar-looking local superellipse is not a guarantee of parity.
- **Web/Android UI:** native or established component facilities may better handle border, clipping, shadows, interaction, and animation. Check current project/platform support rather than assuming an SVG path is a drop-in component.

Uniform transforms preserve the intended local profile. Nonuniform transforms change its shape and display-space curvature, so the normalized profile measurements are no longer a direct display-space budget. Inner/outer contour offsets and strokes need separate inspection. This generator does not implement arbitrary polygons, independent per-corner profiles, exact offset curves, or curve morphing.

Do not label a result "Apple exact", "Figma exact", "perfectly monotone", or "G3 SVG" based on this generator.
