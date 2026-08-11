import { constants, lstatSync, realpathSync } from 'node:fs';
import {
  lstat,
  open,
  opendir,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { OpenReadyError } from './errors.js';
import { isContained, normalizeRelativePath } from './path-utils.js';

const MAX_GIT_CONFIG_BYTES = 1024 * 1024;

function unsafeGitMetadata() {
  return new OpenReadyError(
    'GIT_METADATA_UNSAFE',
    'Git metadata redirects outside the supported local-repository boundary.',
  );
}

function safeExecutableDirectories(root) {
  const currentDirectory = path.resolve(process.cwd());
  const currentIsFilesystemRoot = path.dirname(currentDirectory) === currentDirectory;
  const currentDirectoryIsRelated = (
    isContained(currentDirectory, root) || isContained(root, currentDirectory)
  );
  const directories = [];
  const seen = new Set();

  for (const rawEntry of (process.env.PATH ?? '').split(path.delimiter)) {
    const entry = rawEntry.replace(/^"|"$/g, '');
    if (!entry || !path.isAbsolute(entry)) continue;
    try {
      const resolved = realpathSync(entry);
      if (!lstatSync(resolved).isDirectory()) continue;
      if (isContained(root, resolved)) continue;
      if (
        !currentIsFilesystemRoot &&
        !currentDirectoryIsRelated &&
        isContained(currentDirectory, resolved)
      ) continue;
      const portable = resolved.split(path.sep).join('/').toLowerCase();
      if (portable.endsWith('/node_modules/.bin')) continue;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        directories.push(resolved);
      }
    } catch {
      // Ignore missing or unreadable PATH entries.
    }
  }
  return directories;
}

function resolveGitExecutable(root) {
  const executableNames = process.platform === 'win32' ? ['git.exe', 'git'] : ['git'];
  const currentDirectory = path.resolve(process.cwd());
  const currentDirectoryIsRelated = (
    isContained(currentDirectory, root) || isContained(root, currentDirectory)
  );

  for (const directory of safeExecutableDirectories(root)) {
    for (const executableName of executableNames) {
      try {
        const resolved = realpathSync(path.join(directory, executableName));
        if (isContained(root, resolved)) continue;
        if (!currentDirectoryIsRelated && isContained(currentDirectory, resolved)) continue;
        const portable = resolved.split(path.sep).join('/').toLowerCase();
        if (portable.includes('/node_modules/.bin/')) continue;
        const stats = lstatSync(resolved);
        if (!stats.isFile()) continue;
        if (process.platform !== 'win32' && (stats.mode & 0o111) === 0) continue;
        return resolved;
      } catch {
        // Continue to the next trusted absolute PATH candidate.
      }
    }
  }

  throw new OpenReadyError(
    'GIT_EXECUTABLE_UNAVAILABLE',
    'A trusted Git executable could not be located outside the scan root.',
  );
}

function isolatedGitEnvironment(root) {
  const environment = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.toUpperCase().startsWith('GIT_') && key.toUpperCase() !== 'PATH') {
      environment[key] = value;
    }
  }

  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  return {
    ...environment,
    GIT_ALLOW_PROTOCOL: '',
    GIT_ATTR_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '0',
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_SYSTEM: nullDevice,
    GIT_NO_LAZY_FETCH: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_PAGER: 'cat',
    GIT_PROTOCOL_FROM_USER: '0',
    GIT_TERMINAL_PROMPT: '0',
    PATH: safeExecutableDirectories(root).join(path.delimiter),
  };
}

function runGit(root, args, limits, options = {}) {
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const gitExecutable = resolveGitExecutable(root);
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
      '-c', 'pager.log=false',
      `--git-dir=${path.join(root, '.git')}`,
      `--work-tree=${root}`,
      ...args,
    ],
    {
      cwd: root,
      encoding: 'buffer',
      env: isolatedGitEnvironment(root),
      input: options.input,
      maxBuffer: limits.gitMaxBufferBytes,
      shell: false,
      timeout: limits.gitTimeoutMs,
      windowsHide: true,
    },
  );

  if (result.error || result.signal || result.status !== 0) {
    throw new OpenReadyError(
      'GIT_SCAN_FAILED',
      'Git metadata could not be inspected reliably. No partial result was reported.',
    );
  }

  return result.stdout;
}

async function optionalStats(targetPath) {
  try {
    return await lstat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw unsafeGitMetadata();
  }
}

