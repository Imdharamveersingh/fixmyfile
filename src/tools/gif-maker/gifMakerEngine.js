/**
 * Phase 6.4 — GIF Maker Engine
 * Assembles multiple image frames into a genuine animated GIF via
 * FFmpeg WebAssembly (palettegen + paletteuse pipeline).
 * 100% client-side, zero cloud transmission, no CDN dependency.
 * Reuses the shared FFmpeg singleton from Phase 6.3.
 */

import { getFFmpegInstance, isValidGifSignature, countGifFrames } from '../video-to-gif/videoToGifEngine.js';

// ── Safety limits ─────────────────────────────────────────────────────────────

/** Maximum number of frames the tool accepts at once. */
export const MAX_FRAME_COUNT = 60;

/** Maximum size of a single input image (50 MB). */
export const MAX_SINGLE_IMAGE_SIZE = 50 * 1024 * 1024;

/** Maximum total combined size of all frames (200 MB). */
export const MAX_TOTAL_INPUT_SIZE = 200 * 1024 * 1024;

// ── FPS presets ───────────────────────────────────────────────────────────────

export const GIF_FPS_PRESETS = [
  { value: 5,  label: '5 FPS — Very Compact (Slow / Graphics)' },
  { value: 10, label: '10 FPS — Standard & Balanced' },
  { value: 12, label: '12 FPS — Classic Animation' },
  { value: 15, label: '15 FPS — Smooth Motion (Recommended)' },
  { value: 20, label: '20 FPS — Ultra Smooth' },
  { value: 24, label: '24 FPS — Cinematic' }
];

// ── Resolution presets ────────────────────────────────────────────────────────

export const GIF_RESOLUTION_PRESETS = [
  { value: 'auto',     label: 'Auto (Original, no upscale)' },
  { value: '480',      label: '480p — Max height 480 px' },
  { value: '360',      label: '360p — Max height 360 px (Recommended)' },
  { value: '240',      label: '240p — Max height 240 px (Lightweight)' }
];

// ── Supported image MIME types / extensions ───────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// ── Image binary signatures ───────────────────────────────────────────────────

/**
 * Checks whether a buffer starts with a known image file signature.
 * Returns the detected type string or null.
 */
export function detectImageSignature(buffer) {
  if (!buffer || buffer.byteLength < 4) return null;
  const b = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b.length >= 8 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return 'png';

  // WebP: RIFF????WEBP
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50  // WEBP
  ) return 'webp';

  return null;
}

/**
 * Validates a single image File for size, content, and signature.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export async function validateImageFile(file) {
  if (!file) return { valid: false, reason: 'No file provided.' };
  if (file.size === 0) return { valid: false, reason: `"${file.name}" is empty (0 bytes).` };
  if (file.size > MAX_SINGLE_IMAGE_SIZE) {
    return {
      valid: false,
      reason: `"${file.name}" exceeds the 50 MB per-image limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`
    };
  }

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `"${file.name}" is not a supported image format. Accepted: JPG, PNG, WebP.`
    };
  }

  const header = await file.slice(0, 16).arrayBuffer();
  const sig = detectImageSignature(header);
  if (!sig) {
    return {
      valid: false,
      reason: `"${file.name}" failed binary signature validation — the file may be corrupted or misnamed.`
    };
  }

  return { valid: true, type: sig };
}

// ── Filename helpers ──────────────────────────────────────────────────────────

/**
 * Returns a sanitized .gif output filename.
 * For multiple inputs uses "fixmyfile-animation.gif".
 * For single input preserves the stem.
 */
export function getGifOutputFilename(frames) {
  if (!frames || frames.length === 0) return 'fixmyfile-animation.gif';
  if (frames.length === 1) {
    const name = frames[0].file.name;
    const lastDot = name.lastIndexOf('.');
    const stem = lastDot !== -1 ? name.substring(0, lastDot) : name;
    const clean =
      stem.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'frame';
    return `${clean}.gif`;
  }
  return 'fixmyfile-animation.gif';
}

// ── Dimension helpers ─────────────────────────────────────────────────────────

/**
 * Probes an image File for its natural width/height via HTMLImageElement.
 * Resolves with { width, height } or { width: null, height: null } on failure.
 */
