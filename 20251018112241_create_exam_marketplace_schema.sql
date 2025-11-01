/*
  # Exam Paper Marketplace Database Schema

  ## Overview
  This migration creates a complete database schema for an online exam paper marketplace where admins can upload papers and students can purchase and download them.

  ## 1. New Tables
    
    ### `profiles`
    - `id` (uuid, primary key, references auth.users)
    - `email` (text, not null)
    - `full_name` (text)
    - `role` (text, default 'student') - either 'admin' or 'student'
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())
    
    ### `exam_papers`
    - `id` (uuid, primary key)
    - `title` (text, not null) - Name of the exam paper
    - `description` (text) - Detailed description
    - `subject` (text, not null) - Subject category
    - `grade_level` (text) - Grade or level
    - `year` (integer) - Year of the exam
    - `price` (decimal, not null) - Price in dollars
    - `file_url` (text, not null) - Storage URL for the PDF
    - `preview_url` (text) - Optional preview/thumbnail
    - `uploaded_by` (uuid, references profiles) - Admin who uploaded
    - `download_count` (integer, default 0)
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())
    
    ### `purchases`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references profiles, not null)
    - `paper_id` (uuid, references exam_papers, not null)
    - `amount_paid` (decimal, not null)
    - `stripe_payment_intent_id` (text) - Stripe transaction reference
    - `status` (text, default 'pending') - pending, completed, failed
    - `purchased_at` (timestamptz, default now())
    - Unique constraint on (user_id, paper_id) to prevent duplicate purchases

  ## 2. Security (Row Level Security)
    
    ### Profiles Table
    - Enable RLS
    - Users can read their own profile
    - Users can update their own profile (except role)
    - Admins can read all profiles
    
    ### Exam Papers Table
    - Enable RLS
    - Everyone can view active papers (for browsing)
    - Only admins can insert/update/delete papers
    
    ### Purchases Table
    - Enable RLS
    - Users can view their own purchases
    - Users can create purchases for themselves
    - Admins can view all purchases

  ## 3. Storage
    - Create storage bucket for exam papers
    - Set up access policies for authenticated uploads and purchases

  ## 4. Indexes
    - Index on exam_papers(subject, grade_level) for filtering
    - Index on purchases(user_id) for user purchase history
    - Index on purchases(paper_id) for paper statistics
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exam_papers table
CREATE TABLE IF NOT EXISTS exam_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text NOT NULL,
  grade_level text,
  year integer,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  file_url text NOT NULL,
  preview_url text,
  uploaded_by uuid REFERENCES profiles(id),
  download_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  paper_id uuid REFERENCES exam_papers(id) ON DELETE CASCADE NOT NULL,
  amount_paid decimal(10,2) NOT NULL,
  stripe_payment_intent_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, paper_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject_grade ON exam_papers(subject, grade_level);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_paper_id ON purchases(paper_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Exam papers policies
CREATE POLICY "Anyone can view active papers"
  ON exam_papers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert papers"
  ON exam_papers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update papers"
  ON exam_papers FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete papers"
  ON exam_papers FOR DELETE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Purchases policies
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own purchases"
  ON purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Create storage bucket for exam papers
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-papers', 'exam-papers', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload exam papers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exam-papers' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can download purchased papers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exam-papers' AND
    EXISTS (
      SELECT 1 FROM purchases p
      JOIN exam_papers ep ON p.paper_id = ep.id
      WHERE p.user_id = auth.uid()
      AND p.status = 'completed'
      AND ep.file_url LIKE '%' || storage.objects.name || '%'
    )
  );

CREATE POLICY "Admins can view all papers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exam-papers' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();