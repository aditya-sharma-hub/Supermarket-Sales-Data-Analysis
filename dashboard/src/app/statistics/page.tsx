"use client";

import React, { useMemo, useState } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { motion } from 'framer-motion';
import { 
  Scale, 
  HelpCircle, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Percent,
  Compass,
  CheckCircle,
  Activity
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../lib/utils';
import { performTTest, performANOVA, performChiSquareTest } from '../../utils/hypothesis';

// -------------------------------------------------------------
// MATH STATS HELPERS
// -------------------------------------------------------------

function calculateDescriptiveStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, median: 0, mode: 0, variance: 0, stdDev: 0, skewness: 0, kurtosis: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Mode
  const frequencyMap: Record<number, number> = {};
  let maxFreq = 0;
  let mode = sorted[0];
  values.forEach(v => {
    const val = parseFloat(v.toFixed(1)); // round to 1 dec for continuity
    frequencyMap[val] = (frequencyMap[val] || 0) + 1;
    if (frequencyMap[val] > maxFreq) {
      maxFreq = frequencyMap[val];
      mode = val;
    }
  });

  // Variance & Standard Deviation
  const sumSqDiff = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
  const variance = sumSqDiff / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);

  // Skewness: m3 / m2^(3/2)
  let m3 = 0;
  let m4 = 0;
  values.forEach(v => {
    m3 += Math.pow(v - mean, 3);
    m4 += Math.pow(v - mean, 4);
  });
  m3 /= n;
  m4 /= n;
  const m2 = sumSqDiff / n;

  const skewness = m2 === 0 ? 0 : m3 / Math.pow(m2, 1.5);
  const kurtosis = m2 === 0 ? 0 : (m4 / Math.pow(m2, 2)) - 3; // excess kurtosis

  return {
    mean,
    median,
    mode,
    variance,
    stdDev,
    skewness,
    kurtosis
  };
}

// Covariance helper
function calculateCovariance(x: number[], y: number[], meanX: number, meanY: number): number {
  const n = x.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (x[i] - meanX) * (y[i] - meanY);
  }
  return sum / (n - 1 || 1);
}

// Pearson Correlation
function calculatePearson(x: number[], y: number[], meanX: number, meanY: number, stdX: number, stdY: number): number {
  const n = x.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (x[i] - meanX) * (y[i] - meanY);
  }
  const den = (n - 1) * stdX * stdY;
  return den === 0 ? 0 : sum / den;
}

// Spearman Rank Correlation
function calculateSpearman(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const getRanks = (arr: number[]): number[] => {
    const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
    const ranks = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      ranks[sorted[i].idx] = i + 1; // 1-indexed ranks
    }
    return ranks;
  };

  const rankX = getRanks(x);
  const rankY = getRanks(y);

  const meanRank = (n + 1) / 2;
  const stdRank = Math.sqrt(rankX.reduce((sum, r) => sum + Math.pow(r - meanRank, 2), 0) / (n - 1));

  return calculatePearson(rankX, rankY, meanRank, meanRank, stdRank, stdRank);
}

