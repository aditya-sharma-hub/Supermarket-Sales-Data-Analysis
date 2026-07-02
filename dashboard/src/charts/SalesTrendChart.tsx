"use client";
import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Area, 
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency } from '../lib/utils';
import { CalendarRange, Coins, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface SalesTrendChartProps {
  data: SalesRecord[];
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [fullscreenChart, setFullscreenChart] = useState<'trend' | 'comparison' | null>(null);

  // 1. Process time-series aggregation memoized
  const aggregatedData = useMemo(() => {
    if (data.length === 0) return [];

    const groups: Record<string, { label: string; sales: number; profit: number; count: number; rawDate: string }> = {};

    data.forEach(r => {
      let key = '';
      let label = '';
      const d = new Date(r.date);

      if (granularity === 'daily') {
        key = r.date;
        label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } else if (granularity === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day;
        const sunday = new Date(d.setDate(diff));
        key = sunday.toISOString().split('T')[0];
        label = `W/C ${sunday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
      } else if (granularity === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      } else if (granularity === 'quarterly') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
        label = `Q${q} ${d.getFullYear()}`;
      }

      if (!groups[key]) {
        groups[key] = { label, sales: 0, profit: 0, count: 0, rawDate: r.date };
      }
      groups[key].sales += r.sales;
      groups[key].profit += r.profit;
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [data, granularity]);

  // Insights generation for the section
  const sectionInsights = useMemo(() => {
    if (data.length === 0) return [];
    if (aggregatedData.length === 0) return [];
    
    const sortedBySales = [...aggregatedData].sort((a, b) => b.sales - a.sales);
    const topPeriod = sortedBySales[0];

    const totalSales = data.reduce((sum, r) => sum + r.sales, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
    const avgMargin = totalSales === 0 ? 0 : totalProfit / totalSales;

    const insights = [
      `Peak sales performance occurred during **${topPeriod.label}** with total revenue of **${formatCurrency(topPeriod.sales)}**.`,
      `The overall profit-to-sales margin holds stable at **${(avgMargin * 100).toFixed(1)}%** across the active timeframe.`
    ];
    return insights;
  }, [data, aggregatedData]);

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg space-y-1.5 z-50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}: <span className="font-bold">{formatCurrency(p.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Section Insights */}
      <InsightCard insights={sectionInsights} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Sales Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CalendarRange className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Sales Trend Velocity
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Aggregate transaction metrics over time
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Granularity Toggle */}
              <div className="flex bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 self-start">
                {(['daily', 'weekly', 'monthly', 'quarterly'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all capitalize
                      ${granularity === g
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }
                    `}
                  >
                    {g}
                  </button>
                ))}
              </div>
              
              {/* Maximize Button */}
              <button
                onClick={() => setFullscreenChart('trend')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[300px] w-full">
            {aggregatedData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis 
                    dataKey="label" 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    name="Sales Revenue" 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Chart 2: Dual Axis Sales vs Profit */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> Sales vs Profit Performance
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Dual-axis comparison of gross vs net return (aggregated monthly)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('comparison')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[300px] w-full">
            {aggregatedData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis 
                    dataKey="label" 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#3b82f6"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#10b981"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                    iconType="circle"
                  />
                  <Area 
                    yAxisId="left"
                    name="Gross Sales" 
                    type="monotone" 
                    dataKey="sales" 
                    fill="url(#salesGrad)" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    name="Net Profit" 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Overlay Modal */}
      <AnimatePresence>
        {fullscreenChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 md:p-10"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setFullscreenChart(null)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Close View"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="mb-4 pr-10">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {fullscreenChart === 'trend' ? (
                      <>
                        <CalendarRange className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Sales Trend Velocity
                      </>
                    ) : (
                      <>
                        <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> Sales vs Profit Performance
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {fullscreenChart === 'trend'
                      ? 'Aggregate transaction metrics over time'
                      : 'Dual-axis comparison of gross vs net return (aggregated monthly)'}
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative">
                  {aggregatedData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {fullscreenChart === 'trend' ? (
                        <LineChart data={aggregatedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                          <XAxis 
                            dataKey="label" 
                            stroke="rgba(148, 163, 184, 0.6)"
                            fontSize={11} 
                            tickLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            stroke="rgba(148, 163, 184, 0.6)"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            name="Sales Revenue" 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#3b82f6" 
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      ) : (
                        <ComposedChart data={aggregatedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="salesGradModal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                          <XAxis 
                            dataKey="label" 
                            stroke="rgba(148, 163, 184, 0.6)"
                            fontSize={11} 
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="#3b82f6"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="#10b981"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
                            iconType="circle"
                          />
                          <Area 
                            yAxisId="left"
                            name="Gross Sales" 
                            type="monotone" 
                            dataKey="sales" 
                            fill="url(#salesGradModal)" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                          />
                          <Line 
                            yAxisId="right"
                            name="Net Profit" 
                            type="monotone" 
                            dataKey="profit" 
                            stroke="#10b981" 
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                          />
                        </ComposedChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
