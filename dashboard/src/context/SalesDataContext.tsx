"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SalesRecord, DashboardFilters } from '../types/sales';

const INITIAL_FILTERS: DashboardFilters = {
  dateRange: {
    start: '2015-01-01',
    end: '2018-12-31',
  },
  regions: [],
  states: [],
  cities: [],
  categories: [],
  subCategories: [],
  customerSearch: '',
  discountRange: [0.10, 0.35],
  salesRange: [500, 2500],
};

interface SalesDataContextProps {
  originalData: SalesRecord[];
  filteredData: SalesRecord[];
  priorPeriodData: SalesRecord[];
  loading: boolean;
  error: string | null;
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
  kpis: any;
}

const SalesDataContext = createContext<SalesDataContextProps | undefined>(undefined);

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPriorPeriod(startStr: string, endStr: string): { start: string; end: string } {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const priorStart = new Date(start);
  priorStart.setDate(start.getDate() - diffDays);

  const priorEnd = new Date(start);
  priorEnd.setDate(start.getDate() - 1);

  return {
    start: formatDate(priorStart),
    end: formatDate(priorEnd),
  };
}

function generateSparklineData(
  records: SalesRecord[],
  startStr: string,
  endStr: string,
  getValue: (r: SalesRecord) => number
): { value: number }[] {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const intervalCount = 15;
  const step = (end - start) / intervalCount;

  const bins = Array.from({ length: intervalCount }, () => 0);

  for (let i = 0; i < records.length; i++) {
    const recordTime = new Date(records[i].date).getTime();
    if (recordTime >= start && recordTime <= end) {
      let binIdx = Math.floor((recordTime - start) / step);
      if (binIdx >= intervalCount) binIdx = intervalCount - 1;
      if (binIdx >= 0) {
        bins[binIdx] += getValue(records[i]);
      }
    }
  }

  return bins.map(value => ({ value: parseFloat(value.toFixed(2)) }));
}

