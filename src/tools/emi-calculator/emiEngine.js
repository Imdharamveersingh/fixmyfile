/**
 * EMI Calculator Engine
 *
 * Formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * where:
 * P = Principal loan amount
 * r = Monthly interest rate = (Annual interest rate / 12 / 100)
 * n = Number of monthly installments
 *
 * Edge cases:
 * If r === 0 (0% interest):
 * EMI = P / n
 */

export function calculateEMI({ principal, annualRate, tenure, tenureUnit = 'years' }) {
  const p = parseFloat(principal);
  const rate = parseFloat(annualRate);
  const t = parseFloat(tenure);

  if (isNaN(p) || p <= 0) {
    return { error: 'Please enter a valid loan principal amount greater than 0.' };
  }
  if (isNaN(rate) || rate < 0) {
    return { error: 'Interest rate cannot be negative.' };
  }
  if (isNaN(t) || t <= 0) {
    return { error: 'Loan tenure must be greater than 0.' };
  }

  // Calculate total number of months
  const months = tenureUnit === 'years' ? Math.round(t * 12) : Math.round(t);

  if (months <= 0) {
    return { error: 'Tenure must resolve to at least 1 month.' };
  }

  let monthlyEmi = 0;
  let totalPayment = 0;
  let totalInterest = 0;

  if (rate === 0) {
    monthlyEmi = p / months;
    totalPayment = p;
    totalInterest = 0;
  } else {
    const monthlyRate = rate / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, months);
    monthlyEmi = (p * monthlyRate * factor) / (factor - 1);
    totalPayment = monthlyEmi * months;
    totalInterest = totalPayment - p;
  }

  // Prevent negative interest due to precision rounding
  if (totalInterest < 0) totalInterest = 0;

  const principalRatio = totalPayment > 0 ? (p / totalPayment) * 100 : 100;
  const interestRatio = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0;

  return {
    principal: p,
    annualRate: rate,
    tenure: t,
    tenureUnit,
    months,
    monthlyEmi: Math.round(monthlyEmi * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    principalRatio: Math.round(principalRatio * 10) / 10,
    interestRatio: Math.round(interestRatio * 10) / 10,
    error: null
  };
}

/**
 * Format currency with locale formatting
 */
export function formatCurrency(value, currencySymbol = '₹') {
  if (value === null || value === undefined || isNaN(value)) return `${currencySymbol}0`;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(value);
  return `${currencySymbol}${formatted}`;
}
