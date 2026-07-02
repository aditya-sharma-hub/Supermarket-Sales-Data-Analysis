"use client";

import React, { useMemo, useState } from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis,
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Award, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Search,
  CheckCircle
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/utils';
import { segmentCustomers, SegmentedCustomer } from '../../utils/clustering';

export default function CustomerSegmentationPage() {
  const { filteredData, loading } = useSalesData();

  // Selected persona filter for inspector grid
  const [selectedPersona, setSelectedPersona] = useState<string>('High Value');

  // Customer search string in inspector grid
  const [inspectSearch, setInspectSearch] = useState('');

  // Segment customers memoized
  const customers = useMemo(() => {
    if (filteredData.length === 0) return [];
    return segmentCustomers(filteredData);
  }, [filteredData]);

  // Compute cluster aggregations/counts for visualizations
  const clusterStats = useMemo(() => {
    if (customers.length === 0) return [];

    const statsMap: Record<string, { count: number; spend: number; recencySum: number; freqSum: number; discSum: number }> = {
      'High Value': { count: 0, spend: 0, recencySum: 0, freqSum: 0, discSum: 0 },
      'Loyal': { count: 0, spend: 0, recencySum: 0, freqSum: 0, discSum: 0 },
      'Frequent': { count: 0, spend: 0, recencySum: 0, freqSum: 0, discSum: 0 },
      'Occasional': { count: 0, spend: 0, recencySum: 0, freqSum: 0, discSum: 0 },
      'At Risk': { count: 0, spend: 0, recencySum: 0, freqSum: 0, discSum: 0 }
    };

    customers.forEach(c => {
      if (statsMap[c.persona]) {
        statsMap[c.persona].count++;
        statsMap[c.persona].spend += c.monetary;
        statsMap[c.persona].recencySum += c.recency;
        statsMap[c.persona].freqSum += c.frequency;
        statsMap[c.persona].discSum += c.avgDiscount;
      }
    });

    return Object.entries(statsMap).map(([persona, s]) => ({
      persona,
      count: s.count,
      totalSpend: parseFloat(s.spend.toFixed(0)),
      avgRecency: s.count === 0 ? 0 : parseFloat((s.recencySum / s.count).toFixed(1)),
      avgFrequency: s.count === 0 ? 0 : parseFloat((s.freqSum / s.count).toFixed(1)),
      avgDiscount: s.count === 0 ? 0 : parseFloat((s.discSum / s.count * 100).toFixed(1)),
      percentage: customers.length === 0 ? 0 : (s.count / customers.length) * 100
    }));
  }, [customers]);

  // Radar chart data profiling centroids (standardized/normalized relative indices)
  const radarData = useMemo(() => {
    if (clusterStats.length === 0) return [];
    
    // Find maximums for normalization
    const maxRecency = Math.max(...clusterStats.map(s => s.avgRecency)) || 1;
    const maxFrequency = Math.max(...clusterStats.map(s => s.avgFrequency)) || 1;
    const maxSpend = Math.max(...clusterStats.map(s => s.totalSpend / s.count)) || 1;

    // Features structured as angles
    return [
      {
        subject: 'Recency (Lower is Better)',
        'High Value': 100 - (clusterStats.find(s => s.persona === 'High Value')?.avgRecency || 0) / maxRecency * 100,
        'Loyal': 100 - (clusterStats.find(s => s.persona === 'Loyal')?.avgRecency || 0) / maxRecency * 100,
        'Frequent': 100 - (clusterStats.find(s => s.persona === 'Frequent')?.avgRecency || 0) / maxRecency * 100,
        'Occasional': 100 - (clusterStats.find(s => s.persona === 'Occasional')?.avgRecency || 0) / maxRecency * 100,
        'At Risk': 100 - (clusterStats.find(s => s.persona === 'At Risk')?.avgRecency || 0) / maxRecency * 100,
      },
      {
        subject: 'Frequency',
        'High Value': (clusterStats.find(s => s.persona === 'High Value')?.avgFrequency || 0) / maxFrequency * 100,
        'Loyal': (clusterStats.find(s => s.persona === 'Loyal')?.avgFrequency || 0) / maxFrequency * 100,
        'Frequent': (clusterStats.find(s => s.persona === 'Frequent')?.avgFrequency || 0) / maxFrequency * 100,
        'Occasional': (clusterStats.find(s => s.persona === 'Occasional')?.avgFrequency || 0) / maxFrequency * 100,
        'At Risk': (clusterStats.find(s => s.persona === 'At Risk')?.avgFrequency || 0) / maxFrequency * 100,
      },
      {
        subject: 'Monetary Spend',
        'High Value': ((clusterStats.find(s => s.persona === 'High Value')?.totalSpend || 0) / (clusterStats.find(s => s.persona === 'High Value')?.count || 1)) / maxSpend * 100,
        'Loyal': ((clusterStats.find(s => s.persona === 'Loyal')?.totalSpend || 0) / (clusterStats.find(s => s.persona === 'Loyal')?.count || 1)) / maxSpend * 100,
        'Frequent': ((clusterStats.find(s => s.persona === 'Frequent')?.totalSpend || 0) / (clusterStats.find(s => s.persona === 'Frequent')?.count || 1)) / maxSpend * 100,
        'Occasional': ((clusterStats.find(s => s.persona === 'Occasional')?.totalSpend || 0) / (clusterStats.find(s => s.persona === 'Occasional')?.count || 1)) / maxSpend * 100,
        'At Risk': ((clusterStats.find(s => s.persona === 'At Risk')?.totalSpend || 0) / (clusterStats.find(s => s.persona === 'At Risk')?.count || 1)) / maxSpend * 100,
      }
    ];
  }, [clusterStats]);

  // Filtered customer list for inspector
  const filteredInspector = useMemo(() => {
    return customers.filter(c => {
      const matchPersona = c.persona === selectedPersona;
      const matchSearch = inspectSearch === '' || c.customer.toLowerCase().includes(inspectSearch.toLowerCase());
      return matchPersona && matchSearch;
    }).sort((a, b) => b.monetary - a.monetary);
  }, [customers, selectedPersona, inspectSearch]);

  // Cluster styling map
  const clusterColors: Record<string, string> = {
    'High Value': '#10b981', // emerald
    'Loyal': '#3b82f6',      // blue
    'Frequent': '#6366f1',   // indigo
    'Occasional': '#f59e0b', // amber
    'At Risk': '#ef4444'      // red
  };

  const personasProfiles = [
    {
      name: 'High Value',
      desc: 'Top-tier buyers spending maximum amounts with low recency (recent purchases).',
      strategy: 'VIP loyalty rewards, dedicated assistance, priority service, and early access to campaigns.',
      icon: Award
    },
    {
      name: 'Loyal',
      desc: 'High-frequency purchasers who buy consistently but spend slightly less per basket than VIPs.',
      strategy: 'Upsell premium product lines, offer bundle discounts, and encourage referral programs.',
      icon: ShieldCheck
    },
    {
      name: 'Frequent',
      desc: 'Moderate spend and frequency with active/recent engagement.',
      strategy: 'Cross-sell related sub-categories and provide time-sensitive promotions to trigger purchases.',
      icon: TrendingUp
    },
    {
      name: 'Occasional',
      desc: 'Low-frequency buyers who purchase during holiday seasons or specific discount sales.',
      strategy: 'Re-engage via personalized seasonal email campaigns and push coupon codes.',
      icon: Clock
    },
    {
      name: 'At Risk',
      desc: 'Dormant buyers who spent previously but have not purchased in over 200+ days.',
      strategy: 'Win-back campaigns with heavy discounts (25%+) or feedback surveys to address friction.',
      icon: AlertTriangle
    }
  ];

  if (loading || customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Users className="w-10 h-10 text-cyan-500 animate-pulse" />
        <span className="text-sm font-bold text-slate-400">Performing RFM K-Means Segmentation...</span>
      </div>
    );
  }

  // PCA dataset mapping for Recharts Scatter plot (subsampled for speed)
  const pcaScatterData = customers.filter((_, idx) => idx % 2 === 0).map(c => ({
    x: parseFloat(c.pc1.toFixed(2)),
    y: parseFloat(c.pc2.toFixed(2)),
    customer: c.customer,
    persona: c.persona,
    monetary: c.monetary
  }));

  const CustomPCATooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pt = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-slate-800 dark:text-white">{pt.customer}</p>
          <p className="text-[10px] text-slate-400">Segment: <span className="font-bold" style={{ color: clusterColors[pt.persona] }}>{pt.persona}</span></p>
          <p className="text-slate-500 dark:text-slate-400">Monetary Spend: <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(pt.monetary)}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-l-4 border-cyan-650 pl-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Customer Analytics</h2>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">RFM Customer Segmentation Dashboard</h3>
      </div>

      {/* PCA Scatter Plot & Segment Heads Count */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* PCA 2D Plot (2/3 width) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-cyan-500" /> 2D Principal Component Analysis (PCA) Space
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Projecting 3D RFM features into a 2D space to visualize cluster separation</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                <XAxis type="number" dataKey="x" name="PC1" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} label={{ value: 'PC1 (Spend/Freq Velocity)', position: 'insideBottom', offset: -5, fontSize: 9 }} />
                <YAxis type="number" dataKey="y" name="PC2" stroke="rgba(148, 163, 184, 0.6)" fontSize={10} tickLine={false} label={{ value: 'PC2 (Recency Latency)', angle: -90, position: 'insideLeft', fontSize: 9 }} />
                <Tooltip content={<CustomPCATooltip />} />
                
                {['High Value', 'Loyal', 'Frequent', 'Occasional', 'At Risk'].map(persona => {
                  const data = pcaScatterData.filter(d => d.persona === persona);
                  return (
                    <Scatter 
                      key={persona} 
                      name={persona} 
                      data={data} 
                      fill={clusterColors[persona]} 
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Headcount Share Distribution (1/3 width) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">Segment Share Distribution</h3>
            <span className="text-[10px] text-slate-400 font-medium">Headcount percentage allocated per K-Means cluster</span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                <XAxis dataKey="persona" stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} />
                <YAxis stroke="rgba(148, 163, 184, 0.6)" fontSize={9} tickLine={false} tickFormatter={(val)=>`${val}%`} />
                <Tooltip formatter={(v) => [`${(v as number).toFixed(1)}%`, 'Share']} />
                <Bar dataKey="percentage" name="Share" radius={[4, 4, 0, 0]} barSize={25}>
                  {clusterStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={clusterColors[entry.persona] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Segment Profiling Radar & Persona Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Radar Centroid Profile (1/3 width) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">Centroid Profile Radar</h3>
            <span className="text-[10px] text-slate-400 font-medium">Normalized RFM metrics per cluster centroid (Outer = Stronger performance)</span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.15)" />
                <PolarAngleAxis dataKey="subject" fontSize={9} stroke="rgba(148, 163, 184, 0.8)" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} stroke="rgba(148, 163, 184, 0.3)" />
                
                <Radar name="High Value" dataKey="High Value" stroke={clusterColors['High Value']} fill={clusterColors['High Value']} fillOpacity={0.15} />
                <Radar name="Loyal" dataKey="Loyal" stroke={clusterColors['Loyal']} fill={clusterColors['Loyal']} fillOpacity={0.1} />
                <Radar name="At Risk" dataKey="At Risk" stroke={clusterColors['At Risk']} fill={clusterColors['At Risk']} fillOpacity={0.05} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Persona Strategy Guides (2/3 width) */}
        <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm xl:col-span-2 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">Customer Persona Strategy Handbook</h3>
            <span className="text-[10px] text-slate-400 font-medium">Actionable marketing and retention workflows per cohort profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {personasProfiles.map(profile => {
              const ProfileIcon = profile.icon;
              const stats = clusterStats.find(s => s.persona === profile.name);
              const color = clusterColors[profile.name];
              const isSelected = selectedPersona === profile.name;

              return (
                <button
                  key={profile.name}
                  onClick={() => setSelectedPersona(profile.name)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all space-y-2 h-[200px]
                    ${isSelected 
                      ? 'border-cyan-500 bg-cyan-50/15 dark:bg-cyan-950/10' 
                      : 'border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/20 hover:border-slate-250'
                    }
                  `}
                >
                  <div className="flex justify-between items-start w-full">
                    <span 
                      className="p-1.5 rounded-lg text-white"
                      style={{ backgroundColor: color }}
                    >
                      <ProfileIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {stats ? stats.percentage.toFixed(0) : '0'}% share
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-white">{profile.name}</h4>
                    <p className="text-[9px] text-slate-450 leading-relaxed truncate-3-lines">{profile.desc}</p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-900/50 pt-2 w-full">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Campaign Focus:</span>
                    <p className="text-[8.5px] font-semibold text-slate-600 dark:text-slate-450 truncate-2-lines">{profile.strategy}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Customer Inspector Grid Table */}
      <section className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm space-y-5">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-900 pb-4 gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Cohort Account Ledger: {selectedPersona}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
              Showing {filteredInspector.length} accounts matching filter
            </span>
          </div>

          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search customer account..."
              value={inspectSearch}
              onChange={e => setInspectSearch(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 font-bold">
                <th className="py-2.5">Customer Name</th>
                <th className="py-2.5">Recency (Days Since Last Order)</th>
                <th className="py-2.5 text-right">Frequency (Orders Count)</th>
                <th className="py-2.5 text-right">Monetary Spend (Gross ₹)</th>
                <th className="py-2.5 text-right">Average Applied Discount</th>
                <th className="py-2.5 text-right">Retention Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-900/50">
              {filteredInspector.slice(0, 10).map(c => {
                const isAtRisk = c.persona === 'At Risk';
                return (
                  <tr key={c.customer} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="py-3 font-semibold text-slate-850 dark:text-slate-150">{c.customer}</td>
                    <td className="py-3 font-mono font-medium text-slate-655">{c.recency} days</td>
                    <td className="py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{c.frequency}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-850 dark:text-white">{formatCurrency(c.monetary)}</td>
                    <td className="py-3 text-right font-mono font-medium text-slate-655">{(c.avgDiscount * 100).toFixed(1)}%</td>
                    <td className="py-3 text-right font-semibold">
                      {isAtRisk ? (
                        <span className="text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-200/50">Chrun Threat</span>
                      ) : (
                        <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200/55 flex items-center gap-0.5 inline-flex"><CheckCircle className="w-3 h-3" /> Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredInspector.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No accounts match search filter</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

    </div>
  );
}