async function readBoundedFile(targetPath, maximumBytes) {
  const stats = await optionalStats(targetPath);
  if (!stats || stats.isSymbolicLink() || !stats.isFile() || stats.size > maximumBytes) {
    throw unsafeGitMetadata();
  }

  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(targetPath, constants.O_RDONLY | noFollow);
    const openedStats = await handle.stat();
    if (
      !openedStats.isFile() ||
      openedStats.size > maximumBytes ||
      openedStats.size !== stats.size ||
      (stats.dev && openedStats.dev && stats.dev !== openedStats.dev) ||
      (stats.ino && openedStats.ino && stats.ino !== openedStats.ino)
    ) {
      throw unsafeGitMetadata();
    }
    const buffer = Buffer.alloc(openedStats.size);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== buffer.length) throw unsafeGitMetadata();
    return buffer;
  } catch {
    throw unsafeGitMetadata();
  } finally {
    await handle?.close().catch(() => {});
  }
}

function rejectUnsafeConfig(configText) {
  let section = '';
  for (const rawLine of configText.split(/\r\n|\n|\r/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    let variableLine = line;

    if (line.startsWith('[')) {
      let quoted = false;
      let escaped = false;
      let closingBracket = -1;
      for (let index = 1; index < line.length; index += 1) {
        const character = line[index];
        if (escaped) {
          escaped = false;
        } else if (character === '\\' && quoted) {
          escaped = true;
        } else if (character === '"') {
          quoted = !quoted;
        } else if (character === ']' && !quoted) {
          closingBracket = index;
          break;
        }
      }
      if (closingBracket < 0) throw unsafeGitMetadata();
      const header = line.slice(0, closingBracket + 1);
      const remainder = line.slice(closingBracket + 1).trim();

      const sectionMatch = /^\[\s*([A-Za-z0-9-]+)(?=[.\s\]])/.exec(header);
      if (!sectionMatch) throw unsafeGitMetadata();
      section = sectionMatch[1].toLowerCase();
      if (section === 'include' || section === 'includeif') {
        throw unsafeGitMetadata();
      }
      if (!remainder || remainder.startsWith('#') || remainder.startsWith(';')) continue;
      variableLine = remainder;
    }

    const key = variableLine.split(/[=\s]/, 1)[0].toLowerCase();
    if (
      (section === 'core' && (
        key === 'worktree' ||
        key === 'excludesfile' ||
        key === 'attributesfile'
      )) ||
      (section === 'extensions' && (key === 'worktreeconfig' || key === 'partialclone')) ||
      (section === 'remote' && key === 'promisor')
    ) {
      throw unsafeGitMetadata();
    }
  }
}

async function rejectMetadataSymlinks(startPath, maximumEntries) {
  const startStats = await optionalStats(startPath);
  if (!startStats) return;
  if (startStats.isSymbolicLink()) throw unsafeGitMetadata();
  if (!startStats.isDirectory()) return;

  const pending = [startPath];
  let visited = 0;
  while (pending.length > 0) {
    const directory = pending.pop();
    let handle;
    try {
      handle = await opendir(directory);
      for await (const entry of handle) {
        visited += 1;
        if (visited > maximumEntries) {
          throw new OpenReadyError(
            'SCAN_LIMIT_EXCEEDED',
            'Scan safety limits were exceeded. No partial result was reported.',
          );
        }
        const entryPath = path.join(directory, entry.name);
        const stats = await lstat(entryPath);
        if (stats.isSymbolicLink()) throw unsafeGitMetadata();
        if (stats.isDirectory()) {
          pending.push(entryPath);
        } else if (!stats.isFile() && !stats.isSocket()) {
          throw unsafeGitMetadata();
        }
      }
    } catch (error) {
      if (error instanceof OpenReadyError) throw error;
      throw unsafeGitMetadata();
    }
  }
}

async function rejectRedirectFile(targetPath) {
  const stats = await optionalStats(targetPath);
  if (!stats) return;
  if (stats.isSymbolicLink() || !stats.isFile() || stats.size > 0) {
    throw unsafeGitMetadata();
  }
}

async function preflightGitMetadata(root, limits) {
  const metadataRoot = path.join(root, '.git');
  await rejectMetadataSymlinks(metadataRoot, limits.maximumEntries);
  const config = await readBoundedFile(path.join(metadataRoot, 'config'), MAX_GIT_CONFIG_BYTES);
  rejectUnsafeConfig(config.toString('utf8'));

  await rejectRedirectFile(path.join(metadataRoot, 'commondir'));
  await rejectRedirectFile(path.join(metadataRoot, 'config.worktree'));
  await rejectRedirectFile(path.join(metadataRoot, 'objects', 'info', 'alternates'));
  await rejectRedirectFile(path.join(metadataRoot, 'objects', 'info', 'http-alternates'));

  for (const relativePath of ['HEAD', 'index', 'packed-refs', 'info/exclude']) {
    const stats = await optionalStats(path.join(metadataRoot, relativePath));
    if (stats && (stats.isSymbolicLink() || !stats.isFile())) throw unsafeGitMetadata();
  }
}

function scanNulRecords(buffer, maximumEntries) {
  let records = 0;
  for (const byte of buffer) {
    if (byte !== 0) continue;
    records += 1;
    if (records > maximumEntries) {
      throw new OpenReadyError(
        'SCAN_LIMIT_EXCEEDED',
        'Scan safety limits were exceeded. No partial result was reported.',
      );
    }
  }
  if (buffer.length > 0 && buffer[buffer.length - 1] !== 0) throw unsafeGitMetadata();
}

function decodeGitPathOutput(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  } catch {
    throw new OpenReadyError(
      'GIT_PATH_ENCODING_UNSUPPORTED',
      'Git path output was not valid UTF-8, so the scan stopped without a partial result.',
    );
  }
}

