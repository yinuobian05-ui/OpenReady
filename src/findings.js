import { SEVERITY_ORDER } from './constants.js';
import { OpenReadyError } from './errors.js';
import { sanitizeDisplayPath } from './path-utils.js';
import { RULES } from './rules.js';

export class FindingCollector {
  #findings = [];
  #keys = new Set();
  #maximumFindings;

  constructor(maximumFindings = Number.POSITIVE_INFINITY) {
    this.#maximumFindings = maximumFindings;
  }

  add(ruleId, findingPath = '.', line) {
    const rule = RULES[ruleId];
    if (!rule) {
      throw new TypeError(`Unknown rule ID: ${ruleId}`);
    }

    const safePath = sanitizeDisplayPath(findingPath);
    const safeLine = Number.isInteger(line) && line > 0 ? line : undefined;
    const key = `${ruleId}\u0000${safePath}\u0000${safeLine ?? ''}`;
    if (this.#keys.has(key)) {
      return;
    }
    if (this.#findings.length >= this.#maximumFindings) {
      throw new OpenReadyError(
        'SCAN_LIMIT_EXCEEDED',
        'Scan safety limits were exceeded. No partial result was reported.',
      );
    }

    this.#keys.add(key);
    const finding = {
      severity: rule.severity,
      ruleId,
      description: rule.description,
      path: safePath,
    };
    if (safeLine !== undefined) {
      finding.line = safeLine;
    }
    this.#findings.push(Object.freeze(finding));
  }

  sorted() {
    return [...this.#findings].sort((left, right) => (
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      left.path.localeCompare(right.path, 'en') ||
      (left.line ?? 0) - (right.line ?? 0) ||
      left.ruleId.localeCompare(right.ruleId, 'en')
    ));
  }
}

export function summarize(findings) {
  const summary = { blockers: 0, warnings: 0, info: 0 };
  for (const finding of findings) {
    if (finding.severity === 'BLOCKER') summary.blockers += 1;
    if (finding.severity === 'WARNING') summary.warnings += 1;
    if (finding.severity === 'INFO') summary.info += 1;
  }
  return summary;
}
