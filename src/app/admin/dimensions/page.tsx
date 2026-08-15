'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Database, 
  Store as StoreIcon, 
  Tv, 
  History, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  Check, 
  X, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import Papa from 'papaparse';

export default function AdminDimensionsPage() {
  const [activeTab, setActiveTab] = useState<'store' | 'model' | 'logs'>('store');
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');

  // Store Tab State
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState<boolean>(true);
  const [storeTotal, setStoreTotal] = useState<number>(0);
  const [storePage, setStorePage] = useState<number>(1);
  const [storeTotalPages, setStoreTotalPages] = useState<number>(1);
  const [storeSearch, setStoreSearch] = useState<string>('');
  const [storeCustomer, setStoreCustomer] = useState<string>('all');
  const [storeRegion, setStoreRegion] = useState<string>('all');
  const [storeStatus, setStoreStatus] = useState<string>('all');
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Model Tab State
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [modelTotal, setModelTotal] = useState<number>(0);
  const [modelPage, setModelPage] = useState<number>(1);
  const [modelTotalPages, setModelTotalPages] = useState<number>(1);
  const [modelSearch, setModelSearch] = useState<string>('');
  const [modelBrand, setModelBrand] = useState<string>('all');
  const [modelCategory, setModelCategory] = useState<string>('all');
  const [modelSubCategory, setModelSubCategory] = useState<string>('all');
  const [modelStatus, setModelStatus] = useState<string>('all');
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // Audit Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Bulk Modal State
  const [showBulkStoreModal, setShowBulkStoreModal] = useState<boolean>(false);
  const [showBulkModelModal, setShowBulkModelModal] = useState<boolean>(false);

  // Upload (Replace) Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadType, setUploadType] = useState<'store' | 'model'>('store');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCsvContent, setUploadCsvContent] = useState<string>('');
  const [validatingUpload, setValidatingUpload] = useState<boolean>(false);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch current auth role
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUserRole(d.user.role);
        }
      });
  }, []);

  // 2. Fetch Stores
  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const params = new URLSearchParams();
      params.append('page', storePage.toString());
      params.append('limit', '50');
      if (storeSearch.trim()) params.append('search', storeSearch.trim());
      if (storeCustomer && storeCustomer !== 'all') params.append('customer', storeCustomer);
      if (storeRegion && storeRegion !== 'all') params.append('region', storeRegion);
      if (storeStatus && storeStatus !== 'all') params.append('status', storeStatus);

      const res = await fetch(`/api/admin/dimensions/stores?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStores(data.stores || []);
        setStoreTotal(data.pagination.total);
        setStoreTotalPages(data.pagination.totalPages);
        if (data.filters) {
          setCustomerOptions(data.filters.customers || []);
          setRegionOptions(data.filters.regions || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'store') fetchStores();
  }, [storePage, storeCustomer, storeRegion, storeStatus, activeTab]);

  // 3. Fetch Models
  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const params = new URLSearchParams();
      params.append('page', modelPage.toString());
      params.append('limit', '50');
      if (modelSearch.trim()) params.append('search', modelSearch.trim());
      if (modelBrand && modelBrand !== 'all') params.append('brand', modelBrand);
      if (modelCategory && modelCategory !== 'all') params.append('category', modelCategory);
      if (modelSubCategory && modelSubCategory !== 'all') params.append('subcategory', modelSubCategory);
      if (modelStatus && modelStatus !== 'all') params.append('status', modelStatus);

      const res = await fetch(`/api/admin/dimensions/models?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setModels(data.models || []);
        setModelTotal(data.pagination.total);
        setModelTotalPages(data.pagination.totalPages);
        if (data.filters) {
          setBrandOptions(data.filters.brands || []);
          setCategoryOptions(data.filters.categories || []);
          setSubCategoryOptions(data.filters.subcategories || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'model') fetchModels();
  }, [modelPage, modelBrand, modelCategory, modelSubCategory, modelStatus, activeTab]);

  // 4. Fetch Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/dimensions/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  // 5. Store Status Toggle (Single)
  const handleToggleStoreStatus = async (storeId: string, currentStatus: string) => {
    if (userRole !== 'admin') return;
    const newStatus = currentStatus === 'Active' ? 'Not active' : 'Active';
    try {
      const res = await fetch('/api/admin/dimensions/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setStores((prev) =>
          prev.map((s) => (s.STORE_ID === storeId ? { ...s, Active_Inactive: newStatus } : s))
        );
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 6. Model Status Toggle (Single)
  const handleToggleModelStatus = async (modelCode: string, currentStatus: string) => {
    if (userRole !== 'admin') return;
    const newStatus = currentStatus === 'Active' ? 'Not active' : 'Active';
    try {
      const res = await fetch('/api/admin/dimensions/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelCode, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setModels((prev) =>
          prev.map((m) => (m.Model === modelCode ? { ...m, Active_Inactive: newStatus } : m))
        );
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Bulk Update Stores
  const handleBulkUpdateStores = async (status: 'Active' | 'Not active', scope: 'selected' | 'customer' | 'region', value?: string) => {
    if (userRole !== 'admin') return;
    const payload: any = { status };
    if (scope === 'selected') payload.storeIds = selectedStoreIds;
    if (scope === 'customer') payload.customer = value;
    if (scope === 'region') payload.region = value;

    try {
      const res = await fetch('/api/admin/dimensions/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowBulkStoreModal(false);
        setSelectedStoreIds([]);
        fetchStores();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Bulk Update Models
  const handleBulkUpdateModels = async (status: 'Active' | 'Not active', scope: 'selected' | 'brand' | 'category', value?: string) => {
    if (userRole !== 'admin') return;
    const payload: any = { status };
    if (scope === 'selected') payload.models = selectedModelIds;
    if (scope === 'brand') payload.brand = value;
    if (scope === 'category') payload.category = value;

    try {
      const res = await fetch('/api/admin/dimensions/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowBulkModelModal(false);
        setSelectedModelIds([]);
        fetchModels();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Download Dimension CSV (Admin & Viewer)
  const handleDownloadCSV = (type: 'store' | 'model') => {
    window.location.href = `/api/admin/dimensions/export/${type}`;
  };

  // 10. Handle Upload CSV Selection & Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadError(null);
    setUploadPreview(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setUploadCsvContent(content);
      validateUploadCsv(content, uploadType);
    };
    reader.readAsText(file);
  };

  const validateUploadCsv = async (content: string, type: 'store' | 'model') => {
    setValidatingUpload(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/admin/dimensions/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, csvContent: content, isPreview: true }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadPreview(data.preview);
      } else {
        setUploadError(data.error || 'รูปแบบไฟล์ไม่ถูกต้อง');
      }
    } catch (err: any) {
      setUploadError('เกิดข้อผิดพลาดในการตรวจสอบไฟล์');
    } finally {
      setValidatingUpload(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!uploadCsvContent || userRole !== 'admin') return;
    setReplacing(true);
    try {
      const res = await fetch('/api/admin/dimensions/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: uploadType, csvContent: uploadCsvContent, isPreview: false }),
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadCsvContent('');
        setUploadPreview(null);
        alert(data.message || 'แทนที่ข้อมูลเรียบร้อยแล้ว');
        if (uploadType === 'store') fetchStores();
        if (uploadType === 'model') fetchModels();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการแทนที่ข้อมูล');
      }
    } catch (e: any) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการข้อมูล Dimension</h1>
          <p className="text-xs text-slate-500 mt-1">
            บริหารจัดการตาราง Dimension_Store และ Dimension_Model รวมถึงการ Download / Upload Replace
          </p>
        </div>

        {/* Action Buttons: Download & Upload */}
        <div className="flex items-center gap-2">
          {/* Download CSV (Admin & Viewer) */}
          <button
            type="button"
            onClick={() => handleDownloadCSV(activeTab === 'model' ? 'model' : 'store')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-700" />
            ดาวน์โหลด CSV ({activeTab === 'model' ? 'Model' : 'Store'})
          </button>

          {/* Upload & Replace CSV (Admin ONLY) */}
          {userRole === 'admin' ? (
            <button
              type="button"
              onClick={() => {
                setUploadType(activeTab === 'model' ? 'model' : 'store');
                setUploadFile(null);
                setUploadCsvContent('');
                setUploadPreview(null);
                setUploadError(null);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload แทนที่ข้อมูล (Replace)
            </button>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              โหมดดูอย่างเดียว (Viewer)
            </div>
          )}
        </div>
      </div>

      {/* Viewer Notice Banner */}
      {userRole === 'viewer' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-800 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-bold">โหมดสิทธิ์ Viewer (ดูข้อมูลอย่างเดียว):</span>{' '}
            ท่านสามารถดูตารางข้อมูลและดาวน์โหลดไฟล์ CSV ได้ แต่ปุ่มแก้ไขสถานะ ลบ หรืออัปโหลดแทนที่ข้อมูลจะถูกปิดใช้งาน
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'store'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          สาขา / ร้านค้า (Store Dimension)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('model')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'model'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Tv className="w-4 h-4" />
          รุ่นสินค้า (Model Dimension)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติการแก้ไข (Audit Logs)
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STORE DIMENSION                                    */}
      {/* ========================================================= */}
      {activeTab === 'store' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Store Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="ค้นหารหัสสาขา, ชื่อสาขา, หรือจังหวัด..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => { setStorePage(1); fetchStores(); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                ค้นหา
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">ลูกค้า</label>
                <select
                  value={storeCustomer}
                  onChange={(e) => { setStoreCustomer(e.target.value); setStorePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกลูกค้า ({customerOptions.length})</option>
                  {customerOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">ภูมิภาค</label>
                <select
                  value={storeRegion}
                  onChange={(e) => { setStoreRegion(e.target.value); setStorePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกภูมิภาค</option>
                  {regionOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">สถานะ</label>
                <select
                  value={storeStatus}
                  onChange={(e) => { setStoreStatus(e.target.value); setStorePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="Active">Active (เปิดใช้งาน)</option>
                  <option value="Not active">Not active (ปิดใช้งาน)</option>
                </select>
              </div>

              {/* Bulk Actions Button (Admin only) */}
              <div className="flex items-end">
                {userRole === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => setShowBulkStoreModal(true)}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    เปิด/ปิด สถานะแบบกลุ่ม (Bulk)
                  </button>
                ) : (
                  <div className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 text-center border border-slate-100">
                    Read-only
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Store Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingStores ? (
              <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> กำลังโหลดข้อมูลร้านค้า...
              </div>
            ) : stores.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                ไม่พบข้อมูลสาขาที่ตรงกับเงื่อนไข
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedStoreIds.length === stores.length && stores.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedStoreIds(stores.map((s) => s.STORE_ID));
                            else setSelectedStoreIds([]);
                          }}
                          disabled={userRole !== 'admin'}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-3 px-3">STORE_ID (PK)</th>
                      <th className="py-3 px-3">ลูกค้า (Customer)</th>
                      <th className="py-3 px-3">ชื่อสาขา (TH)</th>
                      <th className="py-3 px-3">จังหวัด (TH)</th>
                      <th className="py-3 px-3">ภูมิภาค (TH)</th>
                      <th className="py-3 px-3">Store ID Customer</th>
                      <th className="py-3 px-3 text-center">สถานะ (Active-Inactive)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {stores.map((s) => {
                      const isActive = s.Active_Inactive === 'Active';
                      const isSelected = selectedStoreIds.includes(s.STORE_ID);
                      return (
                        <tr key={s.STORE_ID} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={userRole !== 'admin'}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedStoreIds([...selectedStoreIds, s.STORE_ID]);
                                else setSelectedStoreIds(selectedStoreIds.filter((id) => id !== s.STORE_ID));
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.STORE_ID}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.Customer}</td>
                          <td className="py-2.5 px-3 text-blue-700 font-semibold">{s.Store_Name_TH}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.Province_TH}</td>
                          <td className="py-2.5 px-3 text-slate-500">{s.Region_TH}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{s.Store_ID_Customer || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            {userRole === 'admin' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStoreStatus(s.STORE_ID, s.Active_Inactive)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {s.Active_Inactive}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {s.Active_Inactive}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {storeTotalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  แสดงหน้า <span className="font-semibold text-slate-900">{storePage}</span> จาก{' '}
                  <span className="font-semibold text-slate-900">{storeTotalPages}</span> (ทั้งหมด {storeTotal} สาขา)
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={storePage <= 1}
                    onClick={() => setStorePage(storePage - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={storePage >= storeTotalPages}
                    onClick={() => setStorePage(storePage + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MODEL DIMENSION                                    */}
      {/* ========================================================= */}
      {activeTab === 'model' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Model Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="ค้นหารหัสรุ่น (Model), แบรนด์, หรือหมวดหมู่..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => { setModelPage(1); fetchModels(); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                ค้นหา
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">หมวดหมู่สินค้า</label>
                <select
                  value={modelCategory}
                  onChange={(e) => { setModelCategory(e.target.value); setModelPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกหมวดหมู่ ({categoryOptions.length})</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">ประเภทย่อย (SubCategory)</label>
                <select
                  value={modelSubCategory}
                  onChange={(e) => { setModelSubCategory(e.target.value); setModelPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกประเภทย่อย ({subCategoryOptions.length})</option>
                  {subCategoryOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">แบรนด์</label>
                <select
                  value={modelBrand}
                  onChange={(e) => { setModelBrand(e.target.value); setModelPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกแบรนด์ ({brandOptions.length})</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">สถานะ</label>
                <select
                  value={modelStatus}
                  onChange={(e) => { setModelStatus(e.target.value); setModelPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="Active">Active (เปิดใช้งาน)</option>
                  <option value="Not active">Not active (ปิดใช้งาน)</option>
                </select>
              </div>

              {/* Bulk Actions Button (Admin only) */}
              <div className="flex items-end">
                {userRole === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => setShowBulkModelModal(true)}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    เปิด/ปิด สถานะแบบกลุ่ม (Bulk)
                  </button>
                ) : (
                  <div className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 text-center border border-slate-100">
                    Read-only
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Model Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingModels ? (
              <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> กำลังโหลดรายการสินค้า...
              </div>
            ) : models.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                ไม่พบรายการสินค้าที่ตรงกับเงื่อนไข
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedModelIds.length === models.length && models.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedModelIds(models.map((m) => m.Model));
                            else setSelectedModelIds([]);
                          }}
                          disabled={userRole !== 'admin'}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-3 px-3">Model (PK)</th>
                      <th className="py-3 px-3">Brand</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">SubCategory</th>
                      <th className="py-3 px-3">Remark</th>
                      <th className="py-3 px-3">Update by</th>
                      <th className="py-3 px-3 text-center">สถานะ (Active-Inactive)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {models.map((m) => {
                      const isActive = m.Active_Inactive === 'Active';
                      const isSelected = selectedModelIds.includes(m.Model);
                      return (
                        <tr key={m.Model} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={userRole !== 'admin'}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedModelIds([...selectedModelIds, m.Model]);
                                else setSelectedModelIds(selectedModelIds.filter((id) => id !== m.Model));
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{m.Model}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{m.Brand}</td>
                          <td className="py-2.5 px-3 text-blue-700 font-semibold">{m.Category}</td>
                          <td className="py-2.5 px-3 text-slate-600">{m.SubCategory || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">{m.Remark || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{m.Update_by} ({m.Update_date})</td>
                          <td className="py-2.5 px-3 text-center">
                            {userRole === 'admin' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleModelStatus(m.Model, m.Active_Inactive)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {m.Active_Inactive}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {m.Active_Inactive}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {modelTotalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  แสดงหน้า <span className="font-semibold text-slate-900">{modelPage}</span> จาก{' '}
                  <span className="font-semibold text-slate-900">{modelTotalPages}</span> (ทั้งหมด {modelTotal} รุ่น)
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={modelPage <= 1}
                    onClick={() => setModelPage(modelPage - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={modelPage >= modelTotalPages}
                    onClick={() => setModelPage(modelPage + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: AUDIT LOGS                                         */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              ประวัติการแก้ไขข้อมูล Dimension ล่าสุด (Audit Logs)
            </h3>
            <button
              type="button"
              onClick={fetchLogs}
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> รีเฟรช
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> กำลังโหลดประวัติ...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ยังไม่มีประวัติการแก้ไขข้อมูล
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {log.dimension_type}
                      </span>
                      <span>{log.details}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ดำเนินการโดย: <span className="font-medium text-slate-700">{log.user_name}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                    {new Date(log.created_at).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK STORE STATUS MODAL (Admin Only)                      */}
      {/* ========================================================= */}
      {showBulkStoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 animate-scaleIn space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                เปิด/ปิด สถานะร้านค้าแบบกลุ่ม (Bulk Store)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkStoreModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Option 1: Selected Stores */}
              {selectedStoreIds.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div className="font-bold text-blue-900 mb-2">
                    1. จัดการตามสาขาที่เลือกไว้ ({selectedStoreIds.length} สาขา)
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkUpdateStores('Active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                    >
                      เปิดใช้งานทั้งหมด (Active)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkUpdateStores('Not active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-800 transition-colors"
                    >
                      ปิดใช้งานทั้งหมด (Not active)
                    </button>
                  </div>
                </div>
              )}

              {/* Option 2: By Customer */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">2. จัดการทั้งระดับลูกค้า (Customer)</label>
                <div className="flex gap-2">
                  <select
                    id="bulkCustomerSelect"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {customerOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkCustomerSelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateStores('Active', 'customer', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    เปิด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkCustomerSelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateStores('Not active', 'customer', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800"
                  >
                    ปิด
                  </button>
                </div>
              </div>

              {/* Option 3: By Region */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">3. จัดการทั้งระดับภูมิภาค (Region)</label>
                <div className="flex gap-2">
                  <select
                    id="bulkRegionSelect"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {regionOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkRegionSelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateStores('Active', 'region', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    เปิด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkRegionSelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateStores('Not active', 'region', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowBulkStoreModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK MODEL STATUS MODAL (Admin Only)                      */}
      {/* ========================================================= */}
      {showBulkModelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 animate-scaleIn space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                เปิด/ปิด สถานะรุ่นสินค้าแบบกลุ่ม (Bulk Model)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModelModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Option 1: Selected Models */}
              {selectedModelIds.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div className="font-bold text-blue-900 mb-2">
                    1. จัดการตามรุ่นที่เลือกไว้ ({selectedModelIds.length} รุ่น)
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkUpdateModels('Active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                    >
                      เปิดใช้งานทั้งหมด (Active)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkUpdateModels('Not active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-800 transition-colors"
                    >
                      ปิดใช้งานทั้งหมด (Not active)
                    </button>
                  </div>
                </div>
              )}

              {/* Option 2: By Brand */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">2. จัดการทั้งแบรนด์ (Brand)</label>
                <div className="flex gap-2">
                  <select
                    id="bulkBrandSelect"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {brandOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkBrandSelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateModels('Active', 'brand', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    เปิด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkBrandSelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateModels('Not active', 'brand', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800"
                  >
                    ปิด
                  </button>
                </div>
              </div>

              {/* Option 3: By Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">3. จัดการทั้งหมวดหมู่ (Category)</label>
                <div className="flex gap-2">
                  <select
                    id="bulkCategorySelect"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkCategorySelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateModels('Active', 'category', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    เปิด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bulkCategorySelect') as HTMLSelectElement;
                      if (el) handleBulkUpdateModels('Not active', 'category', el.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowBulkModelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* UPLOAD & REPLACE CSV MODAL (Admin Only with Safety Check) */}
      {/* ========================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl p-6 rounded-3xl shadow-2xl border border-slate-100 animate-scaleIn space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-700" />
                อัปโหลดไฟล์ CSV เพื่อแทนที่ข้อมูล ({uploadType === 'store' ? 'Store' : 'Model'})
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">คำเตือนสำคัญ:</span> การอัปโหลดนี้จะเป็นการ{' '}
                <span className="font-bold underline">แทนที่ (Replace) ข้อมูลทั้งหมด</span> ของตาราง{' '}
                {uploadType === 'store' ? 'Dimension_Store' : 'Dimension_Model'} ด้วยข้อมูลจากไฟล์ใหม่
              </div>
            </div>

            {/* File Dropzone / Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                เลือกไฟล์ CSV สำหรับตาราง {uploadType === 'store' ? 'ร้านค้า (Store)' : 'รุ่นสินค้า (Model)'}
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            {/* Validation State */}
            {validatingUpload && (
              <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> กำลังตรวจสอบความถูกต้องและคีย์ข้อมูลในไฟล์...
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Preview Summary */}
            {uploadPreview && !validatingUpload && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ผลการตรวจสอบความถูกต้องของไฟล์
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">จำนวนแถวทั้งหมดในไฟล์:</span>
                    <span className="font-bold font-mono text-slate-900">{uploadPreview.totalRows} แถว</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Primary Key ที่ไม่ซ้ำกัน:</span>
                    <span className="font-bold font-mono text-emerald-700">{uploadPreview.validCount} รายการ</span>
                  </div>
                </div>

                {/* Safety Check: Missing Historical Reference Alert */}
                {uploadPreview.hasMissingHistoricalWarning && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      แจ้งเตือน: พบ {uploadPreview.missingHistoricalCount} รายการที่มีประวัติการบันทึกแต่ไม่มีในไฟล์ใหม่
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      ตัวอย่างรหัส: <span className="font-mono">{uploadPreview.missingHistoricalSample.join(', ')}</span>
                      <br />
                      * ข้อมูลประวัติการสำรวจเดิมจะยังคงถูกเก็บรักษาไว้ แต่รหัสดังกล่าวจะไม่ปรากฏให้พนักงานเลือกบันทึกใหม่อีกต่อไป
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={replacing}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={!uploadPreview || replacing}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all shadow-md shadow-blue-700/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {replacing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังแทนที่ข้อมูล...
                  </>
                ) : (
                  'ยืนยันแทนที่ข้อมูลทั้งหมด'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
