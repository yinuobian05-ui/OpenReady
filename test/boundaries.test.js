import test from 'node:test';
import assert from 'node:assert/strict';
import { access, appendFile, chmod, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scanRepository } from '../src/scanner.js';
import {
  createSyntheticRepository,
  makeTemporaryWorkspace,
  initializeGit,
  runFixtureGit,
  syntheticValues,
  writeGovernanceFiles,
} from './fixtures/synthetic-repository.js';

function hasRule(result, ruleId) {
  return result.findings.some((finding) => finding.ruleId === ruleId);
}

test('never follows an external symlink target', async (t) => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    const outside = path.join(fixture.workspace, 'outside.txt');
    await writeFile(outside, syntheticValues().token);
    const linkPath = path.join(fixture.root, 'external-link');
    const relativeTarget = path.relative(path.dirname(linkPath), outside);
    try {
      await symlink(relativeTarget, linkPath);
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }

    const result = await scanRepository(fixture.root);
    assert.ok(hasRule(result, 'OR-BND-002'));
    assert.equal(hasRule(result, 'OR-SEC-006'), false);
    assert.equal(JSON.stringify(result).includes(syntheticValues().token), false);
  } finally {
    await fixture.cleanup();
  }
});

test('scans an external symlink target string for privacy without opening it', async (t) => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    const target = ['', 'Users', 'openready-fixture-user-0001', 'private', 'fixture.txt'].join('/');
    try {
      await symlink(target, path.join(fixture.root, 'privacy-link'));
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }

    const result = await scanRepository(fixture.root);
    const privacyFinding = result.findings.find(
      (finding) => finding.ruleId === 'OR-PRIV-001' && finding.path === 'privacy-link',
    );
    assert.equal(privacyFinding?.line, 1);
    assert.ok(hasRule(result, 'OR-BND-002'));
    assert.equal(JSON.stringify(result).includes(target), false);
  } finally {
    await fixture.cleanup();
  }
});

test('scans a tracked symlink target stored only in the Git index', async (t) => {
  const fixture = await createSyntheticRepository();
  try {
    const target = ['', 'Users', 'openready-index-fixture-user-0001', 'private', 'fixture.txt'].join('/');
    const linkPath = path.join(fixture.root, 'tracked-privacy-link');
    try {
      await symlink(target, linkPath);
      runFixtureGit(fixture.root, ['add', 'tracked-privacy-link']);
      await rm(linkPath);
      await symlink('README.md', linkPath);
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }

    const result = await scanRepository(fixture.root);
    const privacyFinding = result.findings.find(
      (finding) => finding.ruleId === 'OR-PRIV-001' && finding.path === 'tracked-privacy-link',
    );
    assert.equal(privacyFinding?.line, 1);
    assert.equal(JSON.stringify(result).includes(target), false);
  } finally {
    await fixture.cleanup();
  }
});

test('reports an internal symlink without traversing it', async (t) => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await writeFile(path.join(fixture.root, 'target.txt'), 'safe synthetic text\n');
    try {
      await symlink('target.txt', path.join(fixture.root, 'internal-link'));
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }
    const result = await scanRepository(fixture.root);
    assert.ok(hasRule(result, 'OR-BND-001'));
  } finally {
    await fixture.cleanup();
  }
});

test('does not follow an intermediate directory symlink from a Git index path', async (t) => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    const trackedDirectory = path.join(fixture.root, 'linked-directory');
    await mkdir(trackedDirectory);
    await writeFile(path.join(trackedDirectory, 'tracked.txt'), 'safe staged content\n');
    runFixtureGit(fixture.root, ['add', '--all']);

    await rm(trackedDirectory, { recursive: true });
    const outsideDirectory = path.join(fixture.workspace, 'outside-directory');
    await mkdir(outsideDirectory);
    await writeFile(path.join(outsideDirectory, 'tracked.txt'), syntheticValues().token);
    const relativeTarget = path.relative(path.dirname(trackedDirectory), outsideDirectory);
    try {
      await symlink(relativeTarget, trackedDirectory);
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }

    const result = await scanRepository(fixture.root);
    assert.ok(hasRule(result, 'OR-BND-002'));
    assert.equal(hasRule(result, 'OR-SEC-006'), false);
    assert.equal(JSON.stringify(result).includes(syntheticValues().token), false);
  } finally {
    await fixture.cleanup();
  }
});

