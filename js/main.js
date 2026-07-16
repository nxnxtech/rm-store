/* ============================================
   COOKIE CONSENT
   Cart and wishlist are only persisted to
   localStorage once the visitor has explicitly
   accepted cookies. Until then (or if declined),
   both stay in-memory only and are lost on refresh.
   ============================================ */
const COOKIE_CONSENT_KEY = 'Roger McDaniels_cookie_consent'; // 'accepted' | 'declined'

function hasCookieConsent() {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
}

// Global state
const state = {
  // Guest cart fallback only — signed-in users' carts are loaded from
  // rm_store_cart_items by loadCartFromDb() on page load (see cart.js).
  // Only rehydrated from localStorage if the visitor has accepted cookies.
  cart: hasCookieConsent() ? (JSON.parse(localStorage.getItem('Roger McDaniels_cart')) || []) : [],
  wishlist: hasCookieConsent() ? (JSON.parse(localStorage.getItem('Roger McDaniels_wishlist')) || []) : [],
  // Rehydrated properly by initAuthSession() on page load; this is just
  // a fast first paint before that resolves.
  currentUser: JSON.parse(localStorage.getItem('Roger McDaniels_user')) || null,
  data: null,
  regionsData: null,
  shippingRatesData: null,
  pendingOrder: null
};

// Resolve a relative path to another page from anywhere on the site.
// All secondary pages live in /pages/, index.html lives at the root.
function pagePath(file) {
  const isInPagesFolder = window.location.pathname.includes('/pages/');
  if (file === 'index.html') return isInPagesFolder ? '../index.html' : 'index.html';
  return isInPagesFolder ? file : `pages/${file}`;
}

function assetPath(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const isInPagesFolder = window.location.pathname.includes('/pages/');
  return isInPagesFolder ? `../${path}` : path;
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadHeaderComponent === 'function') loadHeaderComponent();
  if (typeof loadFooterComponent === 'function') loadFooterComponent();

  initScrollAnimations();
  initWishlistButtons();
  initColorDots();
  initToastContainer();
  initCheckoutModal();
  initCommentsSection();
  initCookieConsent();

  const bootApp = async () => {
    try {
      if (typeof initAuthSession === 'function') await initAuthSession();
      if (typeof loadCartFromDb === 'function') await loadCartFromDb();
    } catch (error) {
      console.error('Failed to finish background startup tasks:', error);
    }
  };

  void bootApp();
});

/* ============================================
   DATA LOADING — Supabase
   Replaces the old fetch('js/*.json') calls. All
   reads go through the anon key + RLS (see
   rm_store_schema.sql — catalog tables are public-read).
   ============================================ */

// Maps an rm_store_products row onto the shape the rest of the
// frontend already expects (product.category, product.sizePrices,
// product.reviews, etc.) so renderProductCard/cart/checkout/etc.
// don't need to change.
function mapProductRow(row) {
  return {
    id: row.slug || row.id,
    dbId: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category_id,
    collection: row.collection_id,
    is_new: row.is_new,
    is_preorder: row.is_preorder,
    image: row.image,
    images: row.images || [],
    colors: row.colors || [],
    sizes: row.sizes || [],
    sizePrices: row.size_prices || {},
    stock: row.stock_quantity,
    rating: Number(row.rating) || 0,
    reviews: row.reviews_count || 0
  };
}

async function loadData(forceRefresh = false) {
  if (state.data && !forceRefresh) return state.data;

  try {
    const [
      { data: products, error: productsErr },
      { data: collections, error: collectionsErr },
      { data: faq, error: faqErr },
      { data: settingsRows, error: settingsErr },
      { data: instagramRows, error: instagramErr }
    ] = await Promise.all([
      supabase.from('rm_store_products').select('*').eq('is_active', true),
      supabase.from('rm_store_collections').select('*').order('sort_order'),
      supabase.from('rm_store_faq').select('*').order('sort_order'),
      supabase.from('rm_store_site_settings').select('*'),
      supabase.from('rm_store_instagram_posts').select('*').order('sort_order')
    ]);

    if (productsErr) throw productsErr;
    if (collectionsErr) throw collectionsErr;
    if (faqErr) throw faqErr;
    if (settingsErr) throw settingsErr;
    if (instagramErr) throw instagramErr;

    const mappedProducts = (products || []).map(mapProductRow);

    const settings = {};
    (settingsRows || []).forEach(row => { settings[row.key] = row.value; });

    state.data = {
      site: settings.site || {},
      contact: settings.contact || {},
      instagram_url: settings.instagram_url || '',
      instagram_posts: (instagramRows || []).map(r => r.url),
      faq: faq || [],
      products: mappedProducts,
      collections: (collections || []).map(c => ({
        ...c,
        product_count: mappedProducts.filter(p => p.collection === c.id).length
      }))
    };

    return state.data;
  } catch (error) {
    console.error('Failed to load data from Supabase:', error);
    return null;
  }
}

async function loadComments() {
  const { data, error } = await supabase
    .from('rm_store_comments')
    .select('*')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load comments:', error);
    return [];
  }

  return (data || []).map(c => ({
    name: c.name,
    avatar: c.avatar,
    rating: c.rating,
    message: c.message,
    date: c.created_at
  }));
}

/* ============================================
   AUTH — Supabase Auth
   Profile fields (name, avatar, phone) live in
   rm_store_users, which is auto-created by a
   trigger when a new auth user signs up.
   ============================================ */

async function loadCurrentUserProfile(authUser) {
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('rm_store_users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error) {
    console.error('Failed to load user profile:', error);
    return { id: authUser.id, name: authUser.email, email: authUser.email };
  }

  return data;
}

async function signUp({ name, email, password, phone, address, region, city }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } } // consumed by rm_store_handle_new_user() trigger
  });

  if (error) {
    return { success: false, message: error.message };
  }

  // The rm_store_handle_new_user() trigger only has access to the name via
  // auth metadata, so the delivery details collected at signup are saved
  // here as a follow-up update once the profile row exists.
  if (data.user && (phone || address || region || city)) {
    const { error: profileUpdateError } = await supabase
      .from('rm_store_users')
      .update({ phone, address, region, city })
      .eq('id', data.user.id);

    if (profileUpdateError) {
      console.error('Failed to save delivery details:', profileUpdateError);
    }
  }

  const profile = await loadCurrentUserProfile(data.user);
  setCurrentUser(profile);
  return { success: true, user: profile };
}

async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, message: 'Incorrect email or password.' };
  }

  const profile = await loadCurrentUserProfile(data.user);
  setCurrentUser(profile);
  return { success: true, user: profile };
}

