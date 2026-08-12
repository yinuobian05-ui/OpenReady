import { TOOL_NAME, VERSION } from './constants.js';

const FEEDBACK_URL = 'https://github.com/yinuobian05-ui/OpenReady/discussions/1';

export function formatText(result) {
  const lines = [
    `OpenReady v${result.version}`,
    `Result: ${result.status}`,
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of result.findings) {
      const location = finding.line ? `${finding.path}:${finding.line}` : finding.path;
      lines.push(`[${finding.severity}] ${finding.ruleId} ${location}`);
      lines.push(`  ${finding.description}`);
    }
  }

  lines.push('');
  lines.push(
    `Summary: ${result.summary.blockers} blocker(s), ` +
    `${result.summary.warnings} warning(s), ${result.summary.info} info`,
  );
  lines.push('');
  lines.push('Privacy-safe feedback (never paste scan output or repository data):');
  lines.push(FEEDBACK_URL);
  lines.push('OS / Node major / completed? / confusing part / would use again?');
  return `${lines.join('\n')}\n`;
}

export function formatJson(result) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function formatError(error, json) {
  const exposed = error?.expose === true;
  const code = exposed && typeof error.code === 'string' ? error.code : 'EXECUTION_ERROR';
  const message = exposed && typeof error.message === 'string'
    ? error.message
    : 'The scan could not be completed reliably.';

  if (json) {
    return `${JSON.stringify({
      tool: TOOL_NAME,
      version: VERSION,
      error: { code, message },
    }, null, 2)}\n`;
  }
  return `OpenReady error [${code}]: ${message}\n`;
}
