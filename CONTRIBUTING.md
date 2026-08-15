# Contributing to OpenReady

OpenReady should remain small, offline, predictable, and safe to run before a repository becomes public. Contributions are welcome when they strengthen that purpose without expanding the project into a hosted service or a general security platform.

## Development setup

Use Node.js 20 or newer and Git.

```sh
npm ci --ignore-scripts
npm test
node ./bin/openready.js scan . --json
```

There are no runtime or development dependencies. Do not add one when a clear Node.js standard-library implementation is maintainable.

## Architecture

- `bin/openready.js` is the executable entry point.
- `src/cli.js` owns argument parsing and exit codes.
- `src/scanner.js` coordinates a scan.
- `src/git.js` validates local Git metadata, enumerates candidates, scans bounded current-index blobs, and aggregates author metadata.
- `src/files.js` enforces filesystem and symlink boundaries.
- `src/rules.js` contains stable rule metadata and pure matching logic.
- `src/content-scanner.js` reads bounded text content without following links.
- `src/findings.js` enforces the allowed finding shape, de-duplication, and sorting.
- `src/formatters.js` renders the same safe findings as text or JSON.

## Adding or changing a rule

1. Give the rule a stable `OR-...` identifier.
2. Keep one severity and one fixed description for that identifier.
3. Never place a matched value, snippet, author identity, link target, hash, or absolute root in a finding.
4. Add a positive synthetic test and a realistic negative test.
5. Confirm text and JSON output do not contain the synthetic sentinel.
6. Document material scope or false-positive changes in `CHANGELOG.md`.

Rules should point a developer toward manual review; they must not claim that an offline pattern is a verified credential.

## Fixture safety

All fixtures must be obviously fictional and generated for the test that uses them. Never contribute:

- a real name, email, username, account ID, token, key, certificate, repository path, or machine path;
- a copied leak, production log, complete private key, database, or media file;
- content, naming, or structure taken from an unrelated private project.

Use reserved or clearly synthetic names and split detector-shaped strings in fixture source so OpenReady can scan its own repository without reporting the fixture generator. Temporary fixtures belong only in `test/.tmp` and must be cleaned after each test.

## Reporting a bug

Use the bug template and provide the smallest synthetic reproduction possible. Redact output before posting it even though OpenReady is designed not to print matched values. Do not upload a complete private repository, full logs, credentials, personal information, or Git history.

## Scope guardrails

The current scanner does not include accounts, a website, a GUI, cloud storage, remote scanning, credential verification, telemetry, AI, plugins, automatic history rewriting, or automatic publication. Proposals in those areas need a clear privacy and maintenance case before any implementation work begins.

Run the complete test suite, package dry-run, and self-scan before requesting review. A passing scan is evidence about implemented rules, not proof that publication is safe.
