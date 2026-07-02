"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesRecord } from '../types/sales';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  Download, 
  ArrowUpDown, 
  EyeOff, 
  Eye, 
  Sliders,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { InsightCard } from '../components/shared/InsightCard';

interface InteractiveDataTableProps {
  data: SalesRecord[];
}

interface ColumnConfig {
  key: keyof SalesRecord;
  label: string;
  visible: boolean;
  align: 'left' | 'right';
  formatter?: (val: any) => string;
}

export function InteractiveDataTable({ data }: InteractiveDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SalesRecord>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showColDrawer, setShowColDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'id', label: 'Order ID', visible: true, align: 'left' },
    { key: 'date', label: 'Order Date', visible: true, align: 'left' },
    { key: 'customer', label: 'Customer', visible: true, align: 'left' },
    { key: 'category', label: 'Category', visible: true, align: 'left' },
    { key: 'subCategory', label: 'Sub Category', visible: true, align: 'left' },
    { key: 'city', label: 'City', visible: true, align: 'left' },
    { key: 'region', label: 'Region', visible: true, align: 'left' },
    { key: 'sales', label: 'Sales', visible: true, align: 'right', formatter: formatCurrency },
    { key: 'discount', label: 'Discount', visible: true, align: 'right', formatter: (val) => `${(val * 100).toFixed(0)}%` },
    { key: 'profit', label: 'Profit', visible: true, align: 'right', formatter: formatCurrency },
    { key: 'quantity', label: 'Quantity', visible: true, align: 'right', formatter: formatNumber },
  ]);

  const toggleColumnVisibility = (key: keyof SalesRecord) => {
    setColumns(prev => 
      prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col)
    );
  };

  // 2. Local Table Search memoized
  const searchedData = useMemo(() => {
    if (!searchTerm) return data;
    const query = searchTerm.toLowerCase();

    return data.filter(r => 
      r.id.toLowerCase().includes(query) ||
      r.customer.toLowerCase().includes(query) ||
      r.city.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      r.subCategory.toLowerCase().includes(query) ||
      r.region.toLowerCase().includes(query)
    );
  }, [data, searchTerm]);

  // 3. Table Sort memoized
  const sortedData = useMemo(() => {
    const sorted = [...searchedData];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        const numA = valA as number;
        const numB = valB as number;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
    });
    return sorted;
  }, [searchedData, sortField, sortDirection]);

  // Reset page when data/searches change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, data.length]);

  // 4. Pagination math
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: keyof SalesRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ledger Insights computation
  const ledgerInsights = useMemo(() => {
    if (data.length === 0) return [];
    
    const totalSales = data.reduce((sum, r) => sum + r.sales, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
    const avgDiscount = data.length === 0 ? 0 : data.reduce((sum, r) => sum + r.discount, 0) / data.length;

    return [
      `The filtered set contains **${data.length}** transactions generating **${formatCurrency(totalSales)}** in sales and **${formatCurrency(totalProfit)}** in net profit.`,
      `Average discount offered on these matching orders stands at **${(avgDiscount * 100).toFixed(1)}%**.`
    ];
  }, [data]);

  // 5. CSV Export Helper
  const handleExportCSV = (filename: string = 'supermart_data.csv') => {
    if (sortedData.length === 0) return;
    const visibleCols = columns.filter(c => c.visible);
    const csvHeaders = visibleCols.map(c => `"${c.label}"`).join(',');
    const csvRows = sortedData.map(r => 
      visibleCols.map(c => {
        let val = r[c.key];
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
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTableContent = () => (
    <div className="space-y-4 flex flex-col h-full justify-between">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="max-w-xs w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search this grid..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end">
          {/* Column Toggle Drawer */}
          <div className="relative">
            <button
              onClick={() => setShowColDrawer(!showColDrawer)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm focus:outline-none cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Columns
            </button>

            <AnimatePresence>
              {showColDrawer && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-1.5 z-40 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2.5 space-y-0.5"
                >
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1.5">Toggle Columns</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {columns.map(col => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumnVisibility(col.key)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-355 cursor-pointer"
                      >
                        <span>{col.label}</span>
                        {col.visible ? (
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Excel Export */}
          <button
            onClick={() => handleExportCSV('supermart_data_excel.csv')}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-xs font-bold text-slate-755 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm focus:outline-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Excel Export
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen view"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className={`overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-xl ${isFullscreen ? 'flex-1 max-h-[60vh]' : 'max-h-[480px]'}`}>
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-xs text-left relative">
          <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider sticky top-0 backdrop-blur-md z-10 border-b border-slate-150 dark:border-slate-850">
            <tr>
              {columns
                .filter(c => c.visible)
                .map(col => (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3 font-bold cursor-pointer hover:text-slate-700 dark:hover:text-white select-none whitespace-nowrap
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                  >
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                      {col.label}
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-slate-100 dark:divide-slate-900">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.filter(c => c.visible).length} className="px-4 py-12 text-center text-slate-400">
                  No records match search parameters.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr key={item.id + idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                  {columns
                    .filter(c => c.visible)
                    .map(col => {
                      const rawVal = item[col.key];
                      const formatted = col.formatter ? col.formatter(rawVal) : String(rawVal);
                      const isProfit = col.key === 'profit';
                      
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap
                            ${col.align === 'right' ? 'text-right' : 'text-left'}
                            ${isProfit ? (item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-450 font-bold' : 'text-red-500 font-bold') : ''}
                            ${col.key === 'id' ? 'font-mono text-[10px] text-slate-450' : ''}
                          `}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-900/50">
        <div>
          Showing <span className="font-bold text-slate-800 dark:text-slate-350">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</span> to{' '}
          <span className="font-bold text-slate-800 dark:text-slate-350">{Math.min(totalRecords, currentPage * pageSize)}</span> of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-350">{totalRecords}</span> entries
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none"
            >
              {[10, 25, 50, 100].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <span className="px-2">
              Page <span className="font-bold text-slate-800 dark:text-slate-300">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-300">{totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Table Ledger Insights */}
      <InsightCard insights={ledgerInsights} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 shadow-sm"
      >
        {renderTableContent()}
      </motion.div>

      {/* Fullscreen Overlay Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 md:p-10"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col p-6 shadow-2xl relative"
            >
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="mb-4 pr-10">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Transactional Ledger Grid
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Complete transaction logging, auditing, and export utilities
                  </p>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative">
                  {renderTableContent()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
