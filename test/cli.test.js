import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatError } from '../src/formatters.js';
import { sanitizeDisplayPath } from '../src/path-utils.js';
import {
  createSyntheticRepository,
  makeTemporaryWorkspace,
} from './fixtures/synthetic-repository.js';

const BIN = fileURLToPath(new URL('../bin/openready.js', import.meta.url));

function runCli(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
}

test('sanitizes terminal and bidirectional controls in displayed paths', () => {
  assert.equal(sanitizeDisplayPath(`src/unsafe\u001b\u009b\u202efile.js`), 'src/unsafe???file.js');
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
  assert.equal(runCli(['--help']).status, 0);
  assert.equal(runCli(['--version']).status, 0);
  assert.equal(runCli(['unknown']).status, 2);
  assert.equal(runCli(['scan', '.', '.', '--json']).status, 2);
  const invalidJson = runCli(['scan', '--unknown', '--json']);
  assert.equal(invalidJson.status, 2);
  assert.doesNotThrow(() => JSON.parse(invalidJson.stderr));
});

test('unknown internal errors never expose their original message', () => {
  const privatePath = ['', 'Users', 'fictional-developer', 'private', 'file.txt'].join('/');
  const rendered = formatError(new Error(`failed at ${privatePath}`), false);
  assert.equal(rendered.includes(privatePath), false);
  assert.match(rendered, /EXECUTION_ERROR/);
});
