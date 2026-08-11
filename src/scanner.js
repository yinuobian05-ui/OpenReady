import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_LIMITS, TOOL_NAME, VERSION } from './constants.js';
import { scanBufferContent, scanFileContent } from './content-scanner.js';
import { OpenReadyError } from './errors.js';
import {
  enumerateFilesystemEntries,
  enumerateGitEntries,
  isExternalSymlinkTarget,
} from './files.js';
import { FindingCollector, summarize } from './findings.js';
import { indexContentScanLimit, inspectGit, readIndexBlobs } from './git.js';
import { fileRuleIds, governanceFindings } from './rules.js';

async function validateRoot(inputPath) {
  const requestedRoot = path.resolve(inputPath);
  let stats;
  try {
    stats = await lstat(requestedRoot);
  } catch {
    throw new OpenReadyError('SCAN_ROOT_NOT_FOUND', 'The scan path does not exist or is not accessible.');
  }

  if (stats.isSymbolicLink()) {
    throw new OpenReadyError('SCAN_ROOT_SYMLINK', 'The scan root itself must not be a symlink.');
  }
  if (!stats.isDirectory()) {
    throw new OpenReadyError('SCAN_ROOT_NOT_DIRECTORY', 'The scan path must be a directory.');
  }

  try {
    return await realpath(requestedRoot);
  } catch {
    throw new OpenReadyError('SCAN_ROOT_UNREADABLE', 'The scan root could not be resolved.');
  }
}

export async function scanRepository(inputPath = '.', options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const root = await validateRoot(inputPath);
  const collector = new FindingCollector(limits.maximumFindings);
  const add = collector.add.bind(collector);
  const git = await inspectGit(root, limits);
  let reservedContentBytes = 0;

  function reserveContent(bytes) {
    reservedContentBytes += bytes;
    if (
      !Number.isSafeInteger(reservedContentBytes) ||
      reservedContentBytes > limits.totalContentScanBytes
    ) {
      throw new OpenReadyError(
        'SCAN_LIMIT_EXCEEDED',
        'Scan safety limits were exceeded. No partial result was reported.',
      );
    }
  }

  let entries;
  if (git.isGit) {
    if (
      git.candidatePaths.length > limits.maximumEntries ||
      git.indexEntries.size > limits.maximumEntries
    ) {
      throw new OpenReadyError(
        'SCAN_LIMIT_EXCEEDED',
        'Scan safety limits were exceeded. No partial result was reported.',
      );
    }
    entries = await enumerateGitEntries(root, git.candidatePaths, git.trackedPaths);
    collector.add('OR-META-003', '.git');
    if (git.hasAuthorNames) collector.add('OR-META-001', '.git');
    if (git.hasAuthorEmails) collector.add('OR-META-002', '.git');
    for (const findingPath of git.unmergedPaths) {
      collector.add('OR-BND-012', findingPath);
    }
    for (const [findingPath, indexEntry] of git.indexEntries) {
      if (indexEntry.mode === '160000') collector.add('OR-BND-007', findingPath);
    }
  } else {
    entries = await enumerateFilesystemEntries(root, limits.maximumEntries);
    collector.add('OR-BND-005', '.');
    if (git.unsupportedMetadata) collector.add('OR-BND-008', '.git');
  }

  for (const entry of entries) {
    for (const ruleId of fileRuleIds(entry, limits)) {
      collector.add(ruleId, entry.path);
    }

    if (entry.kind === 'symlink') {
      collector.add(entry.external ? 'OR-BND-002' : 'OR-BND-001', entry.path);
      if (typeof entry.target === 'string') {
        reserveContent(Buffer.byteLength(entry.target, 'utf8'));
        scanBufferContent(Buffer.from(entry.target, 'utf8'), entry.path, add);
      } else {
        collector.add('OR-BND-004', entry.path);
      }
      continue;
    }
    if (entry.kind === 'missing') {
      collector.add('OR-BND-009', entry.path);
      continue;
    }
    if (entry.kind === 'unreadable') {
      collector.add('OR-BND-004', entry.path);
      continue;
    }
    if (entry.kind === 'directory') {
      collector.add('OR-BND-007', entry.path);
      continue;
    }
    if (entry.kind === 'special') {
      collector.add('OR-BND-010', entry.path);
      continue;
    }

    reserveContent(
      entry.size <= limits.contentScanBytes
        ? entry.size
        : Math.min(entry.size, limits.binaryProbeBytes),
    );
    await scanFileContent(entry, root, limits, add);
  }

  if (git.isGit) {
    const indexEntries = [...git.indexEntries.entries()]
      .filter(([, entry]) => entry.mode.startsWith('100') || entry.mode === '120000')
      .sort(([left], [right]) => left.localeCompare(right, 'en'));
    if (indexEntries.length > 0) collector.add('OR-BND-011', '.git');

    const maximumIndexContentBytes = indexContentScanLimit(limits);
    for (const [findingPath, indexEntry] of indexEntries) {
      for (const ruleId of fileRuleIds(
        { kind: 'file', path: findingPath, size: indexEntry.size },
        limits,
      )) {
        collector.add(ruleId, findingPath);
      }
      if (indexEntry.size > maximumIndexContentBytes) {
        collector.add('OR-BND-006', findingPath);
      } else {
        reserveContent(indexEntry.size);
      }
    }

    for (const staged of readIndexBlobs(root, git.indexEntries, limits)) {
      for (const indexedPath of staged.paths) {
        scanBufferContent(staged.buffer, indexedPath.path, add);
        if (indexedPath.mode === '120000') {
          const target = staged.buffer.toString('utf8');
          collector.add(
            isExternalSymlinkTarget(root, indexedPath.path, target)
              ? 'OR-BND-002'
              : 'OR-BND-001',
            indexedPath.path,
          );
        }
      }
    }
  }

  const governanceEntries = git.isGit
    ? [
        ...entries,
        ...[...git.indexEntries.entries()]
          .filter(([, entry]) => entry.mode.startsWith('100'))
          .map(([findingPath]) => ({ kind: 'file', path: findingPath })),
      ]
    : entries;
  for (const finding of governanceFindings(governanceEntries)) {
    collector.add(finding.ruleId, finding.path);
  }

  const findings = collector.sorted();
  const summary = summarize(findings);
  return Object.freeze({
    tool: TOOL_NAME,
    version: VERSION,
    root: '.',
    status: summary.blockers > 0 ? 'BLOCKED' : 'READY',
    summary: Object.freeze(summary),
    findings: Object.freeze(findings),
  });
}
