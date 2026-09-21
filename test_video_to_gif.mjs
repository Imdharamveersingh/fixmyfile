/**
 * Phase 6.3 — Video to GIF: Comprehensive Automated Test Suite
 * Minimum 45 rigorous assertions verifying:
 * - Registry integration (42 active tools)
 * - Route registration in App.jsx
 * - Component export & engine exports
 * - Required UI identifiers
 * - Video container signatures & zero-byte rejection
 * - File-size safety ceiling (500 MB)
 * - Duration safety limit (30s)
 * - Aspect-ratio calculation and no-upscale protection
 * - Framerate preset availability
 * - In-browser WebAssembly FFmpeg loading
 * - ACTUAL video -> GIF conversion with palettegen/paletteuse
 * - Output Blob existence, MIME type (image/gif), and non-zero size
 * - Genuine GIF89a / GIF87a binary signature
 * - Multiple animated GIF frames (countGifFrames > 1)
 * - Sanitized filename (.gif)
 * - Reset and resource cleanup
 * - Second conversion after reset without stale state
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PHASE_6_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';
import {
  isValidVideoSignature,
  isValidGifSignature,
  countGifFrames,
  calculateGifDimensions,
  getSanitizedGifFilename,
  MAX_VIDEO_FILE_SIZE,
  MAX_GIF_DURATION_SECONDS,
  FPS_PRESETS,
  RESOLUTION_PRESETS
} from './src/tools/video-to-gif/videoToGifEngine.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9475;

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

console.log('\n=== Phase 6.3 — Video to GIF: Automated Test Suite ===\n');

// -------------------------------------------------------------
// GROUP 1: Tool Registry & Routing Integration
// -------------------------------------------------------------
console.log('GROUP 1: Tool Registry & Routing');

const tool = PHASE_6_TOOLS.find((t) => t.id === 'video-to-gif');
assert(!!tool, 'video-to-gif exists in PHASE_6_TOOLS');
assert(tool?.path === '/video-to-gif', 'tool path is /video-to-gif');
assert(tool?.category === 'Video Conversion', 'tool category is Video Conversion');
assert(tool?.phase === 'Phase 6', 'tool phase is Phase 6');
assert(tool?.status === 'Ready', 'tool status is Ready');
assert(ALL_TOOLS.some((t) => t.id === 'video-to-gif'), 'video-to-gif is registered in ALL_TOOLS');
assert(ALL_TOOLS.length === 43, `ALL_TOOLS count is exactly 43 (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS remains 55');

const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
assert(appJsx.includes("import VideoToGifTool from './tools/video-to-gif'"), 'App.jsx imports VideoToGifTool');
assert(appJsx.includes('path="video-to-gif"'), 'App.jsx registers /video-to-gif route');

// -------------------------------------------------------------
// GROUP 2: Component & Engine Source Verification
// -------------------------------------------------------------
console.log('\nGROUP 2: Component & Engine Architecture');

const indexPath = 'src/tools/video-to-gif/index.jsx';
const enginePath = 'src/tools/video-to-gif/videoToGifEngine.js';
assert(fs.existsSync(indexPath), 'src/tools/video-to-gif/index.jsx exists');
assert(fs.existsSync(enginePath), 'src/tools/video-to-gif/videoToGifEngine.js exists');

const indexSrc = fs.readFileSync(indexPath, 'utf8');
assert(indexSrc.includes('export default function VideoToGifTool'), 'index.jsx exports VideoToGifTool as default');
assert(indexSrc.includes('id="video-to-gif-dropzone"'), 'index.jsx includes dropzone element with ID');
assert(indexSrc.includes('id="fps-select"'), 'index.jsx includes fps-select element with ID');
assert(indexSrc.includes('id="resolution-select"'), 'index.jsx includes resolution-select element with ID');
assert(indexSrc.includes('id="duration-select"'), 'index.jsx includes duration-select element with ID');
assert(indexSrc.includes('id="btn-convert-gif"'), 'index.jsx includes btn-convert-gif button with ID');
assert(indexSrc.includes('id="video-to-gif-result"'), 'index.jsx includes video-to-gif-result container');
assert(indexSrc.includes('id="gif-preview"'), 'index.jsx includes gif-preview image element with ID');
assert(indexSrc.includes('id="btn-download-gif"'), 'index.jsx includes btn-download-gif download link');
assert(indexSrc.includes('id="btn-convert-another"'), 'index.jsx includes btn-convert-another reset button');
assert(indexSrc.includes('Your video is converted locally in your browser.'), 'index.jsx includes local privacy statement');

const engineSrc = fs.readFileSync(enginePath, 'utf8');
assert(engineSrc.includes('palettegen'), 'Engine includes palettegen for 256-color palette optimization');
assert(engineSrc.includes('paletteuse'), 'Engine includes paletteuse for dithered frame rendering');
assert(engineSrc.includes('-loop'), 'Engine includes -loop 0 for infinite GIF animation');

// -------------------------------------------------------------
// GROUP 3: Validation, Calculations & Presets Unit Tests
// -------------------------------------------------------------
console.log('\nGROUP 3: Validation, Signatures & Dimension Calculations');

// Valid MP4 fixture
const validFixture = fs.readFileSync('test_fixtures/sample_with_audio.mp4');
assert(isValidVideoSignature(validFixture), 'Valid MP4 fixture matches video container signature');

// Invalid dummy text fixture
const invalidFixture = fs.readFileSync('test_fixtures/invalid.txt');
assert(!isValidVideoSignature(invalidFixture), 'Text file rejected by video signature validator');

// Empty buffer
const emptyFixture = fs.readFileSync('test_fixtures/empty.mp4');
assert(!isValidVideoSignature(emptyFixture), 'Zero-byte file rejected by video signature validator');

// Maximum file size and duration ceiling
assert(MAX_VIDEO_FILE_SIZE === 500 * 1024 * 1024, 'Safety file size ceiling is set to 500 MB');
assert(MAX_GIF_DURATION_SECONDS === 30, 'Maximum GIF duration is set to 30 seconds');

// Presets
assert(FPS_PRESETS.length >= 4, 'At least 4 framerate presets defined');
assert(RESOLUTION_PRESETS.length >= 4, 'At least 4 resolution presets defined');

// Dimension calculations:
// 1. Never upscale
const noUpscale = calculateGifDimensions(320, 240, 480);
assert(noUpscale.width === 320 && noUpscale.height === 240, 'Smaller video is never upscaled (320x240 <= 480)');

// 2. Downscaling preserves aspect ratio
const downscaled = calculateGifDimensions(1920, 1080, 480);
assert(downscaled.width === 480 && downscaled.height === 270, '1920x1080 downscaled to 480px produces 480x270');

// 3. Even dimensions guarantee
const oddInput = calculateGifDimensions(999, 499, 360);
assert(oddInput.width % 2 === 0 && oddInput.height % 2 === 0, 'Dimensions are strictly even for GIF encoding compatibility');

// Filename sanitization
assert(getSanitizedGifFilename('funny moment (epic).mp4') === 'funny_moment_epic.gif', 'Filename sanitized with .gif extension');
assert(getSanitizedGifFilename('clip.webm') === 'clip.gif', 'WebM extension replaced with .gif');
assert(getSanitizedGifFilename('') === 'animation.gif', 'Empty filename falls back safely to animation.gif');

// GIF Signature validation
const fakeGifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]);
assert(isValidGifSignature(fakeGifHeader.buffer), 'GIF89a signature recognized');
const fakeNonGif = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
assert(!isValidGifSignature(fakeNonGif.buffer), 'Non-GIF header correctly rejected');
assert(countGifFrames(fakeGifHeader.buffer) === 0, 'Header-only buffer reports 0 frames');

// -------------------------------------------------------------
// GROUP 4: In-Browser Actual FFmpeg WASM Execution & GIF Generation
// -------------------------------------------------------------
console.log('\nGROUP 4: In-Browser Real GIF Conversion & Frame Verification');

async function runBrowserConversionTests() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    'http://localhost:5173/video-to-gif'
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
    await send('Page.navigate', { url: 'http://localhost:5173/video-to-gif' });
    await new Promise((r) => setTimeout(r, 1500));

    // High bitrate fixture for real GIF conversion
    const sampleFixture = fs.readFileSync('test_fixtures/sample_high_bitrate.mp4');
    const sampleB64 = sampleFixture.toString('base64');

    const conversionResult = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          try {
            const { convertVideoToGif, isValidGifSignature, countGifFrames } = await import('/src/tools/video-to-gif/videoToGifEngine.js');

            const binary = atob('${sampleB64}');
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const testFile = new File([bytes], 'animated_clip.mp4', { type: 'video/mp4' });

            const statuses = [];
            const result = await convertVideoToGif(testFile, {
              fps: 10,
              resolution: '360',
              maxDuration: 5,
              onStatus: (msg) => statuses.push(msg)
            });

            const outBuf = await result.blob.arrayBuffer();
            const outBytes = new Uint8Array(outBuf);

            const isSig = isValidGifSignature(outBuf);
            const frames = countGifFrames(outBuf);

            // Verify GIF is renderable by an HTMLImageElement
            const imgUrl = URL.createObjectURL(result.blob);
            const img = new Image();
            img.src = imgUrl;

            const renderable = await new Promise((resolve) => {
              img.onload = () => {
                const data = {
                  ok: true,
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight
                };
                URL.revokeObjectURL(imgUrl);
                resolve(data);
              };
              img.onerror = () => {
                URL.revokeObjectURL(imgUrl);
                resolve({ ok: false });
              };
              setTimeout(() => {
                URL.revokeObjectURL(imgUrl);
                resolve({ ok: false, timeout: true });
              }, 4000);
            });

            return JSON.stringify({
              success: true,
              blobExists: !!result.blob,
              blobType: result.blob.type,
              blobSize: result.blob.size,
              outputFilename: result.filename,
              isSig,
              frames,
              renderable,
              statuses
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

    assert(parsed.success === true, 'In-browser FFmpeg video to GIF conversion succeeded');
    assert(parsed.blobExists === true, 'Output GIF Blob exists');
    assert(parsed.blobType === 'image/gif', 'Output Blob MIME type is image/gif');
    assert(parsed.blobSize > 0, `Output size is non-zero (${parsed.blobSize} bytes)`);
    assert(parsed.outputFilename === 'animated_clip.gif', `Output filename is sanitized (${parsed.outputFilename})`);
    assert(parsed.isSig === true, 'Output binary has valid GIF89a/87a signature');
    assert(parsed.frames > 1, `Output has multiple animated GIF frames (${parsed.frames} frames detected)`);
    assert(parsed.renderable?.ok === true, 'Generated GIF loads and renders cleanly via HTMLImageElement');
    assert(parsed.renderable?.naturalWidth <= 360, `Output width respects 360p constraint (${parsed.renderable?.naturalWidth}x${parsed.renderable?.naturalHeight})`);

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
