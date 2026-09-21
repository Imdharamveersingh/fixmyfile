/**
 * Phase 6.3 — Video to GIF Engine
 * 100% Client-side WebAssembly FFmpeg pipeline.
 * Palettegen + Paletteuse for high-fidelity animated GIF creation.
 * Zero external servers, zero cloud transmissions.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';

// Maximum supported video file size for safe client-side browser decoding (500 MB)
export const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

// Maximum allowed GIF duration in seconds to protect browser memory
export const MAX_GIF_DURATION_SECONDS = 30;

// Framerate presets
export const FPS_PRESETS = [
  { value: 5, label: '5 FPS — Very Compact (Slow Motion / Graphics)' },
  { value: 10, label: '10 FPS — Standard & Balanced (Recommended)' },
  { value: 15, label: '15 FPS — Smooth Motion' },
  { value: 20, label: '20 FPS — Ultra Smooth' },
  { value: 24, label: '24 FPS — Cinematic' }
];

// Resolution presets (width in landscape, clamped without upscaling)
export const RESOLUTION_PRESETS = [
  { value: 'auto', label: 'Auto (Match Source, Max 480p)' },
  { value: '480', label: '480p (Max 480px)' },
  { value: '360', label: '360p (Max 360px — Recommended for GIFs)' },
  { value: '240', label: '240p (Max 240px — Lightweight)' },
  { value: 'original', label: 'Original Dimensions (No Scaling)' }
];

// Global singleton FFmpeg instance
let globalFFmpeg = null;
let isInitializing = false;
let initPromise = null;

/**
 * Validates whether a given buffer contains a supported video container signature.
 * Recognizes ISO-BMFF (MP4, MOV), Matroska / WebM, and AVI.
 */
export function isValidVideoSignature(buffer) {
  if (!buffer || buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer);

  // 1. ISO Base Media File Format (MP4 / MOV) — 'ftyp' at bytes 4..7 or 'moov'/'mdat'
  if (bytes.length >= 8) {
    const isFtyp =
      bytes[4] === 0x66 && // 'f'
      bytes[5] === 0x74 && // 't'
      bytes[6] === 0x79 && // 'y'
      bytes[7] === 0x70; // 'p'
    if (isFtyp) return true;

    const isMoovOrMdat =
      (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76) || // 'moov'
      (bytes[4] === 0x6d && bytes[5] === 0x64 && bytes[6] === 0x61 && bytes[7] === 0x74); // 'mdat'
    if (isMoovOrMdat) return true;
  }

  // 2. Matroska / WebM EBML Header: 0x1A 0x45 0xDF 0xA3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return true;
  }

  // 3. AVI RIFF Container: 'RIFF' at 0..3 and 'AVI ' at 8..11
  if (bytes.length >= 12) {
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isAvi = bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20;
    if (isRiff && isAvi) return true;
  }

  return false;
}

/**
 * Validate user-uploaded file for video container compliance, zero-byte checks, and size limits.
 */
export async function validateVideoFile(file) {
  if (!file) {
    throw new Error('Please select a video file to convert to GIF.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes). Please upload a valid video.');
  }

  if (file.size > MAX_VIDEO_FILE_SIZE) {
    throw new Error(
      `File size exceeds the 500 MB browser limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a smaller video file.`
    );
  }

  // Read first 32 bytes for container header validation
  const headerSlice = await file.slice(0, 32).arrayBuffer();
  if (!isValidVideoSignature(headerSlice)) {
    throw new Error('Invalid or unsupported video format: Missing recognizable video container signature (MP4, WebM, MOV).');
  }

  return true;
}

/**
 * Verify whether a buffer starts with standard GIF signature (GIF89a or GIF87a).
 */
export function isValidGifSignature(buffer) {
  if (!buffer || buffer.byteLength < 6) return false;
  const bytes = new Uint8Array(buffer);
  return (
    bytes[0] === 0x47 && // 'G'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x38 && // '8'
    (bytes[4] === 0x39 || bytes[4] === 0x37) && // '9' or '7'
    bytes[5] === 0x61 // 'a'
  );
}

/**
 * Counts animated frames in a GIF buffer by counting Graphic Control Extensions (0x21 0xF9 0x04)
 * or Image Descriptors (0x2C).
 */
