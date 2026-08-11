import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMP_BASE = fileURLToPath(new URL('../.tmp/', import.meta.url));

function isolatedGitEnvironment(extra = {}) {
  const environment = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.toUpperCase().startsWith('GIT_')) {
      environment[key] = value;
    }
  }
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  return {
    ...environment,
    GIT_CONFIG_COUNT: '0',
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_SYSTEM: nullDevice,
    GIT_TERMINAL_PROMPT: '0',
    ...extra,
  };
}

export function runFixtureGit(root, args, extraEnvironment = {}) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    env: isolatedGitEnvironment(extraEnvironment),
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error) {
    throw new Error('Synthetic Git fixture command failed.');
  }
  return result.stdout;
}

export async function makeTemporaryWorkspace() {
  await mkdir(TEMP_BASE, { recursive: true });
  const workspace = await mkdtemp(path.join(TEMP_BASE, 'case-'));
  const root = path.join(workspace, 'repository');
  await mkdir(root);
  return {
    workspace,
    root,
    cleanup: () => rm(workspace, { recursive: true, force: true }),
  };
}

export async function writeGovernanceFiles(root) {
  await Promise.all([
    writeFile(path.join(root, 'README.md'), '# Synthetic repository\n'),
    writeFile(path.join(root, 'LICENSE'), 'Synthetic fixture license\n'),
    writeFile(path.join(root, 'SECURITY.md'), 'Synthetic fixture policy\n'),
    writeFile(path.join(root, 'CONTRIBUTING.md'), 'Synthetic fixture guide\n'),
  ]);
}

export async function initializeGit(root) {
  const parent = path.dirname(root);
  const baseName = path.basename(root);
  const result = spawnSync('git', ['init', '--quiet', '--template=', baseName], {
    cwd: parent,
    encoding: 'utf8',
    env: isolatedGitEnvironment(),
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error) {
    throw new Error('Synthetic Git fixture initialization failed.');
  }
}

export function syntheticValues() {
  return {
    token: ['AKIA', 'SYNTHETIC', '0000000'].join(''),
    projectToken: ['sk', 'proj', 'syntheticfixture000000000000000000000000'].join('-'),
    assignment: ['fixture', 'credential', 'value', '0001'].join('-'),
    email: ['fixture.contributor', 'example.invalid'].join('@'),
    authorName: ['Synthetic', 'Contributor'].join(' '),
    privateKeyHeader: ['-----BEGIN ', 'PRIVATE KEY-----'].join(''),
    macPath: ['', 'Users', 'fictional-developer', 'project', 'file.js'].join('/'),
    linuxPath: ['', 'home', 'fictional-developer', 'project', 'file.js'].join('/'),
    windowsPath: ['C:', 'Users', 'fictional-developer', 'project', 'file.js'].join('\\'),
  };
}

export async function writeRiskFiles(root) {
  const values = syntheticValues();
  const serviceTokenKey = ['SERVICE', 'TOKEN'].join('_');
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(
    path.join(root, '.env'),
    `${serviceTokenKey}=${values.assignment}\nACCESS_ID=${values.token}\n`,
  );
  await writeFile(
    path.join(root, 'src', 'privacy.txt'),
    [
      values.privateKeyHeader,
      values.macPath,
      values.linuxPath,
      values.windowsPath,
      values.email,
    ].join('\n'),
  );
  return values;
}

export async function createSyntheticRepository(options = {}) {
  const workspace = await makeTemporaryWorkspace();
  await writeGovernanceFiles(workspace.root);
  if (options.git !== false) {
    await initializeGit(workspace.root);
  }
  const values = options.risks ? await writeRiskFiles(workspace.root) : syntheticValues();

  if (options.git !== false && options.stage !== false) {
    runFixtureGit(workspace.root, ['add', '--all']);
  }
  if (options.commit) {
    const identity = {
      GIT_AUTHOR_NAME: values.authorName,
      GIT_AUTHOR_EMAIL: values.email,
      GIT_COMMITTER_NAME: values.authorName,
      GIT_COMMITTER_EMAIL: values.email,
    };
    runFixtureGit(workspace.root, ['commit', '--quiet', '-m', 'Synthetic fixture commit'], identity);
  }

  return { ...workspace, values };
}