function setCurrentUser(user) {
  state.currentUser = user;
  localStorage.setItem('Roger McDaniels_user', JSON.stringify(user));
}

async function signOut() {
  await supabase.auth.signOut();
  state.currentUser = null;
  localStorage.removeItem('Roger McDaniels_user');
  showToast('Signed out successfully', 'success');
  setTimeout(() => { window.location.href = pagePath('index.html'); }, 600);
}

function requireAuth() {
  if (!state.currentUser) {
    const redirect = encodeURIComponent(window.location.pathname.split('/').pop());
    window.location.href = `${pagePath('signin.html')}?redirect=${redirect}`;
    return false;
  }
  return true;
}

async function updateUserProfile(updates) {
  if (!state.currentUser) return { success: false, message: 'Not signed in.' };
  if (updates.name !== undefined && !updates.name.trim()) {
    return { success: false, message: 'Name cannot be empty.' };
  }

  const { error } = await supabase
    .from('rm_store_users')
    .update(updates)
    .eq('id', state.currentUser.id);

  if (error) return { success: false, message: error.message };

  Object.assign(state.currentUser, updates);
  localStorage.setItem('Roger McDaniels_user', JSON.stringify(state.currentUser));
  return { success: true };
}

async function changePassword(currentPassword, newPassword) {
  if (!state.currentUser) return { success: false, message: 'Not signed in.' };
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters.' };
  }

  // Supabase has no "check password" endpoint, so re-authenticate with the
  // current password first to confirm it before changing anything.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: state.currentUser.email,
    password: currentPassword
  });
  if (reauthError) {
    return { success: false, message: 'Current password is incorrect.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, message: error.message };

  return { success: true };
}

// Restore session on page load (e.g. after a refresh)
async function initAuthSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const profile = await loadCurrentUserProfile(session.user);
    setCurrentUser(profile);
  } else {
    state.currentUser = null;
    localStorage.removeItem('Roger McDaniels_user');
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const profile = await loadCurrentUserProfile(session.user);
    setCurrentUser(profile);
  } else {
    state.currentUser = null;
    localStorage.removeItem('Roger McDaniels_user');
  }
});

async function loadOrders() {
  if (!state.currentUser) return [];

  const { data, error } = await supabase
    .from('rm_store_orders')
    .select('*, rm_store_order_items(*)')
    .eq('user_id', state.currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load orders:', error);
    return [];
  }

  return (data || []).map(o => ({
    id: o.order_number,
    reference: o.reference,
    date: o.created_at,
    status: o.status,
    total: Number(o.total),
    // deliveryFee: new column, so older rows may not have it set yet.
    deliveryFee: o.delivery_fee != null ? Number(o.delivery_fee) : null,
    // deliveryStatus: separate from the order's payment/processing `status`
    // above — tracks where the parcel physically is. Defaults to
    // 'Processing' for rows created before this column existed.
    deliveryStatus: o.delivery_status || 'Processing',
    customer: {
      name: o.customer_name,
      email: o.customer_email,
      phone: o.customer_phone,
      address: o.customer_address,
      region: o.region,
      city: o.city
    },
    items: (o.rm_store_order_items || []).map(i => ({
      id: i.product_id,
      name: i.name,
      image: i.image,
      size: i.size,
      price: Number(i.unit_price),
      qty: i.qty
    }))
  }));
}

async function loadRegions() {
  if (state.regionsData) return state.regionsData;

  const { data, error } = await supabase
    .from('rm_store_regions')
    .select('*')
    .order('region');

  if (error) {
    console.error('Failed to load regions:', error);
    return [];
  }

  state.regionsData = data || [];
  return state.regionsData;
}

async function loadShippingRates() {
  if (state.shippingRatesData) return state.shippingRatesData;

  const { data, error } = await supabase
    .from('rm_store_shipping_rates')
    .select('*');

  if (error) {
    console.error('Failed to load shipping rates:', error);
    return [];
  }

  state.shippingRatesData = data || [];
  return state.shippingRatesData;
}

// Free shipping over GH₵900, otherwise the region's rate from the database
// (falls back to GH₵40 if a region has no rate configured yet).
function getShippingFee(region, total) {
  if (total > 900) return 0;
  const rate = (state.shippingRatesData || []).find(r => r.region === region);
  return rate ? Number(rate.fee) : 40;
}

/* ============================================
   COOKIE CONSENT BANNER
   ============================================ */

function isIndexPage() {
  const file = window.location.pathname.split('/').pop();
  return file === '' || file === 'index.html';
}

function initCookieConsent() {
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);

  // Already accepted — nothing to do, ever.
  if (consent === 'accepted') return;

  // Not accepted yet (either never decided, or previously declined).
  // On the index page we re-ask on every refresh; on other pages we only
  // ask if no decision has been made yet at all.
  if (consent === 'declined' && !isIndexPage()) return;

  renderCookieBanner();
}

