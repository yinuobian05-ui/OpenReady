import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scanRepository } from '../src/scanner.js';
import {
  createSyntheticRepository,
  makeTemporaryWorkspace,
  runFixtureGit,
  syntheticValues,
  writeGovernanceFiles,
} from './fixtures/synthetic-repository.js';

function ruleIds(result) {
  return new Set(result.findings.map((finding) => finding.ruleId));
}

function findingLines(result, findingPath, ruleId) {
  return result.findings
    .filter((finding) => finding.path === findingPath && finding.ruleId === ruleId)
    .map((finding) => finding.line)
    .sort((left, right) => left - right);
}

test('detects core synthetic risks without retaining matched values', async () => {
  const fixture = await createSyntheticRepository({ risks: true });
  try {
    const result = await scanRepository(fixture.root);
    const ids = ruleIds(result);

    for (const expected of [
      'OR-SEC-001',
      'OR-SEC-004',
      'OR-SEC-005',
      'OR-SEC-006',
      'OR-PRIV-001',
      'OR-PRIV-002',
    ]) {
      assert.ok(ids.has(expected), `expected ${expected}`);
    }

    const privateHeader = result.findings.find((finding) => finding.ruleId === 'OR-SEC-004');
    assert.equal(privateHeader.path, 'src/privacy.txt');
    assert.equal(privateHeader.line, 1);
    const pathLines = result.findings
      .filter((finding) => finding.ruleId === 'OR-PRIV-001')
      .map((finding) => finding.line);
    assert.deepEqual(pathLines, [2, 3, 4]);

    const serialized = JSON.stringify(result);
    for (const hidden of Object.values(fixture.values)) {
      assert.equal(serialized.includes(hidden), false, `output leaked ${hidden}`);
    }

    for (const finding of result.findings) {
      const allowed = new Set(['severity', 'ruleId', 'description', 'path', 'line']);
      assert.ok(Object.keys(finding).every((key) => allowed.has(key)));
    }
  } finally {
    await fixture.cleanup();
  }
});

test('does not treat explicit placeholders as secret assignments', async () => {
  const fixture = await createSyntheticRepository();
  try {
    await writeFile(
      path.join(fixture.root, 'placeholders.txt'),
      [
        'api_key=replace-me',
        'password=${PASSWORD}',
        'client_secret=process.env.CLIENT_SECRET',
      ].join('\n'),
    );
    const result = await scanRepository(fixture.root);
    assert.equal(ruleIds(result).has('OR-SEC-005'), false);
  } finally {
    await fixture.cleanup();
  }
});

test('skips ignored untracked files but still scans tracked ignored files', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const environmentPath = path.join(fixture.root, '.env');
    const secretKey = ['SERVICE', 'TOKEN'].join('_');
    await writeFile(path.join(fixture.root, '.gitignore'), '.env\n');
    await writeFile(environmentPath, `${secretKey}=${fixture.values.assignment}\n`);

    const ignoredResult = await scanRepository(fixture.root);
    assert.equal(
      ignoredResult.findings.some((finding) => finding.path === '.env'),
      false,
    );

    runFixtureGit(fixture.root, ['add', '--force', '.env']);
    const trackedResult = await scanRepository(fixture.root);
    assert.ok(
      trackedResult.findings.some(
        (finding) => finding.path === '.env' && finding.ruleId === 'OR-SEC-001',
      ),
    );
    assert.ok(
      trackedResult.findings.some(
        (finding) => finding.path === '.env' && finding.ruleId === 'OR-SEC-005',
      ),
    );
  } finally {
    await fixture.cleanup();
  }
});

test('does not block an example environment filename but still scans its content', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const secretKey = ['SERVICE', 'TOKEN'].join('_');
    await writeFile(
      path.join(fixture.root, '.env.example'),
      `${secretKey}=${fixture.values.assignment}\n`,
    );

    const result = await scanRepository(fixture.root);
    assert.equal(
      result.findings.some(
        (finding) => finding.path === '.env.example' && finding.ruleId === 'OR-SEC-001',
      ),
      false,
    );
    assert.ok(
      result.findings.some(
        (finding) => finding.path === '.env.example' && finding.ruleId === 'OR-SEC-005',
      ),
    );
  } finally {
    await fixture.cleanup();
  }
});

