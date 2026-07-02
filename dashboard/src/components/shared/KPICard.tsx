"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  sparklineData: { value: number }[];
  icon: string;
  prefix?: string;
  suffix?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  isPercentage?: boolean;
}

// 1. Timezone-safe & hardware-accelerated count-up animation
function AnimatedValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 800,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    const startVal = previousValue.current;
    const endVal = value;

    let animFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      const currentVal = startVal + easeProgress * (endVal - startVal);

      setDisplayValue(currentVal);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        previousValue.current = endVal;
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameId);
  }, [value, duration]);

  const formatted = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span>{prefix}{formatted}{suffix}</span>;
}

// 2. High-performance, zero-dependency SVG sparkline generator
function Sparkline({ data, color }: { data: { value: number }[]; color: string }) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const width = 100;
  const height = 30;
  const padding = 2;

  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    // Invert y because SVG y goes down
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Map theme color to strokes
  const strokeColors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
    red: '#ef4444',
    gray: '#64748b',
  };

  const fillColors: Record<string, string> = {
    blue: 'rgba(59, 130, 246, 0.1)',
    green: 'rgba(16, 185, 129, 0.1)',
    orange: 'rgba(249, 115, 22, 0.1)',
    red: 'rgba(239, 68, 68, 0.1)',
    gray: 'rgba(100, 116, 137, 0.1)',
  };

  const stroke = strokeColors[color] || strokeColors.gray;
  const fill = fillColors[color] || fillColors.gray;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color})`} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KPICard({
  title,
  value,
  change,
  trend,
  sparklineData,
  icon,
  prefix = '',
  suffix = '',
  color = 'gray',
  isPercentage = false,
}: KPICardProps) {
  // Resolve Lucide icon dynamically
  const IconComponent = (Icons as any)[icon] || Icons.HelpCircle;

  const colorClasses = {
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    green: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
    orange: {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100/60 dark:border-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    red: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50/50 dark:bg-red-950/10 border-red-100/60 dark:border-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
    gray: {
      text: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/50 dark:border-slate-800/30',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
  }[color];

  // Determine decimals (percentages need 1 decimal, e.g., 12.3%, profit margin 23.4%)
  let decimals = 0;
  let adjustValue = value;
  if (isPercentage || title.toLowerCase().includes('margin') || suffix === '%') {
    decimals = 1;
    // If the value is a fraction (e.g. 0.235) and suffix is %, multiply by 100
    if (value <= 1 && value >= -1 && suffix === '%') {
      adjustValue = value * 100;
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`p-5 rounded-2xl border bg-white dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[160px]`}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${colorClasses.iconBg} transition-colors`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          <AnimatedValue value={adjustValue} prefix={prefix} suffix={suffix} decimals={decimals} />
        </h2>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-900 pt-3">
        {/* Prior period change */}
        <div className="flex items-center gap-1.5 shrink-0">
          {trend === 'up' && (
            <Icons.TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          {trend === 'down' && (
            <Icons.TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
          )}
          {trend === 'neutral' && (
            <Icons.Minus className="w-4 h-4 text-slate-400" />
          )}
          <span
            className={`text-xs font-bold ${
              trend === 'up'
                ? 'text-emerald-600 dark:text-emerald-400'
                : trend === 'down'
                ? 'text-red-500 dark:text-red-400'
                : 'text-slate-400'
            }`}
          >
            {trend !== 'neutral' ? (change > 0 ? '+' : '') : ''}
            {change.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">prior</span>
        </div>

        {/* Sparkline chart */}
        <div className="w-24 shrink-0">
          <Sparkline data={sparklineData} color={color} />
        </div>
      </div>
    </motion.div>
  );
}
