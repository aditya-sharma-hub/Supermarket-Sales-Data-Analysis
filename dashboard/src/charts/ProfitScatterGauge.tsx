"use client";
import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Scatter, 
  Line, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  Bar, 
  Cell, 
  BarChart 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent } from '../lib/utils';
import { calculateLinearRegression } from '../utils/statistics';
import { Percent, Activity, Layers3, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface ProfitScatterGaugeProps {
  data: SalesRecord[];
}

export function ProfitScatterGauge({ data }: ProfitScatterGaugeProps) {
  const [fullscreenChart, setFullscreenChart] = useState<'scatter' | 'gauge' | 'waterfall' | null>(null);
  
  // 1. Process Scatter Plot data & Linear Regression memoized
  const scatterAndRegression = useMemo(() => {
    if (data.length === 0) {
      return { scatterData: [], trendline: [], r2: 0 };
    }

    const stride = Math.max(1, Math.floor(data.length / 400));
    const scatterData = [];
    
    for (let i = 0; i < data.length; i += stride) {
      const r = data[i];
      scatterData.push({
        discount: parseFloat((r.discount * 100).toFixed(1)), // percentage format for X
        profit: r.profit,
        sales: r.sales,
        customer: r.customer,
        rawDiscount: r.discount // keep decimal for regression
      });
    }

    const regressionInput = data.map(r => ({ discount: r.discount, profit: r.profit }));
    const regressionResult = calculateLinearRegression(regressionInput);

    const trendline = regressionResult.trendlinePoints.map(pt => ({
      discount: pt.discount * 100,
      trendlineProfit: pt.profit,
    }));

    return { scatterData, trendline, r2: regressionResult.r2 };
  }, [data]);

  // 2. Compute Waterfall financial flow
  const waterfallData = useMemo(() => {
    if (data.length === 0) return [];

    let totalSales = 0;
    let totalProfit = 0;
    let totalDiscountVal = 0;

    data.forEach(r => {
      totalSales += r.sales;
      totalProfit += r.profit;
      const gross = r.discount === 1 ? r.sales : r.sales / (1 - r.discount);
      totalDiscountVal += (gross - r.sales);
    });

    const totalGross = totalSales + totalDiscountVal;
    const cogs = totalSales - totalProfit;

    return [
      { name: 'Gross Revenue', base: 0, value: totalGross, color: '#3b82f6' },
      { name: 'Discounts', base: totalSales, value: totalDiscountVal, color: '#f97316' },
      { name: 'Cost of Goods', base: totalProfit, value: cogs, color: '#ef4444' },
      { name: 'Net Profit', base: 0, value: totalProfit, color: '#10b981' }
    ];
  }, [data]);

  // 3. Overall Profit Margin for Gauge
  const overallMargin = useMemo(() => {
    if (data.length === 0) return 0;
    const totalSales = data.reduce((sum, r) => sum + r.sales, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
    return totalSales === 0 ? 0 : totalProfit / totalSales;
  }, [data]);

  // Dynamic Insights
  const profitInsights = useMemo(() => {
    if (data.length === 0) return [];
    
    const salesOverDiscount = data.filter(r => r.discount >= 0.25);
    const marginOverDiscount = salesOverDiscount.length === 0 ? 0 :
      salesOverDiscount.reduce((sum, r) => sum + r.profit, 0) / salesOverDiscount.reduce((sum, r) => sum + r.sales, 0);

    const normalSales = data.filter(r => r.discount < 0.25);
    const normalMargin = normalSales.length === 0 ? 0 :
      normalSales.reduce((sum, r) => sum + r.profit, 0) / normalSales.reduce((sum, r) => sum + r.sales, 0);

    const insights = [
      `High discounts above **25%** contract profit margins to **${(marginOverDiscount * 100).toFixed(1)}%**, compared to **${(normalMargin * 100).toFixed(1)}%** for lower discounts.`,
      `Gross revenue of **${formatCurrency(waterfallData[0]?.value || 0)}** cascades to **${formatCurrency(waterfallData[3]?.value || 0)}** net profit after discounting and cost deductions.`
    ];
    return insights;
  }, [data, waterfallData]);

  // SVG Gauge calculations
  const gaugeArcPath = "M 30,105 A 75,75 0 0,1 180,105";
  const arcLength = Math.PI * 75;
  const clampedMargin = Math.max(0, Math.min(overallMargin, 0.4));
  const dashOffset = arcLength - (clampedMargin / 0.4) * arcLength;
  const gaugeColor = overallMargin > 0.25 ? '#10b981' : overallMargin > 0.18 ? '#f59e0b' : '#ef4444';

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-slate-800 dark:text-white">Order Details</p>
          <p className="text-slate-500 dark:text-slate-400">Discount: <span className="font-bold text-slate-700 dark:text-slate-200">{dataPoint.discount}%</span></p>
          <p className="text-slate-500 dark:text-slate-400">Profit: <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatCurrency(dataPoint.profit)}</span></p>
          <p className="text-slate-500 dark:text-slate-400">Sales: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(dataPoint.sales)}</span></p>
          <p className="text-[10px] text-slate-400 mt-1">Bubble Size = Sales Volume</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Insights */}
      <InsightCard insights={profitInsights} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 1. Scatter Plot (2/3 Width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Percent className="w-5 h-5 text-orange-600 dark:text-orange-500" /> Discount vs Profit Sensitivity
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Scatter analysis showing how discount levels impact profit margins (with regression trendline)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('scatter')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[320px] w-full">
            {scatterAndRegression.scatterData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="discount" 
                    name="Discount" 
                    unit="%" 
                    domain={[10, 35]}
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10} 
                    tickLine={false}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="profit" 
                    name="Profit" 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="sales" 
                    range={[30, 250]} 
                  />
                  <Tooltip content={<CustomScatterTooltip />} />
                  
                  <Scatter 
                    name="Orders" 
                    data={scatterAndRegression.scatterData} 
                    fill="rgba(16, 185, 129, 0.45)" 
                  />
                  
                  <Line
                    name="Regression Line"
                    type="monotone"
                    data={scatterAndRegression.trendline}
                    dataKey="trendlineProfit"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* 2. Profit Margin Gauge (1/3 Width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" /> Margin Gauge Efficiency
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                Aggregated margin indicator scaled from 0% to 40%
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('gauge')}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-855 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[140px] pt-4">
            <div className="w-[180px] h-[110px] relative">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={gaugeArcPath}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className="dark:stroke-slate-800/80"
                />
                <motion.path
                  d={gaugeArcPath}
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={arcLength}
                  initial={{ strokeDashoffset: arcLength }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              
              <div className="absolute inset-x-0 bottom-4 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {formatPercent(overallMargin)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Profit Margin</span>
              </div>
            </div>

            <div className="w-full max-w-[170px] flex justify-between text-[9px] font-bold text-slate-400 mt-2 px-1">
              <span>0%</span>
              <span>20% (Target)</span>
              <span>40%+</span>
            </div>
          </div>
        </motion.div>

        {/* 3. Waterfall Chart (Full Width in column layout) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-3 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers3 className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Revenue Cascade Waterfall
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Financial flow showing the deductions from Gross Sales, through Discounts and COGS, to Net Profit
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('waterfall')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[280px] w-full">
            {waterfallData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 15, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Value']} />
                  <Bar dataKey="base" fill="transparent" stackId="stack" />
                  <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]} barSize={45}>
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
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
                    {fullscreenChart === 'scatter' && <><Percent className="w-5 h-5 text-orange-600" /> Discount vs Profit Sensitivity</>}
                    {fullscreenChart === 'gauge' && <><Activity className="w-5 h-5 text-emerald-500" /> Profit Margin Gauge</>}
                    {fullscreenChart === 'waterfall' && <><Layers3 className="w-5 h-5 text-blue-600" /> Revenue Cascade Waterfall</>}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Statistical analysis of gross sales distributions, discounting policies, and margins
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative">
                  {fullscreenChart === 'scatter' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                        <XAxis type="number" dataKey="discount" name="Discount" unit="%" domain={[10, 35]} stroke="rgba(148, 163, 184, 0.6)" fontSize={11} tickLine={false} />
                        <YAxis type="number" dataKey="profit" name="Profit" stroke="rgba(148, 163, 184, 0.6)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                        <ZAxis type="number" dataKey="sales" range={[40, 300]} />
                        <Tooltip content={<CustomScatterTooltip />} />
                        <Scatter name="Orders" data={scatterAndRegression.scatterData} fill="rgba(16, 185, 129, 0.5)" />
                        <Line name="Regression Line" type="monotone" data={scatterAndRegression.trendline} dataKey="trendlineProfit" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}

                  {fullscreenChart === 'gauge' && (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className="w-[300px] h-[190px] relative">
                        <svg className="w-full h-full overflow-visible">
                          <path d={gaugeArcPath} fill="none" stroke="#e2e8f0" strokeWidth="15" strokeLinecap="round" className="dark:stroke-slate-800/80" />
                          <path d={gaugeArcPath} fill="none" stroke={gaugeColor} strokeWidth="15" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={dashOffset} />
                        </svg>
                        
                        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center justify-center">
                          <span className="text-5xl font-black text-slate-900 dark:text-white leading-none">
                            {formatPercent(overallMargin)}
                          </span>
                          <span className="text-xs font-bold text-slate-400 uppercase mt-2">Aggregate Profit Margin</span>
                        </div>
                      </div>
                      <div className="w-full max-w-[280px] flex justify-between text-xs font-bold text-slate-400 mt-4 px-2">
                        <span>0% (Loss Bound)</span>
                        <span>20% (Target Margin)</span>
                        <span>40%+ (High Cap)</span>
                      </div>
                    </div>
                  )}

                  {fullscreenChart === 'waterfall' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                        <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.6)" fontSize={11} tickLine={false} />
                        <YAxis stroke="rgba(148, 163, 184, 0.6)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Value']} />
                        <Bar dataKey="base" fill="transparent" stackId="stack" />
                        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]} barSize={60}>
                          {waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
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
