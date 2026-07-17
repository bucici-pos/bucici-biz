/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Calendar, FileText, CheckCircle, AlertCircle, Slash, 
  Printer, Share2, ArrowRight, X, User, DollarSign 
} from 'lucide-react';
import { Transaction, Product } from '../types';

interface RiwayatProps {
  tenantId: string;
  user: any;
  transactions: Transaction[];
  onRefresh: () => void;
  onPayReceivable: (trx: Transaction) => void; // Reloads transaction to POS cart
  receiptTemplate: any;
  initialStatusFilter?: 'All' | 'Lunas' | 'Belum Bayar' | 'Void';
}

export default function Riwayat({ 
  tenantId, 
  user, 
  transactions, 
  onRefresh, 
  onPayReceivable,
  receiptTemplate,
  initialStatusFilter = 'All'
}: RiwayatProps) {
  const [filterPeriod, setFilterPeriod] = useState<'Hari' | '7Hari' | 'Custom'>('Hari');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Lunas' | 'Belum Bayar' | 'Void'>(initialStatusFilter);

  // Sync state if initialStatusFilter changes
  React.useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Selected transaction for Receipt modal preview
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [selectedTrxItems, setSelectedTrxItems] = useState<any[]>([]);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // Voiding States
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // FILTER LOGIC
  const filteredList = transactions.filter(t => {
    // 1. Search Query
    const matchesSearch = t.trans_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Status Badge Filter
    let matchesStatus = true;
    if (statusFilter === 'Lunas') {
      matchesStatus = t.status === 'Success' && t.payment_mode !== 'Piutang';
    } else if (statusFilter === 'Belum Bayar') {
      matchesStatus = t.status === 'Success' && t.payment_mode === 'Piutang';
    } else if (statusFilter === 'Void') {
      matchesStatus = t.status === 'Void';
    }

    // 3. Date / Period Filter
    const tDate = new Date(t.timestamp);
    const today = new Date();
    
    let matchesPeriod = true;
    if (filterPeriod === 'Hari') {
      matchesPeriod = tDate.getDate() === today.getDate() &&
                      tDate.getMonth() === today.getMonth() &&
                      tDate.getFullYear() === today.getFullYear();
    } else if (filterPeriod === '7Hari') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      matchesPeriod = tDate >= sevenDaysAgo;
    } else if (filterPeriod === 'Custom' && startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999); // end of day
      matchesPeriod = tDate >= start && tDate <= end;
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  // Handle open transaction
  const handleOpenTransaction = async (t: Transaction) => {
    setSelectedTrx(t);
    try {
      const res = await fetch(`/api/transactions/items?tenant_id=${tenantId}&trans_id=${t.trans_id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTrxItems(data.data || []);
        setShowReceiptPreview(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Void Transaction Execution
  const handleVoidTransaction = async () => {
    if (!selectedTrx) return;
    if (!voidReason.trim()) {
      alert("Alasan Void wajib diisi!");
      return;
    }

    try {
      const res = await fetch('/api/transactions/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          trans_id: selectedTrx.trans_id,
          void_reason: voidReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowVoidDialog(false);
        setVoidReason('');
        setShowReceiptPreview(false);
        setSelectedTrx(null);
        onRefresh();
      } else {
        alert(data.error || "Gagal membatalkan transaksi");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reprinter Simulation
  const handleReprint = () => {
    if (!selectedTrx) return;
    
    const printContent = `
=== REPRINT: ${receiptTemplate.header_msg || 'BUCICI BIZ'} ===
${receiptTemplate.address || ''}
Telp: ${receiptTemplate.phone || '-'}
================================
Tanggal: ${new Date(selectedTrx.timestamp).toLocaleString('id-ID')}
ID: ${selectedTrx.trans_id}
Status: ${selectedTrx.status === 'Void' ? 'VOIDED / BATAL' : (selectedTrx.payment_mode === 'Piutang' ? 'BELUM BAYAR' : 'LUNAS')}
Kasir: ${selectedTrx.emp_name}
Pelanggan: ${selectedTrx.customer_name || 'Umum'}
--------------------------------
${selectedTrxItems.map(item => `
${item.prod_name}
${item.qty} x ${item.price.toLocaleString('id-ID')} = ${item.subtotal.toLocaleString('id-ID')}
`).join('')}
--------------------------------
TOTAL: Rp ${selectedTrx.total.toLocaleString('id-ID')}
Mode: ${selectedTrx.payment_mode}
================================
    `;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Reprint Struk</title><style>body { font-family: monospace; font-size: 12px; line-height: 1.2; padding: 10px; width: 280px; }</style></head>
          <body><pre>${printContent}</pre><script>window.print();</script></body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    if (!selectedTrx) return;
    let text = `*=== ${receiptTemplate.header_msg || 'BUCICI BIZ'} ===*\n`;
    text += `(REPRINT STRUK)\n`;
    text += `Tanggal: ${new Date(selectedTrx.timestamp).toLocaleString('id-ID')}\n`;
    text += `No TRX: ${selectedTrx.trans_id}\n`;
    text += `Status: ${selectedTrx.status === 'Void' ? 'VOID (BATAL)' : (selectedTrx.payment_mode === 'Piutang' ? 'BELUM BAYAR (PIUTANG)' : 'LUNAS')}\n`;
    text += `Pelanggan: ${selectedTrx.customer_name || 'Umum'}\n`;
    text += `-------------------------------------------\n`;
    selectedTrxItems.forEach(item => {
      text += `*${item.prod_name}*\n  ${item.qty}x @ Rp ${item.price.toLocaleString('id-ID')} = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
    });
    text += `-------------------------------------------\n`;
    text += `*TOTAL: Rp ${selectedTrx.total.toLocaleString('id-ID')}*\n`;
    text += `Metode: ${selectedTrx.payment_mode}\n`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6" id="riwayat_tab">
      {/* 1. FILTER CONTROLS */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4" id="riwayat_filters">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Periodic Suggestion Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
            <button
              id="period_today_btn"
              type="button"
              onClick={() => setFilterPeriod('Hari')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterPeriod === 'Hari' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={13} />
              Hari Ini
            </button>
            <button
              id="period_7days_btn"
              type="button"
              onClick={() => setFilterPeriod('7Hari')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterPeriod === '7Hari' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={13} />
              7 Hari Terakhir
            </button>
            <button
              id="period_custom_btn"
              type="button"
              onClick={() => setFilterPeriod('Custom')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterPeriod === 'Custom' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={13} />
              Pilih Tanggal
            </button>
          </div>

          {/* Status Select Dropdown */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Filter Status:</label>
            <div className="relative w-full md:w-44">
              <select
                id="status_filter_select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-2 pr-8 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer transition-colors"
              >
                <option value="All">Semua Transaksi</option>
                <option value="Lunas">Lunas (Paid)</option>
                <option value="Belum Bayar">Piutang (Unpaid)</option>
                <option value="Void">Void (Dibatalkan)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Custom date range fields */}
        {filterPeriod === 'Custom' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Dari Tanggal</label>
              <input
                id="filter_start_date"
                type="date"
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Sampai Tanggal</label>
              <input
                id="filter_end_date"
                type="date"
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            id="riwayat_search_input"
            type="text"
            placeholder="Cari nomor transaksi / nama pelanggan..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 2. HISTORY LIST TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <FileText size={36} className="mb-1.5 stroke-1" />
              <p className="text-xs">Tidak ada riwayat transaksi</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <th className="px-5 py-3">No TRX</th>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Pelanggan / Meja</th>
                  <th className="px-5 py-3 text-right">Total Nominal</th>
                  <th className="px-5 py-3 text-center">Metode</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.slice().reverse().map((t) => {
                  
                  // Status Badge Logic
                  let badgeColor = '';
                  let badgeText = '';
                  if (t.status === 'Void') {
                    badgeColor = 'bg-rose-50 border-rose-100 text-rose-700';
                    badgeText = 'Void';
                  } else if (t.payment_mode === 'Piutang') {
                    badgeColor = 'bg-amber-100 border-amber-200 text-amber-900';
                    badgeText = 'Belum Bayar';
                  } else {
                    badgeColor = 'bg-emerald-50 border-emerald-100 text-emerald-700';
                    badgeText = 'Lunas';
                  }

                  return (
                    <tr 
                      key={t.trans_id} 
                      id={`riwayat_row_${t.trans_id}`}
                      onClick={() => handleOpenTransaction(t)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer font-medium"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">{t.trans_id}</td>
                      <td className="px-5 py-3.5 text-slate-400">{new Date(t.timestamp).toLocaleString('id-ID')}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-bold">{t.customer_name || 'Pelanggan Umum'}</span>
                          {t.notes && <span className="text-[10px] text-slate-400">Catatan: {t.notes}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800 text-sm">
                        Rp {t.total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold font-mono text-[10px] text-slate-500">{t.payment_mode.toUpperCase()}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ==========================================
          RECEIPT PREVIEW OVERLAY
          ========================================== */}
      {showReceiptPreview && selectedTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">Rincian Struk {selectedTrx.trans_id}</h4>
              <button onClick={() => setShowReceiptPreview(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Paper Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center relative">
              <div className="bg-white w-72 shadow-sm border border-slate-200/60 p-4 text-xs font-mono text-slate-800 leading-tight relative">
                
                {/* WATERMARK STAMP (Grayscale as requested) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06] rotate-12">
                  <span className="text-4xl font-extrabold border-8 border-slate-900 p-2 uppercase tracking-widest font-sans text-slate-900">
                    {selectedTrx.status === 'Void' ? 'VOIDED' : (selectedTrx.payment_mode === 'Piutang' ? 'UNPAID' : 'PAID')}
                  </span>
                </div>

                {/* Struk Content */}
                <div className="text-center space-y-1 mb-4">
                  <h3 className="font-bold text-sm text-slate-900">{receiptTemplate.header_msg || 'BUCICI BIZ'}</h3>
                  <p className="text-[10px] text-slate-500">{receiptTemplate.address || ''}</p>
                  <p className="text-[10px] text-slate-500">Telp: {receiptTemplate.phone || '-'}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2 mb-2 space-y-0.5 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>No TRX:</span>
                    <span className="font-bold">{selectedTrx.trans_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date(selectedTrx.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                  {selectedTrx.paid_timestamp && (
                    <div className="flex justify-between text-slate-500 text-[9px]">
                      <span>Pelunasan:</span>
                      <span>{new Date(selectedTrx.paid_timestamp).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{selectedTrx.emp_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span>{selectedTrx.customer_name || 'Umum'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 border-b border-dashed border-slate-300 pb-2 mb-2">
                  {selectedTrxItems.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{item.prod_name}</span>
                        <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.qty} x Rp {item.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation */}
                <div className="space-y-1 text-slate-600 mb-4 border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span>Diskon ({selectedTrx.discount_type === '%' ? `${selectedTrx.discount}%` : 'Rp'}):</span>
                    <span>{selectedTrx.discount > 0 ? `-Rp ${selectedTrx.discount.toLocaleString('id-ID')}` : 'Rp 0'}</span>
                  </div>
                  {selectedTrx.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Pajak ({selectedTrx.tax}%):</span>
                      <span>Rp {((selectedTrx.total - selectedTrx.tax) * (selectedTrx.tax / 100)).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-1">
                    <span>TOTAL:</span>
                    <span>Rp {selectedTrx.total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Metode:</span>
                    <span className="font-bold uppercase">{selectedTrx.payment_mode}</span>
                  </div>
                  {selectedTrx.due_date && (
                    <div className="flex justify-between text-[9px] text-amber-700">
                      <span>Jatuh Tempo:</span>
                      <span className="font-bold">{selectedTrx.due_date}</span>
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400">
                  <p>{receiptTemplate.footer_msg || 'Terima Kasih Atas Kunjungan Anda!'}</p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-2">
              {/* If Belum Bayar (Piutang) success, allow "Bayar Sekarang" action inside receipt! */}
              {selectedTrx.status === 'Success' && selectedTrx.payment_mode === 'Piutang' && (
                <button
                  id="riwayat_pay_unpaid_btn"
                  onClick={() => {
                    setShowReceiptPreview(false);
                    onPayReceivable(selectedTrx);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md"
                >
                  <DollarSign size={16} />
                  Bayar Sekarang (Pelunasan Kasir)
                </button>
              )}

              <div className="flex gap-2">
                <button
                  id="riwayat_reprint_btn"
                  onClick={handleReprint}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl font-bold text-xs"
                >
                  <Printer size={13} />
                  Reprint Struk
                </button>
                <button
                  id="riwayat_whatsapp_share_btn"
                  onClick={handleWhatsAppShare}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold text-xs"
                >
                  <Share2 size={13} />
                  WhatsApp
                </button>
              </div>

              {/* Void transaction action (Available if owner is logged in and transaction success) */}
              {user.role === 'Owner' && selectedTrx.status === 'Success' && (
                <button
                  id="riwayat_void_start_btn"
                  onClick={() => setShowVoidDialog(true)}
                  className="w-full py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
                >
                  Void Transaksi (Batalkan)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VOID CONFIRMATION DIALOG MODAL */}
      {showVoidDialog && selectedTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="void_reason_modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-5 border border-rose-100">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-rose-700 mb-2">
              <Slash size={16} />
              Konfirmasi Void Transaksi {selectedTrx.trans_id}
            </h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Membatalkan transaksi akan mengembalikan seluruh stok produk dan resep bahan baku ke keadaan semula. Catatan laci kas tunai juga akan didebet keluar otomatis.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Alasan Pembatalan / Void (Wajib)</label>
                <input
                  id="void_reason_input"
                  type="text"
                  placeholder="Mis. Pembatalan pelanggan / kesalahan input kasir"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoidDialog(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  id="void_confirm_submit"
                  type="button"
                  onClick={handleVoidTransaction}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Void Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
