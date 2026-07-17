const SUPABASE_URL = 'https://brjawbihtqvnhsrzgewt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HL7rmcPRGpbwYV6u_M-JYg_PH9PgoN3';

let sb = null;
let SUPABASE_CONFIG_ERROR = null;
const PRODUCT_IMAGE_BUCKET = 'rm-store-products'; // must match an existing public bucket in Supabase Storage
try {
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    throw new Error('Supabase is not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY at the top of admin.js.');
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  SUPABASE_CONFIG_ERROR = e.message;
  console.error(e.message);
}

const LS_ONBOARD = 'rm_admin_onboarded_v1';

/* ---------------- Icons ---------------- */
const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18 8.49 4.24a1 1 0 0 1 0 1.79l-8.49 4.24a2 2 0 0 1-1.79 0L2.55 8.21a1 1 0 0 1 0-1.79l8.49-4.24a2 2 0 0 1 1.79 0Z"/><path d="m2.55 13.21 8.49 4.24a2 2 0 0 0 1.79 0l8.49-4.24"/></svg>',
  collections: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',
  shipping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
  regions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  reviews: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  comments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  faq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 4.02L6 9l4.1 1.98L12 15l1.9-4.02L18 9l-4.1-1.98Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12.5" y="8" width="3" height="10"/><rect x="18" y="5" width="3" height="13"/></svg>'
};
function icon(name, cls) { return `<span class="icon ${cls||''}">${ICONS[name] || ''}</span>`; }
function stars(n) { n = Number(n) || 0; return Array.from({length:5}, (_,i) => `<span class="icon star-icon ${i<n?'filled':'empty'}">${ICONS.star}</span>`).join(''); }
function hydrateIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    if (!el.dataset.iconSet) { el.innerHTML = ICONS[el.dataset.icon] || ''; el.dataset.iconSet = '1'; }
  });
}
document.addEventListener('DOMContentLoaded', hydrateIcons);
if (document.readyState !== 'loading') hydrateIcons();

/* ---------------- Supabase table map ---------------- */
const TABLE_MAP = {
  users:       { table: 'rm_store_users',            order: 'joined',     asc: false, secondary: 'id', searchFields: ['name','email'] },
  categories:  { table: 'rm_store_categories',        order: 'sort_order', asc: true, key: 'id', secondary: 'id' },
  collections: { table: 'rm_store_collections',       order: 'sort_order', asc: true, key: 'id', secondary: 'id' },
  products:    { table: 'rm_store_products',          order: 'created_at', asc: false, secondary: 'id', searchFields: ['name'] },
  orders:      { table: 'rm_store_orders',            order: 'created_at', asc: false, secondary: 'id', searchFields: ['order_number','customer_name'] },
  shipping:    { table: 'rm_store_shipping_rates',    order: 'region',     asc: true, key: 'region' },
  regions:     { table: 'rm_store_regions',            order: 'region',    asc: true, secondary: 'id' },
  reviews:     { table: 'rm_store_product_reviews',   order: 'created_at', asc: false, secondary: 'id' },
  comments:    { table: 'rm_store_comments',          order: 'created_at', asc: false, secondary: 'id' },
  messages:    { table: 'rm_store_messages',          order: 'created_at', asc: false, secondary: 'id' },
  faq:         { table: 'rm_store_faq',               order: 'sort_order', asc: true, secondary: 'id' },
  instagram:   { table: 'rm_store_instagram_posts',   order: 'sort_order', asc: true, secondary: 'id' },
  settings:    { table: 'rm_store_site_settings',     order: 'key',        asc: true, key: 'key' }
};

const PAGE_SIZE = 10;
let PAGINATION = {};
let LOOKUP = { categories: [], collections: [], regions: [] };

async function loadLookups() {
  const [cats, cols, regs] = await Promise.all([
    sb.from('rm_store_categories').select('id, name').order('name'),
    sb.from('rm_store_collections').select('id, name').order('name'),
    sb.from('rm_store_regions').select('id, region').order('region')
  ]);
  LOOKUP.categories = cats.data || [];
  LOOKUP.collections = cols.data || [];
  LOOKUP.regions = regs.data || [];
}

async function loadPage(key, opts = {}) {
  const cfg = TABLE_MAP[key];
  const state = PAGINATION[key] || (PAGINATION[key] = { page: 0, total: 0, search: '' });
  if (opts.page !== undefined) state.page = opts.page;
  if (opts.search !== undefined) state.search = opts.search;
  const from = state.page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = sb.from(cfg.table).select('*', { count: 'exact' }).order(cfg.order, { ascending: cfg.asc });
  if (cfg.secondary) query = query.order(cfg.secondary, { ascending: true });
  if (state.search && cfg.searchFields && cfg.searchFields.length) {
    const term = state.search.replace(/[%,]/g, '');
    query = query.or(cfg.searchFields.map(f => `${f}.ilike.%${term}%`).join(','));
  }
  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) { console.error(`Error loading ${cfg.table}:`, error); toast(`Failed to load ${key}`); return; }
  DB[key] = data || [];
  state.total = count || 0;

  if (key === 'orders' && DB.orders.length) {
    const ids = DB.orders.map(o => o.id);
    const { data: items, error: itemsError } = await sb
      .from('rm_store_order_items')
      .select('*')
      .in('order_id', ids);
    if (itemsError) {
      console.error('Error loading order items:', itemsError);
    } else {
      DB.orderItems = {};
      (items || []).forEach(it => {
        (DB.orderItems[it.order_id] = DB.orderItems[it.order_id] || []).push(it);
      });
    }
  }
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay || 350); };
}

let DB = {
  users: [], categories: [], collections: [], products: [], orders: [], shipping: [],
  regions: [], reviews: [], comments: [], messages: [], faq: [], instagram: [], settings: [],
  orderItems: {}
};

async function refreshTable(key) {
  await loadPage(key, {});
  if (key === 'categories' || key === 'collections' || key === 'regions') await loadLookups();
}

async function loadAllData() {
  const keys = Object.keys(TABLE_MAP);
  await Promise.all([...keys.map(k => loadPage(k, { page: 0, search: '' })), loadLookups()]);
}

const RENDER_FN = {
  users: () => renderUsers(), categories: () => renderCategories(), collections: () => renderCollections(),
  products: () => renderProducts(), orders: () => renderOrders(), shipping: () => renderShipping(),
  regions: () => renderRegions(), reviews: () => renderReviews(), comments: () => renderComments(),
  messages: () => renderMessages(), faq: () => renderFaq(), instagram: () => renderInsta(), settings: () => renderSettings()
};

function renderSection(key) { RENDER_FN[key](); renderPaginationFor(key); }

function renderPaginationFor(key) {
  const el = document.getElementById(key + 'Pagination');
  if (!el) return;
  const st = PAGINATION[key] || { page: 0, total: 0 };
  const totalPages = Math.max(1, Math.ceil(st.total / PAGE_SIZE));
  el.innerHTML = `
    <span class="pagination-info">${st.total} item${st.total === 1 ? '' : 's'} · Page ${st.page + 1} of ${totalPages}</span>
    <div class="pagination-btns">
      <button class="btn-icon" onclick="changePage('${key}',-1,this)" ${st.page <= 0 ? 'disabled' : ''} title="Previous page">${icon('chevronLeft')}</button>
      <button class="btn-icon" onclick="changePage('${key}',1,this)" ${st.page >= totalPages - 1 ? 'disabled' : ''} title="Next page">${icon('chevronRight')}</button>
    </div>`;
}

async function changePage(key, dir, btn) {
  const st = PAGINATION[key] || (PAGINATION[key] = { page: 0, total: 0, search: '' });
  const totalPages = Math.max(1, Math.ceil(st.total / PAGE_SIZE));
  const next = Math.min(Math.max(st.page + dir, 0), totalPages - 1);
  if (next === st.page) return;
  setBtnLoading(btn, true);
  await loadPage(key, { page: next });
  renderSection(key);
}

async function refreshSection(key, btn) {
  setBtnLoading(btn, true);
  try {
    if (key === 'dashboard') {
      toast('Refreshing dashboard…');
      await Promise.all(['orders','products','users','messages'].map(k => loadPage(k, { page: PAGINATION[k] ? PAGINATION[k].page : 0 })));
      renderDashboard();
      toast('Dashboard refreshed');
      return;
    }
    toast('Refreshing…');
    await refreshTable(key);
    renderSection(key);
    toast('Refreshed');
  } finally {
    setBtnLoading(btn, false);
  }
}

/* Inject a refresh button into every panel-header (except the sections
   listed below, which don't need one) and a pagination slot after every
   table-wrap, based on each section's data-section key, avoids
   hand-editing 13 near-identical HTML blocks. */
