/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, Grid, List, Plus, Minus, Trash2, 
  Percent, FileText, Check, ArrowRight, Printer, Share2, X, LogOut,
  Tag, Banknote, Clock, Smartphone, Building
} from 'lucide-react';
import { Product, Transaction, Tenant } from '../types';

interface POSProps {
  tenantId: string;
  user: any;
  onRefreshDashboard: () => void;
  products: Product[];
  onSetView: (view: string, filter?: string) => void;
  receiptTemplate: any;
  onPayUnpaidTransaction?: Transaction | null; // For paying from history
  onClearPayUnpaid?: () => void;
  onLogout?: () => void;
}

export default function POS({ 
  tenantId, 
  user, 
  onRefreshDashboard, 
  products, 
  onSetView, 
  receiptTemplate,
  onPayUnpaidTransaction,
  onClearPayUnpaid,
  onLogout
}: POSProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  
  // Cart State
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment States
  const [discountType, setDiscountType] = useState<'Rp' | '%'>('Rp');
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [hasTax, setHasTax] = useState(false);
  const [taxPercent, setTaxPercent] = useState<number>(10);
  
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'QRIS' | 'Transfer' | 'Piutang'>('Cash');
  const [dueDate, setDueDate] = useState('');
  const [receivableNotes, setReceivableNotes] = useState('');
  
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [checkoutResult, setCheckoutResult] = useState<{ transaction: Transaction; items: any[] } | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);

  // If loading a transaction to pay from History
  useEffect(() => {
    if (onPayUnpaidTransaction) {
      setCustomerName(onPayUnpaidTransaction.customer_name || '');
      setNotes(onPayUnpaidTransaction.notes || '');
      setPaymentMode('Cash');
      
      // Load products back to cart
      fetch(`/api/transactions/items?tenant_id=${tenantId}&trans_id=${onPayUnpaidTransaction.trans_id}`)
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const items = res.data.map((item: any) => {
              const matchedProd = products.find(p => p.prod_id === item.prod_id) || {
                tenant_id: tenantId,
                prod_id: item.prod_id,
                name: item.prod_name,
                category: 'Umum',
                price: item.price,
                stock: 99,
                is_modal_set: false
              };
              return {
                product: matchedProd,
                qty: item.qty
              };
            });
            setCart(items);
            // Pre-calculate discount and tax
            setDiscountType(onPayUnpaidTransaction.discount_type);
            setDiscountVal(onPayUnpaidTransaction.discount);
            setHasTax(onPayUnpaidTransaction.tax > 0);
            setTaxPercent(onPayUnpaidTransaction.tax || 10);
          }
        });
    }
  }, [onPayUnpaidTransaction, products, tenantId]);

  // Categories list
  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filtered Products
  const filteredProducts = products.filter(p => {
    // Filter out placeholder products used to store categories
    if (p.name.startsWith("Placeholder Category - ")) return false;

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.prod_id === product.prod_id);
    if (existing) {
      setCart(cart.map(item => 
        item.product.prod_id === product.prod_id 
          ? { ...item, qty: item.qty + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateQty = (prodId: string, value: number) => {
    if (value <= 0) {
      setCart(cart.filter(item => item.product.prod_id !== prodId));
    } else {
      setCart(cart.map(item => 
        item.product.prod_id === prodId ? { ...item, qty: value } : item
      ));
    }
  };

  const removeFromCart = (prodId: string) => {
    setCart(cart.filter(item => item.product.prod_id !== prodId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  
  let discountAmt = 0;
  if (discountVal > 0) {
    if (discountType === '%') {
      discountAmt = subtotal * (discountVal / 100);
    } else {
      discountAmt = discountVal;
    }
  }

  const taxedBase = Math.max(0, subtotal - discountAmt);
  const taxAmt = hasTax ? taxedBase * (taxPercent / 100) : 0;
  const total = Math.round(taxedBase + taxAmt);
  const changeAmt = cashPaid > total ? cashPaid - total : 0;

  // Pecahan Uang Bayar Double Click Handler
  const handlePecahanClick = (amount: number) => {
    setCashPaid(prev => prev + amount);
  };

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMode === 'Cash' && cashPaid < total) {
      alert(`Uang bayar (Rp ${cashPaid.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${total.toLocaleString('id-ID')})!`);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      emp_id: user.role === 'Owner' ? 'owner' : user.id,
      emp_name: user.role === 'Owner' ? `${user.name} (Owner)` : user.name,
      items: cart.map(item => ({
        prod_id: item.product.prod_id,
        qty: item.qty,
        price: item.product.price
      })),
      tax: hasTax ? taxPercent : 0,
      discount: discountVal,
      discount_type: discountType,
      payment_mode: paymentMode,
      customer_name: customerName,
      notes: notes,
      due_date: paymentMode === 'Piutang' ? dueDate : undefined,
      receivable_notes: paymentMode === 'Piutang' ? receivableNotes : undefined,
    };

    // If it is paying an old transaction, void the old one first, or mark it paid
    if (onPayUnpaidTransaction) {
      // Mark old paid
      const payRes = await fetch('/api/transactions/pay-piutang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          trans_id: onPayUnpaidTransaction.trans_id,
          payment_mode: paymentMode
        })
      });
      const payData = await payRes.json();
      if (payData.success) {
        setCheckoutResult({
          transaction: payData.data,
          items: cart.map(item => ({
            prod_name: item.product.name,
            qty: item.qty,
            price: item.product.price,
            subtotal: item.qty * item.product.price
          }))
        });
        setShowReceipt(true);
        // Clear state
        setCart([]);
        setCustomerName('');
        setNotes('');
        setCashPaid(0);
        setDiscountVal(0);
        setHasTax(false);
        if (onClearPayUnpaid) onClearPayUnpaid();
        onRefreshDashboard();
      } else {
        alert(payData.error || 'Gagal melunasi piutang');
      }
      return;
    }

    try {
      const res = await fetch('/api/transactions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCheckoutResult(data.data);
        setShowReceipt(true);
        // Clear
        setCart([]);
        setCustomerName('');
        setNotes('');
        setCashPaid(0);
        setDiscountVal(0);
        setHasTax(false);
        onRefreshDashboard();
      } else {
        alert(data.error || "Gagal menyimpan transaksi");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan jaringan");
    }
  };

  // Thermal Printing Simulation
  const handlePrintBluetooth = () => {
    if (!checkoutResult) return;
    const { transaction } = checkoutResult;
    
    const printContent = `
=== ${receiptTemplate.header_msg || 'BUCICI BIZ'} ===
${receiptTemplate.address || ''}
Telp: ${receiptTemplate.phone || '-'}
================================
Tanggal: ${new Date(transaction.timestamp).toLocaleString('id-ID')}
ID: ${transaction.trans_id}
Kasir: ${transaction.emp_name}
Pelanggan: ${transaction.customer_name || 'Umum'}
--------------------------------
${checkoutResult.items.map(item => `
${item.prod_name || item.product_name}
${item.qty} x ${item.price.toLocaleString('id-ID')} = ${item.subtotal.toLocaleString('id-ID')}
`).join('')}
--------------------------------
Subtotal: Rp ${subtotal.toLocaleString('id-ID')}
Diskon: Rp ${discountAmt.toLocaleString('id-ID')}
Pajak: Rp ${taxAmt.toLocaleString('id-ID')}
TOTAL: Rp ${transaction.total.toLocaleString('id-ID')}
Mode: ${transaction.payment_mode}
================================
${receiptTemplate.footer_msg || 'Terima Kasih!'}
    `;

    // Opens a small print receipt window styled like thermal output
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Struk Bucici Biz</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                line-height: 1.2;
                padding: 10px;
                width: 280px;
                background: #fff;
                color: #000;
              }
              pre {
                white-space: pre-wrap;
                margin: 0;
              }
              .no-print {
                margin-bottom: 15px;
                background: #4F46E5;
                color: white;
                border: none;
                padding: 8px 12px;
                font-family: sans-serif;
                cursor: pointer;
                width: 100%;
                font-weight: bold;
                border-radius: 4px;
              }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <button class="no-print" onclick="window.print()">Hubungkan & Cetak (Thermal Print)</button>
            <pre>${printContent}</pre>
            <script>
              window.onload = function() {
                // Auto print dialog in realistic scenario
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // WhatsApp share generator
  const getWhatsAppShareUrl = () => {
    if (!checkoutResult) return '';
    const { transaction } = checkoutResult;
    
    let text = `*=== ${receiptTemplate.header_msg || 'BUCICI BIZ'} ===*\n`;
    text += `${receiptTemplate.address || ''}\n`;
    text += `Telp: ${receiptTemplate.phone || '-'}\n`;
    text += `-------------------------------------------\n`;
    text += `Tanggal: ${new Date(transaction.timestamp).toLocaleString('id-ID')}\n`;
    text += `No Transaksi: ${transaction.trans_id}\n`;
    text += `Kasir: ${transaction.emp_name}\n`;
    text += `Pelanggan: ${transaction.customer_name || 'Umum'}\n`;
    text += `-------------------------------------------\n`;
    
    checkoutResult.items.forEach(item => {
      text += `*${item.prod_name || item.product_name}*\n`;
      text += `  ${item.qty} x Rp ${item.price.toLocaleString('id-ID')} = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
    });
    
    text += `-------------------------------------------\n`;
    text += `Subtotal: Rp ${subtotal.toLocaleString('id-ID')}\n`;
    text += `Diskon: Rp ${discountAmt.toLocaleString('id-ID')}\n`;
    text += `Pajak: Rp ${taxAmt.toLocaleString('id-ID')}\n`;
    text += `*TOTAL: Rp ${transaction.total.toLocaleString('id-ID')}*\n`;
    text += `Metode Pembayaran: ${transaction.payment_mode}\n`;
    if (transaction.payment_mode === 'Piutang') {
      text += `Jatuh Tempo: ${transaction.due_date || '-'}\n`;
    }
    text += `-------------------------------------------\n`;
    text += `${receiptTemplate.footer_msg || 'Terima kasih sudah berbelanja!'}`;

    const encoded = encodeURIComponent(text);
    return `https://api.whatsapp.com/send?text=${encoded}`;
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row gap-4 bg-slate-50 min-h-0" id="pos_workspace">
      {/* LEFT PANEL: Products Browser */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 p-4 min-h-0">
        {/* Search & Layout Settings */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={18} />
            </span>
            <input
              id="pos_search"
              type="text"
              placeholder="Cari nama produk atau SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              id="layout_grid_btn"
              onClick={() => setLayoutMode('grid')}
              className={`p-2 rounded-xl border transition-all ${
                layoutMode === 'grid' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              id="layout_list_btn"
              onClick={() => setLayoutMode('list')}
              className={`p-2 rounded-xl border transition-all ${
                layoutMode === 'list' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 flex gap-2 overflow-x-auto mb-4 no-scrollbar shadow-inner" id="category_bar">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              id={`cat_btn_${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat 
                  ? 'bg-emerald-600 text-white shadow-md transform scale-[1.02]' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Tag size={13} className={selectedCategory === cat ? 'text-white' : 'text-slate-500'} />
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1" id="products_container">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <FileText size={40} className="mb-2 stroke-1" />
              <p className="text-sm">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className={
              layoutMode === 'grid' 
                ? 'grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3' 
                : 'space-y-2'
            }>
              {filteredProducts.map((p) => {
                const inCart = cart.find(item => item.product.prod_id === p.prod_id);
                const isLowStock = p.stock <= 5;

                if (layoutMode === 'grid') {
                  return (
                    <div
                      key={p.prod_id}
                      id={`product_card_${p.prod_id}`}
                      onClick={() => p.stock > 0 && addToCart(p)}
                      className={`relative flex flex-col justify-between bg-white border rounded-2xl p-3 cursor-pointer select-none transition-all duration-200 hover:shadow-md hover:border-emerald-300 ${
                        inCart ? 'border-emerald-500 ring-2 ring-emerald-50' : 'border-slate-100'
                      } ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                    >
                      {/* Product Image or Initial */}
                      <div className="w-full h-24 rounded-xl bg-slate-100 flex items-center justify-center mb-2 overflow-hidden text-slate-400 relative">
                        {p.img_url ? (
                          <img src={p.img_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl font-bold text-emerald-700/30">
                            {p.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                        {isLowStock && p.stock > 0 && (
                          <span className="absolute top-1.5 right-1.5 bg-amber-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold">
                            Stok Tipis
                          </span>
                        )}
                        {p.stock <= 0 && (
                          <span className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-xs text-white font-bold">
                            HABIS
                          </span>
                        )}
                      </div>

                      {/* Product details */}
                      <div>
                        <h4 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          SKU: {p.sku || p.prod_id.substring(5, 10).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                        <span className="text-xs sm:text-sm font-bold text-emerald-700">
                          Rp {p.price.toLocaleString('id-ID')}
                        </span>
                        {inCart && (
                          <span className="bg-emerald-600 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full font-bold shadow-sm shadow-emerald-200">
                            {inCart.qty}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // List Mode
                  return (
                    <div
                      key={p.prod_id}
                      id={`product_list_${p.prod_id}`}
                      onClick={() => p.stock > 0 && addToCart(p)}
                      className={`flex items-center justify-between p-3 bg-white border rounded-xl cursor-pointer hover:border-emerald-300 transition-all ${
                        inCart ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-100'
                      } ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</h4>
                          <span className="text-xs text-slate-400">
                            Stok: {p.stock} {p.category ? `• ${p.category}` : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-emerald-700">
                          Rp {p.price.toLocaleString('id-ID')}
                        </span>
                        {inCart && (
                          <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                            {inCart.qty}x
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Mobile bottom summary trigger */}
        {cart.length > 0 && (
          <div className="lg:hidden mt-4 pt-2 border-t border-slate-100">
            <button
              id="open_cart_mobile_btn"
              onClick={() => setShowCartMobile(true)}
              className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-xl shadow-lg font-semibold text-sm transition-all active:scale-95"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={18} />
                <span>{cart.reduce((sum, item) => sum + item.qty, 0)} Item Keranjang</span>
              </span>
              <span>Lanjut Bayar Rp {total.toLocaleString('id-ID')}</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Cart & Payment Workspace (Visible on PC/Tab, or as overlay on Mobile) */}
      <div 
        className={`w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-100 p-4 min-h-0 ${
          showCartMobile ? 'fixed inset-0 z-40 block' : 'hidden lg:flex'
        }`} 
        id="cart_workspace"
        onMouseEnter={() => {
          const mainContent = document.getElementById('tenant_main_content');
          if (mainContent) mainContent.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
        }}
        onMouseLeave={() => {
          const mainContent = document.getElementById('tenant_main_content');
          if (mainContent) mainContent.style.overflow = 'auto';
          document.body.style.overflow = '';
        }}
      >
        {/* Mobile Cart Header */}
        <div className="lg:hidden flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-emerald-600" />
            Keranjang Belanja
          </h3>
          <button 
            id="close_cart_mobile_btn"
            onClick={() => setShowCartMobile(false)} 
            className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-3 hidden lg:flex">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <ShoppingCart size={16} className="text-emerald-600" />
            Keranjang Belanja
          </h3>
          <button 
            id="clear_cart_btn"
            onClick={() => setCart([])} 
            className="text-xs text-rose-500 hover:text-rose-600 hover:underline"
          >
            Reset Keranjang
          </button>
        </div>

        {/* Scrollable Cart Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4 custom-scrollbar" id="cart_scrollable_body">
          {/* List of Cart Items */}
          <div className="space-y-3" id="cart_items_list">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
              <ShoppingCart size={32} className="mb-2 stroke-1" />
              <p className="text-xs">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div 
                key={item.product.prod_id} 
                id={`cart_item_${item.product.prod_id}`}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h5 className="font-semibold text-slate-800 text-xs truncate leading-tight">
                    {item.product.name}
                  </h5>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    Rp {item.product.price.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`cart_minus_${item.product.prod_id}`}
                    onClick={() => updateQty(item.product.prod_id, item.qty - 1)}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  
                  {/* Manual decimal input */}
                  <input
                    id={`cart_qty_input_${item.product.prod_id}`}
                    type="number"
                    step="any"
                    value={item.qty}
                    onChange={(e) => updateQty(item.product.prod_id, parseFloat(e.target.value) || 0)}
                    className="w-10 text-center text-xs font-bold bg-white border border-slate-200 rounded py-0.5"
                  />

                  <button
                    id={`cart_plus_${item.product.prod_id}`}
                    onClick={() => updateQty(item.product.prod_id, item.qty + 1)}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={12} />
                  </button>

                  <button
                    id={`cart_del_${item.product.prod_id}`}
                    onClick={() => removeFromCart(item.product.prod_id)}
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Details Form */}
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Pelanggan (Opsional)</label>
              <input
                id="pos_customer_name"
                type="text"
                placeholder="Nama pelanggan..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Catatan/Meja (Opsional)</label>
              <input
                id="pos_notes"
                type="text"
                placeholder="No Meja / Catatan..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Discounts and Tax */}
        <div className="bg-slate-50 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Percent size={13} className="text-emerald-600" /> Diskon
            </span>
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl shadow-inner border border-slate-300/30">
              <button
                id="discount_toggle_rp"
                type="button"
                onClick={() => setDiscountType('Rp')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  discountType === 'Rp' ? 'bg-emerald-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rupiah (Rp)
              </button>
              <button
                id="discount_toggle_percent"
                type="button"
                onClick={() => setDiscountType('%')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  discountType === '%' ? 'bg-emerald-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Persen (%)
              </button>
            </div>
          </div>

          <input
            id="pos_discount_input"
            type="number"
            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
            placeholder={discountType === 'Rp' ? 'Nominal diskon Rp...' : 'Diskon %...'}
            value={discountVal || ''}
            onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
          />

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 pt-1 cursor-pointer select-none">
            <input
              id="pos_tax_checkbox"
              type="checkbox"
              checked={hasTax}
              onChange={(e) => setHasTax(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Pajak (Ppn {taxPercent}%)</span>
          </label>
        </div>

        {/* Payment Modes */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
            <button
              id="pay_now_btn"
              type="button"
              onClick={() => setPaymentMode('Cash')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMode !== 'Piutang' 
                  ? 'bg-emerald-600 text-white shadow-md font-black transform scale-[1.01]' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Banknote size={14} />
              Bayar Sekarang
            </button>
            <button
              id="pay_later_btn"
              type="button"
              onClick={() => setPaymentMode('Piutang')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMode === 'Piutang' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black transform scale-[1.01]' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock size={14} />
              Bayar Nanti (Piutang)
            </button>
          </div>

          {/* Bayar Nanti Form */}
          {paymentMode === 'Piutang' ? (
            <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl space-y-2">
              <div>
                <label className="text-[10px] font-bold text-amber-800 block mb-0.5">Jatuh Tempo (Opsional)</label>
                <input
                  id="pos_due_date"
                  type="date"
                  className="w-full text-xs p-1.5 bg-white border border-amber-200 rounded-lg text-slate-700 focus:outline-none"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-amber-800 block mb-0.5">Catatan Piutang (Opsional)</label>
                <textarea
                  id="pos_receivable_notes"
                  placeholder="Mis. akan dibayar gajian tgl 25"
                  className="w-full text-xs p-1.5 bg-white border border-amber-200 rounded-lg text-slate-700 focus:outline-none h-12 resize-none"
                  value={receivableNotes}
                  onChange={(e) => setReceivableNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          ) : (
            /* Bayar Sekarang Options */
            <div className="space-y-3">
              {/* Cash vs QRIS vs Transfer */}
              <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1 border border-slate-200 shadow-inner">
                {(['Cash', 'QRIS', 'Transfer'] as const).map(mode => (
                  <button
                    key={mode}
                    id={`pay_mode_${mode}`}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMode === mode 
                        ? 'bg-slate-900 text-white shadow-md font-black' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    {mode === 'Cash' ? (
                      <>
                        <Banknote size={13} className="mr-1" />
                        Tunai
                      </>
                    ) : mode === 'QRIS' ? (
                      <>
                        <Smartphone size={13} className="mr-1" />
                        QRIS
                      </>
                    ) : (
                      <>
                        <Building size={13} className="mr-1" />
                        Transfer
                      </>
                    )}
                  </button>
                ))}
              </div>

              {/* Pecahan Shortcuts (Tunai Only) */}
              {paymentMode === 'Cash' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Pecahan Uang Bayar (Klik 2x bertambah)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[5000, 10000, 20000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        id={`pecahan_${amt}`}
                        type="button"
                        onDoubleClick={() => handlePecahanClick(amt)}
                        onClick={() => handlePecahanClick(amt)} // Also add single click for easy simulator testing
                        className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 active:scale-95 transition-all"
                      >
                        +{amt.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>

                  {/* Cash Paid input */}
                  <div className="mt-2.5">
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Uang Bayar Tunai (Rp)</label>
                    <input
                      id="pos_cash_paid_input"
                      type="number"
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg"
                      placeholder="Rp 0"
                      value={cashPaid || ''}
                      onChange={(e) => setCashPaid(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer at Bottom */}
      <div className="border-t border-slate-100 pt-3 space-y-3 bg-white shrink-0" id="cart_fixed_footer">
        {/* Summary Box */}
        <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-slate-700">
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs text-rose-600">
                <span>Diskon ({discountType === '%' ? `${discountVal}%` : 'Rp'})</span>
                <span>-Rp {discountAmt.toLocaleString('id-ID')}</span>
              </div>
            )}
            {hasTax && (
              <div className="flex justify-between text-xs">
                <span>Pajak ({taxPercent}%)</span>
                <span>Rp {taxAmt.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200/50 pt-1.5">
              <span>TOTAL</span>
              <span className="text-emerald-700">Rp {total.toLocaleString('id-ID')}</span>
            </div>
            {paymentMode === 'Cash' && cashPaid > total && (
              <div className="flex justify-between text-xs text-emerald-600 font-bold border-t border-dashed border-slate-200 pt-1">
                <span>Kembalian</span>
                <span>Rp {changeAmt.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            id="pay_checkout_submit"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all duration-200 cursor-pointer"
          >
            {paymentMode === 'Piutang' ? (
              <>Simpan Piutang Rp {total.toLocaleString('id-ID')}</>
            ) : (
              <>Bayar Rp {total.toLocaleString('id-ID')}</>
            )}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ==========================================
          RECEIPT OVERLAY MODAL
          ========================================== */}
      {showReceipt && checkoutResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="receipt_modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">Struk Pembayaran</h4>
              <button
                id="close_receipt_modal"
                onClick={() => {
                  setShowReceipt(false);
                  setCheckoutResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Simulated Receipt paper */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div className="bg-white w-72 shadow-sm border border-slate-200/60 p-4 text-xs font-mono text-slate-800 leading-tight">
                {/* Header */}
                <div className="text-center space-y-1 mb-4">
                  <h3 className="font-bold text-sm text-slate-900">{receiptTemplate.header_msg || 'BUCICI BIZ'}</h3>
                  <p className="text-[10px] text-slate-500">{receiptTemplate.address || ''}</p>
                  <p className="text-[10px] text-slate-500">Telp: {receiptTemplate.phone || '-'}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2 mb-2 space-y-0.5 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>No TRX:</span>
                    <span className="font-bold">{checkoutResult.transaction.trans_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date(checkoutResult.transaction.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{checkoutResult.transaction.emp_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span>{checkoutResult.transaction.customer_name || 'Umum'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 border-b border-dashed border-slate-300 pb-2 mb-2">
                  {checkoutResult.items.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{item.prod_name || item.product_name}</span>
                        <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.qty} x Rp {item.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation breakdown */}
                <div className="space-y-1 text-slate-600 mb-4 border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Diskon:</span>
                      <span>-Rp {discountAmt.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {hasTax && (
                    <div className="flex justify-between">
                      <span>Pajak ({taxPercent}%):</span>
                      <span>Rp {taxAmt.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-1">
                    <span>TOTAL:</span>
                    <span>Rp {checkoutResult.transaction.total.toLocaleString('id-ID')}</span>
                  </div>
                  {checkoutResult.transaction.payment_mode === 'Cash' && (
                    <>
                      <div className="flex justify-between">
                        <span>Bayar Tunai:</span>
                        <span>Rp {cashPaid.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Kembalian:</span>
                        <span>Rp {changeAmt.toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span>Metode:</span>
                    <span className="font-bold">{checkoutResult.transaction.payment_mode}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[10px] text-slate-500 space-y-1">
                  <p>{receiptTemplate.footer_msg || 'Terima Kasih Sudah Berbelanja!'}</p>
                  <p className="text-[9px] text-slate-400 font-sans mt-2">Powered by Bucici Biz</p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                id="receipt_print_bluetooth"
                onClick={handlePrintBluetooth}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm shadow-md"
              >
                <Printer size={16} />
                Cetak Bluetooth Thermal
              </button>
              
              <a
                id="receipt_share_whatsapp"
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md text-center"
              >
                <Share2 size={16} />
                Kirim via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
