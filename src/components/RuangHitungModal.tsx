/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Edit2, Plus, Trash2, Check, RefreshCw, X, HelpCircle, Calculator, Percent } from 'lucide-react';
import { Product, InventoryItem } from '../types';

interface RuangHitungModalProps {
  tenantId: string;
  products: Product[];
  inventoryItems: InventoryItem[];
  onRefresh: () => void;
}

interface RecipeItemRow {
  item_id: string;
  qty_usage: number;
}

export default function RuangHitungModal({ tenantId, products, inventoryItems, onRefresh }: RuangHitungModalProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeRows, setRecipeRows] = useState<RecipeItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipesMap, setRecipesMap] = useState<Record<string, any[]>>({});

  // Load all recipes on mount
  const fetchAllRecipes = async () => {
    try {
      const res = await fetch(`/api/recipes?tenant_id=${tenantId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Group by prod_id
        const grouped: Record<string, any[]> = {};
        for (const r of data.data) {
          if (!grouped[r.prod_id]) grouped[r.prod_id] = [];
          grouped[r.prod_id].push(r);
        }
        setRecipesMap(grouped);
      }
    } catch (err) {
      console.error("Gagal memuat resep", err);
    }
  };

  useEffect(() => {
    fetchAllRecipes();
  }, [products, tenantId]);

  // Open recipe editor
  const handleOpenRecipe = (p: Product) => {
    setEditingProduct(p);
    const existing = recipesMap[p.prod_id] || [];
    if (existing.length > 0) {
      setRecipeRows(existing.map(r => ({ item_id: r.item_id, qty_usage: r.qty_usage })));
    } else {
      setRecipeRows([]);
    }
  };

  const handleAddRow = () => {
    if (inventoryItems.length === 0) {
      alert("Silakan tambah bahan baku terlebih dahulu di Ruang Stok!");
      return;
    }
    // Find first raw material not yet in recipe or just the first raw material
    const defaultItem = inventoryItems[0].item_id;
    setRecipeRows([...recipeRows, { item_id: defaultItem, qty_usage: 1 }]);
  };

  const handleRemoveRow = (idx: number) => {
    setRecipeRows(recipeRows.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof RecipeItemRow, val: any) => {
    const updated = [...recipeRows];
    if (field === 'qty_usage') {
      updated[idx].qty_usage = parseFloat(val) || 0;
    } else {
      updated[idx].item_id = val;
    }
    setRecipeRows(updated);
  };

  // Calculate HPP Live for editing product
  const calculateCurrentHpp = () => {
    let sum = 0;
    for (const row of recipeRows) {
      const matched = inventoryItems.find(i => i.item_id === row.item_id);
      if (matched) {
        sum += row.qty_usage * matched.price_per_unit;
      }
    }
    return sum;
  };

  const handleSaveRecipe = async () => {
    if (!editingProduct) return;
    setLoading(true);

    try {
      const hppSum = calculateCurrentHpp();

      // 1. Save recipe mapping
      const resRecipe = await fetch('/api/recipes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          prod_id: editingProduct.prod_id,
          items: recipeRows
        })
      });

      // 2. Edit product's cost_price to match the calculated HPP so standard analytics works seamlessly
      const resProd = await fetch('/api/products/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          prod_id: editingProduct.prod_id,
          name: editingProduct.name,
          category: editingProduct.category,
          price: editingProduct.price,
          stock: editingProduct.stock,
          cost_price: hppSum > 0 ? hppSum : undefined,
          sku: editingProduct.sku,
          img_url: editingProduct.img_url
        })
      });

      const d1 = await resRecipe.json();
      const d2 = await resProd.json();

      if (d1.success && d2.success) {
        setEditingProduct(null);
        setRecipeRows([]);
        await fetchAllRecipes();
        onRefresh();
      } else {
        alert("Gagal memperbarui resep. Coba kembali.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Static helper to calculate HPP for displayed product cards
  const getProductHpp = (prod: Product) => {
    const list = recipesMap[prod.prod_id] || [];
    if (list.length > 0) {
      let sum = 0;
      for (const r of list) {
        const mat = inventoryItems.find(i => i.item_id === r.item_id);
        if (mat) {
          sum += r.qty_usage * mat.price_per_unit;
        }
      }
      return sum;
    }
    return prod.cost_price || 0;
  };

  return (
    <div className="space-y-6" id="ruang_hitung_modal">
      
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-blue-50 text-blue-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Ruang Hitung Modal (HPP Calculator)
          </span>
          <h3 className="text-lg font-bold text-slate-800 mt-1.5 font-sans">Kalkulator HPP & Margin Profit</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Rakit resep produk jualanmu dari persediaan bahan baku. Sistem akan menghitung modal pokok (HPP) secara otomatis untuk mengawasi persentase keuntungan warung.
          </p>
        </div>
      </div>

      {/* PRODUCTS HPP GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="hpp_products_grid">
        {products.filter(p => !p.name.startsWith("Placeholder Category - ")).map((prod) => {
          const hpp = getProductHpp(prod);
          const profit = prod.price - hpp;
          const profitMarginPct = prod.price > 0 ? (profit / prod.price) * 100 : 0;
          const hasRecipe = (recipesMap[prod.prod_id] || []).length > 0;

          return (
            <div 
              key={prod.prod_id} 
              id={`hpp_product_card_${prod.prod_id}`}
              className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Product category tag */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {prod.category}
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800 mt-1.5 leading-tight">{prod.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku || '-'}</span>
                </div>
                
                {hasRecipe ? (
                  <span className="bg-blue-50 text-blue-800 text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-blue-100">
                    Resep Aktif
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-lg border border-amber-100 animate-pulse">
                    Modal Manual
                  </span>
                )}
              </div>

              {/* HPP stats segment */}
              <div className="bg-slate-50 rounded-xl p-3 my-4 space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Harga Jual POS</span>
                  <span className="font-bold text-slate-900">Rp {prod.price.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between font-medium border-t border-slate-100/60 pt-1.5">
                  <span className="text-slate-500">Modal Pokok (HPP)</span>
                  <span className={`font-bold ${hpp > 0 ? 'text-slate-900' : 'text-amber-600 font-black'}`}>
                    Rp {hpp.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between font-bold border-t border-slate-100/60 pt-1.5 text-blue-700">
                  <span>Margin Profit</span>
                  <span>Rp {profit.toLocaleString('id-ID')} ({Math.round(profitMarginPct)}%)</span>
                </div>
              </div>

              {/* Profit level visual track */}
              <div className="mb-4">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      profitMarginPct >= 50 ? 'bg-blue-600' : (profitMarginPct >= 30 ? 'bg-sky-600' : 'bg-amber-500')
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, profitMarginPct))}%` }}
                  />
                </div>
              </div>

              {/* Set resep trigger */}
              <button
                id={`hpp_set_recipe_btn_${prod.prod_id}`}
                onClick={() => handleOpenRecipe(prod)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Calculator size={12} />
                Atur Resep & Modal Pokok
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL: RECIPE BUILDER DRAWER */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end p-0">
          <div className="bg-white h-full max-w-md w-full shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 block uppercase tracking-wider">Formula Resep Bahan</span>
                <h4 className="font-extrabold text-sm">{editingProduct.name}</h4>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Recipe Content Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4" id="recipe_editor_body">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Harga Jual Kasir</span>
                  <span className="font-extrabold text-slate-800 block">Rp {editingProduct.price.toLocaleString('id-ID')}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Total HPP Terkalkulasi</span>
                  <span className="font-extrabold text-blue-700 block">Rp {calculateCurrentHpp().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bahan Baku Yang Digunakan</span>
                <button
                  id="recipe_add_ingredient_row_btn"
                  onClick={handleAddRow}
                  className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} />
                  Tambah Bahan
                </button>
              </div>

              {/* Rows List */}
              <div className="space-y-3">
                {recipeRows.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 flex flex-col items-center justify-center">
                    <Calculator size={30} className="stroke-1 mb-1.5" />
                    <p className="text-[10px] font-bold">Belum Ada Bahan Dasar Terikat</p>
                    <p className="text-[9px] text-slate-400 max-w-[200px] mt-0.5">Klik tombol "+ Tambah Bahan" di atas untuk menghubungkan produk jualan ini dengan bahan baku.</p>
                  </div>
                ) : (
                  recipeRows.map((row, idx) => {
                    const selectedMaterial = inventoryItems.find(i => i.item_id === row.item_id);
                    const costAmount = selectedMaterial ? row.qty_usage * selectedMaterial.price_per_unit : 0;

                    return (
                      <div 
                        key={idx} 
                        id={`recipe_editor_row_${idx}`}
                        className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm space-y-2 relative"
                      >
                        <div className="flex items-center gap-2">
                          {/* Choose raw material drop-down */}
                          <div className="flex-1">
                            <select
                              id={`recipe_select_material_${idx}`}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                              value={row.item_id}
                              onChange={(e) => handleRowChange(idx, 'item_id', e.target.value)}
                            >
                              {inventoryItems.map(item => (
                                <option key={item.item_id} value={item.item_id}>
                                  {item.name} (Rp {item.price_per_unit}/{item.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            id={`recipe_row_delete_btn_${idx}`}
                            onClick={() => handleRemoveRow(idx)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Quantity usage input */}
                        <div className="flex items-center justify-between text-[11px] gap-2 pt-1.5 border-t border-slate-50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-bold">Takaran:</span>
                            <div className="flex items-center gap-1">
                              <input
                                id={`recipe_qty_input_${idx}`}
                                type="number"
                                className="w-16 p-1 bg-slate-50 border border-slate-200 rounded text-center font-bold"
                                value={row.qty_usage}
                                onChange={(e) => handleRowChange(idx, 'qty_usage', e.target.value)}
                              />
                              <span className="font-bold text-slate-500 font-mono uppercase">
                                {selectedMaterial?.unit || 'satuan'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right font-bold text-slate-700">
                            Subtotal: Rp {costAmount.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Total HPP Baru</span>
                <span className="font-extrabold text-sm text-slate-900">
                  Rp {calculateCurrentHpp().toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="recipe_save_btn_drawer"
                  onClick={handleSaveRecipe}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      Simpan Formula
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
