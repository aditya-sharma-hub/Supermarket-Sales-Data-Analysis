// Numerical approximations for statistical distributions

// 1. Error function approximation (used for normal distribution calculations)
export function erf(x: number): number {
  // Constants for approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

// Normal Cumulative Distribution Function (CDF)
export function normalCDF(x: number, mean = 0, stdDev = 1): number {
  return 0.5 * (1.0 + erf((x - mean) / (stdDev * Math.sqrt(2.0))));
}

// 2. Chi-Square CDF approximation (using Wilson-Hilferty transformation)
export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 0;

  // Wilson-Hilferty approximation: transforms Chi-Square to a standard normal variable
  // Valid for df >= 2, but works reasonably well for df = 1 as well
  const inner = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const z = inner / Math.sqrt(2 / (9 * df));
  
  return normalCDF(z);
}

// 3. Student's t CDF approximation (Welch-Satterthwaite / normal approximation for large df)
export function studentTCDF(t: number, df: number): number {
  // For very large degrees of freedom, t converges to Normal distribution
  if (df > 100) {
    return normalCDF(t);
  }

  // Hill-Davis approximation for Student's t CDF
  const x = t;
  const absX = Math.abs(x);
  const theta = Math.atan(absX / Math.sqrt(df));
  
  let sum = 0;
  if (df % 2 === 0) {
    let term = Math.sin(theta);
    let cumulative = term;
    for (let i = 2; i <= df - 2; i += 2) {
      term = (term * (i - 1) * Math.pow(Math.cos(theta), 2)) / i;
      cumulative += term;
    }
    sum = 0.5 * (1 + cumulative);
  } else {
    let term = Math.sin(theta) * Math.cos(theta);
    let cumulative = theta + term;
    for (let i = 3; i <= df - 2; i += 2) {
      term = (term * (i - 1) * Math.pow(Math.cos(theta), 2)) / i;
      cumulative += term;
    }
    sum = 0.5 + cumulative / Math.PI;
  }

  return x < 0 ? 1 - sum : sum;
}

// 4. F-Distribution CDF approximation (via regularized incomplete beta or Wilson-Hilferty)
export function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;

  // Wilson-Hilferty approximation for F-distribution
  const d1 = 2 / (9 * df1);
  const d2 = 2 / (9 * df2);
  
  const num = Math.pow(f, 1/3) * (1 - d2) - (1 - d1);
  const den = Math.sqrt(Math.pow(f, 2/3) * d2 + d1);
  const z = num / den;

  return normalCDF(z);
}

// Mean helper
function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Variance helper
function variance(arr: number[], avg: number): number {
  if (arr.length <= 1) return 0;
  return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (arr.length - 1);
}

// -------------------------------------------------------------
// HYPOTHESIS TESTS
// -------------------------------------------------------------

export interface TTestResult {
  tStatistic: number;
  pValue: number;
  df: number;
  meanA: number;
  meanB: number;
  confidenceInterval: [number, number];
  interpretation: string;
  businessMeaning: string;
}

