export const SECRET_MARKER_PATTERN = String.raw`(?:api[_-]?key|access[_-]?token|auth[_-]?token|service[_-]?token|client[_-]?secret|secret[_-]?key|aws_secret_access_key|github_token|npm_token|_auth_token|_authtoken|password|passwd|token|secret)`;

export const TOKEN_PATTERN_DEFINITIONS = Object.freeze([
  Object.freeze({ source: String.raw`\bAKIA[0-9A-Z]{16}\b`, flags: '' }),
  Object.freeze({ source: String.raw`\bgh[pousr]_[A-Za-z0-9]{30,}\b`, flags: '' }),
  Object.freeze({ source: String.raw`\bgithub_pat_[A-Za-z0-9_]{40,}\b`, flags: '' }),
  Object.freeze({ source: String.raw`\bxox[baprs]-[A-Za-z0-9-]{20,}\b`, flags: '' }),
  Object.freeze({ source: String.raw`\bsk_live_[A-Za-z0-9]{16,}\b`, flags: '' }),
  Object.freeze({ source: String.raw`\bsk-proj-[A-Za-z0-9_-]{20,}\b`, flags: '' }),
  Object.freeze({ source: String.raw`\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b`, flags: 'i' }),
]);
