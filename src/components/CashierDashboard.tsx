/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, Wallet, ShoppingBag, Award, Slash, AlertTriangle, 
  HelpCircle, ArrowUpRight, ArrowRight, BookOpen, LogOut 
} from 'lucide-react';
import { Product, Transaction, KasHistory } from '../types';

interface CashierDashboardProps {
  ownerName: string;
  businessName: string;
  products: Product[];
  transactions: Transaction[];
  transactionItems: any[];
  kasHistory: KasHistory[];
  onSetView: (view: string, filter?: string) => void;
  onLogout?: () => void;
}

export default function CashierDashboard({
  ownerName,
  businessName,
  products,
  transactions,
  transactionItems,
  kasHistory,
  onSetView,
  onLogout
}: CashierDashboardProps) {
  
  // Greeting time-dependent logic
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 11) return 'Pagi';
    if (hours < 15) return 'Siang';
    if (hours < 18) return 'Sore';
    return 'Malam';
  };

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // FILTER LOGIC FOR TODAY'S DATA
  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const todayTransactions = transactions.filter(t => isToday(t.timestamp));
  const successToday = todayTransactions.filter(t => t.status === 'Success');
  const voidToday = todayTransactions.filter(t => t.status === 'Void');

  // 1. Omzet Kotor hari ini
  const omzetKotorToday = successToday.reduce((acc, t) => acc + t.total, 0);

  // 2. Saldo Kas (Drawer Cash balance calculation)
  // Let's compute: sum of Kas logs (Modal, In) - sum of Kas logs (Out)
  // Wait, initial modal cash drawer logs are logged as "Modal", cashier sales are "In", other additions "In", voids "Out", cash payouts "Out".
  const cashIn = kasHistory
    .filter(k => k.type === 'In' || k.type === 'Modal')
    .reduce((acc, k) => acc + k.amount, 0);
  const cashOut = kasHistory
    .filter(k => k.type === 'Out')
    .reduce((acc, k) => acc + k.amount, 0);
  const saldoKas = Math.max(0, cashIn - cashOut);

  // 3. Jumlah Transaksi
  const jumlahTransaksiToday = successToday.length;

  // 4. Produk Terlaris
  // Map product names to qty sold today
  const prodQtyMap: { [key: string]: { name: string; qty: number } } = {};
  successToday.forEach(t => {
    const items = transactionItems.filter(item => item.trans_id === t.trans_id);
    items.forEach(item => {
      const pId = item.prod_id;
      if (prodQtyMap[pId]) {
        prodQtyMap[pId].qty += item.qty;
      } else {
        prodQtyMap[pId] = { name: item.prod_name || 'Produk', qty: item.qty };
      }
    });
  });

  let topProduct = 'Tidak Ada';
  let topProductQty = 0;
  Object.keys(prodQtyMap).forEach(key => {
    if (prodQtyMap[key].qty > topProductQty) {
      topProduct = prodQtyMap[key].name;
      topProductQty = prodQtyMap[key].qty;
    }
  });

  // 5. Jumlah Void
  const jumlahVoidToday = voidToday.length;

  // 6. Stok Hampir Habis
  const lowStockCount = products.filter(p => !p.name.startsWith("Placeholder Category - ") && p.stock <= 5).length;

  // 7. Piutang Aktif
  const activePiutang = transactions
    .filter(t => t.payment_mode === 'Piutang' && t.status === 'Success')
    .reduce((acc, t) => acc + t.total, 0);

  // 8. Laba Kotor (Gross Profit)
  // Check if any product in any successful transaction today lacks cost_price/Harga Modal
  // Let's scan all sold items today
  const soldItemsToday = transactionItems.filter(item => 
    successToday.some(t => t.trans_id === item.trans_id)
  );

  const missingModalProductIds = new Set<string>();
  let cogsCompleted = true;
  let totalLabaKotor = 0;

  soldItemsToday.forEach(item => {
    // Check if item has recorded cost_price, or if current product has cost_price
    const currentProd = products.find(p => p.prod_id === item.prod_id);
    const itemCost = item.cost_price !== undefined ? item.cost_price : (currentProd ? currentProd.cost_price : undefined);

    if (itemCost === undefined || itemCost === null) {
      cogsCompleted = false;
      missingModalProductIds.add(item.prod_id);
    } else {
      const margin = item.price - itemCost;
      totalLabaKotor += (margin * item.qty);
    }
  });

  // Total products in store missing modal / cost_price entirely
  const totalProductsMissingModal = products.filter(p => !p.name.startsWith("Placeholder Category - ") && (p.cost_price === undefined || p.cost_price === null)).length;

  return (
    <div className="space-y-6" id="cashier_dashboard">
      {/* Dynamic Welcome Greeting Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm" id="dashboard_greeting">
        <div>
          <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            {todayStr}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-2 text-slate-800">
            Selamat {getGreeting()}, <span className="text-blue-600">{ownerName}</span>! 👋
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Toko Anda: <span className="font-bold text-slate-700">{businessName}</span> • Semangat berniaga hari ini!
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            id="dash_go_pos_btn"
            onClick={() => onSetView('POS')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            Masuk Menu POS (Kasir)
            <ArrowUpRight size={14} />
          </button>

          {onLogout && (
            <button
              id="dash_logout_btn"
              onClick={onLogout}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <LogOut size={13} />
              Logout Akun
            </button>
          )}
        </div>
      </div>

      {/* STATS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats_grid">
        {/* Card 1: Omzet Kotor */}
        <div 
          className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => onSetView('rekapan')}
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Omzet Kotor (Hari Ini)</span>
            <span className="text-base sm:text-lg font-bold text-slate-800 block">Rp {omzetKotorToday.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 2: Saldo Kas */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => onSetView('kas')}>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Saldo Kas Laci</span>
            <span className="text-base sm:text-lg font-bold text-slate-800 block">Rp {saldoKas.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 3: Jumlah Transaksi */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => onSetView('riwayat')}>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <ShoppingBag size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Jumlah Transaksi (Hari Ini)</span>
            <span className="text-base sm:text-lg font-bold text-slate-800 block">{jumlahTransaksiToday} Sukses</span>
          </div>
        </div>

        {/* Card 4: Produk Terlaris */}
        <div 
          className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => onSetView('riwayat')}
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Produk Terlaris (Hari Ini)</span>
            <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">{topProduct}</span>
            {topProductQty > 0 && <span className="text-[10px] text-slate-500 font-semibold">{topProductQty} porsi terjual</span>}
          </div>
        </div>

        {/* Card 5: Piutang Aktif */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => onSetView('Riwayat', 'Belum Bayar')}>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Piutang Aktif Toko</span>
            <span className="text-base sm:text-lg font-bold text-slate-800 block">Rp {activePiutang.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 6: Jumlah Void */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => onSetView('Riwayat', 'Void')}>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <Slash size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Transaksi Void (Batal)</span>
            <span className="text-base sm:text-lg font-bold text-rose-600 block">{jumlahVoidToday} Void</span>
          </div>
        </div>

        {/* Card 7: Stok Hampir Habis */}
        <div 
          key="stok-tipis-card"
          id="dashboard_stok_tipis"
          onClick={() => onSetView('Manajemen', 'Stok Tipis')}
          className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer hover:bg-amber-50/20 hover:border-amber-200 transition-all"
        >
          <div className={`p-3 rounded-xl shrink-0 ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Stok Hampir Habis (&lt;=5)</span>
            <span className={`text-base sm:text-lg font-bold block ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {lowStockCount} Produk
            </span>
          </div>
        </div>

        {/* Card 8: Laba Kotor (Gross Profit) */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[90px]">
          {cogsCompleted ? (
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <TrendingUp size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Laba Kotor Terhitung</span>
                <span className="text-base sm:text-lg font-bold text-slate-800 block">Rp {totalLabaKotor.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-400 block uppercase tracking-wider">Laba Kotor (Hari Ini)</span>
              <div className="flex items-start gap-1">
                <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                <span className="text-[10px] font-semibold text-rose-600 leading-tight block">
                  Laba kotor belum tersedia. Ada {missingModalProductIds.size} produk dalam transaksi hari ini yang belum memiliki Harga Modal.
                </span>
              </div>
              <button
                id="cogs_fix_now"
                onClick={() => onSetView('Manajemen', 'Belum Ada Modal')}
                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 underline mt-1.5 flex items-center gap-1 cursor-pointer"
              >
                Lengkapi Sekarang
                <ArrowRight size={10} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MISSING COGS REMINDER BANNER */}
      {totalProductsMissingModal > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg mt-0.5 sm:mt-0 shrink-0">
              <HelpCircle size={18} />
            </span>
            <div>
              <h5 className="font-bold text-slate-800 text-sm">Hitung Keuntungan Tokomu Lebih Akurat</h5>
              <p className="text-xs text-slate-600 mt-0.5">
                Masih ada <span className="font-bold text-amber-700">{totalProductsMissingModal} produk</span> di tokomu yang belum memiliki Harga Modal. Lengkapi Harga Modal produk agar Bucici dapat menampilkan kalkulasi Laba Kotor tokomu secara otomatis.
              </p>
            </div>
          </div>
          
          <button
            id="fix_all_cogs_btn"
            onClick={() => onSetView('Manajemen', 'Belum Ada Modal')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto transition-all cursor-pointer"
          >
            Lengkapi Modal Produk
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
