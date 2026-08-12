# Optional human beta testing

## Current status

Human beta testing was intentionally skipped for the v0.1.0 release and was not a release prerequisite. No human beta runs, participants, or usage evidence are claimed. This file is retained only as an optional future evidence template.

If genuine volunteers become available later, a useful optional target is 3–5 people who are developers or regularly use Git. Each participant must run the tool on a repository they are permitted to inspect and give feedback based on that real run. Do not recruit or invent participants merely to fill this template.

Three independent AI roles performed a synthetic pre-release evaluation of the CLI contract and generated fixtures. That work is documented in [docs/pre-beta-evaluation.md](docs/pre-beta-evaluation.md), but it is not human usability evidence and does not count as a beta run.

## Fastest privacy-safe feedback

After one real run, a participant can post this single line in the [launch discussion](https://github.com/yinuobian05-ui/OpenReady/discussions/1):

```text
OS / Node major / scan completed? / most confusing part / would use again?
```

For example: `macOS / Node 24 / yes / none / yes — useful before first public push`.

Do not paste scan output, repository contents, credentials, logs, or personal information. The longer template below is optional when someone wants to report more detail safely.

## Safety rules

- Do not send a repository, scan output, credential, log, or personal information to the maintainer.
- Participants should describe findings at category level or use a minimal synthetic reproduction.
- Run OpenReady only on a locally trusted repository.
- A participant may stop immediately if a finding suggests a real credential. Revoke or rotate it before further review.
- A star, review, or public issue is never a condition of testing. Any star must be a voluntary action after genuine use.
- Do not create fake participants, issues, testimonials, timing data, fixes, releases, or metrics.

## Optional future test script

1. Confirm Node.js 20 or newer with `node --version`.
2. From the OpenReady source checkout, run `node ./bin/openready.js scan <repository>`.
3. Run the same scan with `--json`.
4. Time setup plus the first completed text scan, starting before the first OpenReady command and ending when its result appears. Record whether that took less than five minutes.
5. Review whether each finding is understandable without exposing its matched value.
6. Note false positives, suspected false negatives, confusing wording, slow behavior, and any boundary failure.
7. Share only the completed template below with private details removed.

## Optional one-run feedback template

Copy one section per real participant only if an optional real run occurs.

```text
Participant alias chosen by participant:
Date:
Operating system:
Node.js major version:
Repository type: Git / non-Git
Repository size band: small / medium / large
Setup plus first-scan time:
Text-mode exit code:
JSON-mode exit code:
Were severity levels understandable?:
Were any matched values exposed?:
Useful findings, described without private data:
False positives, using synthetic examples only:
Suspected misses, using synthetic examples only:
Confusing wording or setup steps:
Performance or boundary problems:
Would use again? Why or why not?:
Follow-up issue, if voluntarily created:
Fix or release that addressed it:
Consent to quote feedback publicly: yes / no
```

## Evidence register

Do not add a participant row unless an optional real run actually occurs.

| Run | Date | Environment | First scan completed | Feedback recorded | Follow-up |
| --- | --- | --- | --- | --- | --- |
| _0 — intentionally skipped for v0.1.0_ |  |  |  |  |  |

## Maintenance loop

For each actionable result:

1. Convert the feedback into a minimal synthetic reproduction.
2. Create one real issue only if tracking is useful.
3. Add or update a regression test before changing behavior.
4. Implement and review the smallest fix.
5. Run tests, package dry-run, and self-scan.
6. Link the actual issue, change, and release after they exist.
7. Update aggregate claims only from recorded evidence.

## Public launch log

| Date | Channel | Action | Evidence | Outcome at record time |
| --- | --- | --- | --- | --- |
| 2026-08-12 | GitHub Discussions | Published a v0.1.1 trial request with the exact install command, privacy guidance, and a structured request for real feedback. | [Launch discussion #1](https://github.com/yinuobian05-ui/OpenReady/discussions/1) | Posted successfully; no response, run, issue, or star is claimed yet. |
| 2026-08-12 | GitHub | Improved first-run conversion with a real synthetic CLI demo, a shorter pinned install command, clearer safety boundaries, and a one-line feedback format. | [Merged pull request #2](https://github.com/yinuobian05-ui/OpenReady/pull/2) | Merged after the Node.js 20, 22, and 24 CI jobs passed; no resulting adoption is claimed yet. |
| 2026-08-12 | Terminal Trove | Submitted OpenReady through the official tool-submission form for curator review, then sent a field-verification request because browser autofill may have changed the tool name and install command. | [Submission page](https://terminaltrove.com/post/) | The site displayed a submission acknowledgement and the correction email was verified in Sent. Acceptance, a public listing URL, and the curator's final field values are not yet independently verifiable. |
| 2026-08-12 | awesome-cli-apps-in-a-csv | Opened a project-inclusion request using the directory's documented self-nomination route. | [Inclusion request #360](https://github.com/toolleeo/awesome-cli-apps-in-a-csv/issues/360) | Open and awaiting review; 0 comments at snapshot time. This is not counted as an accepted listing or a user. |
| 2026-08-12 | DevTool Center | Submitted OpenReady as a free Security tool with the GitHub repository URL and seven relevant tags. | [Submission page](https://www.devtool.center/submit) | The site displayed `Submission Received!` and placed it in the review queue. Acceptance and a public listing URL are not yet verified. |

## Metrics state

Snapshot time: 2026-08-12 18:55 UTC+8. Metrics can lag; later values must be read from their live sources rather than inferred from this snapshot.

| Signal | Current evidence |
| --- | --- |
| Real beta runs | Intentionally skipped for v0.1.0; 0 verified runs |
| Public users | 0 verified users |
| Downloads | npm v0.1.1 is published; the npm download-count endpoint returned `package not found`, so no download number is claimed |
| Stars / forks / watchers | 0 / 0 / 0 from GitHub |
| Public issues / pull requests | 0 issues; 1 merged maintainer pull request |
| GitHub traffic | 0 views and 0 clones in the owner traffic endpoint; this source may lag |
| GitHub Discussions | 1 launch announcement; 0 comments at snapshot time |
| Open-source directory requests | 2 form submission acknowledgements; 1 open awesome-cli-apps-in-a-csv request with 0 comments; 0 accepted listings verified |
| Published releases | GitHub v0.1.0 and v0.1.1; npm v0.1.1 |

These fields must remain explicit rather than being estimated or backfilled.
