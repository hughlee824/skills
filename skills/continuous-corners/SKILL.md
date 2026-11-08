---
name: continuous-corners
description: Consider and construct smooth corners when creating or refining SVG logos, app icons, device silhouettes, or prominent rounded UI shapes. Use for these design tasks even when the user does not mention curvature, and for explicit continuous-corner requests. Do not activate for color-only, text-only, export-only, or exact-preservation edits that do not authorize geometry changes.
license: Apache-2.0
---

# Continuous Corners

Bring an often-unspoken contour decision into the design process: should a prominent rounded silhouette use a gradual transition from straight edge to curved corner? Choose deliberately, construct reproducibly, and inspect the actual result.

## Decide within the brief

- Inspect the requested artifact, existing geometry, brand rules, and authorized changes. A phone silhouette or icon container is a candidate, not an instruction to round every shape.
- For new SVG logos, icons, and device silhouettes, consider continuous corners without requiring the user to know the term. When the choice is reversible and fits the brief, make a candidate and evaluate it; do not add a permission question for a routine design choice.
- Preserve established silhouettes and explicit shape constraints. A request to recolor, change text, resize an export, or reproduce an exact mark does not authorize replacing its corner geometry, even when this skill is loaded.
- Continuous corners are useful when their edge transition is visible and contributes to the intended character. Small details, deliberately circular arcs, angular marks, or an existing design system may warrant keeping the original geometry. Report the choice briefly when relevant; no mandatory essay or comparison sheet.

## Choose a representation

- For SVG and Canvas, use the bundled deterministic generator for the fixed experimental local-superellipse profile when it suits the design. Read [tool usage](references/usage.md) before running it. Resolve paths relative to this installed skill; no sibling checkout, npm installation, network request, or Python solver is required. Node.js 22+ is needed.
- For an existing native or web component, prefer the project's platform facilities or established shape implementation when they satisfy the brief. Preserve its layout, clipping, border, shadow, hit-testing, and accessibility behavior. The bundled tool generates geometry, not a complete UI component.
- If the task requires a Figma match, Apple's native behavior, a different profile, or per-corner control, do not present this fixed profile as equivalent. Read [geometry and limitations](references/geometry.md), then use an appropriate existing implementation or state the unresolved requirement.
- If execution is unavailable, explain that limitation and use an available suitable platform feature or leave the existing geometry intact. Do not replace a validated generator with guessed control points and label the result G2.

## Construct and integrate

Generate a standalone candidate, SVG path data, or JSON commands using `scripts/generate.mjs`. Reuse the generated coordinates; avoid shortening them with fixed-decimal rounding. Record the profile id, dimensions, and requested/effective extent in the editable source or a regeneration recipe.

`cornerExtent` is a corner's footprint along both edges, not an Apple/Figma radius or a curvature radius. Choose it visually for the intended proportions; do not mechanically reuse an unrelated radius value. The tool caps it at half the shorter side and reports clamping. It rejects tiny positive values that cannot meet the numerical policy.

Place local paths with transforms. Keep the intended proportions, optical weight, interior spacing, and composition. When adding a stroke, allow space outside the path bounds so the stroke is not clipped. A scaled inner contour is not necessarily a constant-width offset; inspect outlines rather than assuming equal visual thickness. Generate transparent SVG by default unless the brief calls for a background.

Do not replace an established logo or propagate assets to other projects unless that work is included in the user's request.

## Check the delivered artifact

- Read back the exact output. Check finite coordinates, a closed path, intended bounds/viewBox, correct fill or stroke, and transparency where requested. Verify that integration did not quantize or distort the generated geometry.
- Render with available tools and inspect at the intended display sizes, including a small size for icons. Check the edge transition, recognizability, stroke clipping, and spacing; zoomed-in smoothness alone is insufficient. For geometry refinements, compare with the starting artifact when available.
- The bundled profile has numerical G2 validation; this does not certify arbitrary edits, nonuniform transforms, or a whole logo as G2. Distinguish verified generator output from merely similar-looking curves. If rendering was unavailable, say which visual checks remain unverified.
- Deliver the requested artifact with a concise explanation of the contour choice and any meaningful limits. Do not add a background, extra variants, publication, or a redesign that the task does not need.