const NO_REFRESH_BTN = new Set();
function initSectionChrome() {
  document.querySelectorAll('.section-view[data-section]').forEach(section => {
    const key = section.dataset.section;
    const header = section.querySelector('.panel-header');
    if (header && !header.querySelector('.refresh-btn') && !NO_REFRESH_BTN.has(key)) {
      let actionsHost = header.querySelector('.panel-header-actions');
      if (!actionsHost) {
        const children = Array.from(header.children);
        const last = children.length > 1 ? children[children.length - 1] : null;
        if (last && last.tagName !== 'BUTTON' && last.tagName !== 'INPUT' && last.tagName !== 'A') {
          actionsHost = last;
          actionsHost.classList.add('panel-header-actions');
        } else if (last) {
          // Last child is itself a control (e.g. a bare "+ New X" button),
          // wrap it so the refresh button sits beside it, not inside it.
          actionsHost = document.createElement('div');
          actionsHost.className = 'panel-header-actions';
          last.replaceWith(actionsHost);
          actionsHost.appendChild(last);
        } else {
          actionsHost = document.createElement('div');
          actionsHost.className = 'panel-header-actions';
          header.appendChild(actionsHost);
        }
      }
      const btn = document.createElement('button');
      btn.className = 'btn-icon refresh-btn';
      btn.title = 'Refresh this section';
      btn.innerHTML = '<i class="fa fa-refresh" aria-hidden="true"></i>';
      btn.onclick = () => refreshSection(key, btn);
      actionsHost.appendChild(btn);
    }
    const wrap = section.querySelector('.table-wrap');
    if (wrap && TABLE_MAP[key] && !document.getElementById(key + 'Pagination')) {
      const pager = document.createElement('div');
      pager.className = 'pagination';
      pager.id = key + 'Pagination';
      wrap.insertAdjacentElement('afterend', pager);
    }
  });
}
document.addEventListener('DOMContentLoaded', initSectionChrome);
if (document.readyState !== 'loading') initSectionChrome();

function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }

/* ---------------- Image upload (multi) ---------------- */
async function uploadProductImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `products/${uid('img')}.${ext}`;
  const { error: uploadError } = await sb.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { upsert: true, cacheControl: '3600' });
  if (uploadError) { throw uploadError; }
  const { data } = sb.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/* Gallery state for the product form: existing = already-saved URLs kept,
   newFiles = freshly picked File objects not yet uploaded. */
function initImageGallery(existingImages) {
  window.__productImageState = { existing: [...(existingImages || [])], newFiles: [] };
  renderImageGallery();
}
function renderImageGallery() {
  const st = window.__productImageState;
  const el = document.getElementById('imageGallery');
  if (!el) return;
  const existingThumbs = st.existing.map((url, i) => `
    <div class="image-thumb">
      <img src="${url}" alt="">
      <button type="button" class="image-remove" onclick="removeExistingImage(${i})" title="Remove">${icon('close')}</button>
    </div>`).join('');
  const newThumbs = st.newFiles.map((file, i) => `
    <div class="image-thumb image-thumb-new">
      <img src="${URL.createObjectURL(file)}" alt="">
      <button type="button" class="image-remove" onclick="removeNewImage(${i})" title="Remove">${icon('close')}</button>
    </div>`).join('');
  el.innerHTML = (existingThumbs + newThumbs) || `<div class="image-empty">${icon('products')}<span>No images yet</span></div>`;
}
function handleImageFilesSelected(input) {
  const files = Array.from(input.files || []);
  if (files.length) window.__productImageState.newFiles.push(...files);
  input.value = '';
  renderImageGallery();
}
function removeExistingImage(i) { window.__productImageState.existing.splice(i, 1); renderImageGallery(); }
function removeNewImage(i) { window.__productImageState.newFiles.splice(i, 1); renderImageGallery(); }

/* ---------------- Toast ---------------- */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* Generic loading-state toggler for any button/icon-button, so every
   async action visibly shows it's working (spinner + disabled). */
function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
}

/* ---------------- Auth ---------------- */
async function handleLogin(btn) {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (SUPABASE_CONFIG_ERROR) {
    errEl.textContent = SUPABASE_CONFIG_ERROR;
    errEl.style.display = 'block';
    return;
  }

  if (!email || !pass) {
    errEl.textContent = 'Enter your email and password.';
    errEl.style.display = 'block';
    return;
  }

  setBtnLoading(btn, true);
  const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password: pass });
  if (authError || !authData.user) {
    errEl.textContent = 'Invalid email or password.';
    errEl.style.display = 'block';
    setBtnLoading(btn, false);
    return;
  }

  const { data: profile, error: profileError } = await sb
    .from('rm_store_users')
    .select('id, name, email, "isAdmin"')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || !profile.isAdmin) {
    errEl.textContent = 'This account does not have admin access.';
    errEl.style.display = 'block';
    await sb.auth.signOut();
    setBtnLoading(btn, false);
    return;
  }

  await enterDashboard(profile);
}

async function handleLogout() {
  await sb.auth.signOut();
  document.getElementById('adminShell').style.display = 'none';
  document.getElementById('helpFab').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

async function enterDashboard(profile) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  document.getElementById('helpFab').style.display = 'flex';
  document.getElementById('signedInAs').textContent = profile ? profile.name : 'Admin';
  toast('Loading store data…');
  await loadAllData();
  renderAll();
  navigate('dashboard');
  if (!localStorage.getItem(LS_ONBOARD)) {
    openOnboarding(false);
  }
}

/* ---------------- Navigation ---------------- */
const PAGE_META = {
  dashboard: { title: 'Dashboard', sub: 'Store performance at a glance' },
  products: { title: 'Products', sub: 'Manage what customers can buy' },
  categories: { title: 'Categories', sub: 'Group products for browsing' },
  collections: { title: 'Collections', sub: 'Curated campaign groupings' },
  orders: { title: 'Orders', sub: 'Payment & delivery tracking' },
  shipping: { title: 'Shipping Rates', sub: 'Delivery fees by region' },
  regions: { title: 'Regions', sub: 'Regions and cities used at checkout' },
  users: { title: 'Users', sub: 'Customers and admin access' },
  reviews: { title: 'Product Reviews', sub: 'Feedback on individual products' },
  comments: { title: 'Comments', sub: 'Site-wide testimonials' },
  messages: { title: 'Messages', sub: 'Contact form submissions' },
  faq: { title: 'FAQ', sub: 'Storefront frequently asked questions' },
  instagram: { title: 'Instagram Posts', sub: 'Featured social posts' },
  settings: { title: 'Site Settings', sub: 'Global storefront configuration' }
};

function navigate(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.section-view').forEach(el => el.classList.toggle('active', el.dataset.section === page));
  document.getElementById('pageTitle').textContent = PAGE_META[page].title;
  document.getElementById('pageSub').textContent = PAGE_META[page].sub;
  document.getElementById('sidebar').classList.remove('open');
  window.__currentPage = page;
}
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

/* ---------------- Modal helpers ---------------- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('open'); });
});

function openForm(title, sub, bodyHtml) {
  const sheet = document.getElementById('formModalSheet');
  if (sheet) sheet.classList.remove('wide');
  document.getElementById('formModalTitle').textContent = title;
  document.getElementById('formModalSub').textContent = sub;
  document.getElementById('formModalBody').innerHTML = bodyHtml;
  openModal('formModal');
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
  renderDashboard();
  Object.keys(TABLE_MAP).forEach(key => renderSection(key));
}

const onProductSearch = debounce(async (term) => { await loadPage('products', { page: 0, search: term }); renderSection('products'); });
const onOrderSearch = debounce(async (term) => { await loadPage('orders', { page: 0, search: term }); renderSection('orders'); });
const onUserSearch = debounce(async (term) => { await loadPage('users', { page: 0, search: term }); renderSection('users'); });

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const revenue = DB.orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const stats = [
    { label: 'Total Revenue', value: 'GHS ' + revenue.toLocaleString(), delta: DB.orders.length + ' orders', extra: `<button type="button" class="btn-icon stat-action" title="View revenue breakdown" onclick="openRevenueModal(this)">${icon('chart')}</button>` },
    { label: 'Products', value: DB.products.length, delta: DB.products.filter(p=>p.is_active).length + ' active' },
    { label: 'New Messages', value: DB.messages.filter(m=>m.status==='New').length, delta: DB.messages.length + ' total' }
  ];
  document.getElementById('statGrid').innerHTML = stats.map(s => `
    <div class="stat-card glass">
      ${s.extra || ''}
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-delta">${s.delta}</div>
    </div>`).join('');

  const recent = [...DB.orders].sort((a,b) => (a.created_at < b.created_at ? 1 : -1)).slice(0,5);
  document.getElementById('recentOrdersTable').innerHTML = `
    <thead><tr><th>Order #</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
    <tbody>${recent.map(o => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.customer_name}</td>
        <td>${statusBadge(o.status)}</td>
        <td>GHS ${Number(o.total).toLocaleString()}</td>
        <td>${formatDate(o.created_at)}</td>
      </tr>`).join('') || emptyRow(5)}</tbody>`;
}

function emptyRow(cols) { return `<tr><td colspan="${cols}"><div class="empty-state">No data yet.</div></td></tr>`; }
function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString(); } catch(e) { return d; } }

/* ---------------- Revenue breakdown (dashboard stat card) ---------------- */
/* Dashboard's headline revenue figure only ever reflects the 10 most
   recently loaded orders (DB.orders is paginated), so a real breakdown
   needs its own fetch of every order, paged in chunks of 1000 rows. */
