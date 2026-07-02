export interface SalesRecord {
  id: string;
  customer: string;
  category: string;
  subCategory: string;
  city: string;
  date: string; // YYYY-MM-DD
  region: string;
  sales: number;
  discount: number; // e.g. 0.12 for 12%
  profit: number;
  state: string;
  quantity: number; // derived (sales % 9) + 1
}

export interface DashboardFilters {
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  regions: string[];
  states: string[];
  cities: string[];
  categories: string[];
  subCategories: string[];
  customerSearch: string;
  discountRange: [number, number]; // [min, max] from 0 to 1
  salesRange: [number, number];    // [min, max]
}

export interface KPICardData {
  title: string;
  value: string | number;
  change: number; // percentage change
  trend: 'up' | 'down' | 'neutral';
  sparklineData: { value: number }[];
  icon: string; // lucide icon name
  prefix?: string;
  suffix?: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

export type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';
