'use client';

import React, { useEffect, useState } from 'react';
import { 
  Store, 
  CheckCircle2, 
  Clock, 
  Tv, 
  TrendingUp, 
  Filter, 
  RotateCcw, 
  Building2, 
  MapPin, 
  Award,
  Loader2,
  HardDrive,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';

const CHART_COLORS = ['#005bac', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#84cc16'];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [customers, setCustomers] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [systemStatus, setSystemStatus] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCustomer && selectedCustomer !== 'all') params.append('customer', selectedCustomer);
      if (selectedRegion && selectedRegion !== 'all') params.append('region', selectedRegion);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData.data);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load: Fetch filter options, dashboard stats and system storage status
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const res = await fetch('/api/admin/dimensions/stores?limit=1');
        const d = await res.json();
        if (d.success && d.filters) {
          setCustomers(d.filters.customers || []);
          setRegions(d.filters.regions || []);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const loadSystemStatus = async () => {
      try {
        const res = await fetch('/api/admin/system-status');
        const d = await res.json();
        if (d.success) {
          setSystemStatus(d);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadFilterOptions();
    loadSystemStatus();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCustomer, selectedRegion, startDate, endDate]);

  const handleResetFilters = () => {
    setSelectedCustomer('all');
    setSelectedRegion('all');
    setStartDate('');
    setEndDate('');
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading dashboard data...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalActiveStores: 0,
    surveyedStoresCount: 0,
    pendingStoresCount: 0,
    coveragePercentage: 0,
    totalDisplayUnits: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Display Survey Analytics & Store Coverage Dashboard
          </p>
        </div>

        {/* Persistent Storage Health Pill */}
        {systemStatus && (
          <div className="flex items-center gap-2">
            {systemStatus.isPersistentVolume ? (
              <div 
                className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs"
                title={`Database: ${systemStatus.dbPath} (${systemStatus.dbSizeFormatted})`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Storage: Persistent Volume Active ({systemStatus.dataDir})</span>
              </div>
            ) : (
              <div 
                className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2 shadow-xs"
                title="Please mount a Railway Volume to /data or /app/data to preserve SQLite data across deploys."
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Storage: Ephemeral (No Railway Volume mounted to /data)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-700" />
          Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Customer */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Display Units */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Display Units</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono">
            {summary.totalDisplayUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Units on display at stores</div>
        </div>

        {/* Card 2: Survey Coverage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Survey Coverage</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
            {summary.coveragePercentage}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.surveyedStoresCount} of {summary.totalActiveStores} Active stores
          </div>
        </div>

        {/* Card 3: Surveyed Stores */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Stores Surveyed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-purple-700 font-mono">
            {summary.surveyedStoresCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Stores with survey data</div>
        </div>

        {/* Card 4: Pending Stores */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Stores Not Surveyed</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
            {summary.pendingStoresCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Stores pending survey</div>
        </div>
      </div>

      {/* Interactive Charts Row 1: Brand Breakdown & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Display Units Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700" />
            Display Units by Brand (Top Brands)
          </h3>
          {data?.brandBreakdown?.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.brandBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="Brand" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} units`, 'Display Units']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_qty" fill="#005bac" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
              No survey data available
            </div>
          )}
        </div>

        {/* Category Breakdown Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tv className="w-4 h-4 text-blue-700" />
            Display Units by Category
          </h3>
          {data?.categoryBreakdown?.length > 0 ? (
            <div className="h-72 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="total_qty"
                    nameKey="Category"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {data.categoryBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} units`, 'Display Units']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
              No survey data available
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Customer Coverage Breakdown & Top 10 Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Breakdown Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-700" />
            Progress by Customer
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-2">Customer</th>
                  <th className="py-2.5 px-2 text-right">Total Stores</th>
                  <th className="py-2.5 px-2 text-right">Surveyed</th>
                  <th className="py-2.5 px-2 text-right">Total Display</th>
                  <th className="py-2.5 px-2 text-right">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {data?.customerBreakdown?.map((c: any) => {
                  const cov = c.total_stores > 0 ? ((c.surveyed_stores / c.total_stores) * 100).toFixed(0) : '0';
                  return (
                    <tr key={c.Customer} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-semibold text-slate-900">{c.Customer}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{c.total_stores}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-purple-700">{c.surveyed_stores}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700">{c.total_units}</td>
                      <td className="py-2.5 px-2 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          Number(cov) >= 80 ? 'bg-emerald-100 text-emerald-800' :
                          Number(cov) >= 40 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cov}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Stores by Display Units */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-700" />
            Top 10 Stores by Display
          </h3>
          {data?.topStores?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-2">Store</th>
                    <th className="py-2.5 px-2">Customer</th>
                    <th className="py-2.5 px-2">Province</th>
                    <th className="py-2.5 px-2 text-right">Total Display</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {data.topStores.map((s: any, idx: number) => (
                    <tr key={s.STORE_ID} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-semibold text-slate-900">
                        <span className="inline-block w-5 text-slate-400 font-mono">#{idx + 1}</span>
                        {s.Store_Name_TH}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{s.Customer}</td>
                      <td className="py-2.5 px-2 text-slate-500">{s.Province_TH}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700">
                        {s.total_units} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No survey data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