async function fetchAllOrdersForRevenue() {
  const pageSize = 1000;
  let from = 0, all = [], total = Infinity;
  while (all.length < total) {
    const { data, error, count } = await sb
      .from('rm_store_orders')
      .select('id,total,status,created_at', { count: 'exact' })
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { console.error(error); toast('Failed to load revenue data'); break; }
    all = all.concat(data || []);
    total = count == null ? all.length : count;
    from += pageSize;
    if (!data || data.length < pageSize) break;
  }
  return all;
}

function pad2(n) { return String(n).padStart(2, '0'); }
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function groupRevenue(orders, period, custom) {
  let filtered = orders;
  if (period === 'custom' && custom && custom.from && custom.to) {
    const fromT = new Date(custom.from + 'T00:00:00').getTime();
    const toT = new Date(custom.to + 'T23:59:59').getTime();
    filtered = orders.filter(o => { const t = new Date(o.created_at).getTime(); return t >= fromT && t <= toT; });
  } else if (period === 'daily') {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0,0,0,0);
    filtered = orders.filter(o => new Date(o.created_at).getTime() >= cutoff.getTime());
  } else if (period === 'monthly') {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 11); cutoff.setDate(1);
    filtered = orders.filter(o => new Date(o.created_at) >= cutoff);
  } else if (period === 'yearly') {
    const cutoffYear = new Date().getFullYear() - 4;
    filtered = orders.filter(o => new Date(o.created_at).getFullYear() >= cutoffYear);
  }
  const buckets = {};
  if (period === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 86400000);
      const sortKey = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      const label = dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      buckets[sortKey] = { label, value: 0, orders: 0 };
    }
  } else if (period === 'monthly') {
    const base = new Date(); base.setDate(1);
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const sortKey = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
      const label = `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
      buckets[sortKey] = { label, value: 0, orders: 0 };
    }
  } else if (period === 'yearly') {
    const thisYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      const y = thisYear - i;
      buckets[String(y)] = { label: String(y), value: 0, orders: 0 };
    }
  }
  filtered.forEach(o => {
    const dt = new Date(o.created_at);
    let sortKey, label;
    if (period === 'yearly') {
      sortKey = String(dt.getFullYear());
      label = sortKey;
    } else if (period === 'monthly') {
      sortKey = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
      label = `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
    } else {
      sortKey = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      label = period === 'daily'
        ? dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
        : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (!buckets[sortKey]) buckets[sortKey] = { label, value: 0, orders: 0 };
    buckets[sortKey].value += Number(o.total || 0);
    buckets[sortKey].orders += 1;
  });
  return Object.entries(buckets)
    .map(([sortKey, b]) => ({ sortKey, label: b.label, value: b.value, orders: b.orders }))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

/* Simple inline SVG bar chart, oldest to newest, left to right. */
function buildRevenueChart(rows) {
  if (!rows.length) return `<div class="empty-state">No data yet.</div>`;
  const chron = [...rows].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const w = 640, h = 220, padL = 50, padB = 34, padT = 14, padR = 10;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const max = Math.max(...chron.map(r => r.value), 1);
  const n = chron.length;
  const gap = 6;
  const barW = Math.max(4, (plotW / n) - gap);
  const maxLabels = 12;
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = padT + plotH * (1 - f);
    return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
      <text x="${padL - 8}" y="${y + 4}" font-size="9.5" fill="var(--text-muted, #888)" text-anchor="end">${Math.round(max * f).toLocaleString()}</text>`;
  }).join('');
  const bars = chron.map((r, i) => {
    const x = padL + i * (barW + gap);
    const barH = Math.max(1, (r.value / max) * plotH);
    const y = padT + plotH - barH;
    const showLabel = i % labelEvery === 0 || i === n - 1;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="var(--accent, #3b82f6)" opacity="0.9">
          <title>${r.label}: GHS ${r.value.toLocaleString()} (${r.orders} orders)</title>
        </rect>
        ${showLabel ? `<text x="${x + barW / 2}" y="${h - padB + 14}" font-size="9" fill="var(--text-muted, #888)" text-anchor="middle">${r.label}</text>` : ''}
      </g>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}
    ${bars}
  </svg>`;
}

async function openRevenueModal(btn) {
  setBtnLoading(btn, true);
  try {
    window.__revenueOrders = await fetchAllOrdersForRevenue();
    window.__revenuePeriod = 'daily';
    window.__revenueCustom = { from: '', to: '' };
    const sheet = document.getElementById('formModalSheet');
    if (sheet) sheet.classList.add('wide');
    renderRevenueModal();
    openModal('formModal');
  } finally {
    setBtnLoading(btn, false);
  }
}

function setRevenuePeriod(p) { window.__revenuePeriod = p; renderRevenueModal(); }

function applyRevenueCustomRange() {
  window.__revenueCustom = { from: val('rev_from'), to: val('rev_to') };
  renderRevenueModal();
}

