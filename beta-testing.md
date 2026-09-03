# Optional human beta testing

## Current status

Human beta testing was intentionally skipped for the v0.1.0 release and was not a release prerequisite. No human beta run, independent synthetic demo run, participant, or usage evidence is currently claimed. One external reviewer has now provided attributable product feedback without running the package; that is feedback evidence, not a user or run.

On 2026-08-31, Reddit user `Capable-Property-539` declined to run an unfamiliar `npx` package on a primary machine and explained that the first-run request required too much trust. The same reply correctly identified that v0.2.1 scanned the working tree and current index but not historical file blobs, so a credential deleted after an earlier commit could remain publishable. The [public reply](https://old.reddit.com/r/alphaandbetausers/comments/1vuco5a/happy_to_beta_test_your_product_ill_use_it_and/p6zefnj/) is one concrete external feedback item. It is not a verified execution, adoption event, testimonial, or endorsement.

If genuine volunteers become available later, a useful optional target is 3–5 people who are developers or regularly use Git. Each participant must run the tool on a repository they are permitted to inspect and give feedback based on that real run. Do not recruit or invent participants merely to fill this template.

Three independent AI roles performed a synthetic pre-release evaluation of the CLI contract and generated fixtures. That work is documented in [docs/pre-beta-evaluation.md](docs/pre-beta-evaluation.md), but it is not human usability evidence and does not count as a beta run.

## One-command synthetic smoke test

Someone can first confirm that the package runs and that the redacted output is understandable without scanning personal files:

```sh
npx --yes "@yb5/openready@0.3.0" demo
```

The command creates only fixed fictional files in a unique operating-system temporary directory, scans them locally, and removes that exact directory. Its expected synthetic `BLOCKED` result demonstrates rule categories; successful demo completion exits `0`.

A distinct non-maintainer may count as one **independent synthetic smoke-test runner** only when they report the OpenReady version, operating system, Node.js major version, successful completion, and one specific observation. This is not a real beta run, user adoption, a testimonial, or evidence that OpenReady helped publish a real repository. Downloads, clones, stars, viewing the GIF, maintainer runs, and comments without a confirmed run do not count.

| Smoke run | Date | Environment and version | Demo completed | Specific observation | Public evidence |
| --- | --- | --- | --- | --- | --- |
| _0 — no independent synthetic demo run verified_ |  |  |  |  |  |

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

Do not add a participant row unless an optional real run on a repository the participant is authorized to inspect actually occurs. Synthetic demo runs belong only in the separate smoke-test table above.

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
| 2026-08-13 | GitHub and npm | Published v0.1.2 with a privacy-safe feedback footer after public CI passed on Node.js 20, 22, and 24. | [Pull request #3](https://github.com/yinuobian05-ui/OpenReady/pull/3), [CI](https://github.com/yinuobian05-ui/OpenReady/actions/runs/31657006746), [GitHub release](https://github.com/yinuobian05-ui/OpenReady/releases/tag/v0.1.2), [npm package](https://www.npmjs.com/package/@yb5/openready/v/0.1.2) | Tag, registry metadata, latest dist-tag, fresh install, CLI version, and an installed-package scan were verified. No independent run, feedback, adoption, review, or impact is claimed. |
| 2026-08-13 | Reddit r/devops | Posted one disclosed maintainer comment in the current Weekly Self Promotion Thread inviting developers to try v0.1.2 and share privacy-safe feedback from a real run. | [Public comment](https://old.reddit.com/r/devops/comments/1vkd20a/weekly_self_promotion_thread/p3d92rt/) | Comment is publicly visible. At record time, no independent run, reply, feedback, issue, pull request, star, or adoption is claimed. |
| 2026-08-15 | GitHub and npm | Published v0.2.0 from merged commit `c360d368` after the five-platform public CI matrix passed. | [Pull request #7](https://github.com/yinuobian05-ui/OpenReady/pull/7), [main CI](https://github.com/yinuobian05-ui/OpenReady/actions/runs/31858423405), [GitHub release](https://github.com/yinuobian05-ui/OpenReady/releases/tag/v0.2.0), [npm package](https://www.npmjs.com/package/@yb5/openready/v/0.2.0) | The annotated tag, GitHub Release, registry metadata, `latest` dist-tag, 23-file public tarball, fresh unauthenticated install, CLI version, synthetic demo, installed-package scan, and zero-vulnerability npm audit were independently verified. No independent run, feedback, user, adoption, review, or impact is claimed. |
| 2026-08-27 | GitHub and npm | Published v0.2.1 from tagged commit `1211f256` after the five-platform CI matrix passed. | [Pull request #11](https://github.com/yinuobian05-ui/OpenReady/pull/11), [tag CI](https://github.com/yinuobian05-ui/OpenReady/actions/runs/33036405450), [staging run](https://github.com/yinuobian05-ui/OpenReady/actions/runs/33036405432), [workflow fix #12](https://github.com/yinuobian05-ui/OpenReady/pull/12), [GitHub Release](https://github.com/yinuobian05-ui/OpenReady/releases/tag/v0.2.1), [npm package](https://www.npmjs.com/package/@yb5/openready/v/0.2.1) | The tag staging run passed all 57 tests and the package audit but published nothing because the source self-scan rejected inactive checkout-generated Git metadata. The exact tagged commit was staged locally and approved through npm's separate 2FA gate. Registry metadata, `latest`, the annotated tag, GitHub Release, 23-file tarball, byte-for-byte file match, fresh unauthenticated version check, synthetic demo, and downloaded-package scan were then verified. No independent run, feedback, user, adoption, review, or impact is claimed. |
| 2026-08-27 | Reddit r/ChatGPTCoding | Posted one disclosed maintainer comment in the current Weekly Self Promotion Thread inviting developers to try the pinned v0.2.1 synthetic demo and share one privacy-safe usability observation. | [Public comment](https://old.reddit.com/r/ChatGPTCoding/comments/1vwwbap/weekly_self_promotion_thread/p65kw3j/) | Posted successfully; no independent run, reply, feedback, issue, pull request, star, user, adoption, review, or impact is claimed at record time. |
| 2026-09-01 | Reddit r/alphaandbetausers | Recorded the first attributable external product feedback after an invited tester declined to run an unfamiliar `npx` package and identified the unscanned historical-blob gap. | [Public reply](https://old.reddit.com/r/alphaandbetausers/comments/1vuco5a/happy_to_beta_test_your_product_ill_use_it_and/p6zefnj/) | One real feedback item is verified; the reviewer explicitly did not run the package, so verified runs and users remain 0. A local v0.3.0 candidate now addresses the historical text-blob gap, but it has not been committed, pushed, or published. |

## Metrics state

Stars, forks, subscribers, issues, pull requests, Discussions comments, release state, and the latest available daily traffic/download buckets were refreshed on 2026-09-01 at 20:30 UTC+8. Daily buckets are not exact rolling-24-hour measurements and must not be inferred as attributable use.

| Signal | Current evidence |
| --- | --- |
| Real beta runs | Intentionally skipped for v0.1.0; 0 verified runs |
| Independent synthetic demo runs | 0 verified runs; maintained separately from real-repository testing |
| Public users | 0 verified users |
| External feedback | 1 attributable product-feedback reply; the reviewer explicitly did not run the package |
| Downloads | npm's daily API reports 0 downloads on 2026-08-31 and 0 on the incomplete 2026-09-01 bucket at snapshot time. Download events do not prove users and may include maintainer or automated registry activity. |
| Stars / forks / watchers | 2 stars / 0 forks / 0 actual Watch subscribers from GitHub. Stars are not counted as verified users. |
| Public issues / pull requests | 0 open issues and 0 external pull requests; the preceding 24 hours added 0 issues, pull requests, or commits |
| GitHub traffic | The 2026-08-31 daily bucket reports 1 view / 1 unique visitor and 13 clones / 13 unique cloners. This traffic is unattributed and is not counted as verified use or adoption. |
| GitHub Discussions | 1 launch announcement and 0 comments. Reactions were not refreshed; the earlier snapshot recorded 1 unattributed upvote. |
| Open-source directory requests | 2 form submission acknowledgements; 1 open awesome-cli-apps-in-a-csv request with 0 comments; 0 accepted listings verified |
| Published releases | GitHub v0.1.0, v0.1.1, v0.1.2, v0.2.0, and v0.2.1; npm `latest` is v0.2.1 |
| Maintenance checks | Public v0.2.1 remains verified with green five-platform CI. The local v0.3.0 history-scan candidate reported 69 tests: 68 passed, 0 failed, and 1 platform-limited skip; linked-worktree and separate-Git-directory regressions fail closed as intended. Its 24-file package dry-run, non-shallow full-history source scan, temporary packed-package version check, synthetic demo, and unpacked-package scan passed. The candidate is not committed, pushed, staged, or published. |

These fields must remain explicit rather than being estimated or backfilled.
