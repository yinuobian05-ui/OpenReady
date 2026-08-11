import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { OpenReadyError } from './errors.js';
import { isContained } from './path-utils.js';
import { contentRuleIds } from './rules.js';

function isBinary(buffer) {
  if (buffer.includes(0)) {
    return true;
  }

  let unusualControls = 0;
  for (const byte of buffer) {
    if (byte < 9 || (byte > 13 && byte < 32)) {
      unusualControls += 1;
    }
  }
  return buffer.length > 0 && unusualControls / buffer.length > 0.3;
}

function sameFile(entry, openedStats) {
  if (!openedStats.isFile()) {
    return false;
  }
  if (!entry.device || !entry.inode || !openedStats.dev || !openedStats.ino) {
    return entry.size === openedStats.size;
  }
  return (
    entry.device === openedStats.dev &&
    entry.inode === openedStats.ino &&
    entry.size === openedStats.size
  );
}

export function scanBufferContent(buffer, findingPath, onFinding) {
  if (isBinary(buffer.subarray(0, Math.min(buffer.length, 8 * 1024)))) {
    onFinding('OR-BND-003', findingPath);
    return;
  }

  const text = buffer.toString('utf8');
  let lineStart = 0;
  let lineNumber = 1;
  for (let index = 0; index <= text.length; index += 1) {
    const character = text[index];
    if (index !== text.length && character !== '\n' && character !== '\r') continue;

    for (const ruleId of contentRuleIds(text.slice(lineStart, index))) {
      onFinding(ruleId, findingPath, lineNumber);
    }
    if (character === '\r' && text[index + 1] === '\n') index += 1;
    lineStart = index + 1;
    lineNumber += 1;
  }
}

export async function scanFileContent(entry, root, limits, onFinding) {
  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  let fileHandle;

  try {
    const resolvedParent = await realpath(path.dirname(entry.absolutePath));
    if (!isContained(root, resolvedParent)) {
      onFinding('OR-BND-002', entry.path);
      return;
    }

    fileHandle = await open(entry.absolutePath, constants.O_RDONLY | noFollow);
    const openedStats = await fileHandle.stat();
    if (!sameFile(entry, openedStats)) {
      onFinding('OR-BND-004', entry.path);
      return;
    }

    const probeLength = Math.min(openedStats.size, limits.binaryProbeBytes);
    const probe = Buffer.alloc(probeLength);
    let bytesRead = 0;
    if (probeLength > 0) {
      ({ bytesRead } = await fileHandle.read(probe, 0, probeLength, 0));
    }

    if (isBinary(probe.subarray(0, bytesRead))) {
      onFinding('OR-BND-003', entry.path);
      return;
    }
    if (openedStats.size > limits.contentScanBytes) {
      onFinding('OR-BND-006', entry.path);
      return;
    }

    const input = fileHandle.createReadStream({
      autoClose: false,
      encoding: 'utf8',
      start: 0,
    });
    let inputError;
    let reader;
    input.on('error', (error) => {
      inputError = error;
      reader?.close();
    });
    reader = createInterface({ input, crlfDelay: Infinity });

    let lineNumber = 0;
    try {
      for await (const line of reader) {
        lineNumber += 1;
        for (const ruleId of contentRuleIds(line)) {
          onFinding(ruleId, entry.path, lineNumber);
        }
      }
      if (inputError) {
        throw inputError;
      }
    } finally {
      reader.close();
      input.destroy();
    }
  } catch (error) {
    if (error instanceof OpenReadyError || typeof error?.code !== 'string') {
      throw error;
    }
    onFinding('OR-BND-004', entry.path);
  } finally {
    await fileHandle?.close().catch(() => {});
  }
}
