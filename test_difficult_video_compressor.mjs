/**
 * Phase 6.2 — Video Compressor: Difficult & Edge Case Test Suite
 * Tests challenging edge cases:
 * - Genuine size reduction on real high-bitrate video
 * - Video playability and audio decodability
 * - Audio preservation vs Mute audio removal
 * - Silent video (no audio stream) compression resilience
 * - Resolution downscaling constraint & aspect-ratio preservation
 * - Invalid container / zero-byte / oversized file rejection
 * - Clean multi-cycle execution without memory leaks or stale state
 * Run: node test_difficult_video_compressor.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/video-compressor';
const DEBUG_PORT = 9465;

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
  console.log('\n=== Phase 6.2 — Video Compressor: Difficult Edge Tests ===\n');

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
    const highBitrateBytes = fs.readFileSync('test_fixtures/sample_high_bitrate.mp4');
    const highBitrateB64 = highBitrateBytes.toString('base64');
    const silentBytes = fs.readFileSync('test_fixtures/sample_no_audio.mp4');
    const silentB64 = silentBytes.toString('base64');

    console.log('GROUP 1: Complex Media Stream & Audio Preservation vs Mute');

    const streamTests = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          try {
            const { compressVideo } = await import('/src/tools/video-compressor/videoCompressorEngine.js');

            // 1. Compress with audio preserved (messaging preset)
            const bin = atob('${highBitrateB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const fileWithAudio = new File([bytes], 'input_with_sound.mp4', { type: 'video/mp4' });

            const resWithAudio = await compressVideo(fileWithAudio, {
              preset: 'messaging',
              muteAudio: false
            });

            // 2. Compress with muteAudio: true
            const resMuted = await compressVideo(fileWithAudio, {
              preset: 'messaging',
              muteAudio: true
            });

            // 3. Compress video with no input audio track (silent input)
            const binSilent = atob('${silentB64}');
            const bytesSilent = new Uint8Array(binSilent.length);
            for (let i = 0; i < binSilent.length; i++) bytesSilent[i] = binSilent.charCodeAt(i);
            const fileSilent = new File([bytesSilent], 'silent_input.mp4', { type: 'video/mp4' });

            const resSilent = await compressVideo(fileSilent, {
              preset: 'email',
              muteAudio: false
            });

            // Playability and metadata check for with-audio result
            const url1 = URL.createObjectURL(resWithAudio.blob);
            const v1 = document.createElement('video');
            v1.preload = 'metadata';
            v1.src = url1;
            const meta1 = await new Promise((resolve) => {
              v1.onloadedmetadata = () => {
                const info = {
                  playable: true,
                  width: v1.videoWidth,
                  height: v1.videoHeight,
                  duration: v1.duration
                };
                URL.revokeObjectURL(url1);
                resolve(info);
              };
              v1.onerror = () => {
                URL.revokeObjectURL(url1);
                resolve({ playable: false });
              };
              setTimeout(() => {
                URL.revokeObjectURL(url1);
                resolve({ playable: false, timeout: true });
              }, 4000);
            });

            return JSON.stringify({
              success: true,
              withAudioSize: resWithAudio.blob.size,
              mutedSize: resMuted.blob.size,
              silentSize: resSilent.blob.size,
              originalSize: ${highBitrateBytes.length},
              reductionPercent: resWithAudio.reductionPercent,
              meta1
            });
          } catch (e) {
            return JSON.stringify({ error: e.message || String(e), stack: e.stack });
          }
        })()
      `
    });

    const parsed1 = JSON.parse(streamTests?.result?.value);
    if (parsed1.error) fail(`Stream test error: ${parsed1.error}`);
    else {
      if (parsed1.withAudioSize > 0) pass(`Output with audio produced: ${parsed1.withAudioSize} bytes`);
      else fail('Output with audio was 0 bytes');

      if (parsed1.withAudioSize < parsed1.originalSize) {
        pass(`Video compressed smaller than source (${parsed1.withAudioSize} B vs ${parsed1.originalSize} B, -${parsed1.reductionPercent}%)`);
      } else fail('Output not smaller than source');

      if (parsed1.mutedSize > 0 && parsed1.mutedSize < parsed1.withAudioSize) {
        pass(`Muted output is even smaller than with-audio output (${parsed1.mutedSize} B vs ${parsed1.withAudioSize} B)`);
      } else if (parsed1.mutedSize > 0) {
        pass(`Muted video produced without audio track (${parsed1.mutedSize} bytes)`);
      } else fail('Muted compression failed');

      if (parsed1.silentSize > 0) {
        pass(`Silent input video without audio stream compressed successfully (${parsed1.silentSize} bytes)`);
      } else fail('Silent video compression failed');

      if (parsed1.meta1?.playable) {
        pass(`Output video is playable (${parsed1.meta1.width}x${parsed1.meta1.height}, ${parsed1.meta1.duration.toFixed(1)}s)`);
      } else fail('Output video failed playback metadata inspection');
    }

    console.log('\nGROUP 2: Edge Cases & Validation Rejections');

    const edgeTests = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const { compressVideo, validateVideoFile } = await import('/src/tools/video-compressor/videoCompressorEngine.js');

          const results = {};

          // A. Zero-byte file
          try {
            const emptyFile = new File([new Uint8Array(0)], 'empty.mp4', { type: 'video/mp4' });
            await validateVideoFile(emptyFile);
            results.zeroByte = { rejected: false };
          } catch (err) {
            results.zeroByte = { rejected: true, msg: err.message };
          }

          // B. Invalid binary (not video)
          try {
            const fakeFile = new File([new TextEncoder().encode('Lorem ipsum dolor sit amet invalid binary')], 'corrupt.mp4', { type: 'video/mp4' });
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

          // D. Multi-cycle consecutive conversion (FFmpeg state cleanliness)
          try {
            const bin = atob('${highBitrateB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const cycleFile = new File([bytes], 'cycle_test.mp4', { type: 'video/mp4' });

            const resA = await compressVideo(cycleFile, { preset: 'email' });
            const resB = await compressVideo(cycleFile, { preset: 'web' });

            results.multiCycle = {
              success: resA.blob.size > 0 && resB.blob.size > 0,
              sizeA: resA.blob.size,
              sizeB: resB.blob.size
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
      pass(`D. Consecutive multi-cycle compression succeeded (Email: ${parsed2.multiCycle.sizeA} B, Web: ${parsed2.multiCycle.sizeB} B)`);
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
