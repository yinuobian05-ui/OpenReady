# Synthetic AI pre-beta evaluation

Date: 2026-08-11

This is an internal, synthetic evaluation of OpenReady v0.1.0. It is not a record of human beta testing. No AI role below is a user, friend, testimonial, download, star, public issue, or usage metric. Real beta runs remain at zero.

## Roles and scope

Three independent review roles examined the local release candidate:

1. **First-time CLI user simulation** — followed the quick-start and evaluated whether text output, JSON output, severities, and exit codes were understandable.
2. **Automation integrator simulation** — reviewed the executable contract, deterministic JSON, package metadata, dependency surface, and shell-facing exit behavior.
3. **Adversarial privacy reviewer** — generated clearly fictional paths and content to look for disclosure, false-positive, false-negative, Git-index, ignore, and symlink failures.

All repositories and values used by these roles were temporary synthetic fixtures. No private repository or real credential was supplied to them.

## Findings acted on

| Observation | Resolution | Evidence |
| --- | --- | --- |
| A credential- or email-shaped value in a filename could appear in a finding path. | Displayed paths now redact those shapes before text or JSON formatting. | CLI regression asserts that neither standard stream contains either synthetic sentinel. |
| Backup names such as `README.old` could satisfy a governance presence check. | Governance recognition now accepts explicit document-name and extension forms instead of loose prefixes. | Rule regression keeps backup-only repositories in the missing-governance state. |
| Short ordinary code variables named `token` could be treated as credentials. | Exact generic keys now require stronger value characteristics; explicit credential key families remain covered. | Negative parser-variable and positive secret-assignment regressions both pass. |
| A JSON-style secret value beginning on the next line was missed. | Bounded content scanning now checks adjacent key and value lines without retaining either value. | Multiline JSON/YAML-style regression reports only the key line. |
| The CLI version was duplicated in source and package metadata without a consistency assertion. | The test suite now compares `openready --version` with `package.json`. | Version synchronization regression passes. |

## Usability notes retained

- A finding count is not a file count: one file may trigger more than one rule.
- Hidden Git-author values need a documented local review command.
- A governance filename check confirms presence, not legal validity or suitability.
- `WARNING` and `INFO` do not change the success exit code; JSON consumers must inspect findings when those levels matter.
- Runtime measurements from automated fixtures are not evidence that a first-time human can finish in five minutes.
- Source-checkout and globally installed command forms must remain visibly separate so a first-time user does not copy a command that is not installed.

These points are now explained in the README or retained as limits. They should be checked again with real participants.

## Verification status

After the changes:

- `npm test` completed 49 tests: 48 passed, 0 failed, and 1 platform-dependent non-UTF-8 filename test was skipped because the current macOS filesystem rejected creation of that filename.
- The same suite produced the same result under Node.js 20.20.2.
- `npm pack --dry-run --ignore-scripts --json` listed exactly 21 allowlisted files; the CLI entry retained executable mode `0755`.
- The generated tarball installed without lifecycle scripts into a temporary consumer project. Its installed entry reported version `0.1.0` and successfully scanned the source project.
- Two consecutive JSON self-scans were byte-identical and returned `READY` with no blockers.

Temporary packages, installation files, and synthetic repositories were removed after verification.

## Reproduction commands

Run these from the repository root with Node.js 20 or newer active:

```sh
node --version
npm test
npm pack --dry-run --ignore-scripts --json
mkdir -p test/.tmp
node ./bin/openready.js scan . --json
node ./bin/openready.js scan . --json > test/.tmp/self-1.json
node ./bin/openready.js scan . --json > test/.tmp/self-2.json
cmp test/.tmp/self-1.json test/.tmp/self-2.json
```

The test suite includes a byte-for-byte repeated JSON scan. To repeat the temporary package-consumer check manually:

```sh
mkdir -p test/.tmp/pre-beta-consumer
npm pack --ignore-scripts --pack-destination test/.tmp/pre-beta-consumer
cd test/.tmp/pre-beta-consumer
npm init --yes
npm install --ignore-scripts --no-audit --no-fund --no-save ./openready-0.1.0.tgz
node ./node_modules/openready/bin/openready.js --version
node ./node_modules/openready/bin/openready.js scan ../../.. --json
```

After returning to the repository root, delete only `test/.tmp/pre-beta-consumer`, `test/.tmp/self-1.json`, and `test/.tmp/self-2.json`. These generated artifacts are disposable and are not part of the release package.

## Allowed claim

> OpenReady has undergone synthetic adversarial and automation pre-beta checks, and the resulting defects have regression tests.

## Claims that are not allowed yet

- “Beta tested by three users”
- “Validated by developers”
- “First scan completed in under five minutes”
- Any claim about users, downloads, stars, testimonials, public issues, adoption, or production reliability

Those statements require real, recorded evidence under [the beta testing plan](../beta-testing.md).
