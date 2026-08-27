# r/ChatGPTCoding weekly self-promotion draft

Status: DRAFT — NOT POSTED

Target: the current r/ChatGPTCoding Weekly Self Promotion Thread.

## Draft

Disclosure: I maintain OpenReady, a free MIT-licensed Node.js CLI. For people using Codex, Claude Code, Cursor, or similar tools, it adds a deterministic final check before a Git repository becomes public—without asking another model to review the same work.

OpenReady uses no AI model at runtime and does not upload code. Its read-only local scan checks for credential-shaped content, personal paths and email addresses, Git author metadata, risky files, large media, and missing open-source governance files. It has zero runtime dependencies and no telemetry, and it never prints matched secret values or Git identities.

You can try its output on fixed fictional files before giving it access to a repository:

```sh
npx --yes "@yb5/openready@0.2.0" demo
```

It requires Node.js 20+ and Git; `npx` may download the pinned package first. A synthetic `BLOCKED` result is expected. A successful demo removes its temporary files and exits `0`.

OpenReady is not a guarantee that a repository is safe to publish, and it does not scan historical file contents.

I'd value one concrete observation: did the demo finish? If so, which finding or instruction was hardest to understand? Please do not paste terminal output or repository data.

Repository: https://github.com/yinuobian05-ui/OpenReady

## Posting guardrails

- Post only once in the current official weekly self-promotion thread.
- Keep the maintainer disclosure.
- Do not request stars, upvotes, testimonials, or reciprocal engagement.
- Do not repost weekly without a material product change.
- Keep the verified v0.2.0 command unless v0.2.1 has been independently verified at npm, its Git tag, and its GitHub Release.
