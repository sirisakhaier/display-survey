'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, 
  MapPin, 
  User, 
  Phone, 
  Plus, 
  Minus, 
  Search, 
  CheckCircle2, 
  History, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Send, 
  Shield, 
  Store as StoreIcon, 
  Layers, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ClipboardList,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  ChevronUp,
  Store,
  Moon,
  Sun
} from 'lucide-react';

interface StoreItem {
  STORE_ID: string;
  Customer: string;
  STORE_NAME: string;
  Store_Name_TH: string;
  Province_TH: string;
  Region_TH: string;
}

interface ProductItem {
  Model: string;
  Brand: string;
  Category: string;
  SubCategory: string;
  Active_Inactive: string;
}

interface PreviousDataSummary {
  id: number;
  user_name: string;
  user_phone: string;
  submitted_at: string;
}

interface PreviousDataResponse {
  hasPrevious: boolean;
  entry: PreviousDataSummary | null;
  items: Record<string, number>;
  itemDetails: any[];
  categorySummary: { Category: string; Brand: string; model_count: number; total_qty: number }[];
  totalQty: number;
  totalModels: number;
}

export default function UserSurveyPage() {
  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(false);
  useEffect(() => {
    const saved = localStorage.getItem('haier-theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('haier-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('haier-theme', 'light');
    }
  };

  // Navigation Step:
  // 1 = Select Store (Dropdowns), 2 = Staff Info (Blank start, Validated Phone), 3 = Hierarchy Counting with Live Summary Table, 4 = Full Details Review, 5 = Success
  const [step, setStep] = useState<number>(1);

  // 1. Landing Page Dropdowns
  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);

  // Previous Store Warning State (Req 1)
  const [checkingPrevious, setCheckingPrevious] = useState<boolean>(false);
  const [previousData, setPreviousData] = useState<PreviousDataResponse | null>(null);
  const [showPreviousWarningModal, setShowPreviousWarningModal] = useState<boolean>(false);

  // 2. Staff Info State - ALWAYS START BLANK (Req 2)
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // 3. Product Hierarchy & Counting State
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [models, setModels] = useState<ProductItem[]>([]);
  const [modelSearch, setModelSearch] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [showLiveSummary, setShowLiveSummary] = useState<boolean>(true);

  // Stored counts map: model -> qty
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeModelMap, setActiveModelMap] = useState<Record<string, ProductItem>>({});

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 1. Initial Load: Fetch Customers & Preload All Models Map
  // -------------------------------------------------------------
  useEffect(() => {
    fetchCustomers();
    fetchAllModelsMap();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/user/stores');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllModelsMap = async () => {
    try {
      const res = await fetch('/api/user/models?type=all');
      const data = await res.json();
      if (data.success && data.models) {
        const dict: Record<string, ProductItem> = {};
        data.models.forEach((m: ProductItem) => {
          dict[m.Model] = m;
        });
        setActiveModelMap(dict);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // 2. Cascade Dropdowns: Customer -> Region -> Store
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedCustomer) {
      setRegions([]);
      setSelectedRegion('');
      setStores([]);
      setSelectedStoreId('');
      setSelectedStore(null);
      setPreviousData(null);
      return;
    }

    const fetchRegions = async () => {
      setLoadingStores(true);
      try {
        const res = await fetch(`/api/user/stores?customer=${encodeURIComponent(selectedCustomer)}`);
        const data = await res.json();
        if (data.success) {
          setRegions(data.regions || []);
          setSelectedRegion('');
          setStores([]);
          setSelectedStoreId('');
          setSelectedStore(null);
          setPreviousData(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchRegions();
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer || !selectedRegion) {
      setStores([]);
      setSelectedStoreId('');
      setSelectedStore(null);
      setPreviousData(null);
      return;
    }

    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const res = await fetch(
          `/api/user/stores?customer=${encodeURIComponent(selectedCustomer)}&region=${encodeURIComponent(selectedRegion)}`
        );
        const data = await res.json();
        if (data.success) {
          setStores(data.stores || []);
          setSelectedStoreId('');
          setSelectedStore(null);
          setPreviousData(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, [selectedCustomer, selectedRegion]);

  // When user selects a store from dropdown -> check if store has previous data (Req 1)
  const handleStoreDropdownChange = async (storeId: string) => {
    setSelectedStoreId(storeId);
    if (!storeId) {
      setSelectedStore(null);
      setPreviousData(null);
      return;
    }

    const storeObj = stores.find((s) => s.STORE_ID === storeId) || null;
    setSelectedStore(storeObj);

    if (storeObj) {
      setCheckingPrevious(true);
      try {
        const res = await fetch(`/api/user/store-previous/${storeObj.STORE_ID}`);
        const data = await res.json();
        if (data.success && data.hasPrevious && data.entry) {
          setPreviousData(data);
          setShowPreviousWarningModal(true); // Open warning dialog with details
        } else {
          setPreviousData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingPrevious(false);
      }
    }
  };

  const handleProceedToStaffInfo = () => {
    // Start fresh with 0
    setCounts({});
    setUserName(''); // Start blank as requested
    setUserPhone(''); // Start blank as requested
    setShowPreviousWarningModal(false);
    setStep(2);
  };

  const handleRevisePreviousData = () => {
    // Load previous counts into state
    if (previousData?.items) {
      setCounts(previousData.items);
    }
    if (previousData?.itemDetails) {
      setActiveModelMap((prev) => {
        const next = { ...prev };
        previousData.itemDetails.forEach((item: any) => {
          if (item.model) {
            next[item.model] = {
              Model: item.model,
              Brand: item.Brand || 'Unknown',
              Category: item.Category || 'Other',
              SubCategory: item.SubCategory || '',
              Active_Inactive: 'Active',
            };
          }
        });
        return next;
      });
    }
    setUserName(''); // Start blank as requested
    setUserPhone(''); // Start blank as requested
    setShowPreviousWarningModal(false);
    setStep(2);
  };

  const handleChangeStore = () => {
    setSelectedStoreId('');
    setSelectedStore(null);
    setPreviousData(null);
    setShowPreviousWarningModal(false);
  };

  // -------------------------------------------------------------
  // 3. Step 2: Staff Information & 10-Digit Phone Validation (Req 2 & 3)
  // -------------------------------------------------------------
  const handleStaffInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = userPhone.replace(/\D/g, '');

    if (!userName.trim()) {
      setStaffFormError('กรุณากรอกชื่อ-นามสกุลผู้บันทึก');
      return;
    }

    // Validate phone: must begin with 0 and have exactly 10 digits
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      setStaffFormError('เบอร์โทรศัพท์ต้องขึ้นต้นด้วยเลข 0 และมีความยาวครบ 10 หลัก (เช่น 0812345678)');
      return;
    }

    setStaffFormError(null);
    loadProductCategories();
    setStep(3);
  };

  // -------------------------------------------------------------
  // 4. Product Hierarchy (Category -> Brand -> SubCategory -> Model List)
  // -------------------------------------------------------------
  const loadProductCategories = async () => {
    setLoadingModels(true);
    try {
      // 1. Fetch categories
      const catRes = await fetch('/api/user/models?type=categories');
      const catData = await catRes.json();
      if (catData.success && catData.categories?.length > 0) {
        setCategories(catData.categories);
        setSelectedCategory(catData.categories[0]);
      }

      // 2. Fetch all active models to build dictionary for reviews & summary
      const allRes = await fetch('/api/user/models?type=all');
      const allData = await allRes.json();
      if (allData.success && allData.models) {
        const dict: Record<string, ProductItem> = {};
        allData.models.forEach((m: ProductItem) => {
          dict[m.Model] = m;
        });
        setActiveModelMap((prev) => ({ ...prev, ...dict }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModels(false);
    }
  };

  // When selectedCategory changes -> Fetch Brands and SubCategories for this category
  useEffect(() => {
    if (!selectedCategory || step < 3) return;

    const fetchCategoryHierarchy = async () => {
      setLoadingModels(true);
      try {
        const brandRes = await fetch(`/api/user/models?type=brands&category=${encodeURIComponent(selectedCategory)}`);
        const brandData = await brandRes.json();
        if (brandData.success && brandData.brands?.length > 0) {
          setBrands(brandData.brands);
          setSelectedBrand(brandData.brands[0]);
        } else {
          setBrands([]);
          setSelectedBrand('');
        }

        const subRes = await fetch(`/api/user/models?type=subcategories&category=${encodeURIComponent(selectedCategory)}`);
        const subData = await subRes.json();
        if (subData.success) {
          setSubcategories(subData.subcategories || []);
          setSelectedSubCategory('all');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchCategoryHierarchy();
  }, [selectedCategory, step]);

  // When selectedCategory and selectedBrand change -> Fetch Models under this hierarchy
  useEffect(() => {
    if (!selectedCategory || !selectedBrand || step < 3) {
      setModels([]);
      return;
    }

    const fetchModelsByHierarchy = async () => {
      setLoadingModels(true);
      try {
        const params = new URLSearchParams();
        params.append('category', selectedCategory);
        params.append('brand', selectedBrand);
        if (selectedSubCategory && selectedSubCategory !== 'all') {
          params.append('subcategory', selectedSubCategory);
        }

        const res = await fetch(`/api/user/models?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.models) {
          setModels(data.models);
        } else {
          setModels([]);
        }
      } catch (e) {
        console.error(e);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModelsByHierarchy();
  }, [selectedCategory, selectedBrand, selectedSubCategory, step]);

  // Filtered models for search within current Category & Brand
  const displayedModels = useMemo(() => {
    if (!modelSearch.trim()) return models;
    const q = modelSearch.toLowerCase().trim();
    return models.filter(
      (m) =>
        m.Model.toLowerCase().includes(q) ||
        (m.SubCategory && m.SubCategory.toLowerCase().includes(q))
    );
  }, [models, modelSearch]);

  // -------------------------------------------------------------
  // 5. Fast Touch Counting Handlers (+1, -1, Direct, 0)
  // -------------------------------------------------------------
  const incrementCount = (model: string) => {
    setCounts((prev) => ({
      ...prev,
      [model]: (prev[model] || 0) + 1,
    }));
  };

  const decrementCount = (model: string) => {
    setCounts((prev) => {
      const current = prev[model] || 0;
      if (current <= 0) return prev;
      return {
        ...prev,
        [model]: current - 1,
      };
    });
  };

  const setCountDirect = (model: string, value: number) => {
    if (isNaN(value) || value < 0) return;
    setCounts((prev) => ({
      ...prev,
      [model]: Math.floor(value),
    }));
  };

  // -------------------------------------------------------------
  // 6. Metrics & Live Input Summary Table (Req 3)
  // -------------------------------------------------------------
  const totalDisplayUnits = useMemo(() => {
    return Object.values(counts).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);
  }, [counts]);

  const countedModelsCount = useMemo(() => {
    return Object.values(counts).filter((qty) => qty > 0).length;
  }, [counts]);

  // Live Summary Table: Breakdown by Category and Brand
  const liveSummaryRows = useMemo(() => {
    const summaryMap: Record<string, { category: string; brand: string; modelsCount: number; totalQty: number }> = {};
    for (const [model, qty] of Object.entries(counts)) {
      if (qty > 0) {
        const item = activeModelMap[model] || {
          Category: 'Other',
          Brand: 'Unknown',
          SubCategory: '',
        };
        const key = `${item.Category}___${item.Brand}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            category: item.Category,
            brand: item.Brand,
            modelsCount: 0,
            totalQty: 0,
          };
        }
        summaryMap[key].modelsCount += 1;
        summaryMap[key].totalQty += qty;
      }
    }
    return Object.values(summaryMap);
  }, [counts, activeModelMap]);

  const getCategoryCountedUnits = (categoryName: string) => {
    let sum = 0;
    for (const [model, qty] of Object.entries(counts)) {
      if (qty > 0) {
        const item = activeModelMap[model];
        if (item && item.Category === categoryName) {
          sum += qty;
        }
      }
    }
    return sum;
  };

  const getBrandCountedUnits = (categoryName: string, brandName: string) => {
    let sum = 0;
    for (const [model, qty] of Object.entries(counts)) {
      if (qty > 0) {
        const item = activeModelMap[model];
        if (item && item.Category === categoryName && item.Brand === brandName) {
          sum += qty;
        }
      }
    }
    return sum;
  };

  // Full detailed list for Summary Page (Req 4)
  const fullDetailItems = useMemo(() => {
    const list: { category: string; brand: string; subCategory: string; model: string; qty: number }[] = [];
    for (const [model, qty] of Object.entries(counts)) {
      if (qty > 0) {
        const item = activeModelMap[model] || {
          Category: 'Other',
          Brand: 'Unknown',
          SubCategory: '',
        };
        list.push({
          category: item.Category,
          brand: item.Brand,
          subCategory: item.SubCategory,
          model,
          qty,
        });
      }
    }
    // Sort by Category, Brand, Model
    return list.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
      return a.model.localeCompare(b.model);
    });
  }, [counts, activeModelMap]);

  // -------------------------------------------------------------
  // 7. Survey Submission
  // -------------------------------------------------------------
  const handleSubmitSurvey = async () => {
    if (!selectedStore || !userName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/user/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore.STORE_ID,
          user_name: userName.trim(),
          user_phone: userPhone.replace(/\D/g, ''),
          items: counts,
          is_draft: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStep(5);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-12 font-sans">

      {/* App Top Navigation Bar */}
      <header className="sticky top-0 z-30 glass-header px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">

          {/* Left: Haier Logo (no background) + Company Name */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo directly, no wrapper box */}
            <div className="h-9 w-auto flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/haier-logo.jpg"
                alt="Haier"
                width={64}
                height={36}
                className="h-9 w-auto object-contain rounded-lg"
                priority
              />
            </div>
            {/* Company + App Name */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Haier Thailand
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                  Sell Out Team
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-tight">Display Model Survey</p>
            </div>
          </div>

          {/* Right: Dark mode toggle + Admin link */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`dark-toggle ${darkMode ? 'is-dark' : ''}`}
              aria-label="Toggle dark mode"
            >
              <span className="dark-toggle-thumb" />
              <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
                <Sun className="w-2.5 h-2.5 text-amber-500" />
                <Moon className="w-2.5 h-2.5 text-slate-600" />
              </span>
            </button>

            {/* Admin Login */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin/Viewer
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {/* Step Progress Tracker */}
        {step < 5 && (
          <div className="mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
              
              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => step > 1 && setStep(1)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 1
                      ? 'text-white ring-4 ring-blue-200 shadow-md shadow-blue-700/20'
                      : step > 1
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 1 ? { background: '#0060AF' } : {}}
                >
                  {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </button>
                <span className={`text-[11px] mt-1 font-medium ${step === 1 ? 'text-blue-700' : 'text-slate-500'}`}>
                  เลือกร้านค้า
                </span>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => step > 2 && setStep(2)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 2
                      ? 'text-white ring-4 ring-blue-200 shadow-md shadow-blue-700/20'
                      : step > 2
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 2 ? { background: '#0060AF' } : {}}
                >
                  {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </button>
                <span className={`text-[11px] mt-1 font-medium ${step === 2 ? 'text-blue-700' : 'text-slate-500'}`}>
                  ข้อมูลผู้กรอก
                </span>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => step > 3 && setStep(3)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 3
                      ? 'text-white ring-4 ring-blue-200 shadow-md shadow-blue-700/20'
                      : step > 3
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 3 ? { background: '#0060AF' } : {}}
                >
                  {step > 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                </button>
                <span className={`text-[11px] mt-1 font-medium ${step === 3 ? 'text-blue-700' : 'text-slate-500'}`}>
                  นับสินค้า
                </span>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 4
                      ? 'text-white ring-4 ring-blue-200 shadow-md shadow-blue-700/20'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 4 ? { background: '#0060AF' } : {}}
                >
                  4
                </div>
                <span className={`text-[11px] mt-1 font-medium ${step === 4 ? 'text-blue-700' : 'text-slate-500'}`}>
                  สรุปผล
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: LANDING PAGE - STORE SELECTION VIA DROPDOWNS      */}
        {/* ========================================================= */}
        {step === 1 && (
          <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ขั้นตอนที่ 1: เลือกร้านค้า / สาขา</h2>
                  <p className="text-xs text-slate-500">เลือกข้อมูลตามลำดับจาก Dropdown ด้านล่าง</p>
                </div>
              </div>

              {/* 1.1 Customer Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. เลือกลูกค้า / ห้างร้าน (Customer) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- กรุณาเลือกลูกค้า / ห้างร้าน --</option>
                    {customers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 1.2 Region Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. เลือกภูมิภาค (Region) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    disabled={!selectedCustomer || loadingStores}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedCustomer
                        ? '-- กรุณาเลือกลูกค้าก่อน --'
                        : loadingStores
                        ? '-- กำลังโหลดภูมิภาค... --'
                        : '-- กรุณาเลือกภูมิภาค --'}
                    </option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 1.3 Store Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. เลือกสาขา (Store) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedStoreId}
                    onChange={(e) => handleStoreDropdownChange(e.target.value)}
                    disabled={!selectedRegion || loadingStores}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedRegion
                        ? '-- กรุณาเลือกภูมิภาคก่อน --'
                        : loadingStores
                        ? '-- กำลังโหลดรายชื่อสาขา... --'
                        : `-- กรุณาเลือกสาขา (${stores.length} สาขา) --`}
                    </option>
                    {stores.map((s) => (
                      <option key={s.STORE_ID} value={s.STORE_ID}>
                        {s.Store_Name_TH} (จ.{s.Province_TH}) - [{s.STORE_ID}]
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {checkingPrevious && (
                <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                  กำลังตรวจสอบประวัติการสำรวจของสาขานี้...
                </div>
              )}

              {/* Store Preview Card & Next Action */}
              {selectedStore && !checkingPrevious && (
                <div className="pt-2 animate-fadeIn space-y-3">
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                    <div className="text-xs font-semibold text-blue-700 uppercase mb-0.5">สาขาที่เลือก:</div>
                    <div className="text-base font-bold text-slate-900">
                      {selectedStore.Customer} - {selectedStore.Store_Name_TH}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                      <span>จังหวัด: {selectedStore.Province_TH}</span>
                      <span>•</span>
                      <span>ภูมิภาค: {selectedStore.Region_TH}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">รหัส: {selectedStore.STORE_ID}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (previousData?.hasPrevious) {
                        setShowPreviousWarningModal(true);
                      } else {
                        handleProceedToStaffInfo();
                      }
                    }}
                    className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 touch-press"
                  >
                    <span>ถัดไป: กรอกข้อมูลผู้บันทึก</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PREVIOUS DATA WARNING & DECISION MODAL (Req 1)            */}
        {/* ========================================================= */}
        {showPreviousWarningModal && previousData && selectedStore && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg p-6 rounded-3xl shadow-2xl border border-slate-100 animate-scaleIn space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header Warning */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    แจ้งเตือน: สาขานี้เคยมีการบันทึกข้อมูล Display แล้ว
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    สาขา <span className="font-bold text-slate-800">{selectedStore.Store_Name_TH}</span> ({selectedStore.Customer})
                  </p>
                </div>
              </div>

              {/* Submitter Details Banner */}
              <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs space-y-1.5 text-amber-900">
                <div className="flex justify-between">
                  <span className="text-amber-700 font-medium">บันทึกครั้งล่าสุดโดย:</span>
                  <span className="font-bold">{previousData.entry?.user_name} ({previousData.entry?.user_phone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700 font-medium">วันเวลาที่บันทึก:</span>
                  <span className="font-mono">
                    {previousData.entry?.submitted_at &&
                      new Date(previousData.entry.submitted_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-200 text-sm font-bold text-amber-950">
                  <span>ยอด Display ที่เคยบันทึกไว้:</span>
                  <span className="font-mono text-blue-700">{previousData.totalQty} เครื่อง ({previousData.totalModels} รุ่น)</span>
                </div>
              </div>

              {/* Summary Breakdown Table of Previous Data */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                  สรุปรายการสินค้าเดิมที่เคยบันทึกไว้:
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">หมวดหมู่ (Category)</th>
                        <th className="py-2 px-3">แบรนด์ (Brand)</th>
                        <th className="py-2 px-3 text-right">จำนวนรุ่น</th>
                        <th className="py-2 px-3 text-right">จำนวน Display</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previousData.categorySummary?.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.Category}</td>
                          <td className="py-2 px-3 text-slate-600">{row.Brand}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.model_count} รุ่น</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">{row.total_qty} เครื่อง</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Decision Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleRevisePreviousData}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 touch-press"
                >
                  <ClipboardList className="w-4 h-4" />
                  ดำเนินการแก้ไขข้อมูลเดิมต่อ (Revise Data)
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleProceedToStaffInfo}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    เริ่มนับใหม่จาก 0
                  </button>

                  <button
                    type="button"
                    onClick={handleChangeStore}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Store className="w-3.5 h-3.5" />
                    เปลี่ยนสาขา
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: STAFF INFO - ALWAYS STARTS BLANK (Req 2 & 3)       */}
        {/* ========================================================= */}
        {step === 2 && selectedStore && (
          <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
            {/* Selected Store Summary Pill */}
            <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-700 text-white rounded-xl shadow-sm">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-700 uppercase">สาขาที่เลือก</div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedStore.Customer} - {selectedStore.Store_Name_TH} ({selectedStore.Province_TH})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-blue-700 hover:underline px-2 py-1"
              >
                เปลี่ยน
              </button>
            </div>

            {/* Staff Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ขั้นตอนที่ 2: ข้อมูลผู้กรอก</h2>
                  <p className="text-xs text-slate-500">กรุณากรอกชื่อและเบอร์โทรศัพท์ 10 หลัก</p>
                </div>
              </div>

              {staffFormError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{staffFormError}</span>
                </div>
              )}

              <form onSubmit={handleStaffInfoSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ชื่อ-นามสกุล ผู้บันทึก <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      id="userName"
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="กรอกชื่อ-นามสกุล..."
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="userPhone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เบอร์โทรศัพท์ (10 หลัก เริ่มต้นด้วย 0) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input
                      id="userPhone"
                      type="tel"
                      required
                      maxLength={10}
                      value={userPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setUserPhone(val);
                      }}
                      placeholder="08xxxxxxxx"
                      className="block w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm font-mono tracking-wider"
                    />
                    {userPhone.length === 10 && userPhone.startsWith('0') && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600 pointer-events-none">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    * ต้องขึ้นต้นด้วยเลข 0 และมีตัวเลขครบ 10 หลัก (เช่น 0812345678)
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-1.5"
                  >
                    ถัดไป: นับสินค้า <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: HIERARCHY COUNTING WITH LIVE INPUT SUMMARY TABLE  */}
        {/* ========================================================= */}
        {step === 3 && selectedStore && (
          <div className="space-y-4 animate-fadeIn">
            {/* Top Store Info Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 truncate">
                  <span>{selectedStore.Customer}</span>
                  <span>•</span>
                  <span>{selectedStore.Store_Name_TH}</span>
                </div>
                <div className="text-xs text-slate-600 truncate mt-0.5">
                  ผู้บันทึก: <span className="font-medium text-slate-800">{userName}</span> ({userPhone})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-slate-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                แก้ไข
              </button>
            </div>

            {/* LIVE INPUT SUMMARY TABLE ON TOP (Req 3) */}
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
              <div 
                onClick={() => setShowLiveSummary(!showLiveSummary)}
                className="bg-blue-50/80 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold text-blue-900">
                    ตารางสรุปยอดที่กำลังบันทึก (Input Summary)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                    รวม: {totalDisplayUnits} เครื่อง ({countedModelsCount} รุ่น)
                  </span>
                  {showLiveSummary ? <ChevronUp className="w-4 h-4 text-blue-700" /> : <ChevronDown className="w-4 h-4 text-blue-700" />}
                </div>
              </div>

              {showLiveSummary && (
                <div className="p-3">
                  {liveSummaryRows.length === 0 ? (
                    <div className="text-center py-3 text-slate-400 text-xs">
                      ยังไม่มีการนับจำนวนสินค้า (แตะปุ่ม + หรือกรอกตัวเลขด้านล่างเพื่อเริ่มนับ)
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                          <tr>
                            <th className="py-1.5 px-3">หมวดหมู่ (Category)</th>
                            <th className="py-1.5 px-3">แบรนด์ (Brand)</th>
                            <th className="py-1.5 px-3 text-right">จำนวนรุ่น</th>
                            <th className="py-1.5 px-3 text-right">ยอดรวม Display</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {liveSummaryRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/40">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">{row.category}</td>
                              <td className="py-1.5 px-3 text-slate-600">{row.brand}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-700">{row.modelsCount} รุ่น</td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-700">{row.totalQty} เครื่อง</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hierarchy Level 1: Category Scroll Tabs */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {categories.map((cat) => {
                  const catUnits = getCategoryCountedUnits(cat);
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 touch-press ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <span>{cat}</span>
                      {catUnits > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isActive ? 'bg-white text-blue-700' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {catUnits}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hierarchy Level 2: Brand Selection Dropdown & SubCategory Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Brand Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    แบรนด์ (Brand) ในหมวด {selectedCategory}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white appearance-none cursor-pointer"
                    >
                      {brands.map((b) => {
                        const brandUnits = getBrandCountedUnits(selectedCategory, b);
                        return (
                          <option key={b} value={b}>
                            {b} {brandUnits > 0 ? `(${brandUnits} เครื่องที่นับแล้ว)` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* SubCategory Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ประเภทย่อย (SubCategory)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white appearance-none cursor-pointer"
                    >
                      <option value="all">ทุกประเภทย่อย (All SubCategories)</option>
                      {subcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Quick Search */}
              <div className="relative pt-1 border-t border-slate-100">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={`ค้นหารหัสรุ่นของ ${selectedBrand}...`}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Model List with Input on Right */}
            {loadingModels ? (
              <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-5 h-5 animate-spin text-blue-700" /> กำลังโหลดรายการรุ่นสินค้า...
              </div>
            ) : displayedModels.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                ไม่พบรุ่นสินค้าสำหรับแบรนด์ {selectedBrand} ในหมวดหมู่นี้
              </div>
            ) : (
              <div className="space-y-2.5 pb-12">
                <div className="text-[11px] font-bold text-slate-500 uppercase px-1">
                  รายการรุ่นสินค้า ({displayedModels.length} รุ่น):
                </div>

                {displayedModels.map((item) => {
                  const qty = counts[item.Model] || 0;
                  return (
                    <div
                      key={item.Model}
                      className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        qty > 0
                          ? 'bg-blue-50/50 border-blue-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Left Side: Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                            {item.Brand}
                          </span>
                          {item.SubCategory && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.SubCategory}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-slate-900 font-mono mt-1 truncate">
                          {item.Model}
                        </div>
                      </div>

                      {/* Right Side: Number Input & Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => decrementCount(item.Model)}
                          disabled={qty <= 0}
                          className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-press"
                          aria-label="ลดจำนวน"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="w-14 text-center">
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => setCountDirect(item.Model, parseInt(e.target.value, 10) || 0)}
                            className={`w-full py-1 text-center font-extrabold text-lg font-mono rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              qty > 0
                                ? 'bg-white text-blue-700 border-blue-300 shadow-inner'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => incrementCount(item.Model)}
                          className="w-10 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold hover:bg-blue-800 active:scale-95 transition-all shadow-sm shadow-blue-700/20 touch-press"
                          aria-label="เพิ่มจำนวน"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: SUMMARY PAGE - SHOW ALL DETAILS (Req 4)           */}
        {/* ========================================================= */}
        {step === 4 && selectedStore && (
          <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn">
            {/* Header & Meta Summary */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ขั้นตอนที่ 4: ตรวจสอบรายละเอียดทั้งหมดก่อนส่ง</h2>
                  <p className="text-xs text-slate-500">กรุณาตรวจสอบข้อมูลสาขา ผู้บันทึก และรายการสินค้าทั้งหมด</p>
                </div>
              </div>

              {/* Store & Staff Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <StoreIcon className="w-4 h-4 text-blue-700" /> ข้อมูลสาขา
                  </div>
                  <div><span className="text-slate-500">ลูกค้า:</span> <span className="font-semibold text-slate-900">{selectedStore.Customer}</span></div>
                  <div><span className="text-slate-500">สาขา:</span> <span className="font-semibold text-slate-900">{selectedStore.Store_Name_TH}</span></div>
                  <div><span className="text-slate-500">จังหวัด:</span> <span className="text-slate-700">{selectedStore.Province_TH} ({selectedStore.Region_TH})</span></div>
                  <div><span className="text-slate-500">STORE_ID:</span> <span className="font-mono text-slate-700">{selectedStore.STORE_ID}</span></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-700" /> ข้อมูลผู้บันทึก
                  </div>
                  <div><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-bold text-slate-900">{userName}</span></div>
                  <div><span className="text-slate-500">เบอร์โทรศัพท์:</span> <span className="font-mono text-slate-900 font-semibold">{userPhone}</span></div>
                  <div className="pt-2 border-t border-slate-200 text-sm font-bold text-blue-700 flex justify-between">
                    <span>ยอด Display รวม:</span>
                    <span className="font-mono">{totalDisplayUnits} เครื่อง ({countedModelsCount} รุ่น)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category & Brand Summary Table */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                1. ตารางสรุปยอดแยกตามหมวดหมู่และแบรนด์
              </h3>

              {liveSummaryRows.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">ไม่มีรายการสินค้า</div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">หมวดหมู่ (Category)</th>
                        <th className="py-2.5 px-3">แบรนด์ (Brand)</th>
                        <th className="py-2.5 px-3 text-right">จำนวนรุ่น</th>
                        <th className="py-2.5 px-3 text-right">ยอดรวม Display</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {liveSummaryRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-900">{row.category}</td>
                          <td className="py-2 px-3 text-slate-700">{row.brand}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">{row.modelsCount} รุ่น</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">{row.totalQty} เครื่อง</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* FULL DETAIL TABLE OF ALL MODELS (Req 4) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700" />
                2. ตารางรายละเอียดสินค้าทุกรุ่น ({fullDetailItems.length} รุ่น)
              </h3>

              {fullDetailItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ยังไม่ได้ระบุจำนวนสินค้าในรุ่นใด
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs max-h-96 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">หมวดหมู่</th>
                        <th className="py-2.5 px-3">แบรนด์</th>
                        <th className="py-2.5 px-3">รหัสรุ่น (Model)</th>
                        <th className="py-2.5 px-3">ประเภทย่อย</th>
                        <th className="py-2.5 px-3 text-right">จำนวน (เครื่อง)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {fullDetailItems.map((item, idx) => (
                        <tr key={item.model} className="hover:bg-blue-50/30">
                          <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.category}</td>
                          <td className="py-2 px-3 text-slate-700">{item.brand}</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-800">{item.model}</td>
                          <td className="py-2 px-3 text-slate-500">{item.subCategory || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-blue-700 text-sm">
                            {item.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSurvey}
                  disabled={submitting}
                  className="flex-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/25 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> ยืนยันและส่งข้อมูล
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 5: SUCCESS CONFIRMATION SCREEN                       */}
        {/* ========================================================= */}
        {step === 5 && (
          <div className="max-w-md mx-auto text-center py-8 animate-scaleIn">
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-1">บันทึกข้อมูลสำเร็จ!</h2>
              <p className="text-xs text-slate-500 mb-6">ระบบได้บันทึกจำนวนสินค้าตั้งโชว์เรียบร้อยแล้ว</p>

              {selectedStore && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-500">สาขา:</span>
                    <span className="font-bold text-slate-900">{selectedStore.Store_Name_TH}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้บันทึก:</span>
                    <span className="font-semibold text-slate-900">{userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ยอดรวม Display:</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {totalDisplayUnits} เครื่อง ({countedModelsCount} รุ่น)
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedStore(null);
                  setSelectedStoreId('');
                  setSelectedCustomer('');
                  setSelectedRegion('');
                  setPreviousData(null);
                  setUserName('');
                  setUserPhone('');
                  setCounts({});
                  setStep(1);
                }}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20"
              >
                บันทึกสาขาอื่นต่อไป
              </button>
            </div>
          </div>
        )}

        {/* Footer info & version */}
        <footer className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1 pb-4">
          <div>Sell Out Team, Haier Thailand</div>
          <div className="font-mono text-[10px]">
            Version: {process.env.NEXT_PUBLIC_GIT_COMMIT || '478e520'}
          </div>
        </footer>
      </main>

      {/* Sticky Bottom Summary Bar (Active during Step 3 Counting) */}
      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-3 shadow-lg shadow-slate-900/10">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">ยอด Display รวม</div>
              <div className="text-lg font-bold text-blue-700 font-mono leading-none">
                {totalDisplayUnits} <span className="text-xs font-normal text-slate-600">เครื่อง</span>{' '}
                <span className="text-xs font-normal text-slate-400 font-sans">({countedModelsCount} รุ่น)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="py-2.5 px-5 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all shadow-md shadow-blue-700/20 flex items-center gap-1.5 touch-press"
            >
              <span>ดูสรุป / ส่งข้อมูล</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
