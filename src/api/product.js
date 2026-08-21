/**
 * ============================================================================
 * WiseTrack E-Commerce - Product Catalog & Detail API Manager
 * File: src/api/product.js
 * Catalog API: https://demo.wisetracktechnologies.com/api/catalog
 * Detail API:  https://demo.wisetracktechnologies.com/api/catalog/{id}
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    CATALOG_URL: 'https://demo.wisetracktechnologies.com/api/catalog',
    DETAIL_URL: 'https://demo.wisetracktechnologies.com/api/catalog/',
    DEFAULT_PRODUCT_ID: '16a8357b-4fa1-40ff-a70c-43094daee1d4',
    CACHE_KEY: 'wisetrack_catalog_cache',
    CACHE_TIMESTAMP_KEY: 'wisetrack_catalog_cache_time',
    CACHE_EXPIRY_MS: 30 * 60 * 1000 // 30 minutes
  };

  /**
   * Product API Controller
   */
  const ProductAPI = {
    catalogUrl: API_CONFIG.CATALOG_URL,
    detailUrl: API_CONFIG.DETAIL_URL,
    products: [],
    currentProduct: null,
    isLoaded: false,
    isLoading: false,

    /**
     * Initialize Product API
     */
    async init() {
      // 1. Read cached catalog for zero-latency initial render
      this.loadFromCache();

      // 2. Render all catalog-driven components immediately
      this.renderAll();

      // 3. If currently on a product detail page, immediately fetch full product details via API
      if (this.isProductDetailPage()) {
        const urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id') || API_CONFIG.DEFAULT_PRODUCT_ID;
        await this.fetchProductDetail(id);
      }

      // 4. Fetch live catalog from API in background
      await this.fetchCatalog();

      // 5. If on product detail page, make sure details are refreshed
      if (this.isProductDetailPage()) {
        const urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id') || API_CONFIG.DEFAULT_PRODUCT_ID;
        if (!this.currentProduct || this.currentProduct.id !== id) {
          await this.fetchProductDetail(id);
        }
      }

      // 6. Listen for events
      window.addEventListener('categories-updated', () => this.renderAll());
      window.addEventListener('popstate', () => this.init());
    },

    isProductDetailPage() {
      return window.location.pathname.includes('product-detail') || 
             window.location.pathname.includes('product-details') ||
             document.getElementById('product-gallery-container') !== null ||
             document.querySelector('main [x-data*="activeTab"]') !== null ||
             document.querySelector('[data-quantity]') !== null;
    },

    /**
     * Load cached products from localStorage
     */
    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.products = parsed;
            this.isLoaded = true;
          }
        }
      } catch (err) {
        console.warn('[ProductAPI] Cache read warning:', err);
      }
    },

    /**
     * Fetch all products from Catalog API
     */
    async fetchCatalog() {
      if (this.isLoading) return this.products;
      this.isLoading = true;

      try {
        const response = await fetch(this.catalogUrl);
        if (!response.ok) throw new Error('HTTP error ' + response.status);

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.products = data;
          this.isLoaded = true;

          try {
            const cacheSubset = data.slice(0, 300);
            localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(cacheSubset));
            localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (e) {}

          this.renderAll();

          window.dispatchEvent(new CustomEvent('catalog:loaded', { detail: data }));
          window.dispatchEvent(new CustomEvent('catalog-loaded', { detail: data }));

          if (window.Alpine && window.Alpine.store) {
            const prodStore = window.Alpine.store('products');
            if (prodStore) prodStore.items = data;
          }

          return data;
        }
      } catch (error) {
        console.error('[ProductAPI] Failed to fetch catalog from API:', error);
      } finally {
        this.isLoading = false;
      }

      return this.products;
    },

    /**
     * Fetch Single Product Details by ID from Detail API: https://demo.wisetracktechnologies.com/api/catalog/{id}
     */
    async fetchProductDetail(id) {
      if (!id) id = API_CONFIG.DEFAULT_PRODUCT_ID;

      try {
        const response = await fetch(this.detailUrl + encodeURIComponent(id));
        if (!response.ok) throw new Error('HTTP error ' + response.status);

        const product = await response.json();
        if (product && product.id) {
          this.currentProduct = product;
          this.renderProductDetailsPage(product);
          window.dispatchEvent(new CustomEvent('product:detail-loaded', { detail: product }));
          return product;
        }
      } catch (error) {
        console.warn('[ProductAPI] Detail API fallback:', error);
        const fallback = this.getProductById(id);
        if (fallback) {
          this.currentProduct = fallback;
          this.renderProductDetailsPage(fallback);
          return fallback;
        }
      }

      return null;
    },

    /**
     * Get products filtered by category, search query, price, sorting, limit, offset
     */
    getProducts(options) {
      options = options || {};
      let list = [...this.products];
      const category = options.category;
      const search = options.search;
      const minPrice = options.minPrice;
      const maxPrice = options.maxPrice;
      const sort = options.sort;
      const limit = options.limit;
      const offset = options.offset;

      if (category && category !== 'all' && category !== 'All' && category !== '*') {
        const catNorm = category.toLowerCase().trim();
        list = list.filter(p => p.category && p.category.toLowerCase().trim() === catNorm);
      }

      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        list = list.filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }

      if (typeof minPrice === 'number') {
        list = list.filter(p => (p.price || 0) >= minPrice);
      }

      if (typeof maxPrice === 'number' && maxPrice > 0) {
        list = list.filter(p => (p.price || 0) <= maxPrice);
      }

      if (sort) {
        if (sort === 'price-low' || sort === 'Price: Low to High') {
          list.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sort === 'price-high' || sort === 'Price: High to Low') {
          list.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (sort === 'name' || sort === 'Name A-Z') {
          list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      }

      const start = offset || 0;
      if (typeof limit === 'number' && limit > 0) {
        return list.slice(start, start + limit);
      }

      return list;
    },

    getProductById(id) {
      if (!id) return this.products[0] || null;
      return this.products.find(p => p.id === id || String(p.id) === String(id)) || this.products[0] || null;
    },

    getImageUrl(product, index) {
      index = index || 0;
      if (product && Array.isArray(product.imageUrls) && product.imageUrls.length > index && product.imageUrls[index]) {
        return product.imageUrls[index];
      }
      if (product && Array.isArray(product.imageUrls) && product.imageUrls.length > 0 && product.imageUrls[0]) {
        return product.imageUrls[0];
      }
      return 'src/images/home-1/best-selling-tabs/product-1.webp';
    },

    formatPrice(amount) {
      if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
      return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    /**
     * Standard Vertical Product Card Generator (For 4-column Grid Sliders)
     */
    generateProductCardHtml(product, isSlide) {
      if (isSlide === undefined) isSlide = true;
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const category = product.category || 'General';
      const price = this.formatPrice(product.price || 0);
      const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const img = this.getImageUrl(product, 0);
      const unit = product.unit ? ('<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-normal">' + product.unit + '</span>') : '';
      const taxNote = product.taxNote ? ('<span class="text-[11px] text-gray-400 font-normal">' + product.taxNote + '</span>') : '';
      const categoryClass = 'cat-' + category.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const discount = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 15;

      const slideClass = isSlide ? ('swiper-slide ' + categoryClass) : categoryClass;

      return '<article class="' + slideClass + '">' +
        '<div class="flex flex-col gap-3.5 rounded-xl border border-gray-300 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:border-primary-main group h-full justify-between">' +
          '<div>' +
            '<div class="relative overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center h-48">' +
              '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="relative block w-full h-full flex items-center justify-center p-2">' +
                '<img src="' + img + '" alt="' + name + '" loading="lazy" class="max-h-40 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
              '</a>' +
              '<div class="absolute top-2 left-0 inline-block z-10">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="67" height="22" viewBox="0 0 67 22" fill="none"><path d="M67 0L65.2314 1.86426L67 3.54199L65.2314 5.59277L67 7.27148L65.2314 9.13574L67 11L65.2314 12.8643L67 14.7285L65.2314 16.5928L67 18.458L65.2314 20.1357L67 22H0V0H67Z" fill="#CB0233"/></svg>' +
                '<span class="absolute inset-0 z-10 flex items-center justify-center text-xs font-medium text-white uppercase">' + discount + '% off</span>' +
              '</div>' +
              '<button type="button" onclick="window.ProductAPI.toggleWishlist(\'' + id + '\')" class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-md hover:bg-red-50 hover:text-red-500 transition-all duration-300 z-10 cursor-pointer">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14.5969 2.99561C12.5857 1.76192 10.8303 2.25909 9.77576 3.05101C9.34339 3.37572 9.1272 3.53807 9 3.53807C8.8728 3.53807 8.65661 3.37572 8.22424 3.05101C7.16971 2.25909 5.41431 1.76192 3.40308 2.99561C0.763551 4.6147 0.166291 9.95614 6.25465 14.4625C7.41429 15.3208 7.99411 15.75 9 15.75C10.0059 15.75 10.5857 15.3208 11.7454 14.4625C17.8337 9.95614 17.2364 4.6147 14.5969 2.99561Z" stroke="currentColor" stroke-linecap="round"/></svg>' +
              '</button>' +
            '</div>' +
            '<div class="flex items-center justify-between gap-2 pt-2">' +
              '<span class="text-xs font-semibold text-primary-main truncate">' + category + '</span>' +
              unit +
            '</div>' +
            '<h3 class="text-gray-primary hover:text-primary-main line-clamp-2 text-base leading-6 font-medium mt-1 min-h-[3rem]">' +
              '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '">' + name + '</a>' +
            '</h3>' +
            '<div class="flex items-center gap-1 mt-1">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7223 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7783 4.38341 15.6093C4.15228 15.4403 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.4541 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#FFC107"/></svg>' +
              '<span class="text-xs text-gray-500 font-medium">4.8</span>' +
              '<span class="text-xs text-gray-400">(189)</span>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="flex items-baseline justify-between gap-2 mb-3">' +
              '<div class="flex items-baseline gap-2">' +
                '<span class="text-gray-primary text-base font-semibold">' + price + '</span>' +
                (mrp ? ('<span class="text-gray-tertiary text-sm line-through">' + mrp + '</span>') : '') +
              '</div>' +
              taxNote +
            '</div>' +
            '<button type="button" onclick="window.ProductAPI.addToCart(\'' + id + '\')" class="bg-primary-main hover:bg-primary-main-dark text-white flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer shadow-sm active:scale-95">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<span>Add to Cart</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    },

    /**
     * Exact 1:1 Horizontal Mini-Card Generator Matching image.png and index.html Template
     */
    generateHorizontalItemHtml(product) {
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const price = this.formatPrice(product.price || 0);
      const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const img = this.getImageUrl(product, 0);

      return '<li class="flex flex-col gap-4 rounded-xl border border-gray-300 bg-white p-4 sm:flex-row items-center transition-all duration-300 hover:shadow-md hover:border-primary-main">' +
        '<a class="flex w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2 sm:size-32" href="product-details-6.html?id=' + encodeURIComponent(id) + '">' +
          '<img alt="' + name + '" class="h-full w-full rounded-xl transition-transform duration-300 hover:scale-110 object-contain" src="' + img + '" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
        '</a>' +
        '<div class="flex flex-1 flex-col justify-between w-full h-full min-w-0">' +
          '<div class="space-y-3">' +
            '<h4>' +
              '<a class="text-gray-primary hover:text-primary-main line-clamp-2 text-base leading-6 font-medium" href="product-details-6.html?id=' + encodeURIComponent(id) + '">' +
                name +
              '</a>' +
            '</h4>' +
            '<div class="flex items-center gap-1">' +
              '<div class="flex items-center">' +
                '<svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7222 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7783 4.38341 15.6093C4.15228 15.4402 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.45398 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#FFC107"></path></svg>' +
                '<svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7222 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7783 4.38341 15.6093C4.15228 15.4402 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.45398 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#FFC107"></path></svg>' +
                '<svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7222 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7783 4.38341 15.6093C4.15228 15.4402 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.45398 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#FFC107"></path></svg>' +
                '<svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7222 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7783 4.38341 15.6093C4.15228 15.4402 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.45398 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#FFC107"></path></svg>' +
                '<svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg"><g opacity="0.48"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7222 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7781 4.38341 15.6093C4.15228 15.4402 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.45398 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#919EAB"></path></g></svg>' +
              '</div>' +
              '<span class="text-gray-secondary text-sm"> (118)</span>' +
            '</div>' +
          '</div>' +
          '<div class="mt-3 flex items-end justify-between">' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-gray-primary text-base font-medium">' + price + '</span>' +
              (mrp ? ('<span class="text-gray-tertiary text-base line-through">' + mrp + '</span>') : '') +
            '</div>' +
            '<button type="button" onclick="window.ProductAPI.addToCart(\'' + id + '\')" class="group bg-primary-main hover:bg-primary-main-dark text-success-light inline-flex h-10 items-center justify-center gap-2 rounded-lg px-6.5 py-2.5 text-sm font-medium transition-all hover:text-white cursor-pointer shadow-sm active:scale-95">' +
              '<svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M6.6665 13.3333L13.9333 12.7278C16.207 12.5383 16.7174 12.0417 16.9694 9.77406L17.4998 5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>' +
                '<path d="M5 5L18.3333 5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>' +
                '<circle cx="4.99967" cy="16.6667" r="1.66667" stroke="currentColor" stroke-width="1.5"></circle>' +
                '<circle cx="14.1667" cy="16.6667" r="1.66667" stroke="currentColor" stroke-width="1.5"></circle>' +
                '<path d="M6.66667 16.6667L12.5 16.6667" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>' +
                '<path d="M1.6665 1.66675L2.47151 1.66675C3.25874 1.66675 3.94495 2.18724 4.13589 2.92919L6.61527 12.5638C6.74057 13.0507 6.63334 13.5665 6.32337 13.968L5.52661 15.0001" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>' +
              '</svg>' +
              'Add' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</li>';
    },

    /**
     * Render all product areas across all index pages & views
     */
    renderAll() {
      if (!this.products || this.products.length === 0) return;

      this.renderHomeBestSelling();
      this.renderHomeNewArrivals();
      this.renderHomeColumnSliders(); // Top Rated, Top Items (4 horizontal rows stacked per slide)
      this.renderHomeThemedSliders(); // Coffee, Beauty, etc.
      this.renderListingPages();
      this.renderRelatedSliders();
      this.renderHeaderLiveSearch();
    },

    /**
     * 1. Render Best Selling Grids & Tabs (4 columns wide)
     */
    renderHomeBestSelling() {
      const containers = document.querySelectorAll('#best-selling-isotope-grid, .best-selling-tab-slider .swiper-wrapper, .best-selling-product-slider .swiper-wrapper');
      containers.forEach(container => {
        const products = this.getProducts({ limit: 16 });
        if (products.length === 0) return;

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        } else if (slider && typeof window.initSingleSwiper === 'function') {
          window.initSingleSwiper(slider);
        }
      });
    },

    /**
     * 2. Render New Item / The Vitality Selection Sliders
     */
    renderHomeNewArrivals() {
      const containers = document.querySelectorAll('.new-item-product-slider .swiper-wrapper, .deal-9-slider .swiper-wrapper');
      containers.forEach(container => {
        const products = this.getProducts({ limit: 12, offset: 6 });
        if (products.length === 0) return;

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        } else if (slider && typeof window.initSingleSwiper === 'function') {
          window.initSingleSwiper(slider);
        }
      });
    },

    /**
     * 3. Render Top Rated & Top Items Sliders (4 horizontal rows stacked per slide, exactly matching image.png)
     */
    renderHomeColumnSliders() {
      const columnConfigs = [
        { selector: '.top-rated-slider .swiper-wrapper', offset: 10, count: 8 },
        { selector: '.top-items-slider .swiper-wrapper', offset: 18, count: 8 },
        { selector: '.trending-product-slider .swiper-wrapper', offset: 26, count: 8 },
        { selector: '.popular-items-slider .swiper-wrapper', offset: 34, count: 8 },
        { selector: '.top-picks-slider .swiper-wrapper', offset: 42, count: 8 },
        { selector: '.hot-picks-slider .swiper-wrapper', offset: 50, count: 8 }
      ];

      columnConfigs.forEach(cfg => {
        const containers = document.querySelectorAll(cfg.selector);
        containers.forEach(container => {
          const prods = this.getProducts({ offset: cfg.offset, limit: cfg.count });
          if (prods.length === 0) return;

          // Group products into chunks of 4 per slide exactly as shown in image.png
          let slidesHtml = '';
          const chunkSize = 4;
          for (let i = 0; i < prods.length; i += chunkSize) {
            const chunk = prods.slice(i, i + chunkSize);
            let itemsHtml = '';
            chunk.forEach(p => {
              itemsHtml += this.generateHorizontalItemHtml(p);
            });
            slidesHtml += '<div class="swiper-slide w-full"><ul class="space-y-6 pb-1">' + itemsHtml + '</ul></div>';
          }

          container.innerHTML = slidesHtml;

          const slider = container.closest('.swiper');
          if (slider && slider.swiper) {
            slider.swiper.update();
          } else if (slider && typeof window.initSingleSwiper === 'function') {
            window.initSingleSwiper(slider);
          }
        });
      });
    },

    /**
     * 4. Render Themed Full-Width Sliders (Coffee, Beauty, etc.)
     */
    renderHomeThemedSliders() {
      const themedConfigs = [
        { selector: '.best-selling-coffee-slider .swiper-wrapper', offset: 4, limit: 8 },
        { selector: '.fresh-brews-slider .swiper-wrapper', offset: 8, limit: 8 },
        { selector: '.beauty-22-slider .swiper-wrapper', offset: 12, limit: 8 },
        { selector: '.best-selling-22-slider .swiper-wrapper', offset: 16, limit: 8 }
      ];

      themedConfigs.forEach(cfg => {
        const containers = document.querySelectorAll(cfg.selector);
        containers.forEach(container => {
          const prods = this.getProducts({ offset: cfg.offset, limit: cfg.limit });
          if (prods.length === 0) return;

          let html = '';
          prods.forEach(p => {
            html += this.generateProductCardHtml(p, true);
          });
          container.innerHTML = html;

          const slider = container.closest('.swiper');
          if (slider && slider.swiper) {
            slider.swiper.update();
          } else if (slider && typeof window.initSingleSwiper === 'function') {
            window.initSingleSwiper(slider);
          }
        });
      });
    },

    /**
     * 5. Render Shop / Listing Page Grids & Lists
     */
    renderListingPages() {
      const urlParams = new URLSearchParams(window.location.search);
      const activeCategory = urlParams.get('category') || '';
      const searchQuery = urlParams.get('search') || '';

      const products = this.getProducts({
        category: activeCategory,
        search: searchQuery,
        limit: 36
      });

      // Grid View Containers
      const gridContainers = document.querySelectorAll('#product-grid-container, .product-listing-grid, div[x-show*="grid"] .grid');
      gridContainers.forEach(container => {
        if (products.length === 0) {
          container.innerHTML = '<div class="col-span-full py-16 text-center">' +
            '<div class="inline-flex size-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">' +
              '<svg class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
            '</div>' +
            '<h3 class="text-lg font-bold text-gray-800">No products found</h3>' +
            '<p class="text-sm text-gray-500 mt-1">Try selecting another category or clearing search filters.</p>' +
          '</div>';
          return;
        }

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, false);
        });
        container.innerHTML = html;
      });

      // List View Containers
      const listContainers = document.querySelectorAll('#product-list-container, div[x-show*="list"] .space-y-6');
      listContainers.forEach(container => {
        if (products.length === 0) return;
        let html = '';
        products.forEach(p => {
          const id = p.id;
          const name = p.name || 'Product';
          const category = p.category || 'General';
          const desc = p.description ? p.description.slice(0, 140) + '...' : 'Pure, premium quality product from WiseTrack catalog.';
          const price = this.formatPrice(p.price || 0);
          const mrp = p.mrp && p.mrp > p.price ? this.formatPrice(p.mrp) : '';
          const img = this.getImageUrl(p, 0);
          const unit = p.unit ? ('<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">' + p.unit + '</span>') : '';
          const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 15;

          html += '<article class="flex flex-col sm:flex-row gap-5 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:border-primary-main group items-center justify-between">' +
            '<div class="flex flex-col sm:flex-row gap-4 items-center flex-1 min-w-0 w-full">' +
              '<div class="relative overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center size-36 shrink-0 p-2">' +
                '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '" class="block size-full flex items-center justify-center">' +
                  '<img src="' + img + '" alt="' + name + '" loading="lazy" class="max-h-28 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
                '</a>' +
                '<span class="absolute top-1.5 left-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">' + discount + '% OFF</span>' +
              '</div>' +
              '<div class="flex flex-col justify-between flex-1 min-w-0 space-y-1.5">' +
                '<div class="flex items-center gap-2">' +
                  '<span class="text-xs font-semibold text-primary-main">' + category + '</span>' +
                  unit +
                '</div>' +
                '<h3 class="text-base sm:text-lg font-semibold text-gray-900 hover:text-primary-main line-clamp-2 leading-snug">' +
                  '<a href="product-details-6.html?id=' + encodeURIComponent(id) + '">' + name + '</a>' +
                '</h3>' +
                '<p class="text-xs text-gray-500 line-clamp-2">' + desc + '</p>' +
                '<div class="flex items-center gap-1 text-amber-400 text-xs">' +
                  '<span>★★★★★</span>' +
                  '<span class="text-gray-400 text-xs">(4.8 / 5)</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 sm:pl-4 sm:border-l border-gray-100 shrink-0">' +
              '<div class="flex flex-col sm:items-end">' +
                '<span class="text-xl font-bold text-gray-900">' + price + '</span>' +
                (mrp ? ('<span class="text-xs text-gray-400 line-through">' + mrp + '</span>') : '') +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                '<button type="button" onclick="window.ProductAPI.toggleWishlist(\'' + id + '\')" class="flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-500 transition-colors">' +
                  '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' +
                '</button>' +
                '<button type="button" onclick="window.ProductAPI.addToCart(\'' + id + '\')" class="bg-primary-main hover:bg-primary-main-dark text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95">' +
                  '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                  '<span>Add to Cart</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</article>';
        });
        container.innerHTML = html;
      });
    },

    /**
     * 6. Render Related Products Sliders
     */
    renderRelatedSliders() {
      const containers = document.querySelectorAll('.related-product-slider .swiper-wrapper');
      containers.forEach(container => {
        let prods = [];
        if (this.currentProduct && this.currentProduct.category) {
          prods = this.getProducts({ category: this.currentProduct.category, limit: 8 });
        }
        if (prods.length < 4) {
          prods = this.getProducts({ limit: 8, offset: 5 });
        }

        let html = '';
        prods.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        } else if (slider && typeof window.initSingleSwiper === 'function') {
          window.initSingleSwiper(slider);
        }
      });
    },

    /**
     * 7. Render Full Product Detail Page from API Data (100% Dynamic Content)
     */
    renderProductDetailsPage(product) {
      if (!product) return;

      // 1. Update Document Title
      document.title = product.name + ' - WiseTrack E-Commerce';

      // 2. Update Breadcrumbs (Home > Category > Product Name)
      const breadcrumbNav = document.querySelector('nav .custom-container ul');
      if (breadcrumbNav) {
        const lis = breadcrumbNav.querySelectorAll('li');
        if (lis.length >= 5) {
          const catLink = lis[2].querySelector('a');
          if (catLink) {
            catLink.textContent = product.category || 'All Products';
            catLink.href = 'top-banner-with-1-col.html?category=' + encodeURIComponent(product.category || '');
          }
          lis[4].textContent = product.name;
        }
      }

      // 3. Render Images Gallery (Left Column)
      const galleryContainer = document.getElementById('product-gallery-container') || document.querySelector('main section .w-full.xl\:w-1\/2 .space-y-6');
      if (galleryContainer && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
        let imgsHtml = '';
        product.imageUrls.forEach((imgUrl, i) => {
          imgsHtml += '<div class="bg-gray-50 rounded-2xl flex items-center justify-center p-4 border border-gray-100 shadow-sm overflow-hidden min-h-[360px]">' +
            '<img alt="' + (product.name + ' image ' + (i + 1)) + '" class="w-full max-h-[520px] object-contain rounded-xl transition-transform duration-300 hover:scale-105" src="' + imgUrl + '" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
          '</div>';
        });
        galleryContainer.innerHTML = imgsHtml;
      }

      // 4. Product Titles
      document.querySelectorAll('h3.text-2xl, h1, h2.product-title').forEach(el => {
        if (el.closest('main') || el.classList.contains('product-title') || el.textContent.includes('Summer Petal') || el.textContent.includes('SmartLife') || el.textContent.includes('Bohemian')) {
          el.textContent = product.name;
        }
      });

      // 5. Price, MRP, & Discount Badge
      const priceText = this.formatPrice(product.price || 0);
      const mrpText = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const discount = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 15;

      document.querySelectorAll('h4.text-2xl').forEach(el => {
        if (el.closest('.divide-dashed') || el.textContent.includes('$') || el.textContent.includes('₹')) {
          el.textContent = priceText;
        }
      });

      document.querySelectorAll('span.text-gray-tertiary.text-2xl').forEach(el => {
        if (mrpText) {
          el.textContent = mrpText;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });

      document.querySelectorAll('span.uppercase').forEach(el => {
        if (el.textContent.includes('Off') || el.textContent.includes('off') || el.textContent.includes('Sales')) {
          el.textContent = discount + '% Off';
        }
      });

      // 6. Middle Section - Description Summary & Bullet Features
      const isAvailable = product.availability === 'in_stock' || product.availability === 'available' || !product.availability;
      
      const middleSection = document.querySelector('main section .divide-dashed > div:nth-child(2)');
      if (middleSection) {
        middleSection.innerHTML = 
          '<p class="text-gray-secondary mb-4 text-base leading-relaxed sm:mb-6">' + (product.description || 'Pure, authentic, and verified quality item from WiseTrack catalog.') + '</p>' +
          '<ul class="space-y-3.5 pt-2">' +
            '<li class="flex items-center gap-3.5"><span class="bg-primary-main/10 text-primary-main p-1 rounded-full"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><p class="text-gray-700 text-sm font-medium">Category: <span class="text-primary-main font-semibold">' + (product.category || 'General') + '</span></p></li>' +
            '<li class="flex items-center gap-3.5"><span class="bg-primary-main/10 text-primary-main p-1 rounded-full"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><p class="text-gray-700 text-sm font-medium">Packaging Unit: <span class="text-gray-900 font-semibold">' + (product.unit || 'Standard Unit') + '</span></p></li>' +
            '<li class="flex items-center gap-3.5"><span class="bg-primary-main/10 text-primary-main p-1 rounded-full"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><p class="text-gray-700 text-sm font-medium">Tax Notice: <span class="text-gray-900 font-semibold">' + (product.taxNote || 'Inclusive of all taxes') + '</span></p></li>' +
            '<li class="flex items-center gap-3.5"><span class="' + (isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + ' p-1 rounded-full"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><p class="text-gray-700 text-sm font-medium">Availability: <span class="' + (isAvailable ? 'text-green-600 font-bold' : 'text-red-600 font-bold') + '">' + (isAvailable ? 'In Stock (Ready to Dispatch)' : 'Out Of Stock') + '</span></p></li>' +
          '</ul>';
      }

      // 7. Middle Section - Pack Unit / Quantity Selector
      const stockSection = document.querySelector('main section .divide-dashed > div:nth-child(3)');
      if (stockSection) {
        stockSection.innerHTML = 
          '<div>' +
            '<div class="mb-3 flex items-center justify-between">' +
              '<p class="text-gray-primary font-medium">Pack Unit: <span class="text-primary-main font-semibold ml-2">' + (product.unit || '1 Pack') + '</span></p>' +
              '<span class="text-xs px-2.5 py-1 rounded-full font-semibold ' + (isAvailable ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200') + '">' + (isAvailable ? '● In Stock' : '● Out of Stock') + '</span>' +
            '</div>' +
            '<div class="flex flex-wrap gap-3">' +
              '<span class="border-2 border-primary-main bg-primary-main/10 text-primary-main font-bold flex h-10 min-w-24 items-center justify-center rounded-lg px-4 text-sm">' + (product.unit || 'Standard') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pt-4">' +
            '<p class="text-gray-primary mb-3 font-medium">Quantity</p>' +
            '<div class="flex flex-wrap gap-4 items-center">' +
              '<div class="border border-gray-300 flex h-12 items-center justify-between gap-4 rounded-lg px-4 py-2 sm:w-44 bg-white">' +
                '<button type="button" class="size-6 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer font-bold text-lg" onclick="const q=document.getElementById(\'detail-qty\'); if(parseInt(q.textContent)>1) q.textContent=parseInt(q.textContent)-1;">-</button>' +
                '<span id="detail-qty" class="text-gray-primary text-base font-bold">1</span>' +
                '<button type="button" class="size-6 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer font-bold text-lg" onclick="const q=document.getElementById(\'detail-qty\'); q.textContent=parseInt(q.textContent)+1;">+</button>' +
              '</div>' +
              '<button type="button" onclick="const q=parseInt(document.getElementById(\'detail-qty\').textContent)||1; window.ProductAPI.addToCart(\'' + product.id + '\', q);" class="bg-primary-main hover:bg-primary-main-dark text-white flex-1 h-12 flex items-center justify-center gap-2 rounded-lg font-semibold text-base transition-all duration-300 shadow-md active:scale-95 cursor-pointer">' +
                '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
                '<span>Add to Cart</span>' +
              '</button>' +
              '<button type="button" onclick="window.ProductAPI.toggleWishlist(\'' + product.id + '\')" class="size-12 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:text-red-500 hover:border-red-500 transition-colors cursor-pointer bg-white">' +
                '<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>';
      }

      // 8. Product Metadata List (Category, SKU, Tags)
      document.querySelectorAll('ul.space-y-4 li, ul.space-y-6 li').forEach(li => {
        const titleSpan = li.querySelector('span.text-gray-primary');
        const valSpan = li.querySelector('span.text-gray-secondary');
        if (titleSpan && valSpan) {
          const t = titleSpan.textContent.toLowerCase();
          if (t.includes('cagtegory') || t.includes('category') || t.includes('categories')) {
            valSpan.textContent = product.category || 'General';
          } else if (t.includes('sku')) {
            valSpan.textContent = product.id.slice(0, 8).toUpperCase();
          } else if (t.includes('tag')) {
            valSpan.textContent = (product.category || '') + (product.unit ? (', ' + product.unit) : '') + (product.taxNote ? (', ' + product.taxNote) : '');
          }
        }
      });

      // 9. Specifications Tab List Table
      const specsList = document.querySelector('div[x-show*="specification"] ul.divide-y');
      if (specsList) {
        specsList.innerHTML = 
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Product Name</span><span class="text-gray-secondary text-base leading-6 font-normal">' + product.name + '</span></li>' +
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Category</span><span class="text-gray-secondary text-base leading-6 font-normal">' + (product.category || 'General') + '</span></li>' +
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Unit</span><span class="text-gray-secondary text-base leading-6 font-normal">' + (product.unit || 'pcs') + '</span></li>' +
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Price</span><span class="text-gray-secondary text-base leading-6 font-normal">' + priceText + (product.taxNote ? (' (' + product.taxNote + ')') : '') + '</span></li>' +
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Stock Status</span><span class="text-gray-secondary text-base leading-6 font-normal ' + (isAvailable ? 'text-green-600 font-semibold' : 'text-red-500') + '">' + (isAvailable ? 'In Stock' : 'Out of Stock') + '</span></li>' +
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Digital Item</span><span class="text-gray-secondary text-base leading-6 font-normal">' + (product.isDigital ? 'Yes (Digital Download)' : 'No (Physical Item)') + '</span></li>' +
          '<li class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"><span class="shrink-0 text-base font-medium text-gray-800 sm:w-45">Product ID</span><span class="text-gray-secondary text-base leading-6 font-mono text-xs">' + product.id + '</span></li>';
      }

      // 10. Description Tab Text & Large Image
      const descTabContent = document.querySelector('div[x-show*="description"]');
      if (descTabContent) {
        const descP = descTabContent.querySelector('p');
        if (descP && product.description) {
          descP.textContent = product.description;
        }
        const descLargeImg = descTabContent.querySelector('img');
        if (descLargeImg && product.imageUrls && product.imageUrls.length > 0) {
          descLargeImg.src = product.imageUrls[0];
          descLargeImg.className = 'w-full max-h-[400px] object-contain rounded-2xl bg-gray-50 p-4 shadow-sm';
        }
      }

      // 11. Re-render Related Products Slider for this product's category
      this.renderRelatedSliders();
    },

    /**
     * 8. Live Autocomplete Search in Header
     */
    renderHeaderLiveSearch() {
      const searchInputs = document.querySelectorAll('input[placeholder*="Search for the items"]');
      searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
          const val = e.target.value.toLowerCase().trim();
          const dropdown = input.closest('[x-data]') ? input.closest('[x-data]').querySelector('.search-dropdown-scrollbar, [x-show="showDropdown"]') : null;
          if (!dropdown) return;

          let resultsContainer = dropdown.querySelector('.search-live-results');
          if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.className = 'search-live-results border-t border-gray-100 pt-3 mt-3';
            dropdown.appendChild(resultsContainer);
          }

          if (val.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
          }

          resultsContainer.style.display = 'block';
          const matches = this.getProducts({ search: val, limit: 5 });

          if (matches.length === 0) {
            resultsContainer.innerHTML = '<p class="text-xs text-gray-500 py-2">No matching products found.</p>';
            return;
          }

          let html = '<span class="text-gray-primary text-xs font-semibold uppercase tracking-wider block mb-2">Matching Products</span><div class="space-y-2">';
          matches.forEach(p => {
            const pImg = this.getImageUrl(p, 0);
            const pPrice = this.formatPrice(p.price || 0);
            html += '<a href="product-details-6.html?id=' + encodeURIComponent(p.id) + '" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">' +
              '<img src="' + pImg + '" class="size-10 object-contain rounded bg-white border border-gray-100" />' +
              '<div class="flex-1 min-w-0">' +
                '<h4 class="text-sm font-medium text-gray-800 truncate">' + p.name + '</h4>' +
                '<span class="text-xs text-gray-400">' + p.category + '</span>' +
              '</div>' +
              '<span class="text-sm font-bold text-primary-main">' + pPrice + '</span>' +
            '</a>';
          });
          html += '</div>';
          resultsContainer.innerHTML = html;
        });
      });
    },

    /**
     * Cart & Wishlist Actions
     */
    addToCart(productId, qty) {
      qty = qty || 1;
      const product = this.currentProduct && this.currentProduct.id === productId ? this.currentProduct : this.getProductById(productId);
      if (!product) return;

      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem('wisetrack_cart') || '[]');
      } catch (e) {}

      const existingIndex = cart.findIndex(item => item.id === productId);
      if (existingIndex > -1) {
        cart[existingIndex].qty = (cart[existingIndex].qty || 1) + qty;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: this.getImageUrl(product, 0),
          unit: product.unit,
          qty: qty
        });
      }

      localStorage.setItem('wisetrack_cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
      this.showToast('Added "' + product.name + '" to cart!');
    },

    toggleWishlist(productId) {
      const product = this.currentProduct && this.currentProduct.id === productId ? this.currentProduct : this.getProductById(productId);
      if (!product) return;

      let wishlist = [];
      try {
        wishlist = JSON.parse(localStorage.getItem('wisetrack_wishlist') || '[]');
      } catch (e) {}

      const idx = wishlist.indexOf(productId);
      if (idx > -1) {
        wishlist.splice(idx, 1);
        this.showToast('Removed from wishlist.');
      } else {
        wishlist.push(productId);
        this.showToast('Added "' + product.name + '" to wishlist!');
      }

      localStorage.setItem('wisetrack_wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: wishlist }));
    },

    openQuickView(productId) {
      const product = this.getProductById(productId);
      if (!product) return;
      window.dispatchEvent(new CustomEvent('open-quick-view', { detail: product }));
    },

    showToast(message) {
      let toast = document.getElementById('wisetrack-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'wisetrack-toast';
        toast.className = 'fixed bottom-5 right-5 z-[99999] bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-2';
        document.body.appendChild(toast);
      }

      toast.innerHTML = '<svg class="size-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' +
        '<span>' + message + '</span>';
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 3000);
    }
  };

  // Expose Globally
  window.ProductAPI = ProductAPI;
  window.WiseTrackCatalog = ProductAPI;

  // Alpine Store Registration
  document.addEventListener('alpine:init', () => {
    if (window.Alpine && window.Alpine.store) {
      window.Alpine.store('products', {
        items: ProductAPI.products,
        current: null
      });
      window.Alpine.store('cart', {
        items: JSON.parse(localStorage.getItem('wisetrack_cart') || '[]'),
        get count() {
          return this.items.reduce((acc, item) => acc + (item.qty || 1), 0);
        }
      });
    }
  });

  // Auto-initialize on DOM ready or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProductAPI.init());
  } else {
    ProductAPI.init();
  }

})(window, document);
