/* ============================================
   HEADER COMPONENT
   Builds the nav bar directly in JS (no fetch —
   this keeps it working even when the site is
   opened without a dev server) and mounts it into
   #header-placeholder. See components/header.html
   for the same markup as a plain reference file.
   ============================================ */

function getHeaderComponentHtml(homeHref, pagePrefix) {
  return `
<nav class="nav-glass" id="navbar">
  <a href="${homeHref}" class="logo">Roger McDaniels</a>
  <ul class="nav-links">
    <li><a href="${homeHref}" data-nav="index">Home</a></li>
    <li><a href="${pagePrefix}shop.html" data-nav="shop">Shop</a></li>
    <li><a href="${pagePrefix}new-arrivals.html" data-nav="new-arrivals">New Arrivals</a></li>
    <li><a href="${pagePrefix}collections.html" data-nav="collections">Collections</a></li>
    <li><a href="${pagePrefix}about.html" data-nav="about">RM</a></li>
    <li><a href="${pagePrefix}contact.html" data-nav="contact">Contact</a></li>
  </ul>
  <div class="nav-icons">
    <button class="nav-icon-btn" aria-label="Search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </button>
    <button class="nav-icon-btn" aria-label="Account">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </button>
    <button class="nav-icon-btn" aria-label="Cart">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <span class="cart-badge">0</span>
    </button>
    <button class="mobile-menu-toggle" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>
<div class="mobile-nav-overlay"></div>
  `;
}

function loadHeaderComponent() {
  const mount = document.getElementById('header-placeholder');
  if (!mount) return;

  const isInPagesFolder = window.location.pathname.includes('/pages/');
  const homeHref = isInPagesFolder ? '../index.html' : 'index.html';
  const pagePrefix = isInPagesFolder ? '' : 'pages/';

  mount.innerHTML = getHeaderComponentHtml(homeHref, pagePrefix);

  // Mark the active nav link based on the current file name
  const currentFile = (window.location.pathname.split('/').pop() || 'index.html') || 'index.html';
  const currentKey = currentFile.replace('.html', '') || 'index';
  mount.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === currentKey) link.classList.add('active');
  });

  // Re-run the interactive behaviors that depend on the header markup
  if (typeof initNavigation === 'function') initNavigation();
  if (typeof initMobileMenu === 'function') initMobileMenu();
  if (typeof initCartBadge === 'function') initCartBadge();
  if (typeof initCartModal === 'function') initCartModal();
  if (typeof initSearchOverlay === 'function') initSearchOverlay();
  if (typeof initAccountDropdown === 'function') initAccountDropdown();
}
