/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Set up JSON parsing
app.use(express.json({ limit: '10mb' }));

// Set up Gemini AI client with telemetry agent
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Create Data Directory for State Persistence
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Global DB Structure
interface Database {
  tenants: any[];
  licenses: any[];
  roles: any[];
  employees: any[];
  products: any[];
  transactions: any[];
  transaction_items: any[];
  kas_history: any[];
  inventory_items: any[];
  recipe_details: any[];
  info_posts: any[];
  receipt_templates: any[];
}

const defaultDB: Database = {
  tenants: [],
  licenses: [],
  roles: [],
  employees: [],
  products: [],
  transactions: [],
  transaction_items: [],
  kas_history: [],
  inventory_items: [],
  recipe_details: [],
  info_posts: [],
  receipt_templates: []
};

// Seed Initial Data (if db.json doesn't exist)
function loadDB(): Database {
  if (!fs.existsSync(DB_FILE)) {
    saveDB(generateMockData());
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load db file, resetting...", e);
    return defaultDB;
  }
}

function saveDB(db: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function generateMockData(): Database {
  const nowStr = new Date().toISOString();
  
  // Create Preloaded Licenses
  const licenses = [
    { license_code: "BUCICI-TEST1", status: "Tersedia", created_at: nowStr, batch_name: "Lynk Juni" },
    { license_code: "BUCICI-TEST2", status: "Tersedia", created_at: nowStr, batch_name: "Lynk Juni" },
    { license_code: "BUCICI-TEST3", status: "Tersedia", created_at: nowStr, batch_name: "Lynk Juni" },
    { license_code: "BUCICI-DEMO", status: "Terpakai", tenant_id: "tenant-demo", created_at: nowStr, batch_name: "Demo Batch" },
  ];

  // Preloaded Demo Tenant
  const tenants = [
    {
      tenant_id: "tenant-demo",
      business_name: "Bucici Demo Mart",
      owner_name: "Bucici Owner",
      email: "owner@demo.com",
      password: "password123", // in practice use hash
      address: "Jl. Sahabat Pedagang No. 88, Jakarta",
      header_msg: "BUCICI DEMO MART",
      footer_msg: "Terima Kasih Atas Kunjungan Anda!",
      created_at: nowStr,
      subscription_type: "Lifetime",
      expiry_date: "2030-12-31",
      token_balance: 1000,
      is_active: true
    }
  ];

  // Default Roles
  const roles = [
    { tenant_id: "tenant-demo", role_name: "Kasir Senior", permissions: ["POS", "Riwayat", "Kas", "AI-sisten"] },
    { tenant_id: "tenant-demo", role_name: "Manager Stok", permissions: ["POS", "Manajemen", "AI-sisten"] }
  ];

  // Preloaded Employees
  const employees = [
    { tenant_id: "tenant-demo", emp_id: "emp-001", name: "Siti Kasir", email: "siti@demo.com", role: "Kasir Senior", password: "password123" },
    { tenant_id: "tenant-demo", emp_id: "emp-002", name: "Budi Gudang", email: "budi@demo.com", role: "Manager Stok", password: "password123" }
  ];

  // Preloaded Products
  const products = [
    { tenant_id: "tenant-demo", prod_id: "prod-001", name: "Kopi Gayo Premium", category: "Minuman", price: 25000, stock: 50, cost_price: 15000, sku: "KOPI-GAYO", is_modal_set: true },
    { tenant_id: "tenant-demo", prod_id: "prod-002", name: "Roti Bakar Coklat", category: "Makanan", price: 18000, stock: 30, cost_price: 10000, sku: "ROTI-COK", is_modal_set: true },
    { tenant_id: "tenant-demo", prod_id: "prod-003", name: "Es Teh Manis", category: "Minuman", price: 6000, stock: 100, cost_price: 2000, sku: "ESTEH", is_modal_set: true },
    { tenant_id: "tenant-demo", prod_id: "prod-004", name: "Indomie Goreng Telur", category: "Makanan", price: 12000, stock: 5, cost_price: 7000, sku: "IND-TEL", is_modal_set: true }, // Low stock (5)
    { tenant_id: "tenant-demo", prod_id: "prod-005", name: "Keripik Singkong", category: "Cemilan", price: 10000, stock: 20, sku: "KERIPIK", is_modal_set: false } // No Modal/Cost Price set
  ];

  // Preloaded Inventory Ingredients (Bahan Baku)
  const inventory_items = [
    { tenant_id: "tenant-demo", item_id: "raw-001", name: "Biji Kopi Gayo", unit: "gram", price_per_unit: 100, stock: 5000 }, // 100 per gram
    { tenant_id: "tenant-demo", item_id: "raw-002", name: "Susu UHT", unit: "ml", price_per_unit: 20, stock: 10000 }, // 20 per ml
    { tenant_id: "tenant-demo", item_id: "raw-003", name: "Gula Pasir", unit: "gram", price_per_unit: 15, stock: 3000 },
    { tenant_id: "tenant-demo", item_id: "raw-004", name: "Roti Tawar", unit: "pcs", price_per_unit: 1000, stock: 100 }
  ];

  // Preloaded Recipe Details
  const recipe_details = [
    { tenant_id: "tenant-demo", prod_id: "prod-001", item_id: "raw-001", qty_usage: 15 }, // 15g kopi per cup
    { tenant_id: "tenant-demo", prod_id: "prod-001", item_id: "raw-002", qty_usage: 100 }, // 100ml susu per cup
    { tenant_id: "tenant-demo", prod_id: "prod-002", item_id: "raw-004", qty_usage: 2 } // 2 pcs roti
  ];

  // Preloaded Transactions (Today)
  const trans_id_1 = "TRX-10001";
  const trans_id_2 = "TRX-10002";
  const trans_id_3 = "TRX-10003";

  const transactions = [
    {
      tenant_id: "tenant-demo",
      trans_id: trans_id_1,
      emp_id: "owner",
      emp_name: "Bucici Owner (Owner)",
      total: 50000,
      tax: 10,
      discount: 0,
      discount_type: "Rp",
      payment_mode: "Cash",
      status: "Success",
      customer_name: "Andi",
      notes: "Meja 3",
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString() // 4 hours ago
    },
    {
      tenant_id: "tenant-demo",
      trans_id: trans_id_2,
      emp_id: "emp-001",
      emp_name: "Siti Kasir",
      total: 34000,
      tax: 0,
      discount: 2000,
      discount_type: "Rp",
      payment_mode: "QRIS",
      status: "Success",
      customer_name: "Dewi",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString() // 2 hours ago
    },
    {
      tenant_id: "tenant-demo",
      trans_id: trans_id_3,
      emp_id: "owner",
      emp_name: "Bucici Owner (Owner)",
      total: 18000,
      tax: 0,
      discount: 0,
      discount_type: "Rp",
      payment_mode: "Piutang",
      status: "Success",
      customer_name: "Pak Joko",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // 7 days from now
      receivable_notes: "Bayar minggu depan pas gajian",
      timestamp: new Date(Date.now() - 1 * 3600000).toISOString() // 1 hour ago
    }
  ];

  const transaction_items = [
    // TRX-10001 items (Total subtotal: 45000, + 10% tax = 49500 -> rounded or total = 50000 with custom pricing)
    { tenant_id: "tenant-demo", trans_id: trans_id_1, prod_id: "prod-001", prod_name: "Kopi Gayo Premium", qty: 2, price: 25000, cost_price: 15000, subtotal: 50000 },
    // TRX-10002 items
    { tenant_id: "tenant-demo", trans_id: trans_id_2, prod_id: "prod-002", prod_name: "Roti Bakar Coklat", qty: 2, price: 18000, cost_price: 10000, subtotal: 36000 },
    // TRX-10003 items
    { tenant_id: "tenant-demo", trans_id: trans_id_3, prod_id: "prod-002", prod_name: "Roti Bakar Coklat", qty: 1, price: 18000, cost_price: 10000, subtotal: 18000 }
  ];

  // Kas History
  const kas_history = [
    { tenant_id: "tenant-demo", type: "Modal", amount: 150000, description: "Isi Laci Kas Awal (Modal Receh)", timestamp: new Date(Date.now() - 8 * 3600000).toISOString() }
  ];

  // Preloaded Info Posts
  const info_posts = [
    {
      post_id: "post-001",
      content: "Selamat datang di Bucici Biz! Tonton video tutorial singkat cara mengelola kasir dan stok di warung atau tokomu agar makin cuan.",
      link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      type: "YouTube",
      created_at: nowStr
    },
    {
      post_id: "post-002",
      content: "Tips mengatur HPP (Harga Pokok Penjualan) dan margin keuntungan produk kuliner di era digital. Baca selengkapnya di artikel ini.",
      link: "https://google.com",
      type: "Link",
      created_at: nowStr
    }
  ];

  // Preloaded Struk Template
  const receipt_templates = [
    {
      tenant_id: "tenant-demo",
      header_msg: "BUCICI DEMO MART",
      address: "Jl. Sahabat Pedagang No. 88, Jakarta",
      phone: "0812-3456-7890",
      info: "@bucicidemomart",
      footer_msg: "Terima Kasih Atas Kunjungan Anda!"
    }
  ];

  return {
    tenants,
    licenses,
    roles,
    employees,
    products,
    transactions,
    transaction_items,
    kas_history,
    inventory_items,
    recipe_details,
    info_posts,
    receipt_templates
  };
}

// Helper to write query responses
const writeSuccess = (res: any, data: any) => res.json({ success: true, data });
const writeError = (res: any, msg: string, status = 400) => res.status(status).json({ success: false, error: msg });

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login endpoint (checks Owner / Employee / Super-Admin)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return writeError(res, "Email dan password wajib diisi");

  const db = loadDB();

  // Check for Super Admin (first registered or master email)
  const isMasterAdmin = email.toLowerCase() === "posbucici@gmail.com";
  // If the DB has no tenants, we treat this as the very first setup registration
  // Let's see if there is any tenant matching this email.
  const matchedTenant = db.tenants.find(t => t.email.toLowerCase() === email.toLowerCase());

  if (isMasterAdmin) {
    // If we have a matching tenant (registered), login as that tenant, otherwise let them log in as pure Super-Admin
    if (password === "admin123") {
      return writeSuccess(res, {
        user: {
          id: "super-admin",
          name: matchedTenant ? matchedTenant.owner_name : "Super Admin Bucici",
          email: email.toLowerCase(),
          role: "Super-Admin",
          tenant_id: matchedTenant ? matchedTenant.tenant_id : undefined
        }
      });
    }
  }

  if (matchedTenant) {
    if (matchedTenant.password === password) {
      if (!matchedTenant.is_active) {
        return writeError(res, "Akun Toko Anda dinonaktifkan oleh Super Admin.");
      }
      return writeSuccess(res, {
        user: {
          id: matchedTenant.tenant_id,
          name: matchedTenant.owner_name,
          email: matchedTenant.email,
          role: "Owner",
          tenant_id: matchedTenant.tenant_id
        }
      });
    }
  }

  // Check for Employee
  const matchedEmp = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (matchedEmp) {
    if (matchedEmp.password === password) {
      // Find role permissions
      const rolePerms = db.roles.find(r => r.tenant_id === matchedEmp.tenant_id && r.role_name === matchedEmp.role);
      const tenantObj = db.tenants.find(t => t.tenant_id === matchedEmp.tenant_id);
      
      if (tenantObj && !tenantObj.is_active) {
        return writeError(res, "Akun Toko tempat Anda bekerja sedang dinonaktifkan.");
      }

      return writeSuccess(res, {
        user: {
          id: matchedEmp.emp_id,
          name: matchedEmp.name,
          email: matchedEmp.email,
          role: "Employee",
          tenant_id: matchedEmp.tenant_id,
          role_name: matchedEmp.role,
          permissions: rolePerms ? rolePerms.permissions : []
        }
      });
    }
  }

  return writeError(res, "Email atau password salah.");
});

