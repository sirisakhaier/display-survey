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
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

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
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}`);
      const data = await res.json();
      if (data.success) {
        setEntryItems(data.items || []);
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
        alert(data.error || 'เกิดข้อผิดพลาดในการลบรายการ');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeleting(false);
    }
  };

  // 6. Export to CSV (Admin & Viewer)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายการที่บันทึก (Sell List)</h1>
          <p className="text-xs text-slate-500 mt-1">
            ประวัติการบันทึกจำนวนสินค้าตั้งโชว์จากพนักงานหน้าร้านทั้งหมด ({total} รายการ)
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export รายการ (CSV)
        </button>
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
              placeholder="ค้นหาชื่อสาขา, รหัสสาขา, ชื่อผู้บันทึก หรือเบอร์โทร..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
          >
            ค้นหา
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ลูกค้า</label>
            <select
              value={customer}
              onChange={(e) => { setCustomer(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">ทุกลูกค้า</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ภูมิภาค</label>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">ทุกภูมิภาค</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ถึงวันที่</label>
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
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {/* Sell List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> กำลังโหลดรายการ...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">วันเวลาที่บันทึก</th>
                  <th className="py-3 px-4">ลูกค้า</th>
                  <th className="py-3 px-4">สาขา</th>
                  <th className="py-3 px-4">จังหวัด / ภาค</th>
                  <th className="py-3 px-4">ผู้บันทึก</th>
                  <th className="py-3 px-4 text-right">จำนวนรุ่น</th>
                  <th className="py-3 px-4 text-right">จำนวน Display รวม</th>
                  <th className="py-3 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(e.submitted_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.Customer}</td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {e.Store_Name_TH}
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
                      {e.total_models} รุ่น
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700 text-sm">
                      {e.total_qty} เครื่อง
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(e)}
                          className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          title="ดูรายละเอียดรายรุ่น"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Delete Button (Visible ONLY for Admin) */}
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(e)}
                            className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            title="ลบรายการ (Admin เท่านั้น)"
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
              แสดงหน้า <span className="font-semibold text-slate-900">{page}</span> จาก{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span> (ทั้งหมด {total} รายการ)
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
      {/* DETAIL MODAL (Item breakdown for selected entry)         */}
      {/* ========================================================= */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl border border-slate-100 flex flex-col animate-scaleIn overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  รายละเอียดจำนวน Display ({selectedEntry.Store_Name_TH})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกโดย {selectedEntry.user_name} ({selectedEntry.user_phone}) เมื่อ{' '}
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

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> กำลังโหลดรายการสินค้า...
                </div>
              ) : entryItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ไม่มีข้อมูลรายการสินค้า
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs">
                    <span className="font-semibold text-blue-900">รวมทั้งหมด:</span>
                    <span className="font-bold text-blue-700 font-mono text-sm">
                      {selectedEntry.total_qty} เครื่อง ({selectedEntry.total_models} รุ่น)
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
                          {item.qty} <span className="text-[10px] text-slate-400 font-sans font-normal">เครื่อง</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
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
              ยืนยันการลบรายการ?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              คุณต้องการลบข้อมูลการสำรวจของสาขา{' '}
              <span className="font-semibold text-slate-900">{entryToDelete.Store_Name_TH}</span> (
              {entryToDelete.Customer}) ที่บันทึกโดย{' '}
              <span className="font-semibold text-slate-900">{entryToDelete.user_name}</span> ใช่หรือไม่?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-sm"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
