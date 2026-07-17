import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Cloud, 
  CloudLightning,
  CloudOff,
  CheckCircle, 
  ExternalLink, 
  Download, 
  Upload, 
  Plus, 
  ArrowRight,
  Info,
  AlertTriangle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  googleLogout, 
  createSpreadsheetInDrive, 
  writeValuesToRange, 
  readValuesFromRange 
} from '../lib/googleSheetsService';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncProps {
  tenantId: string;
  businessName: string;
  products: any[];
  transactions: any[];
  kasHistory: any[];
  onRefresh: () => void;
}

export default function GoogleSheetsSync({
  tenantId,
  businessName,
  products,
  transactions,
  kasHistory,
  onRefresh
}: GoogleSheetsSyncProps) {
  // Auth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Spreadsheet state (Hardcoded to Developer's central Hub Spreadsheet ID)
  const [spreadsheetId, setSpreadsheetId] = useState<string>('10Mr3QgyPZ9dbx8YwbOnuPlp-RlKgC4f7DOq8J5sqbkw');
  const [isCreatingSpreadsheet, setIsCreatingSpreadsheet] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sync operations loading state
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingTransactions, setSyncingTransactions] = useState(false);
  const [syncingKas, setSyncingKas] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Import state
  const [importTabName, setImportTabName] = useState('Produk Bucici');
  const [isReadingImport, setIsReadingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedRows, setImportedRows] = useState<any[][] | null>(null);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Load saved Auto-Sync preference on mount, but keep spreadsheet ID locked to Developer's ID
  useEffect(() => {
    setSpreadsheetId('10Mr3QgyPZ9dbx8YwbOnuPlp-RlKgC4f7DOq8J5sqbkw');

    const savedAutoSync = localStorage.getItem(`bucici_autosync_${tenantId}`);
    if (savedAutoSync === 'false') {
      setAutoSyncEnabled(false);
    } else {
      setAutoSyncEnabled(true);
      localStorage.setItem(`bucici_autosync_${tenantId}`, 'true');
    }

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
  }, [tenantId]);

  // Real-time Auto Sync Effect for Products
  useEffect(() => {
    if (autoSyncEnabled && accessToken && spreadsheetId && products.length > 0) {
      const delayDebounce = setTimeout(() => {
        handleExportProducts(true).catch(err => console.error("Auto-sync products error:", err));
      }, 2000); // Debounce to prevent hitting API limits on quick successive edits
      return () => clearTimeout(delayDebounce);
    }
  }, [products, autoSyncEnabled, accessToken, spreadsheetId]);

  // Real-time Auto Sync Effect for Transactions
  useEffect(() => {
    if (autoSyncEnabled && accessToken && spreadsheetId && transactions.length > 0) {
      const delayDebounce = setTimeout(() => {
        handleExportTransactions(true).catch(err => console.error("Auto-sync transactions error:", err));
      }, 2000);
      return () => clearTimeout(delayDebounce);
    }
  }, [transactions, autoSyncEnabled, accessToken, spreadsheetId]);

  // Real-time Auto Sync Effect for Kas History
  useEffect(() => {
    if (autoSyncEnabled && accessToken && spreadsheetId && kasHistory.length > 0) {
      const delayDebounce = setTimeout(() => {
        handleExportKas(true).catch(err => console.error("Auto-sync kas history error:", err));
      }, 2000);
      return () => clearTimeout(delayDebounce);
    }
  }, [kasHistory, autoSyncEnabled, accessToken, spreadsheetId]);

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSyncEnabled(checked);
    localStorage.setItem(`bucici_autosync_${tenantId}`, String(checked));
    if (checked) {
      showStatus('success', 'Sinkronisasi Otomatis Real-Time diaktifkan! Setiap perubahan data akan langsung terkirim ke Google Sheets Anda.');
    } else {
      showStatus('info', 'Sinkronisasi Otomatis Real-Time dinonaktifkan.');
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        showStatus('success', 'Berhasil terhubung ke akun Google Anda!');
      }
    } catch (err: any) {
      console.error(err);
      showStatus('error', err.message || 'Gagal masuk dengan Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Google Logout
  const handleGoogleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan sambungan akun Google Sheets?')) {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
      showStatus('info', 'Akun Google Sheets berhasil diputuskan.');
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === text ? null : prev);
    }, 6000);
  };

  // Create fresh spreadsheet
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) return;
    setIsCreatingSpreadsheet(true);
    setStatusMessage(null);
    try {
      const title = `Bucici Biz - Pembukuan ${businessName || 'Toko'}`;
      const newId = await createSpreadsheetInDrive(accessToken, title);
      setSpreadsheetId(newId);
      localStorage.setItem(`bucici_spreadsheet_id_${tenantId}`, newId);
      showStatus('success', `Berhasil membuat Spreadsheet baru: "${title}"!`);
    } catch (err: any) {
      console.error(err);
      showStatus('error', err.message || 'Gagal membuat spreadsheet baru.');
    } finally {
      setIsCreatingSpreadsheet(false);
    }
  };

  // Update sheet ID manually
  const handleSaveSpreadsheetId = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`bucici_spreadsheet_id_${tenantId}`, spreadsheetId.trim());
    showStatus('success', 'ID Spreadsheet berhasil disimpan secara lokal!');
  };

  // EXPORT PRODUCTS
  const handleExportProducts = async (silent = false) => {
    if (!accessToken || !spreadsheetId) return;
    setSyncingProducts(true);
    if (!silent) setStatusMessage(null);
    try {
      const headers = [
        'ID Produk', 
        'Nama Produk', 
        'Kategori', 
        'Harga Jual (Rp)', 
        'Harga Pokok / Modal (Rp)', 
        'Stok Saat Ini', 
        'SKU / Barcode'
      ];
      const rows = products
        .filter(p => !p.name.startsWith("Placeholder Category - "))
        .map(p => [
        p.prod_id || '',
        p.name || '',
        p.category || 'Umum',
        p.price || 0,
        p.cost_price || 0,
        p.stock || 0,
        p.sku || ''
      ]);

      await writeValuesToRange(accessToken, spreadsheetId, 'Produk Bucici', headers, rows);
      if (!silent) showStatus('success', 'Berhasil mengekspor daftar produk ke tab "Produk Bucici"!');
    } catch (err: any) {
      console.error(err);
      if (!silent) showStatus('error', err.message || 'Gagal mengekspor data produk.');
      throw err;
    } finally {
      setSyncingProducts(false);
    }
  };

  // EXPORT TRANSACTIONS
  const handleExportTransactions = async (silent = false) => {
    if (!accessToken || !spreadsheetId) return;
    setSyncingTransactions(true);
    if (!silent) setStatusMessage(null);
    try {
      const headers = [
        'ID Transaksi', 
        'Tanggal & Waktu', 
        'Nama Kasir / Karyawan', 
        'Nama Pelanggan', 
        'Total Transaksi (Rp)', 
        'Metode Pembayaran', 
        'Catatan / Meja'
      ];
      const rows = transactions.map(t => [
        t.trans_id || '',
        t.timestamp || '',
        t.emp_name || '',
        t.customer_name || '-',
        t.total || 0,
        t.payment_mode || 'Cash',
        t.notes || ''
      ]);

      await writeValuesToRange(accessToken, spreadsheetId, 'Transaksi Bucici', headers, rows);
      if (!silent) showStatus('success', 'Berhasil mengekspor riwayat transaksi ke tab "Transaksi Bucici"!');
    } catch (err: any) {
      console.error(err);
      if (!silent) showStatus('error', err.message || 'Gagal mengekspor data transaksi.');
      throw err;
    } finally {
      setSyncingTransactions(false);
    }
  };

  // EXPORT CASH LOGS (KAS HISTORY)
  const handleExportKas = async (silent = false) => {
    if (!accessToken || !spreadsheetId) return;
    setSyncingKas(true);
    if (!silent) setStatusMessage(null);
    try {
      const headers = [
        'Tanggal & Waktu', 
        'Tipe Kas', 
        'Jumlah (Rp)', 
        'Keterangan / Deskripsi'
      ];
      const rows = kasHistory.map(k => [
        k.timestamp || '',
        k.type || '',
        k.amount || 0,
        k.description || ''
      ]);

      await writeValuesToRange(accessToken, spreadsheetId, 'Kas Bucici', headers, rows);
      if (!silent) showStatus('success', 'Berhasil mengekspor log kas laci ke tab "Kas Bucici"!');
    } catch (err: any) {
      console.error(err);
      if (!silent) showStatus('error', err.message || 'Gagal mengekspor log kas.');
      throw err;
    } finally {
      setSyncingKas(false);
    }
  };

  // EXPORT ALL
  const handleExportAll = async () => {
    if (!accessToken || !spreadsheetId) return;
    const confirmed = window.confirm('Ekspor semua data akan menimpa tab "Produk Bucici", "Transaksi Bucici", dan "Kas Bucici" di Google Sheet. Lanjutkan?');
    if (!confirmed) return;

    setSyncingAll(true);
    setStatusMessage(null);
    try {
      await handleExportProducts(true);
      await handleExportTransactions(true);
      await handleExportKas(true);
      showStatus('success', 'Semua data pembukuan berhasil disinkronkan ke Google Sheets Anda!');
    } catch (err: any) {
      console.error(err);
      showStatus('error', 'Gagal menyinkronkan beberapa data. Silakan coba lagi.');
    } finally {
      setSyncingAll(false);
    }
  };

  // READ GOOGLE SHEET FOR PRODUCT IMPORT
  const handlePreviewImport = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsReadingImport(true);
    setImportedRows(null);
    setParsedProducts([]);
    setStatusMessage(null);

    try {
      const range = `${importTabName}!A1:G100`; // Fetch headers + first 100 rows
      const rawRows = await readValuesFromRange(accessToken, spreadsheetId, range);

      if (rawRows.length <= 1) {
        throw new Error(`Tidak ada data produk ditemukan di tab "${importTabName}". Pastikan baris pertama berisi tajuk.`);
      }

      setImportedRows(rawRows);

      // Simple heuristic mapping
      // Row 0 is header: Product Name, Category, Price, Cost Price, Initial Stock, SKU
      const headers = rawRows[0].map(h => h.toString().toLowerCase().trim());
      
      // Find indexes
      const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('produk') || h.includes('product'));
      const catIdx = headers.findIndex(h => h.includes('kategori') || h.includes('category') || h.includes('jenis'));
      const priceIdx = headers.findIndex(h => h.includes('jual') || h.includes('harga') || h.includes('price'));
      const costIdx = headers.findIndex(h => h.includes('pokok') || h.includes('modal') || h.includes('cost') || h.includes('hpp'));
      const stockIdx = headers.findIndex(h => h.includes('stok') || h.includes('stock') || h.includes('jumlah') || h.includes('qty'));
      const skuIdx = headers.findIndex(h => h.includes('sku') || h.includes('barcode') || h.includes('kode'));

      // If cannot find Name, fall back to column 0=Name, 1=Category, 2=Price, 3=Modal, 4=Stock, 5=SKU
      const mappedProducts = rawRows.slice(1).map((row, idx) => {
        const name = row[nameIdx !== -1 ? nameIdx : 1] || row[0] || '';
        const category = row[catIdx !== -1 ? catIdx : 2] || row[1] || 'Umum';
        const rawPrice = row[priceIdx !== -1 ? priceIdx : 3] || row[2] || '0';
        const rawCost = row[costIdx !== -1 ? costIdx : 4] || row[3] || '0';
        const rawStock = row[stockIdx !== -1 ? stockIdx : 5] || row[4] || '0';
        const sku = row[skuIdx !== -1 ? skuIdx : 6] || row[5] || '';

        // Clean values
        const price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;
        const cost_price = parseFloat(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
        const stock = parseFloat(String(rawStock).replace(/[^0-9.]/g, '')) || 0;

        return {
          id: idx,
          name: String(name).trim(),
          category: String(category).trim(),
          price,
          cost_price,
          stock,
          sku: String(sku).trim()
        };
      }).filter(p => p.name.length > 0);

      setParsedProducts(mappedProducts);
      showStatus('success', `Berhasil membaca ${mappedProducts.length} produk dari Google Sheets! Periksa tinjauan di bawah.`);
    } catch (err: any) {
      console.error(err);
      showStatus('error', err.message || 'Gagal membaca data import dari spreadsheet.');
    } finally {
      setIsReadingImport(false);
    }
  };

  // CONFIRM IMPORT TO DB
  const handleConfirmImport = async () => {
    if (parsedProducts.length === 0) return;
    const confirmed = window.confirm(`Apakah Anda yakin ingin mengimpor ${parsedProducts.length} produk ke dalam database Bucici Biz?`);
    if (!confirmed) return;

    setIsImporting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/products/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          products: parsedProducts
        })
      });

      const data = await res.json();
      if (data.success) {
        showStatus('success', `Sukses mengimpor ${data.data.length} produk baru ke Bucici Biz!`);
        setImportedRows(null);
        setParsedProducts([]);
        onRefresh(); // Trigger parent refresh to load new products
      } else {
        showStatus('error', data.error || 'Gagal menyimpan produk impor.');
      }
    } catch (err: any) {
      console.error(err);
      showStatus('error', 'Gagal melakukan transaksi impor.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6" id="google_sheets_sync_wrapper">
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="text-emerald-400" size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tight">Integrasi Google Sheets</h1>
          </div>
          <p className="text-xs text-blue-100 font-medium max-w-xl">
            Hubungkan Bucici Biz dengan Google Sheets Anda untuk ekspor otomatis pembukuan toko secara langsung atau impor daftar produk massal dengan cepat.
          </p>
        </div>

        {/* GOOGLE ACC CONNECTION PANEL */}
        <div className="flex items-center">
          {authLoading ? (
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-2xl text-xs font-bold">
              <RefreshCw className="animate-spin text-white" size={14} />
              Memeriksa Koneksi...
            </div>
          ) : googleUser && accessToken ? (
            <div className="bg-white/10 border border-white/20 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs shadow-sm">
                {googleUser.displayName?.charAt(0) || 'G'}
              </div>
              <div className="text-left leading-none max-w-[140px] md:max-w-[200px]">
                <span className="text-[10px] text-blue-200 block font-bold uppercase tracking-wider">Terhubung</span>
                <span className="text-xs font-black block truncate mt-0.5">{googleUser.displayName || 'Google User'}</span>
                <span className="text-[9px] text-blue-200 block truncate font-medium">{googleUser.email}</span>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogout}
                className="p-1.5 hover:bg-white/10 rounded-lg text-rose-300 hover:text-rose-100 font-black text-[10px] uppercase cursor-pointer"
                title="Putuskan koneksi Google"
              >
                <CloudOff size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="bg-white text-slate-800 hover:bg-slate-50 transition-all font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-2.5 shadow-sm cursor-pointer border border-slate-200"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Masuk dengan Google
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICATION FEEDBACK BAR */}
      {statusMessage && (
        <div 
          className={`p-4 rounded-2xl flex items-start gap-2.5 border transition-all text-xs font-bold ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : statusMessage.type === 'error' 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
          ) : (
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* MAIN LAYOUT COLS */}
      {!googleUser ? (
        <div className="bg-white border border-slate-200 p-10 rounded-3xl text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CloudLightning size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-800">Koneksi Diperlukan</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Silakan masuk dengan akun Google Anda untuk mengaktifkan sinkronisasi database ke Google Drive / Google Sheets secara instan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
          >
            Hubungkan Akun Google
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: SETUP & SPREADSHEET MANAGER */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* SPREADSHEET CONFIG CARD */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block bg-blue-50 px-2.5 py-1 rounded-full w-fit">
                Penyimpanan Pusat (Web Developer)
              </span>
              
              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed font-bold">
                  Database Hub Terpusat
                </p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Seluruh data transaksi, kasir, dan persediaan dari tenant aplikasi ini disinkronisasikan ke satu Google Drive / Google Sheets Hub terpusat milik Developer Web.
                </p>
              </div>

              <div className="border-t border-slate-100 my-2" />

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">
                    ID Spreadsheet Hub
                  </label>
                  <div className="w-full text-xs font-mono font-bold p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 break-all">
                    {spreadsheetId}
                  </div>
                  <span className="text-[9px] text-emerald-600 block leading-tight font-extrabold">
                    ✓ Terkunci & Terkoneksi ke Google Drive Developer
                  </span>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                    title="Buka Spreadsheet Hub"
                  >
                    <ExternalLink size={13} />
                    Buka Spreadsheet Hub
                  </a>
                </div>
              </div>

              <div className="border-t border-slate-100 my-3" />

              {/* REAL-TIME AUTO SYNC TOGGLE */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 max-w-[75%]">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <CloudLightning size={12} className="text-amber-500 animate-pulse" />
                      Auto-Sync Real-Time
                    </span>
                    <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                      Kirim otomatis perubahan kasir, produk, dan kas laci langsung ke Google Sheet Anda secara real-time.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={autoSyncEnabled}
                      disabled={!accessToken || !spreadsheetId}
                      onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {!accessToken && (
                  <span className="text-[9px] text-amber-700 font-extrabold block bg-amber-50 p-2 rounded-xl border border-amber-100/60 leading-normal">
                    ⚠️ Hubungkan akun Google Anda terlebih dahulu untuk mengaktifkan fitur Auto-Sync ke Spreadsheet Hub.
                  </span>
                )}
              </div>
            </div>

            {/* QUICK GUIDE / LAYOUT EXPECTATIONS */}
            <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Info size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Format Kolom Impor</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Untuk mengimpor daftar produk dari Google Sheet Anda, buat kolom tajuk (header) pada <strong>Baris 1</strong> seperti berikut:
              </p>
              <div className="bg-slate-950 p-3 rounded-xl space-y-2 font-mono text-[9px] text-emerald-300 border border-slate-800">
                <div>A: Nama Produk <span className="text-slate-500">(Wajib)</span></div>
                <div>B: Kategori <span className="text-slate-500">(Umum jika kosong)</span></div>
                <div>C: Harga Jual <span className="text-slate-500">(Wajib, angka)</span></div>
                <div>D: Harga Pokok / Modal <span className="text-slate-500">(Opsional)</span></div>
                <div>E: Stok Awal <span className="text-slate-500">(Opsional, angka)</span></div>
                <div>F: SKU / Barcode <span className="text-slate-500">(Opsional)</span></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Sistem akan otomatis mendeteksi nama kolom dan mengimpor baris produk ke laci tokomu.
              </p>
            </div>
          </div>

          {/* MIDDLE & RIGHT COLUMNS: SYNC ACTIONS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* EXPORT WORKSTATION */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    Ekspor Data ke Google Sheets
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Kirim data lokal Anda ke tab terpisah dalam Spreadsheet yang dipilih.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportAll}
                  disabled={!spreadsheetId || syncingAll}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {syncingAll ? (
                    <RefreshCw className="animate-spin" size={12} />
                  ) : (
                    <Cloud size={12} />
                  )}
                  Ekspor Semua Data
                </button>
              </div>

              {!spreadsheetId && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[10px] font-bold flex items-center gap-1.5 leading-tight">
                  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                  <span>Harap buat atau masukkan ID Spreadsheet di sebelah kiri sebelum melakukan ekspor data.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* PRODUCT EXPORT CELL */}
                <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase">1. Daftar Produk</span>
                    <h4 className="text-xs font-black text-slate-800">Ekspor Produk</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Ekspor {products.length} produk ke tab <strong className="text-slate-600">"Produk Bucici"</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportProducts()}
                    disabled={!spreadsheetId || syncingProducts || syncingAll}
                    className="w-full py-2 bg-white hover:bg-slate-50 disabled:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-black text-slate-700 disabled:text-slate-400 cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {syncingProducts ? (
                      <RefreshCw className="animate-spin text-blue-500" size={10} />
                    ) : (
                      <Upload size={10} className="text-emerald-500" />
                    )}
                    Ekspor Produk
                  </button>
                </div>

                {/* TRANSACTION EXPORT CELL */}
                <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase">2. Riwayat Nota</span>
                    <h4 className="text-xs font-black text-slate-800">Ekspor Transaksi</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Ekspor {transactions.length} transaksi ke tab <strong className="text-slate-600">"Transaksi Bucici"</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportTransactions()}
                    disabled={!spreadsheetId || syncingTransactions || syncingAll}
                    className="w-full py-2 bg-white hover:bg-slate-50 disabled:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-black text-slate-700 disabled:text-slate-400 cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {syncingTransactions ? (
                      <RefreshCw className="animate-spin text-blue-500" size={10} />
                    ) : (
                      <Upload size={10} className="text-emerald-500" />
                    )}
                    Ekspor Transaksi
                  </button>
                </div>

                {/* KAS EXPORT CELL */}
                <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase">3. Kas Laci</span>
                    <h4 className="text-xs font-black text-slate-800">Ekspor Arus Kas</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Ekspor {kasHistory.length} log kas ke tab <strong className="text-slate-600">"Kas Bucici"</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportKas()}
                    disabled={!spreadsheetId || syncingKas || syncingAll}
                    className="w-full py-2 bg-white hover:bg-slate-50 disabled:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-black text-slate-700 disabled:text-slate-400 cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {syncingKas ? (
                      <RefreshCw className="animate-spin text-blue-500" size={10} />
                    ) : (
                      <Upload size={10} className="text-emerald-500" />
                    )}
                    Ekspor Kas Laci
                  </button>
                </div>

              </div>
            </div>

            {/* IMPORT WORKSTATION */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Impor Daftar Produk dari Google Sheets
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Tarik baris produk dari Google Sheet Anda dan simpan secara massal ke dalam sistem Bucici Biz.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">
                    Nama Tab / Sheet Sumber
                  </label>
                  <input
                    type="text"
                    value={importTabName}
                    onChange={(e) => setImportTabName(e.target.value)}
                    placeholder="Contoh: Sheet1 atau Produk Bucici"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePreviewImport}
                  disabled={!spreadsheetId || isReadingImport || isImporting}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all font-black text-xs px-5 py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isReadingImport ? (
                    <RefreshCw className="animate-spin" size={13} />
                  ) : (
                    <Download size={13} />
                  )}
                  Tinjau Produk Sheet
                </button>
              </div>

              {/* IMPORT DATA PREVIEW TABLE */}
              {parsedProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle size={12} className="text-emerald-500" />
                      Siap untuk Diimpor ({parsedProducts.length} Produk)
                    </span>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      {isImporting ? (
                        <RefreshCw className="animate-spin" size={12} />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      Konfirmasi Masukkan ke Database
                    </button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead className="bg-slate-100 text-slate-500 uppercase sticky top-0 font-bold">
                        <tr>
                          <th className="p-2 pl-3">Nama Produk</th>
                          <th className="p-2">Kategori</th>
                          <th className="p-2 text-right">Harga Jual</th>
                          <th className="p-2 text-right">HPP/Modal</th>
                          <th className="p-2 text-right">Stok</th>
                          <th className="p-2 pr-3">SKU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {parsedProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50">
                            <td className="p-2 pl-3 truncate max-w-[120px]">{p.name}</td>
                            <td className="p-2">{p.category}</td>
                            <td className="p-2 text-right">Rp{p.price.toLocaleString()}</td>
                            <td className="p-2 text-right">Rp{p.cost_price.toLocaleString()}</td>
                            <td className="p-2 text-right">{p.stock}</td>
                            <td className="p-2 pr-3 truncate max-w-[80px] text-slate-400">{p.sku || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