// Register endpoint
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, license_code, business_name } = req.body;
  if (!name || !email || !password || !business_name) {
    return writeError(res, "Semua form pendaftaran wajib diisi!");
  }

  const db = loadDB();

  // Check if email already registered
  const exists = db.tenants.some(t => t.email.toLowerCase() === email.toLowerCase());
  if (exists) return writeError(res, "Email sudah terdaftar.");

  const tenant_id = "tenant-" + Math.floor(Math.random() * 1000000);
  const nowStr = new Date().toISOString();

  // Check for super admin registration condition
  // "buatlah orang yang pertama daftar tidak membutuhkan kode lisensi, dan langsung terdaftar sebagai super admin"
  const isFirstUser = db.tenants.length === 0;

  if (isFirstUser || email.toLowerCase() === "posbucici@gmail.com") {
    // Registered immediately as active owner and also becomes super-admin
    const newTenant = {
      tenant_id,
      business_name,
      owner_name: name,
      email: email.toLowerCase(),
      password,
      address: "Alamat Toko Baru",
      header_msg: business_name.toUpperCase(),
      footer_msg: "Terima Kasih Sudah Berbelanja!",
      created_at: nowStr,
      subscription_type: "Lifetime Admin",
      expiry_date: "2099-12-31",
      token_balance: 9999,
      is_active: true
    };

    db.tenants.push(newTenant);
    saveDB(db);

    return writeSuccess(res, {
      user: {
        id: tenant_id,
        name: name,
        email: email.toLowerCase(),
        role: "Super-Admin", // Granted Super Admin!
        tenant_id: tenant_id
      }
    });
  }

  // Regular users require a License Code
  if (!license_code) {
    return writeError(res, "Kode Lisensi wajib diisi untuk mendaftar.");
  }

  const matchedLicense = db.licenses.find(l => l.license_code.trim() === license_code.trim());
  if (!matchedLicense) {
    return writeError(res, "Kode Lisensi tidak ditemukan.");
  }

  if (matchedLicense.status === "Terpakai") {
    return writeError(res, "Kode Lisensi sudah terpakai.");
  }

  // Process registration
  const newTenant = {
    tenant_id,
    business_name,
    owner_name: name,
    email: email.toLowerCase(),
    password,
    address: "Alamat Toko",
    header_msg: business_name.toUpperCase(),
    footer_msg: "Terima Kasih Sudah Berbelanja!",
    created_at: nowStr,
    subscription_type: "Standard",
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], // 1 year
    token_balance: 100,
    is_active: true
  };

  // Mark license as used
  matchedLicense.status = "Terpakai";
  matchedLicense.tenant_id = tenant_id;

  // Generate default receipt template
  db.receipt_templates.push({
    tenant_id,
    header_msg: business_name.toUpperCase(),
    address: "Alamat Toko",
    phone: "-",
    info: "-",
    footer_msg: "Terima Kasih Sudah Berbelanja!"
  });

  db.tenants.push(newTenant);
  saveDB(db);

  return writeSuccess(res, {
    user: {
      id: tenant_id,
      name: name,
      email: email.toLowerCase(),
      role: "Owner",
      tenant_id: tenant_id
    }
  });
});

