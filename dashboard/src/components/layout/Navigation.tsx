"use client";

import React from 'react';
import { useTheme } from '../shared/ThemeProvider';
import { Sun, Moon, FileText, Search, BarChart3 } from 'lucide-react';

interface NavigationProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
}

export function Navigation({ searchQuery, onSearchChange }: NavigationProps) {
  const { theme, toggleTheme } = useTheme();

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300 print:hidden">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Side: Branding */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 dark:bg-blue-500 text-white shadow-md shadow-blue-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-950 dark:text-white leading-tight">
              SuperMart Analytics
            </h1>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex max-w-md w-full mx-8 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Global search by customer name or city..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Right Side: Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Export PDF Button */}
          <button
            onClick={handlePrint}
            title="Export Dashboard to PDF"
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {theme === 'light' ? (
              <Moon className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            ) : (
              <Sun className="w-4.5 h-4.5 text-yellow-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