function renderRevenueModal() {
  const period = window.__revenuePeriod || 'daily';
  const orders = window.__revenueOrders || [];
  const rows = groupRevenue(orders, period, window.__revenueCustom);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const tabs = [['daily','Daily'],['monthly','Monthly'],['yearly','Yearly'],['custom','Custom']];
  const tabsHtml = `<div class="revenue-tabs">${tabs.map(([key,label]) =>
    `<button type="button" class="btn ${period === key ? 'btn-primary' : 'btn-ghost'}" onclick="setRevenuePeriod('${key}')">${label}</button>`
  ).join('')}</div>`;
  const customHtml = period === 'custom' ? `
    <div class="form-grid" style="margin-top:12px;">
      <div class="field"><label>From</label><input type="date" id="rev_from" value="${window.__revenueCustom.from || ''}"></div>
      <div class="field"><label>To</label><input type="date" id="rev_to" value="${window.__revenueCustom.to || ''}"></div>
    </div>
    <div class="form-actions" style="margin-top:8px;">
      <button class="btn btn-primary" onclick="applyRevenueCustomRange()">Apply Range</button>
    </div>` : '';
  const chartHtml = `<div class="revenue-chart">${buildRevenueChart(rows)}</div>`;
  const tableHtml = `
    <div class="table-wrap" style="margin-top:14px;">
      <table class="data-table">
        <thead><tr><th>Period</th><th>Orders</th><th>Revenue</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr><td>${r.label}</td><td>${r.orders}</td><td>GHS ${r.value.toLocaleString()}</td></tr>`).join('') || emptyRow(3)}</tbody>
      </table>
    </div>`;
  document.getElementById('formModalTitle').textContent = 'Revenue Breakdown';
  document.getElementById('formModalSub').textContent = `GHS ${total.toLocaleString()} across ${rows.reduce((s,r)=>s+r.orders,0)} orders in this view · ${orders.length} orders loaded total`;
  document.getElementById('formModalBody').innerHTML = `
    ${tabsHtml}
    ${customHtml}
    ${chartHtml}
    ${tableHtml}
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Close</button>
    </div>`;
}

/* Mobile responsive tables: only the name + next two columns show on small
   screens; remaining columns collapse into a toggleable detail row below,
   opened via a chevron button placed in the row-actions cell. */
function expandToggleBtn(rowId) {
  return `<button type="button" class="btn-icon expand-toggle" onclick="toggleRowExpand('${rowId}')" title="More details">${icon('chevronRight')}</button>`;
}
function detailRow(rowId, colspan, items) {
  const fields = items.filter(Boolean).map(it => `
    <div class="detail-item"><span class="detail-label">${it.label}</span>${it.value}</div>`).join('');
  return `<tr class="detail-row" id="${rowId}_detail"><td colspan="${colspan}"><div class="detail-grid">${fields}</div></td></tr>`;
}
function toggleRowExpand(rowId) {
  const detail = document.getElementById(rowId + '_detail');
  const row = document.getElementById(rowId);
  if (!detail) return;
  detail.classList.toggle('open');
  const btn = row && row.querySelector('.expand-toggle');
  if (btn) btn.classList.toggle('rotated');
}

function statusBadge(status) {
  const map = { Paid:'badge-blue', Cancelled:'badge-red', Refunded:'badge-gray',
                Processing:'badge-amber', 'Out for Delivery':'badge-blue', New:'badge-blue', Read:'badge-gray', Replied:'badge-green' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

/* ---------------- Products ---------------- */
function renderProducts() {
  const rows = DB.products;
  document.getElementById('productsTable').innerHTML = `
    <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th class="col-extra">Stock</th><th class="col-extra">Status</th><th class="col-extra">Flags</th><th></th></tr></thead>
    <tbody>${rows.map(p => {
      const rowId = 'prod_' + p.id;
      const statusHtml = p.is_active ? statusBadgeCustom('Active','badge-green') : statusBadgeCustom('Inactive','badge-gray');
      const flagsHtml = `${p.is_new ? '<span class="badge badge-blue">New</span>' : ''} ${p.is_preorder ? '<span class="badge badge-amber">Preorder</span>' : ''} ${Array.isArray(p.sizes) && p.sizes.length ? `<span class="badge badge-blue">${p.sizes.length} sizes</span>` : ''}`;
      return `
      <tr id="${rowId}">
        <td>${p.image ? `<img class="thumb" src="${p.image}" alt="">` : '<div class="thumb"></div>'}</td>
        <td><strong>${p.name}</strong><br><span style="color:var(--text-muted);font-size:11.5px;">${p.slug || ''}</span></td>
        <td>${categoryNames(p)}</td>
        <td>GHS ${Number(p.price).toLocaleString()}</td>
        <td class="col-extra">${p.stock_quantity}</td>
        <td class="col-extra">${statusHtml}</td>
        <td class="col-extra">${flagsHtml}</td>
        <td><div class="row-actions">
          ${expandToggleBtn(rowId)}
          <button class="btn-icon" onclick="openProductModal('${p.id}')" title="Edit">${icon('pencil')}</button>
          <button class="btn-icon" onclick="deleteItem(this,'products','${p.id}')" title="Delete">${icon('trash')}</button>
        </div></td>
      </tr>${detailRow(rowId, 8, [
        { label: 'Stock', value: p.stock_quantity },
        { label: 'Status', value: statusHtml },
        { label: 'Flags', value: flagsHtml || '-' }
      ])}`;
    }).join('') || emptyRow(8)}</tbody>`;
}
function statusBadgeCustom(text, cls) { return `<span class="badge ${cls}">${text}</span>`; }
function categoryName(id) { const c = LOOKUP.categories.find(c=>c.id===id); return c ? c.name : '-'; }
function productCategoryIds(p) {
  if (p && Array.isArray(p.category_ids) && p.category_ids.length) return p.category_ids;
  if (p && p.category_id) return [p.category_id];
  return [];
}
function categoryNames(p) {
  const ids = productCategoryIds(p);
  if (!ids.length) return '-';
  if (LOOKUP.categories.length && ids.length === LOOKUP.categories.length) return 'All Categories';
  return ids.map(id => categoryName(id)).join(', ');
}
function collectionName(id) { const c = LOOKUP.collections.find(c=>c.id===id); return c ? c.name : '-'; }

function openProductModal(id) {
  const p = id ? DB.products.find(p=>p.id===id) : null;
  const selectedCategories = productCategoryIds(p);
  const categoryCheckboxes = LOOKUP.categories.map(c => `
    <label class="checkbox-list-item"><input type="checkbox" class="cat-checkbox" value="${c.id}" ${selectedCategories.includes(c.id)?'checked':''} onchange="syncSelectAllCategories()"> ${c.name}</label>`).join('');
  const selectedCollections = p && Array.isArray(p.collection_ids) && p.collection_ids.length
    ? p.collection_ids
    : (p && p.collection_id ? [p.collection_id] : []);
  const collectionCheckboxes = LOOKUP.collections.map(c => `
    <label class="checkbox-list-item"><input type="checkbox" class="col-checkbox" value="${c.id}" ${selectedCollections.includes(c.id)?'checked':''} onchange="syncSelectAllCollections()"> ${c.name}</label>`).join('');
  const hasSizes = p && Array.isArray(p.sizes) && p.sizes.length > 0;

  openForm(p ? 'Edit Product' : 'New Product', 'Products appear in the storefront catalog once active.', `
    <div class="form-grid">
      <div class="field full"><label>Name</label><input id="f_name" value="${p?p.name:''}"></div>
      <div class="field full"><label>Description</label><textarea id="f_desc">${p?p.description||'':''}</textarea></div>
      <div class="field full"><label>Product Images</label>
        <div class="image-gallery" id="imageGallery"></div>
        <div class="image-upload-controls">
          <label class="btn-file" for="f_image_file">${icon('products')} Browse Images</label>
          <input type="file" id="f_image_file" accept="image/*" multiple onchange="handleImageFilesSelected(this)">
          <span class="image-upload-hint">JPG or PNG. Select multiple at once, first image is used as the thumbnail.</span>
        </div>
      </div>
      <div class="field"><label>Base Price (GHS)</label><input id="f_price" type="number" step="0.01" value="${p?p.price:''}"></div>
      <div class="field"><label>Base Stock Quantity</label><input id="f_stock" type="number" value="${p?p.stock_quantity:0}"></div>
      <div class="field full"><label>Categories</label>
        <div class="checkbox-list" id="categoryCheckboxList">
          <label class="checkbox-list-item checkbox-list-all"><input type="checkbox" id="catSelectAll" onchange="toggleAllCategories(this.checked)"> <strong>Select All</strong></label>
          ${categoryCheckboxes || '<span class="image-upload-hint">No categories yet.</span>'}
        </div>
      </div>
      <div class="field full"><label>Collections</label>
        <div class="checkbox-list" id="collectionCheckboxList">
          <label class="checkbox-list-item checkbox-list-all"><input type="checkbox" id="colSelectAll" onchange="toggleAllCollections(this.checked)"> <strong>Select All</strong></label>
          ${collectionCheckboxes || '<span class="image-upload-hint">No collections yet.</span>'}
        </div>
      </div>
      <div class="field"><label class="switch-row"><input type="checkbox" id="f_new" ${p&&p.is_new?'checked':''}> Mark as New</label></div>
      <div class="field"><label class="switch-row"><input type="checkbox" id="f_preorder" ${p&&p.is_preorder?'checked':''}> Preorder</label></div>
      <div class="field"><label class="switch-row"><input type="checkbox" id="f_active" ${!p||p.is_active?'checked':''}> Active (visible in store)</label></div>
      <div class="field full"><label class="switch-row"><input type="checkbox" id="f_has_sizes" ${hasSizes?'checked':''} onchange="document.getElementById('sizeVariantsWrap').style.display=this.checked?'block':'none'"> This product has size variants</label></div>
      <div class="field full" id="sizeVariantsWrap" style="display:${hasSizes?'block':'none'};">
        <label>Size Variants, each size can have its own price &amp; stock</label>
        <div id="sizeRows"></div>
        <button type="button" class="btn btn-ghost" style="margin-top:8px;" onclick="addSizeRow()">+ Add Size</button>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveProduct(this,'${id||''}')">Save Product</button>
    </div>`);
  openModal('formModal');
  initImageGallery(p ? (Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : [])) : []);
  initSizeState(p);
  syncSelectAllCollections();
  syncSelectAllCategories();
}

/* ---- Collections multi-select ---- */
function toggleAllCollections(checked) {
  document.querySelectorAll('.col-checkbox').forEach(cb => { cb.checked = checked; });
}
function syncSelectAllCollections() {
  const boxes = Array.from(document.querySelectorAll('.col-checkbox'));
  const all = document.getElementById('colSelectAll');
  if (all && boxes.length) all.checked = boxes.every(b => b.checked);
}

/* ---- Categories multi-select ---- */
function toggleAllCategories(checked) {
  document.querySelectorAll('.cat-checkbox').forEach(cb => { cb.checked = checked; });
}
function syncSelectAllCategories() {
  const boxes = Array.from(document.querySelectorAll('.cat-checkbox'));
  const all = document.getElementById('catSelectAll');
  if (all && boxes.length) all.checked = boxes.every(b => b.checked);
}

/* ---- Size / price / stock variants ---- */
function initSizeState(p) {
  const sizes = p && Array.isArray(p.sizes) ? p.sizes : [];
  const prices = p && p.size_prices && typeof p.size_prices === 'object' ? p.size_prices : {};
  const stocks = p && p.size_stock && typeof p.size_stock === 'object' ? p.size_stock : {};
  window.__productSizeState = sizes.map(s => ({ size: s, price: prices[s] != null ? prices[s] : '', stock: stocks[s] != null ? stocks[s] : 0 }));
  renderSizeRows();
}
function renderSizeRows() {
  const el = document.getElementById('sizeRows');
  if (!el) return;
  const rows = window.__productSizeState || [];
  el.innerHTML = rows.map((r, i) => `
    <div class="size-row">
      <input type="text" placeholder="Size (e.g. M)" value="${r.size}" oninput="updateSizeField(${i},'size',this.value)">
      <input type="number" step="0.01" placeholder="Price (GHS)" value="${r.price}" oninput="updateSizeField(${i},'price',this.value)">
      <input type="number" placeholder="Stock" value="${r.stock}" oninput="updateSizeField(${i},'stock',this.value)">
      <button type="button" class="btn-icon" onclick="removeSizeRow(${i})" title="Remove size">${icon('close')}</button>
    </div>`).join('') || `<div class="empty-state" style="padding:14px 0;">No size variants added yet.</div>`;
}
function addSizeRow() { window.__productSizeState = window.__productSizeState || []; window.__productSizeState.push({ size: '', price: '', stock: 0 }); renderSizeRows(); }
function removeSizeRow(i) { window.__productSizeState.splice(i, 1); renderSizeRows(); }
function updateSizeField(i, field, value) { window.__productSizeState[i][field] = value; }
async function saveProduct(btn, id) {
  setBtnLoading(btn, true);
  try {
  const st = window.__productImageState || { existing: [], newFiles: [] };
  let uploadedUrls = [];

  if (st.newFiles.length) {
    toast(`Uploading ${st.newFiles.length} image${st.newFiles.length>1?'s':''}…`);
    try {
      uploadedUrls = await Promise.all(st.newFiles.map(f => uploadProductImage(f)));
    } catch (e) {
      console.error(e);
      toast('Image upload failed: ' + (e.message || 'unknown error'));
      return;
    }
  }

  const images = [...st.existing, ...uploadedUrls];

  const hasSizes = chk('f_has_sizes');
  let sizes = [], size_prices = {}, size_stock = {};
  let basePrice = parseFloat(val('f_price')) || 0;
  let baseStock = parseInt(val('f_stock')) || 0;
  if (hasSizes) {
    const validRows = (window.__productSizeState || []).filter(r => r.size && String(r.size).trim());
    sizes = validRows.map(r => String(r.size).trim());
    validRows.forEach(r => {
      const s = String(r.size).trim();
      size_prices[s] = parseFloat(r.price) || 0;
      size_stock[s] = parseInt(r.stock) || 0;
    });
    if (sizes.length) {
      basePrice = Math.min(...sizes.map(s => size_prices[s]));
      baseStock = sizes.reduce((sum, s) => sum + (size_stock[s] || 0), 0);
    }
  }

  const collection_ids = Array.from(document.querySelectorAll('.col-checkbox:checked')).map(cb => cb.value);
  const category_ids = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);

  const data = {
    name: val('f_name'), description: val('f_desc'), price: basePrice,
    image: images[0] || '', images, stock_quantity: baseStock,
    category_id: category_ids[0] || null, category_ids,
    collection_id: collection_ids[0] || null, collection_ids,
    sizes, size_prices, size_stock,
    is_new: chk('f_new'), is_preorder: chk('f_preorder'), is_active: chk('f_active')
  };
  if (!data.name) { toast('Product name is required'); return; }
  let error;
  if (id) {
    ({ error } = await sb.from('rm_store_products').update(data).eq('id', id));
  } else {
    data.slug = slugify(data.name);
    ({ error } = await sb.from('rm_store_products').insert(data));
  }
  if (error) { console.error(error); toast('Failed to save product'); return; }
  await refreshTable('products'); renderSection('products'); renderDashboard(); closeModal('formModal'); toast('Product saved');
  } finally {
    setBtnLoading(btn, false);
  }
}
function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function val(id) { return document.getElementById(id).value; }
function chk(id) { return document.getElementById(id).checked; }

async function deleteItem(btn, collection, id, keyFieldOverride) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  setBtnLoading(btn, true);
  const cfg = TABLE_MAP[collection];
  const key = keyFieldOverride || cfg.key || 'id';
  const { error } = await sb.from(cfg.table).delete().eq(key, id);
  if (error) { console.error(error); toast('Failed to delete'); setBtnLoading(btn, false); return; }
  await refreshTable(collection);
  if (DB[collection].length === 0 && PAGINATION[collection].page > 0) {
    await loadPage(collection, { page: PAGINATION[collection].page - 1 });
  }
  renderAll(); toast('Deleted');
}

/* ---------------- Categories ---------------- */
function renderCategories() {
  document.getElementById('categoriesTable').innerHTML = `
    <thead><tr><th>Name</th><th>ID</th><th>Audience</th><th class="col-extra">Sort Order</th><th></th></tr></thead>
    <tbody>${DB.categories.map(c => {
      const rowId = 'cat_' + c.id;
      return `
      <tr id="${rowId}"><td><strong>${c.name}</strong></td><td>${c.id}</td><td><span class="badge badge-blue">${c.audience || 'Unisex'}</span></td><td class="col-extra">${c.sort_order||0}</td>
      <td><div class="row-actions">
        ${expandToggleBtn(rowId)}
        <button class="btn-icon" onclick="openCategoryModal('${c.id}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'categories','${c.id}')">${icon('trash')}</button>
      </div></td></tr>${detailRow(rowId, 5, [{ label: 'Sort Order', value: c.sort_order||0 }])}`;
    }).join('') || emptyRow(5)}</tbody>`;
}
function openCategoryModal(id) {
  const c = id ? DB.categories.find(c=>c.id===id) : null;
  const audience = c ? (c.audience || 'Unisex') : 'Unisex';
  openForm(c?'Edit Category':'New Category', 'Categories group products for browsing on the storefront.', `
    <div class="form-grid">
      <div class="field full"><label>Name</label><input id="f_name" value="${c?c.name:''}"></div>
      <div class="field"><label>Audience</label>
        <select id="f_audience">
          <option value="Unisex" ${audience==='Unisex'?'selected':''}>Unisex</option>
          <option value="Men" ${audience==='Men'?'selected':''}>Men</option>
          <option value="Women" ${audience==='Women'?'selected':''}>Women</option>
        </select>
      </div>
      <div class="field"><label>Sort Order</label><input id="f_sort" type="number" value="${c?c.sort_order||0:0}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveCategory(this,'${id||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveCategory(btn, id) {
  setBtnLoading(btn, true);
  const name = val('f_name'); if (!name) { toast('Name required'); setBtnLoading(btn, false); return; }
  const sort_order = parseInt(val('f_sort'))||0;
  const audience = val('f_audience') || 'Unisex';
  let error, data;
  if (id) { ({ error, data } = await sb.from('rm_store_categories').update({ name, sort_order, audience }).eq('id', id).select()); }
  else { ({ error, data } = await sb.from('rm_store_categories').insert({ id: slugify(name), name, sort_order, audience }).select()); }
  if (error) { console.error(error); toast('Failed to save category'); setBtnLoading(btn, false); return; }
  if (id && (!data || data.length === 0)) {
    // Supabase returns no error here even when a Row Level Security policy
    // silently blocks the update, 0 rows are matched/changed. If the audience
    // (or any field) never appears to update, this is almost always why:
    // the admin's Supabase role needs an UPDATE policy on rm_store_categories.
    console.error('Category update matched 0 rows, likely blocked by a Row Level Security policy on rm_store_categories.');
    toast('Update blocked, contact https://nxnx.tech for help');
    setBtnLoading(btn, false);
    return;
  }
  await refreshTable('categories'); await refreshTable('products'); renderSection('categories'); renderSection('products'); closeModal('formModal'); toast('Category saved');
  setBtnLoading(btn, false);
}