export function SalesDataProvider({ children }: { children: React.ReactNode }) {
  const [originalData, setOriginalData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(INITIAL_FILTERS);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/data.json');
        if (!res.ok) {
          throw new Error('Failed to load dataset');
        }
        const data = await res.json();
        setOriginalData(data);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Something went wrong');
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const uniqueValues = useMemo(() => {
    const regions = new Set<string>();
    const states = new Set<string>();
    const cities = new Set<string>();
    const categories = new Set<string>();
    const subCategories = new Set<string>();

    for (let i = 0; i < originalData.length; i++) {
      const r = originalData[i];
      regions.add(r.region);
      states.add(r.state);
      cities.add(r.city);
      categories.add(r.category);
      subCategories.add(r.subCategory);
    }

    return {
      regions: Array.from(regions).sort(),
      states: Array.from(states).sort(),
      cities: Array.from(cities).sort(),
      categories: Array.from(categories).sort(),
      subCategories: Array.from(subCategories).sort(),
    };
  }, [originalData]);

  const filteredData = useMemo(() => {
    if (loading || originalData.length === 0) return [];

    return originalData.filter(item => {
      if (item.date < filters.dateRange.start || item.date > filters.dateRange.end) return false;
      if (filters.regions.length > 0 && !filters.regions.includes(item.region)) return false;
      if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
      if (filters.cities.length > 0 && !filters.cities.includes(item.city)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
      if (filters.subCategories.length > 0 && !filters.subCategories.includes(item.subCategory)) return false;
      if (item.sales < filters.salesRange[0] || item.sales > filters.salesRange[1]) return false;
      if (item.discount < filters.discountRange[0] || item.discount > filters.discountRange[1]) return false;

      if (filters.customerSearch) {
        const query = filters.customerSearch.toLowerCase();
        const customerMatch = item.customer.toLowerCase().includes(query);
        const cityMatch = item.city.toLowerCase().includes(query);
        if (!customerMatch && !cityMatch) return false;
      }

      return true;
    });
  }, [originalData, filters, loading]);

  const priorPeriodData = useMemo(() => {
    if (loading || originalData.length === 0) return [];

    const prior = getPriorPeriod(filters.dateRange.start, filters.dateRange.end);

    return originalData.filter(item => {
      if (item.date < prior.start || item.date > prior.end) return false;
      if (filters.regions.length > 0 && !filters.regions.includes(item.region)) return false;
      if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
      if (filters.cities.length > 0 && !filters.cities.includes(item.city)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
      if (filters.subCategories.length > 0 && !filters.subCategories.includes(item.subCategory)) return false;
      if (item.sales < filters.salesRange[0] || item.sales > filters.salesRange[1]) return false;
      if (item.discount < filters.discountRange[0] || item.discount > filters.discountRange[1]) return false;

      if (filters.customerSearch) {
        const query = filters.customerSearch.toLowerCase();
        const customerMatch = item.customer.toLowerCase().includes(query);
        const cityMatch = item.city.toLowerCase().includes(query);
        if (!customerMatch && !cityMatch) return false;
      }

      return true;
    });
  }, [originalData, filters, loading]);

  const kpiData = useMemo(() => {
    const calcStats = (data: SalesRecord[]) => {
      let sales = 0;
      let profit = 0;
      let discountSum = 0;
      let quantity = 0;
      const orders = data.length;
      const customers = new Set<string>();
      const cities = new Set<string>();

      for (let i = 0; i < data.length; i++) {
        const r = data[i];
        sales += r.sales;
        profit += r.profit;
        discountSum += r.discount;
        quantity += r.quantity;
        customers.add(r.customer);
        cities.add(r.city);
      }

      const profitMargin = sales === 0 ? 0 : profit / sales;
      const avgOrderValue = orders === 0 ? 0 : sales / orders;
      const avgDiscount = orders === 0 ? 0 : discountSum / orders;

      return {
        sales,
        profit,
        profitMargin,
        orders,
        avgOrderValue,
        avgDiscount,
        customers: customers.size,
        cities: cities.size,
      };
    };

    const current = calcStats(filteredData);
    const prior = calcStats(priorPeriodData);

    const getPercentChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const sparklines = {
      sales: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, r => r.sales),
      profit: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, r => r.profit),
      margin: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, r => r.profit),
      orders: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, () => 1),
      aov: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, r => r.sales),
      discount: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, r => r.discount * 100),
      customers: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, () => 1),
      cities: generateSparklineData(filteredData, filters.dateRange.start, filters.dateRange.end, () => 1),
    };

    const getTrend = (change: number): 'up' | 'down' | 'neutral' => {
      if (change > 0.1) return 'up';
      if (change < -0.1) return 'down';
      return 'neutral';
    };

    return {
      sales: {
        title: 'Total Sales',
        value: current.sales,
        change: getPercentChange(current.sales, prior.sales),
        trend: getTrend(getPercentChange(current.sales, prior.sales)),
        sparklineData: sparklines.sales,
        prefix: '₹',
        color: 'blue' as const,
      },
      profit: {
        title: 'Total Profit',
        value: current.profit,
        change: getPercentChange(current.profit, prior.profit),
        trend: getTrend(getPercentChange(current.profit, prior.profit)),
        sparklineData: sparklines.profit,
        prefix: '₹',
        color: 'green' as const,
      },
      margin: {
        title: 'Profit Margin',
        value: current.profitMargin,
        change: getPercentChange(current.profitMargin, prior.profitMargin),
        trend: getTrend(getPercentChange(current.profitMargin, prior.profitMargin)),
        sparklineData: sparklines.margin,
        suffix: '%',
        color: 'green' as const,
      },
      orders: {
        title: 'Total Orders',
        value: current.orders,
        change: getPercentChange(current.orders, prior.orders),
        trend: getTrend(getPercentChange(current.orders, prior.orders)),
        sparklineData: sparklines.orders,
        color: 'blue' as const,
      },
      aov: {
        title: 'Avg Order Value',
        value: current.avgOrderValue,
        change: getPercentChange(current.avgOrderValue, prior.avgOrderValue),
        trend: getTrend(getPercentChange(current.avgOrderValue, prior.avgOrderValue)),
        sparklineData: sparklines.aov,
        prefix: '₹',
        color: 'gray' as const,
      },
      discount: {
        title: 'Avg Discount',
        value: current.avgDiscount,
        change: getPercentChange(current.avgDiscount, prior.avgDiscount),
        trend: getTrend(getPercentChange(current.avgDiscount, prior.avgDiscount)),
        sparklineData: sparklines.discount,
        suffix: '%',
        color: 'orange' as const,
      },
      customers: {
        title: 'Total Customers',
        value: current.customers,
        change: getPercentChange(current.customers, prior.customers),
        trend: getTrend(getPercentChange(current.customers, prior.customers)),
        sparklineData: sparklines.customers,
        color: 'gray' as const,
      },
      cities: {
        title: 'Active Cities',
        value: current.cities,
        change: getPercentChange(current.cities, prior.cities),
        trend: getTrend(getPercentChange(current.cities, prior.cities)),
        sparklineData: sparklines.cities,
        color: 'gray' as const,
      },
    };
  }, [filteredData, priorPeriodData, filters]);

  const value = useMemo(() => ({
    originalData,
    filteredData,
    priorPeriodData,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    uniqueValues,
    kpis: kpiData
  }), [originalData, filteredData, priorPeriodData, loading, error, filters, uniqueValues, kpiData]);

  return (
    <SalesDataContext.Provider value={value}>
      {children}
    </SalesDataContext.Provider>
  );
}

export function useSalesDataContext() {
  const context = useContext(SalesDataContext);
  if (!context) {
    throw new Error('useSalesDataContext must be used within a SalesDataProvider');
  }
  return context;
}
