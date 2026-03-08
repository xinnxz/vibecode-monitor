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

const SUPABASE_URL = 'https://ummjskjiashcbngqpjil.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbWpza2ppYXNoY2JuZ3FwamlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDc3NTUsImV4cCI6MjA4ODQ4Mzc1NX0.1iK0uQuqgfQMQAUFyP24C_4iVqkKifV2vTtwOMkk6ak';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
