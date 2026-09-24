import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  FALLBACK_RATES,
  validateAmount,
  convertCurrency,
  formatCurrencyValue,
  fetchExchangeRates
} from './currencyEngine';

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000];

export default function CurrencyConverterTool() {
  // SEO
  useEffect(() => {
    document.title = 'Currency Converter - Free Online Exchange Rate Calculator | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Convert currencies in real time with live exchange rates or offline reference rates. Supports USD, EUR, GBP, INR, JPY, CAD, AUD, and more. 100% free and client-side.'
      );
    }
  }, []);

  // State
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('INR');
  const [ratesData, setRatesData] = useState({
    rates: FALLBACK_RATES,
    source: 'Loading rates...',
    lastUpdated: 'Fetching...',
    isLive: false,
    isCached: false,
    loading: true
  });
  const [copied, setCopied] = useState(false);

  // Fetch rates on mount
  useEffect(() => {
    let isMounted = true;
    fetchExchangeRates().then((data) => {
      if (isMounted) {
        setRatesData({
          rates: data.rates,
          source: data.source,
          lastUpdated: data.lastUpdated,
          isLive: data.isLive,
          isCached: data.isCached,
          loading: false,
          error: data.error
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Manual refresh
  const handleRefreshRates = useCallback(() => {
    setRatesData((prev) => ({ ...prev, loading: true }));
    fetchExchangeRates(true).then((data) => {
      setRatesData({
        rates: data.rates,
        source: data.source,
        lastUpdated: data.lastUpdated,
        isLive: data.isLive,
        isCached: data.isCached,
        loading: false,
        error: data.error
      });
    });
  }, []);

  // Validation
  const validation = useMemo(() => validateAmount(amount), [amount]);

  // Conversion Calculation
  const conversion = useMemo(() => {
    if (!validation.valid || validation.numericValue === undefined) {
      return null;
    }
    try {
      return convertCurrency(
        validation.numericValue,
        fromCurrency,
        toCurrency,
        ratesData.rates
      );
    } catch {
      return null;
    }
  }, [validation, fromCurrency, toCurrency, ratesData.rates]);

  // Swap action
  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Reset action
  const handleReset = () => {
    setAmount('100');
    setFromCurrency('USD');
    setToCurrency('INR');
    setCopied(false);
  };

  // Copy result action
  const handleCopyResult = async () => {
    if (!conversion || !validation.valid) return;
    const copyText = `${amount} ${fromCurrency} = ${formatCurrencyValue(conversion.result, toCurrency)} ${toCurrency} (1 ${fromCurrency} = ${conversion.unitRate.toFixed(4)} ${toCurrency})`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const fromMeta = CURRENCY_MAP.get(fromCurrency) || { symbol: '', name: fromCurrency, flag: '' };
  const toMeta = CURRENCY_MAP.get(toCurrency) || { symbol: '', name: toCurrency, flag: '' };

  return (
    <div className="tool-page currency-tool-page">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="currency-converter"
        title="Currency Converter Online"
        description="Instant, reliable currency conversion with live exchange rates, smart offline fallback, and zero tracking."
      />

      <div className="currency-app-layout">
        <div className="currency-card">
          {/* Status / Source Bar */}
          <div className="currency-status-bar" id="currency-rate-source">
            <div className="rate-source-info">
              <span className={`status-dot ${ratesData.isLive ? 'live' : 'fallback'}`} />
              <span className="source-label">Rate Source: <strong>{ratesData.source}</strong></span>
              <span className="source-time">· Last update: {ratesData.lastUpdated}</span>
            </div>
            <button
              type="button"
              className="refresh-rate-btn"
              onClick={handleRefreshRates}
              disabled={ratesData.loading}
              title="Refresh latest exchange rates"
              id="refresh-rates-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ratesData.loading ? 'spin' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              <span>{ratesData.loading ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Offline alert banner if live rates failed */}
          {ratesData.error && (
            <div className="currency-alert-banner" id="currency-fallback-alert" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Network live rate lookup was unreachable. Using static baseline reference rates.</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="currency-field-group">
            <label htmlFor="currency-amount-input" className="currency-label">Amount</label>
            <div className="currency-input-wrap">
              <span className="currency-input-prefix">{fromMeta.symbol || '$'}</span>
              <input
                type="text"
                id="currency-amount-input"
                className={`currency-amount-input ${!validation.valid && amount !== '' ? 'has-error' : ''}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            {/* Quick chips */}
            <div className="currency-quick-chips">
              <span className="quick-label">Quick:</span>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="quick-chip"
                  onClick={() => setAmount(String(q))}
                >
                  {q}
                </button>
              ))}
            </div>
            {!validation.valid && amount !== '' && (
              <div className="currency-validation-error" id="currency-validation-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{validation.error}</span>
              </div>
            )}
          </div>

          {/* Currency Selectors Row */}
          <div className="currency-selectors-row">
            {/* From */}
            <div className="currency-select-box">
              <label htmlFor="currency-from-select" className="currency-label">From</label>
              <select
                id="currency-from-select"
                className="currency-select"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="currency-swap-wrap">
              <button
                type="button"
                id="currency-swap-btn"
                className="currency-swap-btn"
                onClick={handleSwap}
                aria-label="Swap currencies"
                title="Swap currencies"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l4-4M17 20l-4-4" />
                </svg>
              </button>
            </div>

            {/* To */}
            <div className="currency-select-box">
              <label htmlFor="currency-to-select" className="currency-label">To</label>
              <select
                id="currency-to-select"
                className="currency-select"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result Display Box */}
          <div className="currency-result-box" id="currency-converted-result">
            {conversion && validation.valid ? (
              <>
                <div className="result-sub-label">
                  {amount} {fromMeta.name} ({fromCurrency}) =
                </div>
                <div className="result-main-value">
                  <span className="result-symbol">{toMeta.symbol}</span>
                  <span className="result-number">{formatCurrencyValue(conversion.result, toCurrency)}</span>
                  <span className="result-code">{toCurrency}</span>
                </div>
                <div className="result-unit-rate" id="currency-unit-rate">
                  1 {fromCurrency} = {conversion.unitRate.toFixed(4)} {toCurrency}
                  <span className="rate-divider">·</span>
                  1 {toCurrency} = {conversion.reverseRate.toFixed(4)} {fromCurrency}
                </div>
              </>
            ) : (
              <div className="result-empty-placeholder">
                <span className="empty-hint">Enter an amount to see the converted result</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="currency-actions-row">
            <button
              type="button"
              className="workbench-btn workbench-btn-primary"
              id="copy-result-btn"
              onClick={handleCopyResult}
              disabled={!conversion || !validation.valid}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  <span>Copy Conversion</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="workbench-btn workbench-btn-outline"
              id="currency-reset-btn"
              onClick={handleReset}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              <span>Reset</span>
            </button>
          </div>

          {/* Disclaimer */}
          <div className="currency-disclaimer">
            <span>Rates are updated regularly and provided for reference purposes only. International payment provider margins and local bank spreads may cause final transaction values to differ.</span>
          </div>
        </div>
      </div>

      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="currency-converter" />
    </div>
  );
}