/* ---------------- Collections ---------------- */
function renderCollections() {
  document.getElementById('collectionsTable').innerHTML = `
    <thead><tr><th>Name</th><th>Subtitle</th><th>Sort Order</th><th></th></tr></thead>
    <tbody>${DB.collections.map(c => `
      <tr><td><strong>${c.name}</strong></td><td>${c.subtitle||''}</td><td>${c.sort_order||0}</td>
      <td><div class="row-actions">
        <button class="btn-icon" onclick="openCollectionModal('${c.id}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'collections','${c.id}')">${icon('trash')}</button>
      </div></td></tr>`).join('') || emptyRow(4)}</tbody>`;
}
function openCollectionModal(id) {
  const c = id ? DB.collections.find(c=>c.id===id) : null;
  openForm(c?'Edit Collection':'New Collection', 'Collections are used for campaigns and featured sections.', `
    <div class="form-grid">
      <div class="field full"><label>Name</label><input id="f_name" value="${c?c.name:''}"></div>
      <div class="field full"><label>Subtitle</label><input id="f_subtitle" value="${c?c.subtitle||'':''}"></div>
      <div class="field full"><label>Description</label><textarea id="f_desc">${c?c.description||'':''}</textarea></div>
      <div class="field"><label>Sort Order</label><input id="f_sort" type="number" value="${c?c.sort_order||0:0}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveCollection(this,'${id||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveCollection(btn, id) {
  setBtnLoading(btn, true);
  const name = val('f_name'); if (!name) { toast('Name required'); setBtnLoading(btn, false); return; }
  const data = { name, subtitle: val('f_subtitle'), description: val('f_desc'), sort_order: parseInt(val('f_sort'))||0 };
  let error;
  if (id) { ({ error } = await sb.from('rm_store_collections').update(data).eq('id', id)); }
  else { data.id = slugify(name); ({ error } = await sb.from('rm_store_collections').insert(data)); }
  if (error) { console.error(error); toast('Failed to save collection'); setBtnLoading(btn, false); return; }
  await refreshTable('collections'); await refreshTable('products'); renderSection('collections'); renderSection('products'); closeModal('formModal'); toast('Collection saved');
  setBtnLoading(btn, false);
}

/* ---------------- Orders ---------------- */
// Order items come from rm_store_order_items, joined per-order in loadPage()
// (DB.orderItems[order.id]). Some older rows may instead carry a
// denormalized `items` JSON snapshot directly on the order — inline items
// win when present, joined rows are the fallback.
function orderItemsFor(o) {
  const inlineItems = Array.isArray(o.items) ? o.items : [];
  const joinedItems = (DB.orderItems && DB.orderItems[o.id]) || [];
  return inlineItems.length ? inlineItems : joinedItems;
}
function orderItemsHtml(items, { showPrice } = {}) {
  if (!items.length) return '<span style="color:var(--text-muted);">-</span>';
  return `<ul style="margin:0;padding-left:16px;">${items.map(it => {
    const nm = it.name || it.product_name || 'Item';
    const size = it.size ? ` (${it.size})` : '';
    const qty = it.qty || it.quantity || 1;
    const unitPrice = it.unit_price != null ? Number(it.unit_price) : null;
    const priceHtml = showPrice && unitPrice != null
      ? ` — GHS ${unitPrice.toLocaleString()} × ${qty} = GHS ${(unitPrice * qty).toLocaleString()}`
      : ` × ${qty}`;
    return `<li>${nm}${size}${priceHtml}</li>`;
  }).join('')}</ul>`;
}
function renderOrders() {
  const rows = DB.orders;
  document.getElementById('ordersTable').innerHTML = `
    <thead><tr><th>Order #</th><th>Customer</th><th>Region/City</th><th class="col-extra">Items</th><th class="col-extra">Total</th><th class="col-extra">Payment</th><th class="col-extra">Delivery</th><th class="col-extra">Date</th><th></th></tr></thead>
    <tbody>${rows.map(o => {
      const rowId = 'ord_' + o.id;
      const items = orderItemsFor(o);
      const itemsHtml = orderItemsHtml(items);
      const totalHtml = 'GHS ' + Number(o.total).toLocaleString();
      const paymentHtml = orderStatusSelect(o);
      const deliveryHtml = deliveryStatusSelect(o);
      const dateHtml = formatDate(o.created_at);
      return `
      <tr id="${rowId}">
        <td><strong>${o.order_number}</strong></td>
        <td>${o.customer_name}<br><span style="color:var(--text-muted);font-size:11.5px;">${o.customer_email}</span></td>
        <td>${o.region}, ${o.city}</td>
        <td class="col-extra">${itemsHtml}</td>
        <td class="col-extra">${totalHtml}</td>
        <td class="col-extra">${paymentHtml}</td>
        <td class="col-extra">${deliveryHtml}</td>
        <td class="col-extra">${dateHtml}</td>
        <td><div class="row-actions">
          ${expandToggleBtn(rowId)}
          <button class="btn-icon" onclick="deleteItem(this,'orders','${o.id}')">${icon('trash')}</button>
        </div></td>
      </tr>${detailRow(rowId, 9, [
        { label: 'Items', value: orderItemsHtml(items, { showPrice: true }) },
        { label: 'Phone', value: o.customer_phone || '-' },
        { label: 'Address', value: `${o.customer_address || ''}${o.customer_address ? ', ' : ''}${o.city}, ${o.region}` },
        { label: 'Subtotal', value: 'GHS ' + Number(o.subtotal || 0).toLocaleString() },
        { label: 'Shipping Fee', value: o.shipping_fee ? 'GHS ' + Number(o.shipping_fee).toLocaleString() : 'Free' },
        { label: 'Total', value: totalHtml },
        { label: 'Payment', value: paymentHtml },
        { label: 'Payment Ref', value: o.payment_reference || '-' },
        { label: 'Payment Method', value: o.payment_method || '-' },
        { label: 'Delivery', value: deliveryHtml },
        { label: 'Date', value: dateHtml },
        o.stock_conflict ? { label: 'Stock Conflict', value: '<span class="badge badge-red">Needs attention</span>' } : null
      ])}`;
    }).join('') || emptyRow(9)}</tbody>`;
}
function orderStatusSelect(o) {
  const options = ['Paid','Cancelled','Refunded'];
  return `<select onchange="updateOrderField(this,'${o.id}','status',this.value)">${options.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}</select>`;
}
function deliveryStatusSelect(o) {
  const options = ['Processing','Out for Delivery','Delivered','Cancelled'];
  return `<select onchange="updateOrderField(this,'${o.id}','delivery_status',this.value)">${options.map(s=>`<option value="${s}" ${o.delivery_status===s?'selected':''}>${s}</option>`).join('')}</select>`;
}
async function updateOrderField(el, id, field, value) {
  if (el) el.disabled = true;
  const { error } = await sb.from('rm_store_orders').update({ [field]: value }).eq('id', id);
  if (error) { console.error(error); toast('Failed to update order'); if (el) el.disabled = false; return; }
  await refreshTable('orders'); renderSection('orders'); renderDashboard(); toast('Order updated');
}

/* ---------------- Shipping ---------------- */
function renderShipping() {
  document.getElementById('shippingTable').innerHTML = `
    <thead><tr><th>Region</th><th>Fee (GHS)</th><th></th></tr></thead>
    <tbody>${DB.shipping.map(s => `
      <tr><td>${s.region}</td><td>${s.fee}</td>
      <td><div class="row-actions">
        <button class="btn-icon" onclick="openShippingModal('${s.region}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'shipping','${s.region}','region')">${icon('trash')}</button>
      </div></td></tr>`).join('') || emptyRow(3)}</tbody>`;
}
function openShippingModal(region) {
  const s = region ? DB.shipping.find(s=>s.region===region) : null;
  const regionOptions = LOOKUP.regions.map(r => `<option value="${r.region}" ${s&&s.region===r.region?'selected':''}>${r.region}</option>`).join('');
  openForm(s?'Edit Shipping Rate':'New Shipping Rate', 'Fee charged for delivery to this region.', `
    <div class="form-grid">
      <div class="field full"><label>Region</label><select id="f_region" ${s?'disabled':''}>${regionOptions}</select></div>
      <div class="field"><label>Fee (GHS)</label><input id="f_fee" type="number" step="0.01" value="${s?s.fee:''}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveShipping(this,'${region||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveShipping(btn, region) {
  setBtnLoading(btn, true);
  const fee = parseFloat(val('f_fee'))||0;
  let error;
  if (region) { ({ error } = await sb.from('rm_store_shipping_rates').update({ fee }).eq('region', region)); }
  else {
    const r = val('f_region'); if (!r) { toast('Select a region'); setBtnLoading(btn, false); return; }
    if (DB.shipping.find(s=>s.region===r)) { toast('Rate already exists for this region'); setBtnLoading(btn, false); return; }
    ({ error } = await sb.from('rm_store_shipping_rates').insert({ region: r, fee }));
  }
  if (error) { console.error(error); toast('Failed to save shipping rate'); setBtnLoading(btn, false); return; }
  await refreshTable('shipping'); renderSection('shipping'); closeModal('formModal'); toast('Shipping rate saved');
  setBtnLoading(btn, false);
}

/* ---------------- Regions ---------------- */
function renderRegions() {
  document.getElementById('regionsTable').innerHTML = `
    <thead><tr><th>Region</th><th class="col-extra">Cities</th><th></th></tr></thead>
    <tbody>${DB.regions.map(r => {
      const rowId = 'reg_' + r.id;
      const citiesHtml = `<div class="tag-list">${(r.cities||[]).map(c=>`<span class="tag-chip">${c}</span>`).join('') || '-'}</div>`;
      return `
      <tr id="${rowId}"><td><strong>${r.region}</strong></td>
      <td class="col-extra">${citiesHtml}</td>
      <td><div class="row-actions">
        ${expandToggleBtn(rowId)}
        <button class="btn-icon" onclick="openRegionModal('${r.id}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'regions','${r.id}')">${icon('trash')}</button>
      </div></td></tr>${detailRow(rowId, 3, [{ label: 'Cities', value: citiesHtml }])}`;
    }).join('') || emptyRow(3)}</tbody>`;
}
function openRegionModal(id) {
  const r = id ? DB.regions.find(r=>r.id===id) : null;
  openForm(r?'Edit Region':'New Region', 'Cities are comma-separated.', `
    <div class="form-grid">
      <div class="field full"><label>Region Name</label><input id="f_region" value="${r?r.region:''}"></div>
      <div class="field full"><label>Cities (comma-separated)</label><input id="f_cities" value="${r?(r.cities||[]).join(', '):''}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveRegion(this,'${id||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveRegion(btn, id) {
  setBtnLoading(btn, true);
  const region = val('f_region'); if (!region) { toast('Region name required'); setBtnLoading(btn, false); return; }
  const cities = val('f_cities').split(',').map(c=>c.trim()).filter(Boolean);
  let error;
  if (id) { ({ error } = await sb.from('rm_store_regions').update({ region, cities }).eq('id', id)); }
  else { ({ error } = await sb.from('rm_store_regions').insert({ region, cities })); }
  if (error) { console.error(error); toast('Failed to save region'); setBtnLoading(btn, false); return; }
  await refreshTable('regions'); await refreshTable('shipping'); renderSection('regions'); renderSection('shipping'); closeModal('formModal'); toast('Region saved');
  setBtnLoading(btn, false);
}

/* ---------------- Users ---------------- */
function renderUsers() {
  const rows = DB.users;
  document.getElementById('usersTable').innerHTML = `
    <thead><tr><th>Name</th><th>Email</th><th class="col-extra">Location</th><th class="col-extra">Joined</th><th class="col-extra">Admin Access</th><th></th></tr></thead>
    <tbody>${rows.map(u => {
      const rowId = 'usr_' + u.id;
      const locationHtml = `${u.city||''}${u.city&&u.region?', ':''}${u.region||''}` || '-';
      const joinedHtml = formatDate(u.joined);
      const adminHtml = `<label class="switch-row"><input type="checkbox" ${u.isAdmin?'checked':''} onchange="toggleAdmin(this,'${u.id}', this.checked)"> ${u.isAdmin?'Admin':'Customer'}</label>`;
      return `
      <tr id="${rowId}">
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td class="col-extra">${locationHtml}</td>
        <td class="col-extra">${joinedHtml}</td>
        <td class="col-extra">${adminHtml}</td>
        <td><div class="row-actions">${expandToggleBtn(rowId)}</div></td>
      </tr>${detailRow(rowId, 6, [
        { label: 'Location', value: locationHtml },
        { label: 'Joined', value: joinedHtml },
        { label: 'Admin Access', value: adminHtml }
      ])}`;
    }).join('') || emptyRow(6)}</tbody>`;
}
async function toggleAdmin(el, id, isAdmin) {
  if (el) el.disabled = true;
  const { error } = await sb.from('rm_store_users').update({ isAdmin }).eq('id', id);
  if (error) { console.error(error); toast('Failed to update admin access'); if (el) el.disabled = false; return; }
  await refreshTable('users'); renderSection('users'); renderDashboard();
  const u = DB.users.find(u=>u.id===id);
  toast(isAdmin ? `${u?u.name:'User'} can now sign in to the admin dashboard` : `${u?u.name:'User'}'s admin access was revoked`);
}

/* ---------------- Reviews ---------------- */
function renderReviews() {
  document.getElementById('reviewsTable').innerHTML = `
    <thead><tr><th>Product</th><th>Reviewer</th><th>Rating</th><th class="col-extra">Message</th><th class="col-extra">Date</th><th></th></tr></thead>
    <tbody>${DB.reviews.map(r => {
      const p = DB.products.find(p=>p.id===r.product_id);
      const rowId = 'rev_' + r.id;
      const dateHtml = formatDate(r.created_at);
      return `<tr id="${rowId}">
        <td>${p?p.name:'-'}</td><td>${r.name}</td><td>${stars(r.rating)}</td>
        <td class="col-extra">${r.message||''}</td><td class="col-extra">${dateHtml}</td>
        <td><div class="row-actions">
          ${expandToggleBtn(rowId)}
          <button class="btn-icon" onclick="deleteItem(this,'reviews','${r.id}')">${icon('trash')}</button>
        </div></td>
      </tr>${detailRow(rowId, 6, [
        { label: 'Message', value: r.message || '-' },
        { label: 'Date', value: dateHtml }
      ])}`;
    }).join('') || emptyRow(6)}</tbody>`;
}

/* ---------------- Comments ---------------- */
function renderComments() {
  document.getElementById('commentsTable').innerHTML = `
    <thead><tr><th>Name</th><th>Rating</th><th>Message</th><th class="col-extra">Status</th><th></th></tr></thead>
    <tbody>${DB.comments.map(c => {
      const rowId = 'com_' + c.id;
      const statusHtml = c.is_approved ? statusBadgeCustom('Approved','badge-green') : statusBadgeCustom('Pending','badge-amber');
      return `
      <tr id="${rowId}">
        <td>${c.name}</td><td>${stars(c.rating)}</td><td>${c.message}</td>
        <td class="col-extra">${statusHtml}</td>
        <td><div class="row-actions">
          ${expandToggleBtn(rowId)}
          <button class="btn-icon" onclick="toggleCommentApproval(this,'${c.id}')" title="Toggle approval">${c.is_approved?icon('pause'):icon('check')}</button>
          <button class="btn-icon" onclick="deleteItem(this,'comments','${c.id}')">${icon('trash')}</button>
        </div></td>
      </tr>${detailRow(rowId, 5, [{ label: 'Status', value: statusHtml }])}`;
    }).join('') || emptyRow(5)}</tbody>`;
}
async function toggleCommentApproval(btn, id) {
  setBtnLoading(btn, true);
  const c = DB.comments.find(c=>c.id===id);
  const { error } = await sb.from('rm_store_comments').update({ is_approved: !c.is_approved }).eq('id', id);
  if (error) { console.error(error); toast('Failed to update comment'); setBtnLoading(btn, false); return; }
  await refreshTable('comments'); renderSection('comments'); toast('Comment updated');
}

/* ---------------- Messages ---------------- */
function renderMessages() {
  document.getElementById('messagesTable').innerHTML = `
    <thead><tr><th>From</th><th>Subject</th><th>Message</th><th class="col-extra">Status</th><th class="col-extra">Date</th><th></th></tr></thead>
    <tbody>${DB.messages.map(m => {
      const rowId = 'msg_' + m.id;
      const statusHtml = messageStatusSelect(m);
      const dateHtml = formatDate(m.created_at);
      return `
      <tr id="${rowId}">
        <td>${m.first_name} ${m.last_name}<br><span style="color:var(--text-muted);font-size:11.5px;">${m.email}</span></td>
        <td>${m.subject}</td><td>${m.message}</td>
        <td class="col-extra">${statusHtml}</td>
        <td class="col-extra">${dateHtml}</td>
        <td><div class="row-actions">${expandToggleBtn(rowId)}</div></td>
      </tr>${detailRow(rowId, 6, [
        { label: 'Status', value: statusHtml },
        { label: 'Date', value: dateHtml }
      ])}`;
    }).join('') || emptyRow(6)}</tbody>`;
}
function messageStatusSelect(m) {
  const options = ['New','Read','Replied'];
  return `<select onchange="updateMessageStatus(this,'${m.id}',this.value)">${options.map(s=>`<option value="${s}" ${m.status===s?'selected':''}>${s}</option>`).join('')}</select>`;
}
async function updateMessageStatus(el, id, status) {
  if (el) el.disabled = true;
  const { error } = await sb.from('rm_store_messages').update({ status }).eq('id', id);
  if (error) { console.error(error); toast('Failed to update message'); if (el) el.disabled = false; return; }
  await refreshTable('messages'); renderSection('messages'); renderDashboard(); toast('Message updated');
}

/* ---------------- FAQ ---------------- */
function renderFaq() {
  document.getElementById('faqTable').innerHTML = `
    <thead><tr><th>Question</th><th>Answer</th><th>Sort</th><th></th></tr></thead>
    <tbody>${DB.faq.map(f => `
      <tr><td><strong>${f.question}</strong></td><td>${f.answer}</td><td>${f.sort_order||0}</td>
      <td><div class="row-actions">
        <button class="btn-icon" onclick="openFaqModal('${f.id}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'faq','${f.id}')">${icon('trash')}</button>
      </div></td></tr>`).join('') || emptyRow(4)}</tbody>`;
}
function openFaqModal(id) {
  const f = id ? DB.faq.find(f=>f.id===id) : null;
  openForm(f?'Edit FAQ':'New FAQ', 'Shown on the storefront FAQ section.', `
    <div class="form-grid">
      <div class="field full"><label>Question</label><input id="f_q" value="${f?f.question:''}"></div>
      <div class="field full"><label>Answer</label><textarea id="f_a">${f?f.answer:''}</textarea></div>
      <div class="field"><label>Sort Order</label><input id="f_sort" type="number" value="${f?f.sort_order||0:0}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveFaq(this,'${id||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveFaq(btn, id) {
  setBtnLoading(btn, true);
  const question = val('f_q'), answer = val('f_a'); if (!question||!answer) { toast('Question and answer required'); setBtnLoading(btn, false); return; }
  const sort_order = parseInt(val('f_sort'))||0;
  let error;
  if (id) { ({ error } = await sb.from('rm_store_faq').update({ question, answer, sort_order }).eq('id', id)); }
  else { ({ error } = await sb.from('rm_store_faq').insert({ question, answer, sort_order })); }
  if (error) { console.error(error); toast('Failed to save FAQ'); setBtnLoading(btn, false); return; }
  await refreshTable('faq'); renderSection('faq'); closeModal('formModal'); toast('FAQ saved');
  setBtnLoading(btn, false);
}

/* ---------------- Instagram ---------------- */
function renderInsta() {
  document.getElementById('instaTable').innerHTML = `
    <thead><tr><th>URL</th><th>Sort</th><th></th></tr></thead>
    <tbody>${DB.instagram.map(i => `
      <tr><td>${i.url}</td><td>${i.sort_order||0}</td>
      <td><div class="row-actions">
        <button class="btn-icon" onclick="openInstaModal('${i.id}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'instagram','${i.id}')">${icon('trash')}</button>
      </div></td></tr>`).join('') || emptyRow(3)}</tbody>`;
}
function openInstaModal(id) {
  const i = id ? DB.instagram.find(i=>i.id===id) : null;
  openForm(i?'Edit Instagram Post':'New Instagram Post', 'Link to a public Instagram post URL.', `
    <div class="form-grid">
      <div class="field full"><label>Post URL</label><input id="f_url" value="${i?i.url:''}"></div>
      <div class="field"><label>Sort Order</label><input id="f_sort" type="number" value="${i?i.sort_order||0:0}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveInsta(this,'${id||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveInsta(btn, id) {
  setBtnLoading(btn, true);
  const url = val('f_url'); if (!url) { toast('URL required'); setBtnLoading(btn, false); return; }
  const sort_order = parseInt(val('f_sort'))||0;
  let error;
  if (id) { ({ error } = await sb.from('rm_store_instagram_posts').update({ url, sort_order }).eq('id', id)); }
  else { ({ error } = await sb.from('rm_store_instagram_posts').insert({ url, sort_order })); }
  if (error) { console.error(error); toast('Failed to save Instagram post'); setBtnLoading(btn, false); return; }
  await refreshTable('instagram'); renderSection('instagram'); closeModal('formModal'); toast('Instagram post saved');
  setBtnLoading(btn, false);
}

/* ---------------- Settings ---------------- */
function renderSettings() {
  document.getElementById('settingsTable').innerHTML = `
    <thead><tr><th>Key</th><th>Value</th><th></th></tr></thead>
    <tbody>${DB.settings.map(s => `
      <tr><td><strong>${s.key}</strong></td><td>${typeof s.value==='string'?s.value:JSON.stringify(s.value)}</td>
      <td><div class="row-actions">
        <button class="btn-icon" onclick="openSettingModal('${s.key}')">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteItem(this,'settings','${s.key}','key')">${icon('trash')}</button>
      </div></td></tr>`).join('') || emptyRow(3)}</tbody>`;
}
function openSettingModal(key) {
  const s = key ? DB.settings.find(s=>s.key===key) : null;
  openForm(s?'Edit Setting':'New Setting', 'Key/value pairs consumed by the storefront frontend.', `
    <div class="form-grid">
      <div class="field full"><label>Key</label><input id="f_key" value="${s?s.key:''}" ${s?'disabled':''}></div>
      <div class="field full"><label>Value</label><input id="f_value" value="${s?(typeof s.value==='string'?s.value:JSON.stringify(s.value)):''}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal('formModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveSetting(this,'${key||''}')">Save</button>
    </div>`);
  openModal('formModal');
}
async function saveSetting(btn, key) {
  setBtnLoading(btn, true);
  const value = val('f_value');
  let error;
  if (key) { ({ error } = await sb.from('rm_store_site_settings').update({ value }).eq('key', key)); }
  else {
    const k = val('f_key'); if (!k) { toast('Key required'); setBtnLoading(btn, false); return; }
    if (DB.settings.find(s=>s.key===k)) { toast('Key already exists'); setBtnLoading(btn, false); return; }
    ({ error } = await sb.from('rm_store_site_settings').insert({ key: k, value }));
  }
  if (error) { console.error(error); toast('Failed to save setting'); setBtnLoading(btn, false); return; }
  await refreshTable('settings'); renderSection('settings'); closeModal('formModal'); toast('Setting saved');
  setBtnLoading(btn, false);
}

/* ============================================================
   HELP CONTENT PER PAGE
   ============================================================ */
const HELP_CONTENT = {
  dashboard: { title: 'Dashboard', steps: [
    ['Overview cards', 'The top cards show total revenue, product count, user count and unread messages, calculated live from your data.'],
    ['Recent orders', 'The table below lists your 5 most recent orders. Click Orders in the sidebar to manage all of them.']
  ]},
  products: { title: 'Products', steps: [
    ['Add a product', 'Click "+ New Product", fill in the name, price, category and stock, then Save.'],
    ['Edit or delete', 'Use the pencil icon to edit a product, or the trash icon to permanently remove it.'],
    ['Active toggle', 'Uncheck "Active" to hide a product from the storefront without deleting it.'],
    ['Search', 'Use the search box to quickly filter products by name.']
  ]},
  categories: { title: 'Categories', steps: [
    ['Create a category', 'Click "+ New Category" and give it a name, an ID is generated automatically.'],
    ['Assign to products', 'Categories become selectable in the product form once created.']
  ]},
  collections: { title: 'Collections', steps: [
    ['Create a collection', 'Collections group products for campaigns, e.g. "New Arrivals" or "Sale".'],
    ['Use in products', 'Assign a collection to a product from the product edit form.']
  ]},
  orders: { title: 'Orders', steps: [
    ['Update payment status', 'Use the Payment dropdown to move an order through Paid, Cancelled, or Refunded.'],
    ['Update delivery status', 'The Delivery dropdown tracks the physical delivery separately from payment status.'],
    ['Search', 'Search by order number or customer name to find an order quickly.']
  ]},
  shipping: { title: 'Shipping Rates', steps: [
    ['Add a rate', 'Click "+ New Rate", pick a region, and set the delivery fee in GHS.'],
    ['One rate per region', 'Each region can only have a single active shipping rate, edit it instead of duplicating.']
  ]},
  regions: { title: 'Regions', steps: [
    ['Add a region', 'Enter a region name and a comma-separated list of its cities.'],
    ['Used at checkout', 'These regions and cities populate the address dropdowns customers see at checkout.']
  ]},
  users: { title: 'Users', steps: [
    ['Grant admin access', 'Toggle the "Admin Access" switch on a user to let them sign in to this dashboard.'],
    ['Revoke access', 'Switching it off immediately blocks that account from admin sign-in .']
  ]},
  reviews: { title: 'Product Reviews', steps: [
    ['Read reviews', 'This table lists reviews left directly on products, with star rating and message.'],
    ['Remove a review', 'Use the trash icon to remove reviews that violate your guidelines.']
  ]},
  comments: { title: 'Comments', steps: [
    ['Approve or pause', 'Click the checkmark/pause icon to toggle whether a comment is publicly visible.'],
    ['Delete', 'Use the trash icon to permanently remove a comment.']
  ]},
  messages: { title: 'Messages', steps: [
    ['Track status', 'Move a message through New → Read → Replied using the dropdown as you handle it.'],
    ['Reply', 'Reply to customers directly via their listed email address; this dashboard tracks status only.']
  ]},
  faq: { title: 'FAQ', steps: [
    ['Add a question', 'Click "+ New FAQ" and fill in the question, answer, and sort order (lower shows first).']
  ]},
  instagram: { title: 'Instagram Posts', steps: [
    ['Feature a post', 'Paste the public Instagram post URL and set a sort order to control display sequence on the storefront.']
  ]},
  settings: { title: 'Site Settings', steps: [
    ['Edit a setting', 'Settings are simple key/value pairs read by the storefront (e.g. store_name, whatsapp_number).'],
    ['Add a setting', 'Click "+ New Setting" to introduce a new key your frontend can read.']
  ]}
};

function openHelp() {
  const page = window.__currentPage || 'dashboard';
  const content = HELP_CONTENT[page];
  document.getElementById('helpModalTitle').textContent = 'Help: ' + content.title;
  document.getElementById('helpModalSub').textContent = 'Here\'s how to operate this page';
  document.getElementById('helpModalBody').innerHTML = content.steps.map((s,i) => `
    <div class="help-step">
      <div class="step-num">${i+1}</div>
      <div><strong>${s[0]}</strong><p>${s[1]}</p></div>
    </div>`).join('');
  openModal('helpModal');
}

/* ============================================================
   GETTING STARTED ONBOARDING
   ============================================================ */
const ONBOARD_SLIDES = [
  { icon: 'sparkles', title: 'Welcome to Roger McDaniels', body: 'This is your admin dashboard for running the entire store, products, orders, users, content and settings, all in one place.' },
  { icon: 'compass', title: 'Sidebar navigation', body: 'Use the left sidebar to move between sections. Items are grouped into Catalog, Sales, People and Content so things are easy to find.' },
  { icon: 'products', title: 'Manage your catalog', body: 'Add, edit or deactivate products, organize them into categories, and group them into collections for campaigns.' },
  { icon: 'orders', title: 'Track orders', body: 'Every order shows payment status and delivery status independently, update either as it moves through fulfillment.' },
  { icon: 'users', title: 'Control admin access', body: 'On the Users page, toggle "Admin Access" for any account. Only admins can sign in to this dashboard.' },
  { icon: 'faq', title: 'Need help on any page?', body: 'Click the ? button in the bottom-right corner of any page for a quick step-by-step guide to that page.' }
];
let onboardIndex = 0;

function openOnboarding(manual) {
  onboardIndex = 0;
  renderOnboardSlides();
  openModal('onboardModal');
}
function renderOnboardSlides() {
  document.getElementById('onboardSlides').innerHTML = ONBOARD_SLIDES.map((s,i) => `
    <div class="onboard-slide ${i===onboardIndex?'active':''}">
      <div class="onboard-icon">${icon(s.icon)}</div>
      <h3 style="font-size:16px;margin-bottom:8px;">${s.title}</h3>
      <p style="font-size:13.5px;color:var(--text-muted);line-height:1.6;">${s.body}</p>
    </div>`).join('');
  document.getElementById('onboardProgress').innerHTML = ONBOARD_SLIDES.map((_,i) => `<div class="dot ${i<=onboardIndex?'active':''}"></div>`).join('');
  document.getElementById('onboardBackBtn').style.visibility = onboardIndex===0 ? 'hidden' : 'visible';
  document.getElementById('onboardNextBtn').textContent = onboardIndex === ONBOARD_SLIDES.length-1 ? 'Get Started' : 'Next';
}
function onboardStep(dir) {
  if (dir === 1 && onboardIndex === ONBOARD_SLIDES.length-1) { closeOnboarding(); return; }
  onboardIndex = Math.min(Math.max(onboardIndex + dir, 0), ONBOARD_SLIDES.length-1);
  renderOnboardSlides();
}
function closeOnboarding() {
  localStorage.setItem(LS_ONBOARD, '1');
  closeModal('onboardModal');
}

/* ---------------- Boot ---------------- */
(async function boot() {
  if (SUPABASE_CONFIG_ERROR) {
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    const { data: profile } = await sb
      .from('rm_store_users')
      .select('id, name, email, "isAdmin"')
      .eq('id', session.user.id)
      .single();
    if (profile && profile.isAdmin) {
      await enterDashboard(profile);
    } else {
      await sb.auth.signOut();
    }
  }
})();