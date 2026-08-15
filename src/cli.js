import { EXIT_CODES, VERSION } from './constants.js';
import { runSyntheticDemo } from './demo.js';
import { formatDemoText, formatError, formatJson, formatText } from './formatters.js';
import { scanRepository } from './scanner.js';

const HELP = `OpenReady v${VERSION}

Usage:
  openready scan [path]
  openready scan [path] --json
  openready demo

The path defaults to the current directory. JSON mode writes no progress or ANSI output.
The demo uses only fixed fictional files in a temporary directory, then removes them.

Exit codes:
  0  Scan completed with no blockers, or demo completed as expected
  1  Scan completed and found one or more blockers
  2  Usage or execution error
`;

function write(stream, value) {
  stream.write(value);
}

function parseScanArguments(args) {
  let json = args.includes('--json');
  let target = '.';
  let hasTarget = false;

  for (const argument of args) {
    if (argument === '--json') {
      json = true;
    } else if (argument === '--help' || argument === '-h') {
      return { help: true, json: false, target: '.' };
    } else if (argument.startsWith('-')) {
      const error = new Error('Unknown option. Run openready --help for usage.');
      error.code = 'INVALID_ARGUMENT';
      error.expose = true;
      error.json = json;
      throw error;
    } else if (hasTarget) {
      const error = new Error('Only one scan path may be provided.');
      error.code = 'INVALID_ARGUMENT';
      error.expose = true;
      error.json = json;
      throw error;
    } else {
      target = argument;
      hasTarget = true;
    }
  }

  return { help: false, json, target };
}

export async function runCli(args, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    write(stdout, HELP);
    return EXIT_CODES.READY;
  }
  if (args[0] === '--version' || args[0] === '-v') {
    write(stdout, `${VERSION}\n`);
    return EXIT_CODES.READY;
  }
  if (args[0] === 'demo') {
    if (args.length !== 1) {
      const error = new Error('The demo command does not accept options or paths.');
      error.code = 'INVALID_ARGUMENT';
      error.expose = true;
      write(stderr, formatError(error, false));
      return EXIT_CODES.ERROR;
    }
    try {
      const result = await runSyntheticDemo();
      write(stdout, formatDemoText(result));
      return EXIT_CODES.READY;
    } catch (error) {
      write(stderr, formatError(error, false));
      return EXIT_CODES.ERROR;
    }
  }
  if (args[0] !== 'scan') {
    const error = new Error('Unknown command. Run openready --help for usage.');
    error.code = 'INVALID_COMMAND';
    error.expose = true;
    write(stderr, formatError(error, args.includes('--json')));
    return EXIT_CODES.ERROR;
  }

  let parsed;
  try {
    parsed = parseScanArguments(args.slice(1));
  } catch (error) {
    write(stderr, formatError(error, error.json === true));
    return EXIT_CODES.ERROR;
  }

  if (parsed.help) {
    write(stdout, HELP);
    return EXIT_CODES.READY;
  }

  try {
    const result = await scanRepository(parsed.target);
    write(stdout, parsed.json ? formatJson(result) : formatText(result));
    return result.summary.blockers > 0 ? EXIT_CODES.BLOCKED : EXIT_CODES.READY;
  } catch (error) {
    write(stderr, formatError(error, parsed.json));
    return EXIT_CODES.ERROR;
  }
}
