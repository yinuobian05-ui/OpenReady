import path from 'node:path';
import { SECRET_MARKER_PATTERN, TOKEN_PATTERN_DEFINITIONS } from './sensitive-patterns.js';

const SENSITIVE_PATH_PATTERNS = Object.freeze([
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/gi,
  ...TOKEN_PATTERN_DEFINITIONS.map(
    ({ source, flags }) => new RegExp(source, `${flags}g`),
  ),
]);
const SECRET_ASSIGNMENT_IN_PATH = new RegExp(
  String.raw`((?:${SECRET_MARKER_PATTERN})\s*[:=]\s*)[^/]+`,
  'gi',
);

export function toPortablePath(value) {
  return value.split(path.sep).join('/');
}

export function sanitizeDisplayPath(value) {
  const portable = toPortablePath(value || '.');
  let safe = portable.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '?');
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    safe = safe.replace(pattern, '[REDACTED]');
  }
  safe = safe.replace(SECRET_ASSIGNMENT_IN_PATH, '$1[REDACTED]');
  return safe || '.';
}

export function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

export function resolveContained(root, relativePath) {
  if (path.isAbsolute(relativePath)) {
    return null;
  }

  const candidate = path.resolve(root, relativePath);
  return isContained(root, candidate) ? candidate : null;
}

export function normalizeRelativePath(value) {
  const normalized = path.normalize(value);
  const withoutDot = normalized.startsWith(`.${path.sep}`) ? normalized.slice(2) : normalized;
  return toPortablePath(withoutDot);
}
