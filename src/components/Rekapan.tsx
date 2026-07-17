/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Download, BarChart2, TrendingUp, DollarSign, ShoppingBag, 
  User, CreditCard, ChevronRight, PieChart, Star, Calendar 
} from 'lucide-react';
import { Transaction, Product } from '../types';

interface RekapanProps {
  tenantId: string;
  transactions: Transaction[];
  transactionItems: any[];
  products: Product[];
}

export default function Rekapan({ 
  tenantId, 
  transactions, 
  transactionItems, 
  products 
}: RekapanProps) {
  const [reportPeriod, setReportPeriod] = useState<'Hari' | '7Hari' | '30Hari' | 'Custom'>('7Hari');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // FILTERED TRANSACTIONS
  const successTransactions = transactions.filter(t => t.status === 'Success');

  const filteredTrx = successTransactions.filter(t => {
    const tDate = new Date(t.timestamp);
    const today = new Date();
    
    if (reportPeriod === 'Hari') {
      return tDate.getDate() === today.getDate() &&
             tDate.getMonth() === today.getMonth() &&
             tDate.getFullYear() === today.getFullYear();
    } else if (reportPeriod === '7Hari') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      return tDate >= sevenDaysAgo;
    } else if (reportPeriod === '30Hari') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      return tDate >= thirtyDaysAgo;
    } else if (reportPeriod === 'Custom' && startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }
    return true;
  });

  // METRICS CALCULATIONS
  const totalOmzet = filteredTrx.reduce((acc, t) => acc + t.total, 0);
  const totalTrxCount = filteredTrx.length;
  const averageBasketValue = totalTrxCount > 0 ? Math.round(totalOmzet / totalTrxCount) : 0;

  // Laba Kotor (Gross profit) on filtered data
  let totalLabaKotor = 0;
  let hasMissingCogs = false;

  filteredTrx.forEach(t => {
    const items = transactionItems.filter(item => item.trans_id === t.trans_id);
    items.forEach(item => {
      const currentProd = products.find(p => p.prod_id === item.prod_id);
      const cost = item.cost_price !== undefined ? item.cost_price : (currentProd ? currentProd.cost_price : undefined);
      if (cost !== undefined && cost !== null) {
        totalLabaKotor += ((item.price - cost) * item.qty);
      } else {
        hasMissingCogs = true;
      }
    });
  });

  // PAYMENT MODE BREAKDOWN
  const paymentModes = {
    Cash: 0,
    QRIS: 0,
    Transfer: 0,
    Piutang: 0
  };
  filteredTrx.forEach(t => {
    const mode = t.payment_mode as keyof typeof paymentModes;
    if (paymentModes[mode] !== undefined) {
      paymentModes[mode] += t.total;
    }
  });

  // EMPLOYEE PERFORMANCE LEADERBOARD
  const staffLeaderboardMap: { [key: string]: { name: string; omzet: number; count: number } } = {};
  filteredTrx.forEach(t => {
    const key = t.emp_id || 'Owner';
    const name = t.emp_name || 'Owner / Utama';
    if (staffLeaderboardMap[key]) {
      staffLeaderboardMap[key].omzet += t.total;
      staffLeaderboardMap[key].count += 1;
    } else {
      staffLeaderboardMap[key] = { name, omzet: t.total, count: 1 };
    }
  });
  const staffLeaderboard = Object.values(staffLeaderboardMap).sort((a, b) => b.omzet - a.omzet);

  // EXPORT 1: Sales Summary (RFC-4180 CSV generation)
  const downloadSalesCSV = () => {
    if (filteredTrx.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor!");
      return;
    }

    const headers = ['ID Transaksi', 'Waktu', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Total Belanja', 'Catatan'];
    const rows = filteredTrx.map(t => [
      t.trans_id,
      new Date(t.timestamp).toLocaleString('id-ID'),
      t.emp_name,
      t.customer_name || 'Umum',
      t.payment_mode,
      t.total.toString(),
      t.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bucici_Laporan_Penjualan_${tenantId}_${reportPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT 2: Item sales breakdown
  const downloadItemsCSV = () => {
    const soldItems = transactionItems.filter(item => 
      filteredTrx.some(t => t.trans_id === item.trans_id)
    );

    if (soldItems.length === 0) {
      alert("Tidak ada data item terjual untuk diekspor!");
      return;
    }

    const headers = ['ID Transaksi', 'ID Produk', 'Nama Produk', 'Jumlah Porsi', 'Harga Jual', 'Subtotal'];
    const rows = soldItems.map(item => [
      item.trans_id,
      item.prod_id,
      item.prod_name || 'Produk',
      item.qty.toString(),
      item.price.toString(),
      item.subtotal.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bucici_Rekap_Detail_Item_${tenantId}_${reportPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="rekapan_tab">
      
      {/* 1. PERIOD SELECTOR CARD */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="report_period_selector">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Rekap & Analisa Penjualan Toko</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Analisa performa omzet kotor, laba kotor, dan kontribusi staff harian.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['Hari', '7Hari', '30Hari', 'Custom'] as const).map(p => (
            <button
              key={p}
              id={`rekap_period_${p}`}
              onClick={() => setReportPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                reportPeriod === p 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p === 'Hari' ? 'Hari Ini' : p === '7Hari' ? '7 Hari Terakhir' : p === '30Hari' ? '30 Hari Terakhir' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {reportPeriod === 'Custom' && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 items-end max-w-2xl">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Tanggal Mulai</label>
            <input
              id="rekap_start_date"
              type="date"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Tanggal Selesai</label>
            <input
              id="rekap_end_date"
              type="date"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* 2. CORE STATS METRICS BENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="rekap_stats_grid">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Omzet Penjualan</span>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={16} className="text-emerald-600" />
            <span className="text-lg font-extrabold text-slate-800">Rp {totalOmzet.toLocaleString('id-ID')}</span>
          </div>
          <p className="text-[10px] text-slate-400">Total omzet dari transaksi berstatus Sukses</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Laba Kotor</span>
          <div className="flex items-center gap-1.5">
            <DollarSign size={16} className="text-indigo-600" />
            <span className="text-lg font-extrabold text-indigo-900">
              Rp {totalLabaKotor.toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {hasMissingCogs ? '⚠️ Ada produk tanpa harga modal!' : 'Terhitung otomatis dari selisih HPP'}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Jumlah Transaksi</span>
          <div className="flex items-center gap-1.5">
            <ShoppingBag size={16} className="text-sky-600" />
            <span className="text-lg font-extrabold text-slate-800">{totalTrxCount} Sukses</span>
          </div>
          <p className="text-[10px] text-slate-400">Arus transaksi penjualan kasir</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Rata-rata Nilai Belanja</span>
          <div className="flex items-center gap-1.5">
            <Star size={15} className="text-amber-500 fill-amber-500" />
            <span className="text-lg font-extrabold text-slate-800">Rp {averageBasketValue.toLocaleString('id-ID')}</span>
          </div>
          <p className="text-[10px] text-slate-400">Rata-rata pengeluaran per pelanggan</p>
        </div>
      </div>

      {/* 3. CHART & BREAKDOWNS GROUP ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="rekap_breakdowns_row">
        {/* Left: Payment Distribution list */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <PieChart size={16} className="text-slate-600" />
            Pembagian Metode Pembayaran
          </h4>

          <div className="space-y-3.5" id="payment_distribution_list">
            {(['Cash', 'QRIS', 'Transfer', 'Piutang'] as const).map(mode => {
              const amount = paymentModes[mode];
              const pct = totalOmzet > 0 ? Math.round((amount / totalOmzet) * 100) : 0;
              return (
                <div key={mode} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{mode}</span>
                    <span className="text-slate-500">Rp {amount.toLocaleString('id-ID')} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        mode === 'Cash' 
                          ? 'bg-emerald-500' 
                          : mode === 'QRIS' 
                            ? 'bg-sky-500' 
                            : mode === 'Transfer' 
                              ? 'bg-indigo-500' 
                              : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Employee Leaderboard Table */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <User size={16} className="text-slate-600" />
            Leaderboard Kontribusi Staff Kasir
          </h4>

          <div className="overflow-x-auto">
            {staffLeaderboard.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada staff berkontribusi dalam pencatatan transaksi pada periode ini.</p>
            ) : (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100">
                    <th className="px-3 py-2">Nama Staff</th>
                    <th className="px-3 py-2 text-center">Jumlah TRX</th>
                    <th className="px-3 py-2 text-right">Kontribusi Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {staffLeaderboard.map((staff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-800">{staff.name}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{staff.count} penjualan</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-800">Rp {staff.omzet.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 4. CSV DOWNLOAD EXPORT PANEL */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4" id="rekap_export_panel">
        <div>
          <h5 className="font-bold text-slate-800 text-xs">Unduh Ekspor Laporan Pajak & Pembukuan</h5>
          <p className="text-[10px] text-slate-500 mt-0.5">Seluruh data penjualan tokomu siap diunduh dalam format standard CSV (bisa langsung dibuka di Microsoft Excel atau Google Sheets).</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
          <button
            id="export_summary_csv"
            onClick={downloadSalesCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-950 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download size={14} />
            CSV Ringkasan Transaksi
          </button>
          <button
            id="export_detail_csv"
            onClick={downloadItemsCSV}
            className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download size={14} />
            CSV Detail Item Terjual
          </button>
        </div>
      </div>
    </div>
  );
}
