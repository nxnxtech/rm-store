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

  // Guests can check out too — orders are written with a null user_id,
  // permitted by a dedicated RLS policy (see add_guest_checkout.sql).
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

// Calls the 'rm-store-create-checkout' Supabase Edge Function, which is the
// single source of truth for prices: it looks up each product and the
// region's shipping rate directly in the DB and returns what the customer
// actually owes. The client never computes or trusts its own totals.
async function calculateCheckout(region) {
  const items = state.cart.map(item => ({ id: item.id, qty: item.qty, size: item.size }));

  const { data, error } = await supabase.functions.invoke('rm-store-create-checkout', {
    body: { items, region: region || null }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.items?.length) throw new Error('No valid items returned from checkout.');

  return data; // { items, subtotal, shippingFee, total }
}

async function renderCheckoutForm() {
  const body = document.getElementById('checkout-modal-body');
  if (!body) return;

  body.innerHTML = createLoadingHtml('Loading, please wait...');

  const regions = await loadRegions();

  const user = state.currentUser;
  const customer = state.pendingOrder?.customer || {
    name: user ? user.name : '',
    email: user ? user.email : '',
    phone: user ? (user.phone || '') : '',
    address: user ? (user.address || '') : '',
    region: user ? (user.region || '') : '',
    city: user ? (user.city || '') : ''
  };

  let checkoutData;
  try {
    checkoutData = await calculateCheckout(customer.region);
  } catch (error) {
    console.error('Failed to calculate checkout total:', error);
    body.innerHTML = `
      <div class="empty-state">
        <p>Unable to calculate your total right now. Please refresh and try again.</p>
      </div>
    `;
    return;
  }

  const { items: cartItems, subtotal, shippingFee, total: grandTotal } = checkoutData;

  const itemsHtml = cartItems.map(({ name, size, qty, lineTotal }) => `
    <div class="checkout-line-item">
      <span>${name}${size ? ` <span class="checkout-line-size">(Size: ${size})</span>` : ''} <strong>x${qty}</strong></span>
      <span>${formatPrice(lineTotal)}</span>
    </div>
  `).join('');

  state.pendingOrder = { cartItems, subtotal, shippingFee, grandTotal, customer };

  const regionOptions = regions.map(r => `<option value="${r.region}">${r.region}</option>`).join('');

  body.innerHTML = `
    <div class="checkout-summary">
      ${itemsHtml}
      <div class="checkout-line-item">
        <span>Delivery Fee</span>
        <span id="checkout-shipping-amount">${shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
      </div>
      <div class="checkout-line-item checkout-total-row">
        <span>Total</span>
        <span id="checkout-total-amount">${formatPrice(grandTotal)}</span>
      </div>
    </div>

    <form id="checkout-shipping-form">
      <h4 class="checkout-section-title">Delivery Details</h4>
      ${!user ? `
        <div class="checkout-guest-notice">
          ${getIcon('user')} Making purchase as a guest.
          <a href="${pagePath('signin.html')}">Sign in</a> to save your details and track this order later or continue below.
        </div>
      ` : ''}
      <div class="form-row">
        <div class="form-group">
          <label for="checkout-name">Full Name</label>
          <input type="text" id="checkout-name" required placeholder="Roger McDaniels" value="${customer.name || ''}">
        </div>
        <div class="form-group">
          <label for="checkout-email">Email</label>
          <input type="email" id="checkout-email" required placeholder="rm@example.com" value="${customer.email || ''}">
        </div>
      </div>
      <div class="form-group">
        <label for="checkout-phone">Phone Number</label>
        <input type="tel" id="checkout-phone" required placeholder="02X XXX XXX" value="${customer.phone || ''}">
      </div>
      <div class="form-group">
        <label for="checkout-address">Delivery Address</label>
        <input type="text" id="checkout-address" required placeholder="House number, street name, area name" value="${customer.address || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="checkout-region">Region</label>
          <select id="checkout-region" required onchange="populateGhanaCities(); updateCheckoutShippingFee();">
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

  const regionSelect = document.getElementById('checkout-region');
  const citySelect = document.getElementById('checkout-city');
  if (customer.region) {
    regionSelect.value = customer.region;
    populateGhanaCities();
    if (customer.city) {
      citySelect.value = customer.city;
    }
  }

  document.getElementById('checkout-shipping-form').addEventListener('submit', handleShippingSubmit);
}

// Recalculates the delivery fee (and total) via the edge function the
// instant the customer picks a different region, so the amount they end up
// paying always reflects the DB's region-specific shipping rate.
async function updateCheckoutShippingFee() {
  if (!state.pendingOrder) return;
  const regionSelect = document.getElementById('checkout-region');
  const region = regionSelect ? regionSelect.value : '';

  const shippingEl = document.getElementById('checkout-shipping-amount');
  const totalEl = document.getElementById('checkout-total-amount');
  if (shippingEl) shippingEl.textContent = 'Calculating…';

  try {
    const { subtotal, shippingFee, total: grandTotal } = await calculateCheckout(region);
    state.pendingOrder.subtotal = subtotal;
    state.pendingOrder.shippingFee = shippingFee;
    state.pendingOrder.grandTotal = grandTotal;

    if (shippingEl) shippingEl.textContent = shippingFee === 0 ? 'Free' : formatPrice(shippingFee);
    if (totalEl) totalEl.textContent = formatPrice(grandTotal);
  } catch (error) {
    console.error('Failed to refresh shipping fee:', error);
    showToast('Could not refresh delivery fee. Please try again.', 'error');
  }
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

let paystackScriptPromise = null;
const PAYSTACK_PUBLIC_KEY = 'pk_test_2624a817184ae96a924acc39cca20a81c367caf1';

function loadPaystackScript() {
  if (window.PaystackPop) return Promise.resolve();
  if (paystackScriptPromise) return paystackScriptPromise;

  paystackScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.body.appendChild(script);
  });

  return paystackScriptPromise;
}

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
      <p class="paystack-merchant">Pay <strong>Roger McDaniels</strong> / <strong>NxNx Tech</strong></p>
      <p class="paystack-amount">${formatPrice(grandTotal)}</p>
      <p class="paystack-email">${customer.email}</p>

      <form id="paystack-payment-form">
        <p class="paystack-summary-text">You will be redirected securely to Paystack to complete payment.</p>
        <button type="submit" class="btn btn-primary checkout-submit-btn paystack-pay-btn">
          Continue to Payment
        </button>
        <button type="button" class="btn btn-glass paystack-back-btn" onclick="renderCheckoutForm()">
          ${getIcon('arrow-right')} Back to shipping
        </button>
        <p class="checkout-disclaimer">Paystack handles the payment securely. You may need to enter your OTP.</p>
      </form>
    </div>
  `;

  document.getElementById('paystack-payment-form').addEventListener('submit', handlePaystackPaymentSubmit);
}

async function checkStockAvailability(cartItems) {
  const idsToCheck = cartItems.filter((item) => item.dbId).map((item) => item.dbId);
  if (idsToCheck.length === 0) return { available: true, shortfalls: [] };

  const { data: products, error } = await supabase
    .from('rm_store_products')
    .select('id, name, stock_quantity')
    .in('id', idsToCheck);

  if (error) {
    // Fail open here — a stock-check failure shouldn't block checkout.
    // The atomic RPC in submitOrderToDatabase is the real source of
    // truth and will still catch this properly.
    console.error('Stock pre-check failed, proceeding anyway:', error);
    return { available: true, shortfalls: [] };
  }

  const stockById = new Map((products || []).map((p) => [p.id, p]));
  const shortfalls = [];

  for (const item of cartItems) {
    if (!item.dbId) continue;
    const product = stockById.get(item.dbId);
    const stock = product ? product.stock_quantity : 0;
    if (stock < item.qty) {
      shortfalls.push({ name: product?.name || item.name, requested: item.qty, available: stock });
    }
  }

  return { available: shortfalls.length === 0, shortfalls };
}

async function initializePaystackPayment({ button = null, isRetry = false } = {}) {
  if (!state.pendingOrder) return;

  const btn = button || document.querySelector('.paystack-pay-btn');
  if (btn) setButtonLoading(btn, isRetry ? 'Retrying payment...' : 'Please wait loading...');

  // Catch the common case — an item sold out between adding to cart and
  // checking out — before charging the customer at all. This is a
  // best-effort check (there's still a small race window right up until
  // payment completes), the real enforcement happens atomically in
  // rm_store_create_paid_order once payment succeeds.
  const { available, shortfalls } = await checkStockAvailability(state.pendingOrder.cartItems);
  if (!available) {
    const detail = shortfalls
      .map((s) => `${s.name} (only ${s.available} left, ${s.requested} requested)`)
      .join(', ');
    showToast(`Some items are no longer available: ${detail}`, 'error');
    if (btn) clearButtonLoading(btn);
    return;
  }

  try {
    await loadPaystackScript();

    const { grandTotal, customer } = state.pendingOrder;
    const reference = `rm_${Date.now()}`;
    state.pendingOrder.paymentReference = reference;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: customer.email,
      amount: Math.round(grandTotal * 100),
      currency: 'GHS',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Customer Name', variable_name: 'customer_name', value: customer.name },
          { display_name: 'Order Type', variable_name: 'order_type', value: 'rm-store' }
        ]
      },
      callback: function(response) {
        handlePaystackSuccess(response.reference);
      },
      onClose: function() {
        renderPaymentIncompleteState('Payment was cancelled before it could be completed.', 'You can retry from here and we will refresh the latest price first.');
        if (btn) clearButtonLoading(btn);
      }
    });

    handler.openIframe();
  } catch (error) {
    console.error('Paystack initialization failed:', error);
    renderPaymentIncompleteState('We could not start the payment securely.', 'Please retry and we will refresh the latest price first.');
    if (btn) clearButtonLoading(btn);
  }
}

