"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Database, 
  Layers, 
  Activity, 
  Brain, 
  HelpCircle,
  FileText
} from 'lucide-react';

export default function DocumentationPage() {
  const [activeDocSection, setActiveDocSection] = useState<'problem' | 'data' | 'eda' | 'prep' | 'ml' | 'deploy'>('problem');

  const docSections = [
    { id: 'problem', label: 'Problem & Objectives', icon: FileText },
    { id: 'data', label: 'Data Dictionary', icon: Database },
    { id: 'eda', label: 'Exploratory Analysis', icon: Activity },
    { id: 'prep', label: 'Preprocessing & Scaling', icon: Layers },
    { id: 'ml', label: 'ML & Forecast Models', icon: Brain },
    { id: 'deploy', label: 'Deployment Schema', icon: BookOpen }
  ];

  return (
    <div className="space-y-8 flex flex-col lg:flex-row gap-6 items-start h-[calc(100vh-8rem)]">
      
      {/* Side Menu Checklist */}
      <div className="w-full lg:w-64 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 rounded-2xl shadow-sm shrink-0 space-y-3 print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Documentation</h3>
        </div>

        <div className="flex flex-col gap-1 w-full">
          {docSections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeDocSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveDocSection(sec.id as any)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                  ${isActive 
                    ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-800'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Reading Panel */}
      <div className="flex-1 w-full h-full border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 p-6 rounded-2xl shadow-sm overflow-y-auto leading-relaxed text-xs">
        
        <AnimatePresence mode="wait">
          {activeDocSection === 'problem' && (
            <motion.div
              key="problem"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-base font-extrabold border-b border-slate-100 dark:border-slate-900 pb-2 text-slate-850 dark:text-white">Problem Statement & Business Objectives</h3>
              
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300">
                <strong>Executive Summary:</strong> Retail margins in modern supermarkets are highly sensitive to discounting and regional inventory mismatch. This platform provides data-driven pricing, forecasting, and retention tools to protect profitability.
              </div>

              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <p><strong>1. Problem Context:</strong> SuperMart Grocery Sales covers a catalog of FMCG items across the state of Tamil Nadu. High promotional discounts are currently applied on an ad-hoc basis, causing negative profit margins on several high-value orders.</p>
                <p><strong>2. Core Objectives:</strong></p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Revenue Protection:</strong> Identify unprofitable discount leakages and cap maximum promotion limits.</li>
                  <li><strong>Demand Planning:</strong> Forecast monthly inventory demand (RMSE &lt; 200 units) to minimize stock-outs.</li>
                  <li><strong>Customer Retention:</strong> Segment customers into RFM bands and trigger Win-back campaigns for dormant groups.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeDocSection === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-base font-extrabold border-b border-slate-100 dark:border-slate-900 pb-2 text-slate-850 dark:text-white">Data Dictionary & Schema Description</h3>
              <p className="text-slate-500">The platform operates on a retail transactional ledger containing 9,994 order records.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 font-bold">
                      <th className="py-2">Column</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Constraint</th>
                      <th className="py-2">Business Definition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-900/50 text-slate-655">
                    <tr>
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">id</td>
                      <td>String</td>
                      <td>Primary Key</td>
                      <td>Unique identifier representing a single order line item.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">date</td>
                      <td>Date</td>
                      <td>YYYY-MM-DD</td>
                      <td>Order timestamp. Spans from Jan 2015 to Dec 2018.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">customer</td>
                      <td>String</td>
                      <td>Categorical</td>
                      <td>Customer account name.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">sales</td>
                      <td>Float</td>
                      <td>₹500 - ₹2500</td>
                      <td>Gross transaction value in Indian Rupees.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">discount</td>
                      <td>Float</td>
                      <td>0.10 - 0.35</td>
                      <td>Promotional discount rate applied.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold text-slate-800 dark:text-slate-200">profit</td>
                      <td>Float</td>
                      <td>Continuous</td>
                      <td>Net earnings. Negative values indicate unprofitable sales.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeDocSection === 'eda' && (
            <motion.div
              key="eda"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-base font-extrabold border-b border-slate-100 dark:border-slate-900 pb-2 text-slate-850 dark:text-white">Exploratory Data Analysis (EDA) Summary</h3>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <p><strong>1. Category Concentration:</strong> Food staples, snacks, and bakery items account for over 45% of total sales volume. High concentration indicates grocery essentials are the core traffic builders.</p>
                <p><strong>2. Geographic Distribution:</strong> Sales are distributed across 25 cities in Tamil Nadu. Chennai, Madurai, and Coimbatore represent the primary urban hubs driving maximum gross revenue.</p>
                <p><strong>3. Pareto Principle (80/20 Rule):</strong> Top 20% of customers contribute approximately 42% of gross profit volume, indicating high dependency on a core cohort of brand loyalists.</p>
              </div>
            </motion.div>
          )}

          {activeDocSection === 'prep' && (
            <motion.div
              key="prep"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-base font-extrabold border-b border-slate-100 dark:border-slate-900 pb-2 text-slate-850 dark:text-white">Preprocessing & Scaling Methodology</h3>
              <div className="space-y-3 text-slate-655">
                <p>To train models, the dataset is passed through a multi-stage preprocessing pipeline:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Imputation:</strong> Handles missing values via median imputation on numerical fields to preserve variance.</li>
                  <li><strong>Outlier Treatment:</strong> Identifies outlier transactions using both the Tukey IQR method ($Q_3 + 1.5 \times IQR$) and Standard Z-Scores ($|Z| &gt; 2.5$).</li>
                  <li><strong>Encoding:</strong> Converts category and region fields using One-Hot encoding to avoid rank leakage.</li>
                  <li><strong>Scaling:</strong> Normalizes features to $[0,1]$ range via MinMax Scaling before fitting distance-based models (like K-Means).</li>
                </ul>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 font-mono text-[10px]">
                  {`# Standard Normalization Equation\nZ = (X - mean) / std_dev\n# MinMax Scaling Equation\nX_scaled = (X - min) / (max - min)`}
                </div>
              </div>
            </motion.div>
          )}

          {activeDocSection === 'ml' && (
            <motion.div
              key="ml"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-base font-extrabold border-b border-slate-100 dark:border-slate-900 pb-2 text-slate-850 dark:text-white">Machine Learning & Forecasting Models</h3>
              <div className="space-y-3 text-slate-600 dark:text-slate-400">
                <p><strong>1. Multiple Regression Models:</strong></p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Linear OLS:</strong> Solves coefficients using the Normal Equation: $\beta = (X^T X)^{-1} X^T y$. Provides global linear baseline.</li>
                  <li><strong>Random Forest:</strong> Bagging ensemble of 5 decision trees of depth 4. Captures non-linear feature interactions.</li>
                  <li><strong>XGBoost:</strong> Sequentially fits weak decision tree models to predict residuals. Extrapolates pricing elasticity accurately.</li>
                </ul>

                <p><strong>2. Time Series Forecasting Models:</strong></p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Prophet Additive:</strong> Splits series into $y(t) = Trend(t) + Seasonality(t) + Noise$, fitting linear growth and Fourier seasonality factors.</li>
                  <li><strong>ARIMA(2,0,0):</strong> An autoregressive AR(2) model regressing month $t$ sales on previous lags $t-1$ and $t-2$.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeDocSection === 'deploy' && (
            <motion.div
              key="deploy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-base font-extrabold border-b border-slate-100 dark:border-slate-900 pb-2 text-slate-850 dark:text-white">Production Deployment Architecture</h3>
              <p className="text-slate-500">The platform is designed to be fully decoupled and static-capable for web deployments.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-2">Frontend Layer</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-655 pl-1">
                    <li>Framework: Next.js App Router (Static HTML export candidate)</li>
                    <li>UI & Style: Tailwind CSS + Lucide Icons</li>
                    <li>Charts: Responsive Recharts SVG engine</li>
                    <li>Deploy Target: Vercel edge content network</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-2">Data Science Layer</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-655 pl-1">
                    <li>Engine: Client-side TypeScript Math SDK</li>
                    <li>Data Pipeline: Dynamic context feed mapping</li>
                    <li>Compute Overhead: O(N) fitting paths taking &lt; 30ms</li>
                    <li>State Sync: Context-based state sharing</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
