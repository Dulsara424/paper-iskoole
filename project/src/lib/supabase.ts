import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'student';
  created_at: string;
  updated_at: string;
};

export type ExamPaper = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  grade_level: string | null;
  year: number | null;
  price: number;
  file_url: string;
  preview_url: string | null;
  uploaded_by: string | null;
  download_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  paper_id: string;
  amount_paid: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  purchased_at: string;
};