test('detects quoted keys, generic token keys, auth tokens, passphrases, and encrypted keys', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const values = syntheticValues();
    const encryptedHeader = ['-----BEGIN ', 'ENCRYPTED PRIVATE KEY-----'].join('');
    const passphrase = ['correct', 'horse', 'battery', 'staple'].join(' ');
    const apiKey = ['api', 'key'].join('_');
    const authToken = ['_auth', 'Token'].join('');
    const genericToken = ['to', 'ken'].join('');
    const password = ['pass', 'word'].join('');
    await writeFile(
      path.join(fixture.root, 'credential-shapes.txt'),
      [
        JSON.stringify({ [apiKey]: values.assignment }),
        `${authToken}=${values.assignment}`,
        `${genericToken}: "${values.assignment}"`,
        `${password}: "${passphrase}"`,
        JSON.stringify({ [genericToken]: 'replace-me', [password]: values.assignment }),
        encryptedHeader,
      ].join('\n'),
    );
    const result = await scanRepository(fixture.root);
    assert.deepEqual(
      findingLines(result, 'credential-shapes.txt', 'OR-SEC-005'),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      findingLines(result, 'credential-shapes.txt', 'OR-SEC-004'),
      [6],
    );
    assert.equal(JSON.stringify(result).includes(values.assignment), false);
    assert.equal(JSON.stringify(result).includes(passphrase), false);
  } finally {
    await fixture.cleanup();
  }
});

test('detects underscored secret keys and punctuation in unquoted values on every line', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const keys = [
      ['OPENAI', 'API', 'KEY'].join('_'),
      ['DB', 'PASSWORD'].join('_'),
      ['JWT', 'SECRET'].join('_'),
      ['to', 'ken'].join(''),
    ];
    const values = [
      fixture.values.assignment,
      ['fixture', 'password!0001'].join('@'),
      ['fixture', 'jwt!value0001'].join('$'),
      'fixture@token!$0001',
    ];
    await writeFile(
      path.join(fixture.root, 'credential-key-boundaries.txt'),
      keys.map((key, index) => `${key}=${values[index]}`).join('\n'),
    );

    const result = await scanRepository(fixture.root);
    assert.deepEqual(
      findingLines(result, 'credential-key-boundaries.txt', 'OR-SEC-005'),
      [1, 2, 3, 4],
    );
    const serialized = JSON.stringify(result);
    for (const value of values) {
      assert.equal(serialized.includes(value), false);
    }
  } finally {
    await fixture.cleanup();
  }
});

test('detects camel-case keys and literal dollar values but skips dynamic references', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const keys = [
      ['database', 'Password'].join(''),
      ['openai', 'Api', 'Key'].join(''),
      ['jwt', 'Secret'].join(''),
      ['to', 'ken'].join(''),
    ];
    const literalValues = [
      ['$uper', 'Secret123!'].join(''),
      ['test', 'ProductionSecret123'].join(''),
      ['fixture', 'camel', 'secret', '0001'].join('-'),
      ['abc', 'defgh!'].join('$'),
    ];
    const additionalLiterals = [
      ['${', 'SUPERSECRET123'].join(''),
      ['correct', 'horse'].join('.'),
      ['abc', 'defgh'].join('.'),
      ['abc', '123'].join(''),
    ];
    const dynamicReferences = [
      ['os', '.getenv("DB_VALUE")'].join(''),
      ['os', '.Getenv("DB_VALUE")'].join(''),
      ['ENV', '.fetch("DB_VALUE")'].join(''),
      ['process', '.env.DB_VALUE'].join(''),
    ];
    const lines = [
      ...keys.map((key, index) => `${key}=${literalValues[index]}`),
      `${keys[0]}=${additionalLiterals[0]}`,
      `${keys[0]}=${additionalLiterals[1]}`,
      `${keys[3]}=${additionalLiterals[2]}`,
      `${keys[3]}=${additionalLiterals[3]}`,
      ...dynamicReferences.map((value) => `${keys[0]}=${value}`),
    ];
    await writeFile(path.join(fixture.root, 'literal-and-reference-values.txt'), lines.join('\n'));

    const result = await scanRepository(fixture.root);
    assert.deepEqual(
      findingLines(result, 'literal-and-reference-values.txt', 'OR-SEC-005'),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
  } finally {
    await fixture.cleanup();
  }
});

