/**
 * Currency Conversion Engine for FixMyFile (/currency-converter)
 * 100% Client-side rate calculation with public free API fetching,
 * localStorage caching, and comprehensive offline reference rate fallback.
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' }
];

export const CURRENCY_MAP = new Map(SUPPORTED_CURRENCIES.map((c) => [c.code, c]));

/**
 * Built-in baseline reference rates against USD (base = 1.0).
 * Used when offline or if live API request fails.
 */
export const FALLBACK_RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 155.2,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.91,
  CNY: 7.24,
  SGD: 1.35,
  AED: 3.67,
  SAR: 3.75,
  NZD: 1.64,
  BRL: 5.15,
  ZAR: 18.4,
  SEK: 10.5,
  KRW: 1370.0,
  HKD: 7.82
};

const CACHE_KEY = 'fixmyfile_currency_rates_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Validates a numeric amount string.
 * Returns { valid: boolean, error?: string, numericValue?: number }
 */
export function validateAmount(amountStr) {
  if (amountStr === null || amountStr === undefined || amountStr.trim() === '') {
    return { valid: false, error: 'Please enter an amount.' };
  }
  const clean = amountStr.trim();
  if (!/^-?\d*\.?\d+$/.test(clean)) {
    return { valid: false, error: 'Please enter a valid numeric amount.' };
  }
  const num = parseFloat(clean);
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number format.' };
  }
  if (num < 0) {
    return { valid: false, error: 'Amount cannot be negative.' };
  }
  if (num > 1e14) {
    return { valid: false, error: 'Amount exceeds maximum calculation limit.' };
  }
  return { valid: true, numericValue: num };
}

/**
 * Computes converted currency amount using exchange rate table normalized to USD.
 */
export function convertCurrency(amount, fromCode, toCode, rates = FALLBACK_RATES) {
  const fromRate = rates[fromCode];
  const toRate = rates[toCode];

  if (!fromRate || !toRate) {
    throw new Error(`Exchange rate unavailable for ${fromCode} or ${toCode}`);
  }

  // Convert via base currency USD: (amount / fromRate) * toRate
  const result = (amount / fromRate) * toRate;
  const unitRate = toRate / fromRate;
  const reverseRate = fromRate / toRate;

  return {
    result,
    unitRate,
    reverseRate
  };
}

/**
 * Formats a currency amount with appropriate decimal precision and symbol.
 */
export function formatCurrencyValue(val, code) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';

  // Determine decimals: JPY/KRW typically 0 or 2, standard 2, small fractions up to 4
  let minDec = 2;
  let maxDec = 2;
  if (code === 'JPY' || code === 'KRW') {
    minDec = 0;
    maxDec = 2;
  } else if (val > 0 && val < 0.01) {
    minDec = 4;
    maxDec = 6;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec
    }).format(val);
  } catch {
    return val.toFixed(maxDec);
  }
}

/**
 * Fetches latest exchange rates from open.er-api.com with localStorage caching and fallback.
 */
export async function fetchExchangeRates(forceRefresh = false) {
  // Check localStorage cache if not forced
  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS && parsed.rates) {
          return {
            rates: { ...FALLBACK_RATES, ...parsed.rates },
            source: 'Open Exchange Rates (Cached)',
            lastUpdated: parsed.lastUpdated || new Date(parsed.timestamp).toISOString(),
            isLive: true,
            isCached: true
          };
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }

  // Fetch live
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
    const data = await resp.json();

    if (data.result === 'success' && data.rates) {
      const liveRates = { ...FALLBACK_RATES, ...data.rates };
      const lastUpdated = data.time_last_update_utc || new Date().toISOString();

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              rates: data.rates,
              timestamp: Date.now(),
              lastUpdated
            })
          );
        } catch {
          // Ignore cache write errors
        }
      }

      return {
        rates: liveRates,
        source: 'open.er-api.com (Live Feed)',
        lastUpdated,
        isLive: true,
        isCached: false
      };
    }
    throw new Error('API response missing rates');
  } catch (err) {
    // Return fallback rates with clear notification
    return {
      rates: FALLBACK_RATES,
      source: 'Static Reference Rates (Offline Fallback)',
      lastUpdated: 'Baseline Reference (Approximate)',
      isLive: false,
      isCached: false,
      error: err.message
    };
  }
}
