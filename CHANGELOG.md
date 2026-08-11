# Changelog

All notable changes to OpenReady will be documented in this file.

The format follows Keep a Changelog principles, and this project intends to use semantic versioning after its first public release.

## [Unreleased]

- No public changes yet.

## [0.1.0] - Unreleased

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
- Node test suite, synthetic fixture generator, package allowlist, CI workflow, issue templates, release draft, and beta-testing plan.

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
