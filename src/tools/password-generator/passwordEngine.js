/**
 * Password Generator Engine for FixMyFile (/password-generator)
 * 100% Client-side cryptographic password generation using Web Crypto API.
 * Uses crypto.getRandomValues() exclusively; avoids insecure random generators.
 */

export const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

export const AMBIGUOUS_CHARS = new Set(['O', '0', 'I', '1', 'l', '|', '`', "'", '"']);
export const SIMILAR_CHARS = new Set(['{', '}', '[', ']', '(', ')', '/', '\\', '~', ',', ';', ':', '.']);

export const PRESETS = [
  {
    id: 'simple',
    name: 'Simple',
    length: 12,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
    excludeAmbiguous: false,
    excludeSimilar: false
  },
  {
    id: 'strong',
    name: 'Strong',
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
    excludeSimilar: false
  },
  {
    id: 'very-strong',
    name: 'Very Strong',
    length: 24,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: true,
    excludeSimilar: false
  }
];

/**
 * Generates a cryptographically secure random integer in range [0, max - 1]
 * using rejection sampling to eliminate modulo bias.
 */
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.getRandomValues) {
    throw new Error('Web Crypto API (crypto.getRandomValues) is required but unavailable.');
  }

  // 32-bit random integer rejection sampling
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max);
  const buffer = new Uint32Array(1);

  while (true) {
    cryptoObj.getRandomValues(buffer);
    const val = buffer[0];
    if (val < limit) {
      return val % max;
    }
  }
}

/**
 * Builds the pool of candidate characters based on user options.
 */
export function buildCharacterPool(options) {
  let pool = '';
  const guaranteed = [];

  if (options.uppercase) {
    let chars = CHARSETS.uppercase;
    if (options.excludeAmbiguous) chars = chars.split('').filter((c) => !AMBIGUOUS_CHARS.has(c)).join('');
    if (options.excludeSimilar) chars = chars.split('').filter((c) => !SIMILAR_CHARS.has(c)).join('');
    if (chars.length > 0) {
      pool += chars;
      guaranteed.push(chars[secureRandomInt(chars.length)]);
    }
  }

  if (options.lowercase) {
    let chars = CHARSETS.lowercase;
    if (options.excludeAmbiguous) chars = chars.split('').filter((c) => !AMBIGUOUS_CHARS.has(c)).join('');
    if (options.excludeSimilar) chars = chars.split('').filter((c) => !SIMILAR_CHARS.has(c)).join('');
    if (chars.length > 0) {
      pool += chars;
      guaranteed.push(chars[secureRandomInt(chars.length)]);
    }
  }

  if (options.numbers) {
    let chars = CHARSETS.numbers;
    if (options.excludeAmbiguous) chars = chars.split('').filter((c) => !AMBIGUOUS_CHARS.has(c)).join('');
    if (options.excludeSimilar) chars = chars.split('').filter((c) => !SIMILAR_CHARS.has(c)).join('');
    if (chars.length > 0) {
      pool += chars;
      guaranteed.push(chars[secureRandomInt(chars.length)]);
    }
  }

  if (options.symbols) {
    let chars = CHARSETS.symbols;
    if (options.excludeAmbiguous) chars = chars.split('').filter((c) => !AMBIGUOUS_CHARS.has(c)).join('');
    if (options.excludeSimilar) chars = chars.split('').filter((c) => !SIMILAR_CHARS.has(c)).join('');
    if (chars.length > 0) {
      pool += chars;
      guaranteed.push(chars[secureRandomInt(chars.length)]);
    }
  }

  return { pool, guaranteed };
}

/**
 * Generates a cryptographically strong random password.
 */
export function generatePassword(options) {
  const length = Math.max(8, Math.min(128, Number(options.length) || 16));
  const { pool, guaranteed } = buildCharacterPool(options);

  if (pool.length === 0) {
    return { password: '', error: 'Please select at least one character set.' };
  }

  const result = [...guaranteed];
  const remainingCount = length - guaranteed.length;

  for (let i = 0; i < remainingCount; i++) {
    result.push(pool[secureRandomInt(pool.length)]);
  }

  // Cryptographically shuffle array using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  const password = result.slice(0, length).join('');
  const strength = calculateStrength(password, pool.length);

  return { password, strength, poolSize: pool.length };
}

/**
 * Evaluates password strength based on length, pool diversity, and entropy bits.
 */
export function calculateStrength(password, poolSize) {
  if (!password) {
    return { label: 'None', score: 0, color: 'var(--text-muted)' };
  }

  const length = password.length;
  // Entropy H = L * log2(R)
  const entropy = length * Math.log2(poolSize || 2);

  if (entropy < 40 || length < 10) {
    return { label: 'Weak', score: 1, color: '#ef4444' };
  }
  if (entropy < 60 || length < 14) {
    return { label: 'Fair', score: 2, color: '#f59e0b' };
  }
  if (entropy < 80 || length < 18) {
    return { label: 'Good', score: 3, color: '#3b82f6' };
  }
  if (entropy < 100 || length < 24) {
    return { label: 'Strong', score: 4, color: '#10b981' };
  }
  return { label: 'Very Strong', score: 5, color: '#059669' };
}
