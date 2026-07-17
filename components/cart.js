async function loadCartFromDb() {
  if (!state.currentUser) return; // guest — keep the localStorage cart as-is

  if (hasCookieConsent()) {
    const guestCart = JSON.parse(localStorage.getItem('Roger McDaniels_cart')) || [];
    for (const item of guestCart) {
      await upsertCartItemInDb(item.id, item.qty, item.size);
    }
    localStorage.removeItem('Roger McDaniels_cart');
  }

  const { data, error } = await supabase
    .from('rm_store_cart_items')
    .select('product_id, size, qty, rm_store_products(slug)')
    .eq('user_id', state.currentUser.id);

  if (error) {
    console.error('Failed to load cart from Supabase:', error);
    return;
  }

  state.cart = (data || []).map(row => ({
    id: row.rm_store_products?.slug || row.product_id,
    dbId: row.product_id,
    qty: row.qty,
    size: row.size
  }));

  saveCartToLocalStorage();
  updateCartBadge();
}

async function resolveProductDbId(productId) {
  // productId may already be the products.dbId (uuid) or the slug ('p1').
  const cached = state.data?.products?.find(p => p.id === productId);
  if (cached?.dbId) return cached.dbId;

  const { data } = await supabase
    .from('rm_store_products')
    .select('id')
    .or(`slug.eq.${productId},id.eq.${productId}`)
    .maybeSingle();

  return data?.id || null;
}

async function upsertCartItemInDb(productId, qty, size) {
  if (!state.currentUser) return;
  const dbId = await resolveProductDbId(productId);
  if (!dbId) return;

  await supabase.from('rm_store_cart_items').upsert({
    user_id: state.currentUser.id,
    product_id: dbId,
    size: size || null,
    qty
  }, { onConflict: 'user_id,product_id,size' });
}

async function deleteCartItemInDb(productId, size) {
  if (!state.currentUser) return;
  const dbId = await resolveProductDbId(productId);
  if (!dbId) return;

  await supabase
    .from('rm_store_cart_items')
    .delete()
    .eq('user_id', state.currentUser.id)
    .eq('product_id', dbId)
    .eq('size', size || null);
}

