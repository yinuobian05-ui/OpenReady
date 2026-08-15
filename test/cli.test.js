import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  access,
  chmod,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatError } from '../src/formatters.js';
import { resolveGitExecutable } from '../src/git.js';
import { sanitizeDisplayPath } from '../src/path-utils.js';
import {
  createSyntheticRepository,
  initializeGit,
  makeTemporaryWorkspace,
} from './fixtures/synthetic-repository.js';

const BIN = fileURLToPath(new URL('../bin/openready.js', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));

function runCli(args, cwd, extraEnvironment = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
    shell: false,
    windowsHide: true,
  });
}

test('sanitizes terminal and bidirectional controls in displayed paths', () => {
  assert.equal(sanitizeDisplayPath(`src/unsafe\u001b\u009b\u202efile.js`), 'src/unsafe???file.js');
});

test('redacts credential and email shapes embedded in finding paths', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const token = ['AKIA', 'FILENAME', '00000000'].join('');
    const email = ['path.fixture', 'example.invalid'].join('@');
    const bearer = ['Bearer ', 'SyntheticFilenameCredential987654321'].join('');
    await writeFile(path.join(fixture.root, `.env.${token}`), 'synthetic content\n');
    await writeFile(path.join(fixture.root, `${email}.log`), 'synthetic log\n');
    await writeFile(path.join(fixture.root, `.env.${bearer}`), 'synthetic content\n');

    const run = runCli(['scan', fixture.root, '--json']);
    assert.equal(run.status, 1, run.stderr);
    assert.equal(run.stdout.includes(token), false);
    assert.equal(run.stdout.includes(email), false);
    assert.equal(run.stdout.includes(bearer), false);
    assert.equal(run.stderr.includes(token), false);
    assert.equal(run.stderr.includes(email), false);
    assert.equal(run.stderr.includes(bearer), false);
    assert.ok(JSON.parse(run.stdout).findings.some((finding) => finding.path.includes('[REDACTED]')));
  } finally {
    await fixture.cleanup();
  }
});

test('scan defaults to the current directory', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const run = runCli(['scan', '--json'], fixture.root);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(JSON.parse(run.stdout).root, '.');
  } finally {
    await fixture.cleanup();
  }
});

test('JSON output is parseable and warnings alone exit zero', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const run = runCli(['scan', fixture.root, '--json']);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stderr, '');
    const result = JSON.parse(run.stdout);
    assert.equal(result.tool, 'openready');
    assert.equal(result.summary.blockers, 0);
    assert.equal(result.root, '.');
    assert.equal(run.stdout.includes('/discussions/1'), false);
    const counted = { blockers: 0, warnings: 0, info: 0 };
    for (const finding of result.findings) {
      if (finding.severity === 'BLOCKER') counted.blockers += 1;
      if (finding.severity === 'WARNING') counted.warnings += 1;
      if (finding.severity === 'INFO') counted.info += 1;
    }
    assert.deepEqual(result.summary, counted);
    const severityRanks = result.findings.map(
      (finding) => ({ BLOCKER: 0, WARNING: 1, INFO: 2 })[finding.severity],
    );
    assert.deepEqual(severityRanks, [...severityRanks].sort((left, right) => left - right));
  } finally {
    await fixture.cleanup();
  }
});

test('JSON output is byte-identical across unchanged scans', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const first = runCli(['scan', fixture.root, '--json']);
    const second = runCli(['scan', fixture.root, '--json']);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    assert.equal(first.stderr, second.stderr);
  } finally {
    await fixture.cleanup();
  }
});

test('a blocker exits one and never appears in output', async () => {
  const fixture = await createSyntheticRepository({ risks: true });
  try {
    const run = runCli(['scan', fixture.root, '--json']);
    assert.equal(run.status, 1, run.stderr);
    const result = JSON.parse(run.stdout);
    assert.ok(result.summary.blockers > 0);
    for (const hidden of Object.values(fixture.values)) {
      assert.equal(run.stdout.includes(hidden), false);
      assert.equal(run.stderr.includes(hidden), false);
    }
  } finally {
    await fixture.cleanup();
  }
});

test('text output reports rules without exposing matched values', async () => {
  const fixture = await createSyntheticRepository({ risks: true });
  try {
    const run = runCli(['scan', fixture.root]);
    assert.equal(run.status, 1, run.stderr);
    assert.equal(run.stderr, '');
    assert.match(run.stdout, /\[BLOCKER\] OR-SEC-/);
    assert.match(
      run.stdout,
      /https:\/\/github\.com\/yinuobian05-ui\/OpenReady\/discussions\/1/,
    );
    assert.match(run.stdout, /never paste scan output or repository data/i);
    for (const hidden of Object.values(fixture.values)) {
      assert.equal(run.stdout.includes(hidden), false);
      assert.equal(run.stderr.includes(hidden), false);
    }
  } finally {
    await fixture.cleanup();
  }
});

