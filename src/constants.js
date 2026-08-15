export const TOOL_NAME = 'openready';
export const VERSION = '0.2.0';

export const EXIT_CODES = Object.freeze({
  READY: 0,
  BLOCKED: 1,
  ERROR: 2,
});

export const SEVERITY_ORDER = Object.freeze({
  BLOCKER: 0,
  WARNING: 1,
  INFO: 2,
});

export const DEFAULT_LIMITS = Object.freeze({
  binaryProbeBytes: 8 * 1024,
  contentScanBytes: 10 * 1024 * 1024,
  largeFileBytes: 10 * 1024 * 1024,
  oversizedFileBytes: 100 * 1024 * 1024,
  totalContentScanBytes: 512 * 1024 * 1024,
  maximumEntries: 250_000,
  maximumFindings: 10_000,
  gitMaxBufferBytes: 64 * 1024 * 1024,
  gitTimeoutMs: 30_000,
});
