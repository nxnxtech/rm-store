const SUPABASE_URL = 'https://brjawbihtqvnhsrzgewt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HL7rmcPRGpbwYV6u_M-JYg_PH9PgoN3';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

supabase = supabaseClient;

const SUPABASE_STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/rm-store-assets/`;

function storageUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SUPABASE_STORAGE_BASE}${path.replace(/^\/+/, '')}`;
}