export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  total: number;
  savings_goal: number;
  alert_email: string | null;
  alert_threshold_pct: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export type CategoryType = "ingreso" | "egreso" | "ambos";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_default: boolean;
  created_at: string;
}

export type TransactionType = "ingreso" | "egreso" | "ahorro";

export type PaymentMethod =
  | "Efectivo"
  | "Débito"
  | "Crédito"
  | "Transferencia"
  | "Yape/Plin"
  | "Otro";

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  detail: string | null;
  bank: string | null;
  payment_method: PaymentMethod;
  owner: string | null;
  receipt_url: string | null;
  ai_extracted: boolean;
  date: string;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface AlertHistory {
  id: string;
  user_id: string;
  type: string | null;
  subject: string | null;
  sent_to: string | null;
  sent_at: string;
  success: boolean;
  budget_remaining: number | null;
  budget_pct_left: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
  timestamp: string;
  transaction?: Transaction | null;
}

export interface DashboardStats {
  total_budget: number;
  total_spent: number;
  total_income: number;
  savings: number;
  remaining: number;
  pct_used: number;
}

export interface CategoryStat {
  category: Category | null;
  amount: number;
  percentage: number;
}

export interface ChartDataPoint {
  month: string;
  ingresos: number;
  egresos: number;
}
