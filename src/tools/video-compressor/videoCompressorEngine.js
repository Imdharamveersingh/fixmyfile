/**
 * Phase 6.2 — Video Compressor Engine
 * 100% Client-side WebAssembly FFmpeg pipeline.
 * Zero external servers, zero cloud transmissions.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';

// Maximum supported video file size for safe client-side browser decoding (500 MB)
export const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

export const COMPRESSION_PRESETS = {
  email: {
    id: 'email',
    name: 'Email & Ultra Compact',
    description: 'Smallest file size. Downscales to max 480p with aggressive compression for email attachment limits.',
    maxDimension: 480,
    crf: 32,
    videoBitrate: '400k',
    audioBitrate: '64k'
  },
  messaging: {
    id: 'messaging',
    name: 'Messaging & Social (Recommended)',
    description: 'Optimal balance of sharpness and file size reduction. Downscales to max 720p for WhatsApp, Discord, Slack, and Telegram.',
    maxDimension: 720,
    crf: 28,
    videoBitrate: '800k',
    audioBitrate: '96k'
  },
  web: {
    id: 'web',
    name: 'Web & High Quality',
    description: 'High visual fidelity with moderate size savings. Downscales to max 1080p.',
    maxDimension: 1080,
    crf: 24,
    videoBitrate: '1500k',
    audioBitrate: '128k'
  }
};

// Global singleton FFmpeg instance to avoid repeated heavy WASM compilation
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
 * Validate user-uploaded file for video container compliance and size limits.
 */
export async function validateVideoFile(file) {
  if (!file) {
    throw new Error('Please select a video file to compress.');
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
 * Calculates target dimensions ensuring aspect-ratio preservation, no upscaling,
 * and even dimensions (divisible by 2) required by H.264 encoders.
 */
export function calculateTargetDimensions(width, height, maxDimension) {
  if (!width || !height) return null;

  if (!maxDimension) {
    return {
      width: Math.max(2, Math.floor(width / 2) * 2),
      height: Math.max(2, Math.floor(height / 2) * 2)
    };
  }

  // Standard video definition: 'p' refers to height in landscape or width in portrait (shorter dimension)
  const isLandscape = width >= height;
  const baseDim = isLandscape ? height : width;

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
 * Generate safe, sanitized output filename ending with _compressed.mp4.
 */
export function getSanitizedCompressedFilename(originalName) {
  if (!originalName) return 'compressed_video.mp4';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'video';
  return `${cleanBase}_compressed.mp4`;
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
 * Compresses a video file using FFmpeg WASM with customizable presets and dimensions.
 *
 * @param {File|Blob} file The uploaded video file.
 * @param {Object} options Compression configuration.
 * @returns {Promise<{ blob: Blob, filename: string, size: number, originalSize: number, reductionPercent: number, dimensions: { width: number, height: number } }>}
 */
export async function compressVideo(
  file,
  {
    preset = 'messaging',
    resolution = 'auto',
    muteAudio = false,
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
    if (onStatus) onStatus('Analyzing video streams...');
    metadata = await probeVideoMetadata(file);
  }

  // 3. Resolve preset configurations
  const chosenPreset = COMPRESSION_PRESETS[preset] || COMPRESSION_PRESETS.messaging;

  // Determine target max dimension constraint
  let maxDimConstraint = chosenPreset.maxDimension;
  if (resolution === '1080p') maxDimConstraint = 1080;
  else if (resolution === '720p') maxDimConstraint = 720;
  else if (resolution === '480p') maxDimConstraint = 480;
  else if (resolution === '360p') maxDimConstraint = 360;
  else if (resolution === 'original') maxDimConstraint = null;

  // Calculate target dimensions if original width & height are known
  let targetDims = null;
  if (metadata?.width && metadata?.height) {
    targetDims = calculateTargetDimensions(metadata.width, metadata.height, maxDimConstraint);
  }

  // 4. Load the WebAssembly FFmpeg engine
  if (onStatus) onStatus('Loading local video compression engine...');
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

  // 5. Write source binary to FFmpeg virtual filesystem
  if (onStatus) onStatus('Reading video stream into memory...');
  const arrayBuffer = await file.arrayBuffer();
  const inputExtension = file.name ? file.name.split('.').pop() : 'mp4';
  const inputFileName = `input_${Date.now()}.${inputExtension}`;
  const outputFileName = `output_${Date.now()}.mp4`;

  try {
    await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

    // 6. Build FFmpeg command arguments
    if (onStatus) onStatus('Compressing video and optimizing bitrate...');

    const ffmpegArgs = [
      '-i',
      inputFileName,
      '-map',
      '0:v',
      '-map',
      '0:a?', // Gracefully include audio only if present
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      String(chosenPreset.crf),
      '-b:v',
      chosenPreset.videoBitrate,
      '-pix_fmt',
      'yuv420p'
    ];

    // Scaling filter configuration
    if (targetDims?.width && targetDims?.height) {
      ffmpegArgs.push('-vf', `scale=${targetDims.width}:${targetDims.height}`);
    } else if (maxDimConstraint) {
      // Fallback FFmpeg internal expression preserving aspect ratio and even dimensions
      ffmpegArgs.push('-vf', `scale='min(iw,${maxDimConstraint})':-2`);
    }

    // Audio stream configuration
    if (muteAudio) {
      ffmpegArgs.push('-an');
    } else {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', chosenPreset.audioBitrate);
    }

    // Web-friendly container flags
    ffmpegArgs.push('-movflags', '+faststart', outputFileName);

    // 7. Execute FFmpeg compression
    const execResult = await ffmpeg.exec(ffmpegArgs);

    if (execResult !== 0) {
      throw new Error(`FFmpeg video compression failed (exit code ${execResult}).`);
    }

    // 8. Read generated output
    const rawOutput = await ffmpeg.readFile(outputFileName);
    const outputBytes = new Uint8Array(rawOutput);

    if (outputBytes.length === 0) {
      throw new Error('Compression failed: Output video file was empty (0 bytes).');
    }

    // Validate container integrity
    if (!isValidVideoSignature(outputBytes.buffer)) {
      throw new Error('Generated output failed MP4 container validation.');
    }

    const outputBlob = new Blob([outputBytes.buffer], { type: 'video/mp4' });
    const outputFilename = getSanitizedCompressedFilename(file.name);

    const originalSize = file.size;
    const compressedSize = outputBlob.size;
    const reductionPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100)
    );

    if (onStatus) onStatus('Complete');

    return {
      blob: outputBlob,
      filename: outputFilename,
      size: compressedSize,
      originalSize,
      reductionPercent,
      dimensions: targetDims || { width: metadata?.width || null, height: metadata?.height || null }
    };
  } finally {
    // 9. Clean virtual filesystem
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
