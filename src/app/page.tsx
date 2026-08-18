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
  Sun,
  Camera,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

interface StoreItem {
  STORE_ID: string;
  Customer: string;
  STORE_NAME: string;
  Store_Name_TH: string;
  Province_TH: string;
  Region_TH: string;
  Store_ID_Customer?: string;
}

interface ProductItem {
  Model: string;
  Brand: string;
  Category: string;
  SubCategory: string;
  Active_Inactive: string;
}

interface DisplayRequestInput {
  id: string;
  model_name: string;
  quantity: number;
  remark: string;
  picture_base64: string;
  picture_preview: string;
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

  // 4. "ขอสินค้าตัวโชว์" (Display Model Requests) State
  const [displayRequests, setDisplayRequests] = useState<DisplayRequestInput[]>([]);

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
  // 7. "ขอสินค้าตัวโชว์" (Display Model Requests) Handlers
  // -------------------------------------------------------------
  const addDisplayRequest = () => {
    setDisplayRequests((prev) => [
      ...prev,
      {
        id: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        model_name: '',
        quantity: 1,
        remark: '',
        picture_base64: '',
        picture_preview: '',
      },
    ]);
  };

  const removeDisplayRequest = (id: string) => {
    setDisplayRequests((prev) => prev.filter((item) => item.id !== id));
  };

