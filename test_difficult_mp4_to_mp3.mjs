/**
 * Phase 6.1 — MP4 to MP3: Difficult & Edge Case Test Suite
 * Run: node test_difficult_mp4_to_mp3.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/mp4-to-mp3';
const DEBUG_PORT = 9447;

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
  console.log('\n=== Phase 6.1 — MP4 to MP3: Difficult Edge Tests ===\n');

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

    // Load fixture bytes
    const sampleBytes = fs.readFileSync('test_fixtures/sample_with_audio.mp4');
    const sampleB64 = sampleBytes.toString('base64');
    const noAudioBytes = fs.readFileSync('test_fixtures/sample_no_audio.mp4');
    const noAudioB64 = noAudioBytes.toString('base64');

    console.log('GROUP 1: Complex Audio Stream Decoding & Header Verification');

    const conversionEvaluation = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          try {
            const { convertMp4ToMp3, validateMp4File } = await import('/src/tools/mp4-to-mp3/mp4ToMp3Engine.js');

            const bin = atob('${sampleB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const file = new File([bytes], 'concert_recording_4k.mp4', { type: 'video/mp4' });

            const t0 = performance.now();
            const result = await convertMp4ToMp3(file, { bitrate: '320k' });
            const conversionDurationMs = performance.now() - t0;

            const outBuf = await result.blob.arrayBuffer();
            const outBytes = new Uint8Array(outBuf);

            // Audio Context decode verification (check if output MP3 decodes into AudioBuffer)
            let audioDecodable = false;
            let decodedDuration = 0;
            let sampleRate = 0;
            let channels = 0;
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const audioBuf = await audioCtx.decodeAudioData(outBuf.slice(0));
              audioDecodable = true;
              decodedDuration = audioBuf.duration;
              sampleRate = audioBuf.sampleRate;
              channels = audioBuf.numberOfChannels;
              audioCtx.close();
            } catch (e) {
              audioDecodable = false;
            }

            // MP3 frame / ID3 check
            const isId3 = outBytes[0] === 0x49 && outBytes[1] === 0x44 && outBytes[2] === 0x33;
            const isMpegFrame = outBytes[0] === 0xff && (outBytes[1] & 0xe0) === 0xe0;

            // Confirm it is NOT an MP4 container (no 'ftyp' at bytes 4..7)
            const isNotMp4 = !(outBytes[4] === 0x66 && outBytes[5] === 0x74 && outBytes[6] === 0x79 && outBytes[7] === 0x70);
            // Confirm it is NOT a WebM container (no EBML header 0x1A 0x45 0xDF 0xA3)
            const isNotWebm = !(outBytes[0] === 0x1a && outBytes[1] === 0x45 && outBytes[2] === 0xdf && outBytes[3] === 0xa3);
            // Confirm it is NOT a WAV file (no 'RIFF')
            const isNotWav = !(outBytes[0] === 0x52 && outBytes[1] === 0x49 && outBytes[2] === 0x46 && outBytes[3] === 0x46);

            return JSON.stringify({
              success: true,
              conversionDurationMs: Math.round(conversionDurationMs),
              outputSize: outBytes.length,
              filename: result.filename,
              audioDecodable,
              decodedDuration,
              sampleRate,
              channels,
              hasValidHeader: isId3 || isMpegFrame,
              isNotMp4,
              isNotWebm,
              isNotWav
            });
          } catch (e) {
            return JSON.stringify({ error: e.message || String(e), stack: e.stack });
          }
        })()
      `
    });

    const parsed1 = JSON.parse(conversionEvaluation?.result?.value);
    if (parsed1.error) fail(`Conversion failed: ${parsed1.error}`);
    else {
      if (parsed1.outputSize > 0) pass(`MP3 output produced: ${parsed1.outputSize} bytes in ${parsed1.conversionDurationMs}ms`);
      else fail('MP3 output size is 0');

      if (parsed1.hasValidHeader) pass('Output contains valid MP3 ID3v2 / MPEG frame sync header');
      else fail('Invalid MP3 header bytes');

      if (parsed1.isNotMp4) pass('Output is not an MP4 container');
      else fail('Output mistakenly retained MP4 container');

      if (parsed1.isNotWebm && parsed1.isNotWav) pass('Output is not WebM or WAV format');
      else fail('Output is WebM or WAV');

      if (parsed1.audioDecodable) pass(`MP3 is genuinely decodable via Web Audio (${parsed1.decodedDuration.toFixed(2)}s, ${parsed1.sampleRate}Hz, ${parsed1.channels}ch)`);
      else fail('Generated MP3 failed Web Audio decoding');

      if (parsed1.filename === 'concert_recording_4k.mp3') pass(`Filename correctly sanitized to ${parsed1.filename}`);
      else fail(`Unexpected filename: ${parsed1.filename}`);
    }

    console.log('\nGROUP 2: Edge Cases & Rejections');

    const edgeTests = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const { convertMp4ToMp3, validateMp4File } = await import('/src/tools/mp4-to-mp3/mp4ToMp3Engine.js');

          const results = {};

          // A. MP4 with no audio stream
          try {
            const bin = atob('${noAudioB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const noAudioFile = new File([bytes], 'silent.mp4', { type: 'video/mp4' });
            await convertMp4ToMp3(noAudioFile);
            results.noAudio = { rejected: false };
          } catch (err) {
            results.noAudio = { rejected: true, msg: err.message };
          }

          // B. Zero-byte file
          try {
            const emptyFile = new File([new Uint8Array(0)], 'empty.mp4', { type: 'video/mp4' });
            await validateMp4File(emptyFile);
            results.zeroByte = { rejected: false };
          } catch (err) {
            results.zeroByte = { rejected: true, msg: err.message };
          }

          // C. Invalid binary (not MP4)
          try {
            const fakeFile = new File([new TextEncoder().encode('Fake random data 1234567890')], 'corrupt.mp4', { type: 'video/mp4' });
            await validateMp4File(fakeFile);
            results.invalidBinary = { rejected: false };
          } catch (err) {
            results.invalidBinary = { rejected: true, msg: err.message };
          }

          // D. Oversized file (> 500 MB mock)
          try {
            const hugeBlob = { size: 600 * 1024 * 1024, slice: () => new Blob() };
            await validateMp4File(hugeBlob);
            results.oversized = { rejected: false };
          } catch (err) {
            results.oversized = { rejected: true, msg: err.message };
          }

          // E. Second conversion after reset
          try {
            const bin = atob('${sampleB64}');
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const secondFile = new File([bytes], 'second_run.mp4', { type: 'video/mp4' });
            const res2 = await convertMp4ToMp3(secondFile, { bitrate: '128k' });
            results.secondRun = { success: res2.blob.size > 0 };
          } catch (err) {
            results.secondRun = { success: false, error: err.message };
          }

          return JSON.stringify(results);
        })()
      `
    });

    const parsed2 = JSON.parse(edgeTests?.result?.value);

    // Assertions for Edge Cases
    if (parsed2.noAudio?.rejected && parsed2.noAudio.msg.includes('No audio track was found')) {
      pass('A. MP4 with no audio stream rejected with informative message');
    } else fail(`A. Silent MP4 rejection failed: ${JSON.stringify(parsed2.noAudio)}`);

    if (parsed2.zeroByte?.rejected && parsed2.zeroByte.msg.includes('empty')) {
      pass('B. Zero-byte file rejected gracefully');
    } else fail('B. Zero-byte file was not rejected');

    if (parsed2.invalidBinary?.rejected && parsed2.invalidBinary.msg.includes('signature')) {
      pass('C. Invalid random binary rejected via ISO-BMFF signature check');
    } else fail('C. Invalid binary was not rejected');

    if (parsed2.oversized?.rejected && parsed2.oversized.msg.includes('limit')) {
      pass('D. Oversized (>500MB) file rejected before processing');
    } else fail('D. Oversized file was not rejected');

    if (parsed2.secondRun?.success) {
      pass('E. Second conversion after reset succeeds cleanly without stale FFmpeg state');
    } else fail(`E. Second conversion failed: ${JSON.stringify(parsed2.secondRun)}`);

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
