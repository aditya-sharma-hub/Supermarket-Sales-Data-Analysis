"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, 
  RotateCcw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  ChevronDown, 
  Calendar,
  Layers,
  MapPin,
  Percent,
  TrendingUp,
  User
} from 'lucide-react';
import { DashboardFilters } from '../../types/sales';

interface SidebarFiltersProps {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  uniqueValues: {
    regions: string[];
    states: string[];
    cities: string[];
    categories: string[];
    subCategories: string[];
  };
  filteredCount: number;
  totalCount: number;
  onDownloadCSV: () => void;
}

export function SidebarFilters({
  filters,
  setFilters,
  resetFilters,
  uniqueValues,
  filteredCount,
  totalCount,
  onDownloadCSV,
}: SidebarFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleMultiSelect = (key: 'regions' | 'states' | 'cities' | 'categories' | 'subCategories', value: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleRangeChange = (key: 'salesRange' | 'discountRange', index: 0 | 1, value: number) => {
    setFilters(prev => {
      const nextRange = [...prev[key]] as [number, number];
      nextRange[index] = value;
      // Keep min <= max
      if (index === 0 && nextRange[0] > nextRange[1]) nextRange[0] = nextRange[1];
      if (index === 1 && nextRange[1] < nextRange[0]) nextRange[1] = nextRange[0];
      return { ...prev, [key]: nextRange };
    });
  };

  return (
    <div className="relative flex shrink-0 print:hidden h-[calc(100vh-4rem)]">
      {/* Sidebar Expand/Collapse Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
      >
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Sidebar Content Panel */}
      <motion.div
        animate={{ width: isOpen ? 300 : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-y-auto border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950/40"
      >
        <div className="w-[300px] p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Filters</h2>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 font-semibold">Matched Records</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" /> Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">Start Date</span>
                <input
                  type="date"
                  min="2015-01-02"
                  max="2018-12-30"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full text-xs h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">End Date</span>
                <input
                  type="date"
                  min="2015-01-02"
                  max="2018-12-30"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full text-xs h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Regional Filters (Region, State, City) */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" /> Regional Filters
            </label>

            {/* Region Dropdown */}
            <DropdownSelector
              label="Select Regions"
              items={uniqueValues.regions}
              selectedItems={filters.regions}
              isOpen={activeDropdown === 'regions'}
              onToggle={() => toggleDropdown('regions')}
              onSelect={(val) => handleMultiSelect('regions', val)}
            />

            {/* State Dropdown (Locked to Tamil Nadu, but shows selection UI) */}
            <div className="relative">
              <div className="flex h-9 items-center justify-between px-3 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-slate-900/10 text-xs text-slate-400 cursor-not-allowed">
                <span>Tamil Nadu (1 Selected)</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold border border-slate-200 dark:border-slate-800 px-1 rounded bg-white dark:bg-slate-950">Locked</span>
              </div>
            </div>

            {/* City Dropdown */}
            <DropdownSelector
              label="Select Cities"
              items={uniqueValues.cities}
              selectedItems={filters.cities}
              isOpen={activeDropdown === 'cities'}
              onToggle={() => toggleDropdown('cities')}
              onSelect={(val) => handleMultiSelect('cities', val)}
            />
          </div>

          {/* Product Filters (Category, Sub Category) */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> Product Categories
            </label>

            {/* Category Dropdown */}
            <DropdownSelector
              label="Select Categories"
              items={uniqueValues.categories}
              selectedItems={filters.categories}
              isOpen={activeDropdown === 'categories'}
              onToggle={() => toggleDropdown('categories')}
              onSelect={(val) => handleMultiSelect('categories', val)}
            />

            {/* Sub Category Dropdown */}
            <DropdownSelector
              label="Select Sub Categories"
              items={uniqueValues.subCategories}
              selectedItems={filters.subCategories}
              isOpen={activeDropdown === 'subCategories'}
              onToggle={() => toggleDropdown('subCategories')}
              onSelect={(val) => handleMultiSelect('subCategories', val)}
            />
          </div>

          {/* Customer Search / Filter */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" /> Customer Name
            </label>
            <input
              type="text"
              placeholder="Search customer name..."
              value={filters.customerSearch}
              onChange={(e) => setFilters(prev => ({ ...prev, customerSearch: e.target.value }))}
              className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Price Range Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Sales Value
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 lowercase font-medium">
                ₹{filters.salesRange[0]} - ₹{filters.salesRange[1]}
              </span>
            </div>
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block mb-1">Min Value</span>
                <input
                  type="range"
                  min="500"
                  max="2500"
                  step="50"
                  value={filters.salesRange[0]}
                  onChange={(e) => handleRangeChange('salesRange', 0, parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-650"
                />
              </div>
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block mb-1">Max Value</span>
                <input
                  type="range"
                  min="500"
                  max="2500"
                  step="50"
                  value={filters.salesRange[1]}
                  onChange={(e) => handleRangeChange('salesRange', 1, parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-650"
                />
              </div>
            </div>
          </div>

          {/* Discount Range Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" /> Discount Rate
              </span>
              <span className="text-[10px] text-orange-600 dark:text-orange-400 lowercase font-medium">
                {(filters.discountRange[0] * 100).toFixed(0)}% - {(filters.discountRange[1] * 100).toFixed(0)}%
              </span>
            </div>
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block mb-1">Min Discount</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.35"
                  step="0.01"
                  value={filters.discountRange[0]}
                  onChange={(e) => handleRangeChange('discountRange', 0, parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block mb-1">Max Discount</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.35"
                  step="0.01"
                  value={filters.discountRange[1]}
                  onChange={(e) => handleRangeChange('discountRange', 1, parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
            {/* Reset Button */}
            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            {/* CSV Download Button */}
            <button
              onClick={onDownloadCSV}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/10 transition-colors focus:outline-none"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Sub-component: custom Dropdown Selector with Multi-select Checkboxes
interface DropdownSelectorProps {
  label: string;
  items: string[];
  selectedItems: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (val: string) => void;
}

function DropdownSelector({
  label,
  items,
  selectedItems,
  isOpen,
  onToggle,
  onSelect,
}: DropdownSelectorProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`flex h-9 w-full items-center justify-between px-3 rounded-lg border text-xs text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20
          ${selectedItems.length > 0
            ? 'border-blue-500/50 bg-blue-50/20 text-blue-700 dark:text-blue-300 dark:border-blue-700/50'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350'
          }
        `}
      >
        <span className="truncate max-w-[200px]">
          {selectedItems.length === 0
            ? label
            : `${selectedItems.length} selected`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-1.5 z-50 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-2 space-y-0.5"
          >
            {items.length === 0 ? (
              <span className="block text-[11px] text-slate-400 p-2 text-center">No options available</span>
            ) : (
              items.map(item => {
                const isSelected = selectedItems.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => onSelect(item)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors
                      ${isSelected ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}
                    `}
                  >
                    <span className="truncate pr-4">{item}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
