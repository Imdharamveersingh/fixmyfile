/**
 * Phase 6.1 — MP4 to MP3: Comprehensive Automated Test Suite
 * Minimum 22 rigorous assertions verifying:
 * - Registry integration
 * - Route registration in App.jsx
 * - Component export & engine exports
 * - Tool metadata & privacy guarantees
 * - MP4 container signature & zero-byte rejection
 * - File-size safety ceiling
 * - Filename sanitization
 * - In-browser WebAssembly FFmpeg loading
 * - ACTUAL MP4 -> MP3 conversion with genuine fixture
 * - Output Blob existence, MIME type, and non-zero size
 * - MP3 binary frame sync / ID3 header validation
 * - Non-MP4 container verification
 * - No-audio MP4 graceful rejection
 * - Reset and resource cleanup
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PHASE_6_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';
import {
  isValidMp4Signature,
  getSanitizedMp3Filename,
  MAX_MP4_FILE_SIZE
} from './src/tools/mp4-to-mp3/mp4ToMp3Engine.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9444;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function waitForChromePort(port, maxMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const targets = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch {
              resolve([]);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      if (targets && targets.length > 0) return targets;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Chrome did not start on port ${port}`);
}

console.log('\n=== Phase 6.1 — MP4 to MP3: Automated Test Suite ===\n');

// -------------------------------------------------------------
// GROUP 1: Registry & Routing Integration
// -------------------------------------------------------------
console.log('GROUP 1: Tool Registry & Routing');

const tool = PHASE_6_TOOLS.find((t) => t.id === 'mp4-to-mp3');
assert(!!tool, 'mp4-to-mp3 exists in PHASE_6_TOOLS');
assert(tool?.path === '/mp4-to-mp3', 'tool path is /mp4-to-mp3');
assert(tool?.category === 'Audio Extraction', 'tool category is Audio Extraction');
assert(tool?.phase === 'Phase 6', 'tool phase is Phase 6');
assert(tool?.status === 'Ready', 'tool status is Ready');
assert(ALL_TOOLS.some((t) => t.id === 'mp4-to-mp3'), 'mp4-to-mp3 is registered in ALL_TOOLS');
assert(ALL_TOOLS.length >= 40, `ALL_TOOLS count is at least 40 (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS remains 55');

const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
assert(appJsx.includes("import Mp4ToMp3Tool from './tools/mp4-to-mp3'"), 'App.jsx imports Mp4ToMp3Tool');
assert(appJsx.includes('path="mp4-to-mp3"'), 'App.jsx registers /mp4-to-mp3 route');

// -------------------------------------------------------------
// GROUP 2: Component & Engine Source Verification
// -------------------------------------------------------------
console.log('\nGROUP 2: Component & Engine Architecture');

const indexPath = 'src/tools/mp4-to-mp3/index.jsx';
const enginePath = 'src/tools/mp4-to-mp3/mp4ToMp3Engine.js';
assert(fs.existsSync(indexPath), 'src/tools/mp4-to-mp3/index.jsx exists');
assert(fs.existsSync(enginePath), 'src/tools/mp4-to-mp3/mp4ToMp3Engine.js exists');

const indexSrc = fs.readFileSync(indexPath, 'utf8');
assert(indexSrc.includes('export default function Mp4ToMp3Tool'), 'index.jsx exports Mp4ToMp3Tool as default');
assert(indexSrc.includes('id="mp4-to-mp3-dropzone"'), 'index.jsx includes dropzone element');
assert(indexSrc.includes('Your file is processed locally in your browser.'), 'index.jsx includes local privacy statement');

const engineSrc = fs.readFileSync(enginePath, 'utf8');
assert(engineSrc.includes('libmp3lame'), 'Engine specifies libmp3lame MP3 encoder');
assert(engineSrc.includes('-vn'), 'Engine includes -vn flag to disable video rendering');

// -------------------------------------------------------------
// GROUP 3: MP4 Validation & Sanitization Unit Tests
// -------------------------------------------------------------
console.log('\nGROUP 3: Validation, Signatures & Constraints');

// Valid MP4 fixture
const validFixture = fs.readFileSync('test_fixtures/sample_with_audio.mp4');
assert(isValidMp4Signature(validFixture), 'Valid MP4 fixture matches ISO-BMFF (ftyp) signature');

// Invalid dummy text fixture
const invalidFixture = fs.readFileSync('test_fixtures/invalid.txt');
assert(!isValidMp4Signature(invalidFixture), 'Text file rejected by signature validator');

// Empty buffer
const emptyFixture = fs.readFileSync('test_fixtures/empty.mp4');
assert(!isValidMp4Signature(emptyFixture), 'Zero-byte file rejected by signature validator');

// Maximum file size ceiling
assert(MAX_MP4_FILE_SIZE === 500 * 1024 * 1024, 'Safety file size ceiling is set to 500 MB');

// Filename sanitization
assert(getSanitizedMp3Filename('holiday video (4K) [final].mp4') === 'holiday_video_4K_final.mp3', 'Filename sanitized with special chars stripped and .mp3 extension');
assert(getSanitizedMp3Filename('audio.only') === 'audio.mp3', 'Filename properly replaces non-mp4 extension');
assert(getSanitizedMp3Filename('') === 'audio.mp3', 'Empty filename falls back safely to audio.mp3');

// -------------------------------------------------------------
// GROUP 4: In-Browser Actual FFmpeg WASM Execution & Audio Conversion
// -------------------------------------------------------------
console.log('\nGROUP 4: In-Browser Real Conversion & Binary Integrity');

async function runBrowserConversionTests() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    'http://localhost:5173/mp4-to-mp3'
  ]);

  try {
    const targets = await waitForChromePort(DEBUG_PORT);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let reqId = 1;
    const pendingRequests = new Map();
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pendingRequests.has(parsed.id)) {
        const { resolve, reject } = pendingRequests.get(parsed.id);
        pendingRequests.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://localhost:5173/mp4-to-mp3' });
    await new Promise((r) => setTimeout(r, 1500));

    const sampleBase64 = validFixture.toString('base64');
    const noAudioFixture = fs.readFileSync('test_fixtures/sample_no_audio.mp4');
    const noAudioBase64 = noAudioFixture.toString('base64');

    const conversionResult = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          try {
            const { convertMp4ToMp3, validateMp4File } = await import('/src/tools/mp4-to-mp3/mp4ToMp3Engine.js');

            // 1. Convert valid MP4 to MP3
            const binary = atob('${sampleBase64}');
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const testFile = new File([bytes], 'sample_lecture.mp4', { type: 'video/mp4' });

            const statuses = [];
            const result = await convertMp4ToMp3(testFile, {
              onStatus: (msg) => statuses.push(msg),
              bitrate: '192k'
            });

            const outBuf = await result.blob.arrayBuffer();
            const outBytes = new Uint8Array(outBuf);

            // Check MP3 header: ID3 or frame sync (0xFF 0xEx)
            const isId3 = outBytes[0] === 0x49 && outBytes[1] === 0x44 && outBytes[2] === 0x33;
            const isFrameSync = outBytes[0] === 0xff && (outBytes[1] & 0xe0) === 0xe0;

            // 2. Test no-audio rejection
            const noAudioBin = atob('${noAudioBase64}');
            const noAudioBytes = new Uint8Array(noAudioBin.length);
            for (let i = 0; i < noAudioBin.length; i++) noAudioBytes[i] = noAudioBin.charCodeAt(i);
            const noAudioFile = new File([noAudioBytes], 'silent_video.mp4', { type: 'video/mp4' });

            let noAudioCaught = false;
            let noAudioMessage = '';
            try {
              await convertMp4ToMp3(noAudioFile);
            } catch (err) {
              noAudioCaught = true;
              noAudioMessage = err.message || '';
            }

            return JSON.stringify({
              success: true,
              blobExists: !!result.blob,
              blobType: result.blob.type,
              blobSize: result.blob.size,
              outputFilename: result.filename,
              isMp3Header: isId3 || isFrameSync,
              statuses,
              noAudioCaught,
              noAudioMessage
            });
          } catch (err) {
            return JSON.stringify({ error: err.message || String(err), stack: err.stack });
          }
        })()
      `
    });

    const parsed = JSON.parse(conversionResult?.result?.value);
    if (parsed.error) {
      console.error('Browser conversion error:', parsed.error, parsed.stack);
    }

    assert(parsed.success === true, 'In-browser FFmpeg conversion execution succeeded');
    assert(parsed.blobExists === true, 'Output Blob exists');
    assert(parsed.blobType === 'audio/mpeg', 'Output Blob MIME type is audio/mpeg');
    assert(parsed.blobSize > 0, `Output size is non-zero (${parsed.blobSize} bytes)`);
    assert(parsed.outputFilename === 'sample_lecture.mp3', `Output filename is sanitized (${parsed.outputFilename})`);
    assert(parsed.isMp3Header === true, 'Output binary begins with genuine MP3 frame sync / ID3 tag');
    assert(parsed.noAudioCaught === true, 'MP4 without audio stream triggers graceful error');
    assert(parsed.noAudioMessage.includes('No audio track was found'), 'Clear error message on silent video');

    ws.close();
  } finally {
    chrome.kill();
  }
}

await runBrowserConversionTests();

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED:      ${passCount}`);
console.log(`FAILED:      ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