test('detects user-home paths that end at the username and may contain spaces', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const paths = [
      ['', 'Users', 'fictional profile'].join('/'),
      ['', 'home', 'fictional profile'].join('/'),
      ['C:', 'Users', 'fictional profile'].join('\\'),
    ];
    const quotedPaths = paths.map((privatePath) => `HOME="${privatePath}"`);
    await writeFile(
      path.join(fixture.root, 'home-path-endings.txt'),
      [...paths, ...quotedPaths].join('\n'),
    );

    const result = await scanRepository(fixture.root);
    assert.deepEqual(
      findingLines(result, 'home-path-endings.txt', 'OR-PRIV-001'),
      [1, 2, 3, 4, 5, 6],
    );
    const serialized = JSON.stringify(result);
    for (const privatePath of paths) assert.equal(serialized.includes(privatePath), false);
  } finally {
    await fixture.cleanup();
  }
});

test('detects a synthetic sk-proj token without retaining it', async () => {
  const fixture = await createSyntheticRepository();
  try {
    await writeFile(
      path.join(fixture.root, 'project-token.txt'),
      `${fixture.values.projectToken}\n`,
    );

    const result = await scanRepository(fixture.root);
    assert.deepEqual(
      findingLines(result, 'project-token.txt', 'OR-SEC-006'),
      [1],
    );
    assert.equal(JSON.stringify(result).includes(fixture.values.projectToken), false);
  } finally {
    await fixture.cleanup();
  }
});

test('scans an index blob when staged content differs from the working tree', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const stagedPath = path.join(fixture.root, 'staged.txt');
    await writeFile(stagedPath, `${fixture.values.token}\n`);
    runFixtureGit(fixture.root, ['add', 'staged.txt']);
    await writeFile(stagedPath, 'safe working tree content\n');

    const result = await scanRepository(fixture.root);
    const ids = ruleIds(result);
    assert.ok(ids.has('OR-BND-011'));
    assert.ok(ids.has('OR-SEC-006'));
    assert.equal(JSON.stringify(result).includes(fixture.values.token), false);
  } finally {
    await fixture.cleanup();
  }
});

test('scans assume-unchanged index content even when Git diff hides it', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const trackedPath = path.join(fixture.root, 'assumed.txt');
    await writeFile(trackedPath, `${fixture.values.token}\n`);
    runFixtureGit(fixture.root, ['add', 'assumed.txt']);
    await writeFile(trackedPath, 'safe working tree content\n');
    runFixtureGit(fixture.root, ['update-index', '--assume-unchanged', 'assumed.txt']);

    const result = await scanRepository(fixture.root);
    assert.ok(ruleIds(result).has('OR-SEC-006'));
    assert.ok(ruleIds(result).has('OR-BND-011'));
  } finally {
    await fixture.cleanup();
  }
});

test('scans every index blob when working-tree encoding makes Git report no change', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const encodedPath = path.join(fixture.root, 'encoded.txt');
    const encodedKey = ['OPENAI', 'API', 'KEY'].join('_');
    const secretLine = `${encodedKey}=${fixture.values.assignment}\n`;
    await writeFile(
      path.join(fixture.root, '.gitattributes'),
      'encoded.txt text working-tree-encoding=UTF-16\n',
    );
    await writeFile(encodedPath, Buffer.from(`\uFEFF${secretLine}`, 'utf16le'));
    runFixtureGit(fixture.root, ['add', '.gitattributes', 'encoded.txt']);
    assert.equal(
      runFixtureGit(fixture.root, ['diff', '--name-only', '--', 'encoded.txt']),
      '',
      'Git should consider the encoded worktree file identical to its UTF-8 index blob',
    );

    const result = await scanRepository(fixture.root);
    assert.deepEqual(
      findingLines(result, 'encoded.txt', 'OR-SEC-005'),
      [1],
    );
    assert.ok(ruleIds(result).has('OR-BND-003'));
    assert.equal(JSON.stringify(result).includes(fixture.values.assignment), false);
  } finally {
    await fixture.cleanup();
  }
});

