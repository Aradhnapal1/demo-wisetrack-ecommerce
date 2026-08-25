/**
 * ============================================================================
 * WiseTrack E-Commerce - Cart API & UI Manager
 * File: src/api/cart.js
 * API Endpoint: https://demo.wisetracktechnologies.com/api/cart/save
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    SAVE_URL: 'https://demo.wisetracktechnologies.com/api/cart/save',
    CACHE_KEY: 'wisetrack_cart',
    CACHE_TIMESTAMP_KEY: 'wisetrack_cart_time',
    DEFAULT_EMAIL: 'shopper@example.com',
    EMAIL_KEYS: ['user_email', 'email', 'auth_email', 'shopper_email'],
    TOKEN_KEYS: ['wisetrack_token', 'token', 'auth_token', 'jwt_token', 'access_token', 'user_token']
  };

  /**
   * Cart API & UI Controller
   */
  const CartAPI = {
    saveUrl: API_CONFIG.SAVE_URL,
    cart: [], // Array of cart item objects: { id, itemId, name, price, mrp, image, unit, qty }
    isLoaded: false,
    isSyncing: false,

    /**
     * Get stored shopper authentication token
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
     * Get user email for cart saving
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

      // Check stored user object
      try {
        const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || '{}');
        if (u && u.email && typeof u.email === 'string' && u.email.includes('@')) {
          return u.email.trim();
        }
      } catch (e) {}

      return API_CONFIG.DEFAULT_EMAIL;
    },

    /**
     * Request headers with optional Authorization
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
     * Initialize Cart Service
     */
    init() {
      // 1. Load cached cart from localStorage
      this.loadFromCache();

      // 2. Initial UI update across all header modals, badges, and cart page
      this.updateAllUI();

      // 3. Sync initial cart with /api/cart/save
      if (this.cart.length > 0) {
        this.syncWithApi();
      }

      // 4. Register event listeners
      window.addEventListener('catalog:loaded', () => this.updateAllUI());
      window.addEventListener('catalog-loaded', () => this.updateAllUI());
      window.addEventListener('storage', (e) => {
        if (e.key === API_CONFIG.CACHE_KEY) {
          this.loadFromCache();
          this.updateAllUI();
        }
      });

      // 5. When user clicks cart trigger in header, ensure drawer is fully refreshed
      document.addEventListener('click', (e) => {
        if (e.target.closest('[x-on\\:click*="cartOpen"], [@click*="cartOpen"], [href*="cart"], .cursor-pointer')) {
          setTimeout(() => this.updateAllUI(), 10);
        }
      });
    },

    /**
     * Load cached cart from localStorage
     */
    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.cart = parsed;
            this.isLoaded = true;
          }
        }
      } catch (err) {
        console.warn('[CartAPI] Cache read warning:', err);
      }
    },

    /**
     * Save cart to localStorage
     */
    saveToCache() {
      try {
        localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(this.cart));
        localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (err) {
        console.warn('[CartAPI] Cache save warning:', err);
      }
    },

    /**
     * Sync cart with /api/cart/save endpoint
     * Payload: { email: "...", lines: [ { itemId: "...", name: "...", qty: 2, price: 468.0 } ] }
     */
    async syncWithApi() {
      if (this.isSyncing) return;
      this.isSyncing = true;

      const lines = this.cart.map(item => ({
        itemId: String(item.id || item.itemId),
        name: item.name || 'Product Item',
        qty: Number(item.qty) || 1,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
      }));

      const payload = {
        email: this.getUserEmail(),
        lines: lines
      };

      try {
        const response = await fetch(this.saveUrl, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          window.dispatchEvent(new CustomEvent('cart:saved', { detail: { payload, response: data } }));
        } else {
          console.warn('[CartAPI] /api/cart/save returned status:', response.status);
        }
      } catch (error) {
        console.warn('[CartAPI] /api/cart/save network notice:', error.message);
      } finally {
        this.isSyncing = false;
      }
    },

    /**
     * Add product to cart
     * @param {string} productId
     * @param {number} qty
     */
    addToCart(productId, qty) {
      qty = Number(qty) || 1;
      if (!productId || qty <= 0) return;

      const strId = String(productId);
      const product = this.getProductInfo(strId);

      const existingIndex = this.cart.findIndex(item => String(item.id || item.itemId) === strId);
      if (existingIndex > -1) {
        this.cart[existingIndex].qty = (Number(this.cart[existingIndex].qty) || 1) + qty;
      } else {
        const img = this.getImageUrl(product);
        const priceVal = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
        const mrpVal = typeof product.mrp === 'number' ? product.mrp : parseFloat(product.mrp) || null;

        this.cart.push({
          id: strId,
          itemId: strId,
          name: product.name || 'Product Item',
          price: priceVal,
          mrp: mrpVal,
          image: img,
          unit: product.unit || 'pcs',
          qty: qty
        });
      }

      this.saveToCache();
      this.updateAllUI();
      this.dispatchEvents();
      this.showToast('Product added to cart successfully!');
      this.syncWithApi();
    },

    /**
     * Update quantity of an item
     * @param {string} productId
     * @param {number} qty
     */
    updateQty(productId, qty) {
      const strId = String(productId);
      const idx = this.cart.findIndex(item => String(item.id || item.itemId) === strId);
      if (idx > -1) {
        const newQty = Number(qty);
        if (newQty <= 0) {
          this.removeFromCart(strId);
          return;
        }
        this.cart[idx].qty = newQty;
        this.saveToCache();
        this.updateAllUI();
        this.dispatchEvents();
        this.syncWithApi();
      }
    },

    /**
     * Remove product from cart
     * @param {string} productId
     */
    removeFromCart(productId) {
      const strId = String(productId);
      const idx = this.cart.findIndex(item => String(item.id || item.itemId) === strId);
      if (idx > -1) {
        const removedItem = this.cart.splice(idx, 1)[0];
        this.saveToCache();
        this.updateAllUI();
        this.dispatchEvents();
        this.showToast('Removed from cart.');
        this.syncWithApi();
      }
    },

    /**
     * Clear all items in cart
     */
    clearCart() {
      if (this.cart.length === 0) return;
      this.cart = [];
      this.saveToCache();
      this.updateAllUI();
      this.dispatchEvents();
      this.showToast('Cart cleared.');
      this.syncWithApi();
    },

    /**
     * Get total quantity count of all cart items
     */
    getCount() {
      return this.cart.reduce((total, item) => total + (Number(item.qty) || 1), 0);
    },

    /**
     * Get total price of all cart items
     */
    getTotalPrice() {
      return this.cart.reduce((total, item) => {
        const p = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const q = Number(item.qty) || 1;
        return total + (p * q);
      }, 0);
    },

    /**
     * Helper to format price with proper currency symbol (matches ₹)
     */
    formatPrice(amount) {
      if (window.ProductAPI && typeof window.ProductAPI.formatPrice === 'function') {
        return window.ProductAPI.formatPrice(amount);
      }
      if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
      return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    /**
     * Helper to get full image URL from product object
     */
    getImageUrl(product) {
      if (!product) return 'src/images/home-1/best-selling-tabs/product-1.webp';
      if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0 && product.imageUrls[0]) {
        return product.imageUrls[0];
      }
      if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
        return product.images[0];
      }
      if (typeof product.image === 'string' && product.image.length > 0) {
        return product.image;
      }
      return 'src/images/home-1/best-selling-tabs/product-1.webp';
    },

    /**
     * Helper to get product info from catalog or caches
     */
    getProductInfo(productId) {
      const strId = String(productId);
      if (window.ProductAPI && typeof window.ProductAPI.getProductById === 'function') {
        const p = window.ProductAPI.getProductById(strId);
        if (p && (p.id === strId || String(p.id) === strId)) return p;
      }
      if (window.WishlistAPI && typeof window.WishlistAPI.getProductInfo === 'function') {
        const p = window.WishlistAPI.getProductInfo(strId);
        if (p && p.name && p.name !== 'Loading Product...') return p;
      }
      try {
        const cachedCatalog = JSON.parse(localStorage.getItem('wisetrack_catalog_cache') || '[]');
        const found = cachedCatalog.find(p => String(p.id) === strId);
        if (found) return found;
      } catch (e) {}

      return {
        id: strId,
        name: 'Product Item',
        price: 0,
        mrp: null,
        unit: 'pcs',
        imageUrls: ['src/images/home-1/best-selling-tabs/product-1.webp']
      };
    },

    /**
     * Dispatch Custom Events & update Alpine store
     */
    dispatchEvents() {
      const detail = {
        items: this.cart,
        count: this.getCount(),
        total: this.getTotalPrice()
      };
      window.dispatchEvent(new CustomEvent('cart:updated', { detail }));
      window.dispatchEvent(new CustomEvent('cart-updated', { detail }));

      // Update Alpine Store if initialized
      if (window.Alpine && window.Alpine.store) {
        const store = window.Alpine.store('cart');
        if (store) {
          store.items = [...this.cart];
        }
      }
    },

    /**
     * Update all UI elements (badges, drawer, page)
     */
    updateAllUI() {
      this.updateBadges();
      this.renderCartDrawer();
      this.renderCartPage();
    },

    /**
     * Update cart count badges ONLY on Header Cart icons & Nav (NEVER on Add to Cart buttons)
     */
    updateBadges() {
      const count = this.getCount();

      // 1. Update text badge elements explicitly meant for cart count
      document.querySelectorAll('#cart-count, [data-cart-count], .cart-count').forEach(el => {
        el.textContent = count;
      });

      // 2. Update Desktop Header Cart text (e.g. "0- Items" -> "2 Items")
      document.querySelectorAll('.cursor-pointer span.text-gray-primary.block, #header-cart-items-count').forEach(el => {
        if (el.textContent.includes('Item') || el.textContent.includes('item') || el.id === 'header-cart-items-count') {
          el.textContent = count + ' Items';
        }
      });

      // 3. Update Header Cart round icon button badge (ONLY in header)
      document.querySelectorAll('header button.bg-primary-main-dark, header div.bg-primary-main-dark').forEach(btn => {
        let badge = btn.querySelector('.header-cart-badge');
        if (!badge && count > 0) {
          badge = document.createElement('span');
          badge.className = 'header-cart-badge absolute -top-1.5 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white leading-none shadow-md';
          btn.classList.add('relative');
          btn.appendChild(badge);
        }
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? 'flex' : 'none';
        }
      });

      // 4. Update Mobile Bottom Bar Cart badge
      document.querySelectorAll('.pb-safe a[href*="cart"], [class*="fixed right-0 bottom-0"] a[href*="cart"]').forEach(link => {
        let badge = link.querySelector('.mobile-cart-badge');
        if (!badge && count > 0) {
          badge = document.createElement('span');
          badge.className = 'mobile-cart-badge absolute top-1 right-1/4 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white';
          link.classList.add('relative');
          link.appendChild(badge);
        }
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? 'flex' : 'none';
        }
      });
    },

    /**
     * Dynamically render Cart Drawer in the Header & recalculate subtotal
     */
    renderCartDrawer() {
      const drawerPanels = document.querySelectorAll('#cart-drawer-panel-5, #cart-drawer-panel-3, [id*="cart-drawer"]');
      if (drawerPanels.length === 0) return;

      const count = this.getCount();
      const total = this.getTotalPrice();
      const totalFormatted = this.formatPrice(total);

      drawerPanels.forEach(panel => {
        // 1. Update items count in drawer top header
        const countHeaders = panel.querySelectorAll('h2 + p.text-gray-secondary, .shrink-0 p.text-gray-secondary');
        countHeaders.forEach(ch => {
          ch.textContent = count + (count === 1 ? ' item' : ' items');
        });

        // 2. Populate items in scroll container
        const scrollContainer = panel.querySelector('.custom-scrollbar.flex-1');
        if (scrollContainer) {
          if (this.cart.length === 0) {
            scrollContainer.innerHTML =
              '<div class="flex flex-col items-center justify-center py-16 text-center px-4">' +
                '<div class="size-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4 mx-auto">' +
                  '<svg class="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                '</div>' +
                '<h3 class="text-lg font-bold text-gray-900 mb-1 font-tiktok-sans">Your Cart is Empty</h3>' +
                '<p class="text-sm text-gray-500 max-w-xs mb-6 mx-auto">Looks like you haven\'t added any items to your cart yet.</p>' +
                '<a href="top-banner-with-1-col.html" class="inline-flex items-center justify-center rounded-xl bg-primary-main hover:bg-primary-main-dark text-white px-6 py-3 text-sm font-semibold transition shadow-md active:scale-95 mx-auto">' +
                  'Start Shopping' +
                '</a>' +
              '</div>';
          } else {
            let itemsHtml = '<div class="space-y-4">';
            this.cart.forEach(item => {
              const id = String(item.id || item.itemId);
              const name = item.name || 'Product Item';
              const priceVal = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
              const price = this.formatPrice(priceVal);
              const img = item.image || 'src/images/home-1/best-selling-tabs/product-1.webp';
              const qty = Number(item.qty) || 1;
              const itemSubtotal = this.formatPrice(priceVal * qty);

              itemsHtml +=
                '<div class="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs hover:border-gray-300 transition" id="drawer-item-' + id + '">' +
                  '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="size-18 shrink-0 overflow-hidden rounded-xl bg-gray-50 p-1 flex items-center justify-center border border-gray-100 hover:opacity-90 transition">' +
                    '<img src="' + img + '" alt="' + name + '" class="size-full object-contain" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
                  '</a>' +
                  '<div class="flex-1 min-w-0 space-y-1.5">' +
                    '<h4 class="text-sm font-semibold text-gray-900 truncate hover:text-primary-main transition">' +
                      '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '">' + name + '</a>' +
                    '</h4>' +
                    '<div class="flex items-center justify-between gap-2">' +
                      '<div>' +
                        '<span class="text-sm font-bold text-primary-main">' + price + '</span>' +
                        (qty > 1 ? '<span class="text-xs text-gray-400 ml-1.5">(' + itemSubtotal + ')</span>' : '') +
                      '</div>' +
                      '<div class="flex items-center border border-gray-300 rounded-lg bg-gray-50 px-2 py-0.5 gap-2.5">' +
                        '<button type="button" onclick="window.CartAPI.updateQty(\'' + id + '\', ' + (qty - 1) + ')" class="size-5 flex items-center justify-center text-gray-600 hover:text-gray-900 font-bold text-sm cursor-pointer">-</button>' +
                        '<span class="text-xs font-bold text-gray-900 min-w-[14px] text-center">' + qty + '</span>' +
                        '<button type="button" onclick="window.CartAPI.updateQty(\'' + id + '\', ' + (qty + 1) + ')" class="size-5 flex items-center justify-center text-gray-600 hover:text-gray-900 font-bold text-sm cursor-pointer">+</button>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  '<button type="button" onclick="window.CartAPI.removeFromCart(\'' + id + '\')" title="Remove item" class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer">' +
                    '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
                  '</button>' +
                '</div>';
            });
            itemsHtml += '</div>';
            scrollContainer.innerHTML = itemsHtml;
          }
        }

        // 3. Update Subtotal amount in Drawer Footer
        panel.querySelectorAll('.shrink-0.border-t, .shrink-0.border-gray-300, .border-t').forEach(footer => {
          const subtotalLabels = Array.from(footer.querySelectorAll('span')).filter(s => {
            const t = s.textContent.toLowerCase();
            return t.includes('sub total') || t.includes('subtotal') || t.includes('total');
          });

          subtotalLabels.forEach(lbl => {
            if (lbl.parentElement) {
              const amountSpan = lbl.parentElement.querySelector('span:last-child');
              if (amountSpan && amountSpan !== lbl) {
                amountSpan.textContent = totalFormatted;
              }
            }
          });
        });
      });
    },

    /**
     * Dynamically render Cart Page (cart-single-vendor.html)
     */
    renderCartPage() {
      const isCartPage = window.location.pathname.includes('cart-single-vendor') ||
                         window.location.pathname.includes('cart') ||
                         document.querySelector('main table tbody') !== null;

      if (!isCartPage) return;

      const tableBody = document.querySelector('main table tbody');
      if (!tableBody) return;

      const count = this.getCount();
      const total = this.getTotalPrice();

      // Update item count in heading
      const countHeading = document.querySelector('main h3.text-gray-primary span');
      if (countHeading) {
        countHeading.textContent = '(' + count + ' items)';
      }

      if (this.cart.length === 0) {
        const sectionContainer = document.querySelector('main section .custom-container') || document.querySelector('main');
        if (sectionContainer) {
          sectionContainer.innerHTML =
            '<div class="mx-auto max-w-[520px] rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm text-center my-8">' +
              '<div class="flex flex-col items-center gap-6">' +
                '<div class="w-36 sm:w-44 flex items-center justify-center p-6 bg-primary-main/10 rounded-full text-primary-main mx-auto">' +
                  '<svg class="size-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                '</div>' +
                '<div>' +
                  '<h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 font-tiktok-sans">Your Cart is Empty</h2>' +
                  '<p class="text-gray-500 text-sm sm:text-base max-w-sm mx-auto">Looks like you haven\'t added anything to your cart yet. Explore our fresh grocery collection.</p>' +
                '</div>' +
                '<a href="top-banner-with-1-col.html" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-main hover:bg-primary-main-dark text-white px-8 py-3.5 text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 mx-auto">' +
                  '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                  '<span>Start Shopping</span>' +
                '</a>' +
              '</div>' +
            '</div>';
        }
        return;
      }

      let rowsHtml = '';
      this.cart.forEach(item => {
        const id = String(item.id || item.itemId);
        const name = item.name || 'Product Item';
        const priceVal = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const mrpVal = typeof item.mrp === 'number' ? item.mrp : parseFloat(item.mrp) || null;
        const price = this.formatPrice(priceVal);
        const mrp = mrpVal && mrpVal > priceVal ? this.formatPrice(mrpVal) : '';
        const img = item.image || 'src/images/home-1/best-selling-tabs/product-1.webp';
        const qty = Number(item.qty) || 1;
        const subtotal = this.formatPrice(priceVal * qty);

        rowsHtml +=
          '<tr class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70 transition" id="cart-row-' + id + '">' +
            '<td class="p-4 whitespace-nowrap first:pl-6">' +
              '<div class="flex items-center gap-3">' +
                '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="size-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1 flex items-center justify-center hover:opacity-90 transition">' +
                  '<img src="' + img + '" alt="' + name + '" class="h-full w-full object-contain" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
                '</a>' +
                '<div class="space-y-1 max-w-[260px]">' +
                  '<h3 class="line-clamp-1">' +
                    '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="text-gray-primary hover:text-primary-main text-base font-medium transition-colors">' + name + '</a>' +
                  '</h3>' +
                  '<span class="text-xs text-gray-400">Unit: ' + (item.unit || 'pcs') + '</span>' +
                '</div>' +
              '</div>' +
            '</td>' +
            '<td class="p-4 whitespace-nowrap">' +
              '<div class="flex items-center gap-2">' +
                '<span class="text-gray-primary font-medium">' + price + '</span>' +
                (mrp ? ('<span class="text-gray-tertiary text-sm line-through">' + mrp + '</span>') : '') +
              '</div>' +
            '</td>' +
            '<!-- Quantity -->' +
            '<td class="p-4 whitespace-nowrap">' +
              '<div class="border-gray-tertiary/32 flex w-28 items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2">' +
                '<button type="button" onclick="window.CartAPI.updateQty(\'' + id + '\', ' + (qty - 1) + ')" class="hover:text-primary-main text-gray-500 transition-colors cursor-pointer">' +
                  '<svg fill="none" height="18" viewBox="0 0 20 20" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M13.3335 10L6.66683 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><circle cx="10" cy="10" r="8.333" stroke="currentColor" stroke-width="1.5"></circle></svg>' +
                '</button>' +
                '<span class="text-gray-primary text-base font-semibold">' + qty + '</span>' +
                '<button type="button" onclick="window.CartAPI.updateQty(\'' + id + '\', ' + (qty + 1) + ')" class="hover:text-primary-main text-gray-500 transition-colors cursor-pointer">' +
                  '<svg fill="none" height="18" viewBox="0 0 20 20" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M10 6.667v6.666M13.333 10H6.667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><circle cx="10" cy="10" r="8.333" stroke="currentColor" stroke-width="1.5"></circle></svg>' +
                '</button>' +
              '</div>' +
            '</td>' +
            '<td class="p-4 whitespace-nowrap">' +
              '<span class="text-gray-primary text-base font-bold">' + subtotal + '</span>' +
            '</td>' +
            '<td class="p-4 whitespace-nowrap last:pr-6">' +
              '<button type="button" onclick="window.CartAPI.removeFromCart(\'' + id + '\')" title="Remove from cart" class="hover:text-red-500 text-gray-400 transition-colors cursor-pointer p-1.5 hover:bg-red-50 rounded-lg">' +
                '<svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M19 5L5 19M5 5L19 19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>' +
              '</button>' +
            '</td>' +
          '</tr>';
      });

      tableBody.innerHTML = rowsHtml;

      // Update Remove All button
      const removeAllBtn = document.querySelector('main button.text-error-dark');
      if (removeAllBtn) {
        removeAllBtn.onclick = () => this.clearCart();
      }

      // Update Order Summary Subtotal and Total
      document.querySelectorAll('main .xl\\:col-span-4 .space-y-4 .flex.justify-between span:last-child, main .border-t .text-xl.font-bold').forEach(el => {
        if (el.textContent.includes('$') || el.textContent.includes('₹') || el.classList.contains('font-bold')) {
          el.textContent = this.formatPrice(total);
        }
      });
    },

    /**
     * Show prominent Success Alert / Toast notification (Always clearly visible below sticky header)
     * @param {string} message
     * @param {string} type - 'cart' | 'wishlist' | 'info'
     */
    showToast(message, type) {
      type = type || 'cart';

      // 1. Ensure Toast Styles are injected in head
      if (!document.getElementById('wisetrack-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'wisetrack-toast-styles';
        style.textContent = `
          @keyframes wtToastIn {
            0% { opacity: 0; transform: translateY(-20px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes wtToastOut {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
          }
          #wisetrack-toast-container {
            position: fixed !important;
            top: 105px !important;
            right: 24px !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            max-width: 420px !important;
            width: calc(100% - 48px) !important;
            pointer-events: none !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          }
          .wisetrack-toast-item {
            pointer-events: auto !important;
            display: flex !important;
            align-items: center !important;
            gap: 14px !important;
            background: #111827 !important;
            color: #ffffff !important;
            padding: 14px 18px !important;
            border-radius: 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
            animation: wtToastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            line-height: 1.4 !important;
          }
          .wisetrack-toast-item.is-hiding {
            animation: wtToastOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }
          .wisetrack-toast-icon {
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
          }
          .wisetrack-toast-icon.is-cart {
            background: rgba(16, 185, 129, 0.2) !important;
            color: #34d399 !important;
          }
          .wisetrack-toast-icon.is-wishlist {
            background: rgba(239, 68, 68, 0.2) !important;
            color: #f87171 !important;
          }
        `;
        document.head.appendChild(style);
      }

      // 2. Get or create container
      let container = document.getElementById('wisetrack-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'wisetrack-toast-container';
        document.body.appendChild(container);
      }

      // Remove existing toast items
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // 3. Create toast element
      const toast = document.createElement('div');
      toast.className = 'wisetrack-toast-item';

      let iconHtml = '';
      if (type === 'wishlist') {
        iconHtml =
          '<div class="wisetrack-toast-icon is-wishlist">' +
            '<svg style="width:16px;height:16px;" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' +
          '</div>';
      } else {
        iconHtml =
          '<div class="wisetrack-toast-icon is-cart">' +
            '<svg style="width:18px;height:18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
          '</div>';
      }

      toast.innerHTML = iconHtml +
        '<span style="flex:1;color:#f9fafb;font-size:14px;">' + message + '</span>' +
        '<span style="color:#9ca3af;font-size:18px;line-height:1;padding:2px 4px;">&times;</span>';

      container.appendChild(toast);

      // Dismiss handler
      const removeToast = () => {
        toast.classList.add('is-hiding');
        setTimeout(() => {
          if (toast.parentElement) toast.remove();
        }, 260);
      };

      toast.onclick = removeToast;
      setTimeout(removeToast, 3200);
    }
  };

  // Expose Globally
  window.CartAPI = CartAPI;
  window.WiseTrackCart = CartAPI;

  // Register Alpine Store
  document.addEventListener('alpine:init', () => {
    if (window.Alpine && window.Alpine.store) {
      window.Alpine.store('cart', {
        items: CartAPI.cart,
        get count() {
          return CartAPI.getCount();
        },
        get total() {
          return CartAPI.getTotalPrice();
        },
        add(id, qty) {
          CartAPI.addToCart(id, qty);
        },
        update(id, qty) {
          CartAPI.updateQty(id, qty);
        },
        remove(id) {
          CartAPI.removeFromCart(id);
        },
        clear() {
          CartAPI.clearCart();
        }
      });
    }
  });

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartAPI.init());
  } else {
    CartAPI.init();
  }

})(window, document);