// Welch's t-Test (unpaired, unequal variances)
export function performTTest(groupA: number[], groupB: number[], nameA = 'Group A', nameB = 'Group B'): TTestResult {
  const nA = groupA.length;
  const nB = groupB.length;

  if (nA <= 1 || nB <= 1) {
    return {
      tStatistic: 0, pValue: 1, df: 1, meanA: 0, meanB: 0, confidenceInterval: [0, 0],
      interpretation: 'Insufficient data to perform t-Test.',
      businessMeaning: 'Gather more transactional records for both comparison segments.'
    };
  }

  const avgA = mean(groupA);
  const avgB = mean(groupB);
  
  const varA = variance(groupA, avgA);
  const varB = variance(groupB, avgB);

  // Standard Error of difference
  const se = Math.sqrt(varA / nA + varB / nB);
  if (se === 0) {
    return {
      tStatistic: 0, pValue: 1, df: 1, meanA: avgA, meanB: avgB, confidenceInterval: [0, 0],
      interpretation: 'Standard Error is zero (no variance). Groups are identical.',
      businessMeaning: 'The two customer/product cohorts have identical transactional behaviors.'
    };
  }

  const tStatistic = (avgA - avgB) / se;

  // Degrees of freedom via Welch-Satterthwaite equation
  const termA = varA / nA;
  const termB = varB / nB;
  const num = Math.pow(termA + termB, 2);
  const den = Math.pow(termA, 2) / (nA - 1) + Math.pow(termB, 2) / (nB - 1);
  const df = den === 0 ? 1 : num / den;

  // Two-tailed p-value
  const cdf = studentTCDF(Math.abs(tStatistic), df);
  const pValue = 2 * (1 - cdf);

  // 95% Confidence Interval for Difference of Means (using Normal critical value 1.96 as approximation)
  const marginOfError = 1.96 * se;
  const diff = avgA - avgB;
  const confidenceInterval: [number, number] = [diff - marginOfError, diff + marginOfError];

  const significant = pValue < 0.05;
  const interpretation = significant
    ? `Reject Null Hypothesis (p = ${pValue.toFixed(4)} < 0.05). There is a statistically significant difference between ${nameA} (mean: ${avgA.toFixed(2)}) and ${nameB} (mean: ${avgB.toFixed(2)}).`
    : `Fail to Reject Null Hypothesis (p = ${pValue.toFixed(4)} >= 0.05). There is no statistically significant difference in means between ${nameA} and ${nameB}.`;

  const businessMeaning = significant
    ? `The performance difference is real, not due to random fluctuation. Strategy: Tailor marketing/pricing specifically for the stronger group, or investigate operational friction in the weaker group.`
    : `Both segments perform identically. Strategy: Consolidate campaigns or operational workflows, as separating these cohorts is not economically justified based on sales performance.`;

  return {
    tStatistic,
    pValue,
    df,
    meanA: avgA,
    meanB: avgB,
    confidenceInterval,
    interpretation,
    businessMeaning
  };
}

export interface ANOVAResult {
  fStatistic: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
  msBetween: number;
  msWithin: number;
  interpretation: string;
  businessMeaning: string;
}

// One-Way ANOVA (Analysis of Variance)
export function performANOVA(groups: number[][], groupNames: string[]): ANOVAResult {
  const k = groups.length;
  const counts = groups.map(g => g.length);
  const totalN = counts.reduce((a, b) => a + b, 0);

  if (k < 2 || totalN <= k) {
    return {
      fStatistic: 0, pValue: 1, dfBetween: 0, dfWithin: 0, msBetween: 0, msWithin: 0,
      interpretation: 'Insufficient categories or records to perform ANOVA.',
      businessMeaning: 'Ensure you have at least 2 distinct categories with multiple samples each.'
    };
  }

  const groupMeans = groups.map(g => mean(g));
  const grandTotal = groups.reduce((sum, g) => sum + g.reduce((a, b) => a + b, 0), 0);
  const grandMean = grandTotal / totalN;

  // Sum of Squares Between (SSB)
  let ssb = 0;
  for (let i = 0; i < k; i++) {
    ssb += counts[i] * Math.pow(groupMeans[i] - grandMean, 2);
  }

  // Sum of Squares Within (SSW) / Error
  let ssw = 0;
  for (let i = 0; i < k; i++) {
    const avg = groupMeans[i];
    ssw += groups[i].reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  }

  const dfBetween = k - 1;
  const dfWithin = totalN - k;

  const msBetween = ssb / dfBetween;
  const msWithin = ssw / dfWithin;

  if (msWithin === 0) {
    return {
      fStatistic: 999, pValue: 0, dfBetween, dfWithin, msBetween, msWithin,
      interpretation: 'Variability within groups is zero. Differences between groups are absolute.',
      businessMeaning: 'All items within each category perform identically. Categories represent distinct performance bands.'
    };
  }

  const fStatistic = msBetween / msWithin;
  
  // Calculate p-value (1 - CDF of F-distribution)
  const pValue = 1 - fCDF(fStatistic, dfBetween, dfWithin);

  const significant = pValue < 0.05;
  const interpretation = significant
    ? `Reject Null Hypothesis (p = ${pValue.toFixed(4)} < 0.05). At least one category exhibits a statistically significant difference in performance (F = ${fStatistic.toFixed(2)}).`
    : `Fail to Reject Null Hypothesis (p = ${pValue.toFixed(4)} >= 0.05). No statistically significant difference in performance is detected across the specified categories (F = ${fStatistic.toFixed(2)}).`;

  const businessMeaning = significant
    ? `Category performance is highly divergent. Strategy: Reallocate capital/inventory from underperforming categories to top-performing cohorts, and analyze root drivers of the leading category.`
    : `Product category classifications do not drive performance differences. Sales are homogeneous across groups; focus marketing budgets on generic brand awareness rather than product-specific campaigns.`;

  return {
    fStatistic,
    pValue,
    dfBetween,
    dfWithin,
    msBetween,
    msWithin,
    interpretation,
    businessMeaning
  };
}

