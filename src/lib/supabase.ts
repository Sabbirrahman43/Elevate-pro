import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xfuwgvpsqbllprevtfqt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdXdndnBzcWJsbHByZXZ0ZnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTg2NDAsImV4cCI6MjA5MjA5NDY0MH0.E80p1famgUAyCy6PiqEmDvagbWVZud4xEm1ggsOhC48";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
