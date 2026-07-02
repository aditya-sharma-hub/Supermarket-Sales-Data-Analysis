"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Info } from 'lucide-react';

interface InsightCardProps {
  insights: string[];
  type?: 'info' | 'tip';
}

export function InsightCard({ insights, type = 'tip' }: InsightCardProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-xl border mb-6 flex gap-3 items-start transition-colors duration-300
        ${type === 'tip'
          ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
          : 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/30 text-blue-800 dark:text-blue-300'
        }
      `}
    >
      <div className={`mt-0.5 p-1 rounded-md shrink-0
        ${type === 'tip' 
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }
      `}>
        {type === 'tip' ? <Lightbulb className="w-4 h-4" /> : <Info className="w-4 h-4" />}
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-90">
          {type === 'tip' ? 'Business Insights' : 'System Note'}
        </h4>
        <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed opacity-95">
          {insights.map((insight, idx) => (
            <li key={idx} className="marker:text-current">
              {insight}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
