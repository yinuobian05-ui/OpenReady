# Changelog

All notable changes to OpenReady will be documented in this file.

The format follows Keep a Changelog principles, and this project uses Semantic Versioning.

## [Unreleased]

### Changed

- Added a privacy-safe feedback link and one-line response format after text scans. JSON output remains unchanged, and the CLI still makes no network requests.

## [0.1.1] - 2026-08-11

### Changed

- Published the first npm package so a pinned scan can run as `npx --yes @yb5/openready@0.1.1 scan .`.
- Normalized the npm executable path and declared public publication through the official npm registry.
- Simplified the README first-run path and added a complete synthetic, redacted result example.
- Added a repository social preview asset; it is not included in the npm package.

Scanner rules, output fields, exit codes, and safety boundaries are unchanged from v0.1.0.

## [0.1.0] - 2026-08-11

### Added

- Offline, read-only `openready scan [path]` command with text and JSON output.
- Stable `BLOCKER`, `WARNING`, and `INFO` findings with exit codes `0`, `1`, and `2`.
- Checks for risky filenames, secret-like content, user-home paths, emails, Git author metadata, large artifacts, media, temporary files, and governance documents.
- Symlink, binary, unreadable-entry, Gitlink, large-content, and non-Git boundary reporting.
- Separate scanning of every bounded ordinary Git index blob and each indexed symlink target string.
- Git metadata preflight that rejects external config, object-store, worktree, partial-clone, and symlink redirects.
- Isolated Git subprocess settings that disable lazy network access and exclude repository-controlled executable paths.
- Fail-closed entry, content, finding, Git-output, and Git-command-time safety limits.
- Strict finding schema that excludes matched values and local absolute roots.
- Node test suite, synthetic fixture generator, package allowlist, CI workflow, issue templates, release notes, synthetic pre-release evaluation, and optional human-feedback template.

### Known limitations

- Historical Git file contents are not scanned.
- Ignored, untracked files are not read in Git repositories.
- Archives, databases, media, binary files, Gitlinks, and large text content are not parsed.
- Credential patterns are offline heuristics and are not verified.

### Fixed during local pre-release validation

- Redacted credential- and email-shaped substrings embedded in displayed file paths.
- Rejected backup and temporary variants as substitutes for governance documents.
- Reduced blockers for ordinary parser variables named `token` while retaining stronger secret assignments.
- Detected secret assignments whose value starts on the following line.
- Added a package-to-CLI version synchronization regression check.