export interface ChiSquareResult {
  chiStatistic: number;
  pValue: number;
  df: number;
  interpretation: string;
  businessMeaning: string;
}

// Chi-Square Test of Independence
export function performChiSquareTest(contingencyTable: number[][], rowLabels: string[], colLabels: string[]): ChiSquareResult {
  const rows = contingencyTable.length;
  const cols = contingencyTable[0]?.length || 0;

  if (rows <= 1 || cols <= 1) {
    return {
      chiStatistic: 0, pValue: 1, df: 1,
      interpretation: 'Contingency table must be at least 2x2.',
      businessMeaning: 'Ensure you select categorical features with multiple classes.'
    };
  }

  // Row sums & Column sums
  const rowSums = contingencyTable.map(r => r.reduce((a, b) => a + b, 0));
  const colSums = Array.from({ length: cols }, (_, c) => {
    let sum = 0;
    for (let r = 0; r < rows; r++) sum += contingencyTable[r][c];
    return sum;
  });

  const grandTotal = rowSums.reduce((a, b) => a + b, 0);
  if (grandTotal === 0) {
    return {
      chiStatistic: 0, pValue: 1, df: 1,
      interpretation: 'Grand total of contingency table is zero.',
      businessMeaning: 'No data matches the filters for this test.'
    };
  }

  let chiStatistic = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const observed = contingencyTable[r][c];
      const expected = (rowSums[r] * colSums[c]) / grandTotal;
      
      if (expected > 0) {
        chiStatistic += Math.pow(observed - expected, 2) / expected;
      }
    }
  }

  const df = (rows - 1) * (cols - 1);
  const pValue = 1 - chiSquareCDF(chiStatistic, df);

  const significant = pValue < 0.05;
  const interpretation = significant
    ? `Reject Null Hypothesis (p = ${pValue.toFixed(4)} < 0.05). There is a statistically significant association / dependency between the two categorical variables (Chi2 = ${chiStatistic.toFixed(2)}).`
    : `Fail to Reject Null Hypothesis (p = ${pValue.toFixed(4)} >= 0.05). The two categorical variables are independent of each other (Chi2 = ${chiStatistic.toFixed(2)}).`;

  const businessMeaning = significant
    ? `Customer purchase preference varies strongly by geography/region. Strategy: Execute targeted regional product listings and localize store layouts to fit specific regional demand patterns.`
    : `Categorical attributes show no correlation. Product appeal is uniform; local regional differences do not influence what product categories customers purchase. Unified distribution works.`;

  return {
    chiStatistic,
    pValue,
    df,
    interpretation,
    businessMeaning
  };
}
