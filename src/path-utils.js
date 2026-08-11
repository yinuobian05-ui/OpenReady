import path from 'node:path';

export function toPortablePath(value) {
  return value.split(path.sep).join('/');
}

export function sanitizeDisplayPath(value) {
  const portable = toPortablePath(value || '.');
  return portable.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '?') || '.';
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