  const updateDisplayRequest = (id: string, field: keyof DisplayRequestInput, value: any) => {
    setDisplayRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRequestImageUpload = (requestId: string, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setDisplayRequests((prev) =>
            prev.map((r) =>
              r.id === requestId
                ? { ...r, picture_base64: dataUrl, picture_preview: dataUrl }
                : r
            )
          );
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // 8. Survey Submission
  // -------------------------------------------------------------
  const handleSubmitSurvey = async () => {
    if (!selectedStore || !userName.trim()) return;

    // Validate Display Requests (if any added)
    if (displayRequests.length > 0) {
      for (let i = 0; i < displayRequests.length; i++) {
        const reqItem = displayRequests[i];
        if (!reqItem.model_name.trim()) {
          alert(`กรุณาระบุชื่อรุ่นสำหรับรายการขอสินค้าตัวโชว์ที่ #${i + 1}`);
          return;
        }
        if (!reqItem.picture_base64) {
          alert(`กรุณาถ่ายรูปหรือแนบรูปพื้นที่ตั้งโชว์ สำหรับรุ่น [${reqItem.model_name}] (รายการที่ #${i + 1})`);
          return;
        }
      }
    }

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
          display_requests: displayRequests.map((r) => ({
            model_name: r.model_name.trim(),
            quantity: Math.max(1, r.quantity || 1),
            remark: (r.remark || '').trim(),
            picture_base64: r.picture_base64,
          })),
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

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5">
        {/* Step Progress Tracker */}
        {step < 5 && (
          <div className="mb-4 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
              
              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => step > 1 && setStep(1)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 1
                      ? 'text-white ring-2 ring-blue-300 shadow-xs'
                      : step > 1
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 1 ? { background: '#0060AF' } : {}}
                >
                  {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                </button>
                <span className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${step === 1 ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                  เลือกร้านค้า
                </span>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => step > 2 && setStep(2)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 2
                      ? 'text-white ring-2 ring-blue-300 shadow-xs'
                      : step > 2
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 2 ? { background: '#0060AF' } : {}}
                >
                  {step > 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '2'}
                </button>
                <span className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${step === 2 ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                  ข้อมูลผู้กรอก
                </span>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => step > 3 && setStep(3)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 3
                      ? 'text-white ring-2 ring-blue-300 shadow-xs'
                      : step > 3
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 3 ? { background: '#0060AF' } : {}}
                >
                  {step > 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '3'}
                </button>
                <span className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${step === 3 ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                  นับสินค้า
                </span>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 4
                      ? 'text-white ring-2 ring-blue-300 shadow-xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  style={step === 4 ? { background: '#0060AF' } : {}}
                >
                  4
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${step === 4 ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
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
          <div className="max-w-xl mx-auto space-y-4 animate-fadeIn">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">ขั้นตอนที่ 1: เลือกร้านค้า / สาขา</h2>
                  <p className="text-[11px] text-slate-500">เลือกข้อมูลตามลำดับจาก Dropdown ด้านล่าง</p>
                </div>
              </div>

              {/* 1.1 Customer Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. เลือกลูกค้า / ห้างร้าน (Customer) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- กรุณาเลือกลูกค้า / ห้างร้าน --</option>
                    {customers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 1.2 Region Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. เลือกภูมิภาค (Region) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    disabled={!selectedCustomer || loadingStores}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 1.3 Store Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. เลือกสาขา (Store) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedStoreId}
                    onChange={(e) => handleStoreDropdownChange(e.target.value)}
                    disabled={!selectedRegion || loadingStores}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                        {s.Store_Name_TH} · จ.{s.Province_TH}{s.Store_ID_Customer ? ` · รหัสห้าง: ${s.Store_ID_Customer}` : ` · [${s.STORE_ID}]`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {checkingPrevious && (
                <div className="p-2.5 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                  กำลังตรวจสอบประวัติการสำรวจของสาขานี้...
                </div>
              )}

              {/* Store Preview Card & Next Action */}
              {selectedStore && !checkingPrevious && (
                <div className="pt-1 animate-fadeIn space-y-2.5">
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">สาขาที่เลือก</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {selectedStore.Customer}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {selectedStore.Store_Name_TH}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700 shadow-xs">
                        📍 จ.{selectedStore.Province_TH}
                      </span>
                      {selectedStore.Store_ID_Customer && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono font-medium text-slate-700 shadow-xs">
                          🏢 รหัสห้าง: {selectedStore.Store_ID_Customer}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-500 shadow-xs">
                        ID: {selectedStore.STORE_ID}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shadow-xs">
                        ภาค{selectedStore.Region_TH}
                      </span>
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
                    className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-1.5 touch-press"
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
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white w-full max-w-md p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-100 animate-scaleIn space-y-3.5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">
                    พบประวัติการสำรวจของสาขานี้แล้ว
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    สาขา: <span className="font-semibold text-slate-800">{selectedStore.Store_Name_TH}</span>
                  </p>
                </div>
              </div>

              {/* Previous Summary Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-amber-900 border-b border-amber-200/60 pb-1.5">
                  <span>ผู้บันทึกล่าสุด:</span>
                  <span className="font-semibold">{previousData.entry?.user_name} ({previousData.entry?.user_phone})</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-amber-900 border-b border-amber-200/60 pb-1.5">
                  <span>วันเวลาที่บันทึก:</span>
                  <span className="font-mono text-slate-700">
                    {previousData.entry?.submitted_at
                      ? new Date(previousData.entry.submitted_at).toLocaleString('th-TH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-amber-950 pt-0.5">
                  <span>ยอด Display รวม:</span>
                  <span className="font-mono text-blue-800 text-xs">
                    {previousData.totalQty} เครื่อง ({previousData.totalModels} รุ่น)
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleRevisePreviousData}
                  className="w-full p-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-left transition-all shadow-xs flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>1. โหลดข้อมูลเดิมมาแก้ไข (Revise)</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="text-[10px] text-blue-100 mt-0.5">
                      ดึงตัวเลขเดิมขึ้นมา แล้วปรับแก้เฉพาะรุ่นที่เปลี่ยนแปลง
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToStaffInfo}
                  className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-left transition-all border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs">2. เริ่มนับใหม่ทั้งหมด (Start Fresh)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ตั้งค่าจำนวนทุกรุ่นเป็น 0 และเริ่มบันทึกใหม่
                    </div>
                  </div>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowPreviousWarningModal(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline inline-flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" />
                  เปลี่ยนสาขา
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: STAFF INFO - ALWAYS STARTS BLANK (Req 2 & 3)       */}
        {/* ========================================================= */}
        {step === 2 && selectedStore && (
          <div className="max-w-lg mx-auto space-y-4 animate-fadeIn">
            {/* Selected Store Summary Pill */}
            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-700 text-white rounded-xl shadow-xs">
                  <StoreIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-blue-700 uppercase">สาขาที่เลือก</div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {selectedStore.Customer} - {selectedStore.Store_Name_TH} ({selectedStore.Province_TH})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-blue-700 hover:underline px-2 py-1 flex-shrink-0"
              >
                เปลี่ยน
              </button>
            </div>

            {/* Staff Form */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">ขั้นตอนที่ 2: ข้อมูลผู้กรอก</h2>
                  <p className="text-[11px] text-slate-500">กรุณากรอกชื่อและเบอร์โทรศัพท์ 10 หลัก</p>
                </div>
              </div>

              {staffFormError && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{staffFormError}</span>
                </div>
              )}

              <form onSubmit={handleStaffInfoSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="userName" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ชื่อ-นามสกุล ผู้บันทึก <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="userName"
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="กรอกชื่อ-นามสกุล..."
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="userPhone" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ (10 หลัก เริ่มต้นด้วย 0) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
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
                      className="block w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-xs sm:text-sm font-mono tracking-wider"
                    />
                    {userPhone.length === 10 && userPhone.startsWith('0') && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600 pointer-events-none">
                        <Check className="w-4 h-4" />
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
          <div className="space-y-3 animate-fadeIn">
            {/* Top Store Info Bar */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-semibold text-blue-700 flex items-center gap-1 truncate">
                  <span>{selectedStore.Customer}</span>
                  <span>•</span>
                  <span>{selectedStore.Store_Name_TH}</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate mt-0.5">
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
            <div className="bg-white rounded-xl border border-blue-200 shadow-xs overflow-hidden">
              <div 
                onClick={() => setShowLiveSummary(!showLiveSummary)}
                className="bg-blue-50/80 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-blue-100/70 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                  <span className="text-xs font-bold text-blue-900">
                    ตารางสรุปยอดที่กำลังบันทึก (Input Summary)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold font-mono text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    รวม: {totalDisplayUnits} เครื่อง ({countedModelsCount} รุ่น)
                  </span>
                  {showLiveSummary ? <ChevronUp className="w-3.5 h-3.5 text-blue-700" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-700" />}
                </div>
              </div>

              {showLiveSummary && (
                <div className="p-2.5">
                  {liveSummaryRows.length === 0 ? (
                    <div className="text-center py-2.5 text-slate-400 text-xs">
                      ยังไม่มีการนับจำนวนสินค้า (แตะปุ่ม + หรือกรอกตัวเลขด้านล่างเพื่อเริ่มนับ)
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                          <tr>
                            <th className="py-1 px-2.5">หมวดหมู่</th>
                            <th className="py-1 px-2.5">แบรนด์</th>
                            <th className="py-1 px-2.5 text-right">จำนวนรุ่น</th>
                            <th className="py-1 px-2.5 text-right">ยอดรวม Display</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {liveSummaryRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/40">
                              <td className="py-1 px-2.5 font-semibold text-slate-800">{row.category}</td>
                              <td className="py-1 px-2.5 text-slate-600">{row.brand}</td>
                              <td className="py-1 px-2.5 text-right font-mono text-slate-700">{row.modelsCount} รุ่น</td>
                              <td className="py-1 px-2.5 text-right font-mono font-bold text-blue-700">{row.totalQty} เครื่อง</td>
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
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {categories.map((cat) => {
                  const catUnits = getCategoryCountedUnits(cat);
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 touch-press ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <span>{cat}</span>
                      {catUnits > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
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
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Brand Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                    แบรนด์ (Brand) ในหมวด {selectedCategory}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white appearance-none cursor-pointer"
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
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* SubCategory Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                    ประเภทย่อย (SubCategory)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white appearance-none cursor-pointer"
                    >
                      <option value="all">ทุกประเภทย่อย (All SubCategories)</option>
                      {subcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Quick Search */}
              <div className="relative pt-0.5">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={`ค้นหารหัสรุ่นของ ${selectedBrand}...`}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Model List with Input on Right */}
            {loadingModels ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2 bg-white rounded-xl border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> กำลังโหลดรายการรุ่นสินค้า...
              </div>
            ) : displayedModels.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                ไม่พบรุ่นสินค้าสำหรับแบรนด์ {selectedBrand} ในหมวดหมู่นี้
              </div>
            ) : (
              <div className="space-y-1.5 pb-20">
                <div className="text-[10px] font-bold text-slate-500 uppercase px-1">
                  รายการรุ่นสินค้า ({displayedModels.length} รุ่น):
                </div>

                {displayedModels.map((item) => {
                  const qty = counts[item.Model] || 0;
                  return (
                    <div
                      key={item.Model}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                        qty > 0
                          ? 'bg-blue-50/60 border-blue-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Left Side: Model Info (Clean & Space Saving) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-white">
                            {item.Brand}
                          </span>
                          {item.SubCategory && (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {item.SubCategory}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5 truncate leading-tight">
                          {item.Model}
                        </div>
                      </div>

                      {/* Right Side: Number Input & Stepper Controls */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => decrementCount(item.Model)}
                          disabled={qty <= 0}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-press"
                          aria-label="ลดจำนวน"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-11 sm:w-12 text-center">
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => setCountDirect(item.Model, parseInt(e.target.value, 10) || 0)}
                            className={`w-full py-0.5 text-center font-bold text-sm sm:text-base font-mono rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              qty > 0
                                ? 'bg-white text-blue-700 border-blue-300 shadow-inner'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => incrementCount(item.Model)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold hover:bg-blue-800 active:scale-95 transition-all shadow-xs touch-press"
                          aria-label="เพิ่มจำนวน"
                        >
                          <Plus className="w-4 h-4" />
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
          <div className="space-y-4 max-w-3xl mx-auto animate-fadeIn">
            {/* Header & Meta Summary */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">ขั้นตอนที่ 4: ตรวจสอบรายละเอียดทั้งหมดก่อนส่ง</h2>
                  <p className="text-[11px] text-slate-500">กรุณาตรวจสอบข้อมูลสาขา ผู้บันทึก และรายการสินค้าทั้งหมด</p>
                </div>
              </div>

              {/* Store & Staff Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <StoreIcon className="w-3.5 h-3.5 text-blue-700" /> ข้อมูลสาขา
                  </div>
                  <div><span className="text-slate-500">ลูกค้า:</span> <span className="font-semibold text-slate-900">{selectedStore.Customer}</span></div>
                  <div><span className="text-slate-500">สาขา:</span> <span className="font-semibold text-slate-900">{selectedStore.Store_Name_TH}</span></div>
                  <div><span className="text-slate-500">จังหวัด:</span> <span className="text-slate-700">{selectedStore.Province_TH} ({selectedStore.Region_TH})</span></div>
                  {selectedStore.Store_ID_Customer && (
                    <div><span className="text-slate-500">รหัสสาขาห้าง:</span> <span className="font-mono text-slate-700">{selectedStore.Store_ID_Customer}</span></div>
                  )}
                  <div><span className="text-slate-500">STORE_ID:</span> <span className="font-mono text-slate-700">{selectedStore.STORE_ID}</span></div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-700" /> ข้อมูลผู้บันทึก
                  </div>
                  <div><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-bold text-slate-900">{userName}</span></div>
                  <div><span className="text-slate-500">เบอร์โทรศัพท์:</span> <span className="font-mono text-slate-900 font-semibold">{userPhone}</span></div>
                  <div className="pt-1.5 border-t border-slate-200 text-xs font-bold text-blue-700 flex justify-between">
                    <span>ยอด Display รวม:</span>
                    <span className="font-mono">{totalDisplayUnits} เครื่อง ({countedModelsCount} รุ่น)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category & Brand Summary Table */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                1. ตารางสรุปยอดแยกตามหมวดหมู่และแบรนด์
              </h3>

              {liveSummaryRows.length === 0 ? (
                <div className="py-5 text-center text-slate-400 text-xs">ไม่มีรายการสินค้า</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">หมวดหมู่</th>
                        <th className="py-2 px-2.5">แบรนด์</th>
                        <th className="py-2 px-2.5 text-right">จำนวนรุ่น</th>
                        <th className="py-2 px-2.5 text-right">ยอดรวม Display</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {liveSummaryRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-semibold text-slate-900">{row.category}</td>
                          <td className="py-1.5 px-2.5 text-slate-700">{row.brand}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{row.modelsCount} รุ่น</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-700">{row.totalQty} เครื่อง</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* FULL DETAIL TABLE OF ALL MODELS (Req 4) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-700" />
                2. ตารางรายละเอียดสินค้าทุกรุ่น ({fullDetailItems.length} รุ่น)
              </h3>

              {fullDetailItems.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  ยังไม่ได้ระบุจำนวนสินค้าในรุ่นใด
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] max-h-80 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">หมวดหมู่</th>
                        <th className="py-2 px-2.5">แบรนด์</th>
                        <th className="py-2 px-2.5">รหัสรุ่น (Model)</th>
                        <th className="py-2 px-2.5">ประเภทย่อย</th>
                        <th className="py-2 px-2.5 text-right">จำนวน (เครื่อง)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {fullDetailItems.map((item, idx) => (
                        <tr key={item.model} className="hover:bg-blue-50/30">
                          <td className="py-1.5 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-semibold text-slate-900">{item.category}</td>
                          <td className="py-1.5 px-2.5 text-slate-700">{item.brand}</td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-blue-800 text-xs">{item.model}</td>
                          <td className="py-1.5 px-2.5 text-slate-500">{item.subCategory || '-'}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-700 text-xs sm:text-sm">
                            {item.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 3. FUNCTION "ขอสินค้าตัวโชว์" (Request Display Model)       */}
            {/* ========================================================= */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-orange-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-50 text-orange-700">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      3. ขอสินค้าตัวโชว์ (Request Display Model)
                      <span className="text-[10px] font-normal text-slate-400">(ไม่บังคับ / Optional)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ขอสินค้ารุ่นใหม่มาตั้งโชว์ในสาขานี้ พร้อมแนบรูปถ่ายพื้นที่และตำแหน่งที่ต้องการวางโชว์
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addDisplayRequest}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all flex items-center gap-1.5 touch-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรายการขอตัวโชว์</span>
                </button>
              </div>

              {displayRequests.length === 0 ? (
                <div 
                  onClick={addDisplayRequest}
                  className="py-5 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/30 transition-colors cursor-pointer group"
                >
                  <div className="text-xs font-semibold text-slate-600 group-hover:text-orange-700">
                    + แตะที่นี่เพื่อเพิ่มรายการขอสินค้าตัวโชว์ใหม่สำหรับสาขานี้
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    (สามารถระบุชื่อรุ่น จำนวน และถ่ายรูปพื้นที่/ตำแหน่งที่จะตั้งโชว์ได้มากกว่า 1 รายการ)
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {displayRequests.map((reqItem, idx) => (
                    <div
                      key={reqItem.id}
                      className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/30 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white text-[10px] font-bold font-mono">
                          รายการขอตัวโชว์ #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDisplayRequest(reqItem.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Model Name Input (Required) */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            ชื่อรุ่นที่ต้องการขอ (Model Name) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={reqItem.model_name}
                            onChange={(e) => updateDisplayRequest(reqItem.id, 'model_name', e.target.value)}
                            placeholder="ระบุรหัสรุ่น เช่น HSU-12VNS, HRF-THM20NS..."
                            className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        {/* Quantity (Units) */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            จำนวนที่ขอ (เครื่อง) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={reqItem.quantity}
                            onChange={(e) => updateDisplayRequest(reqItem.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Display Location Picture Upload (Required) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          รูปถ่ายพื้นที่ / ตำแหน่งที่จะตั้งโชว์ (Display Location Photo) <span className="text-red-500">*</span>
                        </label>

                        {reqItem.picture_preview ? (
                          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                            <div className="relative h-16 w-20 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                              <img
                                src={reqItem.picture_preview}
                                alt="Location preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold">
                                <Check className="w-3.5 h-3.5" /> แนบรูปถ่ายพื้นที่แล้ว
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                พร้อมส่งไปยังผู้ดูแลระบบ
                              </p>
                              <div className="flex gap-2 mt-1.5">
                                <label className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer">
                                  เปลี่ยนรูป
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleRequestImageUpload(reqItem.id, file);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateDisplayRequest(reqItem.id, 'picture_base64', '');
                                    updateDisplayRequest(reqItem.id, 'picture_preview', '');
                                  }}
                                  className="text-[11px] font-semibold text-red-600 hover:underline"
                                >
                                  ลบรูป
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-orange-300 rounded-xl hover:bg-orange-50/50 cursor-pointer transition-all touch-press group">
                            <Camera className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-orange-700">
                              ถ่ายรูป หรือเลือกรูปภาพพื้นที่ตั้งโชว์ (บังคับแนบรูป)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleRequestImageUpload(reqItem.id, file);
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Remark / Details Input (Optional) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          รายละเอียดตำแหน่งที่ตั้ง / เหตุผลที่ขอ (Optional)
                        </label>
                        <input
                          type="text"
                          value={reqItem.remark}
                          onChange={(e) => updateDisplayRequest(reqItem.id, 'remark', e.target.value)}
                          placeholder="เช่น โซนตู้เย็นฝั่งขวา ติดเสา, ลูกค้าถามหาบ่อย..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addDisplayRequest}
                    className="w-full py-2 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all flex items-center justify-center gap-1.5 touch-press"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการขอสินค้าตัวโชว์อีก</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Action Submit Buttons */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={submitting}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> กลับไปแก้ไข
              </button>
              <button
                type="button"
                onClick={handleSubmitSurvey}
                disabled={submitting}
                className="flex-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกข้อมูล...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> ยืนยันและส่งข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 5: SUCCESS CONFIRMATION SCREEN                       */}
        {/* ========================================================= */}
        {step === 5 && (
          <div className="max-w-md mx-auto text-center py-6 animate-scaleIn">
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/40">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">บันทึกข้อมูลสำเร็จ!</h2>
              <p className="text-xs text-slate-500 mb-5">ระบบได้บันทึกจำนวนสินค้าตั้งโชว์เรียบร้อยแล้ว</p>

              {selectedStore && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-left text-xs space-y-1.5 mb-5">
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
                    <span className="font-bold text-emerald-700 font-mono text-xs sm:text-sm">
                      {totalDisplayUnits} เครื่อง ({countedModelsCount} รุ่น)
                    </span>
                  </div>
                  {displayRequests.length > 0 && (
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-orange-700">
                      <span className="font-medium">ขอสินค้าตัวโชว์:</span>
                      <span className="font-bold font-mono">{displayRequests.length} รายการ</span>
                    </div>
                  )}
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
                  setDisplayRequests([]);
                  setStep(1);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20"
              >
                บันทึกสาขาอื่นต่อไป
              </button>
            </div>
          </div>
        )}

        {/* Footer info & version */}
        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1 pb-4">
          <div>Sell Out Team, Haier Thailand</div>
          <div className="font-mono text-[10px]">
            Version: {process.env.NEXT_PUBLIC_GIT_COMMIT || '0da8e9c'}
          </div>
        </footer>
      </main>

      {/* Sticky Bottom Summary Bar (Active during Step 3 Counting) */}
      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg shadow-slate-900/10">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-500">ยอด Display รวม</div>
              <div className="text-base sm:text-lg font-bold text-blue-700 font-mono leading-tight">
                {totalDisplayUnits} <span className="text-xs font-normal text-slate-600">เครื่อง</span>{' '}
                <span className="text-[11px] font-normal text-slate-400 font-sans">({countedModelsCount} รุ่น)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all shadow-md shadow-blue-700/20 flex items-center gap-1.5 touch-press"
            >
              <span>ถัดไป: สรุปผล</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
