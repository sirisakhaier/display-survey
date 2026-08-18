'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileSpreadsheet, 
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
  Layers, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import Papa from 'papaparse';

interface EntryItem {
  id: number;
  store_id: string;
  user_name: string;
  user_phone: string;
  submitted_at: string;
  Customer: string;
  STORE_NAME: string;
  Store_Name_TH: string;
  Province_TH: string;
  Region_TH: string;
  total_models: number;
  total_qty: number;
}

interface ItemDetail {
  id: number;
  model: string;
  qty: number;
  Brand: string;
  Category: string;
  SubCategory: string;
}

interface DisplayRequestItem {
  id: number;
  model_name: string;
  quantity: number;
  remark: string;
  picture_url: string;
  status: string;
  created_at: string;
}

export default function AdminEntriesPage() {
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [customer, setCustomer] = useState<string>('all');
  const [region, setRegion] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  // Detail Modal State
  const [selectedEntry, setSelectedEntry] = useState<EntryItem | null>(null);
  const [entryItems, setEntryItems] = useState<ItemDetail[]>([]);
  const [entryRequests, setEntryRequests] = useState<DisplayRequestItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'items' | 'requests'>('items');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Export State
  const [exportingExcelWithPics, setExportingExcelWithPics] = useState<boolean>(false);
  const [exportingExcelNoPics, setExportingExcelNoPics] = useState<boolean>(false);

  // Delete State
  const [entryToDelete, setEntryToDelete] = useState<EntryItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // 1. Get current auth role
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUserRole(d.user.role);
        }
      });
  }, []);

  // 2. Load filter dropdown options
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

  // 3. Fetch Entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/entries?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error('Error fetching entries:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [page, customer, region, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntries();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCustomer('all');
    setRegion('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // 4. View Entry Details
  const handleViewDetail = async (entry: EntryItem) => {
    setSelectedEntry(entry);
    setLoadingDetail(true);
    setModalTab('items');
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}`);
      const data = await res.json();
      if (data.success) {
        setEntryItems(data.items || []);
        setEntryRequests(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 5. Delete Entry (Admin Only)
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/entries/${entryToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setEntryToDelete(null);
        fetchEntries();
      } else {
        alert(data.error || 'Error deleting entry');
      }
    } catch (e) {
      console.error(e);
      alert('Connection error');
    } finally {
      setDeleting(false);
    }
  };

  // 6. Export to Excel (With Pictures)
  const handleExportExcelWithPictures = async () => {
    setExportingExcelWithPics(true);
    try {
      const params = new URLSearchParams();
      params.append('with_pictures', 'true');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      window.location.href = `/api/admin/entries/export?${params.toString()}`;
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setExportingExcelWithPics(false), 2000);
    }
  };

  // 7. Export to Excel (Without Pictures)
  const handleExportExcelWithoutPictures = async () => {
    setExportingExcelNoPics(true);
    try {
      const params = new URLSearchParams();
      params.append('with_pictures', 'false');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      window.location.href = `/api/admin/entries/export?${params.toString()}`;
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setExportingExcelNoPics(false), 2000);
    }
  };

  // 8. Export to CSV (Admin & Viewer)
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.append('export', 'true');
      if (search.trim()) params.append('search', search.trim());
      if (customer && customer !== 'all') params.append('customer', customer);
      if (region && region !== 'all') params.append('region', region);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/entries?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.entries) {
        const rows = data.entries.map((e: EntryItem) => ({
          'ID': e.id,
          'Customer': e.Customer,
          'STORE_ID': e.store_id,
          'Store Name TH': e.Store_Name_TH,
          'Province TH': e.Province_TH,
          'Region TH': e.Region_TH,
          'User Name': e.user_name,
          'User Phone': e.user_phone,
          'Submitted Date': e.submitted_at,
          'Total Models': e.total_models,
          'Total Display Qty': e.total_qty,
        }));

        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sell_List_Export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recorded Entries</h1>
          <p className="text-xs text-slate-500 mt-1">
            History of all display quantity entries and display requests from store staff
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Button 1: Excel With Pictures */}
          <button
            type="button"
            onClick={handleExportExcelWithPictures}
            disabled={exportingExcelWithPics}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title="Export full Excel report with embedded photos of display locations"
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
            title="Export clean fast Excel report without photos"
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name, ID, recorder name or phone..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer</label>
            <select
              value={customer}
              onChange={(e) => { setCustomer(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> Loading entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No entries match the search criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Store</th>
                  <th className="py-3 px-4">Province / Region</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Models</th>
                  <th className="py-3 px-4 text-right">Total Display</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(e.submitted_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.Customer}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{e.Store_Name_TH}</div>
                      <span className="block text-[10px] text-slate-400 font-mono">{e.store_id}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {e.Province_TH} <span className="text-slate-400">({e.Region_TH})</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-semibold">{e.user_name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{e.user_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      {e.total_models}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700">
                      {e.total_qty}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(e)}
                          className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(e)}
                            className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
      {/* DETAIL MODAL (Item breakdown & Display Requests)          */}
      {/* ========================================================= */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl border border-slate-100 flex flex-col animate-scaleIn overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Display Detail ({selectedEntry.Store_Name_TH})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recorded by {selectedEntry.user_name} ({selectedEntry.user_phone}) on{' '}
                  {new Date(selectedEntry.submitted_at).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="px-5 pt-3 pb-1 border-b border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setModalTab('items')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'items'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Model Display List ({entryItems.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('requests')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'requests'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Display Requests (ขอสินค้าตัวโชว์)</span>
                {entryRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                    {entryRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> Loading details...
                </div>
              ) : modalTab === 'items' ? (
                /* Tab 1: Surveyed Models */
                entryItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No items recorded
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs">
                      <span className="font-semibold text-blue-900">Total Display Units:</span>
                      <span className="font-bold text-blue-700 font-mono text-sm">
                        {selectedEntry.total_qty} unit(s) ({selectedEntry.total_models} model(s))
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {entryItems.map((item) => (
                        <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60">
                          <div>
                            <div className="font-bold text-slate-900 font-mono text-sm">{item.model}</div>
                            <div className="text-slate-500 mt-0.5 flex items-center gap-2">
                              <span className="font-semibold text-slate-700">{item.Brand}</span>
                              <span className="text-slate-300">•</span>
                              <span>{item.Category}</span>
                              {item.SubCategory && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>{item.SubCategory}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-blue-700 text-base">
                            {item.qty} <span className="text-[10px] text-slate-400 font-sans font-normal">unit(s)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                /* Tab 2: Display Model Requests (ขอสินค้าตัวโชว์) */
                entryRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    ไม่มีรายการขอสินค้าตัวโชว์สำหรับสาขานี้
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-200 text-xs text-orange-950 font-medium">
                      รายการขอสินค้าตัวโชว์เพิ่มเติม พร้อมรูปถ่ายตำแหน่งและพื้นที่สำหรับวางโชว์
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entryRequests.map((reqItem) => (
                        <div
                          key={reqItem.id}
                          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-mono font-bold text-sm text-slate-900">
                                {reqItem.model_name}
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                จำนวนที่ขอ: <span className="font-bold text-orange-700 font-mono">{reqItem.quantity}</span> เครื่อง
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {reqItem.status || 'Pending'}
                            </span>
                          </div>

                          {reqItem.remark && (
                            <div className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg">
                              <span className="font-semibold text-slate-700">หมายเหตุ:</span> {reqItem.remark}
                            </div>
                          )}

                          {reqItem.picture_url ? (
                            <div className="pt-1">
                              <div className="text-[10px] font-semibold text-slate-500 mb-1">
                                รูปถ่ายพื้นที่ตั้งโชว์:
                              </div>
                              <div 
                                onClick={() => setPreviewImage(reqItem.picture_url)}
                                className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100"
                              >
                                <img
                                  src={reqItem.picture_url}
                                  alt={reqItem.model_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1">
                                  <Eye className="w-4 h-4" /> ดูรูปขนาดเต็ม
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">ไม่มีรูปภาพแนบ</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* DELETE CONFIRMATION MODAL (Admin Only)                    */}
      {/* ========================================================= */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Confirm Delete?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Delete survey data for store{' '}
              <span className="font-semibold text-slate-900">{entryToDelete.Store_Name_TH}</span> (
              {entryToDelete.Customer}) recorded by{' '}
              <span className="font-semibold text-slate-900">{entryToDelete.user_name}</span>?
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
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