export async function probeImageDimensions(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      let settled = false;
      const done = (result) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(result);
      };
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({ width: null, height: null });
      img.src = url;
      setTimeout(() => done({ width: null, height: null }), 4000);
    } catch {
      resolve({ width: null, height: null });
    }
  });
}

/**
 * Computes the unified canvas dimensions for the GIF.
 *
 * Strategy:
 * - Determine the largest width and height across all frames.
 * - Apply the resolution cap (no upscaling).
 * - Round down to nearest even pixel for GIF encoding compatibility.
 * - All frames will be scaled to fit inside this canvas with padding
 *   (letterbox / pillarbox) to avoid distortion.
 *
 * @param {Array<{width:number|null, height:number|null}>} dimensionsList
 * @param {string} resolution — 'auto'|'480'|'360'|'240'
 * @returns {{ canvasW: number, canvasH: number }}
 */
export function computeGifCanvasDimensions(dimensionsList, resolution) {
  const validDims = dimensionsList.filter((d) => d.width && d.height);
  if (validDims.length === 0) {
    // Cannot determine; use a safe default
    return { canvasW: 480, canvasH: 270 };
  }

  let maxW = Math.max(...validDims.map((d) => d.width));
  let maxH = Math.max(...validDims.map((d) => d.height));

  // Resolution cap: max height constraint (never upscale)
  const capH = resolution === '480' ? 480 : resolution === '360' ? 360 : resolution === '240' ? 240 : null;

  if (capH !== null && maxH > capH) {
    const scale = capH / maxH;
    maxW = Math.round(maxW * scale);
    maxH = capH;
  }

  // Ensure even dimensions
  const canvasW = Math.max(2, Math.floor(maxW / 2) * 2);
  const canvasH = Math.max(2, Math.floor(maxH / 2) * 2);

  return { canvasW, canvasH };
}

// ── Core GIF generation ───────────────────────────────────────────────────────

/**
 * Converts an array of image frames into a genuine animated GIF.
 *
 * @param {Array<{ file: File, id: string }>} frames — ordered frames
 * @param {object} options
 * @param {number}   options.fps          — frames per second (5–24)
 * @param {string}   options.resolution   — 'auto'|'480'|'360'|'240'
 * @param {Function} [options.onStatus]   — status string callback
 * @param {Function} [options.onProgress] — FFmpeg progress callback
 * @param {Function} [options.onLog]      — FFmpeg log callback
 * @returns {Promise<{ blob: Blob, filename: string, size: number, frameCount: number, dimensions: { width: number, height: number } }>}
 */
