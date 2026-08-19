'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  Check, 
  X, 
  ShieldAlert, 
  Trash2, 
  Loader2,
  RefreshCw,
  Camera,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminBackupPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Clear All Data State
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [clearConfirmText, setClearConfirmText] = useState<string>('');
  const [clearing, setClearing] = useState<boolean>(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);

  // 1. Auth Guard - Admin Only
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUserRole(d.user.role);
          if (d.user.role === 'viewer') {
            router.replace('/admin/dashboard');
          }
        }
      });
  }, [router]);

  // 2. Fetch System Status
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-status');
      const d = await res.json();
      if (d.success) {
        setSystemStatus(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDownloadBackup = () => {
    window.location.href = '/api/admin/backup';
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreError(null);
    setRestoreSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.stores || !json.models) {
          setRestoreError('ไฟล์สำรองข้อมูลไม่ถูกต้อง (ไม่พบข้อมูล stores หรือ models)');
          setRestoreData(null);
          return;
        }
        setRestoreData(json);
      } catch (err: any) {
        setRestoreError('ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message);
        setRestoreData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreData) return;
    setRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoreData),
      });
      const data = await res.json();
      if (data.success) {
        setRestoreSuccess(data.message || 'กู้คืนข้อมูลและรูปภาพทั้งหมดสำเร็จสมบูรณ์!');
        fetchStatus();
      } else {
        setRestoreError(data.error || 'การกู้คืนข้อมูลล้มเหลว');
      }
    } catch (err: any) {
      setRestoreError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setRestoring(false);
    }
  };

  const handleClearAllData = async () => {
    if (clearConfirmText !== 'DELETE') return;
    setClearing(true);
    setClearError(null);
    setClearSuccess(null);
    try {
      const res = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE_ALL_DATA' }),
      });
      const d = await res.json();
      if (d.success) {
        setShowClearModal(false);
        setClearConfirmText('');
        setClearSuccess(d.message || 'ลบข้อมูลการสำรวจและรูปภาพทั้งหมดเรียบร้อยแล้ว');
        fetchStatus();
      } else {
        setClearError(d.error || 'การลบข้อมูลล้มเหลว');
      }
    } catch (e: any) {
      setClearError(e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setClearing(false);
    }
  };

  if (loading && !systemStatus) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading data management status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 text-blue-700" />
            <span>Data Management & Backup</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Backup & Restore complete survey database with photos, manage persistent storage and data resets.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:text-blue-700 transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Global Alerts */}
      {clearSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{clearSuccess}</span>
          </div>
          <button type="button" onClick={() => setClearSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Storage & Database Stats Card */}
      {systemStatus && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">Database & Storage Status</h2>
            </div>

            {systemStatus.isPersistentVolume ? (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Persistent Volume Active
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Ephemeral Storage (Volume not mounted)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Total Stores</div>
              <div className="text-base font-bold text-slate-900 font-mono">{systemStatus.counts?.stores || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Total Models</div>
              <div className="text-base font-bold text-slate-900 font-mono">{systemStatus.counts?.models || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Survey Entries</div>
              <div className="text-base font-bold text-purple-700 font-mono">{systemStatus.counts?.entries || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="text-[11px] text-slate-500 font-medium">Display Requests</div>
              <div className="text-base font-bold text-orange-700 font-mono">{systemStatus.counts?.requests || 0}</div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 space-y-1 font-mono bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div><strong className="text-slate-700">Storage Path:</strong> {systemStatus.dataDir}</div>
            <div><strong className="text-slate-700">SQLite DB:</strong> {systemStatus.dbPath} ({systemStatus.dbSizeFormatted})</div>
            <div><strong className="text-slate-700">Uploads Directory:</strong> {systemStatus.uploadsDir}</div>
          </div>
        </div>
      )}

      {/* Main Grid: Backup & Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Backup Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Backup Database & Photos</h3>
                <p className="text-xs text-slate-500">Download complete snapshot file</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ดาวน์โหลดไฟล์สำรองข้อมูลครบถ้วนทั้งหมด (JSON) ประกอบด้วย:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>รายชื่อสาขาและรุ่นสินค้า พร้อมสถานะ Active / Inactive</li>
              <li>ผลการสำรวจและจำนวนที่นับได้ของทุกสาขา</li>
              <li>คำขอสินค้าตัวโชว์ <strong>พร้อมรูปถ่ายพื้นที่ตั้งโชว์ทุกรูป (Embedded Base64)</strong></li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Complete Backup (.json)</span>
          </button>
        </div>

        {/* Section 2: Restore Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Restore Database from Backup</h3>
              <p className="text-xs text-slate-500">Upload JSON backup to restore all data & photos</p>
            </div>
          </div>

          {/* Restore Alerts */}
          {restoreError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}
          {restoreSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{restoreSuccess}</span>
            </div>
          )}

          {/* Upload Area */}
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-purple-500 hover:bg-purple-50/40 cursor-pointer transition-all">
              <FileJson className="w-7 h-7 text-purple-600 mb-1" />
              <span className="text-xs font-bold text-slate-800 truncate max-w-[280px]">
                {restoreFile ? restoreFile.name : 'Select Backup JSON file (.json)'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Click to browse file</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreFileSelect}
              />
            </label>

            {/* Preview Summary */}
            {restoreData && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center justify-between text-[11px]">
                  <span>Backup Summary:</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {restoreData.exportedAt ? new Date(restoreData.exportedAt).toLocaleDateString('th-TH') : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="p-1.5 rounded bg-white border border-slate-200">
                    Stores: <strong>{restoreData.stores?.length || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-white border border-slate-200">
                    Models: <strong>{restoreData.models?.length || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-white border border-slate-200">
                    Entries: <strong className="text-purple-700">{restoreData.entries?.length || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-white border border-slate-200">
                    Requests: <strong className="text-orange-700">{restoreData.requests?.length || 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirmRestore}
            disabled={!restoreData || restoring}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 transition-all shadow-md shadow-purple-700/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {restoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Restoring Database & Photos...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm Restore Data & Photos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 3: Danger Zone - Delete All Survey Data */}
      <div className="bg-red-50/50 p-5 rounded-2xl border border-red-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-100 text-red-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">Danger Zone: Delete All Survey Data</h3>
            <p className="text-xs text-red-700">Clear all survey entries, display requests, and uploaded picture files</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ลบข้อมูลประวัติการสำรวจทั้งหมดและรูปภาพที่เคยอัปโหลดทั้งหมดออกจากระบบอย่างถาวร (รายชื่อสาขาและรุ่นสินค้ายังคงอยู่)
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              setShowClearModal(true);
              setClearConfirmText('');
              setClearError(null);
            }}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-600/20 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All Survey Data & Photos</span>
          </button>
        </div>
      </div>

      {/* Delete All Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-red-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-100 text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete All Survey Data & Photos</h3>
                  <p className="text-xs text-red-600 font-semibold">Danger: This action cannot be undone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  setClearConfirmText('');
                  setClearError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {clearError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{clearError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                การดำเนินการนี้จะ <strong className="text-red-700">ลบข้อมูลการสำรวจทั้งหมด (Survey Entries)</strong>, 
                <strong className="text-red-700"> คำขอสินค้าตัวโชว์ (Display Requests)</strong> และ <strong className="text-red-700">รูปภาพทั้งหมดที่เคยอัปโหลด</strong> ออกจากระบบอย่างถาวร
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                💡 คำแนะนำ: กรุณากดปุ่ม <strong>"Download Complete Backup"</strong> เพื่อสำรองข้อมูลไว้ก่อนทำการลบ
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
                  พิมพ์คำว่า <span className="font-mono text-red-600 font-bold px-1.5 py-0.5 bg-red-50 rounded border border-red-200">DELETE</span> เพื่อยืนยันการลบ:
                </label>
                <input
                  type="text"
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value.trim().toUpperCase())}
                  placeholder="พิมพ์คำว่า DELETE"
                  className="w-full text-xs font-mono font-bold uppercase bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-center"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  setClearConfirmText('');
                  setClearError(null);
                }}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                disabled={clearConfirmText !== 'DELETE' || clearing}
                className="flex-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {clearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Clearing All Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
