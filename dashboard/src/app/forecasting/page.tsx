"use client";

import React, { useMemo, useState } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  Activity, 
  Layers, 
  Zap,
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { 
  aggregateByMonth, 
  runProphetForecast, 
  runARIMAForecast, 
  runXGBoostForecast 
} from '../../utils/forecasting';

export default function ForecastingPage() {
  const { filteredData, loading } = useSalesData();

  // Settings states
  const [targetCol, setTargetCol] = useState<'sales' | 'profit' | 'quantity'>('sales');
  const [modelType, setModelType] = useState<'prophet' | 'arima' | 'xgboost'>('prophet');
  const [horizonMonths, setHorizonMonths] = useState<12 | 24>(12);

  // Aggregate monthly series memoized
  const monthlySeries = useMemo(() => {
    if (filteredData.length === 0) return [];
    return aggregateByMonth(filteredData, targetCol);
  }, [filteredData, targetCol]);

  // Execute forecast model memoized
  const forecastResults = useMemo(() => {
    if (monthlySeries.length === 0) return null;
    
    if (modelType === 'prophet') {
      return runProphetForecast(monthlySeries, horizonMonths);
    } else if (modelType === 'arima') {
      return runARIMAForecast(monthlySeries, horizonMonths);
    } else {
      return runXGBoostForecast(monthlySeries, horizonMonths);
    }
  }, [monthlySeries, modelType, horizonMonths]);

  // UI Loading fallback
  if (loading || !forecastResults) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <TrendingUp className="w-10 h-10 text-pink-500 animate-pulse" />
        <span className="text-sm font-bold text-slate-400">Fitting Time Series Forecasts...</span>
      </div>
    );
  }

  // Process historical vs future forecast points to avoid Recharts dynamic styling issues
  const processedForecast = React.useMemo(() => {
    if (!forecastResults) return [];
    const pts = forecastResults.forecast;
    const lastHistIdx = pts.reduce((last, pt, idx) => pt.actual !== null ? idx : last, -1);
    
    return pts.map((pt, idx) => {
      const isFuture = pt.actual === null;
      const isConnectPoint = idx === lastHistIdx;
      return {
        ...pt,
        predHistory: !isFuture ? pt.predicted : null,
        predFuture: (isFuture || isConnectPoint) ? pt.predicted : null
      };
    });
  }, [forecastResults]);

  // Format currency/number for charts
  const formatYValue = (val: number) => {
    if (targetCol === 'quantity') return formatNumber(val);
    return `₹${(val / 1000).toFixed(0)}k`;
  };

  const CustomForecastTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const dateStr = new Date(dataPoint.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-slate-800 dark:text-white mb-1">{dateStr}</p>
          {dataPoint.actual !== null ? (
            <p className="text-slate-500 dark:text-slate-400">Actual Value: <span className="font-bold text-slate-700 dark:text-slate-200">
              {targetCol === 'quantity' ? formatNumber(dataPoint.actual) : formatCurrency(dataPoint.actual)}
            </span></p>
          ) : null}
          <p className="text-indigo-650 dark:text-indigo-400 font-bold">Predicted: <span>
            {targetCol === 'quantity' ? formatNumber(dataPoint.predicted) : formatCurrency(dataPoint.predicted)}
          </span></p>
          {dataPoint.actual === null ? (
            <p className="text-[10px] text-slate-400">Confidence Band: [
              {targetCol === 'quantity' ? formatNumber(dataPoint.lowerBound) : formatCurrency(dataPoint.lowerBound)} - {' '}
              {targetCol === 'quantity' ? formatNumber(dataPoint.upperBound) : formatCurrency(dataPoint.upperBound)}
            ]</p>
          ) : null}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-pink-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Time Series</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Predictive Sales & Demand Forecasting</h3>
      </div>

      {/* Settings Panel & Summary Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Forecast Settings */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-4 col-span-1 flex flex-col justify-between">
          <h4 className="text-xs font-bold text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-900 pb-2">
            <Calendar className="w-4 h-4 text-pink-500" /> Forecast Configuration
          </h4>

          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Forecast Target</span>
              <select 
                value={targetCol} 
                onChange={e => setTargetCol(e.target.value as any)}
                className="w-full text-xs h-9 px-2 rounded-lg border border-slate-250 dark:border-slate-805 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value="sales">Sales Revenue (₹)</option>
                <option value="profit">Net Profit (₹)</option>
                <option value="quantity">Inventory Demand (Units)</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Algorithm Model</span>
              <select 
                value={modelType} 
                onChange={e => setModelType(e.target.value as any)}
                className="w-full text-xs h-9 px-2 rounded-lg border border-slate-250 dark:border-slate-805 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value="prophet">Additive Seasonality (Prophet)</option>
                <option value="arima">Autoregressive AR(2) (ARIMA)</option>
                <option value="xgboost">Tabular Lags (XGBoost)</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Horizon Length</span>
              <select 
                value={horizonMonths} 
                onChange={e => setHorizonMonths(parseInt(e.target.value, 10) as any)}
                className="w-full text-xs h-9 px-2 rounded-lg border border-slate-250 dark:border-slate-805 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value={12}>12 Months (Next Year)</option>
                <option value={24}>24 Months (2-Year Outlook)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Forecast KPI Summary Cards */}
        <div className="col-span-1 xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Forecast Accuracy</span>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {forecastResults.accuracy}%
              </h3>
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-200/50">High</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">100 - MAPE (Mean Absolute Percentage Error)</span>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Model R² Score</span>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-black text-indigo-500">
                {forecastResults.metrics.r2.toFixed(3)}
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">Goodness of Fit</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">Proportion of variance explained by seasonality/trend</span>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-2 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">RMSE (Root MSE)</span>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {targetCol === 'quantity' ? formatNumber(forecastResults.metrics.rmse) : `₹${Math.round(forecastResults.metrics.rmse).toLocaleString()}`}
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">Error Standard</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">Residual standard error scaled to target unit</span>
          </div>
        </div>

      </div>

      {/* Main Forecast Chart with Confidence Bands */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4.5 h-4.5 text-pink-500" /> Time Series Forecast Timeline
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Shaded regions denote the 95% forecast prediction interval bounds</span>
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedForecast} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(148, 163, 184, 0.6)"
                fontSize={10} 
                tickLine={false} 
                tickFormatter={(val) => {
                  const [y, m] = val.split('-');
                  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
                }}
              />
              <YAxis 
                stroke="rgba(148, 163, 184, 0.6)"
                fontSize={10} 
                tickLine={false} 
                tickFormatter={formatYValue}
              />
              <Tooltip content={<CustomForecastTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              
              {/* Confidence Band Shading (Only for future forecasts) */}
              <Area 
                name="95% Confidence Interval"
                type="monotone" 
                dataKey="upperBound" 
                stroke="none" 
                fill="rgba(99, 102, 241, 0.08)" 
                activeDot={false}
              />
              
              <Area 
                name="Confidence Bottom Boundary"
                type="monotone" 
                dataKey="lowerBound" 
                stroke="none" 
                fill="#f8fafc" // matches layout background
                className="dark:fill-slate-950"
                activeDot={false}
                legendType="none"
              />

              {/* Historical actual timeline */}
              <Line 
                name="Historical Actual"
                type="monotone" 
                dataKey="actual" 
                stroke="#475569" 
                strokeWidth={2.5} 
                dot={{ r: 2 }} 
                activeDot={{ r: 4 }}
              />

              {/* Fitted + Future Predictions */}
              <Line 
                name="Fitted Model (History)"
                type="monotone" 
                dataKey="predHistory" 
                stroke="#6366f1" 
                strokeWidth={2.5} 
                dot={false}
              />
              <Line 
                name="Forecast Projection"
                type="monotone" 
                dataKey="predFuture" 
                stroke="#6366f1" 
                strokeWidth={2.5} 
                strokeDasharray="5 5" 
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Decomposed Components (Trend & Seasonality) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Component */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-pink-500" /> Long-Term Trend Component
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Isolating linear macro direction by pruning cyclical components</span>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastResults.forecast} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} tickFormatter={(val)=>val.split('-')[1] === '01' ? val.split('-')[0] : ''} />
                <YAxis stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} tickFormatter={formatYValue} />
                <Tooltip />
                <Line type="monotone" dataKey="trend" name="Trend" stroke="#ec4899" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seasonality Component */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-pink-500" /> Detrended Seasonality Component
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Cyclical monthly fluctuations calculated across seasons</span>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastResults.forecast} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} tickFormatter={(val)=>val.split('-')[1] === '01' ? val.split('-')[0] : ''} />
                <YAxis stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} tickFormatter={formatYValue} />
                <Tooltip />
                <Line type="monotone" dataKey="seasonality" name="Seasonality" stroke="#10b981" strokeWidth={2} dot={false} />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </section>

    </div>
  );
}