async function handlePaystackPaymentSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.paystack-pay-btn');
  await initializePaystackPayment({ button: btn });
}

async function refreshPendingOrderPrices() {
  if (!state.pendingOrder?.cartItems?.length) return { changed: false, grandTotal: 0 };

  const previousGrandTotal = state.pendingOrder.grandTotal;

  try {
    const { items: cartItems, subtotal, shippingFee, total: grandTotal } =
      await calculateCheckout(state.pendingOrder.customer.region);

    const changed = Number(grandTotal.toFixed(2)) !== Number(previousGrandTotal.toFixed(2));

    state.pendingOrder = {
      ...state.pendingOrder,
      cartItems,
      subtotal,
      shippingFee,
      grandTotal
    };

    return { changed, grandTotal };
  } catch (error) {
    console.error('Failed to refresh prices from checkout function:', error);
    return { changed: false, grandTotal: previousGrandTotal };
  }
}

async function retryPendingPayment() {
  if (!state.pendingOrder) return;

  const body = document.getElementById('checkout-modal-body');

  // If the payment already went through and only the database write failed,
  // do NOT charge the customer again — just retry saving the order using
  // the reference we already have from the successful charge.
  if (state.pendingOrder.paymentConfirmed && state.pendingOrder.confirmedReference) {
    if (body) {
      body.innerHTML = createLoadingHtml('Saving your order...');
    }
    await submitOrderToDatabase(state.pendingOrder.confirmedReference);
    return;
  }

  // Otherwise the payment itself never completed (cancelled, declined, or
  // Paystack failed to load) — retry the payment from scratch.
  if (body) {
    body.innerHTML = createLoadingHtml('Refreshing price and retrying payment...');
  }

  try {
    const { changed } = await refreshPendingOrderPrices();
    if (changed) {
      showToast('Price updated. We are retrying your payment with the latest total.', 'success');
    }
    await initializePaystackPayment({ isRetry: true });
  } catch (error) {
    console.error('Retry payment failed:', error);
    renderPaymentIncompleteState('We could not retry your payment.', 'Please try again in a moment.');
  }
}

