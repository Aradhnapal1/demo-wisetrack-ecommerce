/**
 * ============================================================================
 * WiseTrack E-Commerce - Orders & Tracking API Manager
 * File: src/api/orders.js
 * API Endpoints:
 *   - GET  /api/shopper/orders
 *   - POST /api/orders/lookup
 *   - GET  /api/orders/{id}
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    SHOPPER_ORDERS_URL: 'https://demo.wisetracktechnologies.com/api/shopper/orders',
    LOOKUP_URL: 'https://demo.wisetracktechnologies.com/api/orders/lookup',
    ORDER_URL: 'https://demo.wisetracktechnologies.com/api/orders/',
    BASE_URL: 'https://demo.wisetracktechnologies.com',
    ORDERS_CACHE_KEY: 'wisetrack_orders_history',
    DEFAULT_EMAIL: 'shopper@example.com',
    EMAIL_KEYS: ['user_email', 'email', 'auth_email', 'shopper_email'],
    TOKEN_KEYS: ['wisetrack_token', 'token', 'auth_token', 'jwt_token', 'access_token', 'user_token']
  };

  /**
   * Orders API Controller
   */
  const OrdersAPI = {
    shopperOrdersUrl: API_CONFIG.SHOPPER_ORDERS_URL,
    lookupUrl: API_CONFIG.LOOKUP_URL,
    orderUrl: API_CONFIG.ORDER_URL,
    baseUrl: API_CONFIG.BASE_URL,
    orders: [],
    currentOrder: null,
    isLoading: false,

    /**
     * Get stored shopper auth token
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
     * Get stored user email
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
     * Initialize Orders Service
     */
    async init() {
      this.loadFromCache();
      this.renderOrdersInDashboard();

      // Fetch live shopper orders
      await this.fetchShopperOrders();

      // Listen for new orders placed
      window.addEventListener('order:placed', (e) => {
        if (e.detail) {
          this.saveOrderToHistory(e.detail);
          this.renderOrdersInDashboard();
        }
      });

      window.addEventListener('auth:login', () => this.fetchShopperOrders());
    },

    /**
     * Load orders list from localStorage
     */
    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.ORDERS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.orders = parsed;
          }
        }
      } catch (e) {}
    },

    /**
     * Save an order to history
     * @param {Object} order
     */
    saveOrderToHistory(order) {
      if (!order) return;
      const orderId = order.id || order.orderRef;
      const existingIdx = this.orders.findIndex(o => (o.id || o.orderRef) === orderId);

      if (existingIdx > -1) {
        this.orders[existingIdx] = Object.assign({}, this.orders[existingIdx], order);
      } else {
        this.orders.unshift(order);
      }

      try {
        localStorage.setItem(API_CONFIG.ORDERS_CACHE_KEY, JSON.stringify(this.orders));
      } catch (e) {}
    },

    /**
     * Fetch Shopper Orders from GET /api/shopper/orders
     */
    async fetchShopperOrders() {
      try {
        const response = await fetch(this.shopperOrdersUrl, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge with local orders
            data.forEach(order => this.saveOrderToHistory(order));
            this.renderOrdersInDashboard();
          }
        }
      } catch (e) {
        console.warn('[OrdersAPI] Shopper orders notice (using cache):', e.message);
      }
      return this.orders;
    },

    /**
     * Lookup Order by Reference and Email (/api/orders/lookup)
     * @param {string} reference
     * @param {string} email
     */
    async lookupOrder(reference, email) {
      if (!reference) return null;
      email = email || this.getUserEmail();

      this.isLoading = true;
      try {
        const payload = {
          email: email,
          reference: reference,
          orderRef: reference
        };

        const response = await fetch(this.lookupUrl, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          this.currentOrder = data;
          this.saveOrderToHistory(data);
          return data;
        } else {
          const err = await response.json();
          console.warn('[OrdersAPI] Lookup error:', err);
          return null;
        }
      } catch (e) {
        console.error('[OrdersAPI] Network error during lookup:', e);
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Get Order Details by ID (/api/orders/{id})
     * @param {string} orderId
     */
    async getOrderById(orderId) {
      if (!orderId) return null;

      this.isLoading = true;
      try {
        const response = await fetch(this.orderUrl + encodeURIComponent(orderId), {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          const fullOrder = data.order || data;
          if (data.items) fullOrder.items = data.items;
          if (data.events) fullOrder.events = data.events;
          if (data.access) fullOrder.access = data.access;

          this.currentOrder = fullOrder;
          this.saveOrderToHistory(fullOrder);
          return data;
        } else {
          console.warn('[OrdersAPI] Order details error status:', response.status);
          return null;
        }
      } catch (e) {
        console.error('[OrdersAPI] Network error fetching order details:', e);
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Format currency helper
     */
    formatPrice(amount) {
      if (window.CartAPI && typeof window.CartAPI.formatPrice === 'function') {
        return window.CartAPI.formatPrice(amount);
      }
      return '₹' + (Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    /**
     * Format Date helper
     */
    formatDate(dateStr) {
      if (!dateStr) return 'Recent';
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    },

    /**
     * Dynamically render orders into user dashboard
     */
    renderOrdersInDashboard() {
      const isDashboardPage = window.location.pathname.includes('user-dashboard') ||
                              document.querySelector('[x-show*="orders"]') !== null;

      if (!isDashboardPage) return;

      const ordersContainer = document.querySelector('[x-show*="orders"] .space-y-6, [x-show*="Orders History"] .space-y-6');
      if (!ordersContainer) return;

      if (this.orders.length === 0) {
        ordersContainer.innerHTML =
          '<div class="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">' +
            '<div class="size-20 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 mx-auto mb-4">' +
              '<svg class="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>' +
            '</div>' +
            '<h3 class="text-xl font-bold text-gray-900 mb-2">No Orders Found</h3>' +
            '<p class="text-gray-500 text-sm max-w-sm mx-auto mb-6">You haven\'t placed any orders yet. Explore our grocery catalog and place your first order!</p>' +
            '<a href="top-banner-with-1-col.html" class="inline-flex items-center gap-2 rounded-xl bg-primary-main hover:bg-primary-main-dark text-white px-6 py-3 text-sm font-semibold transition shadow-md">' +
              'Start Shopping' +
            '</a>' +
          '</div>';
        return;
      }

      let ordersHtml = '';
      this.orders.forEach(order => {
        const orderRef = order.orderRef || order.id || 'ORD';
        const dateFormatted = this.formatDate(order.createdAt || order.date);
        const total = this.formatPrice(order.total || order.amountDue || 0);
        const status = (order.status || 'Confirmed').toUpperCase();
        const invoiceUrl = order.invoicePdfUrl ? (order.invoicePdfUrl.startsWith('http') ? order.invoicePdfUrl : (this.baseUrl + order.invoicePdfUrl)) : null;
        const trackingUrl = order.trackingUrl || null;
        const awb = order.awb || order.trackingNumber || null;

        // Status badge color
        let statusBadge = '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="size-1.5 rounded-full bg-emerald-500"></span> ' + status + '</span>';
        if (status === 'CANCELED' || status === 'CANCELLED') {
          statusBadge = '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><span class="size-1.5 rounded-full bg-red-500"></span> ' + status + '</span>';
        } else if (status === 'UNFULFILLED' || status === 'PROCESSING') {
          statusBadge = '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span class="size-1.5 rounded-full bg-amber-500"></span> ' + status + '</span>';
        }

        ordersHtml +=
          '<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 space-y-4">' +
            '<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">' +
              '<div class="space-y-1">' +
                '<div class="flex items-center gap-3">' +
                  '<span class="text-base font-bold text-primary-main font-mono">#' + orderRef + '</span>' +
                  statusBadge +
                '</div>' +
                '<p class="text-xs text-gray-500">Placed on <span class="font-medium text-gray-700">' + dateFormatted + '</span></p>' +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                '<span class="text-xs text-gray-500 font-medium">Total:</span>' +
                '<span class="text-lg font-bold text-gray-900">' + total + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">' +
              '<div class="flex items-center gap-2">' +
                (awb ? '<span class="text-xs text-gray-500">AWB: <strong class="text-gray-800 font-mono">' + awb + '</strong></span>' : '') +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                (trackingUrl ?
                  '<a href="' + trackingUrl + '" target="_blank" class="inline-flex items-center gap-1 text-xs font-semibold text-primary-main hover:underline">' +
                    '<svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
                    '<span>Track Package</span>' +
                  '</a>' : '') +
                (invoiceUrl ?
                  '<button type="button" onclick="window.downloadInvoice ? window.downloadInvoice(\'' + invoiceUrl + '\', \'' + orderRef + '\') : window.open(\'' + invoiceUrl + '\', \'_blank\');" class="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-primary-main px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-main transition cursor-pointer">' +
                    '<svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
                    '<span>Download Invoice</span>' +
                  '</button>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
      });

      ordersContainer.innerHTML = ordersHtml;
    }
  };

  // Expose Globally
  window.OrdersAPI = OrdersAPI;
  window.WiseTrackOrders = OrdersAPI;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => OrdersAPI.init());
  } else {
    OrdersAPI.init();
  }

})(window, document);
