import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createSyntheticDemoRepository,
  removeSyntheticDemoWorkspace,
  runSyntheticDemo,
} from '../src/demo.js';
import { scanRepository } from '../src/scanner.js';

async function makeTestBase() {
  return mkdtemp(path.join(os.tmpdir(), 'openready-demo-test-'));
}

async function listFiles(root, prefix = '') {
  const files = [];
  const entries = await readdir(root, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listFiles(path.join(root, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

test('demo uses only the fixed fictional file set and removes it after scanning', async () => {
  const tempBase = await makeTestBase();
  const sentinels = [
    'private-home-sentinel',
    'private-user-sentinel',
    ['private-author-sentinel', 'example.invalid'].join('@'),
    'private-npm-token-sentinel',
  ];
  const environmentKeys = [
    'HOME',
    'USER',
    ['GIT', 'AUTHOR', 'EMAIL'].join('_'),
    ['NPM', 'TOKEN'].join('_'),
  ];
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

  try {
    environmentKeys.forEach((key, index) => {
      process.env[key] = sentinels[index];
    });

    const result = await runSyntheticDemo({
      tempBase,
      scan: async (root) => {
        const files = await listFiles(root);
        assert.deepEqual(files, [
          '.env',
          'CONTRIBUTING.md',
          'credentials.json',
          'LICENSE',
          'README.md',
          'SECURITY.md',
          'src/privacy.txt',
        ]);
        const content = (await Promise.all(
          files.map((relativePath) => readFile(path.join(root, relativePath), 'utf8')),
        )).join('\n');
        for (const sentinel of sentinels) {
          assert.equal(content.includes(sentinel), false);
        }
        return scanRepository(root);
      },
    });

    assert.equal(result.status, 'BLOCKED');
    assert.deepEqual(result.summary, { blockers: 4, warnings: 5, info: 1 });
    assert.deepEqual(await readdir(tempBase), []);
  } finally {
    for (const key of environmentKeys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
    await rm(tempBase, { recursive: true, force: true });
  }
});

test('demo cleans up after a scan failure and exposes no internal error', async () => {
  const tempBase = await makeTestBase();
  try {
    await assert.rejects(
      () => runSyntheticDemo({
        tempBase,
        scan: async () => {
          throw new Error('private scan failure detail');
        },
      }),
      (error) => {
        assert.equal(error.code, 'DEMO_FAILED');
        assert.equal(error.message.includes('private scan failure detail'), false);
        return true;
      },
    );
    assert.deepEqual(await readdir(tempBase), []);
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
});

test('two concurrent demos use separate workspaces and both clean up', async () => {
  const tempBase = await makeTestBase();
  const roots = new Set();
  try {
    await Promise.all([
      runSyntheticDemo({
        tempBase,
        scan: async (root) => {
          roots.add(root);
          return scanRepository(root);
        },
      }),
      runSyntheticDemo({
        tempBase,
        scan: async (root) => {
          roots.add(root);
          return scanRepository(root);
        },
      }),
    ]);
    assert.equal(roots.size, 2);
    assert.deepEqual(await readdir(tempBase), []);
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
});

test('cleanup rejects a path outside the generated demo boundary', async () => {
  const tempBase = await makeTestBase();
  try {
    await assert.rejects(
      () => removeSyntheticDemoWorkspace(path.join(tempBase, 'unrelated'), tempBase),
      { code: 'DEMO_CLEANUP_FAILED' },
    );
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
});

test('demo refuses a temporary base inside the current project', async () => {
  await assert.rejects(
    () => createSyntheticDemoRepository({ tempBase: process.cwd() }),
    { code: 'DEMO_SETUP_FAILED' },
  );
});

test('created demo repository can be inspected before explicit cleanup', async () => {
  const tempBase = await makeTestBase();
  let demo;
  try {
    demo = await createSyntheticDemoRepository({ tempBase });
    assert.ok((await readdir(demo.root)).includes('.git'));
    const result = await scanRepository(demo.root);
    assert.equal(result.status, 'BLOCKED');
  } finally {
    if (demo) {
      await removeSyntheticDemoWorkspace(demo.workspace, demo.tempBase);
    }
    await rm(tempBase, { recursive: true, force: true });
  }
});
