/**
 * ============================================================================
 * WiseTrack E-Commerce - Shopper Wishlist API & UI Manager
 * File: src/api/wishlist.js
 * API Endpoint: https://demo.wisetracktechnologies.com/api/shopper/wishlist
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    URL: 'https://demo.wisetracktechnologies.com/api/shopper/wishlist',
    CATALOG_DETAIL_URL: 'https://demo.wisetracktechnologies.com/api/catalog/',
    CACHE_KEY: 'wisetrack_wishlist',
    PRODUCTS_CACHE_KEY: 'wisetrack_wishlist_products_cache',
    CACHE_TIMESTAMP_KEY: 'wisetrack_wishlist_time',
    TOKEN_KEYS: ['wisetrack_token', 'token', 'auth_token', 'jwt_token', 'access_token', 'user_token']
  };

  /**
   * Shopper Wishlist API & UI Controller
   */
  const WishlistAPI = {
    url: API_CONFIG.URL,
    catalogDetailUrl: API_CONFIG.CATALOG_DETAIL_URL,
    wishlist: [], // Array of product IDs or objects
    productDetailsCache: {}, // In-memory map: id -> full product object
    isLoaded: false,
    isLoading: false,

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
     * Initialize Wishlist Service
     */
    async init() {
      // 1. Load initial cache from localStorage for instant zero-latency render
      this.loadFromCache();

      // 2. Initial UI updates (counters, heart buttons, wishlist table)
      this.updateAllUI();

      // 3. Fetch live wishlist from API in background
      await this.fetchWishlist();

      // 4. If on wishlist page, ensure all products have full details fetched
      if (this.isWishlistPage()) {
        await this.syncWishlistProductDetails();
      }

      // 5. Register event listeners
      window.addEventListener('catalog:loaded', () => {
        this.syncWishlistProductDetails();
        this.updateAllUI();
      });
      window.addEventListener('catalog-loaded', () => {
        this.syncWishlistProductDetails();
        this.updateAllUI();
      });
      window.addEventListener('product:detail-loaded', () => this.updateHeartButtons());
      window.addEventListener('auth:login', () => this.fetchWishlist());
      window.addEventListener('auth:logout', () => {
        this.wishlist = [];
        this.saveToCache();
        this.updateAllUI();
      });
      window.addEventListener('storage', (e) => {
        if (e.key === API_CONFIG.CACHE_KEY || e.key === API_CONFIG.PRODUCTS_CACHE_KEY) {
          this.loadFromCache();
          this.updateAllUI();
        }
      });
    },

    isWishlistPage() {
      return window.location.pathname.includes('wishlist') ||
             document.getElementById('wishlist-container') !== null ||
             document.getElementById('wishlist-items-table') !== null ||
             document.querySelector('[data-wishlist-view]') !== null;
    },

    /**
     * Load cached wishlist items from localStorage
     */
    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.wishlist = parsed;
            this.isLoaded = true;
          }
        }
      } catch (err) {
        console.warn('[WishlistAPI] Cache read warning:', err);
      }

      try {
        const cachedProducts = localStorage.getItem(API_CONFIG.PRODUCTS_CACHE_KEY);
        if (cachedProducts) {
          const parsedObj = JSON.parse(cachedProducts);
          if (parsedObj && typeof parsedObj === 'object') {
            this.productDetailsCache = Object.assign(this.productDetailsCache, parsedObj);
          }
        }
      } catch (err) {}
    },

    /**
     * Save current wishlist to localStorage
     */
    saveToCache() {
      try {
        localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(this.wishlist));
        localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (err) {
        console.warn('[WishlistAPI] Cache save warning:', err);
      }

      try {
        localStorage.setItem(API_CONFIG.PRODUCTS_CACHE_KEY, JSON.stringify(this.productDetailsCache));
      } catch (err) {}
    },

    /**
     * Fetch live wishlist from /api/shopper/wishlist
     */
    async fetchWishlist() {
      if (this.isLoading) return this.wishlist;
      this.isLoading = true;

      try {
        const response = await fetch(this.url, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          let items = [];

          if (Array.isArray(data)) {
            items = data;
          } else if (data && typeof data === 'object') {
            items = data.data || data.items || data.wishlist || data.products || [];
          }

          if (Array.isArray(items)) {
            // Normalize items to product IDs or objects
            this.wishlist = items.map(item => {
              if (typeof item === 'string') return item;
              if (item && item.id) {
                // Cache item if it has details
                if (item.name || item.imageUrls || item.price) {
                  this.productDetailsCache[String(item.id)] = item;
                }
                return String(item.id);
              }
              if (item && item.productId) {
                return String(item.productId);
              }
              return item;
            }).filter(Boolean);

            this.isLoaded = true;
            this.saveToCache();
          }
        } else if (response.status === 401) {
          // Guest user: preserve and use local storage wishlist seamlessly
          this.loadFromCache();
        }
      } catch (error) {
        console.warn('[WishlistAPI] API fetch notice (using cached/local wishlist):', error.message);
        this.loadFromCache();
      } finally {
        this.isLoading = false;
        this.updateAllUI();
        this.dispatchEvents();
      }

      // If on wishlist page, load full product details in background
      if (this.isWishlistPage()) {
        this.syncWishlistProductDetails();
      }

      return this.wishlist;
    },

    /**
     * Synchronize and fetch missing product details for wishlist items
     */
    async syncWishlistProductDetails() {
      const missingIds = [];
      this.wishlist.forEach(item => {
        const id = typeof item === 'string' ? item : (item && item.id ? item.id : null);
        if (!id) return;
        const strId = String(id);
        const cached = this.productDetailsCache[strId];
        if (!cached || !cached.name || !cached.imageUrls || cached.price === undefined) {
          // Check if ProductAPI has it in memory
          if (window.ProductAPI && typeof window.ProductAPI.getProductById === 'function') {
            const fromProd = window.ProductAPI.getProductById(strId);
            if (fromProd && fromProd.id === strId) {
              this.productDetailsCache[strId] = fromProd;
              return;
            }
          }
          missingIds.push(strId);
        }
      });

      if (missingIds.length > 0) {
        // Fetch missing products in parallel from catalog API
        const fetchPromises = missingIds.map(async (id) => {
          try {
            const res = await fetch(this.catalogDetailUrl + encodeURIComponent(id));
            if (res.ok) {
              const product = await res.json();
              if (product && product.id) {
                this.productDetailsCache[String(product.id)] = product;
              }
            }
          } catch (e) {
            console.warn('[WishlistAPI] Detail fetch fallback for ' + id, e);
          }
        });

        await Promise.all(fetchPromises);
        this.saveToCache();
        this.renderWishlistPage();
      }
    },

    /**
     * Add product to wishlist
     * @param {string} productId
     */
    async addToWishlist(productId) {
      if (!productId) return;
      const strId = String(productId);

      // Cache product details if available in ProductAPI
      if (window.ProductAPI && typeof window.ProductAPI.getProductById === 'function') {
        const p = window.ProductAPI.getProductById(strId);
        if (p) this.productDetailsCache[strId] = p;
      }

      if (!this.isInWishlist(strId)) {
        this.wishlist.push(strId);
        this.saveToCache();
        this.updateAllUI();
        this.dispatchEvents();

        // Get product details for toast
        const product = this.getProductInfo(strId);
        const name = product && product.name ? product.name : 'Item';
        this.showToast('Added "' + name + '" to your wishlist!');

        // Call API endpoint
        try {
          await fetch(this.url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ productId: strId, id: strId })
          });
        } catch (err) {
          console.warn('[WishlistAPI] Remote add warning:', err);
        }
      }
    },

    /**
     * Remove product from wishlist
     * @param {string} productId
     */
    async removeFromWishlist(productId) {
      if (!productId) return;
      const strId = String(productId);

      const idx = this.wishlist.findIndex(item => (typeof item === 'string' ? item : item.id) === strId);
      if (idx > -1) {
        this.wishlist.splice(idx, 1);
        this.saveToCache();
        this.updateAllUI();
        this.dispatchEvents();
        this.showToast('Removed from wishlist.');

        // Call API endpoint (try standard delete then POST fallback)
        try {
          const deleteUrl = this.url + '/' + encodeURIComponent(strId);
          const res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: this.getHeaders()
          });
          if (!res.ok) {
            await fetch(this.url, {
              method: 'DELETE',
              headers: this.getHeaders(),
              body: JSON.stringify({ productId: strId, id: strId })
            });
          }
        } catch (err) {
          console.warn('[WishlistAPI] Remote remove warning:', err);
        }
      }
    },

    /**
     * Toggle product in wishlist
     * @param {string} productId
     */
    toggleWishlist(productId) {
      if (!productId) return;
      if (this.isInWishlist(productId)) {
        this.removeFromWishlist(productId);
      } else {
        this.addToWishlist(productId);
      }
    },

    /**
     * Clear all items from wishlist
     */
    async clearWishlist() {
      if (this.wishlist.length === 0) return;
      this.wishlist = [];
      this.saveToCache();
      this.updateAllUI();
      this.dispatchEvents();
      this.showToast('Wishlist cleared.');

      try {
        await fetch(this.url + '/clear', {
          method: 'DELETE',
          headers: this.getHeaders()
        });
      } catch (e) {}
    },

    /**
     * Check if product is in wishlist
     * @param {string} productId
     */
    isInWishlist(productId) {
      if (!productId) return false;
      const strId = String(productId);
      return this.wishlist.some(item => (typeof item === 'string' ? item : item.id) === strId);
    },

    /**
     * Get total wishlist count
     */
    getCount() {
      return this.wishlist.length;
    },

    /**
     * Helper to get full image URL from product object
     */
    getImageUrl(product) {
      if (!product) return 'src/images/home-1/best-selling-tabs/product-1.webp';
      if (window.ProductAPI && typeof window.ProductAPI.getImageUrl === 'function') {
        return window.ProductAPI.getImageUrl(product, 0);
      }
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
     * Helper to format price with proper currency symbol (matches ProductAPI: ₹)
     */
    formatPrice(amount) {
      if (window.ProductAPI && typeof window.ProductAPI.formatPrice === 'function') {
        return window.ProductAPI.formatPrice(amount);
      }
      if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
      return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    /**
     * Helper to get full product info from catalog or cache
     */
    getProductInfo(productId) {
      const strId = String(productId);

      // 1. Check in-memory product cache
      if (this.productDetailsCache[strId]) {
        return this.productDetailsCache[strId];
      }

      // 2. Check ProductAPI live catalog
      if (window.ProductAPI && typeof window.ProductAPI.getProductById === 'function') {
        const found = window.ProductAPI.getProductById(strId);
        if (found && (found.id === strId || String(found.id) === strId)) {
          this.productDetailsCache[strId] = found;
          return found;
        }
      }

      // 3. Check cached catalog
      try {
        const cachedCatalog = JSON.parse(localStorage.getItem('wisetrack_catalog_cache') || '[]');
        const found = cachedCatalog.find(p => String(p.id) === strId);
        if (found) {
          this.productDetailsCache[strId] = found;
          return found;
        }
      } catch (e) {}

      // 4. Check wishlist products cache
      try {
        const cachedWishlistProds = JSON.parse(localStorage.getItem(API_CONFIG.PRODUCTS_CACHE_KEY) || '{}');
        if (cachedWishlistProds && cachedWishlistProds[strId]) {
          this.productDetailsCache[strId] = cachedWishlistProds[strId];
          return cachedWishlistProds[strId];
        }
      } catch (e) {}

      return {
        id: strId,
        name: 'Loading Product...',
        price: 0,
        mrp: null,
        category: 'Grocery',
        unit: 'pcs',
        imageUrls: ['src/images/home-1/best-selling-tabs/product-1.webp']
      };
    },

    /**
     * Dispatch Custom Events
     */
    dispatchEvents() {
      const detail = {
        items: this.wishlist,
        count: this.wishlist.length
      };
      window.dispatchEvent(new CustomEvent('wishlist:updated', { detail }));
      window.dispatchEvent(new CustomEvent('wishlist-updated', { detail }));
      window.dispatchEvent(new CustomEvent('wishlist:loaded', { detail }));

      // Update Alpine Store if initialized
      if (window.Alpine && window.Alpine.store) {
        const store = window.Alpine.store('wishlist');
        if (store) {
          store.items = [...this.wishlist];
        }
      }
    },

    /**
     * Update all Wishlist UI elements across the page
     */
    updateAllUI() {
      this.updateBadges();
      this.updateHeartButtons();
      this.renderWishlistPage();
    },

    /**
     * Update wishlist count badges across header and navigation
     */
    updateBadges() {
      const count = this.getCount();

      // 1. Update elements with [data-wishlist-count] or .wishlist-count
      document.querySelectorAll('[data-wishlist-count], .wishlist-count, #wishlist-count').forEach(el => {
        el.textContent = count;
        if (count > 0) {
          el.classList.remove('hidden');
          el.style.display = '';
        } else {
          el.classList.add('hidden');
        }
      });

      // 2. Update Header Wishlist links (Top bar, Desktop Nav, Mobile Nav)
      document.querySelectorAll('a[href*="wishlist"]').forEach(link => {
        let badge = link.querySelector('.wishlist-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'wishlist-badge inline-flex items-center justify-center size-4.5 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ml-1';
          // If in mobile bottom bar, position badge absolute
          if (link.closest('[class*="fixed right-0 bottom-0"]')) {
            badge.className = 'wishlist-badge absolute top-1 right-1/4 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white';
          }
          link.appendChild(badge);
        }
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    },

    /**
     * Update all heart buttons on product cards and product details
     */
    updateHeartButtons() {
      const buttons = document.querySelectorAll('button[onclick*="toggleWishlist"], [data-wishlist-btn]');
      buttons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        let match = onclickAttr.match(/toggleWishlist\(['"]([^'"]+)['"]\)/);
        let id = match ? match[1] : btn.getAttribute('data-product-id');

        if (!id && window.location.pathname.includes('product-detail')) {
          const urlParams = new URLSearchParams(window.location.search);
          id = urlParams.get('id') || (window.ProductAPI && window.ProductAPI.currentProduct ? window.ProductAPI.currentProduct.id : null);
        }

        if (id) {
          const inWishlist = this.isInWishlist(id);
          const svg = btn.querySelector('svg');

          if (inWishlist) {
            btn.classList.add('is-active', 'text-red-500', 'border-red-500', 'bg-red-50');
            btn.classList.remove('text-gray-500', 'text-gray-600');
            if (svg) {
              svg.setAttribute('fill', 'currentColor');
              const paths = svg.querySelectorAll('path');
              paths.forEach(p => {
                p.setAttribute('fill', 'currentColor');
                p.setAttribute('stroke', 'currentColor');
              });
            }
          } else {
            btn.classList.remove('is-active', 'text-red-500', 'border-red-500', 'bg-red-50');
            btn.classList.add('text-gray-500');
            if (svg) {
              svg.setAttribute('fill', 'none');
              const paths = svg.querySelectorAll('path');
              paths.forEach(p => {
                p.setAttribute('fill', 'none');
                p.setAttribute('stroke', 'currentColor');
              });
            }
          }
        }
      });
    },

    /**
     * Render full Wishlist Page table/cards (on wishlist.html / empty-wishlist-screen.html)
     */
    renderWishlistPage() {
      if (!this.isWishlistPage()) return;

      const mainContainer = document.getElementById('wishlist-container') ||
                            document.querySelector('main section .custom-container') ||
                            document.querySelector('main .custom-container') ||
                            document.querySelector('main');

      if (!mainContainer) return;

      const count = this.getCount();

      if (count === 0) {
        // Render Empty State
        mainContainer.innerHTML = 
          '<div class="mx-auto max-w-[520px] rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm text-center my-8">' +
            '<div class="flex flex-col items-center gap-6">' +
              '<div class="w-36 sm:w-44 flex items-center justify-center p-6 bg-red-50 rounded-full text-red-500 mx-auto">' +
                '<svg class="size-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>' +
              '</div>' +
              '<div>' +
                '<h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 font-tiktok-sans">Your Wishlist is Empty</h2>' +
                '<p class="text-gray-500 text-sm sm:text-base max-w-sm mx-auto">Explore our wide range of products and save your favorites to view or purchase later.</p>' +
              '</div>' +
              '<a href="top-banner-with-1-col.html" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-main hover:bg-primary-main-dark text-white px-8 py-3.5 text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 mx-auto">' +
                '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                '<span>Start Shopping</span>' +
              '</a>' +
            '</div>' +
          '</div>';
      } else {
        // Render Wishlist Table / Grid
        let rowsHtml = '';
        this.wishlist.forEach(item => {
          const id = typeof item === 'string' ? item : (item && item.id ? item.id : String(item));
          const product = this.getProductInfo(id);

          const img = this.getImageUrl(product);
          const name = product.name || 'Product Item';
          const price = this.formatPrice(product.price || 0);
          const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
          const category = product.category || 'Grocery';
          const unit = product.unit ? ('<span class="text-xs text-gray-400 font-normal"> / ' + product.unit + '</span>') : '';
          const stockText = product.availability === 'out_of_stock' || product.stock === 0 ? 'Out of Stock' : 'In Stock';
          const stockClass = stockText === 'In Stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200';
          const dotClass = stockText === 'In Stock' ? 'bg-emerald-500' : 'bg-red-500';

          rowsHtml += 
            '<tr class="border-b border-gray-200 transition-colors hover:bg-gray-50/70" id="wishlist-row-' + id + '">' +
              '<!-- Product Info -->' +
              '<td class="py-4 pl-4 pr-6">' +
                '<div class="flex items-center gap-4">' +
                  '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="size-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-1 flex items-center justify-center hover:opacity-90 transition">' +
                    '<img src="' + img + '" alt="' + name + '" class="size-full object-contain" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
                  '</a>' +
                  '<div class="space-y-1">' +
                    '<span class="text-xs font-semibold text-primary-main uppercase tracking-wider">' + category + '</span>' +
                    '<h4 class="text-base font-semibold text-gray-900 hover:text-primary-main transition line-clamp-1">' +
                      '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '">' + name + '</a>' +
                    '</h4>' +
                    '<p class="text-xs text-gray-500">' + (product.stock ? (product.stock + ' in stock') : 'Available') + unit + '</p>' +
                  '</div>' +
                '</div>' +
              '</td>' +
              '<!-- Price -->' +
              '<td class="py-4 px-6 text-left">' +
                '<div class="flex flex-col">' +
                  '<span class="text-lg font-bold text-gray-900">' + price + '</span>' +
                  (mrp ? ('<span class="text-xs text-gray-400 line-through">' + mrp + '</span>') : '') +
                '</div>' +
              '</td>' +
              '<!-- Stock Status -->' +
              '<td class="py-4 px-6 text-center">' +
                '<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ' + stockClass + '">' +
                  '<span class="size-1.5 rounded-full ' + dotClass + '"></span>' +
                  stockText +
                '</span>' +
              '</td>' +
              '<!-- Action Buttons -->' +
              '<td class="py-4 pr-4 pl-6 text-right">' +
                '<div class="flex items-center justify-end gap-3">' +
                  '<button type="button" onclick="window.CartAPI ? window.CartAPI.addToCart(\'' + id + '\') : (window.ProductAPI ? window.ProductAPI.addToCart(\'' + id + '\') : null)" class="inline-flex items-center gap-2 rounded-lg bg-primary-main hover:bg-primary-main-dark text-white px-4 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer">' +
                    '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                    '<span>Add to Cart</span>' +
                  '</button>' +
                  '<button type="button" onclick="window.WishlistAPI.removeFromWishlist(\'' + id + '\')" title="Remove from wishlist" class="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer">' +
                    '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
                  '</button>' +
                '</div>' +
              '</td>' +
            '</tr>';
        });

        mainContainer.innerHTML =
          '<div class="my-8 space-y-6" id="wishlist-container">' +
            '<!-- Wishlist Header Bar -->' +
            '<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">' +
              '<div>' +
                '<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">My Wishlist</h1>' +
                '<p class="text-sm text-gray-500 mt-1">You have <span class="font-bold text-primary-main">' + count + '</span> item' + (count > 1 ? 's' : '') + ' saved in your wishlist</p>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<button type="button" onclick="window.WishlistAPI.clearWishlist()" class="text-sm font-medium text-gray-600 hover:text-red-600 px-3 py-2 rounded-lg border border-gray-300 hover:border-red-300 hover:bg-red-50 transition flex items-center gap-1.5 cursor-pointer">' +
                  '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
                  '<span>Clear Wishlist</span>' +
                '</button>' +
                '<a href="top-banner-with-1-col.html" class="text-sm font-semibold text-white bg-primary-main hover:bg-primary-main-dark px-4 py-2 rounded-lg transition shadow-sm">' +
                  'Continue Shopping' +
                '</a>' +
              '</div>' +
            '</div>' +
            '<!-- Responsive Table -->' +
            '<div class="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">' +
              '<table class="w-full text-left border-collapse min-w-[650px]">' +
                '<thead>' +
                  '<tr class="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-600">' +
                    '<th class="py-3.5 pl-4 pr-6">Product</th>' +
                    '<th class="py-3.5 px-6">Unit Price</th>' +
                    '<th class="py-3.5 px-6 text-center">Stock</th>' +
                    '<th class="py-3.5 pr-4 pl-6 text-right">Actions</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody class="divide-y divide-gray-100" id="wishlist-table-body">' +
                  rowsHtml +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>';
      }
    },

    /**
     * Show UI notification toast
     */
    showToast(message) {
      if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
        window.CartAPI.showToast(message, 'wishlist');
        return;
      }
      if (window.ProductAPI && typeof window.ProductAPI.showToast === 'function') {
        window.ProductAPI.showToast(message, 'wishlist');
        return;
      }
    }
  };

  // Expose Globally
  window.WishlistAPI = WishlistAPI;
  window.WiseTrackWishlist = WishlistAPI;

  // Register Alpine Store
  document.addEventListener('alpine:init', () => {
    if (window.Alpine && window.Alpine.store) {
      window.Alpine.store('wishlist', {
        items: WishlistAPI.wishlist,
        get count() {
          return this.items.length;
        },
        has(id) {
          return WishlistAPI.isInWishlist(id);
        },
        toggle(id) {
          WishlistAPI.toggleWishlist(id);
        },
        remove(id) {
          WishlistAPI.removeFromWishlist(id);
        },
        clear() {
          WishlistAPI.clearWishlist();
        }
      });
    }
  });

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WishlistAPI.init());
  } else {
    WishlistAPI.init();
  }

})(window, document);
