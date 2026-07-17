/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { KasHistory } from '../types';

interface KasHistoryTabProps {
  tenantId: string;
  kasHistory: KasHistory[];
  onRefresh: () => void;
}

export default function KasHistoryTab({ tenantId, kasHistory, onRefresh }: KasHistoryTabProps) {
  const [activeFormTab, setActiveFormTab] = useState<'Isi' | 'In' | 'Out' | null>(null);
  
  // Form values
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [resetSaldo, setResetSaldo] = useState(false);

  // Calculate current cash balance
  const cashInTotal = kasHistory
    .filter(k => k.type === 'In' || k.type === 'Modal')
    .reduce((acc, k) => acc + k.amount, 0);
  const cashOutTotal = kasHistory
    .filter(k => k.type === 'Out')
    .reduce((acc, k) => acc + k.amount, 0);
  const currentBalance = Math.max(0, cashInTotal - cashOutTotal);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtVal = parseFloat(amount);
    if (isNaN(amtVal) || amtVal <= 0) {
      alert("Mohon masukkan nominal uang yang valid!");
      return;
    }

    let type: 'Modal' | 'In' | 'Out' = 'In';
    let finalDesc = description.trim();

    if (activeFormTab === 'Isi') {
      type = 'Modal';
      if (!finalDesc) finalDesc = "Mengisi Laci Kas (Uang Kembalian)";
    } else if (activeFormTab === 'In') {
      type = 'In';
      if (!finalDesc) {
        alert("Catatan wajib diisi untuk Uang Masuk!");
        return;
      }
    } else if (activeFormTab === 'Out') {
      type = 'Out';
      if (!finalDesc) {
        alert("Catatan wajib diisi untuk Uang Keluar!");
        return;
      }
    }

    try {
      const res = await fetch('/api/kas/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          type,
          amount: amtVal,
          description: finalDesc,
          reset_saldo: resetSaldo
        })
      });
      const data = await res.json();
      if (data.success) {
        // Reset Form
        setAmount('');
        setDescription('');
        setResetSaldo(false);
        setActiveFormTab(null);
        // Refresh parents
        onRefresh();
      } else {
        alert(data.error || "Gagal mencatat kas");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi");
    }
  };

  return (
    <div className="space-y-6" id="kas_history_tab">
      {/* 1. CURRENT BALANCES ROW */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Wallet size={32} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Saldo Laci Kas Saat Ini</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">
              Rp {currentBalance.toLocaleString('id-ID')}
            </h2>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100/80 max-w-md">
          <span className="font-bold text-slate-700 block mb-1">Mengenai Saldo Laci Kas</span>
          Sistem menghitung total pemasukan tunai kasir, pengisian kas, uang masuk, dikurangi seluruh pengeluaran kas yang Anda catat di halaman ini.
        </div>
      </div>

      {/* 2. TRANSACTION TYPES BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="kas_action_cards">
        {/* Card 1: Isi Kas */}
        <div 
          id="tab_trigger_isi"
          onClick={() => {
            setActiveFormTab('Isi');
            setDescription('Modal awal kas kembalian');
            setAmount('');
          }}
          className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
            activeFormTab === 'Isi' 
              ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-50' 
              : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-200'
          }`}
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-2">
              <Plus size={16} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Isi Kas (Modal Receh)</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Menaruh uang pecahan kecil ke laci kas untuk kembalian pelanggan. Tidak terhitung omzet kotor.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 mt-3 flex items-center gap-1 self-start">
            Buka Form <ArrowUpRight size={12} />
          </span>
        </div>

        {/* Card 2: Uang Masuk */}
        <div 
          id="tab_trigger_in"
          onClick={() => {
            setActiveFormTab('In');
            setDescription('');
            setAmount('');
          }}
          className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
            activeFormTab === 'In' 
              ? 'bg-sky-50/50 border-sky-400 ring-2 ring-sky-50' 
              : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-200'
          }`}
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold mb-2">
              <ArrowDownRight size={16} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Uang Masuk Lain</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Ada uang masuk di luar transaksi penjualan kasir (mis. titipan pemilik). Tidak dihitung omzet kotor.
            </p>
          </div>
          <span className="text-xs font-bold text-sky-600 mt-3 flex items-center gap-1 self-start">
            Buka Form <ArrowUpRight size={12} />
          </span>
        </div>

        {/* Card 3: Uang Keluar */}
        <div 
          id="tab_trigger_out"
          onClick={() => {
            setActiveFormTab('Out');
            setDescription('');
            setAmount('');
          }}
          className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
            activeFormTab === 'Out' 
              ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-50' 
              : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-200'
          }`}
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-2">
              <ArrowUpRight size={16} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Uang Keluar (Pengeluaran)</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Mengambil uang laci untuk operasional (beli es batu, bayar kurir, dll). Tidak mengurangi omzet kotor.
            </p>
          </div>
          <span className="text-xs font-bold text-rose-600 mt-3 flex items-center gap-1 self-start">
            Buka Form <ArrowUpRight size={12} />
          </span>
        </div>
      </div>

      {/* 3. DYNAMIC FORM AREA */}
      {activeFormTab && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4" id="kas_form">
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <h4 className="font-bold text-slate-800 text-sm">
              Formulir: {activeFormTab === 'Isi' ? 'Isi Kas Receh' : activeFormTab === 'In' ? 'Pencatatan Uang Masuk' : 'Pencatatan Uang Keluar'}
            </h4>
            <button 
              id="close_kas_form_btn"
              type="button" 
              onClick={() => setActiveFormTab(null)} 
              className="text-xs text-slate-400 hover:text-slate-500 hover:underline"
            >
              Tutup Formulir
            </button>
          </div>

          {/* Guidelines notes per form */}
          {activeFormTab === 'Isi' && (
            <div className="flex items-start gap-2 text-xs text-slate-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
              <AlertCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <p>
                <strong>Informasi:</strong> Digunakan untuk mengisi uang receh modal kembalian di laci kas. Pengisian ini <strong>tidak mempengaruhi</strong> pencatatan Omzet Kotor penjualanmu.
              </p>
            </div>
          )}

          {activeFormTab === 'In' && (
            <div className="flex items-start gap-2 text-xs text-slate-600 bg-sky-50/50 p-3 rounded-lg border border-sky-100/50">
              <AlertCircle size={14} className="text-sky-600 mt-0.5 shrink-0" />
              <p>
                <strong>Informasi:</strong> Digunakan jika ada uang tunai masuk ke laci kas di luar hasil transaksi kasir POS. Formulir ini <strong>tidak menambah</strong> nominal Omzet di Dashboard.
              </p>
            </div>
          )}

          {activeFormTab === 'Out' && (
            <div className="flex items-start gap-2 text-xs text-slate-600 bg-rose-50/50 p-3 rounded-lg border border-rose-100/50">
              <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
              <p>
                <strong>Informasi:</strong> Digunakan untuk mencatat pengeluaran harian tokomu menggunakan uang tunai laci. Pencatatan ini <strong>tidak mengurangi</strong> nominal Omzet Kotor di Dashboard.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Nominal (Rp)</label>
              <input
                id="kas_input_amount"
                type="number"
                placeholder="Mis. 50000"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Catatan / Deskripsi (Wajib diisi)</label>
              <input
                id="kas_input_description"
                type="text"
                placeholder={
                  activeFormTab === 'Isi' 
                    ? "Mis. Modal kembalian pagi hari" 
                    : activeFormTab === 'In' 
                      ? "Mis. Tambahan dana pemilik" 
                      : "Mis. Bayar uang iuran sampah / beli sabun cuci"
                }
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required={activeFormTab !== 'Isi'}
              />
            </div>
          </div>

          {/* Checkbox Reset Saldo (only for Isi Kas) */}
          {activeFormTab === 'Isi' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1.5">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  id="kas_checkbox_reset"
                  type="checkbox"
                  checked={resetSaldo}
                  onChange={(e) => setResetSaldo(e.target.checked)}
                  className="rounded text-emerald-600 mt-0.5"
                />
                <span>Reset Saldo Kas (Uang Kas Lama Sudah Diambil)</span>
              </label>
              <p className="text-[10px] text-slate-500 pl-6 leading-relaxed">
                Centang ini jika Anda ingin mengosongkan seluruh uang di laci kas lama dan memulai hari murni dengan nominal pengisian baru ini. Jangan centang jika hanya ingin menambahkan modal receh ke sisa laci kas yang masih ada saat ini (Rp {currentBalance.toLocaleString('id-ID')}).
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              id="kas_cancel_btn"
              type="button"
              onClick={() => setActiveFormTab(null)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              id="kas_save_btn"
              type="submit"
              className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 shadow-sm"
            >
              Simpan Catatan Kas
            </button>
          </div>
        </form>
      )}

      {/* 4. RUNNING HISTORY LIST */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm" id="kas_history_list">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Riwayat Mutasi & Laci Kas</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Seluruh arus masuk dan keluar uang laci kas terekam di sini.</p>
          </div>
          <button 
            id="refresh_kas_btn"
            onClick={onRefresh} 
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {kasHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <FileText size={36} className="mb-1.5 stroke-1" />
              <p className="text-xs">Belum ada riwayat mutasi kas</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[9px] tracking-wider">
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Kategori Mutasi</th>
                  <th className="px-5 py-3">Jumlah Uang</th>
                  <th className="px-5 py-3">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {kasHistory.slice().reverse().map((log, idx) => {
                  let badgeColor = '';
                  let badgeText = '';
                  if (log.type === 'Modal') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    badgeText = 'Isi Kas Receh';
                  } else if (log.type === 'In') {
                    badgeColor = 'bg-sky-50 text-sky-700 border-sky-100';
                    badgeText = 'Uang Masuk';
                  } else if (log.type === 'Out') {
                    badgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                    badgeText = 'Uang Keluar';
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-400">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 whitespace-nowrap font-bold text-sm ${log.type === 'Out' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {log.type === 'Out' ? '-' : '+'}Rp {log.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {log.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
