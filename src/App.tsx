/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, ShoppingCart, History, Wallet, Settings, 
  BarChart3, FileText, Sparkles, LogOut, LayoutDashboard, 
  Menu, X, ShieldCheck, Key, Megaphone, Palette, Layers, Calculator, Info,
  FileSpreadsheet
} from 'lucide-react';

// Components
import CashierDashboard from './components/CashierDashboard';
import POS from './components/POS';
import Riwayat from './components/Riwayat';
import KasHistoryTab from './components/KasHistoryTab';
import Management from './components/Management';
import Rekapan from './components/Rekapan';
import StrukConfig from './components/StrukConfig';
import AiSistenBucici from './components/AiSistenBucici';
import RuangPemasaran from './components/RuangPemasaran';
import RuangStok from './components/RuangStok';
import RuangHitungModal from './components/RuangHitungModal';
import RuangInfo from './components/RuangInfo';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import BuciciLogo from './components/BuciciLogo';
import GoogleSheetsSync from './components/GoogleSheetsSync';

// Types
import { Product, Transaction, KasHistory, InventoryItem, Employee, Role } from './types';

export default function App() {
  // Authentication & Simulation States
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [simulatingTenantId, setSimulatingTenantId] = useState<string | null>(null);

  // Form states for login/signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Main UI Active View State
  const [activeView, setActiveView] = useState('dashboard');
  const [managementFilter, setManagementFilter] = useState('Semua');
  const [riwayatFilter, setRiwayatFilter] = useState<'All' | 'Lunas' | 'Belum Bayar' | 'Void'>('All');
  const [payUnpaidTrx, setPayUnpaidTrx] = useState<Transaction | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Central Database States for Active Tenant
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionItems, setTransactionItems] = useState<any[]>([]);
  const [kasHistory, setKasHistory] = useState<KasHistory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [receiptTemplate, setReceiptTemplate] = useState<any>(null);

  // Sync data whenever the user or simulated tenant ID changes
  const fetchTenantData = async (tid: string) => {
    if (!tid) return;
    try {
      const [
        rProducts, rTransactions, rItems, rKas, rInventory, rEmployees, rRoles, rStruk
      ] = await Promise.all([
        fetch(`/api/products?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/transactions?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/transactions/items?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/kas?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/inventory?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/employees?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/roles?tenant_id=${tid}`).then(res => res.json()),
        fetch(`/api/struk?tenant_id=${tid}`).then(res => res.json())
      ]);

      if (rProducts.success) setProducts(rProducts.data);
      if (rTransactions.success) {
        // Sort transactions newest first
        const sorted = rTransactions.data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(sorted);
      }
      if (rItems.success) setTransactionItems(rItems.data);
      if (rKas.success) setKasHistory(rKas.data);
      if (rInventory.success) setInventoryItems(rInventory.data);
      if (rEmployees.success) setEmployees(rEmployees.data);
      if (rRoles.success) setRoles(rRoles.data);
      if (rStruk.success) setReceiptTemplate(rStruk.data);
    } catch (err) {
      console.error("Gagal menyinkronkan database", err);
    }
  };

  const handleRefreshAll = () => {
    const activeId = simulatingTenantId || user?.tenant_id;
    if (activeId) {
      fetchTenantData(activeId);
    }
  };

  useEffect(() => {
    // Attempt automatic login check (if persistent session is desired, otherwise start fresh)
    const savedUser = localStorage.getItem('bucici_user');
    const savedSim = localStorage.getItem('bucici_sim_tenant');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (savedSim) {
          setSimulatingTenantId(savedSim);
        }
      } catch (e) {
        console.error("Error parsing saved session", e);
      }
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    const activeId = simulatingTenantId || user?.tenant_id;
    if (activeId) {
      fetchTenantData(activeId);
    }
  }, [user, simulatingTenantId]);

  // LOGIN TRIGGER
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        localStorage.setItem('bucici_user', JSON.stringify(data.data.user));
        localStorage.removeItem('bucici_sim_tenant');
        setSimulatingTenantId(null); // Clear simulation upon fresh login
        // Set default view based on role
        if (data.data.user.role === 'Super-Admin') {
          setActiveView('tenants');
        } else {
          // Check permissions for Employee
          const perms = data.data.user.permissions || [];
          if (data.data.user.role === 'Employee' && perms.length > 0) {
            // Find first permitted tab
            const firstPerm = mapPermissionToView(perms[0]);
            setActiveView(firstPerm);
          } else {
            setActiveView('dashboard');
          }
        }
      } else {
        setLoginError(data.error || 'Login gagal.');
      }
    } catch (err) {
      setLoginError('Terjadi kegagalan jaringan internet.');
    }
  };

  // REGISTER TRIGGER
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password,
          business_name: businessName.trim(),
          license_code: licenseCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        localStorage.setItem('bucici_user', JSON.stringify(data.data.user));
        localStorage.removeItem('bucici_sim_tenant');
        setSimulatingTenantId(null);
        if (data.data.user.role === 'Super-Admin') {
          setActiveView('tenants');
        } else {
          setActiveView('dashboard');
        }
        alert("Pendaftaran Berhasil! Selamat datang di Bucici Biz.");
      } else {
        setLoginError(data.error || 'Pendaftaran gagal.');
      }
    } catch (err) {
      setLoginError('Terjadi kegagalan jaringan internet.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('bucici_user');
    localStorage.removeItem('bucici_sim_tenant');
    setSimulatingTenantId(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setBusinessName('');
    setLicenseCode('');
    setLoginError('');
    setActiveView('dashboard');
  };

  const handleSimulateDemoTenant = (tid: string) => {
    setSimulatingTenantId(tid);
    localStorage.setItem('bucici_sim_tenant', tid);
    setActiveView('dashboard');
    alert(`Mensimulasikan Tenant Demo (ID: ${tid}). Mode Super-Admin ditangguhkan sementara.`);
  };

  const handleExitSimulation = () => {
    setSimulatingTenantId(null);
    localStorage.removeItem('bucici_sim_tenant');
    setActiveView('tenants');
    alert("Kembali ke panel Super-Admin.");
  };

  // RBAC Permission Mapper Helper
  const mapPermissionToView = (p: string): string => {
    switch (p) {
      case 'POS': return 'pos';
      case 'Riwayat': return 'riwayat';
      case 'Kas': return 'kas';
      case 'Manajemen': return 'manajemen';
      case 'AI-sisten': return 'ai_sisten';
      default: return 'pos';
    }
  };

  // RBAC Check for rendering
  const hasAccess = (viewName: string): boolean => {
    if (!user) return false;
    if (user.role === 'Super-Admin') return true;
    if (user.role === 'Owner') return true;
    if (simulatingTenantId) return true; // Simulate full access for admin view

    // Employee specific permissions
    if (user.role === 'Employee') {
      const perms = user.permissions || [];
      if (viewName === 'dashboard') return true; // Dashboard is usually read-only dashboard overview
      if (viewName === 'pos') return perms.includes('POS');
      if (viewName === 'riwayat') return perms.includes('Riwayat');
      if (viewName === 'kas') return perms.includes('Kas');
      if (viewName === 'manajemen') return perms.includes('Manajemen');
      if (viewName === 'ai_sisten') return perms.includes('AI-sisten');
      
      // Secondary tools are usually restricted to Owner unless customized
      return false;
    }
    return false;
  };

  // Navigation setter with support for sub-filters (e.g. from dashboard click)
  const handleSetViewFromDashboard = (view: string, filter?: string) => {
    const lowerView = view.toLowerCase();
    if (filter) {
      if (lowerView === 'manajemen') {
        setManagementFilter(filter);
      } else if (lowerView === 'riwayat') {
        setRiwayatFilter(filter as any);
      }
    } else {
      setManagementFilter('Semua');
      setRiwayatFilter('All');
    }
    setActiveView(lowerView);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 font-sans">
        <Sparkles size={40} className="text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-bold font-mono tracking-widest uppercase text-slate-500">Memuat Sahabat Pedagang...</p>
      </div>
    );
  }

  // =========================================================
  // LOGIN / REGISTER SCREENS
  // =========================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4 relative overflow-hidden font-sans" id="auth_screen">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
          <div className="text-center space-y-1.5">
            <BuciciLogo size={52} withBg={true} className="mx-auto" />
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mt-3">Bucici Biz</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">"Sahabat Pedagang"</p>
          </div>

          <form onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit} className="space-y-4 text-xs" id="auth_form">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-[10px] font-bold text-center leading-normal" id="auth_error_msg">
                {loginError}
              </div>
            )}

            {isRegistering && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Lengkap Owner *</label>
                  <input
                    id="register_name"
                    type="text"
                    placeholder="Mis. Bucici Owner"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Toko / Warung *</label>
                  <input
                    id="register_business"
                    type="text"
                    placeholder="Mis. Warung Sembako Berkah"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-bold"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 flex justify-between items-center">
                    Kode Lisensi BUCICI-xxxx *
                    <span className="text-[8px] text-slate-400 font-semibold italic">Pertama daftar gratis & Super Admin</span>
                  </label>
                  <input
                    id="register_license"
                    type="text"
                    placeholder="BUCICI-XXXX-YYYY"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-bold font-mono tracking-widest uppercase"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Alamat Email *</label>
              <input
                id="auth_email"
                type="email"
                placeholder="owner@warung.com"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Password Keamanan *</label>
              <input
                id="auth_password"
                type="password"
                placeholder="Min. 6 karakter"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              id="auth_submit_btn"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              {isRegistering ? 'Daftar Toko Baru' : 'Masuk Dashboard'}
            </button>
          </form>

          {/* QUICK DEMO SHORTCUTS */}
          {!isRegistering && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider text-center">
                Pintasan Akses Cepat (Uji Coba)
              </span>
              <div className="grid grid-cols-1 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={async () => {
                    setEmail('owner@demo.com');
                    setPassword('password123');
                    setTimeout(() => {
                      document.getElementById('auth_form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }, 50);
                  }}
                  className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <span>🏪 Masuk Demo Toko Owner</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-100">
                    Klik Cepat
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setEmail('posbucici@gmail.com');
                    setPassword('admin123');
                    setTimeout(() => {
                      document.getElementById('auth_form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }, 50);
                  }}
                  className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <span>🔑 Masuk Super-Admin</span>
                  <span className="text-[9px] font-mono text-indigo-600 font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                    Klik Cepat
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <button
              id="toggle_auth_mode"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setLoginError('');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {isRegistering ? 'Sudah terdaftar? Masuk di sini' : 'Belum punya akun? Registrasi Toko Baru'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // SUPER-ADMIN INTERFACE
  // =========================================================
  if (user.role === 'Super-Admin' && !simulatingTenantId) {
    return (
      <SuperAdminDashboard 
        user={user} 
        onLogout={handleLogout} 
        onSimulateDemoTenant={handleSimulateDemoTenant}
      />
    );
  }

  // =========================================================
  // TENANT WORKSPACE (SAHABAT PEDAGANG)
  // =========================================================
  const activeTenantId = simulatingTenantId || user.tenant_id;
  const isOwner = user.role === 'Owner' || simulatingTenantId;

  // Compile list of permitted navigation items for rendering
  const navigationItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir POS', icon: ShoppingCart },
    { id: 'riwayat', label: 'Riwayat Nota', icon: History },
    { id: 'kas', label: 'Kas Laci', icon: Wallet },
    { id: 'manajemen', label: 'Manajemen', icon: Settings, ownerOnly: false },
    { id: 'rekapan', label: 'Rekapan', icon: BarChart3, ownerOnly: true },
    { id: 'struk', label: 'Struk Thermal', icon: FileText, ownerOnly: true },
    { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet, ownerOnly: true, devOnly: true },
    
    // Specialized micro-tools
    { id: 'pemasaran', label: 'Pemasaran AI', icon: Palette, ownerOnly: true },
    { id: 'stok', label: 'Ruang Stok', icon: Layers, ownerOnly: false },
    { id: 'modal', label: 'Hitung Modal', icon: Calculator, ownerOnly: true },
    { id: 'info', label: 'Edukasi & Info', icon: Info, ownerOnly: false },
    
    { id: 'ai_sisten', label: 'AI-sisten Bucici', icon: Sparkles, highlight: true }
  ];

  // Filter based on RBAC permissions
  const filteredNavItems = navigationItems.filter(item => {
    // If devOnly and user is not the developer (posbucici@gmail.com), hide it
    if (item.devOnly && user.email !== 'posbucici@gmail.com') return false;
    // If ownerOnly and user is not Owner, hide it
    if (item.ownerOnly && !isOwner) return false;
    // Check RBAC permission array for Employees
    return hasAccess(item.id);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans" id="tenant_workspace">
      
      {/* A. DESKTOP SIDE NAV DRAWER (Hidden on mobile) */}
      <aside 
        className="hidden md:flex flex-col justify-between w-64 bg-slate-900 text-white shrink-0 shadow-xl border-r border-slate-800 h-screen sticky top-0 overflow-y-auto no-scrollbar sidebar-element"
      >
        
        {/* Top brand */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <BuciciLogo size={38} withBg={true} />
            <div>
              <h2 className="text-xs font-black tracking-tight leading-tight uppercase">
                {businessName || receiptTemplate?.header_msg || 'Bucici Biz'}
              </h2>
              <span className="text-[8px] text-blue-400 font-extrabold uppercase tracking-wider">
                {user.role} Workspace
              </span>
            </div>
          </div>

          {/* Simulation Header notification */}
          {simulatingTenantId && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2 rounded-xl text-[9px] font-bold leading-relaxed flex flex-col gap-1.5">
              <span>⚠️ Mode Simulasi Admin</span>
              <button
                id="exit_simulation_sidebar_btn"
                onClick={handleExitSimulation}
                className="w-full py-1 bg-amber-500 text-slate-900 rounded font-black text-[9px] cursor-pointer"
              >
                Kembali ke Admin
              </button>
            </div>
          )}
        </div>

        {/* Mid Navigation Link list */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" id="desktop_navigation_list">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`nav_link_${item.id}`}
                onClick={() => {
                  setManagementFilter('Semua');
                  setActiveView(item.id);
                }}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : item.highlight 
                      ? 'text-blue-400 hover:bg-slate-800' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={14} />
                  {item.label}
                </span>
                
                {item.highlight && !isSelected && (
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User status row */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <span className="font-bold text-xs text-slate-300 block leading-tight">{user.name}</span>
              <span className="text-[10px] text-slate-500 font-medium block truncate">{user.email}</span>
            </div>
          </div>

          <button
            id="desktop_logout_btn"
            onClick={handleLogout}
            className="w-full py-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            Logout Akun
          </button>
        </div>

      </aside>

      {/* B. MOBILE HEADER BAR */}
      <header className="md:hidden bg-slate-900 text-white border-b border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40 shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <BuciciLogo size={34} withBg={true} />
          <div>
            <h2 className="text-xs font-black tracking-tight uppercase leading-tight">
              {businessName || receiptTemplate?.header_msg || 'Bucici Biz'}
            </h2>
            <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">{user.role}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {simulatingTenantId && (
            <button 
              id="exit_simulation_mobile_shortcut"
              onClick={handleExitSimulation}
              className="bg-amber-500 text-slate-900 font-extrabold text-[8px] py-1 px-2.5 rounded shadow cursor-pointer"
            >
              Exit Demo
            </button>
          )}

          <button
            id="mobile_hamburger_trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* C. MOBILE HAMBURGER FLYOUT OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end" id="mobile_hamburger_overlay">
          <div className="w-64 bg-slate-900 text-white p-5 flex flex-col justify-between h-full shadow-2xl relative animate-in slide-in-from-right duration-200">
            
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="space-y-6 flex-1 mt-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Navigasi PWA</span>
                <span className="font-extrabold text-sm text-blue-400 block mt-1">Bucici Biz</span>
              </div>

              <nav className="space-y-1" id="mobile_navigation_list">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`mobile_nav_link_${item.id}`}
                      onClick={() => {
                        setManagementFilter('Semua');
                        setActiveView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2.5 cursor-pointer ${
                        isSelected ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block">Akun: {user.name}</span>
              <button
                id="mobile_logout_btn"
                onClick={handleLogout}
                className="w-full py-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <LogOut size={12} />
                Keluar Akun
              </button>
            </div>

          </div>
        </div>
      )}

      {/* D. MAIN CONTENT CONTAINER (Loads different views asynchronously) */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto" id="tenant_main_content">
        
        {/* VIEW 1: CashierDashboard */}
        {activeView === 'dashboard' && (
          <CashierDashboard
            ownerName={user.name}
            businessName={businessName || receiptTemplate?.header_msg || 'Toko Bucici'}
            products={products}
            transactions={transactions}
            transactionItems={transactionItems}
            kasHistory={kasHistory}
            onSetView={handleSetViewFromDashboard}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 2: POS Cashier */}
        {activeView === 'pos' && (
          <POS
            tenantId={activeTenantId}
            user={user}
            onRefreshDashboard={handleRefreshAll}
            products={products}
            onSetView={handleSetViewFromDashboard}
            receiptTemplate={receiptTemplate}
            onPayUnpaidTransaction={payUnpaidTrx}
            onClearPayUnpaid={() => setPayUnpaidTrx(null)}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 3: Transaction History */}
        {activeView === 'riwayat' && (
          <Riwayat
            tenantId={activeTenantId}
            user={user}
            transactions={transactions}
            onRefresh={handleRefreshAll}
            receiptTemplate={receiptTemplate}
            initialStatusFilter={riwayatFilter}
            onPayReceivable={(trx) => {
              setPayUnpaidTrx(trx);
              setActiveView('pos');
            }}
          />
        )}

        {/* VIEW 4: Kas History / Drawer Ledger */}
        {activeView === 'kas' && (
          <KasHistoryTab
            tenantId={activeTenantId}
            kasHistory={kasHistory}
            onRefresh={handleRefreshAll}
          />
        )}

        {/* VIEW 5: Product, Employee and Role Management */}
        {activeView === 'manajemen' && (
          <Management
            tenantId={activeTenantId}
            products={products}
            employees={employees}
            roles={roles}
            initialFilter={managementFilter}
            onRefresh={handleRefreshAll}
            onSetView={setActiveView}
          />
        )}

        {/* VIEW 6: Analytics & Recaps */}
        {activeView === 'rekapan' && (
          <Rekapan
            tenantId={activeTenantId}
            products={products}
            transactions={transactions}
            transactionItems={transactionItems}
          />
        )}

        {/* VIEW 7: Receipt thermal config */}
        {activeView === 'struk' && (
          <StrukConfig
            tenantId={activeTenantId}
            initialTemplate={receiptTemplate}
            onRefresh={handleRefreshAll}
          />
        )}

        {/* VIEW 7B: Google Sheets Sync (Always mounted in the background to handle real-time auto-sync to Central Hub) */}
        <div className={activeView === 'sheets' ? 'block' : 'hidden'}>
          <GoogleSheetsSync
            tenantId={activeTenantId}
            businessName={businessName}
            products={products}
            transactions={transactions}
            kasHistory={kasHistory}
            onRefresh={handleRefreshAll}
          />
        </div>

        {/* VIEW 8: Ruang Pemasaran */}
        {activeView === 'pemasaran' && (
          <RuangPemasaran
            tenantId={activeTenantId}
            products={products}
          />
        )}

        {/* VIEW 9: Ruang Stok */}
        {activeView === 'stok' && (
          <RuangStok
            tenantId={activeTenantId}
            inventoryItems={inventoryItems}
            onRefresh={handleRefreshAll}
          />
        )}

        {/* VIEW 10: Ruang Hitung Modal */}
        {activeView === 'modal' && (
          <RuangHitungModal
            tenantId={activeTenantId}
            products={products}
            inventoryItems={inventoryItems}
            onRefresh={handleRefreshAll}
          />
        )}

        {/* VIEW 11: Ruang Info */}
        {activeView === 'info' && (
          <RuangInfo />
        )}

        {/* VIEW 12: Smart AI-sisten Bucici */}
        {activeView === 'ai_sisten' && (
          <AiSistenBucici
            tenantId={activeTenantId}
            user={user}
            onRefresh={handleRefreshAll}
          />
        )}

      </main>

    </div>
  );
}
