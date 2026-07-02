"use client";

import React from 'react';
import { useSalesData } from '../hooks/useSalesData';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { KPICard } from '../components/shared/KPICard';

// Lazy-loaded analytics sections with error boundary encapsulation
import { SalesTrendChart } from '../charts/SalesTrendChart';
import { CategoryCharts } from '../charts/CategoryCharts';
import { TamilNaduMap } from '../charts/TamilNaduMap';
import { CustomerParetoChart } from '../charts/CustomerParetoChart';
import { ProfitScatterGauge } from '../charts/ProfitScatterGauge';
import { SeasonalHeatmap } from '../charts/SeasonalHeatmap';
import { AdvancedCharts } from '../charts/AdvancedCharts';
import { InteractiveDataTable } from '../charts/InteractiveDataTable';

export default function Dashboard() {
  const {
    filteredData,
    loading,
    filters,
    setFilters,
    kpis,
  } = useSalesData();

  const handleRegionToggleOnMap = (region: string) => {
    setFilters(prev => {
      const active = prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region];
      return { ...prev, regions: active };
    });
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => {
      const active = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: active };
    });
  };

  const handleCityToggle = (city: string) => {
    setFilters(prev => {
      const active = prev.cities.includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city];
      return { ...prev, cities: active };
    });
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <>
      {/* SECTION 1: EXECUTIVE OVERVIEW */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-600 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 1</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Executive Performance Overview</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard {...kpis.sales} icon="DollarSign" />
          <KPICard {...kpis.profit} icon="TrendingUp" />
          <KPICard {...kpis.margin} icon="Percent" />
          <KPICard {...kpis.orders} icon="ShoppingCart" />
          <KPICard {...kpis.aov} icon="Coins" />
          <KPICard {...kpis.discount} icon="Gift" />
          <KPICard {...kpis.customers} icon="Users" />
          <KPICard {...kpis.cities} icon="Building" />
        </div>
      </section>

      {/* SECTION 2: TIME SERIES ANALYSIS */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 2</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Time Series Analysis</h3>
        </div>
        <ErrorBoundary>
          <SalesTrendChart data={filteredData} />
        </ErrorBoundary>
      </section>

      {/* SECTION 3: CATEGORY PERFORMANCE */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 3</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Category Performance</h3>
        </div>
        <ErrorBoundary>
          <CategoryCharts 
            data={filteredData} 
            selectedCategories={filters.categories}
            onCategoryToggle={handleCategoryToggle}
          />
        </ErrorBoundary>
      </section>

      {/* SECTION 4: REGIONAL ANALYTICS */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 4</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Regional Analytics</h3>
        </div>
        <ErrorBoundary>
          <TamilNaduMap 
            data={filteredData} 
            selectedRegions={filters.regions}
            onRegionToggle={handleRegionToggleOnMap}
            selectedCities={filters.cities}
            onCityToggle={handleCityToggle}
          />
        </ErrorBoundary>
      </section>

      {/* SECTION 5: CUSTOMER INSIGHTS */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 5</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Customer Insights</h3>
        </div>
        <ErrorBoundary>
          <CustomerParetoChart data={filteredData} />
        </ErrorBoundary>
      </section>

      {/* SECTION 6: PROFITABILITY ANALYSIS */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 6</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Profitability Analysis</h3>
        </div>
        <ErrorBoundary>
          <ProfitScatterGauge data={filteredData} />
        </ErrorBoundary>
      </section>

      {/* SECTION 7: SEASONAL ANALYSIS */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 7</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Seasonal Analysis</h3>
        </div>
        <ErrorBoundary>
          <SeasonalHeatmap data={filteredData} />
        </ErrorBoundary>
      </section>

      {/* SECTION 8: ADVANCED ANALYTICS */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 8</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Advanced Statistical Analytics</h3>
        </div>
        <ErrorBoundary>
          <AdvancedCharts data={filteredData} />
        </ErrorBoundary>
      </section>

      {/* SECTION 9: INTERACTIVE DATA TABLE */}
      <section className="space-y-4">
        <div className="border-l-4 border-blue-650 pl-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Section 9</h2>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Transactional Ledger Grid</h3>
        </div>
        <ErrorBoundary>
          <InteractiveDataTable data={filteredData} />
        </ErrorBoundary>
      </section>
    </>
  );
}

// Full page skeleton loader mirroring layout
function SkeletonLoader() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* KPIs Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[140px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-6 w-28 bg-slate-250 dark:bg-slate-850 rounded mt-2" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded mt-4" />
          </div>
        ))}
      </div>

      {/* Large Grid Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[380px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5" />
        <div className="h-[380px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5" />
      </div>
    </div>
  );
}
