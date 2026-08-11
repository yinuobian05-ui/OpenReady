# OpenReady

OpenReady is a small, offline CLI for the last privacy and repository-hygiene check before a Git repository becomes public. It looks for exposed credentials, personal paths and emails, Git author metadata, risky files, large media, and missing open-source governance files in one read-only scan.

It has zero runtime dependencies, sends no telemetry, and never prints a matched secret value.

> OpenReady does not guarantee that a repository is safe to publish. It does not replace a history-aware secret scanner, legal review, or copyright review.

## Quick start: first scan

This quick start has a design target of under five minutes. Human testing is intentionally skipped for v0.1.0, so no timing result is claimed.

Requirements: Node.js 20 or newer. Git is needed for tracked-file and commit-author checks.

From an OpenReady source checkout, no dependency installation is required:

```sh
node ./bin/openready.js scan ../your-project
```

To make the command available locally:

```sh
npm install --global . --ignore-scripts
openready scan ../your-project
```

From the same source checkout, use:

```sh
node ./bin/openready.js scan ../your-project --json
node ./bin/openready.js --help
node ./bin/openready.js --version
```

After the optional global installation, the equivalent commands are:

```sh
openready scan ../your-project
openready scan ../your-project --json
openready --help
openready --version
```

The package has not been published to npm yet. Do not use an npm install command naming `openready` until an official release is confirmed.

## What the result means

- `BLOCKER` — stop and investigate before publication.
- `WARNING` — manual review is required, but the scan still exits successfully.
- `INFO` — a boundary, skipped content type, or missing optional file is being disclosed.

Finding counts are not file counts. One file can produce several findings when, for example, its name and multiple content lines trigger different rules. A scan with warnings or informational findings, but no blockers, still exits `0`, so automation that cares about those levels should inspect the JSON findings rather than checking only the process status.

Git author warnings intentionally hide names and email addresses. To review the actual identities locally, without sending them anywhere, run:

```sh
git log --all --format='%an <%ae>' | sort -u
```

Missing `README`, license, and security policy checks are warnings because they are important publication decisions. A missing contributing guide is informational in v0.1 because a small project may reasonably add it later. Governance checks verify that a recognized file exists; they do not determine whether a license is legally valid or appropriate.

Exit codes are stable for shell and CI use:

| Code | Meaning |
| ---: | --- |
| `0` | Scan completed with no blockers. |
| `1` | Scan completed and found at least one blocker. |
| `2` | Usage error or the scan could not complete reliably. |

Example output contains locations and fixed descriptions, never matched values:

```text
[BLOCKER] OR-SEC-001 .env
  Environment file may contain credentials and should not be published.
```

## Checks in v0.1

OpenReady checks:

- environment, private-key, keystore, credential, certificate, and authentication-config filenames;
- private-key headers, high-confidence token shapes, and secret-like assignments;
- macOS, Linux, and Windows user-home path traces;
- email addresses in text files;
- author names and emails stored in reachable Git commits, reported only as aggregate warnings;
- large and oversized files, archives, databases, and media that may contain personal information;
- logs, crash artifacts, backups, and temporary files;
- missing `README`, license, security policy, and contributing guide;
- symlinks, binary files, unreadable entries, Gitlinks, and non-Git directories.

Every finding uses only these fields:

```json
{
  "severity": "WARNING",
  "ruleId": "OR-PRIV-002",
  "description": "Email address detected; confirm that publishing it is intentional.",
  "path": "src/example.js",
  "line": 12
}
```

`line` is omitted when it is not needed. There are no snippet, match, raw-value, author-value, hash, or absolute-root fields.

## Scan scope and safety boundaries

For a normal Git repository, OpenReady scans the current working-tree candidates returned by Git: tracked files plus untracked files that are not ignored by repository-local rules. Tracked paths remain in scope even if an ignore rule also matches them. User-global ignore configuration is deliberately not read, so a file hidden only by a personal global ignore remains a candidate. OpenReady also scans every ordinary file blob in the current Git index as a separate, bounded snapshot, even when that blob matches the working-tree file. For an indexed symlink, OpenReady scans only the stored target string. Untracked files ignored by repository-local rules are not read.

For a non-Git directory, OpenReady recursively checks ordinary entries while excluding Git metadata directories.

OpenReady never traverses a symlink. A link is reported as internal or external, and its target string is checked for privacy traces without opening the target. Text content larger than 10 MiB is not scanned; filename, type, and size rules still run. Binary files, archives, databases, and Gitlinks are not unpacked or parsed.

The CLI also fails closed with exit code `2` instead of returning a partial result when fixed safety budgets are exceeded: 250,000 entries, 512 MiB of bounded content inspection, or 10,000 unique findings per scan.

The scanner is read-only, but it evaluates a live filesystem snapshot. Concurrent file replacement can make any local scan stale. Run it on a repository you trust locally and avoid editing the repository during the scan. Repositories whose Git metadata uses config includes, alternate object stores, shared worktree metadata, partial-clone redirects, or metadata symlinks are rejected instead of following those redirects.

## Important limitations

- Current working-tree content, all ordinary blobs in the current Git index, and indexed symlink target strings are checked. Git commit author metadata is checked, but historical file blobs are not. A credential removed from both the index and current tree may still exist in history.
- Token and assignment rules are intentionally small and offline. They can produce false positives and false negatives, and they do not verify whether a credential is active.
- Very large repositories may exceed a fixed entry, content, finding, Git-output, or Git-command-time budget and exit `2` without a partial result.
- Filesystem or Git paths with non-UTF-8 bytes are rejected with exit `2` rather than decoded ambiguously.
- OpenReady does not contact credential providers, Git hosting services, or analytics services.
- Deleting a real credential from a file is not enough. Revoke or rotate it, then review Git history with a dedicated tool.
- OpenReady does not decide whether you own the rights to publish code, text, images, audio, video, fonts, datasets, or third-party assets.
- OpenReady is not legal advice, a copyright clearance service, or a substitute for human privacy review.

Before making a repository public, also run a maintained, history-aware secret scanner such as Gitleaks or TruffleHog and review the repository on the hosting platform after upload.

## JSON contract

`openready scan [path] --json` writes one JSON document to standard output for a completed scan. Execution errors write one JSON error document to standard error and exit `2`. JSON mode does not add ANSI styling or progress logs.

Top-level fields are:

- `tool` and `version`;
- `root`, always represented as `.` so the local absolute path is not exposed;
- `status`, either `READY` or `BLOCKED`;
- `summary` counts for blockers, warnings, and informational findings;
- `findings`, deterministically sorted by severity, path, line, and rule ID.

## Development

```sh
npm ci --ignore-scripts
npm test
npm pack --dry-run --ignore-scripts
node ./bin/openready.js scan . --json
```

Tests use Node's built-in test runner and generate only clearly fictional fixtures inside `test/.tmp`. No runtime package is installed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for rule and fixture requirements, [SECURITY.md](SECURITY.md) for safe reporting, and [beta-testing.md](beta-testing.md) for an optional future real-user feedback template.

## Project status

Version `0.1.0` is a local release candidate maintained by Yinuo Bian (`@yinuobian05-ui`). It has been committed locally, but it has not been pushed, published, or released. Human beta testing is intentionally skipped for v0.1.0, with 0 human runs; future human evaluation is optional. Public usage, users, downloads, stars, issues, and reviews have not occurred and are not claimed.

Licensed under the MIT License.
