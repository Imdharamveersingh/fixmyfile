/**
 * Phase 6.1 — MP4 to MP3 Conversion Engine
 * 100% Client-side WebAssembly FFmpeg pipeline.
 * Zero external servers, zero cloud transmissions.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';

// Maximum supported MP4 file size for safe client-side browser decoding (500 MB)
export const MAX_MP4_FILE_SIZE = 500 * 1024 * 1024;

// Global singleton FFmpeg instance to avoid repeated heavy WASM compilation
let globalFFmpeg = null;
let isInitializing = false;
let initPromise = null;

/**
 * Validates whether a given Uint8Array / ArrayBuffer contains an ISO-BMFF (ftyp) header.
 */
export function isValidMp4Signature(buffer) {
  if (!buffer || buffer.byteLength < 8) return false;
  const bytes = new Uint8Array(buffer);
  // Look for 'ftyp' at bytes 4..7 (standard ISO Base Media File Format)
  const isFtyp =
    bytes[4] === 0x66 && // 'f'
    bytes[5] === 0x74 && // 't'
    bytes[6] === 0x79 && // 'y'
    bytes[7] === 0x70; // 'p'
  return isFtyp;
}

/**
 * Validate user-uploaded file for MP4 container compliance.
 */
export async function validateMp4File(file) {
  if (!file) {
    throw new Error('Please select an MP4 video file to convert.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes). Please upload a valid MP4 video.');
  }

  if (file.size > MAX_MP4_FILE_SIZE) {
    throw new Error(
      `File size exceeds the 500 MB browser limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a smaller MP4 file.`
    );
  }

  // Read first 32 bytes for ISO-BMFF box header validation
  const headerSlice = await file.slice(0, 32).arrayBuffer();
  if (!isValidMp4Signature(headerSlice)) {
    throw new Error('Invalid file format: Missing MP4/ISO-BMFF (ftyp) container signature.');
  }

  return true;
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
 * Generate safe, sanitized output filename ending with .mp3.
 */
export function getSanitizedMp3Filename(originalName) {
  if (!originalName) return 'audio.mp3';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'extracted_audio';
  return `${cleanBase}.mp3`;
}

/**
 * Checks if a byte buffer starts with valid MP3 frame sync or ID3 tag.
 */
export function isValidMp3Buffer(buffer) {
  if (!buffer || buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer);
  // ID3v2 header: 'ID3' (0x49 0x44 0x33)
  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  // MPEG Audio frame sync: 11 set bits (0xFF followed by high 3 bits 0xE0)
  const isMpegFrame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  // Ensure it is NOT an MP4 container masquerading as MP3
  const isMp4 = isValidMp4Signature(buffer);

  return (isId3 || isMpegFrame) && !isMp4;
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
 * Converts an MP4 file into an MP3 file using FFmpeg WASM.
 *
 * @param {File|Blob} file The uploaded MP4 file.
 * @param {Object} options Configuration callbacks (onStatus, onProgress, onLog, bitrate).
 * @returns {Promise<{ blob: Blob, filename: string, size: number, duration?: number }>}
 */
export async function convertMp4ToMp3(file, { onStatus, onProgress, onLog, bitrate = '192k' } = {}) {
  // 1. Validate the file thoroughly
  if (onStatus) onStatus('Validating MP4 container...');
  await validateMp4File(file);

  // 2. Load the WebAssembly FFmpeg engine
  if (onStatus) onStatus('Loading local audio extraction engine...');
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

  // 3. Write source binary to virtual file system
  if (onStatus) onStatus('Reading video stream into memory...');
  const arrayBuffer = await file.arrayBuffer();
  const inputFileName = `input_${Date.now()}.mp4`;
  const outputFileName = `output_${Date.now()}.mp3`;

  try {
    await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

    // 4. Execute extraction: extract audio stream, encode genuine MP3 with libmp3lame
    if (onStatus) onStatus('Extracting audio track and encoding MP3...');
    const execResult = await ffmpeg.exec([
      '-i',
      inputFileName,
      '-vn', // Disable video stream recording
      '-c:a',
      'libmp3lame', // High-fidelity MP3 encoder
      '-b:a',
      bitrate, // Configurable bitrate (default 192 kbps)
      outputFileName
    ]);

    // Check for execution failure or missing audio stream
    if (execResult !== 0) {
      const logText = logs.join(' ');
      if (
        logText.includes('Output file #0 does not contain any stream') ||
        logText.includes('does not contain any stream') ||
        logText.includes('Stream map') ||
        logText.includes('matches no streams')
      ) {
        throw new Error(
          'No audio track was found in this MP4 video. The uploaded file does not contain an audio stream to extract.'
        );
      }
      throw new Error(`FFmpeg audio extraction failed (code ${execResult}).`);
    }

    // 5. Read generated MP3 output from virtual file system
    const rawOutput = await ffmpeg.readFile(outputFileName);
    const outputBytes = new Uint8Array(rawOutput);

    if (outputBytes.length === 0) {
      throw new Error('Conversion failed: Generated MP3 file was empty.');
    }

    // 6. Verify MP3 binary integrity
    if (!isValidMp3Buffer(outputBytes.buffer)) {
      throw new Error('Generated output failed MP3 binary validation.');
    }

    const outputBlob = new Blob([outputBytes.buffer], { type: 'audio/mpeg' });
    const outputFilename = getSanitizedMp3Filename(file.name);

    if (onStatus) onStatus('Complete');

    return {
      blob: outputBlob,
      filename: outputFilename,
      size: outputBlob.size
    };
  } finally {
    // 7. Resource cleanup on FFmpeg virtual filesystem
    try {
      await ffmpeg.deleteFile(inputFileName);
    } catch {
      // Ignored if already removed
    }
    try {
      await ffmpeg.deleteFile(outputFileName);
    } catch {
      // Ignored if already removed
    }
  }
}
