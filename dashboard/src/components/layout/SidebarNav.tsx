"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Database, 
  Scale, 
  Brain, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Briefcase, 
  Bot, 
  BookOpen, 
  Info 
} from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Executive Dashboard', icon: BarChart3, color: 'text-blue-500' },
    { href: '/prep', label: 'Data Preprocessing', icon: Database, color: 'text-purple-500' },
    { href: '/statistics', label: 'Statistical Analysis', icon: Scale, color: 'text-emerald-500' },
    { href: '/ml', label: 'Machine Learning', icon: Brain, color: 'text-indigo-500' },
    { href: '/forecasting', label: 'Sales Forecasting', icon: TrendingUp, color: 'text-pink-500' },
    { href: '/segmentation', label: 'Customer Segmentation', icon: Users, color: 'text-cyan-500' },
    { href: '/anomalies', label: 'Anomaly Detection', icon: AlertTriangle, color: 'text-red-500' },
    { href: '/bi', label: 'Business Intelligence', icon: Briefcase, color: 'text-amber-500' },
    { href: '/ai-analyst', label: 'AI Business Analyst', icon: Bot, color: 'text-teal-500' },
    { href: '/docs', label: 'Documentation', icon: BookOpen, color: 'text-slate-500' },
    { href: '/about', label: 'About Project', icon: Info, color: 'text-indigo-400' },
  ];

  return (
    <nav className="flex flex-col items-center py-6 w-16 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md transition-colors duration-300 shrink-0 print:hidden z-10 select-none">
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' 
                  : 'text-slate-500 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-6 rounded-r bg-blue-600 dark:bg-blue-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-105" />

              {/* Custom Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-[11px] font-semibold text-white shadow-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-200 origin-left whitespace-nowrap z-50">
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