function initCartBadge() {
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function findCartItem(productId, size) {
  return state.cart.find(item => item.id === productId && item.size === (size || null));
}

// Looks up the stock cap for a product/size from whatever catalog data is
// currently loaded. Returns null when unknown (no cap enforced in that case).
function getStockCapFor(productId, size) {
  const product = state.data?.products?.find(p => p.id === productId);
  if (!product) return null;
  return getLineItemStock(product, size || null);
}

function saveCartToLocalStorage() {
  if (!hasCookieConsent()) return; // no consent — cart stays in-memory only
  localStorage.setItem('Roger McDaniels_cart', JSON.stringify(state.cart));
}

function addToCart(productId, qty = 1, size = null, message) {
  const existing = findCartItem(productId, size);
  const cap = getStockCapFor(productId, size);

  const currentQty = existing ? existing.qty : 0;
  let nextQty = currentQty + qty;
  let capped = false;
  if (cap !== null) {
    if (cap <= 0) {
      showToast('This item is out of stock', 'error');
      return;
    }
    if (nextQty > cap) {
      nextQty = cap;
      capped = true;
    }
  }
  if (existing && nextQty === currentQty) {
    // Already at (or above) the cap — nothing to add.
    if (capped) showToast(`Only ${cap} in stock — cart already has the max`, 'error');
    return;
  }

  if (existing) {
    existing.qty = nextQty;
  } else {
    state.cart.push({ id: productId, qty: nextQty, size: size || null });
  }

  if (state.currentUser) {
    upsertCartItemInDb(productId, nextQty, size);
  }

  saveCartToLocalStorage();
  updateCartBadge();
  showToast(capped ? `Only ${cap} in stock — added the max available` : (message || 'Added to cart!'), capped ? 'error' : 'success');
  renderCartModal();
}

/* ============================================
   CART MODAL
   ============================================ */

function initCartModal() {
  if (!document.querySelector('.cart-modal-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'cart-modal-overlay';
    overlay.innerHTML = `
      <div class="cart-modal">
        <div class="cart-modal-header">
          <h3>${getIcon('shopping-bag')} Your Cart</h3>
          <button class="cart-modal-close" aria-label="Close cart">${getIcon('close')}</button>
        </div>
        <div class="cart-modal-body" id="cart-modal-body"></div>
        <div class="cart-modal-footer" id="cart-modal-footer"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCartModal();
    });
    overlay.querySelector('.cart-modal-close').addEventListener('click', closeCartModal);
  }

  // Bind every cart icon button on the page to open the modal
  document.querySelectorAll('.nav-icon-btn[aria-label="Cart"]').forEach(btn => {
    if (btn.dataset.cartBound) return;
    btn.dataset.cartBound = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCartModal();
    });
  });
}

function openCartModal() {
  const overlay = document.querySelector('.cart-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderCartModal();
}

function closeCartModal() {
  const overlay = document.querySelector('.cart-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

async function renderCartModal() {
  const body = document.getElementById('cart-modal-body');
  const footer = document.getElementById('cart-modal-footer');
  if (!body || !footer) return;

  if (state.cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        ${getIcon('shopping-bag')}
        <h4>Your cart is empty</h4>
        <p>Looks like you haven't added anything yet.</p>
      </div>
    `;
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;
  footer.innerHTML = '';

  const data = await loadData();
  if (!data) {
    body.innerHTML = `
      <div class="cart-empty">
        <p>Unable to load cart items. Please try again.</p>
      </div>
    `;
    return;
  }

  let total = 0;
  const rows = state.cart.map(item => {
    const product = data.products.find(p => p.id === item.id);
    if (!product) return '';
    const unitPrice = getLineItemPrice(product, item.size);
    const lineTotal = unitPrice * item.qty;
    total += lineTotal;
    return `
      <div class="cart-modal-item" data-id="${product.id}" data-size="${item.size || ''}">
        <img src="${assetPath(product.image)}" alt="${product.name}">
        <div class="cart-modal-item-info">
          <h4>${product.name}</h4>
          ${item.size ? `<span class="cart-modal-item-size">Size: ${item.size}</span>` : ''}
          <span class="cart-modal-item-price">${formatPrice(unitPrice)}</span>
          <div class="cart-qty-control">
            <button class="qty-btn" onclick="changeCartQty('${product.id}', '${item.size || ''}', -1)">${getIcon('minus')}</button>
            <span>${item.qty}</span>
            <button class="qty-btn" onclick="changeCartQty('${product.id}', '${item.size || ''}', 1)">${getIcon('plus')}</button>
          </div>
        </div>
        <button class="cart-remove-btn" aria-label="Remove item" onclick="removeFromCart('${product.id}', '${item.size || ''}')">${getIcon('trash')}</button>
      </div>
    `;
  }).join('');

  body.innerHTML = rows;
  footer.innerHTML = `
    <div class="cart-modal-total">
      <span>Subtotal</span>
      <strong>${formatPrice(total)}</strong>
    </div>
    <button class="btn btn-primary cart-checkout-btn" onclick="openCheckoutModal()">
      Checkout
      ${getIcon('arrow-up-right')}
    </button>
  `;
}

function changeCartQty(productId, size, delta) {
  const item = findCartItem(productId, size || null);
  if (!item) return;

  if (delta > 0) {
    const cap = getStockCapFor(productId, size || null);
    if (cap !== null && item.qty >= cap) {
      showToast(`Only ${cap} in stock`, 'error');
      return;
    }
    if (cap !== null && item.qty + delta > cap) {
      delta = cap - item.qty;
    }
  }

  item.qty += delta;
  const removed = item.qty <= 0;
  if (removed) {
    state.cart = state.cart.filter(i => i !== item);
  }

  if (state.currentUser) {
    removed ? deleteCartItemInDb(productId, size) : upsertCartItemInDb(productId, item.qty, size);
  }

  saveCartToLocalStorage();
  updateCartBadge();
  renderCartModal();
}

function removeFromCart(productId, size) {
  state.cart = state.cart.filter(i => !(i.id === productId && i.size === (size || null)));

  if (state.currentUser) {
    deleteCartItemInDb(productId, size);
  }

  saveCartToLocalStorage();
  updateCartBadge();
  renderCartModal();
  showToast('Item removed from cart', 'success');
}