export function countGifFrames(buffer) {
  if (!buffer || buffer.byteLength < 16) return 0;
  const bytes = new Uint8Array(buffer);
  let gceCount = 0;
  let imageDescCount = 0;

  for (let i = 0; i < bytes.length - 2; i++) {
    // Graphic Control Extension marker
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
      gceCount++;
    }
    // Image Separator comma (starts each frame's image descriptor)
    if (bytes[i] === 0x2c) {
      imageDescCount++;
    }
  }

  return gceCount > 0 ? gceCount : imageDescCount;
}

/**
 * Calculates target GIF dimensions ensuring aspect-ratio preservation, no upscaling,
 * and even dimensions.
 */
export function calculateGifDimensions(width, height, maxDimension) {
  if (!width || !height) return null;

  if (!maxDimension) {
    return {
      width: Math.max(2, Math.floor(width / 2) * 2),
      height: Math.max(2, Math.floor(height / 2) * 2)
    };
  }

  const isLandscape = width >= height;
  const baseDim = isLandscape ? width : height;

  // Never upscale: if already smaller than or equal to target constraint, preserve dimensions
  if (baseDim <= maxDimension) {
    return {
      width: Math.max(2, Math.floor(width / 2) * 2),
      height: Math.max(2, Math.floor(height / 2) * 2)
    };
  }

  const scale = maxDimension / baseDim;
  const targetW = Math.max(2, Math.round((width * scale) / 2) * 2);
  const targetH = Math.max(2, Math.round((height * scale) / 2) * 2);

  return {
    width: targetW,
    height: targetH
  };
}

/**
 * Formats bytes to human-readable string.
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Generate safe, sanitized output filename ending with .gif.
 */
export function getSanitizedGifFilename(originalName) {
  if (!originalName) return 'animation.gif';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'video_clip';
  return `${cleanBase}.gif`;
}

/**
 * Probe video metadata (duration, width, height) in the browser using HTMLVideoElement.
 */
export async function probeVideoMetadata(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;

      let settled = false;
      const done = (meta) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(meta);
      };

      video.onloadedmetadata = () => {
        const dur = video.duration || 0;
        const m = Math.floor(dur / 60);
        const s = Math.floor(dur % 60);
        const durationFormatted = `${m}:${s < 10 ? '0' : ''}${s}`;
        done({
          width: video.videoWidth || null,
          height: video.videoHeight || null,
          durationSeconds: dur,
          durationFormatted
        });
      };

      video.onerror = () => done(null);
      setTimeout(() => done(null), 3000);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Initializes and returns the shared FFmpeg WASM instance.
 */
export async function getFFmpegInstance({ onLog, onProgress } = {}) {
  if (globalFFmpeg && globalFFmpeg.loaded) {
    if (onLog) globalFFmpeg.on('log', ({ message }) => onLog(message));
    if (onProgress) globalFFmpeg.on('progress', ({ progress, time }) => onProgress({ progress, time }));
    return globalFFmpeg;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    const ffmpeg = new FFmpeg();

    if (onLog) {
      ffmpeg.on('log', ({ message }) => onLog(message));
    }
    if (onProgress) {
      ffmpeg.on('progress', ({ progress, time }) => onProgress({ progress, time }));
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const coreURL = `${origin}/vendor/ffmpeg/ffmpeg-core.js`;
    const wasmURL = `${origin}/vendor/ffmpeg/ffmpeg-core.wasm`;
    const classWorkerURL = `${origin}/vendor/ffmpeg/worker.js`;

    await ffmpeg.load({
      classWorkerURL,
      coreURL,
      wasmURL
    });

    globalFFmpeg = ffmpeg;
    isInitializing = false;
    return ffmpeg;
  })();

  return initPromise;
}

/**
 * Converts a video clip to an animated GIF using FFmpeg WASM with palettegen + paletteuse.
 *
 * @param {File|Blob} file The uploaded video file.
 * @param {Object} options Configuration (fps, resolution, maxDuration, startTime, onStatus, onProgress, onLog).
 * @returns {Promise<{ blob: Blob, filename: string, size: number, originalSize: number, frameCount: number, dimensions: { width: number, height: number } }>}
 */