function renderCookieBanner() {
  if (document.querySelector('.cookie-consent-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-consent-banner';
  banner.innerHTML = `
    <div class="cookie-consent-inner">
      <div class="cookie-consent-text">
        <h4>${getIcon('shield-check')} We use cookies</h4>
        <p>This site uses cookies to keep things like your cart and wishlist saved between visits, and to keep you signed in. You can accept or refuse.</p>
        <button type="button" class="cookie-consent-learn-more" id="cookie-learn-more-btn">What are cookies used for?</button>
        <div class="cookie-consent-details" id="cookie-consent-details" style="display:none;">
          <ul>
            <li><strong>Essential:</strong> keep you signed in and remember your session.</li>
            <li><strong>Preference:</strong> remember your cart and wishlist items between page refreshes.</li>
          </ul>
        </div>
        <div class="cookie-consent-warning" id="cookie-consent-warning" style="display:none;">
          If you refuse, your cart and wishlist items will not be saved — anything you add will disappear every time the page is refreshed.
        </div>
      </div>
      <div class="cookie-consent-actions">
        <button type="button" class="btn btn-glass" id="cookie-decline-btn">Refuse</button>
        <button type="button" class="btn btn-primary" id="cookie-accept-btn">Accept</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('cookie-learn-more-btn').addEventListener('click', () => {
    const details = document.getElementById('cookie-consent-details');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('cookie-accept-btn').addEventListener('click', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    // Persist whatever is currently in memory now that consent is granted.
    saveCartToLocalStorage();
    if (hasCookieConsent()) {
      localStorage.setItem('Roger McDaniels_wishlist', JSON.stringify(state.wishlist));
    }
    dismissCookieBanner();
  });

  document.getElementById('cookie-decline-btn').addEventListener('click', (e) => {
    const warning = document.getElementById('cookie-consent-warning');
    if (warning.style.display === 'none') {
      // First click: show the warning, give them a chance to reconsider.
      warning.style.display = 'block';
      e.target.textContent = 'Refuse anyway';
      return;
    }
    // Second click: confirmed refusal.
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    localStorage.removeItem('Roger McDaniels_cart');
    localStorage.removeItem('Roger McDaniels_wishlist');
    dismissCookieBanner();
  });
}

function dismissCookieBanner() {
  const banner = document.querySelector('.cookie-consent-banner');
  if (banner) banner.remove();
}

/* ============================================
   NAVIGATION
   ============================================ */

function initNavigation() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

function initMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const overlay = document.querySelector('.mobile-nav-overlay');

  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    navLinks.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      toggle.classList.remove('active');
      navLinks.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      navLinks.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

/* ============================================
   SCROLL ANIMATIONS
   ============================================ */

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}


/* ============================================
   ACCOUNT DROPDOWN
   ============================================ */

function initAccountDropdown() {
  document.querySelectorAll('.nav-icon-btn[aria-label="Account"]').forEach(btn => {
    if (btn.dataset.accountBound) return;
    btn.dataset.accountBound = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'account-menu';
    btn.parentNode.insertBefore(wrapper, btn);
    wrapper.appendChild(btn);

    const dropdown = document.createElement('div');
    dropdown.className = 'account-dropdown';
    wrapper.appendChild(dropdown);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('active');
      document.querySelectorAll('.account-dropdown.active').forEach(d => d.classList.remove('active'));
      if (!isOpen) {
        renderAccountDropdown(dropdown);
        dropdown.classList.add('active');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.account-menu')) {
      document.querySelectorAll('.account-dropdown.active').forEach(d => d.classList.remove('active'));
    }
  });
}

function renderAccountDropdown(dropdown) {
  const user = state.currentUser;

  if (!user) {
    dropdown.innerHTML = `
      <div class="account-dropdown-guest">
        <p>Sign in to view your profile, wishlist, and order history.</p>
        <a href="${pagePath('signin.html')}" class="btn btn-primary btn-sm">Sign In</a>
      </div>
    `;
    return;
  }

  dropdown.innerHTML = `
    <div class="account-dropdown-user">
      <div class="account-dropdown-avatar">${user.name.charAt(0).toUpperCase()}</div>
      <div>
        <h4>${user.name}</h4>
        <span>${user.email}</span>
      </div>
    </div>
    <a href="${pagePath('profile.html')}" class="account-dropdown-link">${getIcon('user')} Profile</a>
    <a href="${pagePath('wishlist.html')}" class="account-dropdown-link">${getIcon('heart')} Wishlist</a>
    <a href="${pagePath('orders.html')}" class="account-dropdown-link">${getIcon('package')} Order History</a>
    <button class="account-dropdown-link account-signout-btn" onclick="signOut()">${getIcon('arrow-up-right')} Sign Out</button>
  `;
}

/* ============================================
   SEARCH OVERLAY
   ============================================ */

function initSearchOverlay() {
  if (!document.querySelector('.search-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-panel">
        <div class="search-input-wrap">
          ${getIcon('search')}
          <input type="text" id="search-input" placeholder="Search for clothing, accessories..." autocomplete="off">
          <button class="search-close-btn" aria-label="Close search">${getIcon('close')}</button>
        </div>
        <div class="search-results" id="search-results"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#search-input');
    const closeBtn = overlay.querySelector('.search-close-btn');

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(input.value), 200);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        window.location.href = `${pagePath('shop.html')}?search=${encodeURIComponent(input.value.trim())}`;
      }
      if (e.key === 'Escape') closeSearchOverlay();
    });

    closeBtn.addEventListener('click', closeSearchOverlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearchOverlay();
    });
  }

  document.querySelectorAll('.nav-icon-btn[aria-label="Search"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearchOverlay();
    });
  });
}

function openSearchOverlay() {
  const overlay = document.querySelector('.search-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => overlay.querySelector('#search-input').focus(), 100);
}

function closeSearchOverlay() {
  const overlay = document.querySelector('.search-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  overlay.querySelector('#search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
}

async function runSearch(query) {
  const resultsEl = document.getElementById('search-results');
  const q = query.trim().toLowerCase();

  if (!q) {
    resultsEl.innerHTML = '';
    return;
  }

  const data = await loadData();
  if (!data) return;

  const matches = data.products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  ).slice(0, 6);

  if (matches.length === 0) {
    resultsEl.innerHTML = `<p class="search-empty">No results for "${query}"</p>`;
    return;
  }

  resultsEl.innerHTML = matches.map(p => `
    <a href="${pagePath('shop.html')}?search=${encodeURIComponent(p.name)}" class="search-result-item">
      <img src="${assetPath(p.image)}" alt="${p.name}">
      <div>
        <h4>${p.name}</h4>
        <span>${formatPrice(p.price)} &middot; ${p.category}</span>
      </div>
    </a>
  `).join('') + `
    <a href="${pagePath('shop.html')}?search=${encodeURIComponent(query)}" class="search-see-all">
      See all results for "${query}" ${getIcon('arrow-right')}
    </a>
  `;
}

/* ============================================
   WISHLIST
   ============================================ */

function initWishlistButtons() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productId = btn.dataset.productId;
    if (productId) {
      btn.classList.toggle('liked', state.wishlist.includes(productId));
    }

    // initWishlistButtons() can legitimately run more than once on the same
    // page (e.g. once for the main content, again after a related-products
    // grid re-renders). Guard against attaching a second click listener to
    // the same button — otherwise a single click fires the toggle twice
    // and visually cancels itself out.
    if (btn.dataset.wishlistBound) return;
    btn.dataset.wishlistBound = 'true';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.productId;
      if (id) toggleWishlist(id, btn);
    });
  });
}

function toggleWishlist(productId, btn) {
  const index = state.wishlist.indexOf(productId);
  const nowLiked = index === -1;

  if (nowLiked) {
    state.wishlist.push(productId);
    showToast('Added to wishlist!', 'success');
  } else {
    state.wishlist.splice(index, 1);
    showToast('Removed from wishlist', 'success');
  }

  if (hasCookieConsent()) {
    localStorage.setItem('Roger McDaniels_wishlist', JSON.stringify(state.wishlist));
  }

  // Keep every button for this product in sync, not just the one clicked
  // (the same product can appear in more than one place on a page).
  document.querySelectorAll(`.wishlist-btn[data-product-id="${productId}"]`).forEach(el => {
    el.classList.toggle('liked', nowLiked);
  });
}

/* ============================================
   COLOR DOTS
   ============================================ */

function initColorDots() {
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', function(e) {
      e.stopPropagation();
      this.parentElement.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      this.classList.add('active');

      const card = this.closest('.product-card');
      const newImage = this.dataset.image;
      if (card && newImage) {
        const img = card.querySelector('.product-image-wrap img');
        if (img) img.src = newImage;
      }
    });
  });
}


/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */

function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function setButtonLoading(button, label = 'Please wait loading...') {
  if (!button) return;
  if (!button.dataset.originalHtml) {
    button.dataset.originalHtml = button.innerHTML;
  }
  button.disabled = true;
  button.classList.add('loading');
  button.innerHTML = `<span class="button-spinner"></span><span>${label}</span>`;
}

function clearButtonLoading(button) {
  if (!button) return;
  button.disabled = false;
  button.classList.remove('loading');
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

function createLoadingHtml(message = 'Loading...') {
  return `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/* ============================================
   PRODUCT RENDERING
   ============================================ */

function renderProductCard(product) {
  const colorsHtml = product.colors.map((color, i) => {
    const img = assetPath((product.images && product.images[i]) || product.image);
    return `<span class="color-dot ${i === 0 ? 'active' : ''}" style="background:${color}" data-image="${img}"></span>`;
  }).join('');

  const isLiked = state.wishlist.includes(product.id);
  const isPreorder = !!product.is_preorder;
  const preorderMessage = 'Preordered! We will notify you at launch.';

  // stock_quantity may be missing on older rows — only treat a product as
  // out-of-stock/low-stock when we actually have a number to check, and
  // preorder items are exempt (they're expected to have 0 on-hand stock).
  const hasStockInfo = typeof product.stock === 'number';
  const isOutOfStock = hasStockInfo && !isPreorder && product.stock <= 0;
  const isLowStock = hasStockInfo && !isPreorder && product.stock > 0 && product.stock <= 5;

  const tags = [];
  if (isPreorder) {
    tags.push('<span class="tag tag-preorder">Preorder</span>');
  } else if (isOutOfStock) {
    tags.push('<span class="tag tag-out-of-stock">Out of Stock</span>');
  } else if (product.is_new) {
    tags.push('<span class="tag tag-new">New</span>');
  }
  if (isLowStock) {
    tags.push(`<span class="tag tag-low-stock">Only ${product.stock} left</span>`);
  }
  const tagsHtml = tags.length ? `<div class="product-tags">${tags.join('')}</div>` : '';

  const quickAddLabel = isOutOfStock ? 'Out of Stock' : (isPreorder ? 'Preorder' : 'Quick Add');
  const quickAddOnClick = isOutOfStock
    ? ''
    : `onclick="event.stopPropagation(); handleQuickAddClick(this, '${product.id}', '${product.sizes[0]}', '${isPreorder ? preorderMessage : ''}')"`;

  return `
    <div class="product-card fade-in" onclick="window.location.href='${pagePath('product.html')}?id=${product.id}'">
      <div class="product-image-wrap ${isOutOfStock ? 'out-of-stock' : ''}">
        <img src="${assetPath(product.image)}" alt="${product.name}" loading="lazy">
        ${tagsHtml}
        <button class="wishlist-btn ${isLiked ? 'liked' : ''}" data-product-id="${product.id}" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="${isLiked ? '#ef4444' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="quick-add-btn ${isPreorder ? 'preorder' : ''} ${isOutOfStock ? 'disabled' : ''}" ${isOutOfStock ? 'disabled' : ''} ${quickAddOnClick} aria-label="${quickAddLabel} ${product.name}">
          <span class="quick-add-text">${quickAddLabel}</span>
          <span class="quick-add-icon">${getIcon(isPreorder ? 'clock' : 'shopping-bag')}</span>
        </button>
      </div>
      <div class="product-info">
        <h4>${product.name}</h4>
        <div class="rating">
          ${renderStars(product.rating)}
          <span>(${product.reviews})</span>
        </div>
        <div class="product-meta">
          <span class="product-price">${productPriceLabel(product)}</span>
          <div class="color-dots">${colorsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   ADD-TO-CART BUTTON FEEDBACK
   Calls the real addToCart() (defined in cart.js)
   and then flips the clicked button itself to a
   confirmed "Added" / checkmark state for a beat,
   before reverting back to its normal label.
   ============================================ */

function handleQuickAddClick(button, productId, size, preorderMessage) {
  const originalButton = button;
  setButtonLoading(button, 'Please wait loading...');
  addToCart(productId, 1, size, preorderMessage);
  clearButtonLoading(originalButton);
  showAddedToCartState(button, !!preorderMessage);
}

function showAddedToCartState(button, isPreorder) {
  if (!button) return;

  // A rapid re-click (or a fresh add on the same node) should restart the
  // "added" window rather than stack timeouts.
  if (button._addedRevertTimeout) {
    clearTimeout(button._addedRevertTimeout);
  }
  if (!button._originalContent) {
    button._originalContent = button.innerHTML;
  }

  button.classList.add('added');
  button.disabled = true;
  button.innerHTML = `
    <span class="quick-add-text">${isPreorder ? 'Preordered' : 'Added'}</span>
    <span class="quick-add-icon">${getIcon('check')}</span>
  `;

  button._addedRevertTimeout = setTimeout(() => {
    button.classList.remove('added');
    button.disabled = false;
    button.innerHTML = button._originalContent;
    button._addedRevertTimeout = null;
  }, 1600);
}

/* ============================================
   INSTAGRAM EMBEDS
   Renders real Instagram posts using Instagram's own
   official embed widget (instagram.com/embed.js).
   There is no public, no-auth way for a static site to
   pull a profile's photos automatically — Instagram's
   robots.txt blocks scraping and their content API
   requires an authenticated business account + backend —
   so this uses their supported embed mechanism instead:
   give it real post URLs and Instagram renders the live
   post (photo, caption, likes) directly from their CDN.
   ============================================ */

let instagramEmbedScriptPromise = null;

function loadInstagramEmbedScript() {
  if (window.instgrm) return Promise.resolve();
  if (instagramEmbedScriptPromise) return instagramEmbedScriptPromise;

  instagramEmbedScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = resolve; // fail quietly — grid just stays empty/fallback
    document.body.appendChild(script);
  });

  return instagramEmbedScriptPromise;
}

function renderInstagramEmbeds(containerId, postUrls) {
  const grid = document.getElementById(containerId);
  if (!grid || !postUrls || postUrls.length === 0) return;

  grid.innerHTML = `
    <div class="instagram-carousel">
      <button class="instagram-carousel-arrow instagram-carousel-arrow-prev" onclick="instagramCarouselPrev('${containerId}')" aria-label="Previous posts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="instagram-carousel-viewport" id="${containerId}-viewport">
        <div class="instagram-carousel-track" id="${containerId}-track">
          ${postUrls.map(url => `
            <div class="instagram-embed-wrap fade-in">
              <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"></blockquote>
            </div>
          `).join('')}
        </div>
      </div>
      <button class="instagram-carousel-arrow instagram-carousel-arrow-next" onclick="instagramCarouselNext('${containerId}')" aria-label="Next posts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="instagram-carousel-dots" id="${containerId}-dots"></div>
  `;

  loadInstagramEmbedScript().then(() => {
    if (window.instgrm && window.instgrm.Embeds) {
      window.instgrm.Embeds.process();
    }
    watchInstagramEmbeds(containerId);
  });

  initInstagramCarousel(containerId, postUrls.length);
}

/* ---- Crop each embed down to just the media ----
   Instagram's embed.js replaces the <blockquote> with a same-origin-
   blocked iframe and resizes it (via postMessage) to fit header + media
   + like/comment/link chrome. There's no supported way to ask Instagram
   for a media-only embed, so this crops the iframe visually: once its
   height stabilizes, the wrap is clipped to just the media band and the
   iframe is shifted up to hide the header. HEADER/FOOTER_CROP_PX are
   estimates based on the current compact (non-captioned) embed layout —
   if Instagram changes that layout these may need retuning. */
const INSTAGRAM_HEADER_CROP_PX = 62;
const INSTAGRAM_FOOTER_CROP_PX = 130;

function cropInstagramEmbed(wrap, iframe) {
  const applyCrop = () => {
    const fullHeight = parseInt(iframe.style.height, 10) || iframe.offsetHeight;
    if (!fullHeight) return;

    const visible = fullHeight - INSTAGRAM_HEADER_CROP_PX - INSTAGRAM_FOOTER_CROP_PX;
    if (visible <= 40) return; // not measured/resized yet

    wrap.style.height = `${visible}px`;
    iframe.style.top = `-${INSTAGRAM_HEADER_CROP_PX}px`;
    wrap.classList.add('instagram-cropped');
  };

  applyCrop();

  // Instagram resizes the iframe several times as the post finishes
  // loading — re-crop each time until it settles.
  let debounceId;
  const heightObserver = new MutationObserver(() => {
    clearTimeout(debounceId);
    debounceId = setTimeout(applyCrop, 200);
  });
  heightObserver.observe(iframe, { attributes: true, attributeFilter: ['style'] });
}

function watchInstagramEmbeds(containerId) {
  const track = document.getElementById(`${containerId}-track`);
  if (!track) return;

  const cropped = new WeakSet();
  const tryCrop = () => {
    track.querySelectorAll('.instagram-embed-wrap').forEach(wrap => {
      const iframe = wrap.querySelector('iframe');
      if (iframe && !cropped.has(iframe)) {
        cropped.add(iframe);
        cropInstagramEmbed(wrap, iframe);
      }
    });
  };

  tryCrop();
  const observer = new MutationObserver(tryCrop);
  observer.observe(track, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
}

/* ============================================
   INSTAGRAM CAROUSEL
   Auto-advancing, multi-per-view carousel (mirrors
   the comment carousel pattern). Keyed by containerId
   since a page could in principle render more than one.
   ============================================ */

const instagramCarousels = {};

function getInstagramCarouselPerView() {
  const w = window.innerWidth;
  if (w <= 640) return 1;
  if (w <= 1024) return 2;
  return 3;
}

function initInstagramCarousel(containerId, itemCount) {
  const viewport = document.getElementById(`${containerId}-viewport`);
  if (!viewport) return;

  const perView = getInstagramCarouselPerView();
  const state = {
    page: 0,
    itemCount,
    totalPages: Math.max(1, Math.ceil(itemCount / perView)),
    autoplayId: null,
    autoplayDelay: 4000,
    hoverBlocked: false,
    focusBlocked: false
  };
  instagramCarousels[containerId] = state;

  renderInstagramCarouselDots(containerId);
  updateInstagramCarouselPosition(containerId, false);
  updateInstagramAutoplayState(containerId);

  if (!viewport.dataset.carouselBound) {
    viewport.addEventListener('mouseenter', () => {
      state.hoverBlocked = true;
      updateInstagramAutoplayState(containerId);
    });
    viewport.addEventListener('mouseleave', () => {
      state.hoverBlocked = false;
      updateInstagramAutoplayState(containerId);
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const s = instagramCarousels[containerId];
        if (!s) return;
        const newPerView = getInstagramCarouselPerView();
        s.totalPages = Math.max(1, Math.ceil(s.itemCount / newPerView));
        s.page = Math.min(s.page, s.totalPages - 1);
        renderInstagramCarouselDots(containerId);
        updateInstagramCarouselPosition(containerId, false);
      }, 200);
    });

    viewport.dataset.carouselBound = 'true';
  }

  setupInstagramFocusPause();
}

/* Detects when a video inside one of the (cross-origin) Instagram iframes
   has been clicked into. There's no postMessage API for Instagram's embed
   player, so this uses the standard iframe-focus trick instead: clicking
   into an iframe shifts the browser's focus there, which fires `blur` on
   the parent window. We treat that as "likely playing/interacting" and
   hold the carousel until focus returns to the main document. */
let instagramFocusPauseBound = false;

function setupInstagramFocusPause() {
  if (instagramFocusPauseBound) return;
  instagramFocusPauseBound = true;

  let pausedContainerId = null;

  window.addEventListener('blur', () => {
    const active = document.activeElement;
    if (!active || active.tagName !== 'IFRAME') return;
    const track = active.closest('.instagram-carousel-track');
    if (!track) return;

    pausedContainerId = track.id.replace(/-track$/, '');
    const state = instagramCarousels[pausedContainerId];
    if (state) {
      state.focusBlocked = true;
      updateInstagramAutoplayState(pausedContainerId);
    }
  });

  window.addEventListener('focus', () => {
    if (!pausedContainerId) return;
    const state = instagramCarousels[pausedContainerId];
    if (state) {
      state.focusBlocked = false;
      updateInstagramAutoplayState(pausedContainerId);
    }
    pausedContainerId = null;
  });
}

function renderInstagramCarouselDots(containerId) {
  const dots = document.getElementById(`${containerId}-dots`);
  const state = instagramCarousels[containerId];
  if (!dots || !state) return;

  if (state.totalPages <= 1) {
    dots.innerHTML = '';
    return;
  }

  dots.innerHTML = Array.from({ length: state.totalPages }, (_, i) => `
    <button class="instagram-carousel-dot${i === state.page ? ' active' : ''}" onclick="goToInstagramCarouselPage('${containerId}', ${i})" aria-label="Go to slide ${i + 1}"></button>
  `).join('');
}

function updateInstagramCarouselPosition(containerId, smooth = true) {
  const viewport = document.getElementById(`${containerId}-viewport`);
  const state = instagramCarousels[containerId];
  if (!viewport || !state) return;

  viewport.scrollTo({
    left: state.page * viewport.clientWidth,
    behavior: smooth ? 'smooth' : 'auto'
  });

  document.querySelectorAll(`#${containerId}-dots .instagram-carousel-dot`).forEach((dot, i) => {
    dot.classList.toggle('active', i === state.page);
  });
}

function goToInstagramCarouselPage(containerId, page) {
  const state = instagramCarousels[containerId];
  if (!state) return;
  state.page = page;
  updateInstagramCarouselPosition(containerId, true);
  updateInstagramAutoplayState(containerId);
}

function instagramCarouselNext(containerId) {
  const state = instagramCarousels[containerId];
  if (!state) return;
  state.page = (state.page + 1) % state.totalPages;
  updateInstagramCarouselPosition(containerId, true);
  updateInstagramAutoplayState(containerId);
}

function instagramCarouselPrev(containerId) {
  const state = instagramCarousels[containerId];
  if (!state) return;
  state.page = (state.page - 1 + state.totalPages) % state.totalPages;
  updateInstagramCarouselPosition(containerId, true);
  updateInstagramAutoplayState(containerId);
}

// Starts or stops autoplay depending on the current blocker flags —
// the single place that decides whether the carousel is allowed to move.
function updateInstagramAutoplayState(containerId) {
  const state = instagramCarousels[containerId];
  if (!state) return;

  if (state.hoverBlocked || state.focusBlocked) {
    stopInstagramCarouselAutoplay(containerId);
  } else {
    startInstagramCarouselAutoplay(containerId);
  }
}

// Autoplay disabled: the Instagram carousel only advances via the arrows,
// dots, or manual swipe/scroll. This function is kept (as a no-op) rather
// than removed so the hover/focus-blocker plumbing that calls it elsewhere
// doesn't need to change.
function startInstagramCarouselAutoplay(containerId) {
  stopInstagramCarouselAutoplay(containerId);
}

function stopInstagramCarouselAutoplay(containerId) {
  const state = instagramCarousels[containerId];
  if (state && state.autoplayId) {
    clearInterval(state.autoplayId);
    state.autoplayId = null;
  }
}

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let html = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    } else if (i === fullStars && hasHalf) {
      html += '<svg viewBox="0 0 24 24"><defs><linearGradient id="half"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#half)" stroke="#f59e0b" stroke-width="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    } else {
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
  }
  return html;
}

