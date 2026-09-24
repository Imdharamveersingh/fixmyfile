import React, { useState, useEffect, useMemo } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import { calculateEMI, formatCurrency } from './emiEngine';

const PRESETS = [
  { label: 'Home Loan', amount: 3000000, rate: 8.5, tenure: 20, unit: 'years' },
  { label: 'Car Loan', amount: 800000, rate: 9.25, tenure: 5, unit: 'years' },
  { label: 'Personal Loan', amount: 200000, rate: 12.5, tenure: 3, unit: 'years' }
];

export default function EmiCalculatorTool() {
  // SEO
  useEffect(() => {
    document.title = 'EMI Calculator - Free Loan EMI Calculator | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Free online loan EMI calculator. Calculate monthly EMI, total interest, and loan repayment breakdown instantly with yearly and monthly tenure support.'
      );
    }
  }, []);

  const [principal, setPrincipal] = useState('500000');
  const [rate, setRate] = useState('10');
  const [tenure, setTenure] = useState('5');
  const [tenureUnit, setTenureUnit] = useState('years');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [copied, setCopied] = useState(false);

  const calculation = useMemo(() => {
    return calculateEMI({
      principal,
      annualRate: rate,
      tenure,
      tenureUnit
    });
  }, [principal, rate, tenure, tenureUnit]);

  const handleReset = () => {
    setPrincipal('500000');
    setRate('10');
    setTenure('5');
    setTenureUnit('years');
    setCopied(false);
  };

  const handleApplyPreset = (preset) => {
    setPrincipal(String(preset.amount));
    setRate(String(preset.rate));
    setTenure(String(preset.tenure));
    setTenureUnit(preset.unit);
    setCopied(false);
  };

  const handleCopySummary = async () => {
    if (calculation.error) return;
    const text = `Loan EMI Calculation Summary:
• Principal Amount: ${currencySymbol}${calculation.principal?.toLocaleString('en-IN')}
• Interest Rate: ${calculation.annualRate}% p.a.
• Tenure: ${calculation.tenure} ${calculation.tenureUnit} (${calculation.months} months)
• Monthly EMI: ${currencySymbol}${calculation.monthlyEmi?.toLocaleString('en-IN')}
• Total Interest: ${currencySymbol}${calculation.totalInterest?.toLocaleString('en-IN')} (${calculation.interestRatio}%)
• Total Payment: ${currencySymbol}${calculation.totalPayment?.toLocaleString('en-IN')}
Calculated via FixMyFile EMI Calculator`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tool-page emi-calculator-page">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="emi-calculator"
        title="EMI Calculator"
        description="Calculate your monthly loan payments (Equated Monthly Installment), total interest, and complete repayment breakdown in seconds."
      />

      <div className="emi-calculator-layout">
        {/* Input Card */}
        <div className="emi-input-card">
          <div className="workspace-tool-icon-wrap" aria-hidden="true"><ToolIcon icon="emi-calculator" size={48} /></div>
          <div className="emi-card-header">
            <h2 className="emi-section-title">Loan Parameters</h2>
            <div className="currency-selector-badge">
              <label htmlFor="emi-currency-select" className="sr-only">Currency</label>
              <select
                id="emi-currency-select"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="emi-currency-dropdown"
              >
                <option value="₹">INR (₹)</option>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="emi-presets-bar">
            <span className="presets-label">Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="emi-preset-chip"
                onClick={() => handleApplyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="emi-form-group">
            <label htmlFor="emi-loan-amount" className="emi-form-label">
              <span>Loan Principal Amount</span>
              <span className="emi-label-val">{formatCurrency(parseFloat(principal) || 0, currencySymbol)}</span>
            </label>
            <div className="emi-input-wrapper">
              <span className="emi-input-prefix">{currencySymbol}</span>
              <input
                id="emi-loan-amount"
                type="number"
                className="emi-text-input"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="e.g. 500000"
                min="0"
                step="1000"
              />
            </div>
          </div>

          <div className="emi-form-group">
            <label htmlFor="emi-interest-rate" className="emi-form-label">
              <span>Annual Interest Rate (%)</span>
              <span className="emi-label-val">{rate}%</span>
            </label>
            <div className="emi-input-wrapper">
              <span className="emi-input-prefix">%</span>
              <input
                id="emi-interest-rate"
                type="number"
                className="emi-text-input"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 8.5"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          <div className="emi-form-group">
            <label htmlFor="emi-tenure" className="emi-form-label">
              <span>Loan Tenure</span>
              <span className="emi-label-val">{tenure} {tenureUnit}</span>
            </label>
            <div className="emi-tenure-row">
              <div className="emi-input-wrapper" style={{ flex: 1 }}>
                <input
                  id="emi-tenure"
                  type="number"
                  className="emi-text-input"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  placeholder="e.g. 5"
                  min="1"
                  step="1"
                />
              </div>
              <div className="emi-unit-toggle" role="group" aria-label="Tenure Unit">
                <button
                  type="button"
                  id="emi-unit-years"
                  className={`unit-toggle-btn ${tenureUnit === 'years' ? 'active' : ''}`}
                  onClick={() => setTenureUnit('years')}
                >
                  Years
                </button>
                <button
                  type="button"
                  id="emi-unit-months"
                  className={`unit-toggle-btn ${tenureUnit === 'months' ? 'active' : ''}`}
                  onClick={() => setTenureUnit('months')}
                >
                  Months
                </button>
              </div>
            </div>
          </div>

          {calculation.error && (
            <div className="emi-error-alert" id="emi-error-msg" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{calculation.error}</span>
            </div>
          )}

          <div className="emi-card-actions">
            <button
              type="button"
              id="emi-reset-btn"
              className="workbench-btn workbench-btn-outline"
              onClick={handleReset}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Results Card */}
        <div className="emi-results-card">
          <div className="emi-hero-box">
            <span className="emi-hero-label">Monthly Loan EMI</span>
            <div className="emi-hero-val" id="emi-result-monthly">
              {calculation.error ? '—' : formatCurrency(calculation.monthlyEmi, currencySymbol)}
            </div>
            <span className="emi-hero-sub">
              for {calculation.months || 0} installments
            </span>
          </div>

          {/* Breakdown Stats Grid */}
          <div className="emi-summary-grid">
            <div className="emi-summary-box">
              <span className="emi-box-label">Principal Loan</span>
              <strong className="emi-box-val" id="emi-result-principal">
                {calculation.error ? '—' : formatCurrency(calculation.principal, currencySymbol)}
              </strong>
            </div>

            <div className="emi-summary-box">
              <span className="emi-box-label">Total Interest</span>
              <strong className="emi-box-val text-warning" id="emi-result-interest">
                {calculation.error ? '—' : formatCurrency(calculation.totalInterest, currencySymbol)}
              </strong>
            </div>

            <div className="emi-summary-box span-2">
              <span className="emi-box-label">Total Amount Payable (Principal + Interest)</span>
              <strong className="emi-box-val text-accent" id="emi-result-total">
                {calculation.error ? '—' : formatCurrency(calculation.totalPayment, currencySymbol)}
              </strong>
            </div>
          </div>

          {/* Visual Ratio Bar */}
          {!calculation.error && (
            <div className="emi-ratio-container">
              <div className="emi-ratio-labels">
                <span className="ratio-badge-principal">
                  <span className="ratio-dot dot-principal" />
                  Principal: {calculation.principalRatio}%
                </span>
                <span className="ratio-badge-interest">
                  <span className="ratio-dot dot-interest" />
                  Interest: {calculation.interestRatio}%
                </span>
              </div>
              <div className="emi-ratio-bar-track" id="emi-breakdown-bar">
                <div
                  id="emi-bar-principal"
                  className="emi-bar-segment segment-principal"
                  style={{ width: `${calculation.principalRatio}%` }}
                />
                <div
                  id="emi-bar-interest"
                  className="emi-bar-segment segment-interest"
                  style={{ width: `${calculation.interestRatio}%` }}
                />
              </div>
            </div>
          )}

          {/* Copy Button */}
          <button
            type="button"
            id="emi-copy-btn"
            className="workbench-btn workbench-btn-primary emi-full-btn"
            onClick={handleCopySummary}
            disabled={!!calculation.error}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Summary Copied!</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                <span>Copy Calculation Breakdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="emi-calculator" />
    </div>
  );
}