export async function convertVideoToGif(
  file,
  {
    fps = 10,
    resolution = 'auto',
    maxDuration = 15,
    startTime = 0,
    onStatus,
    onProgress,
    onLog
  } = {}
) {
  // 1. Validate the video file
  if (onStatus) onStatus('Validating video container...');
  await validateVideoFile(file);

  // 2. Extract metadata if in browser environment
  let metadata = null;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (onStatus) onStatus('Analyzing video stream properties...');
    metadata = await probeVideoMetadata(file);
  }

  // 3. Determine target resolution constraint
  let maxDim = 480; // Default max dimension for GIF
  if (resolution === '480') maxDim = 480;
  else if (resolution === '360') maxDim = 360;
  else if (resolution === '240') maxDim = 240;
  else if (resolution === 'original') maxDim = null;
  else if (resolution === 'auto') maxDim = 480;

  // Calculate target dimensions
  let targetDims = null;
  if (metadata?.width && metadata?.height) {
    targetDims = calculateGifDimensions(metadata.width, metadata.height, maxDim);
  }

  // Determine clamped duration limit (protect browser from oversized GIFs)
  const durationLimit = Math.min(
    Math.max(1, Number(maxDuration) || 15),
    MAX_GIF_DURATION_SECONDS
  );

  // 4. Load the WebAssembly FFmpeg engine
  if (onStatus) onStatus('Loading local GIF generation engine...');
  const logs = [];
  const handleLog = (msg) => {
    logs.push(msg);
    if (onLog) onLog(msg);
  };

  const ffmpeg = await getFFmpegInstance({
    onLog: handleLog,
    onProgress: (p) => {
      if (onProgress) onProgress(p);
    }
  });

  // 5. Write source binary to virtual file system
  if (onStatus) onStatus('Reading video stream into memory...');
  const arrayBuffer = await file.arrayBuffer();
  const inputExtension = file.name ? file.name.split('.').pop() : 'mp4';
  const inputFileName = `input_${Date.now()}.${inputExtension}`;
  const outputFileName = `output_${Date.now()}.gif`;

  try {
    await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

    // 6. Construct FFmpeg command with palettegen/paletteuse
    if (onStatus) onStatus('Generating palette and rendering GIF frames...');

    // Scale expression: if dimensions are known, scale=W:H; else scale=min(iw,maxDim):-1
    let scaleFilter = '';
    if (targetDims?.width && targetDims?.height) {
      scaleFilter = `scale=${targetDims.width}:${targetDims.height}:flags=lanczos`;
    } else if (maxDim) {
      scaleFilter = `scale='min(iw,${maxDim})':-1:flags=lanczos`;
    } else {
      scaleFilter = 'scale=trunc(iw/2)*2:-1:flags=lanczos';
    }

    const filterComplex = `fps=${fps},${scaleFilter},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`;

    const ffmpegArgs = [];
    // Start time offset if provided
    if (startTime > 0) {
      ffmpegArgs.push('-ss', String(startTime));
    }
    // Duration ceiling
    ffmpegArgs.push('-t', String(durationLimit));

    ffmpegArgs.push(
      '-i',
      inputFileName,
      '-vf',
      filterComplex,
      '-loop',
      '0', // Infinite looping
      outputFileName
    );

    // 7. Execute GIF conversion
    const execResult = await ffmpeg.exec(ffmpegArgs);

    if (execResult !== 0) {
      throw new Error(`FFmpeg GIF rendering failed (exit code ${execResult}).`);
    }

    // 8. Read generated GIF binary
    const rawOutput = await ffmpeg.readFile(outputFileName);
    const outputBytes = new Uint8Array(rawOutput);

    if (outputBytes.length === 0) {
      throw new Error('GIF generation failed: Output file was empty (0 bytes).');
    }

    // 9. Validate GIF binary signature
    if (!isValidGifSignature(outputBytes.buffer)) {
      throw new Error('Generated output failed GIF binary signature validation (missing GIF89a/87a header).');
    }

    const frameCount = countGifFrames(outputBytes.buffer);
    const outputBlob = new Blob([outputBytes.buffer], { type: 'image/gif' });
    const outputFilename = getSanitizedGifFilename(file.name);

    if (onStatus) onStatus('Complete');

    return {
      blob: outputBlob,
      filename: outputFilename,
      size: outputBlob.size,
      originalSize: file.size,
      frameCount,
      dimensions: targetDims || { width: metadata?.width || null, height: metadata?.height || null }
    };
  } finally {
    // 10. Virtual filesystem cleanup
    try {
      await ffmpeg.deleteFile(inputFileName);
    } catch {
      // Ignored
    }
    try {
      await ffmpeg.deleteFile(outputFileName);
    } catch {
      // Ignored
    }
  }
}
