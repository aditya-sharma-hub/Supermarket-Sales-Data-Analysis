export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  trendlinePoints: { discount: number; profit: number }[];
}

export interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

export interface HistogramBin {
  binLabel: string;
  binStart: number;
  binEnd: number;
  count: number;
}

// 1. Linear Regression (y = mx + c)
export function calculateLinearRegression(
  data: { discount: number; profit: number }[]
): RegressionResult {
  const n = data.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, r2: 0, trendlinePoints: [] };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = data[i].discount;
    const y = data[i].profit;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: 0, r2: 0, trendlinePoints: [] };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const x = data[i].discount;
    const y = data[i].profit;
    const predictedY = slope * x + intercept;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - predictedY, 2);
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Generate trendline points for 10% (0.10) to 35% (0.35) discount range
  const minX = 0.10;
  const maxX = 0.35;
  const trendlinePoints = [
    { discount: minX, profit: parseFloat((slope * minX + intercept).toFixed(2)) },
    { discount: maxX, profit: parseFloat((slope * maxX + intercept).toFixed(2)) }
  ];

  return { slope, intercept, r2, trendlinePoints };
}

// 2. Pearson Correlation Coefficient (r)
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denX += diffX * diffX;
    denY += diffY * diffY;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

// 3. Box Plot Statistics
export function calculateBoxPlotStats(values: number[]): BoxPlotStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
  }

  const getPercentile = (p: number): number => {
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  };

  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Filter outliers
  const outliers = sorted.filter(v => v < lowerBound || v > upperBound);
  const nonOutliers = sorted.filter(v => v >= lowerBound && v <= upperBound);

  const min = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0];
  const max = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[n - 1];

  return { min, q1, median, q3, max, outliers };
}

// 4. Histogram Binning
export function calculateHistogram(
  values: number[],
  binCount: number = 10
): HistogramBin[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const binWidth = range === 0 ? 1 : range / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const start = min + i * binWidth;
    const end = start + binWidth;
    let label = "";
    
    if (max > 100) {
      label = `${Math.round(start)}-${Math.round(end)}`;
    } else if (max > 1) {
      label = `${start.toFixed(1)}-${end.toFixed(1)}`;
    } else {
      // For discounts (e.g. 0.1 to 0.35)
      label = `${(start * 100).toFixed(0)}%-${(end * 100).toFixed(0)}%`;
    }

    return {
      binLabel: label,
      binStart: start,
      binEnd: end,
      count: 0
    };
  });

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    let binIdx = Math.floor((v - min) / binWidth);
    if (binIdx >= binCount) {
      binIdx = binCount - 1; // Catch edge cases where v === max
    }
    if (binIdx >= 0 && binIdx < binCount) {
      bins[binIdx].count++;
    }
  }

  return bins;
}
