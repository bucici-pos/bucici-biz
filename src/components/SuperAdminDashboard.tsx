/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Key, Megaphone, Bot, Sparkles, Plus, Search, Check, Ban, 
  Trash2, Download, RefreshCw, Layers, ShieldCheck, PlayCircle, LogOut,
  FileSpreadsheet, CloudLightning, CheckCircle, AlertTriangle, Info, CloudOff
} from 'lucide-react';
import AiSistenBucici from './AiSistenBucici';
import BuciciLogo from './BuciciLogo';
import { 
  initAuth, 
  googleSignIn, 
  googleLogout, 
  writeValuesToRange,
  readValuesFromRange
} from '../lib/googleSheetsService';
import { User } from 'firebase/auth';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
  onSimulateDemoTenant: (tenantId: string) => void;
}

export default function SuperAdminDashboard({ user, onLogout, onSimulateDemoTenant }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tenants' | 'licenses' | 'posts' | 'ai_sisten'>('tenants');
  const [loading, setLoading] = useState(false);

  // States
  const [tenants, setTenants] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  // Filters / Search
  const [searchTenant, setSearchTenant] = useState('');
  const [searchLicense, setSearchLicense] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'Tersedia' | 'Terpakai'>('all');

  // Generator inputs
  const [licenseCount, setLicenseCount] = useState('10');
  const [batchName, setBatchName] = useState('');

  // Info Post inputs
  const [postContent, setPostContent] = useState('');
  const [postLink, setPostLink] = useState('');
  const [postType, setPostType] = useState<'YouTube' | 'Link'>('YouTube');

  // Load everything
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [rTenants, rLicenses, rPosts] = await Promise.all([
        fetch('/api/tenants').then(res => res.json()),
        fetch('/api/licenses').then(res => res.json()),
        fetch('/api/info-posts').then(res => res.json())
      ]);

      if (rTenants.success) setTenants(rTenants.data);
      if (rLicenses.success) setLicenses(rLicenses.data);
      if (rPosts.success) setPosts(rPosts.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Google Sheets states for Super Admin (Master_Lisensi Hub Sync)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncingLicenses, setIsSyncingLicenses] = useState(false);

  // Synchronize Licenses to Central Google Sheets (Master_Lisensi)
  // Synchronize Licenses both ways (Pull from Google Sheets -> Merge and Cleanse on Server -> Save to DB -> Push back to Sheets)
  const handleSyncLicensesBothWays = async (silent = false, customToken?: string) => {
    const token = customToken || accessToken;
    if (!token) {
      if (!silent) setSyncStatus({ type: 'error', text: 'Akun Google belum terhubung.' });
      return;
    }

    setIsSyncingLicenses(true);
    if (!silent) setSyncStatus({ type: 'info', text: 'Membaca dan menyinkronkan data dengan Google Sheets...' });

    try {
      const spreadsheetId = '10Mr3QgyPZ9dbx8YwbOnuPlp-RlKgC4f7DOq8J5sqbkw';
      
      // 1. Read existing rows from Google Sheets Master_Lisensi tab
      let sheetLicenses: any[] = [];
      try {
        const rawRows = await readValuesFromRange(token, spreadsheetId, 'Master_Lisensi!A1:E1000');
        if (rawRows && rawRows.length > 1) {
          const headers = rawRows[0].map((h: any) => h.toString().toLowerCase().trim());
          const codeIdx = headers.findIndex((h: any) => h.includes('kode') || h.includes('license') || h.includes('code') || h.includes('lisensi'));
          const statusIdx = headers.findIndex((h: any) => h.includes('status') || h.includes('keadaan'));
          const batchIdx = headers.findIndex((h: any) => h.includes('batch') || h.includes('kampanye') || h.includes('nama'));
          const dateIdx = headers.findIndex((h: any) => h.includes('tanggal') || h.includes('created') || h.includes('dibuat'));
          const tenantIdx = headers.findIndex((h: any) => h.includes('tenant') || h.includes('toko') || h.includes('id'));

          sheetLicenses = rawRows.slice(1).map(row => {
            const code = String(row[codeIdx !== -1 ? codeIdx : 0] || '').trim();
            const status = String(row[statusIdx !== -1 ? statusIdx : 1] || 'Tersedia').trim();
            const batch_name = String(row[batchIdx !== -1 ? batchIdx : 2] || '').trim() || undefined;
            const created_at = String(row[dateIdx !== -1 ? dateIdx : 3] || '').trim() || undefined;
            const tenant_id = String(row[tenantIdx !== -1 ? tenantIdx : 4] || '').trim() || undefined;

            return {
              license_code: code,
              status,
              batch_name,
              created_at,
              tenant_id
            };
          }).filter(lic => lic.license_code.length > 0);
        }
      } catch (readErr) {
        console.warn('Gagal membaca sheet Master_Lisensi (mungkin belum dibuat):', readErr);
      }

      // 2. Sync with local database server (cleanses and merges)
      const res = await fetch('/api/licenses/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenses: sheetLicenses })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Gagal memproses penggabungan lisensi di server.');
      }

      const updatedList = data.data || [];
      setLicenses(updatedList);

      // 3. Push fully cleansed and unified list back to Google Sheets
      const headers = ['Kode Lisensi', 'Status', 'Batch Name', 'Tanggal Dibuat', 'ID Tenant'];
      const rows = updatedList.map((lic: any) => [
        lic.license_code || '',
        lic.status || 'Tersedia',
        lic.batch_name || '-',
        lic.created_at || '',
        lic.tenant_id || '-'
      ]);

      await writeValuesToRange(token, spreadsheetId, 'Master_Lisensi', headers, rows);
      if (!silent) {
        setSyncStatus({ 
          type: 'success', 
          text: `Sinkronisasi Dua Arah sukses! Total ${updatedList.length} lisensi terdaftar telah dibersihkan & disinkronkan.` 
        });
      }
    } catch (err: any) {
      console.error('Error syncing licenses both ways:', err);
      if (!silent) setSyncStatus({ type: 'error', text: err.message || 'Gagal menyinkronkan data lisensi.' });
    } finally {
      setIsSyncingLicenses(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setSyncStatus(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setSyncStatus({ type: 'success', text: 'Berhasil terhubung ke akun Google Anda!' });
        // Run full bi-directional sync after login
        await handleSyncLicensesBothWays(false, res.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', text: err.message || 'Gagal masuk dengan Google.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan sambungan akun Google Sheets?')) {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
      setSyncStatus({ type: 'info', text: 'Akun Google Sheets berhasil diputuskan.' });
    }
  };

  // Setup mount listeners
  useEffect(() => {
    // Initialize Auth Listener
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setAuthLoading(false);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setAuthLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Auto-sync licenses when token is active on mount or load
  useEffect(() => {
    if (accessToken && licenses.length > 0) {
      const delayDebounce = setTimeout(() => {
        handleSyncLicensesBothWays(true).catch(err => console.error("Auto-sync licenses error:", err));
      }, 3000);
      return () => clearTimeout(delayDebounce);
    }
  }, [accessToken]);

  // Actions
  const handleToggleTenant = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTenants(tenants.map(t => t.tenant_id === tenantId ? { ...t, is_active: !t.is_active } : t));
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateLicenses = async (e: React.FormEvent) => {
    e.preventDefault();
    const countNum = parseInt(licenseCount, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 500) {
      alert("Jumlah lisensi yang dicetak harus di antara 1 dan 500!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/licenses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: countNum, batch_name: batchName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setBatchName('');
        alert(`Berhasil mencetak ${countNum} kode lisensi baru!`);
        await loadAdminData();
        // Trigger sync automatically if Google account is connected
        if (accessToken) {
          await handleSyncLicensesBothWays(true);
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/info-posts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent.trim(), link: postLink.trim(), type: postType })
      });
      const data = await res.json();
      if (data.success) {
        setPostContent('');
        setPostLink('');
        await loadAdminData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    try {
      const res = await fetch('/api/info-posts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.filter(p => p.post_id !== postId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Licenses CSV
  const handleExportCSV = () => {
    if (licenses.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Kode Lisensi,Status,Batch,Dibuat Pada,Tenant ID\n";
    for (const lic of licenses) {
      csvContent += `"${lic.license_code}","${lic.status}","${lic.batch_name || '-'}","${lic.created_at}","${lic.tenant_id || '-'}"\n`;
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bucici_Licenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const totalTenantsCount = tenants.length;
  const totalLicensesCount = licenses.length;
  const usedLicensesCount = licenses.filter(l => l.status === 'Terpakai').length;
  const availableLicensesCount = totalLicensesCount - usedLicensesCount;

  // Filtered lists
  const filteredTenants = tenants.filter(t => {
    const s = searchTenant.toLowerCase();
    return t.business_name.toLowerCase().includes(s) || 
           t.owner_name.toLowerCase().includes(s) || 
           t.email.toLowerCase().includes(s);
  });

  const filteredLicenses = licenses.filter(l => {
    const s = searchLicense.toLowerCase();
    const matchesSearch = l.license_code.toLowerCase().includes(s) || (l.batch_name || '').toLowerCase().includes(s);
    const matchesStatus = licenseFilter === 'all' || l.status === licenseFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="super_admin_panel">
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <BuciciLogo size={38} withBg={true} />
          <div>
            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 uppercase">
              Bucici Biz Admin
              <span className="text-[8px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                Super Control
              </span>
            </h1>
            <p className="text-[9px] text-slate-400 font-medium">Sistem Kendali Utama Multi-Tenant.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Simulate Demo Tenant shortcut button */}
          <button
            id="super_btn_simulate_demo"
            onClick={() => onSimulateDemoTenant('tenant-demo')}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm cursor-pointer"
          >
            <PlayCircle size={12} />
            Simulasi Tenant Demo
          </button>

          <button
            id="super_btn_logout"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Keluar Admin"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. OVERALL ANALYTICS DASHBOARD BAR */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0 text-white">
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><Users size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Tenants</span>
            <span className="text-base font-black">{totalTenantsCount} Toko</span>
          </div>
        </div>
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center"><Key size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Lisensi Terbuat</span>
            <span className="text-base font-black">{totalLicensesCount} Kode</span>
          </div>
        </div>
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center"><Check size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Terpakai (Aktif)</span>
            <span className="text-base font-black text-emerald-400">{usedLicensesCount} Toko</span>
          </div>
        </div>
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><Megaphone size={20} /></div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tersedia (Ready)</span>
            <span className="text-base font-black text-amber-400">{availableLicensesCount} Kode</span>
          </div>
        </div>
      </div>

      {/* 3. SUB NAVIGATION TAB SELECTOR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shrink-0 overflow-x-auto no-scrollbar">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 w-full md:w-auto shadow-inner border border-slate-200/40">
          <button
            id="admin_tab_tenants"
            onClick={() => setActiveTab('tenants')}
            className={`py-2.5 px-4 text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'tenants' 
                ? 'bg-slate-900 text-white shadow-md transform scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Users size={14} className={activeTab === 'tenants' ? 'text-blue-400' : 'text-slate-500'} />
            Kelola Tenants <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === 'tenants' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/60 text-slate-500'}`}>{totalTenantsCount}</span>
          </button>
          <button
            id="admin_tab_licenses"
            onClick={() => setActiveTab('licenses')}
            className={`py-2.5 px-4 text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'licenses' 
                ? 'bg-slate-900 text-white shadow-md transform scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Key size={14} className={activeTab === 'licenses' ? 'text-amber-400' : 'text-slate-500'} />
            Lisensi BUCICI-xxxx <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === 'licenses' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/60 text-slate-500'}`}>{totalLicensesCount}</span>
          </button>
          <button
            id="admin_tab_posts"
            onClick={() => setActiveTab('posts')}
            className={`py-2.5 px-4 text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'posts' 
                ? 'bg-slate-900 text-white shadow-md transform scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Megaphone size={14} className={activeTab === 'posts' ? 'text-sky-400' : 'text-slate-500'} />
            Pengumuman & Edukasi <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === 'posts' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/60 text-slate-500'}`}>{posts.length}</span>
          </button>
          <button
            id="admin_tab_ai"
            onClick={() => setActiveTab('ai_sisten')}
            className={`py-2.5 px-4 text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'ai_sisten' 
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md transform scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'ai_sisten' ? 'text-yellow-300' : 'text-violet-500'} />
            AI-sisten Super Admin
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT INTERFACES */}
      <main className="flex-1 p-6 overflow-y-auto" id="super_admin_main_content">
        
        {/* ==================== TAB 1: KELOLA TENANTS ==================== */}
        {activeTab === 'tenants' && (
          <div className="space-y-6" id="view_admin_tenants">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={13} />
                <input
                  id="admin_search_tenant_input"
                  type="text"
                  placeholder="Cari tenant, owner, atau email..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                  value={searchTenant}
                  onChange={(e) => setSearchTenant(e.target.value)}
                />
              </div>

              <button 
                id="admin_refresh_tenants_btn"
                onClick={loadAdminData} 
                className="py-2.5 px-4 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} />
                Segarkan List
              </button>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="px-5 py-3">Nama Toko / Tenant ID</th>
                      <th className="px-5 py-3">Owner & Kontak</th>
                      <th className="px-5 py-3">Tipe Lisensi & Kadaluarsa</th>
                      <th className="px-5 py-3 text-center">AI Token</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Aksi Kendali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          Tidak ada tenant yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => (
                        <tr key={t.tenant_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-extrabold text-slate-800 block text-xs">{t.business_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {t.tenant_id}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-700 block">{t.owner_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{t.email}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded font-bold text-[10px] inline-block mb-1">
                              {t.subscription_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">Hingga: {t.expiry_date}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold text-emerald-700 font-mono">
                            {t.token_balance}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              t.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                            }`}>
                              {t.is_active ? 'Aktif' : 'Dinonaktifkan'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                id={`admin_toggle_tenant_${t.tenant_id}`}
                                onClick={() => handleToggleTenant(t.tenant_id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                  t.is_active 
                                    ? 'border-red-100 hover:bg-red-50 text-red-600' 
                                    : 'border-emerald-100 hover:bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                              
                              <button
                                id={`admin_simulate_tenant_${t.tenant_id}`}
                                onClick={() => onSimulateDemoTenant(t.tenant_id)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                              >
                                Simulasikan
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: LISENSI BUCICI-xxxx ==================== */}
        {activeTab === 'licenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="view_admin_licenses">
            
            {/* Left: License batch generator form & Google Sheets Sync */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm h-fit">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-50 mb-4">
                  <Key size={14} className="text-emerald-600 animate-pulse" />
                  Cetak Kode Lisensi Baru (Batch)
                </h4>

                <form onSubmit={handleGenerateLicenses} className="space-y-4 text-xs text-slate-700">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Jumlah Kode Lisensi (1 - 500) *</label>
                    <input
                      id="admin_license_count_input"
                      type="number"
                      min="1"
                      max="500"
                      placeholder="Mis. 50"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                      value={licenseCount}
                      onChange={(e) => setLicenseCount(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Batch / Kampanye *</label>
                    <input
                      id="admin_license_batch_input"
                      type="text"
                      placeholder="Mis. Promo Lynk Juni, Jualan Offline, Demo"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      required
                    />
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      Nama Batch membantu Anda memisahkan lisensi yang dijual melalui lynk.id, promo dropshipper, atau event khusus.
                    </p>
                  </div>

                  <button
                    id="admin_generate_license_submit"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer font-black"
                  >
                    <Plus size={14} />
                    Cetak Lisensi Sekarang
                  </button>
                </form>
              </div>

              {/* Google Sheets Hub Sync Panel */}
              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-blue-800 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg text-emerald-400">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs">Hub Central: Master Lisensi</h4>
                    <span className="text-[9px] text-blue-200 block font-bold leading-none">Auto-Sync Real-Time Aktif</span>
                  </div>
                </div>

                <p className="text-[10px] text-blue-100 leading-normal font-medium">
                  Sinkronisasi dua arah real-time aktif. Sistem akan menyelaraskan data <span className="font-bold underline text-emerald-300">Master_Lisensi</span> di Google Sheets dan database lokal, membersihkan baris kosong/korup, mengisi tenant_id, serta memvalidasi status kode lisensi secara otomatis.
                </p>

                {syncStatus && (
                  <div className={`p-2.5 rounded-xl text-[10px] font-bold flex items-start gap-1.5 border leading-tight ${
                    syncStatus.type === 'success' 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                      : syncStatus.type === 'error' 
                        ? 'bg-rose-950/40 border-rose-500/30 text-rose-200' 
                        : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                  }`}>
                    {syncStatus.type === 'success' ? (
                      <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : syncStatus.type === 'error' ? (
                      <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <span>{syncStatus.text}</span>
                  </div>
                )}

                {authLoading ? (
                  <div className="text-[10px] text-slate-300 flex items-center gap-1.5 justify-center py-2">
                    <RefreshCw size={12} className="animate-spin text-blue-400" />
                    <span>Memeriksa koneksi Google...</span>
                  </div>
                ) : googleUser && accessToken ? (
                  <div className="space-y-2">
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-left leading-none">
                        <span className="text-[8px] text-blue-300 block font-bold uppercase tracking-wider">Terhubung</span>
                        <span className="text-[10px] font-black block truncate text-emerald-300 mt-0.5">{googleUser.displayName || 'Google User'}</span>
                        <span className="text-[8px] text-slate-300 block truncate font-medium">{googleUser.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="p-1 text-rose-300 hover:text-rose-100 cursor-pointer"
                        title="Putuskan sambungan"
                      >
                        <CloudOff size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSyncLicensesBothWays(false)}
                      disabled={isSyncingLicenses}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSyncingLicenses ? (
                        <RefreshCw size={12} className="animate-spin animate-reverse" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Sinkronisasi Dua Arah Sheets & DB
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 bg-white text-slate-800 hover:bg-slate-50 transition-all font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-slate-200"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    Hubungkan Ke Google Sheets
                  </button>
                )}
              </div>
            </div>

            {/* Right: Licenses list and filter */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
                
                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:max-w-xl items-center">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={13} />
                    <input
                      id="admin_search_license_input"
                      type="text"
                      placeholder="Cari kode lisensi atau batch..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                      value={searchLicense}
                      onChange={(e) => setSearchLicense(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-slate-100 p-1.5 rounded-xl flex items-center border border-slate-200/60 shadow-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => setLicenseFilter('all')}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        licenseFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setLicenseFilter('Tersedia')}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        licenseFilter === 'Tersedia'
                          ? 'bg-amber-500 text-white shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                      }`}
                    >
                      Tersedia
                    </button>
                    <button
                      type="button"
                      onClick={() => setLicenseFilter('Terpakai')}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        licenseFilter === 'Terpakai'
                          ? 'bg-emerald-600 text-white shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                      }`}
                    >
                      Terpakai
                    </button>
                  </div>
                </div>

                <button
                  id="admin_export_license_csv"
                  onClick={handleExportCSV}
                  className="py-2.5 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1 shadow-sm cursor-pointer ml-auto"
                >
                  <Download size={13} />
                  Ekspor CSV
                </button>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="px-5 py-3">Kode Lisensi</th>
                        <th className="px-5 py-3">Nama Batch</th>
                        <th className="px-5 py-3">Dibuat Pada</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-center">Terikat Tenant ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-mono text-slate-700">
                      {filteredLicenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400 font-sans">
                            Tidak ada kode lisensi yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredLicenses.map((lic) => (
                          <tr key={lic.license_code} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 font-bold text-slate-800 text-xs">{lic.license_code}</td>
                            <td className="px-5 py-3 font-sans font-semibold text-slate-600">{lic.batch_name || '-'}</td>
                            <td className="px-5 py-3 text-slate-400 text-[10px]">
                              {new Date(lic.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded font-sans font-bold text-[10px] ${
                                lic.status === 'Tersedia' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {lic.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center font-bold text-slate-500">{lic.tenant_id || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 3: BROADCAST INFO POSTS ==================== */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="view_admin_posts">
            
            {/* Left: post creator form */}
            <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm h-fit">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-50 mb-4">
                <Megaphone size={14} className="text-emerald-600" />
                Buat Informasi Edukasi & Pengumuman Baru
              </h4>

              <form onSubmit={handleAddPost} className="space-y-4 text-xs text-slate-700">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Isi Pengumuman / Tips *</label>
                  <textarea
                    id="admin_post_content_input"
                    rows={4}
                    placeholder="Tuliskan berita rilis fitur terbaru, tips strategi marketing warung, atau pengumuman server maintenance..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 leading-relaxed font-semibold"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Tipe Lampiran *</label>
                    <select
                      id="admin_post_type_select"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
                      value={postType}
                      onChange={(e: any) => setPostType(e.target.value)}
                    >
                      <option value="YouTube">Video Tutorial (YouTube)</option>
                      <option value="Link">Tautan Luar (Link)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Tautan / Link URL</label>
                    <input
                      id="admin_post_link_input"
                      type="url"
                      placeholder="https://..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      value={postLink}
                      onChange={(e) => setPostLink(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  id="admin_post_submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <Megaphone size={13} />
                  Kirim ke Semua Tenant
                </button>
              </form>
            </div>

            {/* Right: Broadcast posts lists */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Daftar Broadcast Aktif ({posts.length})
              </span>

              {posts.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-slate-100 text-center text-slate-400">
                  <Megaphone size={28} className="mx-auto mb-1 stroke-1" />
                  <p className="text-xs font-bold text-slate-500">Belum ada broadcast yang dikirim</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div 
                      key={post.post_id} 
                      id={`admin_post_card_${post.post_id}`}
                      className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-start gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                            post.type === 'YouTube' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700'
                          }`}>
                            {post.type}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(post.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-normal font-semibold whitespace-pre-wrap">{post.content}</p>
                        {post.link && (
                          <a href={post.link} target="_blank" rel="noreferrer" className="text-[10px] text-sky-600 font-bold block truncate max-w-sm hover:underline">
                            Link: {post.link}
                          </a>
                        )}
                      </div>

                      <button
                        id={`admin_delete_post_btn_${post.post_id}`}
                        onClick={() => handleDeletePost(post.post_id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                        title="Hapus Broadcast"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 4: AI SISTEN SUPER ADMIN ==================== */}
        {activeTab === 'ai_sisten' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" id="view_admin_ai">
            <AiSistenBucici tenantId="super-admin" user={user} />
          </div>
        )}

      </main>

    </div>
  );
}