function parseNulPaths(buffer, maximumEntries) {
  scanNulRecords(buffer, maximumEntries);
  return decodeGitPathOutput(buffer)
    .split('\u0000')
    .filter(Boolean)
    .map(normalizeRelativePath);
}

function parseIndexEntries(buffer, maximumEntries) {
  const entries = new Map();
  const unmergedPaths = new Set();
  scanNulRecords(buffer, maximumEntries);
  const decoded = decodeGitPathOutput(buffer);

  for (const record of decoded.split('\u0000')) {
    if (!record) continue;
    const tabIndex = record.indexOf('\t');
    if (tabIndex < 0) throw unsafeGitMetadata();
    const metadata = record.slice(0, tabIndex).split(' ');
    const findingPath = normalizeRelativePath(record.slice(tabIndex + 1));
    const [mode, objectId, stage] = metadata;
    if (!/^[0-7]{6}$/.test(mode) || !/^[0-9a-f]{40,64}$/i.test(objectId)) {
      throw unsafeGitMetadata();
    }
    if (stage === '0') {
      entries.set(findingPath, { mode, objectId });
    } else {
      unmergedPaths.add(findingPath);
    }
  }
  return { entries, unmergedPaths };
}

function parseAuthors(buffer) {
  let hasNames = false;
  let hasEmails = false;
  let fieldIndex = 0;
  let fieldStart = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    let hasNonWhitespace = false;
    for (let byteIndex = fieldStart; byteIndex < index; byteIndex += 1) {
      if (![0x09, 0x0a, 0x0d, 0x20].includes(buffer[byteIndex])) {
        hasNonWhitespace = true;
        break;
      }
    }
    if (fieldIndex % 2 === 0 && hasNonWhitespace) hasNames = true;
    if (fieldIndex % 2 === 1 && hasNonWhitespace) hasEmails = true;
    fieldIndex += 1;
    fieldStart = index + 1;
    if (hasNames && hasEmails) break;
  }

  return { hasNames, hasEmails };
}

function indexBlobEntries(indexEntries) {
  return [...indexEntries.entries()]
    .filter(([, entry]) => entry.mode.startsWith('100') || entry.mode === '120000')
    .sort(([left], [right]) => left.localeCompare(right, 'en'));
}

function attachIndexBlobSizes(root, indexEntries, limits) {
  const relevantEntries = indexBlobEntries(indexEntries);
  const objectIds = [...new Set(relevantEntries.map(([, entry]) => entry.objectId))];
  if (objectIds.length === 0) return indexEntries;

  const input = Buffer.from(`${objectIds.join('\n')}\n`, 'ascii');
  const output = runGit(
    root,
    ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    limits,
    { input },
  ).toString('ascii');
  const lines = output.endsWith('\n') ? output.slice(0, -1).split('\n') : output.split('\n');
  if (lines.length !== objectIds.length) throw unsafeGitMetadata();

  const sizes = new Map();
  for (let index = 0; index < objectIds.length; index += 1) {
    const match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(lines[index]);
    const expectedObjectId = objectIds[index].toLowerCase();
    if (!match || match[1].toLowerCase() !== expectedObjectId) throw unsafeGitMetadata();
    const size = Number(match[2]);
    if (!Number.isSafeInteger(size)) throw unsafeGitMetadata();
    sizes.set(expectedObjectId, size);
  }

  return new Map(
    [...indexEntries].map(([findingPath, entry]) => [
      findingPath,
      sizes.has(entry.objectId.toLowerCase())
        ? { ...entry, size: sizes.get(entry.objectId.toLowerCase()) }
        : entry,
    ]),
  );
}

