'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Database,
  LogOut,
  ShieldCheck,
  Eye,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Loader2,
  Moon,
  Sun,
  Camera,
} from 'lucide-react';

interface AuthUser {
  userId: number;
  username: string;
  role: 'admin' | 'viewer';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Dark mode init
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.authenticated || !data.user) {
          router.push('/login');
          return;
        }
        setUser(data.user);
        if (data.user.role === 'viewer' && pathname.startsWith('/admin/dimensions')) {
          router.push('/admin/dashboard');
        }
      } catch (err) {
        console.error(err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router, pathname]);

  // Route guard: if viewer navigates to dimensions, redirect to dashboard
  useEffect(() => {
    if (user && user.role === 'viewer' && pathname.startsWith('/admin/dimensions')) {
      router.push('/admin/dashboard');
    }
  }, [user, pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-700 mx-auto" />
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Verifying access...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Recorded Entries', href: '/admin/entries', icon: FileSpreadsheet },
    { name: 'Display Requests', href: '/admin/requests', icon: Camera },
    ...(user.role === 'admin' ? [{ name: 'Dimensions', href: '/admin/dimensions', icon: Database }] : []),
  ];

  // Shared sidebar content
  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Brand / Logo */}
      <div className="px-5 pb-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-10 overflow-hidden rounded-lg flex-shrink-0">
            <Image
              src="/haier-logo.jpg"
              alt="Haier"
              width={64}
              height={40}
              className="h-10 w-auto object-contain rounded-lg"
              priority
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Haier Thailand</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Sell Out Team · Admin</p>
          </div>
        </div>

        {/* User Badge */}
        <div className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              user.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
            }`}>
              {user.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.username}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                {user.role === 'admin' ? 'Administrator' : 'Viewer'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-5 px-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              className={`group flex items-center justify-between px-3.5 py-3 text-sm font-semibold rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-700 dark:group-hover:text-blue-400'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-blue-200" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
        {/* Dark Mode Toggle Row */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            {darkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`dark-toggle ${darkMode ? 'is-dark' : ''}`}
            aria-label="Toggle dark mode"
          >
            <span className="dark-toggle-thumb" />
          </button>
        </div>

        <Link
          href="/"
          target="_blank"
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-slate-400" />
          Open Survey Page
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>

        {/* Version info */}
        <div className="pt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
          <div>Sell Out Team, Haier Thailand</div>
          <div className="font-mono text-[9px] text-slate-400/80">
            Version: {process.env.NEXT_PUBLIC_GIT_COMMIT || '478e520'}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row font-sans">

      {/* ── Mobile Top Header ── */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 overflow-hidden rounded-lg">
            <Image src="/haier-logo.jpg" alt="Haier" width={48} height={32} className="h-8 w-auto object-contain rounded-lg" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Haier Thailand</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Admin Panel</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle on mobile */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`dark-toggle ${darkMode ? 'is-dark' : ''}`}
            aria-label="Toggle dark mode"
          >
            <span className="dark-toggle-thumb" />
          </button>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            user.role === 'admin'
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
              : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
          }`}>
            {user.role}
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ── Sidebar Desktop ── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-30 shadow-sm">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex">
          <div className="bg-white dark:bg-slate-900 w-4/5 max-w-xs h-full flex flex-col shadow-2xl">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="px-4 flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent onNav={() => setMobileMenuOpen(false)} />
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
          <div>Sell Out Team, Haier Thailand</div>
          <div className="font-mono text-[10px]">
            Version: {process.env.NEXT_PUBLIC_GIT_COMMIT || '478e520'}
          </div>
        </footer>
      </div>
    </div>
  );
}
