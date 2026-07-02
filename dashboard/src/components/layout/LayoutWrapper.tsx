"use client";

import React from 'react';
import { useSalesData } from '../../hooks/useSalesData';
import { Navigation } from './Navigation';
import { SidebarFilters } from './SidebarFilters';
import { SidebarNav } from './SidebarNav';
import { ThemeProvider } from '../shared/ThemeProvider';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const {
    filteredData,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    uniqueValues,
  } = useSalesData();

  // Export filtered dataset to CSV
  const handleDownloadFilteredCSV = () => {
    if (filteredData.length === 0) return;

    const columns: (keyof typeof filteredData[0])[] = [
      'id', 'date', 'customer', 'category', 'subCategory', 
      'city', 'region', 'sales', 'discount', 'profit', 'state', 'quantity'
    ];

    const csvHeaders = columns.map(c => `"${c}"`).join(',');
    const csvRows = filteredData.map(r => 
      columns.map(c => {
        let val = r[c];
        if (typeof val === 'string') {
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        }
        return val;
      }).join(',')
    );

    const csvContent = '\uFEFF' + [csvHeaders, ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'supermart_filtered_sales.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearchChange = (val: string) => {
    setFilters(prev => ({ ...prev, customerSearch: val }));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-white">
        <div className="p-8 max-w-md border border-red-200 dark:border-red-900 rounded-2xl bg-white dark:bg-slate-900 shadow-md text-center space-y-4">
          <h2 className="text-xl font-bold text-red-605">Initialization Failed</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {error || 'An unexpected error occurred while bootstrapping the dashboard dataset.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col h-screen overflow-hidden">
          {/* Sticky Header */}
          <Navigation 
            searchQuery={filters?.customerSearch || ''} 
            onSearchChange={handleSearchChange} 
          />

          <div className="flex-1 flex overflow-hidden">
            {/* Far Left: Navigation Icons */}
            <SidebarNav />

            {/* Collapsible Filters Sidebar */}
            <SidebarFilters
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              uniqueValues={uniqueValues}
              filteredCount={filteredData.length}
              totalCount={loading ? 0 : 9994}
              onDownloadCSV={handleDownloadFilteredCSV}
            />

            {/* Scrollable Dashboard Body */}
            <main className="flex-1 overflow-y-auto px-6 py-6 space-y-8 print:p-0 print:overflow-visible">
              {children}
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
