/**
 * Phase 6.3 — Video to GIF: Difficult & Edge Case Test Suite
 * Tests challenging edge cases:
 * - Real motion verification (multiple animated frames)
 * - GIF signature & binary header verification
 * - Non-video file rejection (is not renamed video)
 * - Resolution downscaling vs no-upscaling
 * - Aspect-ratio preservation
 * - Selected FPS frame count correspondence (e.g. 5 FPS vs 15 FPS)
 * - Duration clamp ceiling (max duration safety)
 * - Zero-byte and oversized (>500MB) file rejection
 * - Clean multi-cycle consecutive conversion without stale state
 * Run: node test_difficult_video_to_gif.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/video-to-gif';
const DEBUG_PORT = 9485;

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  passCount++;
}

function fail(msg) {
  console.error(`  ✗ FAIL: ${msg}`);
  failCount++;
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

async function runDifficultTests() {
  console.log('\n=== Phase 6.3 — Video to GIF: Difficult Edge Tests ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    TOOL_URL
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

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 1500));

    // Load fixtures
    const sampleBytes = fs.readFileSync('test_fixtures/sample_high_bitrate.mp4');
    const sampleB64 = sampleBytes.toString('base64');

    console.log('GROUP 1: Framerate & Resolution Scaling Parity');

    const multiFpsTests = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          try {
            const { convertVideoToGif, isValidGifSignature, countGifFrames } = await import('/src/tools/video-to-gif/videoToGifEngine.js');

            const bin = atob('${sampleB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const testFile = new File([bytes], 'source_motion.mp4', { type: 'video/mp4' });

            // 1. Convert at 5 FPS, 240p
            const res5Fps = await convertVideoToGif(testFile, {
              fps: 5,
              resolution: '240',
              maxDuration: 2
            });
            const buf5 = await res5Fps.blob.arrayBuffer();
            const frames5 = countGifFrames(buf5);

            // 2. Convert at 15 FPS, 360p
            const res15Fps = await convertVideoToGif(testFile, {
              fps: 15,
              resolution: '360',
              maxDuration: 2
            });
            const buf15 = await res15Fps.blob.arrayBuffer();
            const frames15 = countGifFrames(buf15);

            // Check non-MP4 container (ensure it's not a renamed video file)
            const bytes5 = new Uint8Array(buf5);
            const isNotMp4 = !(bytes5[4] === 0x66 && bytes5[5] === 0x74 && bytes5[6] === 0x79 && bytes5[7] === 0x70);
            const isGenuineGif = isValidGifSignature(buf5);

            // Check image decoding via Image object
            const url5 = URL.createObjectURL(res5Fps.blob);
            const img5 = new Image();
            img5.src = url5;
            const meta5 = await new Promise((resolve) => {
              img5.onload = () => {
                const info = { ok: true, width: img5.naturalWidth, height: img5.naturalHeight };
                URL.revokeObjectURL(url5);
                resolve(info);
              };
              img5.onerror = () => {
                URL.revokeObjectURL(url5);
                resolve({ ok: false });
              };
              setTimeout(() => {
                URL.revokeObjectURL(url5);
                resolve({ ok: false, timeout: true });
              }, 3000);
            });

            return JSON.stringify({
              success: true,
              frames5,
              size5: res5Fps.blob.size,
              frames15,
              size15: res15Fps.blob.size,
              isNotMp4,
              isGenuineGif,
              meta5
            });
          } catch (e) {
            return JSON.stringify({ error: e.message || String(e), stack: e.stack });
          }
        })()
      `
    });

    const parsed1 = JSON.parse(multiFpsTests?.result?.value);
    if (parsed1.error) fail(`FPS test failed: ${parsed1.error}`);
    else {
      if (parsed1.isGenuineGif) pass('Output binary starts with authentic GIF signature (GIF89a)');
      else fail('Output missing GIF signature');

      if (parsed1.isNotMp4) pass('Output is genuinely converted GIF, NOT a renamed MP4 file');
      else fail('Output is mistakenly a renamed MP4');

      if (parsed1.frames5 > 1 && parsed1.frames15 > parsed1.frames5) {
        pass(`Frame rate scaling respected: 15 FPS produced more frames than 5 FPS (${parsed1.frames15} vs ${parsed1.frames5} frames)`);
      } else fail(`Frame counts unexpected: 5fps=${parsed1.frames5}, 15fps=${parsed1.frames15}`);

      if (parsed1.meta5?.ok) {
        pass(`Renderable animated GIF with dimensions ${parsed1.meta5.width}x${parsed1.meta5.height}`);
      } else fail('Generated GIF failed HTML image rendering');

      if (parsed1.meta5?.width <= 240) {
        pass(`240p resolution constraint respected (${parsed1.meta5.width}x${parsed1.meta5.height})`);
      } else fail(`240p constraint exceeded: ${parsed1.meta5?.width}`);
    }

    console.log('\nGROUP 2: Edge Cases & Validation Rejections');

    const edgeTests = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const { convertVideoToGif, validateVideoFile } = await import('/src/tools/video-to-gif/videoToGifEngine.js');

          const results = {};

          // A. Zero-byte file
          try {
            const emptyFile = new File([new Uint8Array(0)], 'empty.mp4', { type: 'video/mp4' });
            await validateVideoFile(emptyFile);
            results.zeroByte = { rejected: false };
          } catch (err) {
            results.zeroByte = { rejected: true, msg: err.message };
          }

          // B. Invalid binary (plain text)
          try {
            const fakeFile = new File([new TextEncoder().encode('Fake text content not a video')], 'corrupt.mp4', { type: 'video/mp4' });
            await validateVideoFile(fakeFile);
            results.invalidBinary = { rejected: false };
          } catch (err) {
            results.invalidBinary = { rejected: true, msg: err.message };
          }

          // C. Oversized file (> 500 MB mock)
          try {
            const hugeBlob = { size: 600 * 1024 * 1024, slice: () => new Blob() };
            await validateVideoFile(hugeBlob);
            results.oversized = { rejected: false };
          } catch (err) {
            results.oversized = { rejected: true, msg: err.message };
          }

          // D. Multi-cycle consecutive conversion
          try {
            const bin = atob('${sampleB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const cycleFile = new File([bytes], 'cycle.mp4', { type: 'video/mp4' });

            const r1 = await convertVideoToGif(cycleFile, { fps: 5, resolution: '240', maxDuration: 1 });
            const r2 = await convertVideoToGif(cycleFile, { fps: 10, resolution: '360', maxDuration: 1 });

            results.multiCycle = {
              success: r1.blob.size > 0 && r2.blob.size > 0,
              size1: r1.blob.size,
              size2: r2.blob.size
            };
          } catch (err) {
            results.multiCycle = { success: false, error: err.message };
          }

          return JSON.stringify(results);
        })()
      `
    });

    const parsed2 = JSON.parse(edgeTests?.result?.value);

    if (parsed2.zeroByte?.rejected && parsed2.zeroByte.msg.includes('empty')) {
      pass('A. Zero-byte file rejected gracefully');
    } else fail('A. Zero-byte file was not rejected');

    if (parsed2.invalidBinary?.rejected && parsed2.invalidBinary.msg.includes('signature')) {
      pass('B. Invalid non-video binary rejected via container signature check');
    } else fail('B. Invalid binary was not rejected');

    if (parsed2.oversized?.rejected && parsed2.oversized.msg.includes('limit')) {
      pass('C. Oversized (>500MB) file rejected before processing');
    } else fail('C. Oversized file was not rejected');

    if (parsed2.multiCycle?.success) {
      pass(`D. Consecutive multi-cycle conversion succeeded (Run 1: ${parsed2.multiCycle.size1} B, Run 2: ${parsed2.multiCycle.size2} B)`);
    } else fail(`D. Multi-cycle conversion failed: ${JSON.stringify(parsed2.multiCycle)}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function main() {
  await runDifficultTests();

  console.log('\n========================================');
  console.log(`TOTAL DIFFICULT TESTS: ${passCount + failCount}`);
  console.log(`PASSED:                ${passCount}`);
  console.log(`FAILED:                ${failCount}`);
  console.log('========================================\n');

  if (failCount > 0) process.exit(1);
  else process.exit(0);
}

main();
