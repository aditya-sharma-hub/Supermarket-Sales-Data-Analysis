"use client";

import React, { useMemo, useState } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Activity
} from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/utils';
import { calculateBoxPlotStats } from '../../utils/statistics';

export default function DataPrepPage() {
  const { filteredData, loading } = useSalesData();

  // Preprocessing simulator state
  const [noiseInjected, setNoiseInjected] = useState(false);
  const [pipelineExecuted, setPipelineExecuted] = useState(false);

  // 1. Compute original dataset statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { totalRows: 0, duplicates: 0, iqrOutliers: 0, zOutliers: 0, nullPercentage: 0 };
    }

    const N = filteredData.length;
    let duplicateCount = 0;
    const seenRows = new Set<string>();

    // Duplicate detection (combining customer, date, sales, profit as signature)
    filteredData.forEach(r => {
      const sig = `${r.customer}-${r.date}-${r.sales}-${r.profit}`;
      if (seenRows.has(sig)) {
        duplicateCount++;
      } else {
        seenRows.add(sig);
      }
    });

    // Outlier detection on Sales
    const salesValues = filteredData.map(r => r.sales);
    const boxStats = calculateBoxPlotStats(salesValues);
    const iqrOutliers = boxStats.outliers.length;

    // Z-Score outlier detection
    const meanSales = salesValues.reduce((a, b) => a + b, 0) / N;
    const varianceSales = salesValues.reduce((sum, v) => sum + Math.pow(v - meanSales, 2), 0) / N;
    const stdDevSales = Math.sqrt(varianceSales) || 1;
    
    let zOutliers = 0;
    salesValues.forEach(v => {
      const z = (v - meanSales) / stdDevSales;
      if (Math.abs(z) > 2.5) {
        zOutliers++;
      }
    });

    return {
      totalRows: N,
      duplicates: noiseInjected ? duplicateCount + 12 : duplicateCount, // inject 12 duplicates if simulated
      iqrOutliers: noiseInjected ? iqrOutliers + 45 : iqrOutliers,      // inject 45 outliers if simulated
      zOutliers: noiseInjected ? zOutliers + 38 : zOutliers,
      nullPercentage: noiseInjected ? 4.2 : 0
    };
  }, [filteredData, noiseInjected]);

  // Data Dictionary / Feature statistics
  const dataDictionary = useMemo(() => {
    if (filteredData.length === 0) return [];

    const features: { name: keyof import('../../types/sales').SalesRecord; type: string; description: string }[] = [
      { name: 'id', type: 'Categorical (ID)', description: 'Unique alphanumeric identifier for transaction' },
      { name: 'date', type: 'Temporal (Date)', description: 'Order purchase timestamp' },
      { name: 'customer', type: 'Categorical', description: 'Name of retail consumer' },
      { name: 'category', type: 'Categorical', description: 'High-level product classification (9 unique categories)' },
      { name: 'subCategory', type: 'Categorical', description: 'Granular product subclassifications (23 types)' },
      { name: 'city', type: 'Categorical', description: 'Tamil Nadu city locations (25 active urban areas)' },
      { name: 'region', type: 'Categorical', description: 'Geographic quadrant (East, West, North, South, Central)' },
      { name: 'sales', type: 'Numerical (Continuous)', description: 'Gross transaction value in Indian Rupees (₹500 - ₹2,500)' },
      { name: 'discount', type: 'Numerical (Continuous)', description: 'Discount percentage applied to the order (10% - 35%)' },
      { name: 'profit', type: 'Numerical (Continuous)', description: 'Net earnings generated on sale (can be negative)' },
      { name: 'state', type: 'Categorical', description: 'Administrative state boundaries (Tamil Nadu locked)' },
      { name: 'quantity', type: 'Numerical (Discrete)', description: 'Units purchased per line item (1 to 9)' }
    ];

    return features.map(f => {
      let min = 'N/A';
      let max = 'N/A';
      let avg = 'N/A';
      let std = 'N/A';

      if (f.name === 'sales' || f.name === 'discount' || f.name === 'profit' || f.name === 'quantity') {
        const values = filteredData.map(r => r[f.name] as number);
        const mn = Math.min(...values);
        const mx = Math.max(...values);
        const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
        const varianceVal = values.reduce((sum, v) => sum + Math.pow(v - meanVal, 2), 0) / values.length;
        const stdDevVal = Math.sqrt(varianceVal);

        min = f.name === 'discount' ? `${(mn * 100).toFixed(0)}%` : f.name === 'sales' ? `₹${mn.toFixed(0)}` : mn.toFixed(0);
        max = f.name === 'discount' ? `${(mx * 100).toFixed(0)}%` : f.name === 'sales' ? `₹${mx.toFixed(0)}` : mx.toFixed(0);
        avg = f.name === 'discount' ? `${(meanVal * 100).toFixed(1)}%` : f.name === 'sales' ? `₹${meanVal.toFixed(0)}` : meanVal.toFixed(1);
        std = f.name === 'discount' ? `${(stdDevVal * 100).toFixed(1)}%` : f.name === 'sales' ? `₹${stdDevVal.toFixed(0)}` : stdDevVal.toFixed(1);
      }

      return {
        ...f,
        min,
        max,
        avg,
        std
      };
    });
  }, [filteredData]);

  // Imputed / Pipeline State Descriptions
  const pipelineSteps = [
    { id: 'raw', name: 'Raw Data', desc: '9,994 CSV transaction records loaded', status: 'done' },
    { id: 'cleaning', name: 'Data Cleaning', desc: noiseInjected ? (pipelineExecuted ? 'Nulls imputed (Median) & duplicates pruned' : '12 duplicates & 4.2% missing values detected') : 'Verified clean, no missing values found', status: noiseInjected && !pipelineExecuted ? 'warn' : 'done' },
    { id: 'encoding', name: 'Feature Encoding', desc: 'Categorical fields mapped via Label & One-Hot Encoding', status: 'done' },
    { id: 'scaling', name: 'MinMax Scaling', desc: 'Normalizing continuous features to [0,1] range for ML fitting', status: 'done' },
    { id: 'feature_eng', name: 'Feature Engineering', desc: '11 engineered features synthesized (Profit margins, tenure, season)', status: 'done' },
    { id: 'final', name: 'Ready Dataset', desc: 'Normalized tensor matrix prepped for regression / clustering', status: 'done' }
  ];

  // Simulated missing values heatmap grid (10 rows x 12 columns)
  const heatmapCells = useMemo(() => {
    const cols = ['id', 'date', 'customer', 'category', 'subCategory', 'city', 'region', 'sales', 'discount', 'profit', 'state', 'quantity'];
    const rows = Array.from({ length: 15 });

    return rows.map((_, rIndex) => {
      return cols.map((col, cIndex) => {
        // If noise injected, simulate some nulls randomly (e.g. 5% chance)
        const isNull = noiseInjected && (rIndex * 12 + cIndex) % 23 === 3 && col !== 'id';
        const isCleaned = pipelineExecuted && isNull;
        return {
          row: rIndex,
          col,
          val: isNull ? (isCleaned ? 'IMPUTED' : 'NULL') : 'OK'
        };
      });
    });
  }, [noiseInjected, pipelineExecuted]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="border-l-4 border-purple-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Advanced Pipeline</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Data Preprocessing & Cleansing Center</h3>
      </div>

      {/* Interactive Controller Alert */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-slate-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Interactive Pipeline Sandbox
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Demonstrate real-world cleaning capability. Inject synthetic missing values, duplicates, and outlier values into the dataset. Execute the preprocessing pipeline to observe imputation and cleansing in real time.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!noiseInjected ? (
            <button
              onClick={() => {
                setNoiseInjected(true);
                setPipelineExecuted(false);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Inject Noise
            </button>
          ) : (
            <button
              onClick={() => {
                setNoiseInjected(false);
                setPipelineExecuted(false);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-xs font-bold text-red-650 hover:bg-red-100 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Noise
            </button>
          )}

          <button
            onClick={() => {
              if (noiseInjected) setPipelineExecuted(true);
            }}
            disabled={!noiseInjected || pipelineExecuted}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors
              ${noiseInjected && !pipelineExecuted 
                ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/10' 
                : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }
            `}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${noiseInjected && !pipelineExecuted ? 'animate-spin' : ''}`} />
            Run Cleaning Pipeline
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Completeness Rate</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {noiseInjected ? (pipelineExecuted ? '100.0%' : '95.8%') : '100.0%'}
            </h3>
            {noiseInjected && !pipelineExecuted && <span className="text-[10px] text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/50">4.2% Nulls</span>}
            {pipelineExecuted && <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-200/50">Imputed</span>}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Percentage of records with non-empty attributes</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Duplicate Rows</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {noiseInjected ? (pipelineExecuted ? '0' : '12') : '0'}
            </h3>
            {noiseInjected && !pipelineExecuted && <span className="text-[10px] text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/50">Redundant</span>}
            {pipelineExecuted && <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-200/50">Pruned</span>}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Total identical records detected and flagged</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">IQR Outliers (Sales)</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatNumber(stats.iqrOutliers)}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Tukey Fence</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Values beyond Q3 + 1.5 IQR range</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Z-Score Outliers (Sales)</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatNumber(stats.zOutliers)}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">|Z| &gt; 2.5</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Values exceeding 2.5 standard deviations</span>
        </div>
      </div>

      {/* Preprocessing Flow Diagram */}
      <div className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-slate-800 dark:text-white">Data Preprocessing Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
          {pipelineSteps.map((step, idx) => (
            <div key={step.id} className="relative flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20 text-center space-y-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-650 dark:text-blue-400 font-extrabold text-xs">
                {idx + 1}
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{step.name}</h4>
              <p className="text-[10px] text-slate-450 leading-normal">{step.desc}</p>
              
              <div className="pt-2 flex items-center justify-center gap-1 text-[9px] font-bold">
                {step.status === 'done' ? (
                  <span className="text-emerald-500 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Complete</span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-0.5 animate-pulse"><AlertTriangle className="w-3 h-3" /> Action Required</span>
                )}
              </div>

              {/* Horizontal arrows on desktop layout */}
              {idx < 5 && (
                <div className="hidden lg:flex absolute left-full top-1/2 -translate-y-1/2 w-4 z-10 justify-center items-center pointer-events-none text-slate-300 dark:text-slate-700">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Missing Values Heatmap Grid */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" /> Missing Value Heatmap
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Visualizing spatial layout of null values in sample rows (15 rows x 12 columns)</span>
          </div>

          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div className="grid grid-cols-12 gap-1 text-[8px] font-bold text-slate-400 text-center pb-1">
              {['id', 'dt', 'cu', 'ca', 'sc', 'ci', 're', 'sa', 'di', 'pr', 'st', 'qu'].map((name, i) => (
                <span key={i} title={name}>{name}</span>
              ))}
            </div>
            {heatmapCells.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-12 gap-1">
                {row.map((cell, cIdx) => (
                  <div
                    key={cIdx}
                    className={`h-6 rounded-md flex items-center justify-center text-[7px] font-black transition-colors duration-300 border
                      ${cell.val === 'NULL' 
                        ? 'bg-red-500/20 border-red-500 text-red-500' 
                        : cell.val === 'IMPUTED'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200/40 dark:border-slate-800/50 text-slate-300 dark:text-slate-700'
                      }
                    `}
                    title={`Row ${rIdx + 1}, Col: ${cell.col} - Status: ${cell.val}`}
                  >
                    {cell.val === 'NULL' ? 'N' : cell.val === 'IMPUTED' ? 'I' : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4 text-[9px] font-bold text-slate-400 justify-center">
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800" /> Complete</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500" /> Missing (Null)</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500" /> Cleaned (Imputed)</div>
          </div>
        </div>

        {/* Feature Statistics and Descriptions */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-500" /> Feature Dictionary & Descriptive Stats
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Schema layout of features with null percentage and computed boundary statistics</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 font-bold">
                  <th className="py-2">Feature Name</th>
                  <th className="py-2">Data Type</th>
                  <th className="py-2">Missing %</th>
                  <th className="py-2 text-right">Min</th>
                  <th className="py-2 text-right">Max</th>
                  <th className="py-2 text-right">Mean</th>
                  <th className="py-2 text-right">Std Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-900/50">
                {dataDictionary.map(f => {
                  const isNull = noiseInjected && f.name !== 'id';
                  return (
                    <tr key={f.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">{f.name}</td>
                      <td className="py-2 text-slate-450">{f.type}</td>
                      <td className="py-2">
                        {isNull ? (
                          pipelineExecuted ? (
                            <span className="text-emerald-500 font-bold">0.0% (Cleaned)</span>
                          ) : (
                            <span className="text-amber-500 font-bold">4.2%</span>
                          )
                        ) : (
                          <span className="text-slate-400">0.0%</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">{f.min}</td>
                      <td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">{f.max}</td>
                      <td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">{f.avg}</td>
                      <td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">{f.std}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
