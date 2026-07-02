"use client";
import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  PieChart,
  Pie,
  Treemap
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';
import { ArrowUpDown, Layers, PieChart as PieIcon, TableProperties, LayoutGrid as TreeIcon, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface CategoryChartsProps {
  data: SalesRecord[];
  selectedCategories?: string[];
  onCategoryToggle?: (category: string) => void;
}

interface CategoryAggregation {
  name: string;
  sales: number;
  profit: number;
  margin: number;
  quantity: number;
  value: number; // for Recharts treemap requirement
  [key: string]: any; // index signature for Recharts compatibility
}

export function CategoryCharts({ data, selectedCategories = [], onCategoryToggle }: CategoryChartsProps) {
  const [sortField, setSortField] = useState<'sales' | 'profit' | 'margin' | 'quantity'>('sales');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [fullscreenChart, setFullscreenChart] = useState<'bar' | 'donut' | 'treemap' | 'table' | null>(null);

  // 1. Group dataset by Category memoized
  const categoryData = useMemo((): CategoryAggregation[] => {
    if (data.length === 0) return [];

    const agg: Record<string, { sales: number; profit: number; quantity: number }> = {};
    data.forEach(r => {
      if (!agg[r.category]) {
        agg[r.category] = { sales: 0, profit: 0, quantity: 0 };
      }
      agg[r.category].sales += r.sales;
      agg[r.category].profit += r.profit;
      agg[r.category].quantity += r.quantity;
    });

    return Object.entries(agg).map(([name, vals]) => ({
      name,
      sales: vals.sales,
      profit: vals.profit,
      margin: vals.sales === 0 ? 0 : vals.profit / vals.sales,
      quantity: vals.quantity,
      value: vals.sales, // Treemap size key
    }));
  }, [data]);

  // Dynamic Insights
  const sectionInsights = useMemo(() => {
    if (categoryData.length === 0) return [];

    const sortedByMargin = [...categoryData].sort((a, b) => b.margin - a.margin);
    const topMarginCat = sortedByMargin[0];

    const sortedBySales = [...categoryData].sort((a, b) => b.sales - a.sales);
    const topSalesCat = sortedBySales[0];

    const totalSales = categoryData.reduce((sum, c) => sum + c.sales, 0);
    const topSalesShare = totalSales === 0 ? 0 : (topSalesCat.sales / totalSales) * 100;

    return [
      `**${topSalesCat.name}** holds the largest market share contributing **${topSalesShare.toFixed(1)}%** of gross sales (**${formatCurrency(topSalesCat.sales)}**).`,
      `**${topMarginCat.name}** leads in efficiency with the highest profit margin of **${(topMarginCat.margin * 100).toFixed(1)}%**, returning **${formatCurrency(topMarginCat.profit)}** net profit.`
    ];
  }, [categoryData]);

  // Color mappings
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

  // Table Sort logic
  const handleSort = (field: 'sales' | 'profit' | 'margin' | 'quantity') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTableData = useMemo(() => {
    return [...categoryData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [categoryData, sortField, sortDirection]);

  // Helper to check if a category is highlighted
  const isCategorySelected = (name: string) => {
    return selectedCategories.includes(name);
  };

  const getOpacity = (name: string) => {
    if (selectedCategories.length === 0) return 1;
    return isCategorySelected(name) ? 1 : 0.35;
  };

  // Custom Treemap Box Renderer
  const CustomizedTreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, profit, margin } = props;
    if (depth !== 1 || width < 40 || height < 30) return null;

    let fillColor = '#64748b';
    if (margin > 0.26) {
      fillColor = 'rgba(16, 185, 129, 0.85)';
    } else if (margin > 0.23) {
      fillColor = 'rgba(59, 130, 246, 0.85)';
    } else if (margin > 0.20) {
      fillColor = 'rgba(245, 158, 11, 0.85)';
    } else {
      fillColor = 'rgba(239, 68, 68, 0.85)';
    }

    const opacity = getOpacity(name);

    return (
      <g 
        onClick={() => onCategoryToggle && onCategoryToggle(name)} 
        className="cursor-pointer"
        style={{ opacity }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fillColor,
            stroke: isCategorySelected(name) ? '#2563eb' : '#fff',
            strokeWidth: isCategorySelected(name) ? 3 : 1.5,
            strokeOpacity: 0.9,
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={width < 80 ? 9 : 11}
          fontWeight="bold"
          className="pointer-events-none select-none"
        >
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize={width < 80 ? 8 : 9}
          className="pointer-events-none select-none"
        >
          {formatPercent(margin)} Margin
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Business Insights */}
      <InsightCard insights={sectionInsights} />

      {/* 2x2 Grid of Category Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Horizontal Bar Chart Sales by Category */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Sales Volume by Category
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Gross sales comparison (click bars to cross-filter)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('bar')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[300px] w-full">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} width={110} tickLine={false} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                  <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={16}>
                    {categoryData.map((entry, index) => {
                      const isSel = isCategorySelected(entry.name);
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          opacity={getOpacity(entry.name)}
                          stroke={isSel ? '#1d4ed8' : 'transparent'}
                          strokeWidth={isSel ? 2 : 0}
                          className="cursor-pointer"
                          onClick={() => onCategoryToggle && onCategoryToggle(entry.name)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Chart 2: Donut Market Share */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <PieIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-500" /> Market Share Shareholder
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Sales contribution percentage (click slices to cross-filter)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('donut')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[300px] flex flex-col sm:flex-row items-center justify-center gap-6">
            {categoryData.length === 0 ? (
              <div className="text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <>
                <div className="w-[200px] h-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="sales"
                      >
                        {categoryData.map((entry, index) => {
                          const isSel = isCategorySelected(entry.name);
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              opacity={getOpacity(entry.name)}
                              stroke={isSel ? '#1d4ed8' : '#fff'}
                              strokeWidth={isSel ? 2 : 1}
                              className="cursor-pointer"
                              onClick={() => onCategoryToggle && onCategoryToggle(entry.name)}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 overflow-y-auto max-h-[250px] w-full text-xs">
                  {categoryData.map((item, idx) => {
                    const totalSales = categoryData.reduce((sum, c) => sum + c.sales, 0);
                    const pct = totalSales === 0 ? 0 : (item.sales / totalSales);
                    const isSel = isCategorySelected(item.name);
                    return (
                      <div 
                        key={item.name} 
                        onClick={() => onCategoryToggle && onCategoryToggle(item.name)}
                        className={`flex items-center gap-2 cursor-pointer p-1 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60
                          ${isSel ? 'bg-blue-50/40 dark:bg-blue-900/10 font-bold border-l-2 border-blue-500 pl-1.5' : ''}
                        `}
                        style={{ opacity: getOpacity(item.name) }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="truncate max-w-[100px] text-slate-650 dark:text-slate-350">{item.name}</span>
                        <span className="text-slate-800 dark:text-slate-100 ml-auto">{formatPercent(pct)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Chart 3: Treemap Size=Sales, Color=Profit Margin */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TreeIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> Category Margin Treemap
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Box Size = Sales Volume | Box Color = Profit Margin Efficiency (click boxes to cross-filter)
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> &gt;26%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> 23%-26%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> 20%-23%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> &lt;20%</span>
              </div>

              <button
                onClick={() => setFullscreenChart('treemap')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[320px] w-full">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={categoryData}
                  dataKey="sales"
                  stroke="#fff"
                  fill="#64748b"
                  content={<CustomizedTreemapContent />}
                />
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Table 4: Category Ranking Table */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TableProperties className="w-5 h-5 text-slate-655 dark:text-slate-400" /> Category Performance Leaderboard
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Sortable deep-dive metrics ranking departments (click rows to cross-filter)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('table')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto w-full border border-slate-100 dark:border-slate-900 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-xs">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left font-bold">Category</th>
                  <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('sales')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Sales <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('profit')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Profit <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('margin')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Profit Margin <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('quantity')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Quantity Sold <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-slate-100 dark:divide-slate-900">
                {sortedTableData.map((item) => {
                  const isSel = isCategorySelected(item.name);
                  return (
                    <tr 
                      key={item.name} 
                      onClick={() => onCategoryToggle && onCategoryToggle(item.name)}
                      className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors cursor-pointer
                        ${isSel ? 'bg-blue-50/30 dark:bg-blue-900/10 font-bold border-l-4 border-blue-500 pl-1.5' : ''}
                      `}
                      style={{ opacity: getOpacity(item.name) }}
                    >
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.sales)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{formatCurrency(item.profit)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-350">{formatPercent(item.margin)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400">{formatNumber(item.quantity)} units</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                    {fullscreenChart === 'bar' && <><Layers className="w-5 h-5 text-blue-600" /> Sales Volume by Category</>}
                    {fullscreenChart === 'donut' && <><PieIcon className="w-5 h-5 text-indigo-650" /> Market Share Shareholder</>}
                    {fullscreenChart === 'treemap' && <><TreeIcon className="w-5 h-5 text-emerald-600" /> Category Margin Treemap</>}
                    {fullscreenChart === 'table' && <><TableProperties className="w-5 h-5 text-slate-655" /> Category Performance Leaderboard</>}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Detailed department metrics (click interactive segments to cross-filter)
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative">
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data matches current filters</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {fullscreenChart === 'bar' && (
                        <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" horizontal={false} />
                          <XAxis type="number" stroke="rgba(148, 163, 184, 0.6)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" stroke="rgba(148, 163, 184, 0.6)" fontSize={11} width={120} tickLine={false} />
                          <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                          <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={20}>
                            {categoryData.map((entry, index) => {
                              const isSel = isCategorySelected(entry.name);
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                  opacity={getOpacity(entry.name)}
                                  stroke={isSel ? '#1d4ed8' : 'transparent'}
                                  strokeWidth={isSel ? 2 : 0}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    onCategoryToggle && onCategoryToggle(entry.name);
                                    setFullscreenChart(null);
                                  }}
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      )}

                      {fullscreenChart === 'donut' && (
                        <div className="flex flex-col md:flex-row items-center justify-center gap-10 h-full w-full">
                          <div className="w-[280px] h-[280px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={categoryData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={80}
                                  outerRadius={115}
                                  paddingAngle={3}
                                  dataKey="sales"
                                >
                                  {categoryData.map((entry, index) => {
                                    const isSel = isCategorySelected(entry.name);
                                    return (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                        opacity={getOpacity(entry.name)}
                                        stroke={isSel ? '#1d4ed8' : '#fff'}
                                        strokeWidth={isSel ? 3 : 1.5}
                                        className="cursor-pointer"
                                        onClick={() => {
                                          onCategoryToggle && onCategoryToggle(entry.name);
                                          setFullscreenChart(null);
                                        }}
                                      />
                                    );
                                  })}
                                </Pie>
                                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 md:flex md:flex-col gap-3 overflow-y-auto max-h-[300px] w-full text-sm">
                            {categoryData.map((item, idx) => {
                              const totalSales = categoryData.reduce((sum, c) => sum + c.sales, 0);
                              const pct = totalSales === 0 ? 0 : (item.sales / totalSales);
                              const isSel = isCategorySelected(item.name);
                              return (
                                <div 
                                  key={item.name} 
                                  onClick={() => {
                                    onCategoryToggle && onCategoryToggle(item.name);
                                    setFullscreenChart(null);
                                  }}
                                  className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60
                                    ${isSel ? 'bg-blue-50/40 dark:bg-blue-900/10 font-bold border-l-2 border-blue-500 pl-2' : ''}
                                  `}
                                  style={{ opacity: getOpacity(item.name) }}
                                >
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                  <span className="truncate max-w-[150px] text-slate-650 dark:text-slate-350">{item.name}</span>
                                  <span className="text-slate-800 dark:text-slate-100 ml-auto">{formatPercent(pct)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {fullscreenChart === 'treemap' && (
                        <Treemap
                          data={categoryData}
                          dataKey="sales"
                          stroke="#fff"
                          fill="#64748b"
                          content={<CustomizedTreemapContent />}
                        />
                      )}

                      {fullscreenChart === 'table' && (
                        <div className="overflow-auto max-h-[50vh] border border-slate-100 dark:border-slate-900 rounded-xl w-full">
                          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                            <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider sticky top-0 backdrop-blur-md">
                              <tr>
                                <th scope="col" className="px-6 py-3.5 text-left font-bold">Category</th>
                                <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('sales')}>
                                  <span className="flex items-center justify-end gap-1.5">Sales <ArrowUpDown className="w-3 h-3" /></span>
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('profit')}>
                                  <span className="flex items-center justify-end gap-1.5">Profit <ArrowUpDown className="w-3 h-3" /></span>
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('margin')}>
                                  <span className="flex items-center justify-end gap-1.5">Profit Margin <ArrowUpDown className="w-3 h-3" /></span>
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('quantity')}>
                                  <span className="flex items-center justify-end gap-1.5">Quantity Sold <ArrowUpDown className="w-3 h-3" /></span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-slate-100 dark:divide-slate-900">
                              {sortedTableData.map((item) => {
                                const isSel = isCategorySelected(item.name);
                                return (
                                  <tr 
                                    key={item.name} 
                                    onClick={() => {
                                      onCategoryToggle && onCategoryToggle(item.name);
                                      setFullscreenChart(null);
                                    }}
                                    className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors cursor-pointer
                                      ${isSel ? 'bg-blue-50/30 dark:bg-blue-900/10 font-bold border-l-4 border-blue-500 pl-1.5' : ''}
                                    `}
                                    style={{ opacity: getOpacity(item.name) }}
                                  >
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.sales)}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500'}`}>{formatCurrency(item.profit)}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-350">{formatPercent(item.margin)}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400">{formatNumber(item.quantity)} units</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
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
