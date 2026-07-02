"use client";
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent } from '../lib/utils';
import { Map, Building, Award, Maximize2, Minimize2 } from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface TamilNaduMapProps {
  data: SalesRecord[];
  selectedRegions: string[];
  onRegionToggle: (region: string) => void;
  selectedCities?: string[];
  onCityToggle?: (city: string) => void;
}

export function TamilNaduMap({ 
  data, 
  selectedRegions, 
  onRegionToggle, 
  selectedCities = [], 
  onCityToggle 
}: TamilNaduMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [fullscreenChart, setFullscreenChart] = useState<'map' | 'cities' | null>(null);

  // 1. Aggregate Region Metrics memoized
  const regionStats = useMemo(() => {
    const stats: Record<string, { sales: number; profit: number; orders: number }> = {
      Central: { sales: 0, profit: 0, orders: 0 },
      East: { sales: 0, profit: 0, orders: 0 },
      North: { sales: 0, profit: 0, orders: 0 },
      South: { sales: 0, profit: 0, orders: 0 },
      West: { sales: 0, profit: 0, orders: 0 },
    };

    data.forEach(r => {
      if (stats[r.region]) {
        stats[r.region].sales += r.sales;
        stats[r.region].profit += r.profit;
        stats[r.region].orders += 1;
      }
    });

    const totalSales = Object.values(stats).reduce((sum, s) => sum + s.sales, 0);

    return Object.entries(stats).map(([name, vals]) => ({
      name,
      sales: vals.sales,
      profit: vals.profit,
      margin: vals.sales === 0 ? 0 : vals.profit / vals.sales,
      orders: vals.orders,
      share: totalSales === 0 ? 0 : vals.sales / totalSales,
    }));
  }, [data]);

  // Regional Insights calculation
  const sectionInsights = useMemo(() => {
    if (regionStats.length === 0) return [];
    
    const activeStats = regionStats.filter(r => r.sales > 0);
    if (activeStats.length === 0) return [];

    const sortedBySales = [...activeStats].sort((a, b) => b.sales - a.sales);
    const topSalesRegion = sortedBySales[0];

    const sortedByMargin = [...activeStats].sort((a, b) => b.margin - a.margin);
    const topMarginRegion = sortedByMargin[0];

    return [
      `The **${topSalesRegion.name} Region** leads in transaction volume, contributing **${formatPercent(topSalesRegion.share)}** of state sales (**${formatCurrency(topSalesRegion.sales)}**).`,
      `The **${topMarginRegion.name} Region** exhibits the highest profitability margin of **${formatPercent(topMarginRegion.margin)}** in this sales window.`
    ];
  }, [regionStats]);

  // 2. Aggregate Top Cities memoized (Top 7)
  const cityStats = useMemo(() => {
    const stats: Record<string, { sales: number; profit: number }> = {};
    data.forEach(r => {
      if (!stats[r.city]) stats[r.city] = { sales: 0, profit: 0 };
      stats[r.city].sales += r.sales;
      stats[r.city].profit += r.profit;
    });

    return Object.entries(stats)
      .map(([name, vals]) => ({
        name,
        sales: vals.sales,
        profit: vals.profit,
        margin: vals.sales === 0 ? 0 : vals.profit / vals.sales,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 7);
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 15,
    });
  };

  // SVGs Region Coordinates (puzzle-like stylized map matching Region names)
  // Designed in a 200x200 viewBox representing Tamil Nadu, India
  const regionsMapSVG = [
    {
      name: 'North',
      d: 'M 130,20 L 175,20 L 175,60 L 125,55 Z',
      color: '#f43f5e',
    },
    {
      name: 'West',
      d: 'M 35,45 L 90,45 L 85,100 L 25,95 Z',
      color: '#3b82f6',
    },
    {
      name: 'Central',
      d: 'M 90,45 L 125,55 L 120,110 L 85,100 Z',
      color: '#10b981',
    },
    {
      name: 'East',
      d: 'M 125,55 L 175,60 L 155,120 L 120,110 Z',
      color: '#8b5cf6',
    },
    {
      name: 'South',
      d: 'M 25,95 L 85,100 L 120,110 L 155,120 L 95,190 L 45,150 Z',
      color: '#f59e0b',
    },
  ];

  const activeStats = useMemo(() => {
    return regionStats.reduce((acc, stat) => {
      acc[stat.name] = stat;
      return acc;
    }, {} as Record<string, typeof regionStats[0]>);
  }, [regionStats]);

  const getCityOpacity = (name: string) => {
    if (selectedCities.length === 0) return 1;
    return selectedCities.includes(name) ? 1 : 0.35;
  };

  const isCitySelected = (name: string) => {
    return selectedCities.includes(name);
  };

  return (
    <div className="space-y-6">
      {/* Regional Insights */}
      <InsightCard insights={sectionInsights} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Map Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm relative lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Map className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Interactive Region Map
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Hover to analyze, click regions to filter (Schematic of Tamil Nadu, India)
              </span>
            </div>

            <button
              onClick={() => setFullscreenChart('map')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 min-h-[300px] relative">
            
            {/* SVG Map Container */}
            <div 
              className="w-full max-w-[240px] aspect-square relative cursor-pointer"
              onMouseMove={handleMouseMove}
            >
              <svg 
                viewBox="0 0 200 200" 
                className="w-full h-full overflow-visible drop-shadow-md select-none"
              >
                {regionsMapSVG.map(reg => {
                  const isSelected = selectedRegions.includes(reg.name);
                  const isHovered = hoveredRegion === reg.name;
                  
                  let opacity = 0.55;
                  if (selectedRegions.length === 0) {
                    opacity = isHovered ? 0.9 : 0.65;
                  } else {
                    opacity = isSelected ? (isHovered ? 0.95 : 0.8) : (isHovered ? 0.5 : 0.25);
                  }

                  return (
                    <path
                      key={reg.name}
                      d={reg.d}
                      fill={reg.color}
                      opacity={opacity}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all duration-200"
                      onMouseEnter={() => setHoveredRegion(reg.name)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => onRegionToggle(reg.name)}
                    />
                  );
                })}
              </svg>

              {/* Custom Interactive Tooltip */}
              <AnimatePresence>
                {hoveredRegion && activeStats[hoveredRegion] && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg z-50 pointer-events-none text-xs space-y-1 w-44"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                  >
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: regionsMapSVG.find(r => r.name === hoveredRegion)?.color }} />
                      {hoveredRegion} Region
                    </h4>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                    <p className="text-slate-500 dark:text-slate-400">Sales: <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(activeStats[hoveredRegion].sales)}</span></p>
                    <p className="text-slate-500 dark:text-slate-400">Profit: <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(activeStats[hoveredRegion].profit)}</span></p>
                    <p className="text-slate-500 dark:text-slate-400">Margin: <span className="font-bold text-slate-700 dark:text-slate-200">{formatPercent(activeStats[hoveredRegion].margin)}</span></p>
                    <span className="block text-[8px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider mt-1">Click to filter</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Region list legend card */}
            <div className="w-full md:w-56 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Region Leaderboard</h4>
              <div className="space-y-2">
                {regionStats
                  .sort((a, b) => b.sales - a.sales)
                  .map((item, idx) => {
                    const svgColor = regionsMapSVG.find(r => r.name === item.name)?.color || '#64748b';
                    const isSelected = selectedRegions.includes(item.name);
                    return (
                      <div
                        key={item.name}
                        onClick={() => onRegionToggle(item.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50/20 text-blue-800 dark:text-blue-300 dark:border-blue-800/60 font-bold'
                            : 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-800'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: svgColor }} />
                          <span className="text-xs font-bold text-slate-750 dark:text-slate-200">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{formatPercent(item.share)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        </motion.div>

        {/* State Leaderboard & Top Cities */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* State Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Exclusive Territory</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Tamil Nadu, India
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-900 my-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All 9,994 retail transactions are concentrated within Tamil Nadu. The market is highly active with 24 cities reporting continuous sales.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-900">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Coverage</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">100% State</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-900">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Active Cities</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">24 Cities</span>
              </div>
            </div>
          </motion.div>

          {/* Top Cities Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-550" /> Top Cities by Sales
              </h3>

              <button
                onClick={() => setFullscreenChart('cities')}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="h-[180px] w-full">
              {cityStats.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityStats} layout="vertical" margin={{ top: 0, right: 10, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(148, 163, 184, 0.4)" fontSize={9} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="rgba(148, 163, 184, 0.6)" fontSize={9} width={75} tickLine={false} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                    <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={10}>
                      {cityStats.map((entry, index) => {
                        const isSel = isCitySelected(entry.name);
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isSel ? '#1d4ed8' : '#3b82f6'} 
                            opacity={getCityOpacity(entry.name)}
                            stroke={isSel ? '#1d4ed8' : 'transparent'}
                            strokeWidth={isSel ? 1.5 : 0}
                            className="cursor-pointer"
                            onClick={() => onCityToggle && onCityToggle(entry.name)}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

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
                    {fullscreenChart === 'map' && <><Map className="w-5 h-5 text-blue-600" /> Regional Performance Map</>}
                    {fullscreenChart === 'cities' && <><Building className="w-5 h-5 text-indigo-650" /> Top Cities by Sales</>}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Detailed geographical and metropolitan distribution (click items to cross-filter)
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative">
                  {fullscreenChart === 'map' ? (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 h-full w-full">
                      <div className="w-full max-w-[320px] aspect-square relative cursor-pointer" onMouseMove={handleMouseMove}>
                        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible drop-shadow-md select-none">
                          {regionsMapSVG.map(reg => {
                            const isSelected = selectedRegions.includes(reg.name);
                            const isHovered = hoveredRegion === reg.name;
                            
                            let opacity = 0.55;
                            if (selectedRegions.length === 0) {
                              opacity = isHovered ? 0.9 : 0.65;
                            } else {
                              opacity = isSelected ? (isHovered ? 0.95 : 0.8) : (isHovered ? 0.5 : 0.25);
                            }

                            return (
                              <path
                                key={reg.name}
                                d={reg.d}
                                fill={reg.color}
                                opacity={opacity}
                                stroke="#ffffff"
                                strokeWidth={isSelected ? 2 : 1}
                                className="transition-all duration-200"
                                onMouseEnter={() => setHoveredRegion(reg.name)}
                                onMouseLeave={() => setHoveredRegion(null)}
                                onClick={() => {
                                  onRegionToggle(reg.name);
                                  setFullscreenChart(null);
                                }}
                              />
                            );
                          })}
                        </svg>
                      </div>
                      <div className="w-full md:w-80 space-y-3 max-h-[320px] overflow-y-auto">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Region Leaderboard</h4>
                        <div className="space-y-2">
                          {regionStats
                            .sort((a, b) => b.sales - a.sales)
                            .map((item) => {
                              const svgColor = regionsMapSVG.find(r => r.name === item.name)?.color || '#64748b';
                              const isSelected = selectedRegions.includes(item.name);
                              return (
                                <div
                                  key={item.name}
                                  onClick={() => {
                                    onRegionToggle(item.name);
                                    setFullscreenChart(null);
                                  }}
                                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200
                                    ${isSelected
                                      ? 'border-blue-500 bg-blue-50/20 text-blue-800 dark:text-blue-300 dark:border-blue-800/60 font-bold'
                                      : 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-800'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: svgColor }} />
                                    <span className="text-xs font-bold text-slate-750 dark:text-slate-200">{item.name}</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{formatPercent(item.share)} ({formatCurrency(item.sales)})</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityStats} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(148, 163, 184, 0.6)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" stroke="rgba(148, 163, 184, 0.6)" fontSize={11} width={100} tickLine={false} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                        <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={20}>
                          {cityStats.map((entry, index) => {
                            const isSel = isCitySelected(entry.name);
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isSel ? '#1d4ed8' : '#3b82f6'} 
                                opacity={getCityOpacity(entry.name)}
                                stroke={isSel ? '#1d4ed8' : 'transparent'}
                                strokeWidth={isSel ? 2 : 0}
                                className="cursor-pointer"
                                onClick={() => {
                                  onCityToggle && onCityToggle(entry.name);
                                  setFullscreenChart(null);
                                }}
                              />
                            );
                          })}
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