/* ============================================
   ICONS (SVG)
   ============================================ */

const icons = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  diamond: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  'refresh-cw': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  'shield-check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 16 10"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  'arrow-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  'arrow-up-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
  'chevron-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  'star-half': '<svg viewBox="0 0 24 24"><defs><linearGradient id="half"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#half)" stroke="#f59e0b" stroke-width="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  'star-empty': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  'shopping-bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  'credit-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  'help-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  'zap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
};

function getIcon(name) {
  return icons[name] || '';
}

/* ============================================
   FAQ ACCORDION
   ============================================ */

function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const answer = item.querySelector('.faq-answer');
  const isActive = item.classList.contains('active');

  document.querySelectorAll('.faq-item.active').forEach(other => {
    other.classList.remove('active');
    other.querySelector('.faq-answer').style.maxHeight = null;
  });

  if (!isActive) {
    item.classList.add('active');
    answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}

/* ============================================
   UTILITY
   ============================================ */

function formatPrice(price) {
  const amount = Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `GH₵${amount}`;
}

// Returns the price for a specific size, falling back to the product's
// base price when no size (or no size-specific price) is given.
// (Used by components/cart.js, components/checkout.js, and product.html.)
// Shows "From GH₵x" when sizes carry different prices, otherwise a flat price.
function productPriceLabel(product) {
  if (!product.sizePrices) return formatPrice(product.price);
  const prices = Object.values(product.sizePrices);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatPrice(min);
  return `From ${formatPrice(min)}`;
}

