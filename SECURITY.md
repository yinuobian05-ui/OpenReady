# Security Policy

OpenReady processes repositories that may contain sensitive material. Its output is designed to omit matched values, but bug reports and screenshots can still expose filenames, repository structure, or other private information.

## Supported versions

`0.1.x` is the current supported line. Version `0.1.2` is published on npm and GitHub. Security fixes will be documented in the changelog and release notes.

## Reporting a vulnerability

Do not place a real credential, private key, personal email, private repository, full log, or unredacted scan output in a public issue.

GitHub Private Vulnerability Reporting is enabled. Use the repository's **Security** tab and choose **Report a vulnerability**, or open the [private vulnerability report form](https://github.com/yinuobian05-ui/OpenReady/security/advisories/new). Do not open a public issue or publish a proof of concept containing sensitive data.

Include only:

- the affected OpenReady version;
- operating system and Node.js major version;
- a minimal, fully synthetic reproduction;
- expected and actual behavior;
- whether the issue could reveal a matched value, cross the scan root, modify files, or trigger network access.

## Security model

OpenReady is intended to be offline and read-only. It does not validate credentials against provider APIs, upload results, follow symlinks, unpack archives, or modify the target repository. It may inspect a symlink's stored target string for privacy traces, but it does not open the target.

It is not a sandbox for hostile repositories. It invokes local Git commands for candidate files and author metadata, and it reads a live working-tree snapshot. Repository-controlled, relative, and `node_modules/.bin` executable paths are removed before invoking Git, but the remaining absolute `PATH` and Git installation must still be trusted. Use it on repositories you trust locally. If a finding may represent a real credential, revoke or rotate the credential before investigating repository history.

The absence of findings is not a security guarantee. Pair OpenReady with a maintained, history-aware secret scanner and human review before publication.
