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
  const [activeTab, setActiveTab] = useState<'store' | 'model' | 'bulk' | 'logs'>('store');
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');

  // Bulk Customer/Category Manager State
  const [customerStats, setCustomerStats] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [loadingBulkStats, setLoadingBulkStats] = useState<boolean>(false);

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

  // Bulk modal React state (replaces getElementById)
  const [bulkCustomer, setBulkCustomer] = useState<string>('');
  const [bulkRegion, setBulkRegion] = useState<string>('');
  const [bulkBrand, setBulkBrand] = useState<string>('');
  const [bulkCategory, setBulkCategory] = useState<string>('');

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

  // When category changes -> reset subcategory and brand filters
  const handleModelCategoryChange = (cat: string) => {
    setModelCategory(cat);
    setModelSubCategory('all');
    setModelBrand('all');
    setModelPage(1);
  };

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

  // 4b. Fetch Bulk Summary
  const fetchBulkSummary = async () => {
    setLoadingBulkStats(true);
    try {
      const [resStores, resModels] = await Promise.all([
        fetch('/api/admin/dimensions/stores?summary=true'),
        fetch('/api/admin/dimensions/models?summary=true'),
      ]);
      const dataStores = await resStores.json();
      const dataModels = await resModels.json();
      if (dataStores.success) setCustomerStats(dataStores.customerStats || []);
      if (dataModels.success) setCategoryStats(dataModels.categoryStats || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBulkStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bulk') fetchBulkSummary();
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
        fetchStores(); // Refresh so updated items reflect (or disappear if filtered)
      } else {
        alert(data.error || 'Error updating status.');
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
        fetchModels(); // Refresh so updated items reflect
      } else {
        alert(data.error || 'Error updating model status.');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dimension Manager</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Dimension_Store and Dimension_Model tables — Download and Upload (Replace) CSV data
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
            Download CSV ({activeTab === 'model' ? 'Model' : 'Store'})
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
              Upload & Replace
            </button>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Read-only (Viewer)
            </div>
          )}
        </div>
      </div>

      {/* Viewer Notice Banner */}
      {userRole === 'viewer' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-800 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-bold">Viewer Access (Read-only):</span>{' '}
            You can view tables and download CSV files. Edit, status toggle, and upload replace buttons are disabled.
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
          Store Dimension
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
          Model Dimension
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'bulk'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Bulk Customer/Category
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
          Audit Logs
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
                  placeholder="Search by Store ID, name, or province..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => { setStorePage(1); fetchStores(); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                Search
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer</label>
                <select
                  value={storeCustomer}
                  onChange={(e) => { setStoreCustomer(e.target.value); setStorePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Customers ({customerOptions.length})</option>
                  {customerOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Region</label>
                <select
                  value={storeRegion}
                  onChange={(e) => { setStoreRegion(e.target.value); setStorePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Regions</option>
                  {regionOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                <select
                  value={storeStatus}
                  onChange={(e) => { setStoreStatus(e.target.value); setStorePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Not active">Not active</option>
                </select>
              </div>

              {/* Bulk Actions Button (Admin only) */}
              <div className="flex items-end">
                {userRole === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkCustomer(customerOptions[0] || '');
                      setBulkRegion(regionOptions[0] || '');
                      setShowBulkStoreModal(true);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Bulk Active / Inactive
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
                <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No stores found matching current filters.
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
                      <th className="py-3 px-3">STORE_ID</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Store Name (TH)</th>
                      <th className="py-3 px-3">Province</th>
                      <th className="py-3 px-3">Region</th>
                      <th className="py-3 px-3">Store ID (Customer)</th>
                      <th className="py-3 px-3 text-center">Status</th>
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
                  Page <span className="font-semibold text-slate-900">{storePage}</span> of{' '}
                  <span className="font-semibold text-slate-900">{storeTotalPages}</span> ({storeTotal} stores total)
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
                  placeholder="Search by Model code, brand, or category..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => { setModelPage(1); fetchModels(); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                Search
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
                <select
                  value={modelCategory}
                  onChange={(e) => handleModelCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Categories ({categoryOptions.length})</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  SubCategory {modelCategory !== 'all' ? `(${modelCategory})` : ''}
                </label>
                <select
                  value={modelSubCategory}
                  onChange={(e) => { setModelSubCategory(e.target.value); setModelPage(1); }}
                  disabled={modelCategory === 'all'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="all">All SubCategories ({subCategoryOptions.length})</option>
                  {subCategoryOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Brand</label>
                <select
                  value={modelBrand}
                  onChange={(e) => { setModelBrand(e.target.value); setModelPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Brands ({brandOptions.length})</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                <select
                  value={modelStatus}
                  onChange={(e) => { setModelStatus(e.target.value); setModelPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Not active">Not active</option>
                </select>
              </div>

              {/* Bulk Actions Button (Admin only) */}
              <div className="flex items-end">
                {userRole === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkBrand(brandOptions[0] || '');
                      setBulkCategory(categoryOptions[0] || '');
                      setShowBulkModelModal(true);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Bulk Active / Inactive
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
                <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> Loading models...
              </div>
            ) : models.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No models found matching current filters.
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
                      <th className="py-3 px-3">Model</th>
                      <th className="py-3 px-3">Brand</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">SubCategory</th>
                      <th className="py-3 px-3">Remark</th>
                      <th className="py-3 px-3">Updated By</th>
                      <th className="py-3 px-3 text-center">Status</th>
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
                  Page <span className="font-semibold text-slate-900">{modelPage}</span> of{' '}
                  <span className="font-semibold text-slate-900">{modelTotalPages}</span> ({modelTotal} models total)
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
      {/* TAB 3: BULK CUSTOMER / CATEGORY MANAGER & CROSS-TABLE     */}
      {/* ========================================================= */}
      {activeTab === 'bulk' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Note */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
            <SlidersHorizontal className="w-5 h-5 flex-shrink-0 text-blue-700 mt-0.5" />
            <div>
              <span className="font-bold text-sm block text-blue-950 mb-0.5">
                Bulk Customer / Category Status Manager & Cross-Table Check
              </span>
              Inspect real-time store counts per Customer and model counts per Category. Perform 1-click bulk status activations or deactivations across entire customer stores or product categories.
            </div>
          </div>

          {loadingBulkStats ? (
            <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> Loading customer & category breakdown...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Customer Stores Bulk Manager */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="w-5 h-5 text-blue-700" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Customer Stores Manager</h3>
                      <p className="text-[11px] text-slate-500">{customerStats.length} Customers found</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchBulkSummary}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    title="Refresh Stats"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3 text-center">Active / Total</th>
                        <th className="py-2.5 px-3 text-right">Bulk Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {customerStats.map((cs: any) => (
                        <tr key={cs.customer} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-bold text-slate-900">{cs.customer}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {cs.active} Active
                            </span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-600 font-mono">{cs.total} Stores</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {userRole === 'admin' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleBulkUpdateStores('Active', 'customer', cs.customer);
                                    fetchBulkSummary();
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  Activate All
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleBulkUpdateStores('Not active', 'customer', cs.customer);
                                    fetchBulkSummary();
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200 transition-colors"
                                >
                                  Deactivate
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Read-only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Category Models Bulk Manager */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-blue-700" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Product Categories Manager</h3>
                      <p className="text-[11px] text-slate-500">{categoryStats.length} Categories found</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchBulkSummary}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    title="Refresh Stats"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Active / Total</th>
                        <th className="py-2.5 px-3 text-right">Bulk Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {categoryStats.map((cat: any) => (
                        <tr key={cat.category} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-bold text-slate-900">{cat.category}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              {cat.active} Active
                            </span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-600 font-mono">{cat.total} Models</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {userRole === 'admin' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleBulkUpdateModels('Active', 'category', cat.category);
                                    fetchBulkSummary();
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-sm"
                                >
                                  Activate All
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleBulkUpdateModels('Not active', 'category', cat.category);
                                    fetchBulkSummary();
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200 transition-colors"
                                >
                                  Deactivate
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Read-only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: AUDIT LOGS                                         */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              Dimension Change History (Audit Logs)
            </h3>
            <button
              type="button"
              onClick={fetchLogs}
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No audit log entries yet.
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
                      By: <span className="font-medium text-slate-700">{log.user_name}</span>
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
                Bulk Store Status Update
              </h3>
              <button type="button" onClick={() => setShowBulkStoreModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Option 1: Selected Stores */}
              {selectedStoreIds.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div className="font-bold text-blue-900 mb-2">
                    1. Selected Stores ({selectedStoreIds.length} selected)
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleBulkUpdateStores('Active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                      Set Active
                    </button>
                    <button type="button" onClick={() => handleBulkUpdateStores('Not active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-800">
                      Set Inactive
                    </button>
                  </div>
                </div>
              )}

              {/* Option 2: By Customer */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">2. By Customer</label>
                <div className="flex gap-2">
                  <select
                    value={bulkCustomer}
                    onChange={(e) => setBulkCustomer(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {customerOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleBulkUpdateStores('Active', 'customer', bulkCustomer)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                    Active
                  </button>
                  <button type="button" onClick={() => handleBulkUpdateStores('Not active', 'customer', bulkCustomer)}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800">
                    Inactive
                  </button>
                </div>
              </div>

              {/* Option 3: By Region */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">3. By Region</label>
                <div className="flex gap-2">
                  <select
                    value={bulkRegion}
                    onChange={(e) => setBulkRegion(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {regionOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleBulkUpdateStores('Active', 'region', bulkRegion)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                    Active
                  </button>
                  <button type="button" onClick={() => handleBulkUpdateStores('Not active', 'region', bulkRegion)}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800">
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button type="button" onClick={() => setShowBulkStoreModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200">
                Close
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
                Bulk Model Status Update
              </h3>
              <button type="button" onClick={() => setShowBulkModelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Option 1: Selected Models */}
              {selectedModelIds.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div className="font-bold text-blue-900 mb-2">
                    1. Selected Models ({selectedModelIds.length} models)
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleBulkUpdateModels('Active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                      Set Active
                    </button>
                    <button type="button" onClick={() => handleBulkUpdateModels('Not active', 'selected')}
                      className="flex-1 py-2 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-800">
                      Set Inactive
                    </button>
                  </div>
                </div>
              )}

              {/* Option 2: By Brand */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">2. By Brand</label>
                <div className="flex gap-2">
                  <select value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    {brandOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleBulkUpdateModels('Active', 'brand', bulkBrand)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">Active</button>
                  <button type="button" onClick={() => handleBulkUpdateModels('Not active', 'brand', bulkBrand)}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800">Inactive</button>
                </div>
              </div>

              {/* Option 3: By Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">3. By Category</label>
                <div className="flex gap-2">
                  <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleBulkUpdateModels('Active', 'category', bulkCategory)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">Active</button>
                  <button type="button" onClick={() => handleBulkUpdateModels('Not active', 'category', bulkCategory)}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800">Inactive</button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button type="button" onClick={() => setShowBulkModelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200">
                Close
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
                Upload CSV to Replace Data ({uploadType === 'store' ? 'Store' : 'Model'})
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
                <span className="font-bold">Warning:</span> This action will{' '}
                <span className="font-bold underline">completely replace all data</span> in the{' '}
                {uploadType === 'store' ? 'Dimension_Store' : 'Dimension_Model'} table with the uploaded file.
              </div>
            </div>

            {/* File Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select CSV file for {uploadType === 'store' ? 'Store Dimension' : 'Model Dimension'}
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
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> Validating file format and keys...
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
                    File Validation Result
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total rows in file:</span>
                    <span className="font-bold font-mono text-slate-900">{uploadPreview.totalRows} rows</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unique Primary Keys:</span>
                    <span className="font-bold font-mono text-emerald-700">{uploadPreview.validCount} records</span>
                  </div>
                </div>

                {/* Safety Check */}
                {uploadPreview.hasMissingHistoricalWarning && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Warning: {uploadPreview.missingHistoricalCount} records have existing survey history but are missing from the new file
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      Sample IDs: <span className="font-mono">{uploadPreview.missingHistoricalSample.join(', ')}</span>
                      <br />
                      * Historical survey data will be preserved, but these IDs will no longer appear for staff to survey.
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={!uploadPreview || replacing}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all shadow-md shadow-blue-700/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {replacing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Replacing data...
                  </>
                ) : (
                  'Confirm Replace All Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
