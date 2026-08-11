import path from 'node:path';

export const RULES = Object.freeze({
  'OR-SEC-001': Object.freeze({
    severity: 'BLOCKER',
    description: 'Environment file may contain credentials and should not be published.',
  }),
  'OR-SEC-002': Object.freeze({
    severity: 'BLOCKER',
    description: 'Private-key or keystore filename requires removal or explicit security review.',
  }),
  'OR-SEC-003': Object.freeze({
    severity: 'BLOCKER',
    description: 'Credential-class filename may expose authentication material.',
  }),
  'OR-SEC-004': Object.freeze({
    severity: 'BLOCKER',
    description: 'Private-key header detected; the matched content is intentionally hidden.',
  }),
  'OR-SEC-005': Object.freeze({
    severity: 'BLOCKER',
    description: 'Secret-like assignment detected; the assigned value is intentionally hidden.',
  }),
  'OR-SEC-006': Object.freeze({
    severity: 'BLOCKER',
    description: 'Credential token pattern detected; the matched value is intentionally hidden.',
  }),
  'OR-SEC-007': Object.freeze({
    severity: 'WARNING',
    description: 'Certificate or authentication configuration file needs manual review.',
  }),
  'OR-PRIV-001': Object.freeze({
    severity: 'WARNING',
    description: 'User-home absolute path detected; local identity or machine layout may be exposed.',
  }),
  'OR-PRIV-002': Object.freeze({
    severity: 'WARNING',
    description: 'Email address detected; confirm that publishing it is intentional.',
  }),
  'OR-META-001': Object.freeze({
    severity: 'WARNING',
    description: 'Reachable commits contain author names; confirm those identities may be public.',
  }),
  'OR-META-002': Object.freeze({
    severity: 'WARNING',
    description: 'Reachable commits contain author emails; confirm those identities may be public.',
  }),
  'OR-META-003': Object.freeze({
    severity: 'WARNING',
    description: 'Historical Git file contents were not scanned; use a history-aware secret scanner too.',
  }),
  'OR-ART-001': Object.freeze({
    severity: 'WARNING',
    description: 'Large file may be costly to review, clone, and host.',
  }),
  'OR-ART-002': Object.freeze({
    severity: 'BLOCKER',
    description: 'Oversized file is unsuitable for a normal source repository without deliberate handling.',
  }),
  'OR-ART-003': Object.freeze({
    severity: 'WARNING',
    description: 'Archive may hide unreviewed files or personal data.',
  }),
  'OR-ART-004': Object.freeze({
    severity: 'WARNING',
    description: 'Database file may contain records, credentials, or personal information.',
  }),
  'OR-ART-005': Object.freeze({
    severity: 'WARNING',
    description: 'Media file may contain people, locations, voices, or identifying metadata.',
  }),
  'OR-GOV-001': Object.freeze({
    severity: 'WARNING',
    description: 'README is missing from the repository root.',
  }),
  'OR-GOV-002': Object.freeze({
    severity: 'WARNING',
    description: 'License file is missing from the repository root.',
  }),
  'OR-GOV-003': Object.freeze({
    severity: 'WARNING',
    description: 'Security policy is missing from the root, docs, or repository metadata directory.',
  }),
  'OR-GOV-004': Object.freeze({
    severity: 'INFO',
    description: 'Contributing guide is missing from the root, docs, or repository metadata directory.',
  }),
  'OR-HYG-001': Object.freeze({
    severity: 'WARNING',
    description: 'Log, crash, or diagnostic artifact should be reviewed before publication.',
  }),
  'OR-HYG-002': Object.freeze({
    severity: 'WARNING',
    description: 'Backup or temporary file should be removed or explicitly justified.',
  }),
  'OR-BND-001': Object.freeze({
    severity: 'INFO',
    description: 'Symlink was reported but not opened or traversed.',
  }),
  'OR-BND-002': Object.freeze({
    severity: 'WARNING',
    description: 'Symlink points outside the scan root and was not opened or traversed.',
  }),
  'OR-BND-003': Object.freeze({
    severity: 'INFO',
    description: 'Binary file content was not inspected by text rules.',
  }),
  'OR-BND-004': Object.freeze({
    severity: 'WARNING',
    description: 'Entry could not be read reliably, so its content was not fully scanned.',
  }),
  'OR-BND-005': Object.freeze({
    severity: 'INFO',
    description: 'No supported Git metadata directory was found; filesystem checks still ran.',
  }),
  'OR-BND-006': Object.freeze({
    severity: 'INFO',
    description: 'File exceeded the text-content scan limit; filename, type, and size checks still ran.',
  }),
  'OR-BND-007': Object.freeze({
    severity: 'INFO',
    description: 'Gitlink or nested repository entry was not traversed.',
  }),
  'OR-BND-008': Object.freeze({
    severity: 'INFO',
    description: 'Git metadata exists in an unsupported form and was not followed outside the scan root.',
  }),
  'OR-BND-009': Object.freeze({
    severity: 'INFO',
    description: 'Tracked path is absent from the current working tree; content could not be inspected.',
  }),
  'OR-BND-010': Object.freeze({
    severity: 'INFO',
    description: 'Special filesystem entry was not opened or traversed.',
  }),
  'OR-BND-011': Object.freeze({
    severity: 'INFO',
    description: 'Current Git index blobs were scanned separately from the working tree.',
  }),
  'OR-BND-012': Object.freeze({
    severity: 'BLOCKER',
    description: 'Unmerged Git index entries prevent a reliable publication-readiness scan.',
  }),
});

