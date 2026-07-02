"use client";

import React, { useState } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { motion } from 'framer-motion';
import { 
  Info, 
  Layers, 
  Calendar, 
  Download, 
  FileText, 
  Printer, 
  Share2,
  CheckCircle,
  Server,
  Code
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../lib/utils';

export default function AboutProjectPage() {
  const { filteredData, kpis } = useSalesData();
  const [activeTimelineStep, setActiveTimelineStep] = useState(5);

  const timelineSteps = [
    { title: 'Data Collection', date: 'Jan 2026', desc: 'Retrieved raw CSV ledger containing 9,994 transactional records of grocery sales.' },
    { title: 'Data Preprocessing', date: 'Feb 2026', desc: 'Mapped boundaries, implemented IQR/Z-score outlier filters, and designed synthetic null imputations.' },
    { title: 'Exploratory Analysis', date: 'Mar 2026', desc: 'Constructed time-series sales trends, Pareto charts, and Tamil Nadu regional density maps.' },
    { title: 'ML & Forecast Modeling', date: 'Apr 2026', desc: 'Coded client-side Linear, Random Forest, XGBoost and ARIMA forecasting algorithms in TS.' },
    { title: 'Explainable AI & BI', date: 'May 2026', desc: 'Integrated TreeSHAP values, What-If simulators, and automated Business Intelligence briefs.' },
    { title: 'Platform Launch', date: 'Jun 2026', desc: 'Deployed complete modular Next.js dashboard framework on Vercel edge networks.' }
  ];

  // Helper to trigger printing of the page
  const handlePrint = () => {
    window.print();
  };

  // Helper to generate a text report for download
  const handleDownloadReport = () => {
    if (filteredData.length === 0) return;

    const reportText = `SUPERMART DATA SCIENCE PLATFORM - EXECUTIVE REPORT
Generated: ${new Date().toLocaleString()}
==================================================

SUMMARY METRICS
--------------------------------------------------
Total Records: ${formatNumber(filteredData.length)}
Gross Revenue: ${kpis.sales.prefix}${formatNumber(Math.round(kpis.sales.value))}
Total Profit: ${kpis.profit.prefix}${formatNumber(Math.round(kpis.profit.value))}
Profit Margin: ${kpis.margin.value.toFixed(1)}${kpis.margin.suffix}
Average Discount: ${(kpis.discount.value).toFixed(1)}%

BUSINESS RECOMMENDATION SUMMARY
--------------------------------------------------
1. Restructure pricing in regions where promotions exceeding 25% are destroying yields.
2. Focus marketing resources on retaining VIP Customer accounts.
3. Optimize supply chain inventory for top-performing product categories.

Disclaimer: This report is automatically generated based on the active filtered session cohort.
==================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'supermart_executive_report.txt');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-indigo-655 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">About</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Professional Portfolio Case Study</h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Core Project Info (2/3 width) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-500" /> Platform Architecture Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This application serves as a comprehensive portfolio piece demonstrating the complete Data Science lifecycle. Unlike standard dashboards that act as static displays, this platform integrates client-side statistical test suites, customer segmentation algorithms, and machine learning regressors directly into a Next.js framework, allowing users to fit models and run what-if simulations instantly in the browser.
            </p>
          </div>

          {/* Architecture flow chart in SVG */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Data Pipeline Schema</span>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-center text-[10px] font-bold text-slate-655 py-2">
              <div className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-900 border border-slate-300/40 dark:border-slate-800 w-full sm:w-auto">
                <span className="block text-[8px] text-slate-400 uppercase">Input</span>
                data.json (9.9k rows)
              </div>
              <span className="hidden sm:inline text-slate-350">➔</span>
              <div className="px-3 py-2 rounded bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/30 text-indigo-650 w-full sm:w-auto">
                <span className="block text-[8px] text-slate-400 uppercase">Context Filter</span>
                useSalesData Hook
              </div>
              <span className="hidden sm:inline text-slate-350">➔</span>
              <div className="px-3 py-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 text-emerald-650 w-full sm:w-auto">
                <span className="block text-[8px] text-slate-400 uppercase">Compute Engines</span>
                K-Means / ARIMA / Trees
              </div>
              <span className="hidden sm:inline text-slate-350">➔</span>
              <div className="px-3 py-2 rounded bg-blue-600 text-white w-full sm:w-auto shadow-sm">
                <span className="block text-[8px] opacity-80 uppercase">Output UI</span>
                Interactive Analytics
              </div>
            </div>
          </div>

          {/* Tech Stack Grid */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Technology Stack</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-2.5 bg-slate-50/20 dark:bg-slate-950/10">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Code className="w-4 h-4" /></span>
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-205">Next.js & React</span>
                  <span className="text-[9px] text-slate-400">Framework</span>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-2.5 bg-slate-50/20 dark:bg-slate-950/10">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><Layers className="w-4 h-4" /></span>
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-205">TypeScript</span>
                  <span className="text-[9px] text-slate-400">Language</span>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-2.5 bg-slate-50/20 dark:bg-slate-950/10">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500"><Layers className="w-4 h-4" /></span>
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-205">Recharts</span>
                  <span className="text-[9px] text-slate-400">Visualization</span>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-2.5 bg-slate-50/20 dark:bg-slate-950/10">
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Server className="w-4 h-4" /></span>
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-205">Tailwind CSS</span>
                  <span className="text-[9px] text-slate-400">Styling</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Console (1/3 width) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-500" /> Export & Briefing Console
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Export dashboard configurations or generate offline PDF business briefs based on active filtering criteria.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDownloadReport}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Download Briefing Report (.TXT)
            </button>

            <button
              onClick={handlePrint}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Dashboard to PDF
            </button>
          </div>

          <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3.5 rounded-xl text-[9px] text-slate-450 leading-relaxed">
            *Offline printing is optimized using CSS print media stylesheets which format reports automatically, eliminating dashboard sidebar panels and navigation headers.
          </div>
        </div>

      </div>

      {/* Interactive Project Timeline */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5">
            <Calendar className="w-4.5 h-4.5 text-indigo-500" /> Interactive Project Development Timeline
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Click steps to review milestone details</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {timelineSteps.map((step, idx) => {
            const isSelected = activeTimelineStep === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTimelineStep(idx)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all space-y-2 h-[130px]
                  ${isSelected 
                    ? 'border-indigo-500 bg-indigo-50/15 dark:bg-indigo-950/10' 
                    : 'border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/20 hover:border-slate-250'
                  }
                `}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{step.date}</span>
                  {idx <= activeTimelineStep ? (
                    <span className="text-emerald-500"><CheckCircle className="w-3.5 h-3.5" /></span>
                  ) : null}
                </div>

                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{step.title}</h4>
                <p className="text-[9.5px] text-slate-450 leading-relaxed truncate-3-lines">{step.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
