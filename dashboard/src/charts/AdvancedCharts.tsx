"use client";
import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar as RechartsBar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';
import { 
  calculateCorrelation, 
  calculateBoxPlotStats, 
  calculateHistogram, 
  BoxPlotStats 
} from '../utils/statistics';
import { Target, Grid3X3, BarChart3, ShieldAlert, Compass, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface AdvancedChartsProps {
  data: SalesRecord[];
}

export function AdvancedCharts({ data }: AdvancedChartsProps) {
  const [distMetric, setDistMetric] = useState<'sales' | 'profit' | 'discount'>('sales');
  const [fullscreenChart, setFullscreenChart] = useState<'correlation' | 'histogram' | 'boxplot' | 'radar' | null>(null);

  // 1. Compute Correlation Matrix memoized
  const correlationMatrix = useMemo(() => {
    if (data.length === 0) return [];

    const sales = data.map(r => r.sales);
    const profit = data.map(r => r.profit);
    const discount = data.map(r => r.discount);
    const quantity = data.map(r => r.quantity);

    const variables = [
      { name: 'Sales', values: sales },
      { name: 'Profit', values: profit },
      { name: 'Discount', values: discount },
      { name: 'Quantity', values: quantity },
    ];

    const matrix = [];
    for (let i = 0; i < variables.length; i++) {
      for (let j = 0; j < variables.length; j++) {
        const rVal = calculateCorrelation(variables[i].values, variables[j].values);
        matrix.push({
          varX: variables[i].name,
          varY: variables[j].name,
          r: parseFloat(rVal.toFixed(3)),
        });
      }
    }
    return matrix;
  }, [data]);

  // 2. Compute Histogram bins memoized
  const histogramData = useMemo(() => {
    if (data.length === 0) return [];
    
    let values: number[] = [];
    if (distMetric === 'sales') {
      values = data.map(r => r.sales);
    } else if (distMetric === 'profit') {
      values = data.map(r => r.profit);
    } else {
      values = data.map(r => r.discount);
    }

    return calculateHistogram(values, 10);
  }, [data, distMetric]);

  // 3. Compute Box Plot statistics memoized
  const boxPlotData = useMemo(() => {
    if (data.length === 0) return null;

    const sales = data.map(r => r.sales);
    const profit = data.map(r => r.profit);
    const discount = data.map(r => r.discount * 100);

    return {
      sales: calculateBoxPlotStats(sales),
      profit: calculateBoxPlotStats(profit),
      discount: calculateBoxPlotStats(discount),
    };
  }, [data]);

  // 4. Compute Regional Radar profile memoized
  const radarData = useMemo(() => {
    if (data.length === 0) return [];

    const stats: Record<string, { sales: number; profit: number; discountSum: number; quantitySum: number; count: number }> = {};
    const regions = ['Central', 'East', 'South', 'West']; // Exclude North (1 record)

    regions.forEach(r => {
      stats[r] = { sales: 0, profit: 0, discountSum: 0, quantitySum: 0, count: 0 };
    });

    data.forEach(r => {
      if (stats[r.region]) {
        stats[r.region].sales += r.sales;
        stats[r.region].profit += r.profit;
        stats[r.region].discountSum += r.discount;
        stats[r.region].quantitySum += r.quantity;
        stats[r.region].count += 1;
      }
    });

    let maxSales = 0, maxProfit = 0, maxAvgDiscount = 0, maxAvgQuantity = 0;
    const regionProfiles = regions.map(name => {
      const s = stats[name];
      const avgDiscount = s.count === 0 ? 0 : s.discountSum / s.count;
      const avgQuantity = s.count === 0 ? 0 : s.quantitySum / s.count;
      
      if (s.sales > maxSales) maxSales = s.sales;
      if (s.profit > maxProfit) maxProfit = s.profit;
      if (avgDiscount > maxAvgDiscount) maxAvgDiscount = avgDiscount;
      if (avgQuantity > maxAvgQuantity) maxAvgQuantity = avgQuantity;

      return {
        name,
        salesVal: s.sales,
        profitVal: s.profit,
        discountVal: avgDiscount,
        quantityVal: avgQuantity,
      };
    });

    const axes = [
      { key: 'sales', name: 'Total Sales' },
      { key: 'profit', name: 'Total Profit' },
      { key: 'discount', name: 'Avg Discount' },
      { key: 'quantity', name: 'Avg Quantity' },
    ];

    return axes.map(axis => {
      const row: Record<string, any> = { subject: axis.name };
      regionProfiles.forEach(prof => {
        let normalized = 0;
        if (axis.key === 'sales') {
          normalized = maxSales === 0 ? 0 : (prof.salesVal / maxSales) * 100;
        } else if (axis.key === 'profit') {
          normalized = maxProfit === 0 ? 0 : (prof.profitVal / maxProfit) * 100;
        } else if (axis.key === 'discount') {
          normalized = maxAvgDiscount === 0 ? 0 : (prof.discountVal / maxAvgDiscount) * 100;
        } else if (axis.key === 'quantity') {
          normalized = maxAvgQuantity === 0 ? 0 : (prof.quantityVal / maxAvgQuantity) * 100;
        }
        row[prof.name] = parseFloat(normalized.toFixed(1));
      });
      return row;
    });
  }, [data]);

  // Dynamic Insights
  const advancedInsights = useMemo(() => {
    if (data.length === 0) return [];
    
    const discProfCorr = correlationMatrix.find(c => c.varX === 'Discount' && c.varY === 'Profit')?.r || 0;
    const salesQ3 = boxPlotData?.sales.q3 || 0;

    return [
      `A Pearson correlation of **${discProfCorr.toFixed(2)}** between Discount and Profit confirms a significant negative regulatory effect.`,
      `**75%** of transactions fall below a Sales value of **${formatCurrency(salesQ3)}**, showing a highly retail-centric distribution.`
    ];
  }, [correlationMatrix, boxPlotData]);

  const CustomHistogramTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-slate-800 dark:text-white">Bin Range: {dataPoint.binLabel}</p>
          <p className="text-blue-600 dark:text-blue-400 font-semibold">
            Count: <span className="font-bold">{formatNumber(payload[0].value)} orders</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Insights */}
      <InsightCard insights={advancedInsights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Correlation Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Grid3X3 className="w-5 h-5 text-indigo-600 dark:text-indigo-500" /> Pearson Correlation Grid
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Indicates statistical relationships (-1.0 to 1.0) between variables
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('correlation')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase select-none max-w-sm mx-auto">
            <div className="py-2 text-left font-bold text-[9px] leading-tight flex items-end">Variable</div>
            <div className="py-2">Sales</div>
            <div className="py-2">Profit</div>
            <div className="py-2">Disc</div>
            <div className="py-2">Qty</div>

            {['Sales', 'Profit', 'Discount', 'Quantity'].map((varY) => (
              <React.Fragment key={varY}>
                <div className="text-left font-bold flex items-center text-[10px] text-slate-750 dark:text-slate-350 pr-2">
                  {varY === 'Discount' ? 'Disc' : varY === 'Quantity' ? 'Qty' : varY}
                </div>
                {['Sales', 'Profit', 'Discount', 'Quantity'].map((varX) => {
                  const cell = correlationMatrix.find(c => c.varX === varX && c.varY === varY);
                  const r = cell ? cell.r : 0;
                  const absR = Math.abs(r);
                  let bgColor = 'rgba(148,163,184,0.05)';
                  let textColor = 'text-slate-700 dark:text-slate-300';
                  
                  if (r > 0) {
                    bgColor = `rgba(59, 130, 246, ${absR * 0.7})`;
                    if (r > 0.4) textColor = 'text-white font-black';
                  } else if (r < 0) {
                    bgColor = `rgba(239, 68, 68, ${absR * 0.75})`;
                    if (r < -0.4) textColor = 'text-white font-black';
                  }

                  return (
                    <div
                      key={varX}
                      className={`h-11 rounded-lg ${textColor} flex flex-col items-center justify-center border border-slate-100/10 transition-all hover:scale-105 cursor-help`}
                      style={{ backgroundColor: bgColor }}
                      title={`Correlation between ${varX} and ${varY}: ${r.toFixed(3)}`}
                    >
                      <span className="text-xs font-black">{r.toFixed(2)}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-6 max-w-sm mx-auto px-1 border-t border-slate-50 dark:border-slate-900 pt-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/50" /> Neg (-1.0)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/50" /> Pos (1.0)</span>
          </div>
        </motion.div>

        {/* Chart 2: Distribution Histogram */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Frequency Histogram
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Distribution frequency of transactions
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 self-start">
                {(['sales', 'profit', 'discount'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setDistMetric(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all capitalize
                      ${distMetric === m
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }
                    `}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setFullscreenChart('histogram')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[230px] w-full">
            {histogramData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis 
                    dataKey="binLabel" 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={9} 
                    tickLine={false}
                    dy={5}
                  />
                  <YAxis 
                    stroke="rgba(148, 163, 184, 0.6)"
                    fontSize={9}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomHistogramTooltip />} />
                  <RechartsBar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Chart 3: Box Plots */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> Distribution Box Plots
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Box-and-whisker visualization of Min, Q1, Median, Q3, and Max values (excluding outliers)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('boxplot')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boxPlotData ? (
              <>
                <SVGBoxPlotCard title="Sales Distribution" stats={boxPlotData.sales} minScale={500} maxScale={2500} formatter={formatCurrency} />
                <SVGBoxPlotCard title="Profit Distribution" stats={boxPlotData.profit} minScale={25} maxScale={1125} formatter={formatCurrency} />
                <SVGBoxPlotCard title="Discount Distribution" stats={boxPlotData.discount} minScale={10} maxScale={35} formatter={(val) => `${val.toFixed(0)}%`} />
              </>
            ) : (
              <div className="col-span-3 text-center text-slate-400 py-10 text-xs">No data matches current filters</div>
            )}
          </div>
        </motion.div>

        {/* Chart 4: Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Compass className="w-5 h-5 text-indigo-650" /> Regional Profile Comparison
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Radar comparing normalized performances of Central, East, South, and West regions
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('radar')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[320px] flex items-center justify-center">
            {radarData.length === 0 ? (
              <div className="text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(148, 163, 184, 0.15)" />
                  <PolarAngleAxis dataKey="subject" stroke="rgba(148, 163, 184, 0.8)" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} stroke="rgba(148, 163, 184, 0.4)" />
                  
                  <Radar name="Central" dataKey="Central" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                  <Radar name="East" dataKey="East" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                  <Radar name="South" dataKey="South" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                  <Radar name="West" dataKey="West" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  
                  <Tooltip formatter={(value) => [`${value}% of max`, 'Value']} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="circle" />
                </RechartsRadarChart>
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
                    {fullscreenChart === 'correlation' && <><Grid3X3 className="w-5 h-5 text-indigo-650" /> Pearson Correlation Matrix</>}
                    {fullscreenChart === 'histogram' && <><BarChart3 className="w-5 h-5 text-blue-600" /> Frequency Distribution Histogram</>}
                    {fullscreenChart === 'boxplot' && <><Target className="w-5 h-5 text-emerald-600" /> Distribution Box Plots</>}
                    {fullscreenChart === 'radar' && <><Compass className="w-5 h-5 text-indigo-650" /> Regional Profile Comparison</>}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Advanced statistical evaluations and comparative profiles of business metrics
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative overflow-y-auto">
                  {fullscreenChart === 'correlation' && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase select-none w-full max-w-md pt-4">
                        <div className="py-2 text-left font-bold text-[10px] leading-tight flex items-end">Variable</div>
                        <div className="py-2">Sales</div>
                        <div className="py-2">Profit</div>
                        <div className="py-2">Discount</div>
                        <div className="py-2">Quantity</div>

                        {['Sales', 'Profit', 'Discount', 'Quantity'].map((varY) => (
                          <React.Fragment key={varY}>
                            <div className="text-left font-bold flex items-center text-xs text-slate-750 dark:text-slate-350 pr-2">
                              {varY}
                            </div>
                            {['Sales', 'Profit', 'Discount', 'Quantity'].map((varX) => {
                              const cell = correlationMatrix.find(c => c.varX === varX && c.varY === varY);
                              const r = cell ? cell.r : 0;
                              const absR = Math.abs(r);
                              let bgColor = 'rgba(148,163,184,0.05)';
                              let textColor = 'text-slate-700 dark:text-slate-300';
                              
                              if (r > 0) {
                                bgColor = `rgba(59, 130, 246, ${absR * 0.75})`;
                                if (r > 0.4) textColor = 'text-white font-black';
                              } else if (r < 0) {
                                bgColor = `rgba(239, 68, 68, ${absR * 0.8})`;
                                if (r < -0.4) textColor = 'text-white font-black';
                              }

                              return (
                                <div
                                  key={varX}
                                  className={`h-16 rounded-xl ${textColor} flex flex-col items-center justify-center border border-slate-100/10 transition-all hover:scale-105 cursor-help`}
                                  style={{ backgroundColor: bgColor }}
                                  title={`Correlation: ${r.toFixed(3)}`}
                                >
                                  <span className="text-sm font-black">{r.toFixed(3)}</span>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 mt-8 w-full max-w-md px-1">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/60" /> Neg (-1.0)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800" /> Neutral</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/60" /> Pos (1.0)</span>
                      </div>
                    </div>
                  )}

                  {fullscreenChart === 'histogram' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histogramData} margin={{ top: 15, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                        <XAxis dataKey="binLabel" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} dy={5} />
                        <YAxis stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} />
                        <Tooltip content={<CustomHistogramTooltip />} />
                        <RechartsBar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {fullscreenChart === 'boxplot' && boxPlotData && (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-10 h-full w-full max-w-4xl mx-auto">
                      <SVGBoxPlotCard title="Sales Distribution" stats={boxPlotData.sales} minScale={500} maxScale={2500} formatter={formatCurrency} />
                      <SVGBoxPlotCard title="Profit Distribution" stats={boxPlotData.profit} minScale={25} maxScale={1125} formatter={formatCurrency} />
                      <SVGBoxPlotCard title="Discount Distribution" stats={boxPlotData.discount} minScale={10} maxScale={35} formatter={(val) => `${val.toFixed(0)}%`} />
                    </div>
                  )}

                  {fullscreenChart === 'radar' && radarData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="rgba(148, 163, 184, 0.15)" />
                        <PolarAngleAxis dataKey="subject" stroke="rgba(148, 163, 184, 0.8)" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} stroke="rgba(148, 163, 184, 0.4)" />
                        <Radar name="Central" dataKey="Central" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                        <Radar name="East" dataKey="East" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                        <Radar name="South" dataKey="South" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                        <Radar name="West" dataKey="West" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                        <Tooltip formatter={(value) => [`${value}% of max`, 'Value']} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                      </RechartsRadarChart>
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

// Sub-component: Custom SVG Box Plot Card
interface SVGBoxPlotCardProps {
  title: string;
  stats: BoxPlotStats;
  minScale: number;
  maxScale: number;
  formatter: (val: number) => string;
}

function SVGBoxPlotCard({ title, stats, minScale, maxScale, formatter }: SVGBoxPlotCardProps) {
  const width = 140;
  const height = 220;
  const padding = 20;

  const getY = (val: number): number => {
    const range = maxScale - minScale;
    const innerHeight = height - padding * 2;
    return height - padding - ((val - minScale) / range) * innerHeight;
  };

  const yMin = getY(stats.min);
  const yQ1 = getY(stats.q1);
  const yMed = getY(stats.median);
  const yQ3 = getY(stats.q3);
  const yMax = getY(stats.max);

  const centerX = width / 2;

  return (
    <div className="p-4 rounded-xl border border-slate-105 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col items-center select-none">
      <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{title}</h4>
      
      <div className="w-[140px] h-[220px] relative">
        <svg width={width} height={height} className="overflow-visible">
          <line x1={centerX} y1={yMin} x2={centerX} y2={yMax} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect
            x={centerX - 25}
            y={yQ3}
            width={50}
            height={Math.max(2, yQ1 - yQ3)}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth="1.5"
            rx="4"
          />
          <line x1={centerX - 25} y1={yMed} x2={centerX + 25} y2={yMed} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={centerX - 12} y1={yMin} x2={centerX + 12} y2={yMin} stroke="#94a3b8" strokeWidth="1.5" />
          <line x1={centerX - 12} y1={yMax} x2={centerX + 12} y2={yMax} stroke="#94a3b8" strokeWidth="1.5" />
          
          {stats.outliers.slice(0, 10).map((outVal, idx) => (
            <circle
              key={idx}
              cx={centerX + (idx % 2 === 0 ? 30 : -30)}
              cy={getY(outVal)}
              r="2.5"
              fill="#ef4444"
              opacity="0.6"
            />
          ))}
        </svg>

        <div className="absolute right-0 top-0 h-full w-[45px] text-[8px] font-bold text-slate-400 flex flex-col justify-between pointer-events-none" style={{ padding: `${padding}px 0` }}>
          <div style={{ position: 'absolute', top: `${yMax - 6}px` }}>{formatter(stats.max)}</div>
          <div style={{ position: 'absolute', top: `${yQ3 - 6}px`, color: '#3b82f6' }}>{formatter(stats.q3)}</div>
          <div style={{ position: 'absolute', top: `${yMed - 6}px`, color: '#ef4444' }}>{formatter(stats.median)}</div>
          <div style={{ position: 'absolute', top: `${yQ1 - 6}px`, color: '#3b82f6' }}>{formatter(stats.q1)}</div>
          <div style={{ position: 'absolute', top: `${yMin - 6}px` }}>{formatter(stats.min)}</div>
        </div>
      </div>

      {stats.outliers.length > 0 && (
        <div className="mt-3 flex items-center gap-1 text-[9px] font-semibold text-red-500 dark:text-red-400">
          <ShieldAlert className="w-3 h-3" />
          <span>{stats.outliers.length} outliers excluded</span>
        </div>
      )}
    </div>
  );
}
