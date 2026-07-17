/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Package, Edit, ShoppingCart, RefreshCw, X, Save, HelpCircle, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../types';

interface RuangStokProps {
  tenantId: string;
  inventoryItems: InventoryItem[];
  onRefresh: () => void;
}

export default function RuangStok({ tenantId, inventoryItems, onRefresh }: RuangStokProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('gram');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [stock, setStock] = useState('');

  // Inline adjust states
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [newStockVal, setNewStockVal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || pricePerUnit === undefined) {
      alert("Nama bahan baku dan harga per unit wajib diisi!");
      return;
    }

    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: name.trim(),
          unit,
          price_per_unit: parseFloat(pricePerUnit),
          stock: parseFloat(stock) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setPricePerUnit('');
        setStock('');
        setShowAddModal(false);
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    try {
      const res = await fetch('/api/inventory/stock-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          item_id: adjustingItem.item_id,
          new_stock: parseFloat(newStockVal) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdjustingItem(null);
        setNewStockVal('');
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" id="ruang_stok">
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-sky-50 text-sky-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Ruang Stok (Gudang Bahan Baku)
          </span>
          <h3 className="text-lg font-bold text-slate-800 mt-1.5">Gudang Bahan Baku & Stok Curah</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Pantau ketersediaan bahan dasar porsi jualan (kopi bubuk, susu, sirup, beras, terigu, mika kemasan, dll). Stok otomatis berkurang tiap terjadi transaksi POS.
          </p>
        </div>

        <button
          id="stok_add_item_btn"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          Bahan Baku Baru
        </button>
      </div>

      {/* CORE STOCK INVENTORY TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm" id="stok_inventory_list">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Daftar Bahan Baku Curah</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Pantau harga, takaran sisa, dan total aset gudang.</p>
          </div>
          <button 
            id="stok_refresh_btn"
            onClick={onRefresh} 
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {inventoryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 p-6 text-center">
              <Package size={36} className="mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-500">Belum Ada Stok Bahan Baku</p>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs">Tambahkan bahan dasar jualanmu agar sistem dapat menghitung HPP (Harga Pokok Penjualan) secara akurat!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <th className="px-5 py-3">Bahan Baku</th>
                  <th className="px-5 py-3 text-center">Satuan Takaran</th>
                  <th className="px-5 py-3 text-right">Harga Satuan (Rp)</th>
                  <th className="px-5 py-3 text-center">Sisa Stok</th>
                  <th className="px-5 py-3 text-right">Estimasi Nilai Stok</th>
                  <th className="px-5 py-3 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {inventoryItems.map((item) => {
                  const itemTotalValue = item.stock * item.price_per_unit;
                  const isLow = item.stock <= 500 && (item.unit === 'gram' || item.unit === 'ml') || (item.unit === 'pcs' && item.stock <= 10);
                  
                  return (
                    <tr key={item.item_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800 block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {item.item_id}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 font-mono">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-700">
                        Rp {item.price_per_unit.toLocaleString('id-ID')} / {item.unit}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2.5 py-0.5 rounded font-bold text-xs ${
                            isLow ? 'bg-amber-100 text-amber-700 font-black' : 'bg-slate-50 text-slate-800'
                          }`}>
                            {item.stock.toLocaleString('id-ID')} {item.unit}
                          </span>
                          {isLow && (
                            <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5">
                              <AlertTriangle size={8} /> Stok Menipis
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                        Rp {itemTotalValue.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          id={`stok_adjust_btn_${item.item_id}`}
                          onClick={() => {
                            setAdjustingItem(item);
                            setNewStockVal(item.stock.toString());
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-50 border border-sky-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Ubah Sisa Stok
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: ADD RAW MATERIAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">Bahan Baku Baru</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Bahan Baku *</label>
                <input
                  id="modal_stok_name"
                  type="text"
                  placeholder="Mis. Susu UHT Diamond, Gula Cair, Cup Plastik"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Satuan Takaran *</label>
                  <select
                    id="modal_stok_unit"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none text-slate-700"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="gram">gram (gr)</option>
                    <option value="ml">mililiter (ml)</option>
                    <option value="pcs">buah (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Harga Per Satuan (Rp) *</label>
                  <input
                    id="modal_stok_price"
                    type="number"
                    placeholder="Mis. 20 (artinya Rp20 / ml)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Sisa Stok Awal Gudang</label>
                <input
                  id="modal_stok_qty"
                  type="number"
                  placeholder="Mis. 10000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="modal_stok_submit"
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Bahan Baku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="font-bold text-xs">Ubah Sisa Stok Gudang</h4>
              <button onClick={() => setAdjustingItem(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="p-4 space-y-3.5 text-xs text-slate-700">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Bahan Baku Terpilih</span>
                <span className="font-bold text-slate-800 block text-xs">{adjustingItem.name}</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                  Harga Satuan: Rp {adjustingItem.price_per_unit.toLocaleString('id-ID')} / {adjustingItem.unit}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Setel Nominal Sisa Stok Terbaru</label>
                <div className="relative">
                  <input
                    id="modal_adjust_qty_input"
                    type="number"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none pr-12 text-slate-800 text-sm"
                    value={newStockVal}
                    onChange={(e) => setNewStockVal(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 font-mono uppercase">
                    {adjustingItem.unit}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  id="modal_adjust_submit"
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Stok Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
