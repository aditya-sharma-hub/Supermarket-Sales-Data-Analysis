"use client";
import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent } from '../lib/utils';
import { Users, Trophy, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface CustomerParetoChartProps {
  data: SalesRecord[];
}

interface CustomerStats {
  name: string;
  sales: number;
  profit: number;
  orders: number;
  clv: number; // Customer Lifetime Value Proxy (Total Sales)
}

export function CustomerParetoChart({ data }: CustomerParetoChartProps) {
  const [fullscreenChart, setFullscreenChart] = useState<'revenue' | 'profitability' | 'pareto' | null>(null);
  
  // 1. Group by Customer and sort by Sales memoized
  const sortedCustomers = useMemo((): CustomerStats[] => {
    if (data.length === 0) return [];

    const agg: Record<string, { sales: number; profit: number; orders: number }> = {};
    data.forEach(r => {
      if (!agg[r.customer]) {
        agg[r.customer] = { sales: 0, profit: 0, orders: 0 };
      }
      agg[r.customer].sales += r.sales;
      agg[r.customer].profit += r.profit;
      agg[r.customer].orders += 1;
    });

    return Object.entries(agg)
      .map(([name, vals]) => ({
        name,
        sales: vals.sales,
        profit: vals.profit,
        orders: vals.orders,
        clv: vals.sales, // Total sales as proxy for lifetime value
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [data]);

  // 2. Compute Pareto cumulative data for the chart (top 20 customers for display)
  const paretoChartData = useMemo(() => {
    if (sortedCustomers.length === 0) return [];

    const totalSales = sortedCustomers.reduce((sum, c) => sum + c.sales, 0);
    let cumulativeSum = 0;

    return sortedCustomers.map((cust, idx) => {
      cumulativeSum += cust.sales;
      const cumulativePercent = totalSales === 0 ? 0 : (cumulativeSum / totalSales) * 100;
      return {
        name: cust.name,
        sales: cust.sales,
        cumulativePercent: parseFloat(cumulativePercent.toFixed(1)),
      };
    }).slice(0, 20); // Display top 20 customers
  }, [sortedCustomers]);

  // 3. Dynamic Insights & calculations
  const paretoInsights = useMemo(() => {
    if (sortedCustomers.length === 0) return { text: [], top20PctRevenue: 0 };

    const totalSales = sortedCustomers.reduce((sum, c) => sum + c.sales, 0);
    const customerCount = sortedCustomers.length;
    const top20Count = Math.max(1, Math.round(customerCount * 0.2));

    const top20Sales = sortedCustomers
      .slice(0, top20Count)
      .reduce((sum, c) => sum + c.sales, 0);

    const top20PctRevenue = totalSales === 0 ? 0 : (top20Sales / totalSales) * 100;
    const topCustomer = sortedCustomers[0];

    const text = [
      `The top **20%** of customers (**${top20Count}** clients) generate **${top20PctRevenue.toFixed(1)}%** of the total supermarket revenue.`,
      `**${topCustomer.name}** is the highest value client with a Customer Lifetime Value (CLV) of **${formatCurrency(topCustomer.clv)}** across **${topCustomer.orders}** orders.`
    ];

    return { text, top20PctRevenue };
  }, [sortedCustomers]);

  const paretoThresholdIndex = useMemo(() => {
    let sum = 0;
    const total = sortedCustomers.reduce((s, c) => s + c.sales, 0);
    if (total === 0) return 0;
    
    for (let i = 0; i < sortedCustomers.length; i++) {
      sum += sortedCustomers[i].sales;
      if ((sum / total) * 100 >= 80) {
        return Math.min(i, 19);
      }
    }
    return 0;
  }, [sortedCustomers]);

  const topProfitCustomers = useMemo(() => {
    return [...sortedCustomers]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [sortedCustomers]);

  const topSalesCustomers = useMemo(() => {
    return sortedCustomers.slice(0, 5);
  }, [sortedCustomers]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg space-y-1.5 z-50">
          <p className="text-xs font-bold text-slate-850 dark:text-slate-100">{label}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
            Sales: <span className="font-bold">{formatCurrency(payload[0].value)}</span>
          </p>
          {payload[1] && (
            <p className="text-xs text-orange-500 dark:text-orange-400 font-semibold">
              Cumulative Share: <span className="font-bold">{payload[1].value}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Insight Engine Card */}
      <InsightCard insights={paretoInsights.text} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Customer Insights & Leaderboards (1/3 Width) */}
        <div className="space-y-6 xl:col-span-1">
          
          {/* Top Customers by Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500" /> Top Customers by Revenue
              </h3>

              <button
                onClick={() => setFullscreenChart('revenue')}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-805 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3.5">
              {topSalesCustomers.map((cust, idx) => (
                <div key={cust.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100/50 dark:border-slate-800/30">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-100">{cust.name}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold">{cust.orders} orders</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatCurrency(cust.clv)}</span>
                    <span className="block text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">CLV</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Customers by Net Profit */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" /> Top Customers by Profitability
              </h3>

              <button
                onClick={() => setFullscreenChart('profitability')}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-805 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3.5">
              {topProfitCustomers.map((cust, idx) => (
                <div key={cust.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100/50 dark:border-slate-800/30">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-100">{cust.name}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold">{cust.orders} orders</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(cust.profit)}</span>
                    <span className="block text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">Net Profit</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Pareto Chart (2/3 Width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Revenue Concentration (Pareto Chart)
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Cumulative sales percentage vs top 20 customers (the 80/20 rule threshold)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('pareto')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[320px] w-full">
            {paretoChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={9} 
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={9}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="rgba(249, 115, 22, 0.7)"
                    fontSize={9}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                    domain={[0, 100]}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  
                  <Bar 
                    yAxisId="left"
                    name="Sales Revenue" 
                    dataKey="sales" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  
                  <Line 
                    yAxisId="right"
                    name="Cumulative %" 
                    type="monotone" 
                    dataKey="cumulativePercent" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f97316' }}
                    activeDot={{ r: 5 }}
                  />
                  
                  <ReferenceLine 
                    yAxisId="right"
                    y={80} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ value: '80% Threshold', position: 'insideRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
                  />

                  {paretoThresholdIndex > 0 && (
                    <ReferenceLine 
                      yAxisId="right"
                      x={paretoChartData[paretoThresholdIndex]?.name} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                    />
                  )}
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
                    {fullscreenChart === 'revenue' && <><Trophy className="w-5 h-5 text-yellow-500" /> Top Customers by Revenue</>}
                    {fullscreenChart === 'profitability' && <><Sparkles className="w-5 h-5 text-emerald-500" /> Top Customers by Profitability</>}
                    {fullscreenChart === 'pareto' && <><Users className="w-5 h-5 text-blue-600" /> Customer Revenue Concentration (Pareto)</>}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Analysis of high-value customer segments and lifetime value distributions
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative overflow-y-auto">
                  {fullscreenChart === 'revenue' && (
                    <div className="space-y-4 max-w-lg mx-auto">
                      {sortedCustomers.slice(0, 10).map((cust, idx) => (
                        <div key={cust.name} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-55/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                            <div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{cust.name}</span>
                              <span className="block text-[11px] text-slate-400 font-semibold">{cust.orders} orders</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{formatCurrency(cust.clv)}</span>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">CLV</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {fullscreenChart === 'profitability' && (
                    <div className="space-y-4 max-w-lg mx-auto">
                      {sortedCustomers.sort((a, b) => b.profit - a.profit).slice(0, 10).map((cust, idx) => (
                        <div key={cust.name} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-55/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-450 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                            <div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{cust.name}</span>
                              <span className="block text-[11px] text-slate-400 font-semibold">{cust.orders} orders</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-450">{formatCurrency(cust.profit)}</span>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Profit</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {fullscreenChart === 'pareto' && paretoChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={paretoChartData} margin={{ top: 15, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                        <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} angle={-35} textAnchor="end" height={60} />
                        <YAxis yAxisId="left" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgba(249, 115, 22, 0.7)" fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                        <Bar yAxisId="left" name="Sales Revenue" dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                        <Line yAxisId="right" name="Cumulative %" type="monotone" dataKey="cumulativePercent" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} />
                        <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80% Threshold', position: 'insideRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                        {paretoThresholdIndex > 0 && (
                          <ReferenceLine yAxisId="right" x={paretoChartData[paretoThresholdIndex]?.name} stroke="#ef4444" strokeDasharray="4 4" />
                        )}
                      </ComposedChart>
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
export { type CustomerStats };