export default function StatisticsPage() {
  const { filteredData, loading, uniqueValues } = useSalesData();

  // Test Selection States
  const [testType, setTestType] = useState<'t' | 'anova' | 'chisquare'>('t');

  // t-Test configuration
  const [tVar, setTVar] = useState<'sales' | 'profit'>('sales');
  const [tGroupA, setTGroupA] = useState<'East' | 'West' | 'HighDiscount' | 'South'>('East');
  const [tGroupB, setTGroupB] = useState<'East' | 'West' | 'LowDiscount' | 'North'>('West');

  // ANOVA configuration
  const [anovaVar, setAnovaVar] = useState<'sales' | 'profit'>('profit');
  const [anovaFactor, setAnovaFactor] = useState<'region' | 'category'>('region');

  // Descriptive Statistics on Numerical Columns
  const numericalStats = useMemo(() => {
    if (filteredData.length === 0) return null;
    return {
      sales: calculateDescriptiveStats(filteredData.map(r => r.sales)),
      profit: calculateDescriptiveStats(filteredData.map(r => r.profit)),
      discount: calculateDescriptiveStats(filteredData.map(r => r.discount * 100)),
      quantity: calculateDescriptiveStats(filteredData.map(r => r.quantity))
    };
  }, [filteredData]);

  // Covariance and Correlation Matrices
  const matrices = useMemo(() => {
    if (filteredData.length === 0 || !numericalStats) {
      return { corr: [], cov: [], spearman: [] };
    }

    const n = filteredData.length;
    const columns = ['sales', 'profit', 'discount', 'quantity'] as const;
    const labels = ['Sales', 'Profit', 'Discount', 'Quantity'];
    
    const means = [
      numericalStats.sales.mean,
      numericalStats.profit.mean,
      numericalStats.discount.mean / 100, // keep decimal
      numericalStats.quantity.mean
    ];
    
    const stds = [
      numericalStats.sales.stdDev,
      numericalStats.profit.stdDev,
      numericalStats.discount.stdDev / 100,
      numericalStats.quantity.stdDev
    ];

    const vectors = [
      filteredData.map(r => r.sales),
      filteredData.map(r => r.profit),
      filteredData.map(r => r.discount),
      filteredData.map(r => r.quantity)
    ];

    // Compute Pearson & Covariance
    const corrMatrix: number[][] = [];
    const covMatrix: number[][] = [];
    const spearmanMatrix: number[][] = [];

    for (let i = 0; i < 4; i++) {
      corrMatrix.push([]);
      covMatrix.push([]);
      spearmanMatrix.push([]);
      
      for (let j = 0; j < 4; j++) {
        const c = calculateCovariance(vectors[i], vectors[j], means[i], means[j]);
        const p = calculatePearson(vectors[i], vectors[j], means[i], means[j], stds[i], stds[j]);
        
        // Stride samples for Spearman performance in browser on large grids
        const stride = Math.max(1, Math.floor(n / 300));
        const sampleX = vectors[i].filter((_, idx) => idx % stride === 0);
        const sampleY = vectors[j].filter((_, idx) => idx % stride === 0);
        const s = calculateSpearman(sampleX, sampleY);

        covMatrix[i].push(c);
        corrMatrix[i].push(p);
        spearmanMatrix[i].push(s);
      }
    }

    return {
      labels,
      corr: corrMatrix,
      cov: covMatrix,
      spearman: spearmanMatrix
    };
  }, [filteredData, numericalStats]);

  // Hypothesis Test Execution
  const hypothesisResults = useMemo(() => {
    if (filteredData.length === 0) return null;

    if (testType === 't') {
      let groupAData: number[] = [];
      let groupBData: number[] = [];
      let labelA = '';
      let labelB = '';

      if (tGroupA === 'HighDiscount') {
        groupAData = filteredData.filter(r => r.discount >= 0.25).map(r => r[tVar]);
        labelA = 'High Discount (>=25%)';
      } else {
        groupAData = filteredData.filter(r => r.region === tGroupA).map(r => r[tVar]);
        labelA = `${tGroupA} Region`;
      }

      if (tGroupB === 'LowDiscount') {
        groupBData = filteredData.filter(r => r.discount < 0.25).map(r => r[tVar]);
        labelB = 'Low Discount (<25%)';
      } else {
        groupBData = filteredData.filter(r => r.region === tGroupB).map(r => r[tVar]);
        labelB = `${tGroupB} Region`;
      }

      const res = performTTest(groupAData, groupBData, labelA, labelB);
      return {
        type: 't',
        tStatistic: res.tStatistic,
        pValue: res.pValue,
        df: res.df,
        meanA: res.meanA,
        meanB: res.meanB,
        confidenceInterval: res.confidenceInterval,
        interpretation: res.interpretation,
        businessMeaning: res.businessMeaning
      };
    } else if (testType === 'anova') {
      const targetColumn = anovaVar;
      let groups: number[][] = [];
      let groupNames: string[] = [];

      if (anovaFactor === 'region') {
        groupNames = uniqueValues.regions;
        groups = groupNames.map(reg => 
          filteredData.filter(r => r.region === reg).map(r => r[targetColumn])
        );
      } else {
        groupNames = uniqueValues.categories;
        groups = groupNames.map(cat => 
          filteredData.filter(r => r.category === cat).map(r => r[targetColumn])
        );
      }

      const res = performANOVA(groups, groupNames);
      return {
        type: 'anova',
        fStatistic: res.fStatistic,
        pValue: res.pValue,
        dfBetween: res.dfBetween,
        dfWithin: res.dfWithin,
        msBetween: res.msBetween,
        msWithin: res.msWithin,
        interpretation: res.interpretation,
        businessMeaning: res.businessMeaning
      };
    } else {
      // Chi-Square Category vs Region independence
      // Contingency Table: Categories (9 rows) x Regions (5 cols)
      const table: number[][] = uniqueValues.categories.map(cat => {
        return uniqueValues.regions.map(reg => {
          return filteredData.filter(r => r.category === cat && r.region === reg).length;
        });
      });

      const res = performChiSquareTest(table, uniqueValues.categories, uniqueValues.regions);
      return {
        type: 'chisquare',
        chiStatistic: res.chiStatistic,
        pValue: res.pValue,
        df: res.df,
        interpretation: res.interpretation,
        businessMeaning: res.businessMeaning
      };
    }
  }, [filteredData, testType, tVar, tGroupA, tGroupB, anovaVar, anovaFactor, uniqueValues]);

  // Color cell helper based on correlation value
  const getCellColor = (val: number) => {
    const absVal = Math.abs(val);
    if (val > 0) {
      return `rgba(16, 185, 129, ${absVal.toFixed(2)})`; // emerald green for positive correlation
    } else {
      return `rgba(239, 68, 68, ${absVal.toFixed(2)})`;  // red for negative correlation
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-emerald-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Statistical Analysis</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Scientific Analysis & Hypothesis Workbench</h3>
      </div>

      {/* Descriptive Statistics Grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Descriptive Summary Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {numericalStats && ['sales', 'profit', 'discount', 'quantity'].map(col => {
            const stat = (numericalStats as any)[col];
            const isDiscount = col === 'discount';
            const isSales = col === 'sales';
            
            const formatVal = (v: number) => {
              if (isDiscount) return `${v.toFixed(1)}%`;
              if (isSales) return formatCurrency(v);
              return formatNumber(v);
            };

            return (
              <div key={col} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between space-y-4">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-900 pb-2">
                  {col}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Mean</span>
                    <span className="font-bold text-slate-850 dark:text-slate-150">{formatVal(stat.mean)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Median</span>
                    <span className="font-bold text-slate-850 dark:text-slate-150">{formatVal(stat.median)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Mode</span>
                    <span className="font-bold text-slate-850 dark:text-slate-150">{formatVal(stat.mode)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Std Dev</span>
                    <span className="font-bold text-slate-850 dark:text-slate-150">{formatVal(stat.stdDev)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Skewness</span>
                    <span className={`font-bold ${Math.abs(stat.skewness) > 0.5 ? 'text-amber-500' : 'text-slate-550'}`}>{stat.skewness.toFixed(2)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Kurtosis</span>
                    <span className="font-bold text-slate-550">{stat.kurtosis.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Covariance / Correlation Heatmaps */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Pearson Heatmap */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col">
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-1">
              <Percent className="w-4 h-4 text-emerald-500" /> Pearson Correlation Matrix
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Measuring linear strength between variables (Ranges from -1.0 to +1.0)</span>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-x-auto min-h-[220px]">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr>
                  <th className="py-2"></th>
                  {matrices.labels?.map(lbl => (
                    <th key={lbl} className="py-2 font-bold text-slate-450 uppercase text-[9px] tracking-wider">{lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrices.corr.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="py-2.5 pr-4 text-left font-bold text-slate-500 uppercase text-[9px] tracking-wider">{matrices.labels?.[rIdx]}</td>
                    {row.map((val, cIdx) => (
                      <td 
                        key={cIdx} 
                        className="p-3 text-center border border-white dark:border-slate-950/50 font-mono font-black"
                        style={{ backgroundColor: getCellColor(val), color: Math.abs(val) > 0.45 ? 'white' : 'inherit' }}
                      >
                        {val.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spearman Heatmap */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col">
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-1">
              <Compass className="w-4 h-4 text-emerald-500" /> Spearman Rank Correlation Matrix
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Measuring monotonic/non-linear associations based on ranked records</span>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-x-auto min-h-[220px]">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr>
                  <th className="py-2"></th>
                  {matrices.labels?.map(lbl => (
                    <th key={lbl} className="py-2 font-bold text-slate-450 uppercase text-[9px] tracking-wider">{lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrices.spearman.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="py-2.5 pr-4 text-left font-bold text-slate-500 uppercase text-[9px] tracking-wider">{matrices.labels?.[rIdx]}</td>
                    {row.map((val, cIdx) => (
                      <td 
                        key={cIdx} 
                        className="p-3 text-center border border-white dark:border-slate-950/50 font-mono font-black"
                        style={{ backgroundColor: getCellColor(val), color: Math.abs(val) > 0.45 ? 'white' : 'inherit' }}
                      >
                        {val.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      {/* Hypothesis Testing Control Center */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-6">
        
        {/* Workspace Nav Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Scale className="w-4.5 h-4.5 text-emerald-500" /> Hypothesis Testing Workbench
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Select and execute standard parametric & non-parametric tests</span>
          </div>

          <div className="flex gap-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 p-1">
            {['t', 'anova', 'chisquare'].map(type => (
              <button
                key={type}
                onClick={() => setTestType(type as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors
                  ${testType === type 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
                  }
                `}
              >
                {type === 't' ? 'Welch t-Test' : type === 'anova' ? 'One-Way ANOVA' : 'Chi-Square Test'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Parameter Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Inputs Section */}
          <div className="space-y-4 lg:col-span-1 border-r border-slate-100 dark:border-slate-900/50 pr-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-50 dark:border-slate-900 pb-1.5">Parameters</h4>

            {testType === 't' && (
              <>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Variable to Test</span>
                  <select 
                    value={tVar} 
                    onChange={e => setTVar(e.target.value as any)}
                    className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="sales">Sales (₹)</option>
                    <option value="profit">Profit (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Cohort A</span>
                  <select 
                    value={tGroupA} 
                    onChange={e => setTGroupA(e.target.value as any)}
                    className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="East">East Region</option>
                    <option value="West">West Region</option>
                    <option value="South">South Region</option>
                    <option value="HighDiscount">High Discount</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Cohort B</span>
                  <select 
                    value={tGroupB} 
                    onChange={e => setTGroupB(e.target.value as any)}
                    className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="West">West Region</option>
                    <option value="East">East Region</option>
                    <option value="North">North Region</option>
                    <option value="LowDiscount">Low Discount</option>
                  </select>
                </div>
              </>
            )}

            {testType === 'anova' && (
              <>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Continuous Variable</span>
                  <select 
                    value={anovaVar} 
                    onChange={e => setAnovaVar(e.target.value as any)}
                    className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="profit">Profit (₹)</option>
                    <option value="sales">Sales (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Grouping Factor</span>
                  <select 
                    value={anovaFactor} 
                    onChange={e => setAnovaFactor(e.target.value as any)}
                    className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="region">Region (5 groups)</option>
                    <option value="category">Product Category (9 groups)</option>
                  </select>
                </div>
              </>
            )}

            {testType === 'chisquare' && (
              <div className="text-[11px] text-slate-450 leading-relaxed space-y-2 py-2">
                <p><strong>Variables:</strong> Category vs Region</p>
                <p>This checks if the purchase counts of the 9 product categories are independent of the 5 geographic regions in Tamil Nadu.</p>
                <p className="text-[10px] text-slate-400 font-semibold">Uses a 9x5 contingency table computed dynamically from the active filtered records.</p>
              </div>
            )}

          </div>

          {/* Results display */}
          <div className="lg:col-span-3 space-y-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-50 dark:border-slate-900 pb-1.5">Execution Summary</h4>
            
            {hypothesisResults && (
              <div className="space-y-5">
                {/* Metric metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {testType === 't' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">t-Statistic</span>
                        <span className="text-lg font-black text-slate-850 dark:text-white font-mono">{(hypothesisResults as any).tStatistic.toFixed(3)}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">p-Value</span>
                        <span className={`text-lg font-black font-mono ${(hypothesisResults as any).pValue < 0.05 ? 'text-emerald-500' : 'text-slate-550'}`}>
                          {(hypothesisResults as any).pValue.toFixed(5)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Welch DF</span>
                        <span className="text-lg font-black text-slate-850 dark:text-white font-mono">{(hypothesisResults as any).df.toFixed(1)}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Confidence (95%)</span>
                        <span className="text-xs font-black text-slate-850 dark:text-white font-mono block mt-1.5">
                          [{((hypothesisResults as any).confidenceInterval[0]).toFixed(1)}, {((hypothesisResults as any).confidenceInterval[1]).toFixed(1)}]
                        </span>
                      </div>
                    </>
                  )}

                  {testType === 'anova' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">F-Statistic</span>
                        <span className="text-lg font-black text-slate-850 dark:text-white font-mono">{(hypothesisResults as any).fStatistic.toFixed(3)}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">p-Value</span>
                        <span className={`text-lg font-black font-mono ${(hypothesisResults as any).pValue < 0.05 ? 'text-emerald-500' : 'text-slate-550'}`}>
                          {(hypothesisResults as any).pValue.toFixed(5)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">DF Between/Within</span>
                        <span className="text-lg font-black text-slate-850 dark:text-white font-mono">
                          {(hypothesisResults as any).dfBetween} / {(hypothesisResults as any).dfWithin}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">MS Between/Within</span>
                        <span className="text-xs font-black text-slate-850 dark:text-white font-mono block mt-1.5">
                          {formatNumber(Math.round((hypothesisResults as any).msBetween))} / {formatNumber(Math.round((hypothesisResults as any).msWithin))}
                        </span>
                      </div>
                    </>
                  )}

                  {testType === 'chisquare' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900 col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Chi-Square Statistic</span>
                        <span className="text-lg font-black text-slate-850 dark:text-white font-mono">{(hypothesisResults as any).chiStatistic.toFixed(3)}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">p-Value</span>
                        <span className={`text-lg font-black font-mono ${(hypothesisResults as any).pValue < 0.05 ? 'text-emerald-500' : 'text-slate-550'}`}>
                          {(hypothesisResults as any).pValue.toFixed(5)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">DF Degrees of Freedom</span>
                        <span className="text-lg font-black text-slate-850 dark:text-white font-mono">{(hypothesisResults as any).df}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Narrative Interpretations */}
                <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-900/60 bg-slate-50/30 dark:bg-slate-950/10 space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Statistical Interpretation</span>
                    <p className="font-semibold text-slate-850 dark:text-slate-200">
                      {hypothesisResults.interpretation}
                    </p>
                  </div>
                  <div className="space-y-1 border-t border-slate-100 dark:border-slate-900/40 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Business Actionable Strategy</span>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {hypothesisResults.businessMeaning}
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </section>
    </div>
  );
}
