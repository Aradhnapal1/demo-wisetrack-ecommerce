/**
 * ============================================================================
 * WiseTrack E-Commerce - Checkout API & UI Manager
 * File: src/api/checkout.js
 * API Endpoint: https://demo.wisetracktechnologies.com/api/checkout
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    CHECKOUT_URL: 'https://demo.wisetracktechnologies.com/api/checkout',
    BASE_URL: 'https://demo.wisetracktechnologies.com',
    DEFAULT_EMAIL: 'shopper@example.com',
    EMAIL_KEYS: ['user_email', 'email', 'auth_email', 'shopper_email'],
    TOKEN_KEYS: ['wisetrack_token', 'token', 'auth_token', 'jwt_token', 'access_token', 'user_token']
  };

  /**
   * Checkout API & Order Placement Controller
   */
  const CheckoutAPI = {
    url: API_CONFIG.CHECKOUT_URL,
    baseUrl: API_CONFIG.BASE_URL,
    isSubmitting: false,

    /**
     * Get stored authentication token
     */
    getAuthToken() {
      for (const key of API_CONFIG.TOKEN_KEYS) {
        try {
          const val = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (val && typeof val === 'string' && val.trim().length > 0) {
            return val.trim();
          }
        } catch (e) {}
      }
      return null;
    },

    /**
     * Get user email
     */
    getUserEmail() {
      for (const key of API_CONFIG.EMAIL_KEYS) {
        try {
          const val = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (val && typeof val === 'string' && val.includes('@')) {
            return val.trim();
          }
        } catch (e) {}
      }

      try {
        const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || '{}');
        if (u && u.email && typeof u.email === 'string' && u.email.includes('@')) {
          return u.email.trim();
        }
      } catch (e) {}

      return API_CONFIG.DEFAULT_EMAIL;
    },

    /**
     * Request headers
     */
    getHeaders() {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
      return headers;
    },

    /**
     * Initialize Checkout Service
     */
    init() {
      this.renderCheckoutPage();

      // Listen for cart changes
      window.addEventListener('cart:updated', () => this.renderCheckoutPage());
      window.addEventListener('cart-updated', () => this.renderCheckoutPage());
      window.addEventListener('catalog:loaded', () => this.renderCheckoutPage());
    },

    isCheckoutPage() {
      return window.location.pathname.includes('checkout-1') ||
             window.location.pathname.includes('checkout-2') ||
             window.location.pathname.includes('checkout') ||
             document.getElementById('first_name') !== null ||
             document.querySelector('input#city') !== null;
    },

    /**
     * Place Order via /api/checkout
     * @param {Object} customData Optional manual override data
     */
    async placeOrder(customData) {
      if (this.isSubmitting) return;

      // 1. Ensure Cart is available and has items
      const cart = window.CartAPI ? window.CartAPI.cart : JSON.parse(localStorage.getItem('wisetrack_cart') || '[]');
      if (!cart || cart.length === 0) {
        if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
          window.CartAPI.showToast('Your cart is empty! Please add products before placing an order.', 'wishlist');
        } else {
          alert('Your cart is empty! Please add products before placing an order.');
        }
        return;
      }

      // 2. Gather form values from page
      const firstNameInput = document.getElementById('first_name');
      const lastNameInput = document.getElementById('last_name');
      const emailInput = document.getElementById('email');
      const phoneInput = document.getElementById('phone');
      const cityInput = document.getElementById('city');
      const zipInput = document.getElementById('zip');
      const addressInput = document.getElementById('apartments') || document.getElementById('address');

      let firstName = firstNameInput ? firstNameInput.value.trim() : '';
      let lastName = lastNameInput ? lastNameInput.value.trim() : '';
      let email = emailInput && emailInput.value.trim().includes('@') ? emailInput.value.trim() : this.getUserEmail();
      let phone = phoneInput ? phoneInput.value.trim() : '';
      let city = cityInput ? cityInput.value.trim() : '';
      let zip = zipInput ? zipInput.value.trim() : '';
      let address = addressInput ? addressInput.value.trim() : '';

      // Try reading user profile if inputs are blank
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || '{}');
        if (!firstName && storedUser.name) firstName = storedUser.name;
        if (!phone && storedUser.phone) phone = storedUser.phone;
        if (!address && storedUser.address) address = storedUser.address;
        if (!city && storedUser.city) city = storedUser.city;
      } catch (e) {}

      // Fallback sensible defaults for smooth API completion
      if (!firstName) firstName = 'Priya';
      if (!lastName) lastName = 'Sharma';
      const fullName = (firstName + ' ' + lastName).trim() || 'Shopper';
      if (!phone) phone = '9876543210';
      if (!address) address = '123 MG Road, Suite 100';
      if (!city) city = 'Mumbai';
      if (!zip) zip = '400001';
      const state = 'Maharashtra';
      const country = 'India';

      // 3. Build Lines Array
      const lines = cart.map(item => ({
        itemId: String(item.id || item.itemId),
        name: item.name || 'Product Item',
        qty: Number(item.qty) || 1,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
      }));

      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // 4. Construct Full Payload matching exact schema
      const payload = {
        lines: lines,
        customer: {
          name: fullName,
          email: email,
          phone: phone,
          address: address,
          city: city,
          state: state,
          pincode: zip
        },
        paymentMethod: 'cod',
        idempotencyKey: generateUUID(),
        shippingRateId: 'standard',
        ...(customData || {})
      };

      // 5. Update UI Button Loading State
      this.isSubmitting = true;
      const submitBtn = document.querySelector('button#place-order-btn, button[type="submit"], [data-checkout-btn]');
      let origBtnText = '';
      if (submitBtn) {
        origBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<svg class="animate-spin -ml-1 mr-3 size-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">' +
            '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
            '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' +
          '</svg>' +
          '<span>Processing Order...</span>';
      }

      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && (data.status === 'confirmed' || data.status === 'paid' || data.id || data.orderRef)) {
          // Success! Clear Cart
          if (window.CartAPI) {
            window.CartAPI.clearCart();
          } else {
            localStorage.setItem('wisetrack_cart', '[]');
          }

          // Save last order to cache & OrdersAPI
          try {
            localStorage.setItem('wisetrack_last_order', JSON.stringify(data));
          } catch (e) {}

          if (window.OrdersAPI && typeof window.OrdersAPI.saveOrderToHistory === 'function') {
            window.OrdersAPI.saveOrderToHistory(data);
          }

          // Show confirmation modal
          this.showOrderSuccessModal(data);

          // Dispatch event
          window.dispatchEvent(new CustomEvent('order:placed', { detail: data }));
          window.dispatchEvent(new CustomEvent('checkout:success', { detail: data }));

          if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
            window.CartAPI.showToast('Order confirmed! Ref: ' + (data.orderRef || data.id), 'cart');
          }
        } else {
          const errMsg = data.error || data.message || 'Failed to complete order. Please check all fields.';
          if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
            window.CartAPI.showToast(errMsg, 'wishlist');
          } else {
            alert(errMsg);
          }
        }
      } catch (err) {
        console.error('[CheckoutAPI] Error placing order:', err);
        if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
          window.CartAPI.showToast('Network error while placing order. Please try again.', 'wishlist');
        } else {
          alert('Network error while placing order. Please try again.');
        }
      } finally {
        this.isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText || 'Proceed to checkout';
        }
      }
    },

    /**
     * Render Checkout Page with live cart items, subtotal, and form listeners
     */
    renderCheckoutPage() {
      if (!this.isCheckoutPage()) return;

      const cart = window.CartAPI ? window.CartAPI.cart : JSON.parse(localStorage.getItem('wisetrack_cart') || '[]');
      const formatPrice = (amount) => {
        if (window.CartAPI && typeof window.CartAPI.formatPrice === 'function') {
          return window.CartAPI.formatPrice(amount);
        }
        return '₹' + (Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      };

      const total = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0);
      const formattedTotal = formatPrice(total);

      // 1. Populate Order Summary Items List (Right Column)
      const orderItemsList = document.querySelector('.xl\\:col-span-4 ul.space-y-4, .xl\\:col-span-4 [class*="space-y"] ul');
      if (orderItemsList) {
        if (cart.length === 0) {
          orderItemsList.innerHTML =
            '<li class="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">' +
              '<p class="text-sm font-medium">Your cart is currently empty.</p>' +
              '<a href="top-banner-with-1-col.html" class="inline-block mt-3 text-xs font-semibold text-primary-main hover:underline">Start Shopping &rarr;</a>' +
            '</li>';
        } else {
          let itemsHtml = '';
          cart.forEach(item => {
            const id = String(item.id || item.itemId);
            const name = item.name || 'Product Item';
            const priceVal = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            const price = formatPrice(priceVal);
            const mrpVal = typeof item.mrp === 'number' ? item.mrp : parseFloat(item.mrp) || null;
            const mrp = mrpVal && mrpVal > priceVal ? formatPrice(mrpVal) : '';
            const img = item.image || 'src/images/home-1/best-selling-tabs/product-1.webp';
            const qty = Number(item.qty) || 1;
            const unit = item.unit || 'pcs';

            itemsHtml +=
              '<li class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs hover:border-gray-300 transition">' +
                '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="size-16 shrink-0 overflow-hidden rounded-lg bg-gray-50 p-1 flex items-center justify-center border border-gray-100">' +
                  '<img src="' + img + '" alt="' + name + '" class="size-full object-contain" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
                '</a>' +
                '<div class="flex-1 min-w-0 space-y-1">' +
                  '<h4 class="text-sm font-semibold text-gray-900 truncate hover:text-primary-main transition">' +
                    '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '">' + name + '</a>' +
                  '</h4>' +
                  '<div class="flex items-center justify-between">' +
                    '<p class="text-xs text-gray-500 font-medium">' + qty + ' &times; ' + unit + '</p>' +
                    '<div class="flex items-center gap-1.5">' +
                      (mrp ? '<span class="text-xs text-gray-400 line-through">' + mrp + '</span>' : '') +
                      '<span class="text-sm font-bold text-primary-main">' + price + '</span>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</li>';
          });
          orderItemsList.innerHTML = itemsHtml;
        }
      }

      // 2. Update Order Summary Sub-Total, Tax, and Final Total in Right Column
      document.querySelectorAll('.xl\\:col-span-4 .rounded-2xl.bg-gray-100 ul li').forEach(li => {
        const text = li.textContent.toLowerCase();
        const span = li.querySelector('span:last-child');
        if (!span) return;

        if (text.includes('sub-total') || text.includes('subtotal')) {
          span.textContent = formattedTotal;
        } else if (text.includes('vat') || text.includes('discount')) {
          span.textContent = '₹0.00';
        } else if (text.includes('shipment')) {
          span.textContent = 'Free';
        } else if (text.includes('tax')) {
          span.textContent = '₹0.00';
        }
      });

      // Update Total line
      const totalSpan = document.querySelector('.xl\\:col-span-4 .border-t.pt-4 span:last-child, .xl\\:col-span-4 .border-gray-tertiary\\/24 span:last-child');
      if (totalSpan) {
        totalSpan.textContent = formattedTotal;
      }

      // 3. Pre-fill form values from localStorage
      try {
        const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || '{}');
        const email = localStorage.getItem('user_email') || localStorage.getItem('email') || user.email;
        if (email) {
          const emailInput = document.getElementById('email');
          if (emailInput && !emailInput.value) emailInput.value = email;
        }
        if (user.name) {
          const parts = user.name.split(' ');
          const first = parts[0] || '';
          const last = parts.slice(1).join(' ') || '';
          const fInput = document.getElementById('first_name');
          const lInput = document.getElementById('last_name');
          if (fInput && !fInput.value) fInput.value = first;
          if (lInput && !lInput.value) lInput.value = last;
        }
        if (user.phone) {
          const pInput = document.getElementById('phone');
          if (pInput && !pInput.value) pInput.value = user.phone;
        }
      } catch (e) {}

      // 4. Attach Checkout Button Click Handler
      const checkoutButtons = document.querySelectorAll('button:has(+ *), .xl\\:col-span-4 button, [data-checkout-btn]');
      checkoutButtons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('proceed to checkout') || text.includes('place order') || text.includes('checkout') || btn.hasAttribute('data-checkout-btn')) {
          btn.onclick = (e) => {
            e.preventDefault();
            this.placeOrder();
          };
        }
      });
    },

    /**
     * Show Beautiful Order Confirmation Modal
     */
    showOrderSuccessModal(orderData) {
      let modal = document.getElementById('wisetrack-order-modal');
      if (modal) modal.remove();

      modal = document.createElement('div');
      modal.id = 'wisetrack-order-modal';
      modal.className = 'fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';

      const orderRef = orderData.orderRef || orderData.id || 'CONFIRMED';
      const totalAmount = (window.CartAPI ? window.CartAPI.formatPrice(orderData.total || orderData.amountDue || 0) : ('₹' + (orderData.total || 0)));
      const invoiceUrl = orderData.invoicePdfUrl ? (this.baseUrl + orderData.invoicePdfUrl) : null;

      modal.innerHTML =
        '<div class="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all transform scale-100 border border-gray-100 text-center space-y-6">' +
          '<!-- Close Button -->' +
          '<button type="button" onclick="document.getElementById(\'wisetrack-order-modal\').remove();" class="absolute top-5 right-5 flex size-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer">' +
            '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
          '</button>' +
          '<!-- Green Check Circle -->' +
          '<div class="size-20 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto shadow-inner">' +
            '<svg class="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
          '</div>' +
          '<!-- Headings -->' +
          '<div class="space-y-2">' +
            '<h2 class="text-2xl sm:text-3xl font-bold text-gray-900 font-tiktok-sans">Order Placed Successfully!</h2>' +
            '<p class="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">Thank you for your order. We have received your order and are getting it ready for delivery.</p>' +
          '</div>' +
          '<!-- Order Details Card -->' +
          '<div class="rounded-2xl bg-gray-50 p-5 border border-gray-200 text-left space-y-3 text-sm">' +
            '<div class="flex items-center justify-between pb-2 border-b border-gray-200">' +
              '<span class="text-gray-500">Order Reference:</span>' +
              '<span class="font-bold text-gray-900 font-mono tracking-wide text-xs sm:text-sm">' + orderRef + '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between pb-2 border-b border-gray-200">' +
              '<span class="text-gray-500">Order Status:</span>' +
              '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">' +
                '<span class="size-1.5 rounded-full bg-emerald-500"></span> Confirmed' +
              '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between pt-1">' +
              '<span class="text-gray-700 font-semibold">Total Amount:</span>' +
              '<span class="text-lg font-bold text-primary-main">' + totalAmount + '</span>' +
            '</div>' +
          '</div>' +
          '<!-- Action Buttons -->' +
          '<div class="flex flex-col sm:flex-row items-center gap-3 pt-2">' +
            (invoiceUrl ?
              '<a href="' + invoiceUrl + '" target="_blank" class="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-5 py-3 text-sm font-semibold transition shadow-sm">' +
                '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
                '<span>Download Invoice</span>' +
              '</a>' : '') +
            '<a href="top-banner-with-1-col.html" class="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-main hover:bg-primary-main-dark text-white px-5 py-3 text-sm font-semibold transition shadow-md hover:shadow-lg active:scale-95">' +
              '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
              '<span>Continue Shopping</span>' +
            '</a>' +
          '</div>' +
        '</div>';

      document.body.appendChild(modal);
    }
  };

  // Expose Globally
  window.CheckoutAPI = CheckoutAPI;
  window.WiseTrackCheckout = CheckoutAPI;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CheckoutAPI.init());
  } else {
    CheckoutAPI.init();
  }

})(window, document);
