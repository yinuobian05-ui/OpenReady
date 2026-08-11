import { lstat, opendir, readlink } from 'node:fs/promises';
import path from 'node:path';
import { OpenReadyError } from './errors.js';
import {
  isContained,
  normalizeRelativePath,
  resolveContained,
} from './path-utils.js';

async function classifySymlink(root, absolutePath) {
  let target;
  try {
    target = await readlink(absolutePath);
    const lexicalTarget = path.resolve(path.dirname(absolutePath), target);
    return { external: !isContained(root, lexicalTarget), target };
  } catch {
    return { external: false, target: null };
  }
}

export function isExternalSymlinkTarget(root, relativePath, target) {
  const parentSegments = relativePath.split('/').slice(0, -1);
  const linkParent = path.join(root, ...parentSegments);
  return !isContained(root, path.resolve(linkParent, target));
}

async function findParentSymlink(root, relativePath) {
  const segments = relativePath.split('/');
  let current = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    current = path.join(current, segments[index]);
    let stats;
    try {
      stats = await lstat(current);
    } catch {
      return null;
    }
    if (stats.isSymbolicLink()) {
      const inspected = await classifySymlink(root, current);
      return {
        path: segments.slice(0, index + 1).join('/'),
        absolutePath: current,
        ...inspected,
      };
    }
    if (!stats.isDirectory()) {
      return null;
    }
  }
  return null;
}

async function describePath(root, relativePath, tracked) {
  const absolutePath = resolveContained(root, relativePath);
  if (!absolutePath) {
    throw new OpenReadyError('PATH_ESCAPES_ROOT', 'A repository path escaped the scan root.');
  }

  const parentSymlink = await findParentSymlink(root, relativePath);
  if (parentSymlink) {
    return { kind: 'symlink', tracked, ...parentSymlink };
  }

  try {
    const stats = await lstat(absolutePath);
    if (stats.isSymbolicLink()) {
      const inspected = await classifySymlink(root, absolutePath);
      return { kind: 'symlink', path: relativePath, absolutePath, tracked, ...inspected };
    }
    if (stats.isFile()) {
      return {
        kind: 'file',
        path: relativePath,
        absolutePath,
        tracked,
        size: stats.size,
        device: stats.dev,
        inode: stats.ino,
      };
    }
    if (stats.isDirectory()) {
      return { kind: 'directory', path: relativePath, absolutePath, tracked };
    }
    return { kind: 'special', path: relativePath, absolutePath, tracked };
  } catch (error) {
    if (error.code === 'ENOENT' && tracked) {
      return { kind: 'missing', path: relativePath, absolutePath, tracked };
    }
    return { kind: 'unreadable', path: relativePath, absolutePath, tracked };
  }
}

export async function enumerateGitEntries(root, candidatePaths, trackedPaths) {
  const entries = [];
  for (const candidatePath of candidatePaths) {
    const relativePath = normalizeRelativePath(candidatePath);
    entries.push(await describePath(root, relativePath, trackedPaths.has(relativePath)));
  }
  return entries;
}

export async function enumerateFilesystemEntries(root, maximumEntries = Number.POSITIVE_INFINITY) {
  const entries = [];
  let discoveredEntries = 0;

  function decodeEntryName(name) {
    if (typeof name === 'string') return name;
    const decoded = name.toString('utf8');
    if (!Buffer.from(decoded, 'utf8').equals(name)) {
      throw new OpenReadyError(
        'PATH_ENCODING_UNSUPPORTED',
        'A filesystem path was not valid UTF-8, so the scan stopped without a partial result.',
      );
    }
    return decoded;
  }

  async function visit(directory, relativeDirectory) {
    let handle;
    try {
      handle = await opendir(directory, { encoding: 'buffer' });
    } catch (error) {
      if (relativeDirectory === '') {
        throw new OpenReadyError('SCAN_ROOT_UNREADABLE', 'The scan root could not be enumerated.');
      }
      entries.push({
        kind: 'unreadable',
        path: normalizeRelativePath(relativeDirectory),
        absolutePath: directory,
        tracked: false,
      });
      return;
    }

    for await (const directoryEntry of handle) {
      const entryName = decodeEntryName(directoryEntry.name);
      if (entryName === '.git') {
        continue;
      }
      discoveredEntries += 1;
      if (discoveredEntries > maximumEntries) {
        throw new OpenReadyError(
          'SCAN_LIMIT_EXCEEDED',
          'Scan safety limits were exceeded. No partial result was reported.',
        );
      }

      const relativePath = relativeDirectory
        ? path.join(relativeDirectory, entryName)
        : entryName;
      const normalizedPath = normalizeRelativePath(relativePath);
      const described = await describePath(root, normalizedPath, false);

      if (described.kind === 'directory') {
        await visit(described.absolutePath, relativePath);
      } else {
        entries.push(described);
      }
    }
  }

  await visit(root, '');
  return entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));
}
