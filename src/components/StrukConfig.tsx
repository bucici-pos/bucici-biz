/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, Smartphone, MapPin, AlignCenter, Smile, Check } from 'lucide-react';

interface StrukConfigProps {
  tenantId: string;
  initialTemplate: {
    header_msg: string;
    footer_msg: string;
    phone?: string;
    address?: string;
  };
  onRefresh: () => void;
}

export default function StrukConfig({ tenantId, initialTemplate, onRefresh }: StrukConfigProps) {
  const [header, setHeader] = useState(initialTemplate?.header_msg || 'Bucici Food');
  const [footer, setFooter] = useState(initialTemplate?.footer_msg || 'Terima kasih atas kunjungan Anda');
  const [phone, setPhone] = useState(initialTemplate?.phone || '');
  const [address, setAddress] = useState(initialTemplate?.address || '');
  
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if initial values change
  useEffect(() => {
    if (initialTemplate) {
      setHeader(initialTemplate.header_msg || '');
      setFooter(initialTemplate.footer_msg || '');
      setPhone(initialTemplate.phone || '');
      setAddress(initialTemplate.address || '');
    }
  }, [initialTemplate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenants/receipt-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          header_msg: header.trim(),
          footer_msg: footer.trim(),
          phone: phone.trim(),
          address: address.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        onRefresh();
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(data.error || "Gagal menyimpan konfigurasi struk");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi internet");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="struk_config_tab">
      
      {/* LEFT: SETTINGS FORM */}
      <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <Settings className="text-emerald-600 shrink-0" size={18} />
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Desain Kustom Cetak Struk</h4>
            <p className="text-[10px] text-slate-500">Sesuaikan header, footer, dan kontak tokomu yang dicetak di struk kasir.</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-bold flex items-center gap-2">
            <Check size={14} />
            Berhasil menyimpan perubahan template struk thermal!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Header Struk (Nama Toko / Slogan)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <AlignCenter size={14} />
              </span>
              <input
                id="struk_input_header"
                type="text"
                placeholder="Mis. Kopi Susu Bucici Cab. Jakarta"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:bg-white"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                maxLength={45}
                required
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Maksimum 45 Karakter. Ditampilkan paling atas dengan cetak tebal.</p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Alamat Lengkap Toko
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 pt-2.5 flex items-start text-slate-400">
                <MapPin size={14} />
              </span>
              <textarea
                id="struk_input_address"
                placeholder="Mis. Jl. Anggrek Raya No. 4, Kebayoran Baru, Jakarta Selatan"
                rows={2}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white font-medium resize-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              No. Telepon / WhatsApp Toko
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Smartphone size={14} />
              </span>
              <input
                id="struk_input_phone"
                type="text"
                placeholder="Mis. 0812-3456-7890"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:bg-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Footer Struk (Pesan Penutup)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Smile size={14} />
              </span>
              <input
                id="struk_input_footer"
                type="text"
                placeholder="Mis. Jangan lupa tag kami di IG @bucicibiz!"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:bg-white"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Sapaan hangat penutup struk belanjaan untuk pelanggan setiamu.</p>
          </div>

          <button
            id="save_struk_config_btn"
            type="submit"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Save size={14} />
            Simpan Template Struk
          </button>
        </form>
      </div>

      {/* RIGHT: INTERACTIVE THERMAL PAPER SIMULATOR */}
      <div className="lg:col-span-5 bg-slate-100 border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[400px]">
        <span className="text-[10px] font-bold text-slate-400 block uppercase mb-4 tracking-wider">
          Simulasi Kertas Struk 58mm
        </span>

        {/* Paper visual */}
        <div className="bg-white w-64 shadow-lg border border-slate-300 p-4 font-mono text-[10px] text-slate-800 leading-tight relative">
          
          {/* Top paper tear jagged divider */}
          <div className="absolute -top-1.5 inset-x-0 h-2 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-200 to-transparent pointer-events-none" />

          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h5 className="font-extrabold text-xs text-slate-950 uppercase">{header || 'NAMA TOKO'}</h5>
            {address && <p className="text-[9px] text-slate-500 leading-relaxed">{address}</p>}
            {phone && <p className="text-[9px] text-slate-500">Telp: {phone}</p>}
          </div>

          <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-slate-500 text-[8px]">
            <div className="flex justify-between">
              <span>TRX ID:</span>
              <span className="font-bold text-slate-800">BUCICI-DEMO-2026</span>
            </div>
            <div className="flex justify-between">
              <span>TANGGAL:</span>
              <span>15/07/2026, 19:30</span>
            </div>
            <div className="flex justify-between">
              <span>KASIR:</span>
              <span>Bucici Store Cashier</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-2 border-b border-dashed border-slate-300 space-y-2">
            <div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>1x Kopi Susu Aren</span>
                <span>Rp 15.000</span>
              </div>
              <span className="text-[8px] text-slate-400">Porsi Jumbo, Less Sugar</span>
            </div>
            <div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>2x Croissant Coklat</span>
                <span>Rp 24.000</span>
              </div>
              <span className="text-[8px] text-slate-400">@ Rp 12.000</span>
            </div>
          </div>

          {/* Calculation */}
          <div className="py-2 space-y-1 text-slate-600 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>Rp 39.000</span>
            </div>
            <div className="flex justify-between text-slate-900 font-extrabold">
              <span>TOTAL BELANJA:</span>
              <span>Rp 39.000</span>
            </div>
            <div className="flex justify-between text-[8px]">
              <span>METODE:</span>
              <span className="font-bold text-slate-800">CASH / TUNAI</span>
            </div>
          </div>

          <div className="pt-3 text-center text-slate-400 text-[9px]">
            <p className="italic">"{footer || 'Terima kasih atas kunjungannya!'}"</p>
          </div>

          {/* Simulated Barcode lines */}
          <div className="pt-4 flex flex-col items-center justify-center opacity-40">
            <div className="h-4 w-40 bg-gradient-to-r from-slate-950 via-transparent to-slate-950 flex gap-[2px]">
              {Array.from({ length: 28 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-slate-950 h-full shrink-0" 
                  style={{ width: `${(i % 3 === 0 ? 3 : (i % 2 === 0 ? 1 : 2))}px` }} 
                />
              ))}
            </div>
            <span className="text-[7px] text-slate-400 mt-1 select-none tracking-widest font-sans font-medium">BUCICI-BIZ-PWA-ENGINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