test('fails closed when content or finding safety budgets are exceeded', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await writeFile(path.join(fixture.root, 'many-lines.txt'), `${syntheticValues().email}\n`.repeat(4));

    await assert.rejects(
      () => scanRepository(fixture.root, { limits: { totalContentScanBytes: 1 } }),
      { code: 'SCAN_LIMIT_EXCEEDED' },
    );
    await assert.rejects(
      () => scanRepository(fixture.root, { limits: { maximumFindings: 1 } }),
      { code: 'SCAN_LIMIT_EXCEEDED' },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('applies oversized-file rules to a differing index blob', async () => {
  const fixture = await createSyntheticRepository();
  try {
    const stagedPath = path.join(fixture.root, 'large-staged.dat');
    await writeFile(stagedPath, Buffer.alloc(40, 65));
    runFixtureGit(fixture.root, ['add', 'large-staged.dat']);
    await writeFile(stagedPath, 'small\n');

    const result = await scanRepository(fixture.root, {
      limits: {
        contentScanBytes: 10,
        largeFileBytes: 20,
        oversizedFileBytes: 40,
      },
    });
    assert.ok(ruleIds(result).has('OR-ART-002'));
    assert.ok(ruleIds(result).has('OR-BND-006'));
  } finally {
    await fixture.cleanup();
  }
});

test('reports risky file classes and configurable size boundaries', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await writeGovernanceFiles(fixture.root);
    await Promise.all([
      writeFile(path.join(fixture.root, 'bundle.zip'), 'archive'),
      writeFile(path.join(fixture.root, 'records.sqlite'), 'database'),
      writeFile(path.join(fixture.root, 'portrait.jpg'), 'media'),
      writeFile(path.join(fixture.root, 'debug.log'), 'log'),
      writeFile(path.join(fixture.root, 'settings.bak'), 'backup'),
      writeFile(path.join(fixture.root, 'fixture.key'), 'key file'),
      writeFile(path.join(fixture.root, 'credentials.json'), '{}'),
      writeFile(path.join(fixture.root, 'certificate.pem'), 'certificate'),
      writeFile(path.join(fixture.root, 'large.dat'), Buffer.alloc(20, 65)),
      writeFile(path.join(fixture.root, 'oversized.dat'), Buffer.alloc(40, 65)),
    ]);

    const result = await scanRepository(fixture.root, {
      limits: {
        contentScanBytes: 10,
        largeFileBytes: 20,
        oversizedFileBytes: 40,
      },
    });
    const ids = ruleIds(result);
    for (const expected of [
      'OR-ART-001',
      'OR-ART-002',
      'OR-ART-003',
      'OR-ART-004',
      'OR-ART-005',
      'OR-HYG-001',
      'OR-HYG-002',
      'OR-SEC-002',
      'OR-SEC-003',
      'OR-SEC-007',
      'OR-BND-006',
    ]) {
      assert.ok(ids.has(expected), `expected ${expected}`);
    }
  } finally {
    await fixture.cleanup();
  }
});

test('reports missing governance files in a non-Git directory', async () => {
  const fixture = await makeTemporaryWorkspace();
  try {
    await mkdir(path.join(fixture.root, 'src'));
    await writeFile(path.join(fixture.root, 'src', 'index.js'), 'export {};\n');
    const result = await scanRepository(fixture.root);
    const ids = ruleIds(result);
    assert.ok(ids.has('OR-GOV-001'));
    assert.ok(ids.has('OR-GOV-002'));
    assert.ok(ids.has('OR-GOV-003'));
    assert.ok(ids.has('OR-GOV-004'));
    assert.ok(ids.has('OR-BND-005'));
  } finally {
    await fixture.cleanup();
  }
});

test('recognizes governance files that remain in the current Git index', async () => {
  const fixture = await createSyntheticRepository();
  try {
    for (const fileName of ['README.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md']) {
      await rm(path.join(fixture.root, fileName));
    }
    const result = await scanRepository(fixture.root);
    assert.equal(
      result.findings.some((finding) => finding.ruleId.startsWith('OR-GOV-')),
      false,
    );
    assert.ok(ruleIds(result).has('OR-BND-009'));
  } finally {
    await fixture.cleanup();
  }
});

test('aggregates Git author metadata without exposing identities', async () => {
  const fixture = await createSyntheticRepository({ commit: true });
  try {
    const result = await scanRepository(fixture.root);
    const ids = ruleIds(result);
    assert.ok(ids.has('OR-META-001'));
    assert.ok(ids.has('OR-META-002'));
    assert.ok(ids.has('OR-META-003'));

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(fixture.values.authorName), false);
    assert.equal(serialized.includes(fixture.values.email), false);
  } finally {
    await fixture.cleanup();
  }
});
