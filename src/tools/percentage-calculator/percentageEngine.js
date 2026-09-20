/**
 * Percentage Calculator Engine for FixMyFile (/percentage-calculator)
 * 100% Client-side mathematical calculations across 5 percentage modes
 * with division-by-zero protection and calculation breakdown steps.
 */

export const PERCENTAGE_MODES = [
  {
    id: 'what-is-p-of-y',
    name: 'What is X% of Y?',
    shortTitle: 'X% of Y',
    desc: 'Calculate a specific percentage portion of a total number.',
    formula: 'Result = (X / 100) × Y',
    labelX: 'Percentage (X%)',
    labelY: 'Total Value (Y)',
    placeholderX: '20',
    placeholderY: '500'
  },
  {
    id: 'x-is-what-p-of-y',
    name: 'X is what % of Y?',
    shortTitle: 'X as % of Y',
    desc: 'Find what percentage one number is of another number.',
    formula: 'Result = (X / Y) × 100%',
    labelX: 'Part Value (X)',
    labelY: 'Total Value (Y)',
    placeholderX: '100',
    placeholderY: '500'
  },
  {
    id: 'percentage-change',
    name: 'Percentage Increase / Decrease',
    shortTitle: '% Change',
    desc: 'Calculate percentage change from an initial value to a final value.',
    formula: 'Change% = ((Final - Initial) / |Initial|) × 100%',
    labelX: 'Initial Value (X)',
    labelY: 'Final Value (Y)',
    placeholderX: '500',
    placeholderY: '600'
  },
  {
    id: 'add-percentage',
    name: 'Add X% to Y',
    shortTitle: 'Y + X%',
    desc: 'Increase a number by a given percentage (e.g. tax or tip).',
    formula: 'Result = Y + (Y × (X / 100))',
    labelX: 'Percentage to Add (X%)',
    labelY: 'Base Value (Y)',
    placeholderX: '20',
    placeholderY: '500'
  },
  {
    id: 'subtract-percentage',
    name: 'Subtract X% from Y',
    shortTitle: 'Y - X%',
    desc: 'Discount or reduce a number by a given percentage.',
    formula: 'Result = Y - (Y × (X / 100))',
    labelX: 'Percentage to Subtract (X%)',
    labelY: 'Base Value (Y)',
    placeholderX: '20',
    placeholderY: '500'
  }
];

export function parseNum(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === '' || isNaN(Number(str))) return null;
  return Number(str);
}

/**
 * Calculates result for a chosen mode.
 * Returns { result: number, formula: string, steps: string[], changeType?: 'increase'|'decrease'|'none', error?: string }
 */
export function calculatePercentage(modeId, xStr, yStr) {
  const x = parseNum(xStr);
  const y = parseNum(yStr);

  if (x === null || y === null) {
    return { error: 'Please enter valid numeric values for both fields.' };
  }

  switch (modeId) {
    case 'what-is-p-of-y': {
      // (x / 100) * y
      const fraction = x / 100;
      const res = fraction * y;
      return {
        result: res,
        formattedResult: formatNum(res),
        formula: `${x}% of ${y}`,
        steps: [
          `Convert percentage to decimal: ${x} ÷ 100 = ${fraction}`,
          `Multiply by total: ${fraction} × ${y} = ${formatNum(res)}`
        ]
      };
    }

    case 'x-is-what-p-of-y': {
      // (x / y) * 100
      if (y === 0) {
        return { error: 'Total value (Y) cannot be zero. Division by zero is undefined.' };
      }
      const ratio = x / y;
      const res = ratio * 100;
      return {
        result: res,
        formattedResult: `${formatNum(res)}%`,
        formula: `${x} ÷ ${y} × 100%`,
        steps: [
          `Divide part by total: ${x} ÷ ${y} = ${ratio}`,
          `Multiply by 100 to get percentage: ${ratio} × 100 = ${formatNum(res)}%`
        ]
      };
    }

    case 'percentage-change': {
      // ((y - x) / Math.abs(x)) * 100
      if (x === 0) {
        return { error: 'Initial value (X) cannot be zero when calculating percentage change.' };
      }
      const diff = y - x;
      const changePercent = (diff / Math.abs(x)) * 100;
      const changeType = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'none';
      return {
        result: changePercent,
        formattedResult: `${changeType === 'increase' ? '+' : ''}${formatNum(changePercent)}%`,
        changeType,
        diff,
        formula: `((${y} - ${x}) ÷ |${x}|) × 100%`,
        steps: [
          `Calculate absolute difference: ${y} - ${x} = ${formatNum(diff)}`,
          `Divide by initial value: ${formatNum(diff)} ÷ ${Math.abs(x)} = ${diff / Math.abs(x)}`,
          `Multiply by 100: ${formatNum(changePercent)}% (${changeType})`
        ]
      };
    }

    case 'add-percentage': {
      // y + (y * (x / 100))
      const addition = y * (x / 100);
      const res = y + addition;
      return {
        result: res,
        formattedResult: formatNum(res),
        addition,
        formula: `${y} + (${x}% of ${y})`,
        steps: [
          `Calculate ${x}% of ${y}: (${x} ÷ 100) × ${y} = ${formatNum(addition)}`,
          `Add to base value: ${y} + ${formatNum(addition)} = ${formatNum(res)}`
        ]
      };
    }

    case 'subtract-percentage': {
      // y - (y * (x / 100))
      const subtraction = y * (x / 100);
      const res = y - subtraction;
      return {
        result: res,
        formattedResult: formatNum(res),
        subtraction,
        formula: `${y} - (${x}% of ${y})`,
        steps: [
          `Calculate ${x}% of ${y}: (${x} ÷ 100) × ${y} = ${formatNum(subtraction)}`,
          `Subtract from base value: ${y} - ${formatNum(subtraction)} = ${formatNum(res)}`
        ]
      };
    }

    default:
      return { error: 'Unknown calculation mode.' };
  }
}

export function formatNum(num) {
  if (isNaN(num)) return '0';
  if (Math.abs(num) >= 1e12 || (Math.abs(num) > 0 && Math.abs(num) < 1e-4)) {
    return num.toExponential(4);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4
  }).format(num);
}
