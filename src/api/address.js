/**
 * ============================================================================
 * WiseTrack E-Commerce - Shopper Address API & UI Manager
 * File: src/api/address.js
 * API Endpoints:
 *   - GET  /api/shopper/addresses
 *   - POST /api/shopper/addresses
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    URL: 'https://demo.wisetracktechnologies.com/api/shopper/addresses',
    CACHE_KEY: 'wisetrack_addresses',
    TOKEN_KEYS: ['wisetrack_token', 'token', 'auth_token', 'jwt_token', 'access_token', 'user_token']
  };

  /**
   * Address API Controller
   */
  const AddressAPI = {
    url: API_CONFIG.URL,
    addresses: [],
    selectedAddressId: null,
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
     * Initialize Address Service
     */
    async init() {
      this.loadFromCache();
      this.renderCheckoutAddressSelector();
      this.renderDashboardAddresses();
      this.bindCheckoutSaveButton();

      // Fetch live addresses in background
      await this.fetchAddresses();

      window.addEventListener('auth:login', () => this.fetchAddresses());
    },

    /**
     * Load addresses from localStorage
     */
    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            // Clean up any legacy dummy static address cards
            this.addresses = parsed.filter(a => a && a.id !== 'default-addr-1' && a.id !== 'addr-home-1' && (a.name || '').toLowerCase() !== 'priya sharma');
            this.saveToCache();
          }
        }
      } catch (e) {}

      if (!this.addresses) {
        this.addresses = [];
      }
    },

    /**
     * Save addresses to localStorage
     */
    saveToCache() {
      try {
        localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(this.addresses));
      } catch (e) {}
    },

    /**
     * Fetch addresses from GET /api/shopper/addresses
     */
    async fetchAddresses() {
      if (this.isLoading) return this.addresses;
      this.isLoading = true;

      try {
        const response = await fetch(this.url, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            // Filter out any mock dummy addresses if needed
            this.addresses = data.filter(a => a && a.id !== 'default-addr-1' && a.id !== 'addr-home-1' && (a.name || '').toLowerCase() !== 'priya sharma');
            this.saveToCache();
          }
        }
      } catch (e) {
        console.warn('[AddressAPI] Fetch error notice (using cached):', e.message);
      } finally {
        this.isLoading = false;
        this.renderCheckoutAddressSelector();
        this.renderDashboardAddresses();
      }

      return this.addresses;
    },

    /**
     * Save new address via POST /api/shopper/addresses
     * @param {Object} addressData
     */
    async saveAddress(addressData) {
      if (!addressData) return null;

      const payload = {
        name: addressData.name || '',
        phone: addressData.phone || '',
        line: addressData.line || addressData.address || '',
        city: addressData.city || '',
        state: addressData.state || 'DL',
        pincode: addressData.pincode || addressData.zip || '',
        makeDefault: !!addressData.makeDefault
      };

      let newAddress = null;

      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          newAddress = await response.json();
        }
      } catch (e) {
        console.warn('[AddressAPI] POST error notice (saving locally):', e.message);
      }

      if (!newAddress) {
        newAddress = {
          id: 'addr-' + Date.now(),
          ...payload,
          isDefault: !!payload.makeDefault
        };
      }

      if (payload.makeDefault) {
        this.addresses.forEach(a => a.isDefault = false);
      }

      this.addresses.unshift(newAddress);
      this.selectedAddressId = newAddress.id;
      this.saveToCache();
      this.renderCheckoutAddressSelector();
      this.renderDashboardAddresses();
      this.fillCheckoutForm(newAddress, false);

      window.dispatchEvent(new CustomEvent('address:saved', { detail: newAddress }));
      window.dispatchEvent(new CustomEvent('address:updated', { detail: this.addresses }));

      if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
        window.CartAPI.showToast('Address saved successfully!', 'cart');
      }

      return newAddress;
    },

    /**
     * Bind click handler to the Save button in the Address section of checkout-1.html
     */
    bindCheckoutSaveButton() {
      const saveBtn = document.getElementById('save-address-btn') || document.querySelector('form button[type="submit"]:not(#place-order-btn)');
      if (saveBtn) {
        saveBtn.onclick = (e) => {
          e.preventDefault();
          this.saveAddressFromCheckoutForm();
        };
      }
    },

    /**
     * Extract data from Checkout form and save address
     */
    saveAddressFromCheckoutForm() {
      const fName = document.getElementById('first_name') ? document.getElementById('first_name').value.trim() : '';
      const lName = document.getElementById('last_name') ? document.getElementById('last_name').value.trim() : '';
      const fullName = (fName + (lName ? (' ' + lName) : '')).trim();
      const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
      const city = document.getElementById('city') ? document.getElementById('city').value.trim() : '';
      const zip = document.getElementById('zip') ? document.getElementById('zip').value.trim() : '';
      const line = document.getElementById('apartments') ? document.getElementById('apartments').value.trim() : (document.getElementById('address') ? document.getElementById('address').value.trim() : '');

      if (!fullName || !line || !city || !zip) {
        if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
          window.CartAPI.showToast('Please enter Name, Address, City, and ZIP code to save.', 'wishlist');
        }
        return;
      }

      const data = {
        name: fullName,
        phone: phone,
        line: line,
        city: city,
        state: 'DL',
        pincode: zip,
        makeDefault: true
      };

      this.saveAddress(data);
    },

    /**
     * Extract data from Dashboard Add Address form and save
     */
    saveAddressFromDashboardForm() {
      const cityInput = document.querySelector('[x-show*="add-address"] #city, #city');
      const zipInput = document.querySelector('[x-show*="add-address"] #zip, #zip');
      const lineInput = document.querySelector('[x-show*="add-address"] #apartments, #apartments');

      let userName = '';
      let userPhone = '';
      try {
        const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || '{}');
        if (u.name) userName = u.name;
        if (u.phone) userPhone = u.phone;
      } catch (e) {}

      const city = cityInput && cityInput.value.trim() ? cityInput.value.trim() : '';
      const zip = zipInput && zipInput.value.trim() ? zipInput.value.trim() : '';
      const line = lineInput && lineInput.value.trim() ? lineInput.value.trim() : '';

      if (!line || !city) {
        if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
          window.CartAPI.showToast('Please fill in address and city.', 'wishlist');
        }
        return;
      }

      const data = {
        name: userName || 'Customer',
        phone: userPhone,
        line: line,
        city: city,
        state: 'DL',
        pincode: zip,
        makeDefault: true
      };

      this.saveAddress(data);

      // Return to Address tab in Alpine if available
      try {
        const alpineEl = document.querySelector('[x-data*="activeTab"]');
        if (alpineEl && alpineEl._x_dataStack) {
          alpineEl._x_dataStack[0].activeTab = 'address';
        }
      } catch (e) {}
    },

    /**
     * Select address by ID directly
     * @param {string} addrId
     */
    selectAddressById(addrId) {
      if (!addrId) return;
      if (addrId === 'new_custom_address') {
        this.selectNewAddressOption();
        return;
      }
      const addr = this.addresses.find(a => a.id === addrId);
      if (addr) {
        this.fillCheckoutForm(addr, true);
      }
    },

    /**
     * Auto-fill checkout form with selected address
     * @param {Object} addr
     * @param {boolean} [triggerToast=true]
     */
    fillCheckoutForm(addr, triggerToast = true) {
      if (!addr) return;
      this.selectedAddressId = addr.id;

      const fInput = document.getElementById('first_name');
      const lInput = document.getElementById('last_name');
      const pInput = document.getElementById('phone');
      const cInput = document.getElementById('city');
      const zInput = document.getElementById('zip');
      const aInput = document.getElementById('apartments') || document.getElementById('address');

      if (addr.name) {
        const parts = addr.name.split(' ');
        if (fInput) fInput.value = parts[0] || '';
        if (lInput) lInput.value = parts.slice(1).join(' ') || '';
      }
      if (pInput) pInput.value = addr.phone || '';
      if (cInput) cInput.value = addr.city || '';
      if (zInput) zInput.value = addr.pincode || addr.zip || '';
      if (aInput) aInput.value = addr.line || addr.address || '';

      this.renderCheckoutAddressSelector();
      if (triggerToast && window.CartAPI && typeof window.CartAPI.showToast === 'function') {
        window.CartAPI.showToast('Selected address: ' + (addr.name || 'Address') + (addr.city ? (' (' + addr.city + ')') : ''), 'cart');
      }
    },

    /**
     * Render saved address selector cards with radio buttons at the top of checkout address section
     */
    renderCheckoutAddressSelector() {
      const isCheckout = window.location.pathname.includes('checkout') || document.getElementById('first_name') !== null;
      if (!isCheckout) return;

      const addressSection = document.querySelector('form[x-data*="shipmentType"], form[x-data*="addressType"]');
      if (!addressSection) return;

      let picker = document.getElementById('wisetrack-saved-addresses-picker');
      if (!picker) {
        picker = document.createElement('div');
        picker.id = 'wisetrack-saved-addresses-picker';
        picker.className = 'mb-6 space-y-3';
        addressSection.insertBefore(picker, addressSection.firstChild);
      }

      if (!this.addresses || this.addresses.length === 0) {
        picker.innerHTML = '';
        return;
      }

      // Determine active address
      if (!this.selectedAddressId && this.addresses.length > 0) {
        const def = this.addresses.find(a => a.isDefault) || this.addresses[0];
        this.selectedAddressId = def.id;
        // Autofill on load
        setTimeout(() => this.fillCheckoutForm(def, false), 100);
      }

      let cardsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">';
      this.addresses.forEach((addr) => {
        const isSelected = this.selectedAddressId === addr.id;
        const borderClass = isSelected
          ? 'border-primary-main bg-primary-main/5 ring-2 ring-primary-main/20 shadow-xs'
          : 'border-gray-200 bg-white hover:border-gray-300';

        cardsHtml +=
          '<label onclick="window.AddressAPI.selectAddressById(\'' + addr.id + '\')" class="relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ' + borderClass + '">' +
            '<div class="flex items-start gap-3 w-full">' +
              '<!-- Radio Button -->' +
              '<div class="pt-0.5">' +
                '<input type="radio" name="selected_delivery_address" value="' + addr.id + '" ' + (isSelected ? 'checked' : '') + ' class="sr-only" />' +
                '<div class="flex size-4.5 items-center justify-center rounded-full border-2 transition ' + (isSelected ? 'border-primary-main bg-white' : 'border-gray-300 bg-white') + '">' +
                  '<div class="size-2.5 rounded-full transition ' + (isSelected ? 'bg-primary-main scale-100' : 'bg-transparent scale-0') + '"></div>' +
                '</div>' +
              '</div>' +
              '<!-- Address Content -->' +
              '<div class="flex-1 min-w-0 space-y-1">' +
                '<div class="flex items-center justify-between">' +
                  '<span class="text-sm font-bold text-gray-900 truncate">' + (addr.name || 'Saved Address') + '</span>' +
                '</div>' +
                '<p class="text-xs text-gray-600 line-clamp-2 leading-relaxed">' + (addr.line || addr.address || '') + (addr.city ? (', ' + addr.city) : '') + (addr.pincode ? (' - ' + addr.pincode) : '') + '</p>' +
                (addr.phone ? '<p class="text-xs text-gray-500 font-medium pt-0.5">Phone: <span class="text-gray-700 font-semibold">' + addr.phone + '</span></p>' : '') +
              '</div>' +
            '</div>' +
          '</label>';
      });

      // + Enter New Address option
      const isNewSelected = this.selectedAddressId === 'new_custom_address';
      const newBorderClass = isNewSelected
        ? 'border-primary-main bg-primary-main/5 ring-2 ring-primary-main/20 shadow-xs'
        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400';

      cardsHtml +=
        '<label onclick="window.AddressAPI.selectNewAddressOption()" class="relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ' + newBorderClass + '">' +
          '<div class="flex items-start gap-3 w-full">' +
            '<div class="pt-0.5">' +
              '<input type="radio" name="selected_delivery_address" value="new_custom_address" ' + (isNewSelected ? 'checked' : '') + ' class="sr-only" />' +
              '<div class="flex size-4.5 items-center justify-center rounded-full border-2 transition ' + (isNewSelected ? 'border-primary-main bg-white' : 'border-gray-300 bg-white') + '">' +
                '<div class="size-2.5 rounded-full transition ' + (isNewSelected ? 'bg-primary-main scale-100' : 'bg-transparent scale-0') + '"></div>' +
              '</div>' +
            '</div>' +
            '<div class="flex-1">' +
              '<span class="text-sm font-bold text-gray-900 flex items-center gap-1.5">' +
                '<svg class="size-4 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>' +
                '<span>+ Enter New Address</span>' +
              '</span>' +
              '<p class="text-xs text-gray-500 mt-1">Fill custom delivery details below</p>' +
            '</div>' +
          '</div>' +
        '</label>';

      cardsHtml += '</div>';

      picker.innerHTML =
        '<div class="flex items-center justify-between pb-2 border-b border-gray-100">' +
          '<h4 class="text-sm font-bold text-gray-900 flex items-center gap-2">' +
            '<svg class="size-4.5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
            '<span>Select Delivery Address</span>' +
          '</h4>' +
          '<span class="text-xs text-primary-main font-medium">' + this.addresses.length + ' Saved</span>' +
        '</div>' +
        cardsHtml +
        '<div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Address Details (Auto-filled or Edit):</div>';
    },

    /**
     * Get currently selected address object
     */
    getSelectedAddress() {
      if (this.selectedAddressId && this.selectedAddressId !== 'new_custom_address') {
        const found = this.addresses.find(a => a.id === this.selectedAddressId);
        if (found) return found;
      }

      // If new custom address or manual entry, extract directly from DOM inputs
      const fInput = document.getElementById('first_name');
      const lInput = document.getElementById('last_name');
      const pInput = document.getElementById('phone');
      const cInput = document.getElementById('city');
      const zInput = document.getElementById('zip');
      const aInput = document.getElementById('apartments') || document.getElementById('address');

      const fName = fInput ? fInput.value.trim() : '';
      const lName = lInput ? lInput.value.trim() : '';
      const fullName = (fName + (lName ? (' ' + lName) : '')).trim();
      const phone = pInput ? pInput.value.trim() : '';
      const city = cInput ? cInput.value.trim() : '';
      const pincode = zInput ? zInput.value.trim() : '';
      const line = aInput ? aInput.value.trim() : '';

      if (fullName || line || city || phone) {
        return {
          id: 'custom-entry',
          name: fullName,
          phone: phone,
          line: line,
          address: line,
          city: city,
          state: 'DL',
          pincode: pincode,
          zip: pincode
        };
      }

      return (this.addresses && this.addresses.length > 0) ? this.addresses[0] : null;
    },

    /**
     * Select new address option and clear inputs for manual entry
     */
    selectNewAddressOption() {
      this.selectedAddressId = 'new_custom_address';
      const fInput = document.getElementById('first_name');
      const lInput = document.getElementById('last_name');
      const pInput = document.getElementById('phone');
      const cInput = document.getElementById('city');
      const zInput = document.getElementById('zip');
      const aInput = document.getElementById('apartments') || document.getElementById('address');

      if (fInput) fInput.value = '';
      if (lInput) lInput.value = '';
      if (pInput) pInput.value = '';
      if (cInput) cInput.value = '';
      if (zInput) zInput.value = '';
      if (aInput) aInput.value = '';

      this.renderCheckoutAddressSelector();
      if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
        window.CartAPI.showToast('Please enter new delivery address below.', 'cart');
      }
    },

    /**
     * Render saved addresses in User Dashboard (Address Tab)
     */
    renderDashboardAddresses() {
      const isDashboard = window.location.pathname.includes('user-dashboard') || document.querySelector('[x-show*="address"]') !== null;
      if (!isDashboard) return;

      const addressContainer = document.querySelector('[x-show*="activeTab === \'address\'"] .space-y-6, [x-show*="address"] .space-y-6');
      if (!addressContainer) return;

      let listHtml = '';
      this.addresses.forEach(addr => {
        listHtml +=
          '<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 transition hover:border-gray-300">' +
            '<div class="flex items-center justify-between border-b border-gray-100 pb-3">' +
              '<div class="flex items-center gap-3">' +
                '<h3 class="text-base font-bold text-gray-900">' + (addr.name || 'Address') + '</h3>' +
              '</div>' +
            '</div>' +
            '<div class="text-sm text-gray-600 space-y-1">' +
              '<p class="font-medium text-gray-800">' + (addr.line || addr.address || '') + '</p>' +
              '<p>' + (addr.city || '') + (addr.state ? (', ' + addr.state) : '') + (addr.pincode ? (' - ' + addr.pincode) : '') + '</p>' +
              (addr.phone ? '<p class="text-xs text-gray-500">Phone: <span class="font-medium text-gray-700">' + addr.phone + '</span></p>' : '') +
            '</div>' +
          '</div>';
      });

      addressContainer.innerHTML =
        '<div class="flex items-center justify-between pb-4 border-b border-gray-200">' +
          '<h2 class="text-2xl font-bold text-gray-900 font-tiktok-sans">My Saved Addresses</h2>' +
          '<button type="button" onclick="window.AddressAPI.promptNewAddress()" class="inline-flex items-center gap-2 rounded-xl bg-primary-main hover:bg-primary-main-dark text-white px-4 py-2 text-sm font-semibold transition shadow-sm cursor-pointer">' +
            '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>' +
            '<span>Add New Address</span>' +
          '</button>' +
        '</div>' +
        (this.addresses.length > 0 ?
          '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' + listHtml + '</div>' :
          '<p class="text-sm text-gray-500 py-6">No saved addresses found. Click "Add New Address" above to save one.</p>');
    },

    /**
     * Prompt dialog to add a new address in dashboard
     */
    promptNewAddress() {
      const name = prompt('Enter Full Name:');
      if (!name) return;
      const phone = prompt('Enter Phone Number:');
      const line = prompt('Enter Street Address / Line:');
      const city = prompt('Enter City:');
      const pincode = prompt('Enter Pincode:');

      this.saveAddress({
        name: name,
        phone: phone || '',
        line: line || '',
        city: city || '',
        state: 'DL',
        pincode: pincode || '',
        makeDefault: true
      });
    }
  };

  // Expose Globally
  window.AddressAPI = AddressAPI;
  window.WiseTrackAddress = AddressAPI;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AddressAPI.init());
  } else {
    AddressAPI.init();
  }

})(window, document);
