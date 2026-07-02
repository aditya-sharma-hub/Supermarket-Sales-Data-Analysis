"use client";

import React, { useMemo, useState } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { 
  AlertTriangle, 
  Search, 
  Activity, 
  Percent, 
  Gift, 
  Info,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/utils';
import { detectAnomalies, AnomalyRecord } from '../../utils/anomalies';

export default function AnomalyDetectionPage() {
  const { filteredData, loading } = useSalesData();

  // Search filter for logs
  const [anomalySearch, setAnomalySearch] = useState('');

  // Anomaly score threshold slider (user can filter by severity)
  const [minScore, setMinScore] = useState(0.58);

  // Compute anomalies memoized
  const anomalies = useMemo(() => {
    if (filteredData.length === 0) return [];
    return detectAnomalies(filteredData);
  }, [filteredData]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (anomalies.length === 0) return { count: 0, maxScore: 0, avgScore: 0 };
    
    const highAnomalies = anomalies.filter(a => a.anomalyScore >= 0.60);
    const sumScore = anomalies.reduce((sum, a) => sum + a.anomalyScore, 0);
    
    return {
      count: highAnomalies.length,
      maxScore: anomalies[0]?.anomalyScore || 0,
      avgScore: parseFloat((sumScore / anomalies.length).toFixed(3))
    };
  }, [anomalies]);

  // Filtered anomalies list for inspector table
  const filteredLogs = useMemo(() => {
    return anomalies.filter(a => {
      const matchScore = a.anomalyScore >= minScore;
      const matchSearch = anomalySearch === '' || 
        a.record.customer.toLowerCase().includes(anomalySearch.toLowerCase()) ||
        a.record.city.toLowerCase().includes(anomalySearch.toLowerCase()) ||
        a.reason.toLowerCase().includes(anomalySearch.toLowerCase());
      return matchScore && matchSearch;
    });
  }, [anomalies, minScore, anomalySearch]);

  // Scatter plot data (subsampled for speed)
  const scatterData = useMemo(() => {
    if (anomalies.length === 0) return { normal: [], outliers: [] };

    const stride = Math.max(1, Math.floor(anomalies.length / 400));
    const normal: any[] = [];
    const outliers: any[] = [];

    for (let i = 0; i < anomalies.length; i += stride) {
      const a = anomalies[i];
      const pt = {
        sales: a.record.sales,
        profit: a.record.profit,
        customer: a.record.customer,
        score: a.anomalyScore,
        reason: a.reason
      };

      if (a.anomalyScore >= 0.60) {
        outliers.push(pt);
      } else {
        normal.push(pt);
      }
    }

    return { normal, outliers };
  }, [anomalies]);

  const CustomAnomalyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pt = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-slate-800 dark:text-white">{pt.customer}</p>
          <p className="text-slate-500 dark:text-slate-400">Sales: <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(pt.sales)}</span></p>
          <p className="text-slate-500 dark:text-slate-400">Profit: <span className={`font-bold ${pt.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(pt.profit)}</span></p>
          <p className="text-[10px] text-slate-400">Isolation Score: <span className="font-bold text-indigo-500">{pt.score}</span></p>
          {pt.score >= 0.6 && (
            <p className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/20 px-1 rounded inline-block mt-1">{pt.reason}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading || anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
        <span className="text-sm font-bold text-slate-400">Calculating Isolation Forest Outlier Coefficients...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-red-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Risk Assessment</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Transaction Anomaly & Outlier Detection</h3>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">High-Risk Anomalies</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-black text-red-500">
              {stats.count}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Score &gt;= 0.60</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Outlier transactions isolated close to tree roots</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Max Outlier Score</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {stats.maxScore}
            </h3>
            <span className="text-[10px] text-slate-450 font-bold bg-red-50 dark:bg-red-950/20 px-1.5 rounded border border-red-200/50">Critical</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Highest isolation coefficient calculated</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Avg Anomaly Coefficient</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-black text-indigo-500 font-mono">
              {stats.avgScore}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Median 0.45</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Expected search path length across isolation forest</span>
        </div>
      </div>

      {/* Outlier Scatter Plot */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
            <Activity className="w-4.5 h-4.5 text-red-500" /> Isolation Outlier Boundary Plot
          </h3>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            Sales vs Profit scatter where red circles highlight anomalous records detected by the forest
          </span>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
              <XAxis type="number" dataKey="sales" name="Sales" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val)=>`₹${val}`} />
              <YAxis type="number" dataKey="profit" name="Profit" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val)=>`₹${val}`} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomAnomalyTooltip />} />
              
              <Scatter name="Normal Sales Flow" data={scatterData.normal} fill="rgba(148, 163, 184, 0.35)" />
              <Scatter name="Anomalies" data={scatterData.outliers} fill="#ef4444" />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Outliers Inspector Grid */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-5">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-slate-900 pb-4 gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Isolation Forest Audit Log
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold block">
              Showing {filteredLogs.length} outlier items matching score threshold
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:max-w-xl shrink-0">
            {/* Slider to adjust minimum score threshold */}
            <div className="flex-1 flex items-center gap-2 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Min Score: {minScore}</span>
              <input
                type="range"
                min="0.55"
                max="0.65"
                step="0.01"
                value={minScore}
                onChange={e => setMinScore(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-550"
              />
            </div>

            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search audit log..."
                value={anomalySearch}
                onChange={e => setAnomalySearch(e.target.value)}
                className="w-full h-8 pl-9 pr-3 rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 font-bold">
                <th className="py-2.5">Customer</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">City</th>
                <th className="py-2.5 text-right">Sales (₹)</th>
                <th className="py-2.5 text-right">Profit (₹)</th>
                <th className="py-2.5 text-right">Discount</th>
                <th className="py-2.5 text-right">Anomaly Score</th>
                <th className="py-2.5 text-right">Identified Root Cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-900/50">
              {filteredLogs.slice(0, 12).map((a, i) => {
                const isLoss = a.record.profit < 0;
                return (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="py-3 font-semibold text-slate-850 dark:text-slate-150">{a.record.customer}</td>
                    <td className="py-3 text-slate-450">{a.record.category}</td>
                    <td className="py-3 text-slate-450">{a.record.city}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-350">{formatCurrency(a.record.sales)}</td>
                    <td className={`py-3 text-right font-mono font-bold ${isLoss ? 'text-red-500' : 'text-emerald-555'}`}>
                      {formatCurrency(a.record.profit)}
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-slate-655">{(a.record.discount * 100).toFixed(0)}%</td>
                    <td className="py-3 text-right font-mono font-black text-red-500">{a.anomalyScore}</td>
                    <td className="py-3 text-right font-bold">
                      <span className="text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-200/50">
                        {a.reason}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No anomalies detected above this score threshold</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

    </div>
  );
}
