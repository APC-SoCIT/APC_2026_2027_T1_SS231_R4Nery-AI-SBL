-- SQL Schema for AI for ALL Stories Table
-- Run this in your Supabase SQL Editor (https://app.supabase.com)

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Starter',
  type TEXT NOT NULL DEFAULT 'choices_only', -- 'choices_only' | 'with_activity'
  status TEXT NOT NULL DEFAULT 'Published', -- 'Draft' | 'Published'
  description TEXT,
  color TEXT DEFAULT '#79a8ff',
  image TEXT,
  skills_build_url TEXT,
  skills_build_button_text TEXT,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  activity JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) and allow public read access
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access on stories" ON stories
  FOR ALL USING (true);
