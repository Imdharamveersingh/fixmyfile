/**
 * Word Counter Engine for FixMyFile (/word-counter)
 * 100% Client-side Unicode-aware text metrics analyzer.
 * Evaluates words, characters, sentences, paragraphs, reading and speaking times.
 */

// Average reading speed: 225 words per minute
const READING_WPM = 225;
// Average speaking speed: 135 words per minute
const SPEAKING_WPM = 135;

/**
 * Counts words accurately using Unicode word boundary detection.
 */
export function countWords(text) {
  if (!text || text.trim() === '') return 0;

  // Use Intl.Segmenter if supported
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
      let count = 0;
      for (const seg of segmenter.segment(text)) {
        if (seg.isWordLike) {
          count++;
        }
      }
      return count;
    } catch {
      // Fallback to regex
    }
  }

  // Unicode regex: Letters, numbers, and mark characters
  const matches = text.match(/[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu);
  return matches ? matches.length : 0;
}

/**
 * Counts sentences using standard sentence delimiters (. ! ? and Hindi danda ।)
 */
export function countSentences(text) {
  if (!text || text.trim() === '') return 0;
  // Match sentence terminals followed by space, quote, or end of string
  const clean = text.trim();
  const sentences = clean.split(/[.!?।]+(?:\s+|$)/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

/**
 * Counts paragraphs separated by one or more blank lines.
 */
export function countParagraphs(text) {
  if (!text || text.trim() === '') return 0;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return paragraphs.length;
}

/**
 * Counts lines (newline-delimited).
 */
export function countLines(text) {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

/**
 * Formats reading or speaking time into minutes and seconds.
 */
export function formatTimeEstimate(words, wpm) {
  if (words === 0) return '0 sec';
  const totalSeconds = Math.ceil((words / wpm) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins === 0) {
    return `${secs} sec`;
  }
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Full analysis returning all metrics.
 */
export function analyzeText(text) {
  if (!text) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingTime: '0 sec',
      speakingTime: '0 sec',
      avgWordLength: 0,
      avgSentenceLength: 0
    };
  }

  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const words = countWords(text);
  const sentences = countSentences(text);
  const paragraphs = countParagraphs(text);
  const lines = countLines(text);

  const readingTime = formatTimeEstimate(words, READING_WPM);
  const speakingTime = formatTimeEstimate(words, SPEAKING_WPM);

  const avgWordLength = words > 0 ? parseFloat((charactersNoSpaces / words).toFixed(1)) : 0;
  const avgSentenceLength = sentences > 0 ? parseFloat((words / sentences).toFixed(1)) : 0;

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    readingTime,
    speakingTime,
    avgWordLength,
    avgSentenceLength
  };
}
