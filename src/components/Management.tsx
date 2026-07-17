/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit3, Trash2, Shield, Users, ShoppingBag, Eye, EyeOff, AlertTriangle, 
  Tag, Image as ImageIcon, Save, X, RefreshCw, HelpCircle 
} from 'lucide-react';
import { Product, Employee, Role } from '../types';

interface ManagementProps {
  tenantId: string;
  products: Product[];
  employees: Employee[];
  roles: Role[];
  initialFilter?: string; // e.g. "Stok Tipis" or "Belum Ada Modal" from dashboard click
  onRefresh: () => void;
  onSetView?: (view: string) => void;
}

export default function Management({ 
  tenantId, 
  products, 
  employees, 
  roles, 
  initialFilter = 'Semua',
  onRefresh,
  onSetView
}: ManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'Produk' | 'Pengguna' | 'Role'>('Produk');
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<'Semua' | 'Stok Tipis' | 'Belum Ada Modal'>('Semua');

  // Load dashboard filter click
  useEffect(() => {
    if (initialFilter === 'Stok Tipis' || initialFilter === 'Belum Ada Modal') {
      setActiveSubTab('Produk');
      setProductFilter(initialFilter);
    }
  }, [initialFilter]);

  // Modal forms states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ------------------------------------------
  // PRODUCT FORM STATE
  // ------------------------------------------
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCostPrice, setProdCostPrice] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [mockUploading, setMockUploading] = useState(false);

  // ------------------------------------------
  // EMPLOYEE FORM STATE
  // ------------------------------------------
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRoleName, setEmpRoleName] = useState('');
  const [peekPassword, setPeekPassword] = useState(false);

  // ------------------------------------------
  // ROLE FORM STATE
  // ------------------------------------------
  const [roleNameInput, setRoleNameInput] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showRoleDeleteWarning, setShowRoleDeleteWarning] = useState<Role | null>(null);
  const [migrationRoleTarget, setMigrationRoleTarget] = useState('');

  // Preloaded static categories list
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filtered Products
  const filteredProducts = products.filter(p => {
    // Filter out placeholder products used to store categories
    if (p.name.startsWith("Placeholder Category - ")) return false;

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (productFilter === 'Stok Tipis') {
      return matchesSearch && p.stock <= 5;
    }
    if (productFilter === 'Belum Ada Modal') {
      return matchesSearch && (p.cost_price === undefined || p.cost_price === null);
    }
    return matchesSearch;
  });

  // Open Product Modal for add
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice('');
    setProdStock('');
    setProdCostPrice('');
    setProdSku('');
    setProdCategory('');
    setProdImgUrl('');
    setShowProductModal(true);
  };

  // Open Product Modal for edit
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.price.toString());
    setProdStock(p.stock.toString());
    setProdCostPrice(p.cost_price?.toString() || '');
    setProdSku(p.sku || '');
    setProdCategory(p.category || '');
    setProdImgUrl(p.img_url || '');
    setShowProductModal(true);
  };

  // Handle mock image upload
  const handleMockUpload = () => {
    setMockUploading(true);
    setTimeout(() => {
      // Pick a random styled product item picture from unspash to make it look professional
      const items = [
        'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300&auto=format&fit=crop&q=60', // coffee
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=60', // bread
        'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=300&auto=format&fit=crop&q=60', // beverage
        'https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=300&auto=format&fit=crop&q=60'  // fast food
      ];
      const randomUrl = items[Math.floor(Math.random() * items.length)];
      setProdImgUrl(randomUrl);
      setMockUploading(false);
    }, 1200);
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) {
      alert("Nama Produk dan Harga wajib diisi");
      return;
    }

    const payload = {
      tenant_id: tenantId,
      prod_id: editingProduct ? editingProduct.prod_id : undefined,
      name: prodName,
      category: prodCategory || "Umum",
      price: parseFloat(prodPrice),
      stock: parseFloat(prodStock) || 0,
      cost_price: prodCostPrice ? parseFloat(prodCostPrice) : undefined,
      sku: prodSku,
      img_url: prodImgUrl
    };

    const endpoint = editingProduct ? '/api/products/edit' : '/api/products/add';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        onRefresh();
      } else {
        alert(data.error || "Gagal menyimpan produk");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prod_id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini? Semua data resep produk ini akan ikut terhapus.")) return;
    try {
      const res = await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, prod_id })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    // We add category simply by creating a placeholder product or using the string in the products
    // For now, let's create a dummy product just to populate the category list!
    try {
      const res = await fetch('/api/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: `Placeholder Category - ${newCategoryName}`,
          category: newCategoryName.trim(),
          price: 0,
          stock: 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName('');
        setShowCategoryModal(false);
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------
  // EMPLOYEE / USER FUNCTIONS
  // ------------------------------------------
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpEmail('');
    setEmpPassword('');
    setEmpRoleName(roles[0]?.role_name || '');
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpPassword(''); // don't load password for privacy, let them overwrite
    setEmpRoleName(emp.role);
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empEmail || (!editingEmployee && !empPassword) || !empRoleName) {
      alert("Mohon lengkapi seluruh kolom wajib!");
      return;
    }

    const payload = {
      tenant_id: tenantId,
      emp_id: editingEmployee ? editingEmployee.emp_id : undefined,
      name: empName,
      email: empEmail,
      password: empPassword || undefined,
      role: empRoleName
    };

    const endpoint = editingEmployee ? '/api/employees/edit' : '/api/employees/add';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowEmployeeModal(false);
        onRefresh();
      } else {
        alert(data.error || "Gagal menyimpan data anggota");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEmployee = async (emp_id: string) => {
    if (!confirm("Yakin ingin menghapus anggota ini?")) return;
    try {
      const res = await fetch('/api/employees/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, emp_id })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------
  // ROLE PERMISSION FUNCTIONS
  // ------------------------------------------
  const permissionsList = [
    { code: 'POS', label: 'Kasir POS' },
    { code: 'Riwayat', label: 'Riwayat Transaksi & Reprint' },
    { code: 'Rekapan', label: 'Rekapan Penjualan & Laporan CSV' },
    { code: 'Kas', label: 'Pengelolaan Laci Kas (Uang Masuk/Keluar)' },
    { code: 'Manajemen', label: 'Manajemen Produk & Anggota' },
    { code: 'Struk', label: 'Konfigurasi Teks Struk Thermal' },
    { code: 'AI-sisten', label: 'Akses Tanya AI-sisten Bucici' },
  ];

  const handleTogglePermission = (code: string) => {
    if (selectedPermissions.includes(code)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== code));
    } else {
      setSelectedPermissions([...selectedPermissions, code]);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleNameInput.trim()) {
      alert("Nama Role wajib diisi!");
      return;
    }
    if (selectedPermissions.length === 0) {
      alert("Harap pilih setidaknya satu Hak Akses!");
      return;
    }

    try {
      const res = await fetch('/api/roles/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          role_name: roleNameInput.trim(),
          permissions: selectedPermissions
        })
      });
      const data = await res.json();
      if (data.success) {
        setRoleNameInput('');
        setSelectedPermissions([]);
        setEditingRole(null);
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartDeleteRole = (role: Role) => {
    const membersCount = employees.filter(e => e.role === role.role_name).length;
    if (membersCount > 0) {
      // Trigger deletion warning & safe migration dropdown
      const alternativeRoles = roles.filter(r => r.role_name !== role.role_name);
      setMigrationRoleTarget(alternativeRoles[0]?.role_name || '');
      setShowRoleDeleteWarning(role);
    } else {
      executeDeleteRole(role.role_name);
    }
  };

  const executeDeleteRole = async (roleName: string, targetMigrate?: string) => {
    try {
      const res = await fetch('/api/roles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          role_name: roleName,
          move_members_to: targetMigrate
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowRoleDeleteWarning(null);
        onRefresh();
      } else {
        alert(data.error || 'Gagal menghapus role');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditRoleLoad = (role: Role) => {
    setEditingRole(role);
    setRoleNameInput(role.role_name);
    setSelectedPermissions(role.permissions);
  };

  return (
    <div className="space-y-6" id="management_tab">
      {/* 1. SUB NAVIGATION TABS */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center shrink-0 overflow-x-auto no-scrollbar" id="management_tabs_header">
        <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5 w-full md:w-auto shadow-inner border border-slate-200/40">
          {(['Produk', 'Pengguna', 'Role'] as const).map(tab => (
            <button
              key={tab}
              id={`subtab_${tab}`}
              onClick={() => {
                setActiveSubTab(tab);
                setSearchQuery('');
              }}
              className={`px-4.5 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === tab 
                  ? 'bg-emerald-600 text-white shadow-md font-black transform scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              {tab === 'Produk' ? (
                <>
                  <ShoppingBag size={14} className={activeSubTab === 'Produk' ? 'text-white' : 'text-slate-500'} />
                  Manajemen Produk
                </>
              ) : tab === 'Pengguna' ? (
                <>
                  <Users size={14} className={activeSubTab === 'Pengguna' ? 'text-white' : 'text-slate-500'} />
                  Anggota Staff
                </>
              ) : (
                <>
                  <Shield size={14} className={activeSubTab === 'Role' ? 'text-white' : 'text-slate-500'} />
                  Hak Akses (Role)
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          TAB 1: PRODUCT CATALOGUE
          ========================================== */}
      {activeSubTab === 'Produk' && (
        <div className="space-y-4" id="subtab_content_produk">
          {/* Header Actions row */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 items-center border border-slate-200/60 shadow-inner overflow-x-auto no-scrollbar shrink-0">
              {([
                { id: 'Semua', label: 'Semua Produk', icon: null },
                { id: 'Stok Tipis', label: 'Stok Hampir Habis', icon: AlertTriangle },
                { id: 'Belum Ada Modal', label: 'Belum Ada Harga Modal', icon: HelpCircle }
              ] as const).map(f => {
                const FilterIcon = f.icon;
                return (
                  <button
                    key={f.id}
                    id={`prod_filter_btn_${f.id.replace(/\s+/g, '')}`}
                    onClick={() => setProductFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      productFilter === f.id 
                        ? 'bg-white text-slate-900 shadow-sm font-black' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                    }`}
                  >
                    {FilterIcon && <FilterIcon size={13} className={f.id === 'Stok Tipis' ? 'text-amber-500' : 'text-blue-500'} />}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                id="add_category_btn"
                onClick={() => setShowCategoryModal(true)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                + Kategori
              </button>
              <button
                id="add_product_btn"
                onClick={handleOpenAddProduct}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                Produk Baru
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={16} />
            </span>
            <input
              id="management_product_search"
              type="text"
              placeholder="Cari nama produk atau SKU..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Products List Table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <ShoppingBag size={36} className="mb-1.5 stroke-1" />
                  <p className="text-xs">Tidak ada produk dalam daftar filter ini</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="px-5 py-3">Produk</th>
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">SKU</th>
                      <th className="px-5 py-3 text-right">Harga Jual</th>
                      <th className="px-5 py-3 text-right">Harga Modal (HPP)</th>
                      <th className="px-5 py-3 text-center">Stok</th>
                      <th className="px-5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProducts.map((p) => {
                      const isLow = p.stock <= 5;
                      const isNoModal = p.cost_price === undefined || p.cost_price === null;
                      return (
                        <tr key={p.prod_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center text-slate-400 font-bold shrink-0">
                                {p.img_url ? (
                                  <img src={p.img_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  p.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {p.prod_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-semibold">{p.category || 'Umum'}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">{p.sku || '-'}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                            Rp {p.price.toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold">
                            {isNoModal ? (
                              <span className="text-rose-500 text-[10px] bg-rose-50 px-2 py-0.5 rounded font-bold">
                                Belum Diisi
                              </span>
                            ) : (
                              <span className="text-emerald-700">Rp {p.cost_price?.toLocaleString('id-ID')}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.stock <= 0 
                                ? 'bg-rose-100 text-rose-700' 
                                : isLow 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {p.stock} porsi
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                id={`edit_prod_btn_${p.prod_id}`}
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit Produk"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                id={`del_prod_btn_${p.prod_id}`}
                                onClick={() => handleDeleteProduct(p.prod_id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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
      )}

      {/* ==========================================
          TAB 2: EMPLOYEE LISTING
          ========================================== */}
      {activeSubTab === 'Pengguna' && (
        <div className="space-y-4" id="subtab_content_pengguna">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Anggota Toko ({employees.length} Staff)</h4>
              <p className="text-[10px] text-slate-500">Mendaftarkan akun login khusus bagi kasir atau manager stok Anda.</p>
            </div>
            <button
              id="add_employee_btn"
              onClick={handleOpenAddEmployee}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              + Anggota
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 p-6 text-center">
                <Users size={36} className="mb-2 stroke-1" />
                <p className="text-xs font-bold text-slate-500">Belum Ada Anggota Staff</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Daftarkan staff kasirmu sekarang agar mereka bisa login di device masing-masing!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="px-5 py-3">Nama Anggota</th>
                      <th className="px-5 py-3">Email Login</th>
                      <th className="px-5 py-3">Hak Akses Role</th>
                      <th className="px-5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {employees.map((emp) => (
                      <tr key={emp.emp_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-800 block">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {emp.emp_id}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-semibold">{emp.email}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              id={`edit_emp_btn_${emp.emp_id}`}
                              onClick={() => handleOpenEditEmployee(emp)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              id={`del_emp_btn_${emp.emp_id}`}
                              onClick={() => handleDeleteEmployee(emp.emp_id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: ROLE & PERMISSIONS
          ========================================== */}
      {activeSubTab === 'Role' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="subtab_content_roles">
          {/* FORM: Create or Edit Role */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Shield size={16} className="text-emerald-600" />
              {editingRole ? 'Edit Definisi Role' : 'Role Baru & Akses'}
            </h4>
            
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nama Role (Mis. Kasir Junior)</label>
                <input
                  id="role_name_input"
                  type="text"
                  placeholder="Kasir, Stokis, Supervisor..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  value={roleNameInput}
                  onChange={(e) => setRoleNameInput(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Pilih Hak Akses Fitur</label>
                <div className="space-y-1.5" id="permission_checkboxes">
                  {permissionsList.map((p) => {
                    const isChecked = selectedPermissions.includes(p.code);
                    return (
                      <label 
                        key={p.code} 
                        id={`label_perm_${p.code}`}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'bg-emerald-50/40 border-emerald-300 text-emerald-800 font-semibold' 
                            : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <input
                          id={`perm_check_${p.code}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.code)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                        />
                        <div className="text-[11px] leading-tight">
                          <span>{p.label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingRole && (
                  <button
                    id="role_cancel_edit_btn"
                    type="button"
                    onClick={() => {
                      setEditingRole(null);
                      setRoleNameInput('');
                      setSelectedPermissions([]);
                    }}
                    className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                )}
                <button
                  id="role_save_submit"
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save size={13} />
                  Simpan Role
                </button>
              </div>
            </form>
          </div>

          {/* LIST: Created Roles */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">Daftar Hak Akses Toko ({roles.length} Role)</h4>
            
            {roles.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400">
                <Shield size={36} className="mb-2 stroke-1 mx-auto" />
                <p className="text-xs">Belum ada role akses kustom yang dibuat.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Role baru akan muncul di formulir pendaftaran anggota staff.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="roles_cards_list">
                {roles.map((r, idx) => {
                  const usedByCount = employees.filter(e => e.role === r.role_name).length;
                  return (
                    <div 
                      key={idx} 
                      id={`role_card_${r.role_name.replace(/\s+/g, '')}`}
                      className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-bold text-slate-800 text-sm">{r.role_name}</h5>
                          <span className="text-[10px] text-slate-400 font-semibold">{usedByCount} anggota memakai role ini</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-4" id={`role_badges_${idx}`}>
                          {r.permissions.map(p => (
                            <span 
                              key={p} 
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase font-sans border border-slate-200/50"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-50">
                        <button
                          id={`edit_role_load_btn_${idx}`}
                          onClick={() => handleEditRoleLoad(r)}
                          className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors"
                        >
                          Ubah Akses
                        </button>
                        <button
                          id={`del_role_start_btn_${idx}`}
                          onClick={() => handleStartDeleteRole(r)}
                          className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg transition-colors"
                        >
                          Hapus Role
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD/EDIT PRODUCT
          ========================================== */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">{editingProduct ? 'Edit Produk' : 'Produk Baru'}</h4>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Nama Produk *</label>
                <input
                  id="modal_prod_name"
                  type="text"
                  placeholder="Mis. Nasi Goreng Gila"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Harga Jual (Rp) *</label>
                  <input
                    id="modal_prod_price"
                    type="number"
                    placeholder="Mis. 15000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Stok Toko *</label>
                  <input
                    id="modal_prod_stock"
                    type="number"
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Harga Modal (Rp) - Opsional</span>
                  <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-extrabold font-sans">Owner Only</span>
                </label>
                <input
                  id="modal_prod_cost"
                  type="number"
                  placeholder="Mis. 9000 (Harga bahan baku pokok)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none text-emerald-800"
                  value={prodCostPrice}
                  onChange={(e) => setProdCostPrice(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">
                  Digunakan untuk menghitung Laba Kotor harian di tokomu secara otomatis. Hanya Akun Owner Utama toko yang memiliki otorisasi melihat atau mengubah nominal ini.
                </p>
                {onSetView && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      id="hitung_modal_detail_btn"
                      onClick={() => {
                        setShowProductModal(false);
                        onSetView('modal');
                      }}
                      className="px-2.5 py-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-lg flex items-center gap-1 transition-all border border-blue-200 cursor-pointer"
                    >
                      <HelpCircle size={11} />
                      Hitung Modal Detail
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">SKU / Barcode (Opsional)</label>
                  <input
                    id="modal_prod_sku"
                    type="text"
                    placeholder="NSG-GL"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Kategori (Drop-down)</label>
                  <select
                    id="modal_prod_cat"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                  >
                    <option value="">- Tanpa Kategori -</option>
                    {categories.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload image simulation */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Foto Produk (Opsional)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {prodImgUrl ? (
                      <img src={prodImgUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={22} className="text-slate-400" />
                    )}
                  </div>
                  
                  <button
                    id="mock_upload_btn"
                    type="button"
                    onClick={handleMockUpload}
                    disabled={mockUploading}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:bg-slate-50 disabled:text-slate-400 text-xs font-bold rounded-lg transition-all border border-slate-200 cursor-pointer"
                  >
                    {mockUploading ? 'Mengunggah...' : 'Klik Unggah Mock Foto'}
                  </button>
                  
                  {prodImgUrl && (
                    <button
                      type="button"
                      onClick={() => setProdImgUrl('')}
                      className="text-xs text-rose-500 font-bold hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="modal_prod_submit"
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {editingProduct ? 'Simpan Edit' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD/EDIT EMPLOYEE
          ========================================== */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">{editingEmployee ? 'Edit Data Anggota' : 'Daftarkan Anggota Baru'}</h4>
              <button onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 text-xs text-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Nama Lengkap *</label>
                <input
                  id="modal_emp_name"
                  type="text"
                  placeholder="Nama lengkap anggota..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Email Login Staff *</label>
                <input
                  id="modal_emp_email"
                  type="email"
                  placeholder="Mis. budi@namatokomu.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                  Password Login {editingEmployee && '(Kosongkan jika tidak diubah)'} *
                </label>
                <div className="relative">
                  <input
                    id="modal_emp_pass"
                    type={peekPassword ? 'text' : 'password'}
                    placeholder="Sandi login staff..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none pr-10"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    required={!editingEmployee}
                  />
                  <button
                    id="modal_emp_peek_btn"
                    type="button"
                    onClick={() => setPeekPassword(!peekPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {peekPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Setel Hak Akses (Role Dropdown) *</label>
                {roles.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-[10px] font-bold">
                    PERINGATAN: Anda harus membuat minimal 1 Role kustom di tab "🛡️ Role" terlebih dahulu!
                  </div>
                ) : (
                  <select
                    id="modal_emp_role"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                    value={empRoleName}
                    onChange={(e) => setEmpRoleName(e.target.value)}
                    required
                  >
                    {roles.map((r, i) => (
                      <option key={i} value={r.role_name}>{r.role_name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="modal_emp_submit"
                  type="submit"
                  disabled={roles.length === 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {editingEmployee ? 'Simpan Edit' : 'Simpan Staff Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADD KATEGORI
          ========================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="font-bold text-xs">Tambah Kategori Baru</h4>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Kategori</label>
                <input
                  id="category_name_input"
                  type="text"
                  placeholder="Mis. Dessert, Minuman Dingin, Paket"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="category_save_btn"
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ROLE DELETION WARNING & MIGRATION
          ========================================== */}
      {showRoleDeleteWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-rose-100">
            <div className="bg-rose-900 text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <AlertTriangle size={16} />
                Peringatan Penghapusan Role
              </h4>
              <button onClick={() => setShowRoleDeleteWarning(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl font-medium leading-relaxed border border-rose-100">
                Role <strong>"{showRoleDeleteWarning.role_name}"</strong> masih digunakan oleh 
                {' '}<strong>{employees.filter(e => e.role === showRoleDeleteWarning.role_name).length} anggota staff</strong> active.
                Anda wajib memilih tindakan pemindahan aman untuk anggota tersebut sebelum menghapus role ini.
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Pindahkan seluruh anggota tersebut ke role:
                </label>
                <select
                  id="role_migration_dropdown"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none text-slate-800"
                  value={migrationRoleTarget}
                  onChange={(e) => setMigrationRoleTarget(e.target.value)}
                  required
                >
                  {roles
                    .filter(r => r.role_name !== showRoleDeleteWarning.role_name)
                    .map((r, i) => (
                      <option key={i} value={r.role_name}>{r.role_name}</option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRoleDeleteWarning(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  id="role_delete_migration_submit"
                  type="button"
                  onClick={() => executeDeleteRole(showRoleDeleteWarning.role_name, migrationRoleTarget)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Pindahkan & Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