async function handlePaystackSuccess(reference) {
  // Mark the payment itself as confirmed right away. From this point on,
  // any failure is a "saving the order" failure, not a "payment" failure —
  // retries must never charge the customer again once this is set.
  state.pendingOrder.paymentConfirmed = true;
  state.pendingOrder.confirmedReference = reference;

  const submitButton = document.querySelector('.paystack-pay-btn');
  if (submitButton) setButtonLoading(submitButton, 'Please wait loading...');

  await submitOrderToDatabase(reference);
}

// Calls the 'rm-store-submit-order' Supabase Edge Function instead of
// inserting straight from the client. The client only sends the cart
// (ids/qty/size), the delivery details, and the Paystack reference — the
// edge function re-prices everything from the DB itself (same as
// calculateCheckout above), optionally re-verifies the payment with
// Paystack, and performs the insert with the service role key. This closes
// the gap where a tampered client could otherwise pass whatever
// subtotal/total/prices it wanted straight into the RPC.
async function submitOrderToDatabase(reference) {
  const { cartItems, customer } = state.pendingOrder;
  const guestCheckout = !state.currentUser;

  try {
    const { data: result, error: submitError } = await supabase.functions.invoke('rm-store-submit-order', {
      body: {
        items: cartItems.map(item => ({ id: item.id, qty: item.qty, size: item.size })),
        region: customer.region,
        customer,
        reference,
        paymentMethod: 'Paystack'
      }
    });

    if (submitError) throw submitError;
    if (result?.error) throw new Error(result.error);

    // Use the edge function's own numbers/items for the receipt — it
    // recalculated them from the DB, so they're the authoritative version
    // of what was actually charged and saved, not just whatever was last
    // shown on screen.
    const { items: confirmedItems, subtotal, shippingFee, total: grandTotal } = result;
    const itemsSnapshot = confirmedItems.map(({ dbId, name, image, qty, size, unitPrice }) => ({
      product_id: dbId || null,
      name,
      image,
      size: size || null,
      unit_price: unitPrice,
      qty
    }));

    if (result.stock_conflict) {
      // Payment already succeeded and the order was still saved (never
      // lost), but stock ran out for one or more items in the narrow
      // window between the pre-payment check and payment completing.
      // This needs a human — flagged in the DB (stock_conflict = true)
      // and escalated via the Telegram order notifier.
      console.warn('Order saved with stock conflict:', result.shortfalls);
    }

    // Guest cart only ever lived in memory/localStorage. Signed-in users'
    // server-side cart is already cleared by the edge function — just sync
    // local state either way.
    state.cart = [];
    saveCartToLocalStorage();
    updateCartBadge();

    const order = {
      id: result.order_number,
      reference,
      date: result.created_at,
      status: 'Paid',
      customer,
      items: itemsSnapshot,
      subtotal,
      shippingFee,
      total: grandTotal,
      guestCheckout,
      stockConflict: result.stock_conflict
    };

    state.pendingOrder = null;
    closeCheckoutModal();
    openReceiptModal(order);

    if (result.stock_conflict) {
      showToast('Your payment was successful. One or more items are on backorder — we will reach out about your delivery.', 'success');
    }
  } catch (error) {
    console.error('Order failed to save:', error);
    // Payment already succeeded — never re-charge from here. Only the
    // database write needs retrying.
    renderPaymentIncompleteState(
      'Your payment went through, but we could not save your order.',
      'No further charge will be made. Click retry to save your order with the payment you already made.'
    );
  }
}