test('an execution error exits two with one JSON error document', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    const absent = path.join(fixture.root, 'does-not-exist');
    const run = runCli(['scan', absent, '--json']);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, '');
    const result = JSON.parse(run.stderr);
    assert.equal(result.error.code, 'SCAN_ROOT_NOT_FOUND');
    assert.equal(run.stderr.includes(absent), false);
  } finally {
    await fixture.cleanup();
  }
});

test('help and version exit zero while invalid usage exits two', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /openready demo/);
  assert.equal(runCli(['--version']).status, 0);
  assert.equal(runCli(['unknown']).status, 2);
  assert.equal(runCli(['scan', '.', '.', '--json']).status, 2);
  assert.equal(runCli(['demo', '--json']).status, 2);
  const invalidJson = runCli(['scan', '--unknown', '--json']);
  assert.equal(invalidJson.status, 2);
  assert.doesNotThrow(() => JSON.parse(invalidJson.stderr));
});

test('synthetic demo completes without reading or changing the current directory', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    const sentinelPath = path.join(fixture.root, 'personal-project-file.txt');
    const sentinelContent = 'private-current-directory-sentinel\n';
    await writeFile(sentinelPath, sentinelContent);
    const environmentSentinels = [
      'private-user-sentinel',
      'private-profile-sentinel',
      ['private-author-sentinel', 'example.invalid'].join('@'),
      'private-npm-sentinel',
    ];
    const gitAuthorEmailKey = ['GIT', 'AUTHOR', 'EMAIL'].join('_');
    const npmTokenKey = ['NPM', 'TOKEN'].join('_');
    const run = runCli(['demo'], fixture.root, {
      USER: environmentSentinels[0],
      USERPROFILE: environmentSentinels[1],
      [gitAuthorEmailKey]: environmentSentinels[2],
      [npmTokenKey]: environmentSentinels[3],
    });

    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stderr, '');
    assert.match(run.stdout, /synthetic demo completed/i);
    assert.match(run.stdout, /BLOCKED result above is expected/i);
    assert.match(run.stdout, /temporary synthetic files were removed/i);
    assert.match(run.stdout, /not evidence of real-repository use or adoption/i);
    assert.equal(await readFile(sentinelPath, 'utf8'), sentinelContent);
    assert.equal(run.stdout.includes(sentinelContent.trim()), false);
    for (const sentinel of environmentSentinels) {
      assert.equal(run.stdout.includes(sentinel), false);
      assert.equal(run.stderr.includes(sentinel), false);
    }
  } finally {
    await fixture.cleanup();
  }
});

test('synthetic demo ignores Git from an ancestor repository sibling PATH directory', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX executable behavior required');
    return;
  }

  const fixture = await makeTemporaryWorkspace();
  try {
    await initializeGit(fixture.root);
    const nestedDirectory = path.join(fixture.root, 'subdir');
    const repositoryBin = path.join(fixture.root, 'bin');
    await Promise.all([
      mkdir(nestedDirectory, { recursive: true }),
      mkdir(repositoryBin, { recursive: true }),
    ]);

    const trustedGit = resolveGitExecutable(fixture.root);
    const markerPath = path.join(fixture.workspace, 'repository-git-ran.marker');
    const fakeGit = path.join(repositoryBin, 'git');
    await writeFile(
      fakeGit,
      '#!/bin/sh\n: > "$OPENREADY_TEST_MARKER"\nexit 99\n',
    );
    await chmod(fakeGit, 0o755);

    const environment = {
      OPENREADY_TEST_MARKER: markerPath,
      PATH: `${repositoryBin}${path.delimiter}${path.dirname(trustedGit)}`,
    };
    const run = runCli(['demo'], nestedDirectory, environment);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /synthetic demo completed/i);
    await assert.rejects(() => access(markerPath), { code: 'ENOENT' });

    const noFallback = runCli(['demo'], nestedDirectory, {
      ...environment,
      PATH: repositoryBin,
    });
    assert.equal(noFallback.status, 2);
    await assert.rejects(() => access(markerPath), { code: 'ENOENT' });
  } finally {
    await fixture.cleanup();
  }
});

test('CLI version stays synchronized with package metadata', async () => {
  const packageMetadata = JSON.parse(await readFile(PACKAGE_JSON, 'utf8'));
  const run = runCli(['--version']);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), packageMetadata.version);
});

test('unknown internal errors never expose their original message', () => {
  const privatePath = ['', 'Users', 'fictional-developer', 'private', 'file.txt'].join('/');
  const rendered = formatError(new Error(`failed at ${privatePath}`), false);
  assert.equal(rendered.includes(privatePath), false);
  assert.match(rendered, /EXECUTION_ERROR/);
});