const PRIVATE_KEY_BASENAMES = new Set([
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
]);

const PRIVATE_KEY_EXTENSIONS = new Set([
  '.key',
  '.p12',
  '.pfx',
  '.jks',
  '.keystore',
]);

const REVIEW_AUTH_EXTENSIONS = new Set(['.pem', '.crt', '.cer', '.der']);
const REVIEW_AUTH_BASENAMES = new Set(['.npmrc', '.pypirc', '.netrc', 'kubeconfig']);
const ARCHIVE_EXTENSIONS = new Set([
  '.zip', '.7z', '.rar', '.tar', '.tgz', '.gz', '.bz2', '.xz', '.zst',
]);
const DATABASE_EXTENSIONS = new Set([
  '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb', '.rdb',
]);
const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.tif', '.tiff', '.dng',
  '.mov', '.mp4', '.m4v', '.avi', '.mkv', '.webm',
  '.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg',
]);

function isExampleLike(baseName) {
  return /(?:^|[._-])(example|sample|template|dist|dummy|test)(?:[._-]|$)/i.test(baseName);
}

function isEnvironmentFile(baseName) {
  const lower = baseName.toLowerCase();
  return (lower === '.env' || lower.startsWith('.env.')) && !isExampleLike(lower);
}

function isCredentialFile(relativePath, baseName) {
  if (isExampleLike(baseName)) {
    return false;
  }

  const lowerPath = relativePath.toLowerCase();
  const lowerBase = baseName.toLowerCase();
  return (
    lowerBase === 'credentials' ||
    lowerBase === 'credentials.json' ||
    lowerBase === 'auth.json' ||
    /^service-account[^/]*\.json$/i.test(lowerBase) ||
    /^secrets?\.(json|ya?ml|toml)$/i.test(lowerBase) ||
    lowerPath === '.aws/credentials' ||
    lowerPath.endsWith('/.aws/credentials') ||
    lowerPath === 'application_default_credentials.json' ||
    lowerPath.endsWith('/application_default_credentials.json')
  );
}

export function fileRuleIds(entry, limits) {
  const ids = [];
  const baseName = path.posix.basename(entry.path);
  const lowerBase = baseName.toLowerCase();
  const extension = path.posix.extname(lowerBase);

  if (isEnvironmentFile(baseName)) {
    ids.push('OR-SEC-001');
  }
  if (PRIVATE_KEY_BASENAMES.has(lowerBase) || PRIVATE_KEY_EXTENSIONS.has(extension)) {
    ids.push('OR-SEC-002');
  }
  if (isCredentialFile(entry.path, baseName)) {
    ids.push('OR-SEC-003');
  }
  if (REVIEW_AUTH_EXTENSIONS.has(extension) || REVIEW_AUTH_BASENAMES.has(lowerBase)) {
    ids.push('OR-SEC-007');
  }

  if (entry.kind === 'file') {
    if (entry.size >= limits.oversizedFileBytes) {
      ids.push('OR-ART-002');
    } else if (entry.size >= limits.largeFileBytes) {
      ids.push('OR-ART-001');
    }
  }

  if (ARCHIVE_EXTENSIONS.has(extension)) {
    ids.push('OR-ART-003');
  }
  if (DATABASE_EXTENSIONS.has(extension)) {
    ids.push('OR-ART-004');
  }
  if (MEDIA_EXTENSIONS.has(extension)) {
    ids.push('OR-ART-005');
  }
  if (
    /\.log(?:\.\d+)?$/i.test(lowerBase) ||
    /^(?:npm|yarn|pnpm)-(?:debug|error)\.log$/i.test(lowerBase) ||
    /\.(?:dmp|stackdump|crash)$/i.test(lowerBase) ||
    lowerBase === 'core'
  ) {
    ids.push('OR-HYG-001');
  }
  if (/~$|\.(?:bak|backup|old|orig|swp|swo|tmp)$/i.test(lowerBase)) {
    ids.push('OR-HYG-002');
  }

  return ids;
}

