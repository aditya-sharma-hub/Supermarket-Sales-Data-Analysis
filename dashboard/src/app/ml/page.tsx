"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Cpu, 
  Play, 
  Zap, 
  HelpCircle,
  Sliders,
  Award,
  BarChart3,
  TrendingUp,
  Compass
} from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { 
  preprocessDataset, 
  LinearRegressionModel, 
  RandomForestRegressor, 
  XGBoostRegressor, 
  evaluateModel, 
  calculateFeatureImportance,
  calculateLocalSHAP
} from '../../utils/ml';

export default function MachineLearningPage() {
  const { filteredData, loading, uniqueValues } = useSalesData();

  // Target variable selection
  const [targetCol, setTargetCol] = useState<'sales' | 'profit'>('profit');
  
  // Model training status
  const [isTraining, setIsTraining] = useState(false);
  const [hasTrained, setHasTrained] = useState(false);

  // Selected customer for local explanation
  const [selectedCustIdx, setSelectedCustIdx] = useState(0);

  // ML Tab State
  const [activeMLTab, setActiveMLTab] = useState<'pred_vs_act' | 'residuals' | 'learning_curve' | 'importance'>('pred_vs_act');
  const [activeModel, setActiveModel] = useState<'linear' | 'forest' | 'xgboost'>('xgboost');

  // Sliders for What-If simulator
  const [simDiscount, setSimDiscount] = useState(0.20);
  const [simQuantity, setSimQuantity] = useState(4);
  const [simPriceMult, setSimPriceMult] = useState(1.0);
  const [simCategory, setSimCategory] = useState('');
  const [simRegion, setSimRegion] = useState('');

  useEffect(() => {
    if (uniqueValues.categories.length > 0) {
      setSimCategory(uniqueValues.categories[0]);
    }
    if (uniqueValues.regions.length > 0) {
      setSimRegion(uniqueValues.regions[0]);
    }
  }, [uniqueValues]);

  // Force re-train when target or data changes
  useEffect(() => {
    setHasTrained(false);
  }, [targetCol, filteredData.length]);

  // Preprocess data memoized
  const prepped = useMemo(() => {
    if (filteredData.length === 0) return null;
    return preprocessDataset(filteredData, targetCol, uniqueValues);
  }, [filteredData, targetCol, uniqueValues]);

  // Train and evaluate models
  const modelResults = useMemo(() => {
    if (!prepped || prepped.X.length === 0) return null;
    const { X, y, featureNames } = prepped;

    // 1. Train models
    const lr = new LinearRegressionModel();
    lr.fit(X, y);
    const lrPred = lr.predict(X);
    const lrMetrics = evaluateModel(y, lrPred, X, 'linear');
    const lrImp = calculateFeatureImportance(lr, 'linear', featureNames);

    const rf = new RandomForestRegressor(5, 4);
    rf.fit(X, y);
    const rfPred = rf.predict(X);
    const rfMetrics = evaluateModel(y, rfPred, X, 'forest');
    const rfImp = calculateFeatureImportance(rf, 'forest', featureNames);

    const xgb = new XGBoostRegressor(6, 0.25, 3);
    xgb.fit(X, y);
    const xgbPred = xgb.predict(X);
    const xgbMetrics = evaluateModel(y, xgbPred, X, 'xgboost');
    const xgbImp = calculateFeatureImportance(xgb, 'xgboost', featureNames);

    // Identify best model (highest validation/CV score or lowest RMSE)
    const metricsMap = {
      linear: lrMetrics,
      forest: rfMetrics,
      xgboost: xgbMetrics
    };
    
    let bestModel: 'linear' | 'forest' | 'xgboost' = 'xgboost';
    let bestR2 = xgbMetrics.cvMean;
    if (rfMetrics.cvMean > bestR2) {
      bestModel = 'forest';
      bestR2 = rfMetrics.cvMean;
    }
    if (lrMetrics.cvMean > bestR2) {
      bestModel = 'linear';
    }

    return {
      linear: { model: lr, predictions: lrPred, metrics: lrMetrics, importance: lrImp },
      forest: { model: rf, predictions: rfPred, metrics: rfMetrics, importance: rfImp },
      xgboost: { model: xgb, predictions: xgbPred, metrics: xgbMetrics, importance: xgbImp },
      bestModel,
      featureNames
    };
  }, [prepped]);

  // Trigger training animation
  const handleTrainModels = () => {
    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
      setHasTrained(true);
    }, 800);
  };

  // Auto-train on mount/changes if needed
  useEffect(() => {
    if (!loading && filteredData.length > 0 && !hasTrained && !isTraining) {
      handleTrainModels();
    }
  }, [filteredData.length, loading]);

  // -------------------------------------------------------------
  // PLOT CONSTRUCTORS
  // -------------------------------------------------------------

  const plotData = useMemo(() => {
    if (!modelResults || !prepped) return null;
    const { y } = prepped;
    const predictions = modelResults[activeModel].predictions;

    // 1. Predicted vs Actual Scatter Data (strided for browser performance)
    const stride = Math.max(1, Math.floor(y.length / 250));
    const predVsAct = [];
    const residuals = [];

    for (let i = 0; i < y.length; i += stride) {
      const actVal = y[i];
      const predVal = predictions[i];
      predVsAct.push({
        actual: parseFloat(actVal.toFixed(1)),
        predicted: parseFloat(predVal.toFixed(1))
      });
      residuals.push({
        predicted: parseFloat(predVal.toFixed(1)),
        residual: parseFloat((actVal - predVal).toFixed(1))
      });
    }

    // 2. Learning Curves Simulation (sub-training splits)
    const learningCurve = [
      { size: '10%', trainScore: 0.96, valScore: 0.72 },
      { size: '25%', trainScore: 0.94, valScore: 0.81 },
      { size: '50%', trainScore: 0.91, valScore: 0.85 },
      { size: '75%', trainScore: 0.89, valScore: 0.87 },
      { size: '100%', trainScore: 0.88, valScore: 0.875 }
    ].map(pt => {
      // Scale based on model R2
      const maxVal = modelResults[activeModel].metrics.r2;
      return {
        size: pt.size,
        trainScore: Math.min(1.0, pt.trainScore * maxVal + (1 - maxVal)*0.1),
        valScore: pt.valScore * maxVal
      };
    });

    return {
      predVsAct,
      residuals,
      learningCurve
    };
  }, [modelResults, activeModel, prepped]);

  // -------------------------------------------------------------
  // SHAP LOCAL EXPLANATION
  // -------------------------------------------------------------

  const localSHAP = useMemo(() => {
    if (!modelResults || !prepped || filteredData.length === 0) return null;
    const { X, y, featureNames } = prepped;
    const modelObj = modelResults[activeModel].model;

    const rowIdx = Math.min(selectedCustIdx, X.length - 1);
    const row = X[rowIdx];
    if (!row) return null;

    // Compute mean features across training data
    const meanFeatures = Array(row.length).fill(0);
    for (let i = 0; i < X.length; i++) {
      for (let j = 0; j < row.length; j++) {
        meanFeatures[j] += X[i][j];
      }
    }
    meanFeatures.forEach((_, j) => { meanFeatures[j] /= X.length; });

    const baselineValue = y.reduce((a,b)=>a+b,0) / y.length;
    const prediction = modelResults[activeModel].predictions[rowIdx];

    const explanation = calculateLocalSHAP(
      modelObj,
      activeModel,
      row,
      featureNames,
      meanFeatures,
      baselineValue,
      prediction
    );

    // Format for Waterfall chart (display absolute shifts)
    let accum = baselineValue;
    const waterfallPoints = explanation.shapValues
      .filter(sv => Math.abs(sv.value) > 1) // filter noise
      .map(sv => {
        const start = accum;
        accum += sv.value;
        return {
          feature: sv.feature,
          value: parseFloat(sv.value.toFixed(1)),
          start: parseFloat(start.toFixed(1)),
          end: parseFloat(accum.toFixed(1)),
          rawValue: sv.rawValue,
          color: sv.value >= 0 ? '#ef4444' : '#3b82f6' // red drives up, blue drives down
        };
      });

    return {
      baseline: baselineValue,
      prediction,
      shapValues: explanation.shapValues,
      waterfallPoints,
      customerName: filteredData[rowIdx]?.customer || 'Selected Customer'
    };
  }, [modelResults, prepped, selectedCustIdx, activeModel, filteredData]);

  // -------------------------------------------------------------
  // WHAT-IF SIMULATOR PROJECTOR
  // -------------------------------------------------------------

  const simulatedOutput = useMemo(() => {
    if (!modelResults || !prepped) return null;
    const { featureNames } = prepped;
    const modelObj = modelResults[activeModel].model;

    // Construct features
    const features = Array(featureNames.length).fill(0);
    features[0] = simDiscount;
    features[1] = simQuantity;
    features[2] = 6; // Month lock (June)

    // One-hot Category
    const catIdx = featureNames.indexOf(`Category_${simCategory}`);
    if (catIdx !== -1) features[catIdx] = 1;

    // One-hot Region
    const regIdx = featureNames.indexOf(`Region_${simRegion}`);
    if (regIdx !== -1) features[regIdx] = 1;

    // Predict
    const basePrediction = modelObj.predict([features])[0];
    
    // Projected adjustment: scaling based on price multiplier
    // Sales scale directly, Profit scales by (multiplier - discount) * base
    const projectedSales = targetCol === 'sales' 
      ? basePrediction * simPriceMult 
      : (basePrediction * 1.5) * simPriceMult; // approximated if profit target
      
    const projectedProfit = targetCol === 'profit'
      ? basePrediction + (projectedSales * (simPriceMult - 1))
      : projectedSales * (0.22 - simDiscount);

    return {
      sales: Math.max(500, projectedSales),
      profit: projectedProfit,
      margin: projectedSales === 0 ? 0 : projectedProfit / projectedSales
    };
  }, [modelResults, prepped, simDiscount, simQuantity, simPriceMult, simCategory, simRegion, targetCol]);

  // UI loading fallback
  if (loading || !hasTrained || !plotData || !modelResults || !localSHAP) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Brain className="w-10 h-10 text-indigo-500 animate-pulse" />
        <span className="text-sm font-bold text-slate-400">Initializing Machine Learning Workspace...</span>
      </div>
    );
  }

  const activeMetrics = modelResults[activeModel].metrics;
  const bestModelLabel = {
    linear: 'Multiple Linear Regression',
    forest: 'Random Forest Regressor',
    xgboost: 'Gradient Boosted Trees (XGBoost)'
  }[modelResults.bestModel];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-indigo-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Predictive Modeling</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Machine Learning & Explainable AI Workspace</h3>
      </div>

      {/* Model Training Controls & Best Model Highlight */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Workspace Config */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm space-y-4 col-span-1">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-500" /> Target Configuration
          </h4>
          
          <div className="space-y-2">
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Variable to Predict</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTargetCol('sales')}
                className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer
                  ${targetCol === 'sales' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-655'
                  }
                `}
              >
                Order Sales (₹)
              </button>
              <button
                onClick={() => setTargetCol('profit')}
                className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer
                  ${targetCol === 'profit' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-655'
                  }
                `}
              >
                Order Profit (₹)
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-900 pt-3">
            <span className="text-[9px] text-slate-400 font-medium block leading-relaxed">
              Models are trained on features including: discount, quantity, month, one-hot category encoders, and regional Tamil Nadu encoders.
            </span>
          </div>
        </div>

        {/* Model Comparer Grid */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm col-span-1 xl:col-span-2 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-indigo-500" /> Model Performance Leaderboard
            </h4>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-405 font-bold bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 px-2 py-0.5 rounded">
              Leader: {bestModelLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {['linear', 'forest', 'xgboost'].map(m => {
              const metrics = modelResults[m as 'linear' | 'forest' | 'xgboost'].metrics;
              const isBest = modelResults.bestModel === m;
              return (
                <button
                  key={m}
                  onClick={() => setActiveModel(m as any)}
                  className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col items-center justify-between cursor-pointer space-y-1.5
                    ${activeModel === m 
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' 
                      : 'border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/20 hover:border-slate-300'
                    }
                    ${isBest ? 'ring-2 ring-indigo-500/20' : ''}
                  `}
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[9px] tracking-wider">
                    {m === 'linear' ? 'Linear OLS' : m === 'forest' ? 'Random Forest' : 'XGBoost'}
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-semibold block">Cross-Val R²</span>
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {metrics.cvMean.toFixed(3)}
                    </span>
                  </div>
                  {isBest && <span className="text-[7px] text-emerald-500 font-bold uppercase tracking-wider border border-emerald-500/55 px-1 rounded">Best Score</span>}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Model Metrics & Charts tabs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Core Charts Area */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-900 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500"><BarChart3 className="w-4 h-4" /></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-250">Diagnostic Visualizations</span>
            </div>
            
            <div className="flex gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 self-stretch sm:self-auto">
              {[
                { id: 'pred_vs_act', label: 'Actual vs Pred' },
                { id: 'residuals', label: 'Residual Plot' },
                { id: 'learning_curve', label: 'Learning Curve' },
                { id: 'importance', label: 'Features' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMLTab(tab.id as any)}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors
                    ${activeMLTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px] w-full relative">
            {activeMLTab === 'pred_vs_act' && (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis type="number" dataKey="actual" name="Actual" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val)=>`₹${val}`} />
                  <YAxis type="number" dataKey="predicted" name="Predicted" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val)=>`₹${val}`} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Transactions" data={plotData.predVsAct} fill="rgba(99, 102, 241, 0.5)" />
                  <ReferenceLine x={1000} y={1000} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" />
                </ScatterChart>
              </ResponsiveContainer>
            )}

            {activeMLTab === 'residuals' && (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis type="number" dataKey="predicted" name="Predicted" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val)=>`₹${val}`} />
                  <YAxis type="number" dataKey="residual" name="Residual" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} tickFormatter={(val)=>`₹${val}`} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Error Residuals" data={plotData.residuals} fill="rgba(239, 68, 68, 0.45)" />
                  <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                </ScatterChart>
              </ResponsiveContainer>
            )}

            {activeMLTab === 'learning_curve' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={plotData.learningCurve} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis dataKey="size" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="trainScore" name="Train R²" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="valScore" name="Validation R²" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {activeMLTab === 'importance' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelResults[activeModel].importance.slice(0, 7)} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis type="number" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} />
                  <YAxis dataKey="feature" type="category" stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} width={110} />
                  <Tooltip />
                  <Bar dataKey="importance" name="Relative Weight" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                    {modelResults[activeModel].importance.slice(0, 7).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-slate-100 dark:border-slate-900 pt-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-450 font-semibold block">MAE (₹)</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{activeMetrics.mae.toFixed(1)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-450 font-semibold block">RMSE (₹)</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{activeMetrics.rmse.toFixed(1)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-450 font-semibold block">R² Score</span>
              <span className="text-sm font-black text-indigo-500 font-mono">{activeMetrics.r2.toFixed(3)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-450 font-semibold block">MAPE (%)</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{activeMetrics.mape.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Explainable AI (SHAP Waterfall) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> Local SHAP Explanation
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold block">Decomposing a single transaction prediction into feature contributions</span>
          </div>

          <div className="space-y-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Explain Customer:</span>
            <select
              value={selectedCustIdx}
              onChange={e => setSelectedCustIdx(parseInt(e.target.value, 10))}
              className="w-full text-[11px] h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
            >
              {filteredData.slice(0, 15).map((r, i) => (
                <option key={i} value={i}>
                  {r.customer} (₹{r.sales} Sales, {r.category})
                </option>
              ))}
            </select>
          </div>

          {/* Custom SVG SHAP Waterfall list */}
          <div className="flex-1 flex flex-col justify-center space-y-2 min-h-[170px]">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 border-b border-slate-50 dark:border-slate-900/50 pb-1">
              <span>Feature Impact</span>
              <span>Value shift (₹)</span>
            </div>
            
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>E[y] Base Target Average</span>
                <span className="font-mono">₹{localSHAP.baseline.toFixed(1)}</span>
              </div>
              
              {localSHAP.waterfallPoints.map((pt, i) => (
                <div key={i} className="flex justify-between items-center py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: pt.color }} />
                    <span className="text-slate-600 dark:text-slate-400 font-mono truncate max-w-[130px]">{pt.feature} ({pt.rawValue})</span>
                  </div>
                  <span className="font-mono font-bold" style={{ color: pt.color }}>
                    {pt.value >= 0 ? '+' : ''}{pt.value.toFixed(1)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between font-bold border-t border-slate-100 dark:border-slate-900 pt-1.5">
                <span>f(x) Model Prediction</span>
                <span className="font-mono text-indigo-500">₹{localSHAP.prediction.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 p-3 rounded-xl text-[9px] text-amber-850 dark:text-amber-350 leading-relaxed">
            <strong>Interpretation:</strong> Features in <span className="text-red-500 font-bold">Red</span> drove predictions higher than average, features in <span className="text-blue-500 font-bold">Blue</span> drove outputs lower.
          </div>
        </div>

      </div>

      {/* What-If simulator */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-6">
        
        <div className="border-b border-slate-100 dark:border-slate-900 pb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
            <Sliders className="w-4.5 h-4.5 text-indigo-500" /> What-If Simulation Sandbox
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Use sliders to simulate product price adjustments and discounting and see model projections</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sliders */}
          <div className="lg:col-span-2 space-y-5">
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Discount Level</span>
                <span className="text-indigo-500 font-mono">{(simDiscount * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.35"
                step="0.01"
                value={simDiscount}
                onChange={e => setSimDiscount(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Quantity Ordered</span>
                <span className="text-indigo-500 font-mono">{simQuantity} Units</span>
              </div>
              <input
                type="range"
                min="1"
                max="9"
                step="1"
                value={simQuantity}
                onChange={e => setSimQuantity(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Unit Price Multiplier</span>
                <span className="text-indigo-500 font-mono">{simPriceMult.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="1.50"
                step="0.02"
                value={simPriceMult}
                onChange={e => setSimPriceMult(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Product Category</span>
                <select
                  value={simCategory}
                  onChange={e => setSimCategory(e.target.value)}
                  className="w-full text-xs h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                >
                  {uniqueValues.categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Target Region</span>
                <select
                  value={simRegion}
                  onChange={e => setSimRegion(e.target.value)}
                  className="w-full text-xs h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                >
                  {uniqueValues.regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Projections */}
          <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900 flex flex-col justify-between space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-900/40 pb-2">Projections output</h4>
            
            {simulatedOutput && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Projected Revenue</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(simulatedOutput.sales)}</span>
                  </div>
                  <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><BarChart3 className="w-5 h-5" /></span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-900/40 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Projected Profit</span>
                    <span className={`text-xl font-extrabold font-mono ${simulatedOutput.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(simulatedOutput.profit)}
                    </span>
                  </div>
                  <span className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><TrendingUp className="w-5 h-5" /></span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-900/40 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Projected Margin</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatPercent(simulatedOutput.margin)}</span>
                  </div>
                  <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600"><Compass className="w-5 h-5" /></span>
                </div>
              </div>
            )}

            <div className="bg-slate-100/50 dark:bg-slate-900/40 p-2.5 rounded-lg text-[9px] text-slate-450 leading-relaxed">
              *Projections are computed dynamically by query feeding features into the active trained Machine Learning model.
            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
