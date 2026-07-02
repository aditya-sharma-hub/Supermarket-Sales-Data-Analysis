"use client";
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent } from '../lib/utils';
import { CalendarDays, Flame, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface SeasonalHeatmapProps {
  data: SalesRecord[];
}

export function SeasonalHeatmap({ data }: SeasonalHeatmapProps) {
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const [hoveredCell, setHoveredCell] = useState<{ monthIdx: number; region: string; value: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [fullscreenChart, setFullscreenChart] = useState<'heatmap' | 'quarterly' | null>(null);

  const regions = ['Central', 'East', 'North', 'South', 'West'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. Process Heatmap grid (12 months x 5 regions) memoized
  const heatmapGrid = useMemo(() => {
    const grid: Record<number, Record<string, number>> = {};
    for (let m = 0; m < 12; m++) {
      grid[m] = { Central: 0, East: 0, North: 0, South: 0, West: 0 };
    }

    data.forEach(r => {
      const d = new Date(r.date);
      const m = d.getMonth(); // 0-11
      const region = r.region;
      const val = metric === 'sales' ? r.sales : r.profit;
      if (grid[m] && grid[m][region] !== undefined) {
        grid[m][region] += val;
      }
    });

    let maxVal = 0;
    for (let m = 0; m < 12; m++) {
      regions.forEach(reg => {
        if (grid[m][reg] > maxVal) maxVal = grid[m][reg];
      });
    }

    return { grid, maxVal };
  }, [data, metric]);

  // 2. Process Quarterly Metrics memoized
  const quarterlyMetrics = useMemo(() => {
    const quarters = {
      Q1: { name: 'Q1 (Jan - Mar)', sales: 0, profit: 0 },
      Q2: { name: 'Q2 (Apr - Jun)', sales: 0, profit: 0 },
      Q3: { name: 'Q3 (Jul - Sep)', sales: 0, profit: 0 },
      Q4: { name: 'Q4 (Oct - Dec)', sales: 0, profit: 0 },
    };

    data.forEach(r => {
      const d = new Date(r.date);
      const month = d.getMonth();
      let qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
      if (month >= 3 && month <= 5) qKey = 'Q2';
      else if (month >= 6 && month <= 8) qKey = 'Q3';
      else if (month >= 9 && month <= 11) qKey = 'Q4';

      quarters[qKey].sales += r.sales;
      quarters[qKey].profit += r.profit;
    });

    const totalSales = Object.values(quarters).reduce((sum, q) => sum + q.sales, 0);

    return Object.entries(quarters).map(([key, q]) => ({
      key,
      name: q.name,
      sales: q.sales,
      profit: q.profit,
      margin: q.sales === 0 ? 0 : q.profit / q.sales,
      share: totalSales === 0 ? 0 : q.sales / totalSales,
    }));
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 12,
    });
  };

  // Generate dynamic insights
  const seasonalInsights = useMemo(() => {
    if (data.length === 0) return [];
    
    const sortedQuarters = [...quarterlyMetrics].sort((a, b) => b.sales - a.sales);
    const topQ = sortedQuarters[0];

    const monthlySum = months.map((mName, mIdx) => {
      const sum = regions.reduce((acc, r) => acc + (heatmapGrid.grid[mIdx]?.[r] || 0), 0);
      return { name: mName, val: sum };
    });
    const topMonth = monthlySum.sort((a, b) => b.val - a.val)[0];

    return [
      `Sales peak seasonally in **${topMonth.name}** across all regions, reflecting a strong grocery stocking pattern.`,
      `**${topQ.name}** represents the strongest period, generating **${formatPercent(topQ.share)}** of total annual transactions.`
    ];
  }, [data, quarterlyMetrics, heatmapGrid]);

  return (
    <div className="space-y-6">
      {/* Dynamic Seasonal Insights */}
      <InsightCard insights={seasonalInsights} />

      {/* Heatmap & Quarter Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Heatmap Card (2/3 Width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 relative flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-orange-650 dark:text-orange-500" /> Seasonality Heatmap
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Analysis of sales/profit distribution by Month and Region
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Metric Toggle */}
              <div className="flex bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 self-start">
                <button
                  onClick={() => setMetric('sales')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all
                    ${metric === 'sales'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }
                  `}
                >
                  Sales
                </button>
                <button
                  onClick={() => setMetric('profit')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all
                    ${metric === 'profit'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-450 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }
                  `}
                >
                  Profit
                </button>
              </div>

              {/* Maximize Button */}
              <button
                onClick={() => setFullscreenChart('heatmap')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div 
            className="overflow-x-auto w-full relative select-none pb-4"
            onMouseMove={handleMouseMove}
          >
            <div className="min-w-[500px] grid grid-cols-6 gap-1 text-center text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase">
              <div className="text-left font-bold py-1 lowercase">Month</div>
              {regions.map(r => (
                <div key={r} className="py-1">{r}</div>
              ))}

              {months.map((monthName, mIdx) => {
                const rowCells = heatmapGrid.grid[mIdx] || {};
                return (
                  <React.Fragment key={monthName}>
                    <div className="text-left font-bold flex items-center pr-2 py-2 text-[11px] text-slate-750 dark:text-slate-300 font-sans">
                      {monthName.substring(0, 3)}
                    </div>
                    {regions.map(region => {
                      const cellVal = rowCells[region] || 0;
                      const opacity = heatmapGrid.maxVal === 0 ? 0.05 : Math.max(0.04, cellVal / heatmapGrid.maxVal);
                      const isActive = hoveredCell?.monthIdx === mIdx && hoveredCell?.region === region;
                      const colorStyle = metric === 'sales'
                        ? `rgba(59, 130, 246, ${opacity})`
                        : `rgba(16, 185, 129, ${opacity})`;

                      return (
                        <div
                          key={region}
                          onMouseEnter={() => setHoveredCell({ monthIdx: mIdx, region, value: cellVal })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className="h-9 rounded-lg transition-all border border-transparent duration-150 relative cursor-crosshair flex items-center justify-center"
                          style={{ 
                            backgroundColor: colorStyle,
                            borderColor: isActive ? (metric === 'sales' ? '#3b82f6' : '#10b981') : 'transparent',
                            transform: isActive ? 'scale(1.05)' : 'none',
                            zIndex: isActive ? 10 : 1
                          }}
                        >
                          <span className={`text-[9px] font-bold ${opacity > 0.5 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            ₹{(cellVal / 1000).toFixed(0)}k
                          </span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

            <AnimatePresence>
              {hoveredCell && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg z-50 pointer-events-none text-xs space-y-1 w-44"
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                  <h4 className="font-bold text-slate-800 dark:text-white">
                    {months[hoveredCell.monthIdx]}, {hoveredCell.region}
                  </h4>
                  <div className="h-px bg-slate-105 dark:bg-slate-800 my-1" />
                  <p className="text-slate-500 dark:text-slate-400 capitalize">
                    {metric}: <span className={`font-bold ${metric === 'profit' ? 'text-emerald-600' : 'text-blue-600'}`}>{formatCurrency(hoveredCell.value)}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Quarterly Trend Summary (1/3 Width) */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between p-1.5 border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/10 rounded-2xl text-xs font-bold text-slate-450 uppercase tracking-widest gap-1.5">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-blue-600" /> Quarterly Breakdowns</span>
            <button
              onClick={() => setFullscreenChart('quarterly')}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-800/40 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {quarterlyMetrics.map((quarter) => (
            <motion.div
              key={quarter.key}
              whileHover={{ x: 4 }}
              className="p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-950/45 shadow-sm flex flex-col justify-between gap-1.5"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{quarter.name}</span>
                <span className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wide">
                  Share: {formatPercent(quarter.share)}
                </span>
              </div>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Sales Revenue</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(quarter.sales)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Margin</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">{formatPercent(quarter.margin)}</span>
                </div>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-blue-500 dark:bg-blue-600 rounded-full" 
                  style={{ width: `${quarter.share * 100}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

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
                    {fullscreenChart === 'heatmap' && <><Flame className="w-5 h-5 text-orange-600" /> Seasonality Heatmap</>}
                    {fullscreenChart === 'quarterly' && <><CalendarDays className="w-5 h-5 text-blue-650" /> Quarterly Breakdowns</>}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Temporal analysis of grocery retail performance across calendar quarters and months
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative overflow-y-auto">
                  {fullscreenChart === 'heatmap' ? (
                    <div className="grid grid-cols-6 gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-450 uppercase max-w-3xl mx-auto select-none pt-4">
                      <div className="text-left font-bold py-1 lowercase">Month</div>
                      {regions.map(r => (
                        <div key={r} className="py-1">{r}</div>
                      ))}

                      {months.map((monthName, mIdx) => {
                        const rowCells = heatmapGrid.grid[mIdx] || {};
                        return (
                          <React.Fragment key={monthName}>
                            <div className="text-left font-bold flex items-center pr-2 py-3 text-[12px] text-slate-750 dark:text-slate-350">
                              {monthName}
                            </div>
                            {regions.map(region => {
                              const cellVal = rowCells[region] || 0;
                              const opacity = heatmapGrid.maxVal === 0 ? 0.05 : Math.max(0.04, cellVal / heatmapGrid.maxVal);
                              const colorStyle = metric === 'sales'
                                ? `rgba(59, 130, 246, ${opacity})`
                                : `rgba(16, 185, 129, ${opacity})`;

                              return (
                                <div
                                  key={region}
                                  className="h-12 rounded-xl flex items-center justify-center border border-transparent hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-crosshair"
                                  style={{ backgroundColor: colorStyle }}
                                  title={`${monthName}, ${region} Region: ${formatCurrency(cellVal)}`}
                                >
                                  <span className={`text-[10px] font-black ${opacity > 0.5 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                    ₹{(cellVal / 1000).toFixed(0)}k
                                  </span>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-6">
                      {quarterlyMetrics.map((quarter) => (
                        <div
                          key={quarter.key}
                          className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 shadow-sm flex flex-col justify-between gap-3"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-850 dark:text-slate-250">{quarter.name}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Share: {formatPercent(quarter.share)}
                            </span>
                          </div>
                          <div className="h-px bg-slate-200 dark:bg-slate-800" />
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Sales Revenue</span>
                              <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(quarter.sales)}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Net Profit</span>
                              <span className="text-lg font-black text-emerald-600 dark:text-emerald-450">{formatCurrency(quarter.profit)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs font-semibold text-slate-500 mt-1">
                            <span>Contribution Limit</span>
                            <span>{formatPercent(quarter.margin)} Profit Margin</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 dark:bg-blue-600 rounded-full" style={{ width: `${quarter.share * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
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
