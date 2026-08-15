export type Role = 'admin' | 'viewer';

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export interface Store {
  Customer: string;
  Store_ID_Customer: string;
  STORE_ID: string;
  STORE_NAME: string;
  Store_Name_TH: string;
  Province_TH: string;
  Region_TH: string;
  Active_Inactive: 'Active' | 'Not active';
}

export interface ProductModel {
  Model: string;
  Brand: string;
  Category: string;
  SubCategory: string;
  Active_Inactive: 'Active' | 'Not active';
  Remark?: string;
  Update_by?: string;
  Update_date?: string;
}

export interface DisplayEntry {
  id: number;
  store_id: string;
  user_name: string;
  user_phone: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  Customer?: string;
  Store_Name_TH?: string;
  Province_TH?: string;
  Region_TH?: string;
  total_models?: number;
  total_qty?: number;
}

export interface DisplayEntryItem {
  id: number;
  entry_id: number;
  model: string;
  qty: number;
  updated_at: string;
  // Joined fields
  Brand?: string;
  Category?: string;
  SubCategory?: string;
}

export interface DimensionLog {
  id: number;
  user_name: string;
  action: string;
  dimension_type: 'store' | 'model';
  details: string;
  created_at: string;
}