export async function generateGifFromFrames(
  frames,
  { fps = 15, resolution = 'auto', onStatus, onProgress, onLog } = {}
) {
  // ── Validation ──────────────────────────────────────────────────────────────
  if (!frames || frames.length === 0) {
    throw new Error('No frames selected. Please add at least 2 images.');
  }
  if (frames.length < 2) {
    throw new Error('A GIF requires at least 2 frames. Please add more images.');
  }
  if (frames.length > MAX_FRAME_COUNT) {
    throw new Error(`Too many frames (${frames.length}). Maximum is ${MAX_FRAME_COUNT} frames.`);
  }

  const totalSize = frames.reduce((sum, f) => sum + f.file.size, 0);
  if (totalSize > MAX_TOTAL_INPUT_SIZE) {
    throw new Error(
      `Total input size (${(totalSize / 1024 / 1024).toFixed(1)} MB) exceeds the 200 MB combined limit. Please use fewer or smaller images.`
    );
  }

  if (onStatus) onStatus('Validating image frames...');

  // Validate all frames
  for (const frame of frames) {
    const result = await validateImageFile(frame.file);
    if (!result.valid) throw new Error(result.reason);
  }

  // ── Dimension probing ───────────────────────────────────────────────────────
  if (onStatus) onStatus('Analyzing frame dimensions...');
  const dimResults = await Promise.all(frames.map((f) => probeImageDimensions(f.file)));
  const { canvasW, canvasH } = computeGifCanvasDimensions(dimResults, resolution);

  // ── Load FFmpeg ─────────────────────────────────────────────────────────────
  if (onStatus) onStatus('Loading GIF generation engine...');
  const logs = [];
  const ffmpeg = await getFFmpegInstance({
    onLog: (msg) => {
      logs.push(msg);
      if (onLog) onLog(msg);
    },
    onProgress: (p) => {
      if (onProgress) onProgress(p);
    }
  });

  // ── Write frames into FFmpeg virtual FS ────────────────────────────────────
  if (onStatus) onStatus('Reading frames into memory...');
  const ts = Date.now();
  const inputFiles = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const ext = frame.file.name.split('.').pop().toLowerCase() || 'jpg';
    const fname = `frame_${ts}_${String(i).padStart(4, '0')}.${ext}`;
    const buf = await frame.file.arrayBuffer();
    await ffmpeg.writeFile(fname, new Uint8Array(buf));
    inputFiles.push(fname);
  }

  // GIF frame delay (centiseconds): 100 / fps
  const frameDelay = Math.round(100 / fps);

  const outputFileName = `output_${ts}.gif`;

  try {
    // ── Build concat demuxer list ───────────────────────────────────────────
    // We use the concat demuxer so that frame order is guaranteed.
    if (onStatus) onStatus('Preparing frame sequence...');

    const concatContent = inputFiles
      .map((fname) => `file '${fname}'\nduration ${frameDelay / 100}`)
      .join('\n');

    // Append a final `file` entry (required by concat demuxer to display last frame)
    const concatWithTrailer = concatContent + `\nfile '${inputFiles[inputFiles.length - 1]}'`;
    const concatFileName = `concat_${ts}.txt`;
    await ffmpeg.writeFile(concatFileName, concatWithTrailer);

    // ── Scale / pad filter ─────────────────────────────────────────────────
    // Scale each frame to fit inside canvasW×canvasH preserving aspect ratio,
    // then pad to exact canvas with black fill (letterbox/pillarbox strategy).
    const scaleFilter =
      `scale=${canvasW}:${canvasH}:force_original_aspect_ratio=decrease:flags=lanczos,` +
      `pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2:color=black`;

    // Palettegen + paletteuse for high-fidelity GIF
    const filterComplex =
      `[0:v]fps=${fps},${scaleFilter},split[s0][s1];` +
      `[s0]palettegen=max_colors=256:stats_mode=diff[p];` +
      `[s1][p]paletteuse=dither=bayer:bayer_scale=3`;

    if (onStatus) onStatus('Generating GIF palette and encoding frames...');

    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFileName,
      '-vf', filterComplex,
      '-loop', '0',          // infinite loop
      outputFileName
    ];

    const exitCode = await ffmpeg.exec(ffmpegArgs);
    if (exitCode !== 0) {
      throw new Error(`FFmpeg GIF encoding failed (exit code ${exitCode}).`);
    }

    // ── Read output ─────────────────────────────────────────────────────────
    if (onStatus) onStatus('Finalizing GIF...');
    const rawOutput = await ffmpeg.readFile(outputFileName);
    const outputBytes = new Uint8Array(rawOutput);

    if (outputBytes.length === 0) {
      throw new Error('GIF generation failed: output file was empty (0 bytes).');
    }

    // ── Validate output ─────────────────────────────────────────────────────
    if (!isValidGifSignature(outputBytes.buffer)) {
      throw new Error('Generated file failed GIF binary signature check (GIF89a/87a header missing).');
    }

    const frameCount = countGifFrames(outputBytes.buffer);
    const outputBlob = new Blob([outputBytes.buffer], { type: 'image/gif' });
    const filename = getGifOutputFilename(frames);

    if (onStatus) onStatus('Complete');

    return {
      blob: outputBlob,
      filename,
      size: outputBlob.size,
      frameCount,
      dimensions: { width: canvasW, height: canvasH }
    };
  } finally {
    // ── Cleanup virtual FS ──────────────────────────────────────────────────
    for (const fname of inputFiles) {
      try { await ffmpeg.deleteFile(fname); } catch { /* ignore */ }
    }
    try { await ffmpeg.deleteFile(`concat_${ts}.txt`); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputFileName); } catch { /* ignore */ }
  }
}

// Re-export shared utilities for convenience
export { isValidGifSignature, countGifFrames } from '../video-to-gif/videoToGifEngine.js';
