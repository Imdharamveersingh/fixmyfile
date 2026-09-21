/**
 * Canonical OCR Engine Service
 * Phase 7 — OCR / Text / Advanced File Tools
 *
 * Uses Tesseract.js configured with 100% offline local vendor assets:
 * - Worker: /vendor/tesseract/worker.min.js
 * - Core WASM: /vendor/tesseract/
 * - Traineddata: /vendor/tesseract/lang-data/eng.traineddata.gz
 * Zero remote API calls. Complete client-side privacy.
 */

import { createWorker } from 'tesseract.js';
import { preprocessImageForOcr } from './ocrPreprocess.js';

let workerInstance = null;
let currentLogger = null;
let initPromise = null;

/**
 * Get or initialize the shared Tesseract.js worker singleton
 * @returns {Promise<Tesseract.Worker>}
 */
export async function getOcrWorker() {
  if (workerInstance) {
    return workerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const worker = await createWorker('eng', 1, {
        workerPath: '/vendor/tesseract/worker.min.js',
        corePath: '/vendor/tesseract',
        langPath: '/vendor/tesseract/lang-data',
        cachePath: '/vendor/tesseract/lang-data',
        logger: (m) => {
          if (currentLogger && typeof currentLogger === 'function') {
            try {
              currentLogger(m);
            } catch {
              // Ignore logging errors
            }
          }
        }
      });
      workerInstance = worker;
      return worker;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Run OCR recognition on an image source (Canvas, Image, Blob, or URL)
 * @param {HTMLCanvasElement|HTMLImageElement|Blob|File|string} source
 * @param {Object} [options={}]
 * @param {Function} [options.onProgress] - (progressObj: { status: string, progress: number }) => void
 * @param {boolean} [options.preprocess=false] - Whether to apply contrast/grayscale preprocessing
 * @param {Object} [options.preprocessOptions={}] - Preprocessing filter options
 * @returns {Promise<{
 *   text: string,
 *   confidence: number,
 *   words: Array,
 *   lines: Array,
 *   blocks: Array
 * }>}
 */
export async function runOcr(source, options = {}) {
  const {
    onProgress = null,
    preprocess = false,
    preprocessOptions = {}
  } = options;

  currentLogger = onProgress;

  try {
    let inputForOcr = source;
    if (preprocess && !(typeof source === 'string' && source.startsWith('data:'))) {
      try {
        inputForOcr = await preprocessImageForOcr(source, preprocessOptions);
      } catch (err) {
        console.warn('OCR preprocessing failed, falling back to original image:', err);
        inputForOcr = source;
      }
    }

    const worker = await getOcrWorker();
    const result = await worker.recognize(inputForOcr, {}, { blocks: true, text: true });

    // Flatten words and lines from blocks
    const words = [];
    const lines = [];
    if (result.data?.blocks) {
      for (const block of result.data.blocks) {
        for (const paragraph of block.paragraphs || []) {
          for (const line of paragraph.lines || []) {
            lines.push(line);
            for (const word of line.words || []) {
              words.push(word);
            }
          }
        }
      }
    }

    return {
      text: result.data?.text || '',
      confidence: Math.round(result.data?.confidence || 0),
      words,
      lines,
      blocks: result.data?.blocks || []
    };
  } finally {
    currentLogger = null;
  }
}

/**
 * Terminate the shared OCR worker and free WebAssembly resources
 */
export async function terminateOcrWorker() {
  if (workerInstance) {
    try {
      await workerInstance.terminate();
    } catch {
      // Ignore termination errors
    } finally {
      workerInstance = null;
      currentLogger = null;
      initPromise = null;
    }
  }
}
