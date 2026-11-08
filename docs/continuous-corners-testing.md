# Continuous Corners verification

The skill makes a design decision and calls a deterministic tool. Test these separately: valid paths do not prove correct activation, and a persuasive agent reply does not prove valid geometry.

## Generator and package integrity

Requires Node.js 22+; no npm install is needed for these checks:

```sh
node --test tests/continuous-corners.test.mjs
node scripts/check-continuous-corners-vendor.mjs
```

The suite checks consistent SVG/path/JSON geometry, transparent output, regeneration metadata, malformed-input rejection, precision limits, zero/capped extents, no-overwrite behavior, a copied standalone installation, frozen profile integrity, reference symmetry, and numerical joins over scales/aspect ratios. Tests are assertions about artifacts and geometry, not the wording of the skill.

The vendor checker verifies SHA-256 hashes of the bundled runtime and license. Maintainers with the source library can also check exact correspondence:

```sh
node scripts/check-continuous-corners-vendor.mjs /path/to/continuous-corners
```

The optional directory is for maintenance only, never a user/runtime dependency. Before updating the snapshot, verify the upstream package name/version, copy its runtime and license unchanged, and record the new file hashes in the manifest. A shape change requires a new profile id and matching frozen-profile test; do not silence a checksum failure without reviewing the source change. Keep the wrapper's reported library version, manifest, and attribution aligned. The library's Python verifier remains the source of its dense numerical error analysis; this skill does not ship a Python solver.

## Discovery and installation

From the repository root:

```sh
npx skills add . --list
claude plugin validate . --strict
```

For each trial, create a separate disposable project and install only this skill there:

```sh
# From the disposable project; use the actual repository path.
npx skills add /path/to/skills --skill continuous-corners -a codex -y --copy
# Or, in a separate project for Claude Code:
npx skills add /path/to/skills --skill continuous-corners -a claude-code -y --copy
```

Keep this project-scoped: do not add `-g` or alter the evaluator's global skills/configuration. Check the installed files before starting a fresh agent session. Installing into a project does not retroactively update every already-running agent's discovery catalog.

## Behavioral cases

Prompts and expectations live in [continuous-corners-cases.json](../tests/continuous-corners-cases.json). The fixture is a synthetic phone drawing, not a production logo.

Run each case in a fresh context. Give the evaluator the raw prompt, installed skill catalog/location, and the fixture where needed. Do not provide the expected answer or point out the desired corner choice. Keep all writes inside the disposable project. No network, publication, or changes to real brand assets are needed.

- **Positive:** a phone-themed SVG request that does not mention continuous corners. Inspect whether the agent selected the skill, considered the contour, executed the generator if using this profile, and delivered an editable transparent SVG. Inspect the actual path and render it at its intended size and at 32 px. A task-specific reason to choose another representation should be evaluated on its merits.
- **Negative:** a color-only edit with an explicit geometry-preservation requirement. The result must equal the input fixture with only `#172554` replaced by `#2563eb`. Check every byte, not merely the bounding box or screenshot. No geometry generator or extra design assets are needed.
- **Loaded negative:** explicitly invoke the skill while asking for the same color-only edit. The output must still be exactly the requested color replacement. This checks scope discipline even if selection is overly broad.

Inspect tool traces as well as outputs. A copied-in path can pass geometric checks without proving the agent discovered or used the skill. Conversely, claiming to use continuous corners does not prove the path came from the tool.

A controlled independent-agent test that receives the installed catalog is useful for instruction quality, but is not proof of a host's automatic skill-discovery mechanism. Report separately: installer discovery, marketplace validation, controlled behavioral trials, and any actual fresh-host automatic-selection trial. A single positive trial is not a trigger-success-rate benchmark.

## Curated same-prompt case

The [skill README](../skills/continuous-corners/README.md) includes one actual paired Codex run. Its original SVGs, rendered comparison, and sanitized manifest live in `skills/continuous-corners/assets/pocket-case/`. The Node suite checks their file hashes and the generated body path. These assets illustrate observed behavior; they do not establish a trigger rate or isolate corner geometry from independent design choices.

## Record evidence

Keep prompts, tool traces, generated SVGs, renders, and outcomes in ignored `.local/`. Record the tested source revision or file hashes, model/host where available, commands, actual versus expected behavior, skipped checks, and whether selection was explicit, catalog-assisted, or host-automatic. Do not commit personal paths or raw agent transcripts. Curated demonstration artifacts may be published with explicit provenance and limitations, as in the paired case above.

When modifying a skill boundary, rerun both positive and negative cases. When modifying the generator, rerun the Node suite and inspect rendered artifacts. Existing logos are outside the test fixture scope.
