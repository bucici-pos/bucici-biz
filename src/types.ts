/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Tenant {
  tenant_id: string;
  business_name: string;
  owner_name: string;
  email: string;
  address: string;
  header_msg: string;
  footer_msg: string;
  created_at: string;
  subscription_type: string;
  expiry_date: string;
  token_balance: number;
  is_active: boolean;
}

export interface MasterLicense {
  license_code: string;
  status: 'Tersedia' | 'Terpakai';
  tenant_id?: string;
  batch_name?: string;
  created_at: string;
}

export interface Role {
  tenant_id: string;
  role_name: string;
  permissions: string[]; // Access items: e.g. "POS", "Riwayat", "Rekapan", "Kas", "Manajemen", "Struk", "AI-sisten"
}

export interface Employee {
  tenant_id: string;
  emp_id: string;
  name: string;
  email: string;
  role: string; // role name
  password?: string;
}

export interface Product {
  tenant_id: string;
  prod_id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  cost_price?: number; // Harga Modal (optional, used for Gross Profit)
  sku?: string;
  img_url?: string;
  is_modal_set: boolean;
}

export interface Transaction {
  tenant_id: string;
  trans_id: string;
  emp_id: string; // can be "owner" or employee ID
  emp_name: string;
  total: number;
  tax: number; // percentage, e.g. 10
  discount: number; // amount
  discount_type: 'Rp' | '%';
  payment_mode: 'Cash' | 'QRIS' | 'Transfer' | 'Piutang';
  status: 'Success' | 'Void';
  void_reason?: string;
  customer_name?: string;
  notes?: string;
  due_date?: string; // for "Bayar Nanti" (Piutang)
  receivable_notes?: string;
  timestamp: string; // ISO String
  paid_timestamp?: string; // when "Piutang" is fully paid
}

export interface TransactionItem {
  tenant_id: string;
  trans_id: string;
  prod_id: string;
  prod_name: string;
  qty: number;
  price: number;
  cost_price?: number; // Snapshot of cost_price at transaction time
  subtotal: number;
}

export interface KasHistory {
  trans_id?: string;
  tenant_id: string;
  type: 'In' | 'Out' | 'Modal'; // Modal matches "Isi Kas"
  amount: number;
  description: string;
  timestamp: string;
}

export interface InventoryItem {
  tenant_id: string;
  item_id: string;
  name: string;
  unit: 'gram' | 'pcs' | 'ml';
  price_per_unit: number;
  stock: number; // Raw material stock levels
}

export interface RecipeDetail {
  tenant_id: string;
  prod_id: string;
  item_id: string;
  qty_usage: number; // qty of inventory items used for 1 product unit
}

export interface InfoPost {
  post_id: string;
  content: string;
  link?: string;
  type: 'YouTube' | 'Link';
  created_at: string;
}

export interface SessionData {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'Super-Admin' | 'Owner' | 'Employee';
    tenant_id?: string;
    permissions?: string[];
  } | null;
}
