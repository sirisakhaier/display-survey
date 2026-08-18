'use client';

import React, { useEffect, useState } from 'react';
import { 
  Camera, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  X, 
  RotateCcw, 
  Calendar, 
  User, 
  Phone, 
  Store, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Layers
} from 'lucide-react';
import Papa from 'papaparse';

interface DisplayRequestItem {
  id: number;
  entry_id: number | null;
  store_id: string;
  user_name: string;
  user_phone: string;
  model_name: string;
  quantity: number;
  remark: string;
  picture_url: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  Customer: string;
  STORE_NAME: string;
  Store_Name_TH: string;
  Province_TH: string;
  Region_TH: string;
  Store_ID_Customer?: string;
}

interface KPIState {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalUnitsRequested: number;
}

export default function AdminDisplayRequestsPage() {
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [requests, setRequests] = useState<DisplayRequestItem[]>([]);
  const [kpi, setKpi] = useState<KPIState>({
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalUnitsRequested: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [customer, setCustomer] = useState<string>('all');
  const [region, setRegion] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  // Preview & Delete State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<DisplayRequestItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // Export State
  const [exportingExcelWithPics, setExportingExcelWithPics] = useState<boolean>(false);
  const [exportingExcelNoPics, setExportingExcelNoPics] = useState<boolean>(false);

  // 1. Get auth role
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUserRole(d.user.role);
        }
      });
  }, []);

  // 2. Load filter options
  useEffect(() => {
    fetch('/api/admin/dimensions/stores?limit=1')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.filters) {
          setCustomers(d.filters.customers || []);
          setRegions(d.filters.regions || []);
        }
      });
  }, []);

  // 3. Fetch requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (status && status !== 'all') params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/requests?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        if (data.kpi) setKpi(data.kpi);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error('Error fetching requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, customer, region, status, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCustomer('all');
    setRegion('all');
    setStatus('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // 4. Update Status (Admin Only)
  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (userRole !== 'admin') return;
    setUpdatingStatusId(id);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus as any } : r))
        );
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
      alert('Connection error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // 5. Delete Request (Admin Only)
  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setRequestToDelete(null);
        fetchRequests();
      } else {
        alert(data.error || 'Error deleting request');
      }
    } catch (e) {
      console.error(e);
      alert('Connection error');
    } finally {
      setDeleting(false);
    }
  };

  // 6. Export Excel With Pictures
  const handleExportExcelWithPictures = () => {
    setExportingExcelWithPics(true);
    try {
      const params = new URLSearchParams();
      params.append('with_pictures', 'true');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (status && status !== 'all') params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      window.location.href = `/api/admin/requests/export?${params.toString()}`;
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setExportingExcelWithPics(false), 2000);
    }
  };

  // 7. Export Excel Without Pictures
  const handleExportExcelWithoutPictures = () => {
    setExportingExcelNoPics(true);
    try {
      const params = new URLSearchParams();
      params.append('with_pictures', 'false');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (status && status !== 'all') params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      window.location.href = `/api/admin/requests/export?${params.toString()}`;
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setExportingExcelNoPics(false), 2000);
    }
  };

  // 8. Export CSV
  const handleExportCSV = () => {
    const rows = requests.map((r) => ({
      'Request ID': r.id,
      'Customer': r.Customer,
      'STORE_ID': r.store_id,
      'Store Name TH': r.Store_Name_TH,
      'Province TH': r.Province_TH,
      'Region TH': r.Region_TH,
      'Requested Model': r.model_name,
      'Quantity Requested': r.quantity,
      'Status': r.status,
      'Remark': r.remark,
      'Requested By': r.user_name,
      'Phone': r.user_phone,
      'Request Date': r.created_at,
      'Picture URL': r.picture_url,
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Display_Requests_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-orange-600" />
            <span>Display Model Requests (ขอสินค้าตัวโชว์)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage and track all new display model requests and store location photos submitted by staff
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Button 1: Excel With Pictures */}
          <button
            type="button"
            onClick={handleExportExcelWithPictures}
            disabled={exportingExcelWithPics}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title="Export Excel with embedded location photos"
          >
            {exportingExcelWithPics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Excel (With Pictures)</span>
          </button>

          {/* Button 2: Excel Without Pictures */}
          <button
            type="button"
            onClick={handleExportExcelWithoutPictures}
            disabled={exportingExcelNoPics}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title="Export fast lightweight Excel report"
          >
            {exportingExcelNoPics ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Excel (Without Pictures)</span>
          </button>

          {/* Button 3: CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 active:scale-95 transition-all"
          >
            CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Requests</div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {kpi.totalRequests}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">({kpi.totalUnitsRequested} units)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Pending (รอตรวจสอบ)</div>
            <div className="text-xl font-bold text-amber-700 font-mono">{kpi.pendingCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Approved (อนุมัติแล้ว)</div>
            <div className="text-xl font-bold text-emerald-700 font-mono">{kpi.approvedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Rejected (ปฏิเสธ)</div>
            <div className="text-xl font-bold text-rose-700 font-mono">{kpi.rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by model name, store name, customer, phone..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer</label>
            <select
              value={customer}
              onChange={(e) => { setCustomer(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending (รอตรวจสอบ)</option>
              <option value="Approved">Approved (อนุมัติแล้ว)</option>
              <option value="Rejected">Rejected (ปฏิเสธ)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" /> Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No display model requests found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer / Store</th>
                  <th className="py-3 px-3">Requested Model</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3">Display Location Photo</th>
                  <th className="py-3 px-3">Remarks / Location</th>
                  <th className="py-3 px-3">Requested By</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{r.Store_Name_TH}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="font-semibold text-blue-700">{r.Customer}</span>
                        <span>•</span>
                        <span>{r.Province_TH}</span>
                        {r.Store_ID_Customer && (
                          <>
                            <span>•</span>
                            <span className="font-mono">รหัสห้าง: {r.Store_ID_Customer}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-xs">
                      {r.model_name}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-orange-700 text-sm">
                      {r.quantity}
                    </td>
                    <td className="py-3 px-3">
                      {r.picture_url ? (
                        <div
                          onClick={() => setPreviewImage(r.picture_url)}
                          className="relative h-12 w-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100 shadow-2xs"
                        >
                          <img
                            src={r.picture_url}
                            alt={r.model_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No photo</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-[11px]">
                      {r.remark || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-900 font-semibold">{r.user_name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{r.user_phone}</div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {userRole === 'admin' ? (
                        <select
                          value={r.status}
                          disabled={updatingStatusId === r.id}
                          onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                            r.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : r.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending (รอตรวจ)</option>
                          <option value="Approved">Approved (อนุมัติ)</option>
                          <option value="Rejected">Rejected (ปฏิเสธ)</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setRequestToDelete(r)}
                          className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span> ({total} records total)
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* IMAGE LIGHTBOX MODAL                                      */}
      {/* ========================================================= */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Location photo preview"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL                                 */}
      {/* ========================================================= */}
      {requestToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Confirm Delete Request?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Delete request for model <span className="font-bold text-slate-900 font-mono">{requestToDelete.model_name}</span> at store{' '}
              <span className="font-semibold text-slate-900">{requestToDelete.Store_Name_TH}</span> requested by{' '}
              <span className="font-semibold text-slate-900">{requestToDelete.user_name}</span>?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-sm"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