test('rejects Git config includes instead of reading redirected configuration', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    await appendFile(
      path.join(fixture.root, '.git', 'config'),
      '\n[include] ; synthetic trailing comment\n\tpath = ../synthetic-outside-config\n',
    );
    await assert.rejects(() => scanRepository(fixture.root), { code: 'GIT_METADATA_UNSAFE' });
  } finally {
    await fixture.cleanup();
  }
});

test('rejects unsafe Git variables placed on the section-header line', async () => {
  const unsafeLines = [
    '[extensions] partialClone = synthetic-origin',
    '[remote "synthetic"] promisor = true',
    '[core] worktree = ../synthetic-outside-worktree',
  ];

  for (const unsafeLine of unsafeLines) {
    const fixture = await makeTemporaryWorkspace();
    try {
      await writeGovernanceFiles(fixture.root);
      await initializeGit(fixture.root);
      await appendFile(path.join(fixture.root, '.git', 'config'), `\n${unsafeLine}\n`);
      await assert.rejects(() => scanRepository(fixture.root), { code: 'GIT_METADATA_UNSAFE' });
    } finally {
      await fixture.cleanup();
    }
  }
});

test('accepts a safe Git variable placed on the section-header line', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    await appendFile(
      path.join(fixture.root, '.git', 'config'),
      '\n[user] name = Synthetic Inline Identity\n',
    );
    const result = await scanRepository(fixture.root);
    assert.equal(result.status, 'READY');
  } finally {
    await fixture.cleanup();
  }
});

test('rejects old-style remote promisor configuration', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    await appendFile(
      path.join(fixture.root, '.git', 'config'),
      '\n[remote.origin] ; synthetic old-style subsection\n\tpromisor = true\n',
    );
    await assert.rejects(() => scanRepository(fixture.root), { code: 'GIT_METADATA_UNSAFE' });
  } finally {
    await fixture.cleanup();
  }
});

test('rejects an attributes-file redirect in local Git config', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    await appendFile(
      path.join(fixture.root, '.git', 'config'),
      '\n[core]\n\tattributesFile = ../synthetic-outside-attributes\n',
    );
    await assert.rejects(() => scanRepository(fixture.root), { code: 'GIT_METADATA_UNSAFE' });
  } finally {
    await fixture.cleanup();
  }
});

test('rejects symlinks stored anywhere inside Git metadata', async (t) => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    try {
      await symlink('../config', path.join(fixture.root, '.git', 'synthetic-link'));
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }
    await assert.rejects(() => scanRepository(fixture.root), { code: 'GIT_METADATA_UNSAFE' });
  } finally {
    await fixture.cleanup();
  }
});

test('accepts a configured clean filter without executing it', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    const markerPath = path.join(fixture.root, 'filter-ran.marker');
    await Promise.all([
      writeFile(path.join(fixture.root, '.gitattributes'), 'filtered.txt filter=synthetic\n'),
      writeFile(path.join(fixture.root, 'filtered.txt'), 'safe staged content\n'),
      writeFile(
        path.join(fixture.root, 'filter-probe.cjs'),
        [
          "const fs = require('node:fs');",
          "fs.writeFileSync('filter-ran.marker', 'synthetic probe');",
          'process.stdin.pipe(process.stdout);',
          '',
        ].join('\n'),
      ),
    ]);
    runFixtureGit(fixture.root, ['add', '--all']);
    await appendFile(
      path.join(fixture.root, '.git', 'config'),
      [
        '',
        '[filter.synthetic] # synthetic old-style subsection',
        '\tclean = node filter-probe.cjs',
        '\trequired = true',
        '',
      ].join('\n'),
    );
    await writeFile(path.join(fixture.root, 'filtered.txt'), 'safe working tree content\n');

    const result = await scanRepository(fixture.root);
    assert.equal(result.status, 'READY');
    await assert.rejects(() => access(markerPath), { code: 'ENOENT' });
  } finally {
    await fixture.cleanup();
  }
});