const PRIVATE_KEY_HEADER = /-----BEGIN (?:(?:RSA|DSA|EC|OPENSSH|ENCRYPTED) PRIVATE KEY|PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/i;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/i;
const MAC_HOME_PATH = /\/Users\/[^/\r\n"'`]+(?=\/|["'`]|$)/;
const LINUX_HOME_PATH = /\/home\/[^/\r\n"'`]+(?=\/|["'`]|$)/;
const WINDOWS_HOME_PATH = /[A-Z]:\\+Users\\+[^\\\r\n"'`]+(?=\\|["'`]|$)/i;
const WINDOWS_HOME_FORWARD_PATH = /[A-Z]:\/Users\/[^/\r\n"'`]+(?=\/|["'`]|$)/i;
const SECRET_MARKER_PATTERN = String.raw`(?:api[_-]?key|access[_-]?token|auth[_-]?token|service[_-]?token|client[_-]?secret|secret[_-]?key|aws_secret_access_key|github_token|npm_token|_auth_token|_authtoken|password|passwd|token|secret)`;
const SECRET_KEY_PATTERN = String.raw`[A-Za-z0-9_-]*${SECRET_MARKER_PATTERN}`;
const SECRET_ASSIGNMENT = new RegExp(
  String.raw`(?<![A-Za-z0-9_-])(?:["'\x60])?` +
    SECRET_KEY_PATTERN +
    String.raw`(?![A-Za-z0-9_-])(?:["'\x60])?\s*[:=]\s*(?:"([^"\r\n]{6,})"|'([^'\r\n]{6,})'|\x60([^\x60\r\n]{6,})\x60|([^\s#;,"'\x60]{6,}))`,
  'gi',
);
const TOKEN_PATTERNS = Object.freeze([
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b/i,
]);

function looksLikePlaceholder(value) {
  const raw = value.trim();
  const normalized = raw.replace(/[)}\]]+$/g, '');
  return (
    /^\$(?:\{[A-Za-z_][A-Za-z0-9_]*\}|[A-Za-z_][A-Za-z0-9_]*)$/.test(raw) ||
    /^(?:process|deno|bun)\.env\b/i.test(normalized) ||
    /^os\.environ\b/i.test(normalized) ||
    /^(?:[A-Za-z_$][\w$]*\.)+[A-Za-z_$][\w$]*\($/.test(normalized) ||
    /^(?:[A-Za-z_$][\w$]*\.)+[A-Za-z_$][\w$]*\([^)]*\)$/.test(raw) ||
    /^<[^>]+>$/.test(normalized) ||
    /^\*+$/.test(normalized) ||
    /^(?:change[-_]?me|replace[-_]?me|example|sample|placeholder|dummy|test|todo|none|null|undefined|redacted)$/i.test(normalized) ||
    /^(?:example|sample|placeholder|dummy|test|your)[-_][A-Za-z0-9_-]+$/i.test(normalized)
  );
}

export function contentRuleIds(line) {
  const ids = [];

  if (PRIVATE_KEY_HEADER.test(line)) {
    ids.push('OR-SEC-004');
  }

  SECRET_ASSIGNMENT.lastIndex = 0;
  let assignment;
  while ((assignment = SECRET_ASSIGNMENT.exec(line)) !== null) {
    const assignedValue = assignment.slice(1).find((value) => value !== undefined);
    if (assignedValue && !looksLikePlaceholder(assignedValue)) {
      ids.push('OR-SEC-005');
      break;
    }
  }

  if (TOKEN_PATTERNS.some((pattern) => pattern.test(line))) {
    ids.push('OR-SEC-006');
  }
  if (
    MAC_HOME_PATH.test(line) ||
    LINUX_HOME_PATH.test(line) ||
    WINDOWS_HOME_PATH.test(line) ||
    WINDOWS_HOME_FORWARD_PATH.test(line)
  ) {
    ids.push('OR-PRIV-001');
  }
  if (EMAIL_ADDRESS.test(line)) {
    ids.push('OR-PRIV-002');
  }

  return ids;
}

export function governanceFindings(entries) {
  const available = new Set(
    entries
      .filter((entry) => entry.kind === 'file')
      .map((entry) => entry.path.toLowerCase()),
  );
  const rootFiles = new Set(
    [...available].filter((entryPath) => !entryPath.includes('/')),
  );
  const findings = [];

  if (![...rootFiles].some((file) => /^readme(?:\.|$)/i.test(file))) {
    findings.push({ ruleId: 'OR-GOV-001', path: 'README.md' });
  }
  if (![...rootFiles].some((file) => /^(?:license|licence|copying)(?:\.|$)/i.test(file))) {
    findings.push({ ruleId: 'OR-GOV-002', path: 'LICENSE' });
  }
  if (![...available].some((file) => /^(?:\.github\/|docs\/)?security(?:\.|$)/i.test(file))) {
    findings.push({ ruleId: 'OR-GOV-003', path: 'SECURITY.md' });
  }
  if (![...available].some((file) => /^(?:\.github\/|docs\/)?contributing(?:\.|$)/i.test(file))) {
    findings.push({ ruleId: 'OR-GOV-004', path: 'CONTRIBUTING.md' });
  }

  return findings;
}
