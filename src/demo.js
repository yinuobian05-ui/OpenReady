import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { OpenReadyError } from './errors.js';
import { isolatedGitEnvironment, resolveGitExecutable } from './git.js';
import { scanRepository } from './scanner.js';

const DEMO_PREFIX = 'openready-demo-';
const REQUIRED_RULE_IDS = Object.freeze([
  'OR-SEC-001',
  'OR-SEC-003',
  'OR-SEC-004',
  'OR-SEC-005',
  'OR-META-003',
  'OR-PRIV-001',
  'OR-PRIV-002',
  'OR-BND-011',
]);

function demoError(code, message) {
  return new OpenReadyError(code, message);
}

function fixedSyntheticContent() {
  const secretKey = ['DEMO', 'SECRET'].join('_');
  const privateKeyHeader = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
  const email = ['demo.tester', 'example.invalid'].join('@');
  const macPath = ['', 'Users', 'fictional-openready-demo', 'project', 'file.js'].join('/');
  const linuxPath = ['', 'home', 'fictional-openready-demo', 'project', 'file.js'].join('/');
  const windowsPath = ['C:', 'Users', 'fictional-openready-demo', 'project', 'file.js'].join('\\');

  return Object.freeze({
    'README.md': '# OpenReady synthetic demo\n',
    LICENSE: 'Synthetic demo license placeholder.\n',
    'SECURITY.md': 'Synthetic demo security policy.\n',
    'CONTRIBUTING.md': 'Synthetic demo contribution guide.\n',
    '.env': `${secretKey}=fictional-placeholder-not-a-real-secret\n`,
    'credentials.json': '{"purpose":"fixed fictional OpenReady demo data"}\n',
    'src/privacy.txt': [
      privateKeyHeader,
      macPath,
      linuxPath,
      windowsPath,
      email,
    ].join('\n') + '\n',
  });
}

function runDemoGit(root, args) {
  const gitExecutable = resolveGitExecutable(root);
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const result = spawnSync(
    gitExecutable,
    [
      '--no-pager',
      '--no-optional-locks',
      '--no-replace-objects',
      '-c', `core.excludesFile=${nullDevice}`,
      '-c', `core.attributesFile=${nullDevice}`,
      '-c', `core.hooksPath=${nullDevice}`,
      '-c', 'core.fsmonitor=false',
      ...args,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: isolatedGitEnvironment(root),
      maxBuffer: 1024 * 1024,
      shell: false,
      timeout: 10_000,
      windowsHide: true,
    },
  );

  if (result.error || result.signal || result.status !== 0) {
    throw demoError(
      'DEMO_SETUP_FAILED',
      'The fixed synthetic demo could not be created reliably.',
    );
  }
}

function validateWorkspace(workspace, tempBase) {
  const resolvedWorkspace = path.resolve(workspace);
  const resolvedBase = path.resolve(tempBase);
  return (
    path.dirname(resolvedWorkspace) === resolvedBase &&
    path.basename(resolvedWorkspace).startsWith(DEMO_PREFIX)
  );
}

export async function removeSyntheticDemoWorkspace(workspace, tempBase) {
  if (!validateWorkspace(workspace, tempBase)) {
    throw demoError(
      'DEMO_CLEANUP_FAILED',
      'The synthetic demo directory could not be validated for cleanup.',
    );
  }
  await rm(workspace, {
    recursive: true,
    force: false,
    maxRetries: 3,
    retryDelay: 100,
  });
}

export async function createSyntheticDemoRepository(options = {}) {
  const tempBase = path.resolve(options.tempBase ?? os.tmpdir());
  let workspace;

  try {
    if (path.dirname(tempBase) === tempBase) {
      throw demoError(
        'DEMO_SETUP_FAILED',
        'The fixed synthetic demo could not be created reliably.',
      );
    }
    const [resolvedTempBase, resolvedCurrentDirectory] = await Promise.all([
      realpath(tempBase),
      realpath(process.cwd()),
    ]);
    const relativeToCurrent = path.relative(resolvedCurrentDirectory, resolvedTempBase);
    if (
      relativeToCurrent === '' ||
      (!relativeToCurrent.startsWith('..') && !path.isAbsolute(relativeToCurrent))
    ) {
      throw demoError(
        'DEMO_SETUP_FAILED',
        'The operating-system temporary directory overlaps the current directory.',
      );
    }
    workspace = await mkdtemp(path.join(tempBase, DEMO_PREFIX));
    const root = path.join(workspace, 'repository');
    await mkdir(path.join(root, 'src'), { recursive: true });

    const content = fixedSyntheticContent();
    await Promise.all(Object.entries(content).map(async ([relativePath, value]) => {
      await writeFile(path.join(root, relativePath), value, { flag: 'wx' });
    }));

    runDemoGit(root, ['init', '--quiet', '--template=', '.']);
    runDemoGit(root, ['add', '--all']);

    return { content, root, tempBase, workspace };
  } catch (error) {
    if (workspace) {
      try {
        await removeSyntheticDemoWorkspace(workspace, tempBase);
      } catch {
        throw demoError(
          'DEMO_CLEANUP_FAILED',
          'The synthetic demo could not be cleaned up reliably.',
        );
      }
    }
    if (error instanceof OpenReadyError) throw error;
    throw demoError(
      'DEMO_SETUP_FAILED',
      'The fixed synthetic demo could not be created reliably.',
    );
  }
}

function validateDemoResult(result) {
  const ruleIds = new Set(result.findings.map((finding) => finding.ruleId));
  if (
    result.status !== 'BLOCKED' ||
    result.summary.blockers < 4 ||
    REQUIRED_RULE_IDS.some((ruleId) => !ruleIds.has(ruleId))
  ) {
    throw demoError(
      'DEMO_RESULT_UNEXPECTED',
      'The synthetic demo did not produce its expected fixed result.',
    );
  }
}

export async function runSyntheticDemo(options = {}) {
  const createDemo = options.createDemo ?? createSyntheticDemoRepository;
  const scan = options.scan ?? scanRepository;
  const cleanup = options.cleanup ?? removeSyntheticDemoWorkspace;
  let demo;
  let operationError;
  let result;

  try {
    demo = await createDemo(options);
    result = await scan(demo.root);
    validateDemoResult(result);
  } catch (error) {
    operationError = error instanceof OpenReadyError
      ? error
      : demoError('DEMO_FAILED', 'The synthetic demo could not be completed reliably.');
  }

  if (demo) {
    try {
      await cleanup(demo.workspace, demo.tempBase);
    } catch {
      throw demoError(
        'DEMO_CLEANUP_FAILED',
        'The synthetic demo could not be cleaned up reliably.',
      );
    }
  }

  if (operationError) throw operationError;
  return result;
}
