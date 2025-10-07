import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msmlfjwskkabzfwhurzk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbWxmandza2thYnpmd2h1cnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTIzODksImV4cCI6MjA3NTQyODM4OX0.DX3KQRRXjIMvEvbA4mIJC7gJ-vg6uTay8jaUDbnCie4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