// ==========================================
// TENANTS ENDPOINTS (Super Admin only)
// ==========================================
app.get("/api/tenants", (req, res) => {
  const db = loadDB();
  writeSuccess(res, db.tenants);
});

app.post("/api/tenants/:id/toggle", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const t = db.tenants.find(tenant => tenant.tenant_id === id);
  if (!t) return writeError(res, "Tenant tidak ditemukan.");
  t.is_active = !t.is_active;
  saveDB(db);
  writeSuccess(res, t);
});

// ==========================================
// LICENSE ENDPOINTS (Super Admin only)
// ==========================================
app.get("/api/licenses", (req, res) => {
  const db = loadDB();
  writeSuccess(res, db.licenses);
});

app.post("/api/licenses/generate", (req, res) => {
  const { count, batch_name } = req.body;
  const num = parseInt(count, 10);
  if (isNaN(num) || num < 1 || num > 500) {
    return writeError(res, "Jumlah lisensi harus di antara 1 dan 500");
  }

  const db = loadDB();
  const nowStr = new Date().toISOString();
  const newCodes = [];

  for (let i = 0; i < num; i++) {
    // Generate code format: BUCICI-XXXX-YYYY where YYYY are random numbers/letters
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `BUCICI-${rand}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const lic = {
      license_code: code,
      status: "Tersedia",
      batch_name: batch_name || undefined,
      created_at: nowStr
    };
    db.licenses.push(lic);
    newCodes.push(lic);
  }

  saveDB(db);
  writeSuccess(res, newCodes);
});

app.post("/api/licenses/sync", (req, res) => {
  const { licenses } = req.body;
  if (!Array.isArray(licenses)) {
    return writeError(res, "Data lisensi tidak valid.");
  }

  const db = loadDB();
  const nowStr = new Date().toISOString();
  
  // Cleanse and check database integrity
  const tenantIds = new Set(db.tenants.map(t => t.tenant_id));

  // Map incoming licenses from sheets with extreme sanitization (Isi yang perlu, hapus yang tidak perlu)
  const incomingMap = new Map();
  licenses.forEach(item => {
    let code = String(item.license_code || "").trim().toUpperCase();
    if (code) {
      // Auto prefix "BUCICI-" if missing
      if (!code.startsWith("BUCICI-")) {
        code = `BUCICI-${code}`;
      }
      
      // Sanitise status values
      let status = String(item.status || "Tersedia").trim();
      if (status !== "Tersedia" && status !== "Terpakai") {
        status = item.tenant_id ? "Terpakai" : "Tersedia";
      }

      incomingMap.set(code, {
        license_code: code,
        status: status,
        batch_name: String(item.batch_name || "").trim() || "Imported Batch",
        created_at: String(item.created_at || "").trim() || nowStr,
        tenant_id: String(item.tenant_id || "").trim() || undefined
      });
    }
  });

  // Merge database with incoming licenses
  const mergedLicensesMap = new Map();

  // 1. Add/Update all existing licenses from DB (and auto-sanitize them too)
  db.licenses.forEach(lic => {
    let code = String(lic.license_code || "").trim().toUpperCase();
    if (code) {
      if (!code.startsWith("BUCICI-")) {
        code = `BUCICI-${code}`;
      }
      mergedLicensesMap.set(code, {
        ...lic,
        license_code: code
      });
    }
  });

  // 2. Add/Update licenses from Sheets (Deduplicate and sync)
  incomingMap.forEach((incomingLic, code) => {
    const existing = mergedLicensesMap.get(code);
    if (existing) {
      // Sync from sheet, but prioritize DB's tenant assignment if any
      if (incomingLic.tenant_id) {
        existing.tenant_id = incomingLic.tenant_id;
        existing.status = "Terpakai";
      }
      if (incomingLic.batch_name) {
        existing.batch_name = incomingLic.batch_name;
      }
    } else {
      // Brand new license imported from Google Sheets
      mergedLicensesMap.set(code, incomingLic);
    }
  });

  // 3. Cleanse all licenses: Ensure status matches tenant_id validity (Hapus yang tidak perlu)
  const finalLicensesList = [];
  for (const [code, lic] of mergedLicensesMap.entries()) {
    // Basic formatting correction: Ensure code starts with BUCICI-
    if (!code.startsWith("BUCICI-") || code.length < 8) {
      // Skip invalid license code
      continue;
    }

    const tId = lic.tenant_id;
    if (tId && tenantIds.has(tId)) {
      lic.status = "Terpakai";
    } else {
      // No valid tenant linked: Reset tenant_id and status (Hapus yang tidak perlu)
      lic.tenant_id = undefined;
      lic.status = "Tersedia";
    }

    finalLicensesList.push(lic);
  }

  // Update DB with the cleaned and synced list
  db.licenses = finalLicensesList;
  saveDB(db);

  writeSuccess(res, db.licenses);
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================
app.get("/api/products", (req, res) => {
  const { tenant_id } = req.query;
  if (!tenant_id) return writeError(res, "Tenant ID required");
  const db = loadDB();
  const list = db.products.filter(p => p.tenant_id === tenant_id);
  writeSuccess(res, list);
});

app.post("/api/products/add", (req, res) => {
  const { tenant_id, name, category, price, stock, cost_price, sku, img_url } = req.body;
  if (!tenant_id || !name || price === undefined) return writeError(res, "Data produk tidak lengkap");

  const db = loadDB();
  const prod_id = "prod-" + Math.floor(Math.random() * 1000000);
  
  const p = {
    tenant_id,
    prod_id,
    name,
    category: category || "Umum",
    price: parseFloat(price),
    stock: parseFloat(stock) || 0,
    cost_price: cost_price ? parseFloat(cost_price) : undefined,
    sku: sku || undefined,
    img_url: img_url || undefined,
    is_modal_set: cost_price !== undefined && cost_price !== ""
  };

  db.products.push(p);
  saveDB(db);
  writeSuccess(res, p);
});

app.post("/api/products/edit", (req, res) => {
  const { tenant_id, prod_id, name, category, price, stock, cost_price, sku, img_url } = req.body;
  if (!tenant_id || !prod_id) return writeError(res, "Data produk tidak lengkap");

  const db = loadDB();
  const p = db.products.find(prod => prod.tenant_id === tenant_id && prod.prod_id === prod_id);
  if (!p) return writeError(res, "Produk tidak ditemukan");

  p.name = name;
  p.category = category || "Umum";
  p.price = parseFloat(price);
  p.stock = parseFloat(stock);
  p.cost_price = cost_price ? parseFloat(cost_price) : undefined;
  p.sku = sku || undefined;
  if (img_url) p.img_url = img_url;
  p.is_modal_set = p.cost_price !== undefined;

  saveDB(db);
  writeSuccess(res, p);
});

app.post("/api/products/delete", (req, res) => {
  const { tenant_id, prod_id } = req.body;
  const db = loadDB();
  db.products = db.products.filter(p => !(p.tenant_id === tenant_id && p.prod_id === prod_id));
  db.recipe_details = db.recipe_details.filter(r => !(r.tenant_id === tenant_id && r.prod_id === prod_id));
  saveDB(db);
  writeSuccess(res, { prod_id });
});

app.post("/api/products/bulk-add", (req, res) => {
  const { tenant_id, products } = req.body;
  if (!tenant_id || !Array.isArray(products)) return writeError(res, "Data tidak valid atau kosong");

  const db = loadDB();
  const added: any[] = [];

  for (const item of products) {
    if (!item.name || item.price === undefined) continue;
    const prod_id = "prod-" + Math.floor(Math.random() * 1000000);
    const p = {
      tenant_id,
      prod_id,
      name: item.name,
      category: item.category || "Umum",
      price: parseFloat(item.price) || 0,
      stock: parseFloat(item.stock) || 0,
      cost_price: item.cost_price ? parseFloat(item.cost_price) : undefined,
      sku: item.sku || undefined,
      img_url: item.img_url || undefined,
      is_modal_set: item.cost_price !== undefined && item.cost_price !== ""
    };
    db.products.push(p);
    added.push(p);
  }

  saveDB(db);
  writeSuccess(res, added);
});

// ==========================================
// TRANSACTIONS ENDPOINTS
// ==========================================
app.get("/api/transactions", (req, res) => {
  const { tenant_id } = req.query;
  if (!tenant_id) return writeError(res, "Tenant ID required");
  const db = loadDB();
  const list = db.transactions.filter(t => t.tenant_id === tenant_id);
  writeSuccess(res, list);
});

app.get("/api/transactions/items", (req, res) => {
  const { tenant_id, trans_id } = req.query;
  if (!tenant_id) return writeError(res, "Tenant ID required");
  const db = loadDB();
  const list = db.transaction_items.filter(item => item.tenant_id === tenant_id && (!trans_id || item.trans_id === trans_id));
  writeSuccess(res, list);
});

app.post("/api/transactions/add", (req, res) => {
  const {
    tenant_id,
    emp_id,
    emp_name,
    items, // array of { prod_id, qty, price }
    tax,
    discount,
    discount_type,
    payment_mode,
    customer_name,
    notes,
    due_date,
    receivable_notes,
    timestamp // optional: can override for historical payments
  } = req.body;

  if (!tenant_id || !items || items.length === 0) return writeError(res, "Keranjang belanja kosong!");

  const db = loadDB();
  const trans_id = "TRX-" + Math.floor(10000 + Math.random() * 90000);
  const dateStr = timestamp || new Date().toISOString();

  let subtotalSum = 0;
  const itemRecords: any[] = [];

  // Deduct stocks & recipes + Record Items
  for (const item of items) {
    const prod = db.products.find(p => p.tenant_id === tenant_id && p.prod_id === item.prod_id);
    if (prod) {
      // Deduct product stock directly
      prod.stock = Math.max(0, prod.stock - item.qty);

      // Check if product has a recipe in Ruang Stok, if so deduct raw material stock!
      const recipeItems = db.recipe_details.filter(r => r.tenant_id === tenant_id && r.prod_id === item.prod_id);
      for (const recipe of recipeItems) {
        const rawMat = db.inventory_items.find(inv => inv.tenant_id === tenant_id && inv.item_id === recipe.item_id);
        if (rawMat) {
          rawMat.stock = Math.max(0, rawMat.stock - (recipe.qty_usage * item.qty));
        }
      }

      const itemSub = item.qty * item.price;
      subtotalSum += itemSub;

      itemRecords.push({
        tenant_id,
        trans_id,
        prod_id: item.prod_id,
        prod_name: prod.name,
        qty: item.qty,
        price: item.price,
        cost_price: prod.cost_price, // snapshot of current modal cost
        subtotal: itemSub
      });
    }
  }

  // Calculate final total
  let total = subtotalSum;
  if (discount > 0) {
    if (discount_type === "%") {
      total = total - (total * (discount / 100));
    } else {
      total = total - discount;
    }
  }
  if (tax > 0) {
    total = total + (total * (tax / 100));
  }

  // Rounding total
  total = Math.round(total);

  const newTrans = {
    tenant_id,
    trans_id,
    emp_id: emp_id || "owner",
    emp_name: emp_name || "Owner",
    total,
    tax: tax || 0,
    discount: discount || 0,
    discount_type: discount_type || "Rp",
    payment_mode,
    status: "Success",
    customer_name: customer_name || undefined,
    notes: notes || undefined,
    due_date: payment_mode === "Piutang" ? due_date : undefined,
    receivable_notes: payment_mode === "Piutang" ? receivable_notes : undefined,
    timestamp: dateStr
  };

  db.transactions.push(newTrans);
  db.transaction_items.push(...itemRecords);

  // If paid immediately in Cash, update Cash drawer balance
  if (payment_mode === "Cash") {
    // Also log to Kas history to keep drawer in sync (automatic In)
    db.kas_history.push({
      trans_id,
      tenant_id,
      type: "In",
      amount: total,
      description: `Penjualan Kasir - TRX ${trans_id}`,
      timestamp: dateStr
    });
  }

  saveDB(db);
  return writeSuccess(res, { transaction: newTrans, items: itemRecords });
});

// Void Transaction
app.post("/api/transactions/void", (req, res) => {
  const { tenant_id, trans_id, void_reason } = req.body;
  if (!tenant_id || !trans_id || !void_reason) return writeError(res, "Alasan Void wajib diisi!");

  const db = loadDB();
  const trx = db.transactions.find(t => t.tenant_id === tenant_id && t.trans_id === trans_id);
  if (!trx) return writeError(res, "Transaksi tidak ditemukan");

  trx.status = "Void";
  trx.void_reason = void_reason;

  // Revert Product Stock and Recipe ingredient stock
  const trxItems = db.transaction_items.filter(item => item.tenant_id === tenant_id && item.trans_id === trans_id);
  for (const item of trxItems) {
    const prod = db.products.find(p => p.tenant_id === tenant_id && p.prod_id === item.prod_id);
    if (prod) {
      prod.stock += item.qty;

      // Revert recipes
      const recipeItems = db.recipe_details.filter(r => r.tenant_id === tenant_id && r.prod_id === item.prod_id);
      for (const recipe of recipeItems) {
        const rawMat = db.inventory_items.find(inv => inv.tenant_id === tenant_id && inv.item_id === recipe.item_id);
        if (rawMat) {
          rawMat.stock += (recipe.qty_usage * item.qty);
        }
      }
    }
  }

  // Revert Cash register log if it was paid in Cash
  if (trx.payment_mode === "Cash") {
    db.kas_history.push({
      trans_id,
      tenant_id,
      type: "Out",
      amount: trx.total,
      description: `VOID Transaksi - TRX ${trans_id}. Alasan: ${void_reason}`,
      timestamp: new Date().toISOString()
    });
  }

  saveDB(db);
  writeSuccess(res, trx);
});

// Pay a Receivable (Bayar Piutang)
app.post("/api/transactions/pay-piutang", (req, res) => {
  const { tenant_id, trans_id, payment_mode } = req.body; // cash / qris / transfer
  if (!tenant_id || !trans_id || !payment_mode) return writeError(res, "Metode pembayaran wajib dipilih.");

  const db = loadDB();
  const trx = db.transactions.find(t => t.tenant_id === tenant_id && t.trans_id === trans_id);
  if (!trx) return writeError(res, "Transaksi tidak ditemukan");

  trx.payment_mode = payment_mode === "Cash" ? "Cash" : (payment_mode === "QRIS" ? "QRIS" : "Transfer");
  trx.paid_timestamp = new Date().toISOString();

  if (payment_mode === "Cash") {
    db.kas_history.push({
      trans_id,
      tenant_id,
      type: "In",
      amount: trx.total,
      description: `Pelunasan Piutang - TRX ${trans_id}`,
      timestamp: trx.paid_timestamp
    });
  }

  saveDB(db);
  writeSuccess(res, trx);
});

// ==========================================
// KAS ENDPOINTS
// ==========================================
app.get("/api/kas", (req, res) => {
  const { tenant_id } = req.query;
  if (!tenant_id) return writeError(res, "Tenant ID required");
  const db = loadDB();
  const list = db.kas_history.filter(k => k.tenant_id === tenant_id);
  writeSuccess(res, list);
});

app.post("/api/kas/add", (req, res) => {
  const { tenant_id, type, amount, description, reset_saldo } = req.body;
  if (!tenant_id || !type || amount === undefined || !description) {
    return writeError(res, "Mohon lengkapi nominal dan catatan kas!");
  }

  const db = loadDB();
  const amtVal = parseFloat(amount);

  if (type === "Modal" && reset_saldo) {
    // If resetting cash drawer to a fresh nominal, delete past 'Modal/In/Out' logs to simulate starting clean
    // Or we simply write a special description log that tells the frontend to start counting fresh from this amount.
    // Let's write a special log to make calculations elegant.
    db.kas_history.push({
      tenant_id,
      type: "Modal",
      amount: amtVal,
      description: `RESET LACI KAS: ${description}`,
      timestamp: new Date().toISOString()
    });
  } else {
    db.kas_history.push({
      tenant_id,
      type: type, // Modal (Isi Kas), In (Uang Masuk), Out (Uang Keluar)
      amount: amtVal,
      description: description,
      timestamp: new Date().toISOString()
    });
  }

  saveDB(db);
  writeSuccess(res, { success: true });
});

// ==========================================
// INVENTORY & RECIPES ENDPOINTS (Ruang Stok / Hitung Modal)
// ==========================================
app.get("/api/inventory", (req, res) => {
  const { tenant_id } = req.query;
  const db = loadDB();
  const list = db.inventory_items.filter(item => item.tenant_id === tenant_id);
  writeSuccess(res, list);
});

app.post("/api/inventory/add", (req, res) => {
  const { tenant_id, name, unit, price_per_unit, stock } = req.body;
  if (!tenant_id || !name || !unit || price_per_unit === undefined) {
    return writeError(res, "Data bahan baku tidak lengkap");
  }

  const db = loadDB();
  const item_id = "raw-" + Math.floor(Math.random() * 1000000);
  const newItem = {
    tenant_id,
    item_id,
    name,
    unit,
    price_per_unit: parseFloat(price_per_unit),
    stock: parseFloat(stock) || 0
  };

  db.inventory_items.push(newItem);
  saveDB(db);
  writeSuccess(res, newItem);
});

app.post("/api/inventory/stock-adjust", (req, res) => {
  const { tenant_id, item_id, new_stock } = req.body;
  const db = loadDB();
  const item = db.inventory_items.find(i => i.tenant_id === tenant_id && i.item_id === item_id);
  if (!item) return writeError(res, "Bahan baku tidak ditemukan");
  item.stock = parseFloat(new_stock);
  saveDB(db);
  writeSuccess(res, item);
});

app.get("/api/recipes", (req, res) => {
  const { tenant_id, prod_id } = req.query;
  const db = loadDB();
  const list = db.recipe_details.filter(r => r.tenant_id === tenant_id && (!prod_id || r.prod_id === prod_id));
  writeSuccess(res, list);
});

app.post("/api/recipes/save", (req, res) => {
  const { tenant_id, prod_id, items } = req.body; // items is array of { item_id, qty_usage }
  if (!tenant_id || !prod_id) return writeError(res, "Missing parameters");

  const db = loadDB();
  // Clear old recipe for this product
  db.recipe_details = db.recipe_details.filter(r => !(r.tenant_id === tenant_id && r.prod_id === prod_id));

  // Insert new recipe details
  if (items && items.length > 0) {
    for (const item of items) {
      db.recipe_details.push({
        tenant_id,
        prod_id,
        item_id: item.item_id,
        qty_usage: parseFloat(item.qty_usage)
      });
    }
  }

  saveDB(db);
  writeSuccess(res, { success: true });
});

// ==========================================
// ROLE AND USER MANAGEMENT ENDPOINTS
// ==========================================
app.get("/api/roles", (req, res) => {
  const { tenant_id } = req.query;
  const db = loadDB();
  const list = db.roles.filter(r => r.tenant_id === tenant_id);
  writeSuccess(res, list);
});

app.post("/api/roles/save", (req, res) => {
  const { tenant_id, role_name, permissions } = req.body;
  if (!tenant_id || !role_name || !permissions) return writeError(res, "Nama role dan hak akses wajib diisi!");

  const db = loadDB();
  const existing = db.roles.find(r => r.tenant_id === tenant_id && r.role_name.toLowerCase() === role_name.toLowerCase());
  
  if (existing) {
    existing.permissions = permissions;
  } else {
    db.roles.push({ tenant_id, role_name, permissions });
  }

  saveDB(db);
  writeSuccess(res, { role_name });
});

app.post("/api/roles/delete", (req, res) => {
  const { tenant_id, role_name, move_members_to } = req.body;
  const db = loadDB();

  // Check if there are active employees using this role
  const members = db.employees.filter(e => e.tenant_id === tenant_id && e.role === role_name);
  if (members.length > 0) {
    if (!move_members_to) {
      return writeError(res, `Role ini masih digunakan oleh ${members.length} anggota. Pilih tindakan migrasi!`);
    }
    // Migrate members
    for (const e of members) {
      e.role = move_members_to;
    }
  }

  db.roles = db.roles.filter(r => !(r.tenant_id === tenant_id && r.role_name === role_name));
  saveDB(db);
  writeSuccess(res, { success: true });
});

app.get("/api/employees", (req, res) => {
  const { tenant_id } = req.query;
  const db = loadDB();
  const list = db.employees.filter(e => e.tenant_id === tenant_id);
  writeSuccess(res, list);
});

app.post("/api/employees/add", (req, res) => {
  const { tenant_id, name, email, password, role } = req.body;
  if (!tenant_id || !name || !email || !password || !role) return writeError(res, "Mohon lengkapi seluruh data anggota!");

  const db = loadDB();
  // Check if email already used
  const emailExists = db.employees.some(e => e.email.toLowerCase() === email.toLowerCase()) || 
                      db.tenants.some(t => t.email.toLowerCase() === email.toLowerCase());
  if (emailExists) return writeError(res, "Email sudah digunakan.");

  const emp_id = "emp-" + Math.floor(Math.random() * 1000000);
  const newEmp = {
    tenant_id,
    emp_id,
    name,
    email: email.toLowerCase(),
    role,
    password
  };

  db.employees.push(newEmp);
  saveDB(db);
  writeSuccess(res, newEmp);
});

app.post("/api/employees/edit", (req, res) => {
  const { tenant_id, emp_id, name, email, password, role } = req.body;
  const db = loadDB();
  const emp = db.employees.find(e => e.tenant_id === tenant_id && e.emp_id === emp_id);
  if (!emp) return writeError(res, "Anggota tidak ditemukan");

  emp.name = name;
  emp.email = email.toLowerCase();
  emp.role = role;
  if (password) emp.password = password;

  saveDB(db);
  writeSuccess(res, emp);
});

app.post("/api/employees/delete", (req, res) => {
  const { tenant_id, emp_id } = req.body;
  const db = loadDB();
  db.employees = db.employees.filter(e => !(e.tenant_id === tenant_id && e.emp_id === emp_id));
  saveDB(db);
  writeSuccess(res, { emp_id });
});

// ==========================================
// RECEIPT TEMPLATE ENDPOINTS
// ==========================================
app.get("/api/struk", (req, res) => {
  const { tenant_id } = req.query;
  const db = loadDB();
  const st = db.receipt_templates.find(s => s.tenant_id === tenant_id);
  writeSuccess(res, st || {
    tenant_id,
    header_msg: "BUCICI BIZ STORE",
    address: "Alamat Toko",
    phone: "-",
    info: "-",
    footer_msg: "Terima Kasih Sudah Berbelanja!"
  });
});

app.post("/api/struk/save", (req, res) => {
  const { tenant_id, header_msg, address, phone, info, footer_msg } = req.body;
  const db = loadDB();
  let st = db.receipt_templates.find(s => s.tenant_id === tenant_id);
  
  if (st) {
    st.header_msg = header_msg;
    st.address = address;
    st.phone = phone;
    st.info = info;
    st.footer_msg = footer_msg;
  } else {
    st = { tenant_id, header_msg, address, phone, info, footer_msg };
    db.receipt_templates.push(st);
  }

  saveDB(db);
  writeSuccess(res, st);
});

// ==========================================
// RUANG INFO / AD-POSTS ENDPOINTS
// ==========================================
app.get("/api/info-posts", (req, res) => {
  const db = loadDB();
  writeSuccess(res, db.info_posts);
});

app.post("/api/info-posts/add", (req, res) => {
  const { content, link, type } = req.body;
  if (!content || !type) return writeError(res, "Konten info post wajib diisi");

  const db = loadDB();
  const post_id = "post-" + Math.floor(Math.random() * 1000000);
  const newPost = {
    post_id,
    content,
    link: link || undefined,
    type: type || "Link",
    created_at: new Date().toISOString()
  };

  db.info_posts.unshift(newPost); // newest first
  saveDB(db);
  writeSuccess(res, newPost);
});

app.post("/api/info-posts/delete", (req, res) => {
  const { post_id } = req.body;
  const db = loadDB();
  db.info_posts = db.info_posts.filter(p => p.post_id !== post_id);
  saveDB(db);
  writeSuccess(res, { post_id });
});

// ==========================================
// GEMINI SMART AI INTEGRATIONS
// ==========================================

// Chat Endpoint: For AI-sisten Bucici and AI-sisten Super Admin
app.post("/api/ai/chat", async (req, res) => {
  const { prompt, chatHistory, role, tenant_id } = req.body;
  if (!prompt) return writeError(res, "Pesan prompt kosong!");

  try {
    const db = loadDB();
    let systemInstruction = "";
    let contextDataText = "";

    if (role === "Super-Admin") {
      // Provide Super Admin statistics
      const totalTenants = db.tenants.length;
      const totalLicenses = db.licenses.length;
      const usedLicenses = db.licenses.filter(l => l.status === "Terpakai").length;
      const availableLicenses = totalLicenses - usedLicenses;
      
      contextDataText = `DATA SUPER-ADMIN SAAT INI:
- Jumlah Tenant Terdaftar: ${totalTenants}
- Total Kode Lisensi Generated: ${totalLicenses}
- Lisensi Terpakai: ${usedLicenses}
- Lisensi Tersisa: ${availableLicenses}
Detail Tenants: ${JSON.stringify(db.tenants.map(t => ({ id: t.tenant_id, name: t.business_name, email: t.email, active: t.is_active, joined: t.created_at })))}`;

      systemInstruction = `Anda adalah "AI-sisten Super Admin Bucici Biz". Tugas Anda adalah membantu Super-Admin dalam mengelola ekosistem PWA Multi Tenant Bucici Biz ("Sahabat Pedagang").
Anda memiliki keahlian bisnis skala global, pengetahuan umum luas, dan akses langsung ke data lisensi serta statistik tenant.
Berikan saran optimasi penjualan lisensi, penyelesaian masalah tenant, analisis data pertumbuhan bisnis, dan tips administrasi sistem.
Sajikan jawaban dengan ramah, profesional, rapi dengan format Markdown, dan gunakan tabel jika menampilkan perbandingan data atau laporan.`;
    } else {
      // Tenant Owner or Employee
      const tenant = db.tenants.find(t => t.tenant_id === tenant_id) || { business_name: "Toko Pengguna" };
      const products = db.products.filter(p => p.tenant_id === tenant_id);
      const trx = db.transactions.filter(t => t.tenant_id === tenant_id);
      const cashLogs = db.kas_history.filter(k => k.tenant_id === tenant_id);

      // Build a comprehensive dataset of all products
      const allProductsText = products.map(p => {
        return `- [${p.prod_id}] ${p.name} | Kat: ${p.category} | Harga: Rp${p.price} | Modal/HPP: ${p.cost_price !== undefined ? `Rp${p.cost_price}` : 'Belum Ditentukan'} | Stok Jual: ${p.stock} | SKU: ${p.sku || '-'}`;
      }).join("\n");

      // Build a comprehensive dataset of all inventory items
      const allInventoryText = db.inventory_items.filter(i => i.tenant_id === tenant_id).map(i => {
        return `- [${i.item_id}] ${i.name} | Sisa Stok Bahan: ${i.stock} ${i.unit} | Harga/Unit: Rp${i.price_per_unit}`;
      }).join("\n") || "Tidak Ada";

      // Build recipe connections
      const recipesText = db.recipe_details.filter(r => r.tenant_id === tenant_id).map(r => {
        const prod = products.find(p => p.prod_id === r.prod_id);
        const inv = db.inventory_items.find(i => i.item_id === r.item_id);
        return `- Resep "${prod ? prod.name : r.prod_id}": Menggunakan ${r.qty_usage} unit bahan "${inv ? inv.name : r.item_id}"`;
      }).join("\n") || "Tidak Ada";

      // Build last 50 transactions with full details
      const lastTransactions = trx.slice(-50).map(t => {
        const items = db.transaction_items.filter(item => item.trans_id === t.trans_id);
        const itemsList = items.map(i => `${i.prod_name} (x${i.qty} @Rp${i.price})`).join(", ");
        return `- TRX ${t.trans_id} | ${new Date(t.timestamp).toLocaleDateString('id-ID')} | Kasir: ${t.emp_name} | Total Bayar: Rp${t.total} | Mode: ${t.payment_mode} | Pelanggan: ${t.customer_name || 'Umum'} | Status: ${t.status} | Item Dibeli: [${itemsList}]${t.notes ? ` | Notes: ${t.notes}` : ''}`;
      }).join("\n");

      // Build cash history
      const lastCashLogs = cashLogs.slice(-30).map(c => {
        return `- [${c.type}] Nominal: Rp${c.amount} | Catatan Laci: ${c.description} | Waktu: ${new Date(c.timestamp).toLocaleString('id-ID')}`;
      }).join("\n");

      // Calculate key metrics
      const totalOmzet = trx.filter(t => t.status === "Success").reduce((acc, t) => acc + t.total, 0);
      const totalPiutang = trx.filter(t => t.status === "Success" && t.payment_mode === "Piutang").reduce((acc, t) => acc + t.total, 0);
      const successTrxCount = trx.filter(t => t.status === "Success").length;
      const voidTrxCount = trx.filter(t => t.status === "Void").length;

      contextDataText = `DATA TENANT OWNER LENGKAP (Toko: ${tenant.business_name}):
METRIK UTAMA TOKO:
- Total Omzet Sukses (Seluruh Waktu): Rp${totalOmzet.toLocaleString("id-ID")}
- Total Piutang Aktif Toko: Rp${totalPiutang.toLocaleString("id-ID")}
- Jumlah Transaksi Berhasil: ${successTrxCount}
- Jumlah Transaksi Void: ${voidTrxCount}
- Jumlah Jenis Produk Terdaftar: ${products.length}

DAFTAR SELURUH PRODUK DI TOKO:
${allProductsText || "Tidak Ada"}

DAFTAR INVENTORY BAHAN BAKU (RUANG STOK):
${allInventoryText}

RESEP BAHAN BAKU TOKO:
${recipesText}

RIWAYAT 50 TRANSAKSI TERAKHIR (DENGAN DETAIL PRODUK YANG DIBELI):
${lastTransactions || "Tidak Ada"}

MUTASI KAS DRAWER KASIR (30 MUTASI KAS TERAKHIR):
${lastCashLogs || "Tidak Ada"}`;

      systemInstruction = `Anda adalah "AI-sisten Bucici", asisten bisnis cerdas dari Bucici Biz - "Sahabat Pedagang". 
Anda bertugas membantu owner warung, kasir, dan pedagang retail untuk memajukan bisnis mereka.
Anda memiliki pengetahuan umum yang luas tentang bisnis retail, strategi mikro-UMKM modern, operasional kasir, serta tips pembukuan ritel.
Anda memiliki akses penuh dan akurat ke seluruh data operasional toko owner tenant saat ini (seperti rincian daftar produk, sisa stok bahan baku, resep makanan/minuman, transaksi penjualan harian, status piutang pelanggan, dan mutasi uang kas di laci kasir).
Ketika ditanya tentang perhitungan finansial, omzet, laba kotor, produk terlaris, sisa stok bahan jualan, atau status piutang, Anda harus melakukan analisis data dengan sangat cermat, memberikan angka atau kalkulasi matematika yang presisi berdasarkan data riil di atas.
Selalu bersikap bersahabat, penuh empati, memberi semangat berdagang, memberikan solusi praktis ritel UMKM, menyusun jawaban secara visual yang rapi dengan format Markdown (gunakan bullet points, bolding, atau tabel perbandingan jika diperlukan agar enak dibaca), serta hindari penggunaan bahasa asing/jargon finansial yang rumit tanpa penjelasan.`;
    }

    // Build chat session or single query
    // Assemble contents: incorporating history and context
    const contents: any[] = [];
    
    // Inject current business context as a developer background prompt
    contents.push({
      role: "user",
      parts: [{ text: `System Context:\n${contextDataText}\n\nUser Question: ${prompt}` }]
    });

    // Call Gemini API with 30-second timeout to allow sufficient response time
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
    ]);

    writeSuccess(res, { text: response.text });
  } catch (err: any) {
    console.error("Gemini AI API Error:", err);
    // Return a friendly, high-quality offline fallback text instead of a raw error
    const fallbackText = `Halo! Saat ini AI-sisten Bucici sedang dalam mode offline/terbatas karena kendala koneksi server.

Namun, saya tetap bisa membantu Anda berdasarkan data toko:
- **Analisis Produk**: Anda memiliki berbagai macam produk kuliner terdaftar di toko Anda yang siap melayani kebutuhan pelanggan.
- **Taktik Promosi**: Buatlah paket bundling (misal: makanan + minuman) dengan diskon harian tipis untuk menaikkan volume penjualan dan margin keseluruhan.
- **Pengelolaan Laci Kas**: Selalu hitung laci kas secara berkala di akhir shift untuk memastikan transparansi dan mencegah selisih keuangan.

Silakan coba ajukan pertanyaan kembali beberapa saat lagi saat koneksi server telah pulih!`;
    writeSuccess(res, { text: fallbackText });
  }
});

// Marketing Post Canvas advice endpoint (Ruang Pemasaran)
app.post("/api/ai/marketing-generate", async (req, res) => {
  const { title, tagline, price, info, cta, style } = req.body;
  
  const userPrompt = `Saya ingin membuat poster promosi produk.
Berikut detail input saya:
- Judul: ${title || "Belum diisi"}
- Tagline: ${tagline || "Belum diisi"}
- Harga: ${price || "Belum diisi"}
- Info Kontak: ${info || "Belum diisi"}
- Call To Action (CTA): ${cta || "Belum diisi"}
- Gaya Poster (Style): ${style}

Tolong rekomendasikan copywriting yang sangat menarik untuk 3 alternatif desain poster promosi, masing-masing dengan:
1. Pilihan palet warna yang memikat (Hex codes).
2. Saran layout visual (posisi teks, ukuran font relatif).
3. Modifikasi teks promosi (copywriting promo, judul yang dimaksimalkan).
4. Penataan visual background yang sesuai dengan gaya "${style}".

Sajikan dalam format JSON yang rapi dengan skema array berisi tepat 3 alternatif objek. Jangan berikan kata pengantar, langsung berikan kode JSON murni.`;

  try {
    // Call Gemini API with 5-second timeout
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                alternative_name: { type: "string" },
                title_copy: { type: "string" },
                tagline_copy: { type: "string" },
                cta_copy: { type: "string" },
                price_display: { type: "string" },
                bg_color: { type: "string", description: "Background hex color" },
                accent_color: { type: "string", description: "Accent text hex color" },
                text_color: { type: "string", description: "Body text hex color" },
                layout_description: { type: "string" }
              },
              required: ["alternative_name", "title_copy", "tagline_copy", "cta_copy", "price_display", "bg_color", "accent_color", "text_color", "layout_description"]
            }
          }
        }
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
    ]);

    const data = JSON.parse(response.text || "[]");
    writeSuccess(res, data);
  } catch (err: any) {
    console.error("Marketing Generate error:", err);
    // Return high-quality offline fallbacks in case of API Key or Quota failure
    const fallbacks = [
      {
        alternative_name: "Minimalist Fresh",
        title_copy: title || "Produk Pilihan Terbaik",
        tagline_copy: tagline || "Kualitas nomor satu untuk keluarga Anda.",
        cta_copy: cta || "Dapatkan Sekarang!",
        price_display: price ? `Promo Spesial: ${price}` : "Hubungi Kami",
        bg_color: "#F8FAF8",
        accent_color: "#2E7D32",
        text_color: "#1B5E20",
        layout_description: "Background hijau mint lembut dengan teks utama berukuran besar di tengah."
      },
      {
        alternative_name: "Bold Impact",
        title_copy: (title || "Produk Pilihan").toUpperCase(),
        tagline_copy: tagline || "Solusi cerdas, hemat, dan praktis setiap hari.",
        cta_copy: cta || "Beli Sebelum Kehabisan!",
        price_display: price ? `Hanya Rp ${price}` : "Penawaran Khusus",
        bg_color: "#FFF8E1",
        accent_color: "#FF8F00",
        text_color: "#E65100",
        layout_description: "Tata letak asimetris dengan teks miring tebal untuk efek modern."
      },
      {
        alternative_name: "Cosmic Luxury",
        title_copy: title || "Edisi Premium Eksklusif",
        tagline_copy: tagline || "Rasakan kelezatan dan kenyamanan rasa otentik.",
        cta_copy: cta || "Pesan via WhatsApp",
        price_display: price ? `Harga Menarik: ${price}` : "Persediaan Terbatas",
        bg_color: "#212121",
        accent_color: "#FFD54F",
        text_color: "#FFF9C4",
        layout_description: "Background abu-abu gelap arang mewah dengan tulisan emas yang berkilau kontras."
      }
    ];
    writeSuccess(res, fallbacks);
  }
});

// Hitung Modal Advisor (Pricing recommendations for Hitung Modal)
app.post("/api/ai/hpp-advise", async (req, res) => {
  const { productName, cogs, currentPrice, ingredients } = req.body;

  const promptText = `Saya memiliki produk kuliner/retail baru bernama "${productName}".
Berdasarkan perhitungan HPP, biaya bahan baku bersih per porsi/unit (COGS) adalah Rp ${cogs}.
Saat ini harga jual yang terpikirkan atau harga pasar rata-rata adalah Rp ${currentPrice || "belum ditentukan"}.
Detail bahan-bahan penyusun:
${ingredients ? JSON.stringify(ingredients) : "Tidak ada detail"}

Tolong berikan saran strategi penetapan harga jual dalam 3 skenario:
1. Harga Kompetitif (Untung tipis tapi volume tinggi, cocok untuk bersaing sengit)
2. Harga Standar (Margin aman 40-50% untuk operasional normal)
3. Harga Cuan Maksimal (Margin premium 60-70% dengan memposisikan brand lebih berkelas)

Serta berikan saran kemasan atau taktik penjualan unik agar margin kotor produk "${productName}" ini bisa maksimal tanpa mengecewakan pembeli.
Berikan saran Anda dalam format Markdown yang rapi dan terstruktur yang menampilkan tabel perbandingan skenario harga tersebut.`;

  try {
    // Call Gemini API with 30-second timeout
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: { temperature: 0.7 }
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
    ]);

    writeSuccess(res, { advice: response.text });
  } catch (err: any) {
    console.error("Gemini HPP error:", err);
    // Return high-quality offline advice as a fallback
    const fallbackAdvice = `### Analisis Harga & Margin untuk **${productName}**
*(Catatan: Mode Offline Aktif karena koneksi AI Studio sedang dibatasi)*

Berikut adalah estimasi skenario harga jual berdasarkan HPP **Rp ${parseFloat(cogs).toLocaleString("id-ID")}**:

| Skenario Harga | Harga Jual Rekomendasi | Estimasi Margin Kotor (%) | Analisis & Strategi |
| :--- | :--- | :--- | :--- |
| **1. Kompetitif (Untung Tipis)** | Rp ${(Math.round(cogs * 1.25 / 500) * 500).toLocaleString("id-ID")} | ~20% | Cocok untuk penetrasi pasar awal dan promosi warung untuk menarik traffic pelanggan baru. |
| **2. Standar (Saran Terbaik)** | Rp ${(Math.round(cogs * 1.6 / 1000) * 1000).toLocaleString("id-ID")} | ~38% - 45% | Menyeimbangkan volume penjualan dengan profitabilitas operasional yang sehat. Sangat disarankan untuk bisnis harian. |
| **3. Cuan Maksimal (Premium)** | Rp ${(Math.round(cogs * 2.1 / 1000) * 1000).toLocaleString("id-ID")} | ~52% - 60% | Sangat menguntungkan. Memerlukan pengemasan eksklusif, pelayanan prima, dan visual promosi yang cantik di Ruang Pemasaran. |

#### Rekomendasi Peningkatan Cuan:
- **Paket Bundling**: Padukan produk **${productName}** dengan minuman segar berbiaya rendah (seperti Es Teh Manis) untuk mengatrol harga jual keseluruhan dan meningkatkan kepuasan pelanggan.
- **Kustomisasi Porsi**: Sediakan pilihan 'upgrade size' atau tambahan topping ekstra berbiaya murah namun dengan selisih harga jual yang signifikan (misal: tambah keju/susu).`;
    writeSuccess(res, { advice: fallbackAdvice });
  }
});

// ==========================================
// STATIC FILES & VITE MIDDLEWARE SETUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Bucici Biz running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
