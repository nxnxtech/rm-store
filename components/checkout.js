
function initCheckoutModal() {
  if (document.querySelector('.checkout-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'checkout-modal-overlay';
  overlay.innerHTML = `
    <div class="checkout-modal">
      <div class="checkout-modal-header">
        <h3>${getIcon('credit-card')} Checkout</h3>
        <button class="checkout-modal-close" aria-label="Close checkout">${getIcon('close')}</button>
      </div>
      <div class="checkout-modal-body" id="checkout-modal-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCheckoutModal();
  });
  overlay.querySelector('.checkout-modal-close').addEventListener('click', closeCheckoutModal);
}

async function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  closeCartModal();

  const overlay = document.querySelector('.checkout-modal-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  await renderCheckoutForm();
}

function closeCheckoutModal() {
  const overlay = document.querySelector('.checkout-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

async function renderCheckoutForm() {
  const body = document.getElementById('checkout-modal-body');
  if (!body) return;

  const data = await loadData();
  const regions = await loadRegions();
  if (!data) return;

  let total = 0;
  const cartItems = state.cart.map(item => {
    const product = data.products.find(p => p.id === item.id);
    if (!product) return null;
    const unitPrice = getLineItemPrice(product, item.size);
    const lineTotal = unitPrice * item.qty;
    total += lineTotal;
    return { product, qty: item.qty, size: item.size, unitPrice, lineTotal };
  }).filter(Boolean);

  const itemsHtml = cartItems.map(({ product, qty, size, lineTotal }) => `
    <div class="checkout-line-item">
      <span>${product.name}${size ? ` <span class="checkout-line-size">(Size: ${size})</span>` : ''} <strong>x${qty}</strong></span>
      <span>${formatPrice(lineTotal)}</span>
    </div>
  `).join('');

  const shippingFee = total > 900 ? 0 : 40;
  const grandTotal = total + shippingFee;
  const user = state.currentUser;

  state.pendingOrder = { cartItems, total, shippingFee, grandTotal };

  const regionOptions = regions.map(r => `<option value="${r.region}">${r.region}</option>`).join('');

  body.innerHTML = `
    <div class="checkout-summary">
      ${itemsHtml}
      <div class="checkout-line-item">
        <span>Shipping</span>
        <span>${shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
      </div>
      <div class="checkout-line-item checkout-total-row">
        <span>Total</span>
        <span>${formatPrice(grandTotal)}</span>
      </div>
    </div>

    <form id="checkout-shipping-form">
      <h4 class="checkout-section-title">Delivery Details</h4>
      <div class="form-row">
        <div class="form-group">
          <label for="checkout-name">Full Name</label>
          <input type="text" id="checkout-name" required placeholder="Jane Doe" value="${user ? user.name : ''}">
        </div>
        <div class="form-group">
          <label for="checkout-email">Email</label>
          <input type="email" id="checkout-email" required placeholder="jane@example.com" value="${user ? user.email : ''}">
        </div>
      </div>
      <div class="form-group">
        <label for="checkout-phone">Phone Number</label>
        <input type="tel" id="checkout-phone" required placeholder="024 123 4567">
      </div>
      <div class="form-group">
        <label for="checkout-address">Delivery Address</label>
        <input type="text" id="checkout-address" required placeholder="House number, street name, area name">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="checkout-region">Region</label>
          <select id="checkout-region" required onchange="populateGhanaCities()">
            <option value="">Select region</option>
            ${regionOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="checkout-city">City / Town</label>
          <select id="checkout-city" required>
            <option value="">Select region first</option>
          </select>
        </div>
      </div>

      <button type="submit" class="btn btn-primary checkout-submit-btn">
        Continue to Payment
        ${getIcon('arrow-right')}
      </button>
    </form>
  `;

  document.getElementById('checkout-shipping-form').addEventListener('submit', handleShippingSubmit);
}

function populateGhanaCities() {
  const regionSelect = document.getElementById('checkout-region');
  const citySelect = document.getElementById('checkout-city');
  const region = state.regionsData.find(r => r.region === regionSelect.value);

  if (!region) {
    citySelect.innerHTML = '<option value="">Select region first</option>';
    return;
  }

  citySelect.innerHTML = `<option value="">Select city</option>` +
    region.cities.map(c => `<option value="${c}">${c}</option>`).join('');
}

function handleShippingSubmit(e) {
  e.preventDefault();

  state.pendingOrder.customer = {
    name: document.getElementById('checkout-name').value,
    email: document.getElementById('checkout-email').value,
    phone: document.getElementById('checkout-phone').value,
    address: document.getElementById('checkout-address').value,
    region: document.getElementById('checkout-region').value,
    city: document.getElementById('checkout-city').value
  };

  renderPaystackStep();
}

/* ============================================
   PAYSTACK PAYMENT SIMULATION
   ============================================ */

function renderPaystackStep() {
  const body = document.getElementById('checkout-modal-body');
  if (!body || !state.pendingOrder) return;

  const { grandTotal, customer } = state.pendingOrder;

  body.innerHTML = `
    <div class="paystack-panel">
      <div class="paystack-header">
        <div class="paystack-brand"><span>Pay</span>stack</div>
        <span class="paystack-secure">${getIcon('shield-check')} Secure Payment</span>
      </div>
      <p class="paystack-merchant">Pay <strong>Roger McDaniels</strong></p>
      <p class="paystack-amount">${formatPrice(grandTotal)}</p>
      <p class="paystack-email">${customer.email}</p>

      <form id="paystack-card-form">
        <div class="form-group">
          <label for="paystack-card">Card Number</label>
          <input type="text" id="paystack-card" required placeholder="4084 0840 8408 4081" maxlength="19" inputmode="numeric">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="paystack-expiry">Expiry</label>
            <input type="text" id="paystack-expiry" required placeholder="MM/YY" maxlength="5">
          </div>
          <div class="form-group">
            <label for="paystack-cvv">CVV</label>
            <input type="text" id="paystack-cvv" required placeholder="408" maxlength="4" inputmode="numeric">
          </div>
        </div>

        <button type="submit" class="btn btn-primary checkout-submit-btn paystack-pay-btn">
          Pay ${formatPrice(grandTotal)}
        </button>
        <button type="button" class="paystack-back-btn" onclick="renderCheckoutForm()">${getIcon('arrow-right')} Back to shipping</button>
        <p class="checkout-disclaimer">Simulated Paystack checkout for demo purposes. No real payment is processed. Test card: 4084 0840 8408 4081</p>
      </form>
    </div>
  `;

  document.getElementById('paystack-card-form').addEventListener('submit', handlePaystackCardSubmit);
}

function handlePaystackCardSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.paystack-pay-btn');
  btn.disabled = true;
  btn.innerHTML = 'Authorizing...';

  setTimeout(() => renderPaystackOtpStep(), 1100);
}

function renderPaystackOtpStep() {
  const body = document.getElementById('checkout-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div class="paystack-panel">
      <div class="paystack-header">
        <div class="paystack-brand"><span>Pay</span>stack</div>
        <span class="paystack-secure">${getIcon('shield-check')} Secure Payment</span>
      </div>
      <div class="paystack-otp-icon">${getIcon('credit-card')}</div>
      <h4 class="paystack-otp-title">Enter OTP</h4>
      <p class="paystack-otp-text">A one-time PIN has been sent to your registered phone number to authorize this payment.</p>

      <form id="paystack-otp-form">
        <div class="form-group">
          <input type="text" id="paystack-otp" required placeholder="123456" maxlength="6" inputmode="numeric" class="paystack-otp-input">
        </div>
        <button type="submit" class="btn btn-primary checkout-submit-btn paystack-otp-btn">
          Verify &amp; Pay
        </button>
        <p class="checkout-disclaimer">Demo mode — any code will be accepted.</p>
      </form>
    </div>
  `;

  document.getElementById('paystack-otp-form').addEventListener('submit', handlePaystackOtpSubmit);
}

async function handlePaystackOtpSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.paystack-otp-btn');
  btn.disabled = true;
  btn.innerHTML = 'Verifying...';

  const data = await loadData();
  const { cartItems, grandTotal, customer } = state.pendingOrder;

  const order = {
    id: 'RM' + Date.now().toString().slice(-8),
    reference: 'PSK' + Math.random().toString(36).slice(2, 12).toUpperCase(),
    date: new Date().toISOString(),
    status: 'Processing',
    customer,
    items: cartItems.map(({ product, qty, size, unitPrice }) => ({
      id: product.id,
      name: product.name,
      image: product.image,
      price: unitPrice,
      size: size || null,
      qty
    })),
    total: grandTotal
  };

  setTimeout(() => {
    state.orders.unshift(order);
    localStorage.setItem('Roger McDaniels_orders', JSON.stringify(state.orders));

    state.cart = [];
    localStorage.setItem('Roger McDaniels_cart', JSON.stringify(state.cart));
    updateCartBadge();
    state.pendingOrder = null;

    renderOrderConfirmation(order);
  }, 1000);
}

function renderOrderConfirmation(order) {
  const body = document.getElementById('checkout-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div class="checkout-confirmation">
      ${getIcon('check')}
      <h3>Payment Successful!</h3>
      <p>Thanks, ${order.customer.name.split(' ')[0]}. Your order <strong>#${order.id}</strong> has been placed.</p>
      <p class="checkout-confirmation-ref">Paystack Ref: ${order.reference}</p>
      <p class="checkout-confirmation-total">${formatPrice(order.total)}</p>
      <div class="checkout-confirmation-actions">
        <a href="${pagePath('orders.html')}" class="btn btn-primary">View Order History</a>
        <button class="btn btn-glass" onclick="closeCheckoutModal()">Continue Shopping</button>
      </div>
    </div>
  `;
}
