# r/ChatGPTCoding weekly self-promotion draft

Status: POSTED — 2026-08-27; v0.2.1 was publicly verified before posting

Target: the current [r/ChatGPTCoding Weekly Self Promotion Thread](https://www.reddit.com/r/ChatGPTCoding/comments/1vwwbap/weekly_self_promotion_thread/).

Public comment: [permalink](https://old.reddit.com/r/ChatGPTCoding/comments/1vwwbap/weekly_self_promotion_thread/p65kw3j/).

## Draft

Disclosure: I maintain OpenReady, a free MIT-licensed Node.js CLI. For people shipping repositories after using Codex, Claude Code, Cursor, or similar tools, it provides a deterministic pre-publication hygiene check without sending the repository to another model.

OpenReady itself uses no AI model. Its read-only local scan checks for credential-shaped content, personal paths and email addresses, Git author metadata, risky files, large media, and missing open-source governance files. It has zero runtime dependencies and no telemetry, and it never prints matched secret values or Git identities.

You can try its output on fixed fictional files first. The demo does not scan the current directory:

```sh
npx --yes "@yb5/openready@0.2.1" demo
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
- Use the pinned v0.2.1 command; npm metadata, the annotated Git tag, the GitHub Release, the 23-file tarball, and a fresh unauthenticated demo were independently verified on 2026-08-27.