export function indexContentScanLimit(limits) {
  return Math.min(limits.contentScanBytes, Math.max(0, Math.floor(limits.gitMaxBufferBytes / 2)));
}

function parseBatchBlobs(output, requested) {
  const blobs = new Map();
  let offset = 0;

  for (const request of requested) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw unsafeGitMetadata();
    const header = output.subarray(offset, headerEnd).toString('ascii');
    const match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(header);
    if (
      !match ||
      match[1].toLowerCase() !== request.objectId.toLowerCase() ||
      Number(match[2]) !== request.size
    ) {
      throw unsafeGitMetadata();
    }

    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + request.size;
    if (contentEnd >= output.length || output[contentEnd] !== 0x0a) {
      throw unsafeGitMetadata();
    }
    blobs.set(request.objectId.toLowerCase(), output.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }

  if (offset !== output.length) throw unsafeGitMetadata();
  return blobs;
}

export function* readIndexBlobs(root, indexEntries, limits) {
  const maximumBlobBytes = indexContentScanLimit(limits);
  const byObjectId = new Map();
  for (const [findingPath, entry] of indexBlobEntries(indexEntries)) {
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) throw unsafeGitMetadata();
    if (entry.size > maximumBlobBytes) continue;
    const objectId = entry.objectId.toLowerCase();
    const existing = byObjectId.get(objectId);
    if (existing) {
      existing.paths.push({ path: findingPath, mode: entry.mode });
    } else {
      byObjectId.set(objectId, {
        objectId,
        size: entry.size,
        paths: [{ path: findingPath, mode: entry.mode }],
      });
    }
  }

  const chunkBudget = Math.max(1, Math.floor(limits.gitMaxBufferBytes / 2));
  let chunk = [];
  let chunkBytes = 0;

  function flushChunk() {
    if (chunk.length === 0) return [];
    const input = Buffer.from(`${chunk.map((entry) => entry.objectId).join('\n')}\n`, 'ascii');
    const output = runGit(root, ['cat-file', '--batch'], limits, { input });
    const blobs = parseBatchBlobs(output, chunk);
    const result = chunk.map((entry) => ({
      ...entry,
      buffer: blobs.get(entry.objectId),
    }));
    chunk = [];
    chunkBytes = 0;
    return result;
  }

  for (const entry of byObjectId.values()) {
    const estimatedBytes = entry.size + 160;
    if (chunk.length > 0 && chunkBytes + estimatedBytes > chunkBudget) {
      yield* flushChunk();
    }
    chunk.push(entry);
    chunkBytes += estimatedBytes;
  }
  yield* flushChunk();
}

export async function inspectGit(root, limits) {
  const metadataPath = path.join(root, '.git');
  let metadata;

  try {
    metadata = await lstat(metadataPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { isGit: false, unsupportedMetadata: false };
    }
    throw new OpenReadyError('GIT_METADATA_UNREADABLE', 'Git metadata could not be inspected.');
  }

  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    return { isGit: false, unsupportedMetadata: true };
  }

  let metadataRealPath;
  try {
    metadataRealPath = await realpath(metadataPath);
  } catch {
    throw unsafeGitMetadata();
  }
  if (path.dirname(metadataRealPath) !== root) {
    return { isGit: false, unsupportedMetadata: true };
  }

  await preflightGitMetadata(root, limits);

  const tracked = parseNulPaths(
    runGit(root, ['ls-files', '--cached', '-z', '--', '.'], limits),
    limits.maximumEntries,
  );
  const candidates = parseNulPaths(
    runGit(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'], limits),
    limits.maximumEntries,
  );
  const parsedIndex = parseIndexEntries(
    runGit(root, ['ls-files', '--stage', '-z', '--', '.'], limits),
    limits.maximumEntries,
  );
  if (
    candidates.length > limits.maximumEntries ||
    parsedIndex.entries.size > limits.maximumEntries
  ) {
    throw new OpenReadyError(
      'SCAN_LIMIT_EXCEEDED',
      'Scan safety limits were exceeded. No partial result was reported.',
    );
  }
  const indexEntries = attachIndexBlobSizes(root, parsedIndex.entries, limits);
  const authors = parseAuthors(
    runGit(
      root,
      ['log', '--no-show-signature', '--all', '--format=%an%x00%ae%x00'],
      limits,
    ),
  );

  return {
    isGit: true,
    unsupportedMetadata: false,
    trackedPaths: new Set(tracked),
    candidatePaths: [...new Set(candidates)].sort((left, right) => left.localeCompare(right, 'en')),
    indexEntries,
    unmergedPaths: parsedIndex.unmergedPaths,
    hasAuthorNames: authors.hasNames,
    hasAuthorEmails: authors.hasEmails,
  };
}