test('does not resolve Git from a repository-controlled PATH directory', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX executable behavior required');
    return;
  }
  const fixture = await makeTemporaryWorkspace();
  const previousPath = process.env.PATH;
  try {
    await writeGovernanceFiles(fixture.root);
    await initializeGit(fixture.root);
    const repositoryBin = path.join(fixture.root, 'node_modules', '.bin');
    await mkdir(repositoryBin, { recursive: true });
    const fakeGit = path.join(repositoryBin, 'git');
    await writeFile(fakeGit, '#!/bin/sh\nexit 99\n');
    await chmod(fakeGit, 0o755);
    await writeFile(path.join(fixture.root, '.gitignore'), 'node_modules/\n');
    const aliasedBin = path.join(fixture.workspace, 'repository-bin-alias');
    await symlink(
      path.relative(path.dirname(aliasedBin), repositoryBin),
      aliasedBin,
    );
    process.env.PATH = `${aliasedBin}${path.delimiter}${previousPath ?? ''}`;

    const result = await scanRepository(fixture.root);
    assert.equal(result.status, 'READY');
    process.env.PATH = aliasedBin;
    await assert.rejects(
      () => scanRepository(fixture.root),
      { code: 'GIT_EXECUTABLE_UNAVAILABLE' },
    );
  } finally {
    if (previousPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = previousPath;
    }
    await fixture.cleanup();
  }
});

test('skips binary content even when bytes resemble a credential', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    const bytes = Buffer.concat([
      Buffer.from([0, 1, 2, 3]),
      Buffer.from(syntheticValues().token),
    ]);
    await writeFile(path.join(fixture.root, 'payload.bin'), bytes);
    const result = await scanRepository(fixture.root);
    assert.ok(hasRule(result, 'OR-BND-003'));
    assert.equal(hasRule(result, 'OR-SEC-006'), false);
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed on a non-UTF-8 filesystem entry name', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX byte-oriented path behavior required');
    return;
  }
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    const invalidPath = Buffer.concat([
      Buffer.from(`${fixture.root}${path.sep}invalid-name-`, 'utf8'),
      Buffer.from([0xff]),
    ]);
    try {
      await writeFile(invalidPath, 'synthetic content\n');
    } catch (error) {
      if (['EACCES', 'EILSEQ', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(error.code)) {
        t.skip('filesystem does not accept non-UTF-8 path bytes');
        return;
      }
      throw error;
    }
    await assert.rejects(() => scanRepository(fixture.root), { code: 'PATH_ENCODING_UNSUPPORTED' });
  } finally {
    await fixture.cleanup();
  }
});

test('rejects a symlink as the scan root', async (t) => {
  const fixture = await makeTemporaryWorkspace();
  try {
    const actualRoot = path.join(fixture.workspace, 'actual');
    const linkedRoot = path.join(fixture.workspace, 'linked');
    await mkdir(actualRoot);
    try {
      await symlink(path.relative(path.dirname(linkedRoot), actualRoot), linkedRoot);
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('symlink creation is not available');
        return;
      }
      throw error;
    }
    await assert.rejects(() => scanRepository(linkedRoot), { code: 'SCAN_ROOT_SYMLINK' });
  } finally {
    await fixture.cleanup();
  }
});

test('continues after an unreadable file where permissions are enforced', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX permission behavior required');
    return;
  }
  const fixture = await makeTemporaryWorkspace();
  const unreadable = path.join(fixture.root, 'unreadable.txt');
  try {
    await writeGovernanceFiles(fixture.root);
    await writeFile(unreadable, 'synthetic private material\n');
    await chmod(unreadable, 0o000);
    const result = await scanRepository(fixture.root);
    if (!hasRule(result, 'OR-BND-004')) {
      t.skip('test process can bypass file permissions');
      return;
    }
    assert.equal(result.status, 'READY');
  } finally {
    await chmod(unreadable, 0o600).catch(() => {});
    await fixture.cleanup();
  }
});
