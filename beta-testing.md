# OpenReady beta testing plan

## Current status

Beta testing has not started. No participants, public users, downloads, stars, reviews, public issues, or usage metrics are claimed. This file is a plan and evidence template, not a record of completed testing.

The target is 3–5 friends who are developers or regularly use Git. Each participant must run the tool on a repository they are permitted to inspect and give feedback based on that real run.

Three independent AI roles have performed a synthetic pre-beta evaluation of the CLI contract and generated fixtures. That work is documented in [docs/pre-beta-evaluation.md](docs/pre-beta-evaluation.md), but it is not human usability evidence and does not count toward the 3–5 real runs.

## Safety rules

- Do not send a repository, scan output, credential, log, or personal information to the maintainer.
- Participants should describe findings at category level or use a minimal synthetic reproduction.
- Run OpenReady only on a locally trusted repository.
- A participant may stop immediately if a finding suggests a real credential. Revoke or rotate it before further review.
- A star, review, or public issue is never a condition of testing. Any star must be a voluntary action after genuine use.
- Do not create fake participants, issues, testimonials, timing data, fixes, releases, or metrics.

## Test script

1. Confirm Node.js 20 or newer with `node --version`.
2. From the OpenReady source checkout, run `node ./bin/openready.js scan <repository>`.
3. Run the same scan with `--json`.
4. Time setup plus the first completed text scan, starting before the first OpenReady command and ending when its result appears. Record whether that took less than five minutes.
5. Review whether each finding is understandable without exposing its matched value.
6. Note false positives, suspected false negatives, confusing wording, slow behavior, and any boundary failure.
7. Share only the completed template below with private details removed.

## One-run feedback template

Copy one section per real participant. Leave fields blank until the run occurs.

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

Do not add a row until a real run has occurred.

| Run | Date | Environment | First scan completed | Feedback recorded | Follow-up |
| --- | --- | --- | --- | --- | --- |
| _No runs yet_ |  |  |  |  |  |

## Maintenance loop

For each actionable result:

1. Convert the feedback into a minimal synthetic reproduction.
2. Create one real issue only if tracking is useful.
3. Add or update a regression test before changing behavior.
4. Implement and review the smallest fix.
5. Run tests, package dry-run, and self-scan.
6. Link the actual issue, change, and release after they exist.
7. Update aggregate claims only from recorded evidence.

## Metrics state

| Signal | Current evidence |
| --- | --- |
| Real beta runs | Not yet occurred |
| Public users | Not yet occurred |
| Downloads | Not yet occurred |
| Stars | Not yet occurred |
| Public issues | Not yet occurred |
| Published releases | Not yet occurred |

These fields must remain explicit rather than being estimated or backfilled.