function renderPaymentIncompleteState(message = 'We could not complete your payment.', detail = 'You can retry with the latest price from the database.') {
  const body = document.getElementById('checkout-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div class="checkout-confirmation">
      <div class="checkout-status-badge checkout-status-badge-error">Payment incomplete</div>
      <h3>Payment Incomplete</h3>
      <p>${message}</p>
      <p class="checkout-confirmation-ref">${detail}</p>
      <div class="checkout-confirmation-actions">
        <button class="btn btn-primary" onclick="retryPendingPayment()">Retry payment</button>
        <button class="btn btn-glass" onclick="closeCheckoutModal()">Close</button>
      </div>
    </div>
  `;
}

/* ============================================
   RECEIPT MODAL
   Pops up right after a successful payment (guest
   or signed-in) with the full itemized order detail,
   and prompts the customer to screenshot or download
   it since it won't be shown again for guests.
   ============================================ */

let lastReceiptOrder = null;

function initReceiptModal() {
  if (document.querySelector('.receipt-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'receipt-modal-overlay';
  overlay.innerHTML = `
    <div class="receipt-modal">
      <div class="receipt-modal-header">
        <h3>${getIcon('check')} Order Receipt</h3>
        <button class="receipt-modal-close" aria-label="Close receipt">${getIcon('close')}</button>
      </div>
      <div class="receipt-modal-body" id="receipt-modal-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.receipt-modal-close').addEventListener('click', closeReceiptModal);
  // Deliberately no click-outside-to-close — this is important information
  // the customer needs to actually read/save, not dismiss by accident.
}

function openReceiptModal(order) {
  initReceiptModal();
  lastReceiptOrder = order;

  const overlay = document.querySelector('.receipt-modal-overlay');
  const body = document.getElementById('receipt-modal-body');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  const orderDate = new Date(order.date).toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  const itemsHtml = order.items.map(item => `
    <div class="receipt-item-row">
      <div class="receipt-item-info">
        <span class="receipt-item-name">${item.name}${item.size ? ` <span class="receipt-item-size">(Size: ${item.size})</span>` : ''}</span>
        <span class="receipt-item-qty">Qty ${item.qty} &times; ${formatPrice(item.unit_price)}</span>
      </div>
      <span class="receipt-item-total">${formatPrice(item.unit_price * item.qty)}</span>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="receipt-save-notice">
      ${getIcon('shield-check')}
      <div>
        <strong>Save this receipt now.</strong>
        <p>Take a screenshot or use the download button below${order.guestCheckout ? " — as a guest, this order won't appear anywhere else on the site" : ''}.</p>
      </div>
    </div>

    <div class="receipt-meta">
      <div><span>Order #</span><strong>${order.id}</strong></div>
      <div><span>Date</span><strong>${orderDate}</strong></div>
      <div><span>Payment Ref</span><strong>${order.reference}</strong></div>
      <div><span>Status</span><strong>${order.status}</strong></div>
    </div>

    <h4 class="checkout-section-title">Delivery To</h4>
    <div class="receipt-customer">
      <p>${order.customer.name}</p>
      <p>${order.customer.email}</p>
      <p>${order.customer.phone}</p>
      <p>${order.customer.address}, ${order.customer.city}, ${order.customer.region}</p>
    </div>

    <h4 class="checkout-section-title">Items</h4>
    <div class="receipt-items">
      ${itemsHtml}
    </div>

    <div class="receipt-totals">
      <div class="receipt-line-item"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
      <div class="receipt-line-item"><span>Delivery Fee</span><span>${order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}</span></div>
      <div class="receipt-line-item receipt-total-row"><span>Total Paid</span><span>${formatPrice(order.total)}</span></div>
    </div>

    <div class="receipt-actions">
      <button class="btn btn-primary" onclick="downloadReceipt()">${getIcon('arrow-right')} Download Receipt</button>
      ${order.guestCheckout
        ? `<a href="${pagePath('signin.html')}" class="btn btn-glass">Create Account</a>`
        : `<a href="${pagePath('orders.html')}" class="btn btn-glass">View Order History</a>`
      }
    </div>
    <button class="btn btn-glass receipt-done-btn" onclick="closeReceiptModal()">Done, Continue Shopping</button>
  `;
}

function closeReceiptModal() {
  const overlay = document.querySelector('.receipt-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function buildReceiptText(order) {
  const orderDate = new Date(order.date).toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  const lines = [
    'ROGER MCDANIELS — ORDER RECEIPT',
    '================================',
    `Order #: ${order.id}`,
    `Date: ${orderDate}`,
    `Payment Ref: ${order.reference}`,
    `Status: ${order.status}`,
    '',
    'Delivery To:',
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    `${order.customer.address}, ${order.customer.city}, ${order.customer.region}`,
    '',
    'Items:',
    ...order.items.map(item =>
      `  ${item.name}${item.size ? ` (Size: ${item.size})` : ''} — Qty ${item.qty} x ${formatPrice(item.unit_price)} = ${formatPrice(item.unit_price * item.qty)}`
    ),
    '',
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Delivery Fee: ${order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}`,
    `Total Paid: ${formatPrice(order.total)}`,
    '',
    'Thank you for shopping with Roger McDaniels.'
  ];

  return lines.join('\n');
}

function downloadReceipt() {
  if (!lastReceiptOrder) return;
  const text = buildReceiptText(lastReceiptOrder);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${lastReceiptOrder.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Receipt downloaded', 'success');
}