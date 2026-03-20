/**
 * supabase.js — Supabase Client Module
 * 
 * Membuat dan mengekspor satu instance Supabase client.
 * Client ini digunakan oleh accounts.js untuk CRUD ke database.
 * 
 * Kenapa pakai anon key langsung di code?
 * - anon key = public key, aman di frontend (sama seperti Firebase API key)
 * - Keamanan diatur via Row Level Security (RLS) di Supabase
 * - Untuk app pribadi ini, RLS di-disable supaya simpel
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
