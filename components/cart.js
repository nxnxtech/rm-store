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

function addToCart(productId, qty = 1, size = null, message) {
  const existing = findCartItem(productId, size);

  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ id: productId, qty, size: size || null });
  }

  localStorage.setItem('Roger McDaniels_cart', JSON.stringify(state.cart));
  updateCartBadge();
  showToast(message || 'Added to cart!', 'success');
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

  const data = await loadData();
  if (!data) return;

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
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(i => i !== item);
  }
  localStorage.setItem('Roger McDaniels_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartModal();
}

function removeFromCart(productId, size) {
  state.cart = state.cart.filter(i => !(i.id === productId && i.size === (size || null)));
  localStorage.setItem('Roger McDaniels_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartModal();
  showToast('Item removed from cart', 'success');
}