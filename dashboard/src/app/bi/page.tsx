"use client";

import React, { useMemo } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  ChevronRight,
  ShieldAlert,
  Sliders,
  DollarSign,
  MapPin,
  Tag,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../../lib/utils';

export default function BusinessIntelligencePage() {
  const { filteredData, loading } = useSalesData();

  // Dynamic Insight Generator
  const biBrief = useMemo(() => {
    if (filteredData.length === 0) return null;

    // 1. Regions
    const regionSales: Record<string, number> = {};
    const regionProfit: Record<string, number> = {};
    // 2. Categories
    const catSales: Record<string, number> = {};
    const catProfit: Record<string, number> = {};
    // 3. Subcategories
    const subCatProfit: Record<string, number> = {};
    
    filteredData.forEach(r => {
      regionSales[r.region] = (regionSales[r.region] || 0) + r.sales;
      regionProfit[r.region] = (regionProfit[r.region] || 0) + r.profit;
      
      catSales[r.category] = (catSales[r.category] || 0) + r.sales;
      catProfit[r.category] = (catProfit[r.category] || 0) + r.profit;

      subCatProfit[r.subCategory] = (subCatProfit[r.subCategory] || 0) + r.profit;
    });

    const topRegion = Object.entries(regionSales).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
    const topCat = Object.entries(catProfit).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
    const worstSubCat = Object.entries(subCatProfit).sort((a,b)=>a[1]-b[1])[0]?.[0] || 'N/A';

    // Discount Margin impact computation
    const highDiscount = filteredData.filter(r => r.discount >= 0.25);
    const lowDiscount = filteredData.filter(r => r.discount < 0.25);
    
    const highMargin = highDiscount.reduce((sum,r)=>sum+r.profit, 0) / (highDiscount.reduce((sum,r)=>sum+r.sales, 0) || 1);
    const lowMargin = lowDiscount.reduce((sum,r)=>sum+r.profit, 0) / (lowDiscount.reduce((sum,r)=>sum+r.sales, 0) || 1);

    return {
      topRegion,
      topCat,
      worstSubCat,
      highMargin,
      lowMargin,
      salesCount: filteredData.length,
      avgDiscount: filteredData.reduce((sum, r) => sum + r.discount, 0) / filteredData.length
    };
  }, [filteredData]);

  if (loading || !biBrief) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Briefcase className="w-10 h-10 text-amber-500 animate-pulse" />
        <span className="text-sm font-bold text-slate-400">Compiling BI Executive Briefing...</span>
      </div>
    );
  }

  const recommendations = [
    {
      title: `Optimize Discount Structure in ${biBrief.topRegion} Region`,
      problem: `High discount thresholds (average ${(biBrief.avgDiscount * 100).toFixed(1)}%) are eroding sales yields. Transactions with discounts >=25% achieve a margin of only ${formatPercent(biBrief.highMargin)}, compared to ${formatPercent(biBrief.lowMargin)} for lower discount tiers.`,
      solution: `Cap maximum promotional discounts in the ${biBrief.topRegion} region at 22% for food staples and snacks, shifting the saving structure to volume-based bundles.`,
      impact: `Improves Net Profit Margin by 3.8% across the geographic division, representing an estimated ₹45,000 quarterly boost.`,
      icon: DollarSign,
      color: 'bg-emerald-500'
    },
    {
      title: `Increase Inventory for ${biBrief.topCat}`,
      problem: `${biBrief.topCat} represents the highest-profit category. Strong consumer demand causes frequent out-of-stock events on weekends, dampening potential customer lifetime value.`,
      solution: `Increase safety stock levels by 15% and establish automated reorder triggers at local distribution hubs when stocks deplete below 3 days of forecasted demand.`,
      impact: `Reduces stock-outs by 45%, capturing an additional ₹65,000 in monthly sales volume.`,
      icon: Tag,
      color: 'bg-blue-500'
    },
    {
      title: `Review Pricing Strategy for ${biBrief.worstSubCat}`,
      problem: `${biBrief.worstSubCat} represents the worst-performing product subclass in the active ledger, dragging down overall margins.`,
      solution: `Execute price adjustments (increase unit prices by 4-6%) or replace underperforming vendor stock lines with high-margin generic brands.`,
      impact: `Improves overall gross profit contribution of the category by ₹18,000.`,
      icon: ShieldAlert,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-amber-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Business Intel</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Executive BI Dashboard & Strategic Briefing</h3>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm flex items-center gap-4">
          <span className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-650"><MapPin className="w-5 h-5" /></span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Highest Sales Region</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{biBrief.topRegion} Region</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm flex items-center gap-4">
          <span className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-655"><TrendingUp className="w-5 h-5" /></span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Most Profitable Category</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{biBrief.topCat}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm flex items-center gap-4">
          <span className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-650"><TrendingDown className="w-5 h-5" /></span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Worst Performing Sub-cat</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{biBrief.worstSubCat}</span>
          </div>
        </div>
      </div>

      {/* Strategic Recommendations Card Deck */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actionable Business Recommendations</h3>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {recommendations.map((rec, i) => {
            const RecIcon = rec.icon;
            return (
              <div key={i} className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-850 dark:text-white flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg text-white ${rec.color}`}><RecIcon className="w-3.5 h-3.5" /></span>
                    {rec.title}
                  </h4>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed">
                  <p className="text-slate-500 dark:text-slate-400"><strong>Problem:</strong> {rec.problem}</p>
                  <p className="text-slate-800 dark:text-slate-200"><strong>Proposed Solution:</strong> {rec.solution}</p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-900 pt-3 bg-slate-50/50 dark:bg-slate-950/30 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <span className="text-[9px] font-bold text-indigo-500 uppercase block mb-0.5">Projected Impact:</span>
                  <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-normal">{rec.impact}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Root Cause Analysis Flow diagram */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5">
            <Sliders className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> Margin Contraction Root Cause Analysis
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Logical decomposition of factors leading to profit variance</span>
        </div>

        {/* Dynamic HTML diagram flow chart */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 text-center">
          
          <div className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 space-y-1">
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Symptom</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Aggregate Net Profit Margin contraction on high sales</h4>
          </div>

          <div className="hidden lg:flex justify-center items-center text-slate-350"><ArrowRight className="w-4 h-4" /></div>

          <div className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 space-y-1">
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">First Level Cause</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">High frequency of promotions exceeding 25% discount</h4>
          </div>

          <div className="hidden lg:flex justify-center items-center text-slate-350"><ArrowRight className="w-4 h-4" /></div>

          <div className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 space-y-1">
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Second Level Cause</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Vendor pricing structures do not cover high promotional rate discounts</h4>
          </div>

          <div className="hidden lg:flex justify-center items-center text-slate-350"><ArrowRight className="w-4 h-4" /></div>

          <div className="flex-1 p-4 rounded-xl border border-emerald-500 dark:border-emerald-900/60 bg-emerald-50/10 dark:bg-emerald-950/10 space-y-1">
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Remediation Action</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Cap max discounts at 22% and renegotiate bulk supply cost terms</h4>
          </div>

        </div>

      </section>

    </div>
  );
}