function getLineItemPrice(product, size) {
  if (product.sizePrices && size && product.sizePrices[size] !== undefined) {
    return product.sizePrices[size];
  }
  return product.price;
}

function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/* ============================================
   SHARE MODAL
   ============================================ */

function openShareModal(options = {}) {
  const url = options.url || window.location.href;
  const title = options.title || document.title;
  const text = options.text || title;

  let overlay = document.querySelector('.share-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'share-modal-overlay';
    document.body.appendChild(overlay);
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const platforms = [
    {
      name: 'whatsapp',
      label: '',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: '<svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.85.505 3.66 1.46 5.24L2 22l4.9-1.416A9.958 9.958 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.13a8.108 8.108 0 01-4.13-1.13l-.296-.176-3.045.88.86-2.968-.192-.305A8.107 8.107 0 013.87 12c0-4.484 3.648-8.13 8.131-8.13 4.483 0 8.13 3.646 8.13 8.13 0 4.484-3.647 8.13-8.13 8.13z"/></svg>'
    },
    {
      name: 'instagram',
      label: '',
      href: `https://www.instagram.com/`,
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>'
    },
    {
      name: 'snapchat',
      label: '',
      href: `https://www.snapchat.com/`,
      icon: '<svg width="800px" height="800px" viewBox="147.353 39.286 514.631 514.631" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><path style="fill:#FFFC00;" d="M147.553,423.021v0.023c0.308,11.424,0.403,22.914,2.33,34.268 c2.042,12.012,4.961,23.725,10.53,34.627c7.529,14.756,17.869,27.217,30.921,37.396c9.371,7.309,19.608,13.111,30.94,16.771 c16.524,5.33,33.571,7.373,50.867,7.473c10.791,0.068,21.575,0.338,32.37,0.293c78.395-0.33,156.792,0.566,235.189-0.484 c10.403-0.141,20.636-1.41,30.846-3.277c19.569-3.582,36.864-11.932,51.661-25.133c17.245-15.381,28.88-34.205,34.132-56.924 c3.437-14.85,4.297-29.916,4.444-45.035v-3.016c0-1.17-0.445-256.892-0.486-260.272c-0.115-9.285-0.799-18.5-2.54-27.636 c-2.117-11.133-5.108-21.981-10.439-32.053c-5.629-10.641-12.68-20.209-21.401-28.57c-13.359-12.81-28.775-21.869-46.722-26.661 c-16.21-4.327-32.747-5.285-49.405-5.27c-0.027-0.004-0.09-0.173-0.094-0.255H278.56c-0.005,0.086-0.008,0.172-0.014,0.255 c-9.454,0.173-18.922,0.102-28.328,1.268c-10.304,1.281-20.509,3.21-30.262,6.812c-15.362,5.682-28.709,14.532-40.11,26.347 c-12.917,13.386-22.022,28.867-26.853,46.894c-4.31,16.084-5.248,32.488-5.271,49.008"/><path style="fill:#FFFFFF;" d="M407.001,473.488c-1.068,0-2.087-0.039-2.862-0.076c-0.615,0.053-1.25,0.076-1.886,0.076 c-22.437,0-37.439-10.607-50.678-19.973c-9.489-6.703-18.438-13.031-28.922-14.775c-5.149-0.854-10.271-1.287-15.22-1.287 c-8.917,0-15.964,1.383-21.109,2.389c-3.166,0.617-5.896,1.148-8.006,1.148c-2.21,0-4.895-0.49-6.014-4.311 c-0.887-3.014-1.523-5.934-2.137-8.746c-1.536-7.027-2.65-11.316-5.281-11.723c-28.141-4.342-44.768-10.738-48.08-18.484 c-0.347-0.814-0.541-1.633-0.584-2.443c-0.129-2.309,1.501-4.334,3.777-4.711c22.348-3.68,42.219-15.492,59.064-35.119 c13.049-15.195,19.457-29.713,20.145-31.316c0.03-0.072,0.065-0.148,0.101-0.217c3.247-6.588,3.893-12.281,1.926-16.916 c-3.626-8.551-15.635-12.361-23.58-14.882c-1.976-0.625-3.845-1.217-5.334-1.808c-7.043-2.782-18.626-8.66-17.083-16.773 c1.124-5.916,8.949-10.036,15.273-10.036c1.756,0,3.312,0.308,4.622,0.923c7.146,3.348,13.575,5.045,19.104,5.045 c6.876,0,10.197-2.618,11-3.362c-0.198-3.668-0.44-7.546-0.674-11.214c0-0.004-0.005-0.048-0.005-0.048 c-1.614-25.675-3.627-57.627,4.546-75.95c24.462-54.847,76.339-59.112,91.651-59.112c0.408,0,6.674-0.062,6.674-0.062 c0.283-0.005,0.59-0.009,0.908-0.009c15.354,0,67.339,4.27,91.816,59.15c8.173,18.335,6.158,50.314,4.539,76.016l-0.076,1.23 c-0.222,3.49-0.427,6.793-0.6,9.995c0.756,0.696,3.795,3.096,9.978,3.339c5.271-0.202,11.328-1.891,17.998-5.014 c2.062-0.968,4.345-1.169,5.895-1.169c2.343,0,4.727,0.456,6.714,1.285l0.106,0.041c5.66,2.009,9.367,6.024,9.447,10.242 c0.071,3.932-2.851,9.809-17.223,15.485c-1.472,0.583-3.35,1.179-5.334,1.808c-7.952,2.524-19.951,6.332-23.577,14.878 c-1.97,4.635-1.322,10.326,1.926,16.912c0.036,0.072,0.067,0.145,0.102,0.221c1,2.344,25.205,57.535,79.209,66.432 c2.275,0.379,3.908,2.406,3.778,4.711c-0.048,0.828-0.248,1.656-0.598,2.465c-3.289,7.703-19.915,14.09-48.064,18.438 c-2.642,0.408-3.755,4.678-5.277,11.668c-0.63,2.887-1.271,5.717-2.146,8.691c-0.819,2.797-2.641,4.164-5.567,4.164h-0.441 c-1.905,0-4.604-0.346-8.008-1.012c-5.95-1.158-12.623-2.236-21.109-2.236c-4.948,0-10.069,0.434-15.224,1.287 c-10.473,1.744-19.421,8.062-28.893,14.758C444.443,462.88,429.436,473.488,407.001,473.488"/><path style="fill:#020202;" d="M408.336,124.235c14.455,0,64.231,3.883,87.688,56.472c7.724,17.317,5.744,48.686,4.156,73.885 c-0.248,3.999-0.494,7.875-0.694,11.576l-0.084,1.591l1.062,1.185c0.429,0.476,4.444,4.672,13.374,5.017l0.144,0.008l0.15-0.003 c5.904-0.225,12.554-2.059,19.776-5.442c1.064-0.498,2.48-0.741,3.978-0.741c1.707,0,3.521,0.321,5.017,0.951l0.226,0.09 c3.787,1.327,6.464,3.829,6.505,6.093c0.022,1.28-0.935,5.891-14.359,11.194c-1.312,0.518-3.039,1.069-5.041,1.7 c-8.736,2.774-21.934,6.96-26.376,17.427c-2.501,5.896-1.816,12.854,2.034,20.678c1.584,3.697,26.52,59.865,82.631,69.111 c-0.011,0.266-0.079,0.557-0.229,0.9c-0.951,2.24-6.996,9.979-44.612,15.783c-5.886,0.902-7.328,7.5-9,15.17 c-0.604,2.746-1.218,5.518-2.062,8.381c-0.258,0.865-0.306,0.914-1.233,0.914c-0.128,0-0.278,0-0.442,0 c-1.668,0-4.2-0.346-7.135-0.922c-5.345-1.041-12.647-2.318-21.982-2.318c-5.21,0-10.577,0.453-15.962,1.352 c-11.511,1.914-20.872,8.535-30.786,15.543c-13.314,9.408-27.075,19.143-48.071,19.143c-0.917,0-1.812-0.031-2.709-0.076 l-0.236-0.01l-0.237,0.018c-0.515,0.045-1.034,0.068-1.564,0.068c-20.993,0-34.76-9.732-48.068-19.143 c-9.916-7.008-19.282-13.629-30.791-15.543c-5.38-0.896-10.752-1.352-15.959-1.352c-9.333,0-16.644,1.428-21.978,2.471 c-2.935,0.574-5.476,1.066-7.139,1.066c-1.362,0-1.388-0.08-1.676-1.064c-0.844-2.865-1.461-5.703-2.062-8.445 c-1.676-7.678-3.119-14.312-9.002-15.215c-37.613-5.809-43.659-13.561-44.613-15.795c-0.149-0.352-0.216-0.652-0.231-0.918 c56.11-9.238,81.041-65.408,82.63-69.119c3.857-7.818,4.541-14.775,2.032-20.678c-4.442-10.461-17.638-14.653-26.368-17.422 c-2.007-0.635-3.735-1.187-5.048-1.705c-11.336-4.479-14.823-8.991-14.305-11.725c0.601-3.153,6.067-6.359,10.837-6.359 c1.072,0,2.012,0.173,2.707,0.498c7.747,3.631,14.819,5.472,21.022,5.472c9.751,0,14.091-4.537,14.557-5.055l1.057-1.182 l-0.085-1.583c-0.197-3.699-0.44-7.574-0.696-11.565c-1.583-25.205-3.563-56.553,4.158-73.871 c23.37-52.396,72.903-56.435,87.525-56.435c0.36,0,6.717-0.065,6.717-0.065C407.744,124.239,408.033,124.235,408.336,124.235 M408.336,115.197h-0.017c-0.333,0-0.646,0-0.944,0.004c-2.376,0.024-6.282,0.062-6.633,0.066c-8.566,0-25.705,1.21-44.115,9.336 c-10.526,4.643-19.994,10.921-28.14,18.66c-9.712,9.221-17.624,20.59-23.512,33.796c-8.623,19.336-6.576,51.905-4.932,78.078 l0.006,0.041c0.176,2.803,0.361,5.73,0.53,8.582c-1.265,0.581-3.316,1.194-6.339,1.194c-4.864,0-10.648-1.555-17.187-4.619 c-1.924-0.896-4.12-1.349-6.543-1.349c-3.893,0-7.997,1.146-11.557,3.239c-4.479,2.63-7.373,6.347-8.159,10.468 c-0.518,2.726-0.493,8.114,5.492,13.578c3.292,3.008,8.128,5.782,14.37,8.249c1.638,0.645,3.582,1.261,5.641,1.914 c7.145,2.271,17.959,5.702,20.779,12.339c1.429,3.365,0.814,7.793-1.823,13.145c-0.069,0.146-0.138,0.289-0.201,0.439 c-0.659,1.539-6.807,15.465-19.418,30.152c-7.166,8.352-15.059,15.332-23.447,20.752c-10.238,6.617-21.316,10.943-32.923,12.855 c-4.558,0.748-7.813,4.809-7.559,9.424c0.078,1.33,0.39,2.656,0.931,3.939c0.004,0.008,0.009,0.016,0.013,0.023 c1.843,4.311,6.116,7.973,13.063,11.203c8.489,3.943,21.185,7.26,37.732,9.855c0.836,1.59,1.704,5.586,2.305,8.322 c0.629,2.908,1.285,5.898,2.22,9.074c1.009,3.441,3.626,7.553,10.349,7.553c2.548,0,5.478-0.574,8.871-1.232 c4.969-0.975,11.764-2.305,20.245-2.305c4.702,0,9.575,0.414,14.48,1.229c9.455,1.574,17.606,7.332,27.037,14 c13.804,9.758,29.429,20.803,53.302,20.803c0.651,0,1.304-0.021,1.949-0.066c0.789,0.037,1.767,0.066,2.799,0.066 c23.88,0,39.501-11.049,53.29-20.799l0.022-0.02c9.433-6.66,17.575-12.41,27.027-13.984c4.903-0.814,9.775-1.229,14.479-1.229 c8.102,0,14.517,1.033,20.245,2.15c3.738,0.736,6.643,1.09,8.872,1.09l0.218,0.004h0.226c4.917,0,8.53-2.699,9.909-7.422 c0.916-3.109,1.57-6.029,2.215-8.986c0.562-2.564,1.46-6.674,2.296-8.281c16.558-2.6,29.249-5.91,37.739-9.852 c6.931-3.215,11.199-6.873,13.053-11.166c0.556-1.287,0.881-2.621,0.954-3.979c0.261-4.607-2.999-8.676-7.56-9.424 c-51.585-8.502-74.824-61.506-75.785-63.758c-0.062-0.148-0.132-0.295-0.205-0.438c-2.637-5.354-3.246-9.777-1.816-13.148 c2.814-6.631,13.621-10.062,20.771-12.332c2.07-0.652,4.021-1.272,5.646-1.914c7.039-2.78,12.07-5.796,15.389-9.221 c3.964-4.083,4.736-7.995,4.688-10.555c-0.121-6.194-4.856-11.698-12.388-14.393c-2.544-1.052-5.445-1.607-8.399-1.607 c-2.011,0-4.989,0.276-7.808,1.592c-6.035,2.824-11.441,4.368-16.082,4.588c-2.468-0.125-4.199-0.66-5.32-1.171 c0.141-2.416,0.297-4.898,0.458-7.486l0.067-1.108c1.653-26.19,3.707-58.784-4.92-78.134c-5.913-13.253-13.853-24.651-23.604-33.892 c-8.178-7.744-17.678-14.021-28.242-18.661C434.052,116.402,416.914,115.197,408.336,115.197"/><rect x="147.553" y="39.443" style="fill:none;" width="514.231" height="514.23"/></svg>'
    },
    {
      name: 'facebook',
      label: '',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: '<svg viewBox="0 0 24 24" fill="white"><path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.876h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z"/></svg>'
    },
    {
      name: 'twitter',
      label: '',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      icon: '<svg viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    }
  ];

  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <h3>Share this product</h3>
        <button type="button" class="share-modal-close" aria-label="Close" onclick="closeShareModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="share-modal-body">
        <div class="share-modal-platforms">
          ${platforms.map(p => `
            <a class="share-platform-btn" href="${p.href}" target="_blank" rel="noopener noreferrer">
              <span class="share-platform-icon ${p.name}">${p.icon}</span>
              <span>${p.label}</span>
            </a>
          `).join('')}
        </div>
        <div class="share-modal-copy">
          <input type="text" readonly value="${url}" id="share-modal-url-input" onclick="this.select()">
          <button type="button" class="share-copy-btn" id="share-copy-btn" onclick="copyShareLink('${url.replace(/'/g, "\\'")}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy
          </button>
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.onclick = (e) => {
    if (e.target === overlay) closeShareModal();
  };
}

function closeShareModal() {
  const overlay = document.querySelector('.share-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

function copyShareLink(url) {
  const finish = () => {
    const btn = document.getElementById('share-copy-btn');
    if (btn) {
      const original = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Copied`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = original;
      }, 1800);
    }
    showToast('Link copied to clipboard!', 'success');
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(finish).catch(() => {
      const input = document.getElementById('share-modal-url-input');
      if (input) { input.select(); document.execCommand('copy'); }
      finish();
    });
  } else {
    const input = document.getElementById('share-modal-url-input');
    if (input) { input.select(); document.execCommand('copy'); }
    finish();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData, loadComments, loadRegions, loadOrders, toggleWishlist, showToast,
    renderProductCard, getIcon, formatPrice, getLineItemPrice, productPriceLabel,
    getUrlParam, state, toggleFaq, pagePath, assetPath, signIn, signUp,
    signOut, requireAuth, updateProfileName, changePassword, initAuthSession,
    openShareModal, closeShareModal, copyShareLink
  };
}