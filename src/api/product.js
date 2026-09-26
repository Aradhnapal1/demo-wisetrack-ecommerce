/**
 * ============================================================================
 * WiseTrack E-Commerce - Product Catalog, Detail & Dynamic Filter Engine API
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
   * Helper: Slugify string
   */
  function slugify(s) {
    return (s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all';
  }

  /**
   * Helper: Map color name to clean hex color (matching frontend-next)
   */
  function cssColor(name) {
    const n = (name || '').toLowerCase().trim();
    const map = {
      black: '#212529',
      white: '#ffffff',
      red: '#e11d48',
      blue: '#2563eb',
      green: '#16a34a',
      yellow: '#eab308',
      orange: '#f97316',
      purple: '#9333ea',
      pink: '#ec4899',
      grey: '#9ca3af',
      gray: '#9ca3af',
      brown: '#92400e',
      beige: '#e7d3b3',
      navy: '#1e3a5f',
      teal: '#0d9488',
      gold: '#d4af37',
      silver: '#c0c0c0',
      maroon: '#7f1d1d',
      cream: '#f5f0e1'
    };
    return map[n] || (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(n) ? n : '#9ca3af');
  }

  /**
   * Helper: Extract colors from product attributes and title/description
   */
  function getProductColors(product) {
    const colors = new Set();
    // 1. From attributes
    if (Array.isArray(product.attributes)) {
      product.attributes.forEach(attr => {
        const k = (attr.key || '').trim().toLowerCase();
        if (k === 'color' || k === 'colour') {
          const v = (attr.value || '').trim();
          if (v) colors.add(v.toLowerCase());
        }
      });
    }
    // 2. From title and description
    const text = ((product.name || '') + ' ' + (product.description || '')).toLowerCase();
    const palette = ['red', 'green', 'black', 'white', 'yellow', 'blue', 'brown', 'gold', 'orange', 'pink', 'purple', 'silver'];
    palette.forEach(c => {
      const reg = new RegExp('\\b' + c + '\\b', 'i');
      if (reg.test(text)) {
        colors.add(c);
      }
    });
    return Array.from(colors);
  }

  /**
   * Helper: Extract sizes from product attributes and title
   */
  function getProductSizes(product) {
    const sizes = new Set();
    // 1. From attributes
    if (Array.isArray(product.attributes)) {
      product.attributes.forEach(attr => {
        const k = (attr.key || '').trim().toLowerCase();
        if (k === 'size' || k === 'weight' || k === 'pack_size' || k === 'volume') {
          const v = (attr.value || '').trim();
          if (v) sizes.add(v);
        }
      });
    }
    // 2. From unit or title pattern
    if (sizes.size === 0 && product.unit && product.unit !== 'pcs') {
      sizes.add(product.unit);
    }
    if (sizes.size === 0 && product.name) {
      const m = product.name.match(/\b(\d+(?:\.\d+)?\s*(?:kg|gm|g|ltr|l|ml|pack|pcs|pc))\b/i);
      if (m) sizes.add(m[1].toLowerCase());
    }
    return Array.from(sizes);
  }

  /**
   * Product API & Filter Engine Controller
   */
  const ProductAPI = {
    catalogUrl: API_CONFIG.CATALOG_URL,
    detailUrl: API_CONFIG.DETAIL_URL,
    products: [],
    currentProduct: null,
    currentGalleryIndex: 0,
    isLoaded: false,
    isLoading: false,

    // Dynamic Filter State
    filters: {
      categories: [],
      brands: [],
      colors: [],
      sizes: [],
      priceMin: null,
      priceMax: null,
      minRating: null,
      featuredOnly: false,
      onOffer: false,
      inStockOnly: false,
      discountRange: null, // [min, max]
      search: '',
      sort: 'featured', // 'featured' | 'price_asc' | 'price_desc' | 'discount' | 'name' | 'name_desc' | 'rating'
      page: 1,
      pageSize: 24
    },

    // Derived Facets
    facets: {
      categories: [],
      brands: [],
      colors: [],
      sizes: [],
      price: { min: 0, max: 5000 },
      hasRatings: true,
      counts: {
        featured: 0,
        onOffer: 0,
        inStock: 0
      }
    },

    /**
     * Initialize Product API
     */
    async init() {
      // 1. Read URL query parameters for initial filter state
      this.initFiltersFromUrl();

      // 2. Read cached catalog for zero-latency initial render
      this.loadFromCache();

      // 3. If cached products exist, derive facets & render
      if (this.products.length > 0) {
        this.deriveFacets();
        this.renderAll();
      }

      // 4. If currently on a product detail page, fetch detail
      if (this.isProductDetailPage()) {
        const urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id') || API_CONFIG.DEFAULT_PRODUCT_ID;
        await this.fetchProductDetail(id);
      }

      // 5. Fetch live catalog from API
      await this.fetchCatalog();

      // 6. Listen for events & popstate
      window.addEventListener('categories-updated', () => this.renderAll());
      window.addEventListener('popstate', () => {
        this.initFiltersFromUrl();
        this.renderListingPages();
        this.renderFilterSidebar();
      });
    },

    isProductDetailPage() {
      return window.location.pathname.includes('product-detail') || 
             window.location.pathname.includes('product-details') ||
             document.getElementById('product-gallery-container') !== null ||
             document.querySelector('main [x-data*="activeTab"]') !== null ||
             document.querySelector('[data-quantity]') !== null;
    },

    isShopPage() {
      return window.location.pathname.includes('top-banner') ||
             window.location.pathname.includes('shop') ||
             document.getElementById('product-list-container') !== null ||
             document.getElementById('desktop-filter-sidebar') !== null ||
             document.querySelector('.product-listing-grid') !== null;
    },

    /**
     * Initialize filters from URL parameters
     */
    initFiltersFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);

      // Category
      const cat = urlParams.get('category');
      if (cat) {
        this.filters.categories = cat.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        this.filters.categories = [];
      }

      // Brand
      const brand = urlParams.get('brand');
      if (brand) {
        this.filters.brands = brand.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        this.filters.brands = [];
      }

      // Color
      const color = urlParams.get('color');
      if (color) {
        this.filters.colors = color.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      } else {
        this.filters.colors = [];
      }

      // Size
      const size = urlParams.get('size');
      if (size) {
        this.filters.sizes = size.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        this.filters.sizes = [];
      }

      // Price
      const minPrice = urlParams.get('minPrice');
      const maxPrice = urlParams.get('maxPrice');
      this.filters.priceMin = minPrice ? parseFloat(minPrice) : null;
      this.filters.priceMax = maxPrice ? parseFloat(maxPrice) : null;

      // Rating
      const rating = urlParams.get('rating');
      this.filters.minRating = rating ? parseInt(rating, 10) : null;

      // Flags
      this.filters.featuredOnly = urlParams.get('featured') === 'true';
      this.filters.onOffer = urlParams.get('onOffer') === 'true';
      this.filters.inStockOnly = urlParams.get('inStock') === 'true';

      // Search & Sort & Page
      this.filters.search = urlParams.get('search') || '';
      this.filters.sort = urlParams.get('sort') || 'featured';
      this.filters.page = parseInt(urlParams.get('page') || '1', 10);
    },

    /**
     * Sync active filters into browser URL without reloading
     */
    updateUrlParams() {
      const params = new URLSearchParams();
      if (this.filters.categories.length > 0) params.set('category', this.filters.categories.join(','));
      if (this.filters.brands.length > 0) params.set('brand', this.filters.brands.join(','));
      if (this.filters.colors.length > 0) params.set('color', this.filters.colors.join(','));
      if (this.filters.sizes.length > 0) params.set('size', this.filters.sizes.join(','));
      if (this.filters.priceMin != null) params.set('minPrice', this.filters.priceMin.toString());
      if (this.filters.priceMax != null) params.set('maxPrice', this.filters.priceMax.toString());
      if (this.filters.minRating != null) params.set('rating', this.filters.minRating.toString());
      if (this.filters.featuredOnly) params.set('featured', 'true');
      if (this.filters.onOffer) params.set('onOffer', 'true');
      if (this.filters.inStockOnly) params.set('inStock', 'true');
      if (this.filters.search) params.set('search', this.filters.search);
      if (this.filters.sort && this.filters.sort !== 'featured') params.set('sort', this.filters.sort);
      if (this.filters.page > 1) params.set('page', this.filters.page.toString());

      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
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
            // Cache catalog subset for faster boot
            const cacheSubset = data.slice(0, 500);
            localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(cacheSubset));
            localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (e) {}

          // Derive dynamic facets
          this.deriveFacets();

          // Render all views
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
     * Derive all Facets (Category, Brand, Color, Size, Price, Offers) from Catalog
     * (Matches frontend-next/lib/listing.ts deriveFacets logic)
     */
    deriveFacets() {
      const catMap = new Map();
      const brandMap = new Map();
      const colorMap = new Map();
      const sizeMap = new Map();
      let minP = Infinity;
      let maxP = -Infinity;
      let featuredCount = 0;
      let offerCount = 0;
      let stockCount = 0;

      this.products.forEach(p => {
        // 1. Categories
        if (Array.isArray(p.categoryPath) && p.categoryPath.length > 0) {
          p.categoryPath.forEach(c => {
            const slug = c.slug || slugify(c.name);
            const name = c.name || slug;
            const cur = catMap.get(slug);
            if (cur) cur.count++;
            else catMap.set(slug, { slug, name, count: 1 });
          });
        } else if (p.category) {
          const name = p.category.trim();
          const slug = p.categorySlug || slugify(name);
          const cur = catMap.get(slug);
          if (cur) cur.count++;
          else catMap.set(slug, { slug, name, count: 1 });
        }

        // 2. Brands
        const bName = (p.brandName || '').trim();
        const bSlug = p.brandSlug || (bName ? slugify(bName) : null);
        if (bName && bSlug) {
          const cur = brandMap.get(bSlug);
          if (cur) cur.count++;
          else brandMap.set(bSlug, { slug: bSlug, name: bName, count: 1 });
        }

        // 3. Colors
        const pColors = getProductColors(p);
        pColors.forEach(c => {
          const cur = colorMap.get(c);
          if (cur) cur.count++;
          else colorMap.set(c, { name: c.charAt(0).toUpperCase() + c.slice(1), hex: cssColor(c), count: 1 });
        });

        // 4. Sizes
        const pSizes = getProductSizes(p);
        pSizes.forEach(s => {
          const norm = s.trim();
          const cur = sizeMap.get(norm);
          if (cur) cur.count++;
          else sizeMap.set(norm, { name: norm, count: 1 });
        });

        // 5. Price
        const priceVal = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
        if (Number.isFinite(priceVal) && priceVal > 0) {
          if (priceVal < minP) minP = priceVal;
          if (priceVal > maxP) maxP = priceVal;
        }

        // 6. Counts
        if (p.featured) featuredCount++;
        if (p.mrp && p.mrp > p.price) offerCount++;
        if (p.availability !== 'out') stockCount++;
      });

      if (!Number.isFinite(minP)) minP = 0;
      if (!Number.isFinite(maxP)) maxP = 2000;

      this.facets = {
        categories: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
        brands: Array.from(brandMap.values()).sort((a, b) => b.count - a.count),
        colors: Array.from(colorMap.values()).sort((a, b) => b.count - a.count),
        sizes: Array.from(sizeMap.values()).sort((a, b) => b.count - a.count).slice(0, 15),
        price: { min: Math.floor(minP), max: Math.ceil(maxP) },
        hasRatings: true,
        counts: {
          featured: featuredCount,
          onOffer: offerCount,
          inStock: stockCount
        }
      };

      // Set default price bounds if not already set by URL
      if (this.filters.priceMin == null) this.filters.priceMin = this.facets.price.min;
      if (this.filters.priceMax == null) this.filters.priceMax = this.facets.price.max;
    },

    /**
     * Fetch Single Product Details by ID from Detail API
     */
    async fetchProductDetail(id) {
      if (!id) id = API_CONFIG.DEFAULT_PRODUCT_ID;

      try {
        const response = await fetch(this.detailUrl + encodeURIComponent(id));
        if (!response.ok) throw new Error('HTTP error ' + response.status);

        const product = await response.json();
        if (product && product.id) {
          this.currentProduct = product;
          this.currentGalleryIndex = 0;
          this.renderProductDetailsPage(product);
          window.dispatchEvent(new CustomEvent('product:detail-loaded', { detail: product }));
          return product;
        }
      } catch (error) {
        console.warn('[ProductAPI] Detail API fallback:', error);
        const fallback = this.getProductById(id);
        if (fallback) {
          this.currentProduct = fallback;
          this.currentGalleryIndex = 0;
          this.renderProductDetailsPage(fallback);
          return fallback;
        }
      }

      return null;
    },

    /**
     * Get Filtered and Sorted Products List
     */
    getFilteredProducts() {
      let list = [...this.products];
      const f = this.filters;

      // 1. Category Filter
      if (f.categories && f.categories.length > 0) {
        list = list.filter(p => {
          const slugs = [];
          if (p.category) slugs.push(p.category.toLowerCase().trim(), slugify(p.category));
          if (p.categorySlug) slugs.push(p.categorySlug.toLowerCase().trim());
          if (Array.isArray(p.categoryPath)) {
            p.categoryPath.forEach(c => {
              if (c.slug) slugs.push(c.slug.toLowerCase().trim());
              if (c.name) slugs.push(c.name.toLowerCase().trim(), slugify(c.name));
            });
          }
          return f.categories.some(fc => {
            const fcClean = fc.toLowerCase().trim();
            const fcSlug = slugify(fc);
            return slugs.includes(fcClean) || slugs.includes(fcSlug) || slugs.some(s => s === fcClean || s === fcSlug || s.includes(fcClean) || fcClean.includes(s));
          });
        });
      }

      // 2. Brand Filter
      if (f.brands && f.brands.length > 0) {
        list = list.filter(p => {
          const bSlugs = [];
          if (p.brandName) bSlugs.push(p.brandName.toLowerCase().trim(), slugify(p.brandName));
          if (p.brandSlug) bSlugs.push(p.brandSlug.toLowerCase().trim());
          return f.brands.some(fb => bSlugs.includes(fb.toLowerCase().trim()));
        });
      }

      // 3. Color Filter
      if (f.colors && f.colors.length > 0) {
        list = list.filter(p => {
          const pCols = getProductColors(p).map(c => c.toLowerCase());
          return f.colors.some(c => pCols.includes(c.toLowerCase()));
        });
      }

      // 4. Size Filter
      if (f.sizes && f.sizes.length > 0) {
        list = list.filter(p => {
          const pSizes = getProductSizes(p).map(s => s.toLowerCase().trim());
          return f.sizes.some(s => pSizes.includes(s.toLowerCase().trim()));
        });
      }

      // 5. Price Range Filter
      if (f.priceMin != null) {
        list = list.filter(p => (p.price || 0) >= f.priceMin);
      }
      if (f.priceMax != null) {
        list = list.filter(p => (p.price || 0) <= f.priceMax);
      }

      // 6. Rating Filter
      if (f.minRating != null) {
        list = list.filter(p => (p.rating || 4.8) >= f.minRating);
      }

      // 7. Flags: Featured, On Offer, In Stock
      if (f.featuredOnly) {
        list = list.filter(p => p.featured === true);
      }
      if (f.onOffer) {
        list = list.filter(p => p.mrp && p.mrp > p.price);
      }
      if (f.inStockOnly) {
        list = list.filter(p => p.availability !== 'out');
      }

      // 8. Discount Brackets Filter
      if (f.discountRange && Array.isArray(f.discountRange)) {
        const [dMin, dMax] = f.discountRange;
        list = list.filter(p => {
          const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 10;
          return discount >= dMin && (dMax == null || discount <= dMax);
        });
      }

      // 9. Search Query
      if (f.search && f.search.trim()) {
        const q = f.search.toLowerCase().trim();
        list = list.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.brandName && p.brandName.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }

      // 10. Sort Products
      list = this.sortProductList(list, f.sort);

      return list;
    },

    /**
     * Sort Product List
     */
    sortProductList(list, sortKey) {
      const out = [...list];
      switch (sortKey) {
        case 'price_asc':
        case 'Low-High Price':
          out.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'price_desc':
        case 'High-Low Price':
          out.sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'name':
        case 'A - Z Order':
          out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'name_desc':
        case 'Z - A Order':
          out.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
          break;
        case 'discount':
        case '%Off - Hight To Low':
        case '%Off - High To Low':
          out.sort((a, b) => {
            const dA = a.mrp && a.mrp > a.price ? (a.mrp - a.price) / a.mrp : 0;
            const dB = b.mrp && b.mrp > b.price ? (b.mrp - b.price) / b.mrp : 0;
            return dB - dA;
          });
          break;
        case 'rating':
        case 'Average Rating':
          out.sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));
          break;
        case 'featured':
        case 'Popularity':
        default:
          out.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
          });
          break;
      }
      return out;
    },

    /**
     * Backward-compatible getProducts helper
     */
    getProducts(options) {
      options = options || {};
      let list = [...this.products];
      if (options.category && options.category !== 'all' && options.category !== '*') {
        const catNorm = options.category.toLowerCase().trim();
        list = list.filter(p => p.category && p.category.toLowerCase().trim() === catNorm);
      }
      if (options.search && options.search.trim()) {
        const q = options.search.toLowerCase().trim();
        list = list.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)));
      }
      if (typeof options.minPrice === 'number') list = list.filter(p => (p.price || 0) >= options.minPrice);
      if (typeof options.maxPrice === 'number' && options.maxPrice > 0) list = list.filter(p => (p.price || 0) <= options.maxPrice);
      if (options.sort) list = this.sortProductList(list, options.sort);

      const start = options.offset || 0;
      if (typeof options.limit === 'number' && options.limit > 0) {
        return list.slice(start, start + options.limit);
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
     * Standard Vertical Product Card Generator
     */
    generateProductCardHtml(product, isSlide) {
      if (isSlide === undefined) isSlide = false;
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const category = product.category || 'General';
      const price = this.formatPrice(product.price || 0);
      const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const img = this.getImageUrl(product, 0);
      const unit = product.unit ? ('<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-normal">' + product.unit + '</span>') : '';
      const taxNote = product.taxNote ? ('<span class="text-[11px] text-gray-400 font-normal">' + product.taxNote + '</span>') : '';
      const discount = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 15;

      const slideClass = isSlide ? 'swiper-slide' : '';

      return `<article class="${slideClass} h-full">
        <div class="flex flex-col gap-3.5 rounded-xl border border-gray-300 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:border-primary-main group h-full justify-between">
          <div>
            <div class="relative overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center h-48">
              <a href="product-details-6.html?id=${encodeURIComponent(id)}" class="relative block w-full h-full flex items-center justify-center p-2">
                <img src="${img}" alt="${name}" loading="lazy" class="max-h-40 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src='src/images/home-1/best-selling-tabs/product-1.webp';" />
              </a>
              <div class="absolute top-2 left-0 inline-block z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="67" height="22" viewBox="0 0 67 22" fill="none"><path d="M67 0L65.2314 1.86426L67 3.54199L65.2314 5.59277L67 7.27148L65.2314 9.13574L67 11L65.2314 12.8643L67 14.7285L65.2314 16.5928L67 18.458L65.2314 20.1357L67 22H0V0H67Z" fill="#CB0233"/></svg>
                <span class="absolute inset-0 z-10 flex items-center justify-center text-xs font-bold text-white uppercase">${discount}% off</span>
              </div>
              <button type="button" onclick="window.ProductAPI.toggleWishlist('${id}')" class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-md hover:bg-red-50 hover:text-red-500 transition-all duration-300 z-10 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14.5969 2.99561C12.5857 1.76192 10.8303 2.25909 9.77576 3.05101C9.34339 3.37572 9.1272 3.53807 9 3.53807C8.8728 3.53807 8.65661 3.37572 8.22424 3.05101C7.16971 2.25909 5.41431 1.76192 3.40308 2.99561C0.763551 4.6147 0.166291 9.95614 6.25465 14.4625C7.41429 15.3208 7.99411 15.75 9 15.75C10.0059 15.75 10.5857 15.3208 11.7454 14.4625C17.8337 9.95614 17.2364 4.6147 14.5969 2.99561Z" stroke="currentColor" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="flex items-center justify-between gap-2 pt-2">
              <span class="text-xs font-semibold text-primary-main truncate uppercase tracking-wider">${category}</span>
              ${unit}
            </div>
            <h3 class="text-gray-primary hover:text-primary-main line-clamp-2 text-base leading-6 font-medium mt-1 min-h-[3rem]">
              <a href="product-details-6.html?id=${encodeURIComponent(id)}">${name}</a>
            </h3>
            <div class="flex items-center gap-1 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M13.1701 15.7502C13.0501 15.7506 12.9318 15.7223 12.8251 15.6677L9.00009 13.6652L5.17509 15.6677C4.92169 15.8009 4.61453 15.7783 4.38341 15.6093C4.15228 15.4403 4.03751 15.1545 4.08759 14.8727L4.83759 10.6502L1.74759 7.65015C1.55113 7.4541 1.479 7.16559 1.56009 6.90015C1.64877 6.62822 1.8844 6.4304 2.16759 6.39015L6.44259 5.76765L8.32509 1.92015C8.4504 1.66141 8.71259 1.49707 9.00009 1.49707C9.28758 1.49707 9.54977 1.66141 9.67509 1.92015L11.5801 5.76015L15.8551 6.38265C16.1383 6.4229 16.3739 6.62072 16.4626 6.89265C16.5437 7.15809 16.4715 7.4466 16.2751 7.64265L13.1851 10.6427L13.9351 14.8652C13.9898 15.1523 13.8727 15.445 13.6351 15.6152C13.4993 15.7103 13.3357 15.7578 13.1701 15.7502Z" fill="#FFC107"/></svg>
              <span class="text-xs text-gray-500 font-medium">4.8</span>
              <span class="text-xs text-gray-400">(189)</span>
            </div>
          </div>
          <div>
            <div class="flex items-baseline justify-between gap-2 mb-3">
              <div class="flex items-baseline gap-2">
                <span class="text-gray-primary text-base font-semibold">${price}</span>
                ${mrp ? ('<span class="text-gray-tertiary text-sm line-through">' + mrp + '</span>') : ''}
              </div>
              ${taxNote}
            </div>
            <button type="button" onclick="window.ProductAPI.addToCart('${id}')" class="bg-primary-main hover:bg-primary-main-dark text-white flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer shadow-sm active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </article>`;
    },

    /**
     * Modern Compact Horizontal Product List Card Generator
     */
    generateProductListCardHtml(product) {
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const category = product.category || 'General';
      const desc = product.description ? (product.description.length > 120 ? product.description.slice(0, 120) + '...' : product.description) : 'Pure, premium quality product from WiseTrack catalog.';
      const priceVal = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
      const price = this.formatPrice(priceVal);
      const mrpVal = typeof product.mrp === 'number' ? product.mrp : parseFloat(product.mrp) || 0;
      const mrp = mrpVal > priceVal ? this.formatPrice(mrpVal) : '';
      const savings = mrpVal > priceVal ? this.formatPrice(mrpVal - priceVal) : '';
      const img = this.getImageUrl(product, 0);
      const unit = product.unit ? ('<span class="inline-flex items-center text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">' + product.unit + '</span>') : '';
      const discount = mrpVal > priceVal ? Math.round(((mrpVal - priceVal) / mrpVal) * 100) : 15;

      return `<article class="flex flex-col sm:flex-row gap-4 rounded-xl border border-gray-200 bg-white p-3.5 transition-all duration-300 hover:shadow-md hover:border-primary-main group items-center">
        <!-- Left Image Area -->
        <div class="relative shrink-0 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center size-28 sm:size-32 p-2 border border-gray-100">
          <a href="product-details-6.html?id=${encodeURIComponent(id)}" class="block size-full flex items-center justify-center">
            <img src="${img}" alt="${name}" loading="lazy" class="max-h-24 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src='src/images/home-1/best-selling-tabs/product-1.webp';" />
          </a>
          <div class="absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold uppercase shadow-xs">
            ${discount}% OFF
          </div>
        </div>
        <!-- Middle & Right Content Area -->
        <div class="flex flex-1 flex-col justify-between gap-2 min-w-0 w-full">
          <!-- Details -->
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] font-bold text-primary-main uppercase tracking-wider">${category}</span>
              ${unit}
            </div>
            <h3 class="text-sm sm:text-base font-bold text-gray-900 hover:text-primary-main transition line-clamp-1 leading-snug">
              <a href="product-details-6.html?id=${encodeURIComponent(id)}">${name}</a>
            </h3>
            <p class="text-xs text-gray-500 line-clamp-1 leading-normal">${desc}</p>
            <!-- Ratings -->
            <div class="flex items-center gap-1.5 pt-0.5">
              <div class="flex items-center text-amber-400 text-xs">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <span class="text-xs font-semibold text-gray-800">4.8</span>
              <span class="text-xs text-gray-400 font-medium">(189 reviews)</span>
            </div>
          </div>
          <!-- Bottom Pricing & Action Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-2.5 mt-auto">
            <div class="flex items-baseline gap-2">
              <span class="text-lg font-bold text-gray-900 font-tiktok-sans">${price}</span>
              ${mrp ? ('<span class="text-xs text-gray-400 line-through">' + mrp + '</span>') : ''}
              ${savings ? ('<span class="text-[11px] font-semibold text-emerald-600">(' + savings + ' off)</span>') : ''}
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.ProductAPI.toggleWishlist('${id}')" class="flex size-8.5 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition cursor-pointer shadow-xs">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </button>
              <button type="button" onclick="window.ProductAPI.addToCart('${id}')" class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-main hover:bg-primary-main-dark text-white px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </article>`;
    },

    /**
     * Render Shop / Listing Page Grids & Lists with Pagination & Results Count
     */
    renderListingPages() {
      const allFiltered = this.getFilteredProducts();
      const total = allFiltered.length;
      const pageSize = this.filters.pageSize || 24;
      const currentPage = this.filters.page || 1;
      const totalPages = Math.ceil(total / pageSize) || 1;

      // Slice for current page
      const startIdx = (currentPage - 1) * pageSize;
      const pagedProducts = allFiltered.slice(startIdx, startIdx + pageSize);

      // 1. Update Results Count text
      const countEl = document.getElementById('shop-results-count') || 
                      document.querySelector('.text-gray-secondary.hidden.text-base.sm\\:block');
      if (countEl) {
        if (total === 0) {
          countEl.textContent = 'Showing 0 results';
        } else {
          const from = startIdx + 1;
          const to = Math.min(startIdx + pagedProducts.length, total);
          countEl.textContent = `Showing ${from}–${to} of ${total} results`;
        }
      }

      // Render Active Filter Indicator Bar if active category exists
      const activeBars = document.querySelectorAll('#active-filter-badge-bar, .active-filter-badge-bar');
      activeBars.forEach(activeBar => {
        if (this.filters.categories && this.filters.categories.length > 0) {
          let pillsHtml = `<div class="mb-5 flex flex-wrap items-center gap-2 p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl shadow-2xs">
            <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <svg class="size-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
              Active Filter:
            </span>`;
          this.filters.categories.forEach(cat => {
            pillsHtml += `<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-primary-main rounded-lg text-xs font-bold shadow-2xs border border-emerald-300">
              ${cat}
              <button type="button" onclick="window.ProductAPI.clearCategoryFilter()" class="hover:text-red-500 text-gray-400 font-bold ml-1 cursor-pointer">✕</button>
            </span>`;
          });
          pillsHtml += `<button type="button" onclick="window.ProductAPI.clearAllFilters()" class="text-xs font-semibold text-primary-main hover:underline ml-auto cursor-pointer">Clear All</button>
          </div>`;
          activeBar.innerHTML = pillsHtml;
          activeBar.style.display = 'block';
        } else {
          activeBar.innerHTML = '';
          activeBar.style.display = 'none';
        }
      });

      // Empty State HTML
      const emptyHtml = `<div class="col-span-full py-16 text-center">
        <div class="inline-flex size-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">
          <svg class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800">No products found</h3>
        <p class="text-sm text-gray-500 mt-1 mb-4">Try clearing active filters or changing your search.</p>
        <button type="button" onclick="window.ProductAPI.clearAllFilters()" class="inline-flex items-center gap-2 rounded-lg bg-primary-main px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-main-dark transition cursor-pointer">
          Clear All Filters
        </button>
      </div>`;

      // 2. Render Grid View Containers
      const gridContainers = document.querySelectorAll('#product-grid-container, .product-listing-grid, div[x-show*="grid"] .grid');
      gridContainers.forEach(container => {
        if (pagedProducts.length === 0) {
          container.innerHTML = emptyHtml;
          return;
        }
        let html = '';
        pagedProducts.forEach(p => {
          html += this.generateProductCardHtml(p, false);
        });
        container.innerHTML = html;
      });

      // 3. Render List View Containers
      const listContainers = document.querySelectorAll('#product-list-container, div[x-show*="list"] .space-y-6');
      listContainers.forEach(container => {
        if (pagedProducts.length === 0) {
          container.innerHTML = emptyHtml;
          return;
        }
        let html = '';
        pagedProducts.forEach(p => {
          html += this.generateProductListCardHtml(p);
        });
        container.innerHTML = html;
      });

      // 4. Render Pagination Controls
      this.renderPagination(totalPages, currentPage);
    },

    /**
     * Render Pagination
     */
    renderPagination(totalPages, currentPage) {
      const pagNavs = document.querySelectorAll('.shop-pagination, nav ul.flex.flex-wrap.items-center.justify-center.gap-3, nav ul.flex.items-center.gap-2');
      pagNavs.forEach(nav => {
        // Exclude footer navs
        if (nav.closest('footer')) return;

        if (totalPages <= 1) {
          nav.innerHTML = '';
          return;
        }

        let html = '';
        // Prev button
        html += `<li>
          <button type="button" onclick="window.ProductAPI.setPage(${Math.max(1, currentPage - 1)})" ${currentPage === 1 ? 'disabled' : ''} class="border-gray-tertiary/32 hover:border-primary-main text-gray-primary hover:bg-primary-main/8 hover:text-primary-main inline-flex size-10 items-center justify-center rounded-full border transition-all sm:size-12 disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
        </li>`;

        // Page numbers
        const maxShown = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxShown - 1);
        if (endPage - startPage < maxShown - 1) {
          startPage = Math.max(1, endPage - maxShown + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
          const isActive = i === currentPage;
          html += `<li>
            <button type="button" onclick="window.ProductAPI.setPage(${i})" class="inline-flex size-10 items-center justify-center rounded-full border text-base font-medium transition-all sm:size-12 cursor-pointer ${isActive ? 'bg-primary-main border-primary-main text-white shadow-sm' : 'border-gray-tertiary/32 text-gray-primary hover:border-primary-main hover:bg-primary-main/8 hover:text-primary-main'}">
              ${i}
            </button>
          </li>`;
        }

        // Next button
        html += `<li>
          <button type="button" onclick="window.ProductAPI.setPage(${Math.min(totalPages, currentPage + 1)})" ${currentPage === totalPages ? 'disabled' : ''} class="border-gray-tertiary/32 hover:border-primary-main text-gray-primary hover:bg-primary-main/8 hover:text-primary-main inline-flex size-10 items-center justify-center rounded-full border transition-all sm:size-12 disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </li>`;

        nav.innerHTML = html;
      });
    },

    /**
     * Render Filter Sidebar (Both Desktop Sidebar and Mobile Drawer)
     */
    renderFilterSidebar() {
      if (!this.isShopPage()) return;

      const f = this.filters;
      const facets = this.facets;

      // 1. Categories List
      const catContainers = document.querySelectorAll('#filter-category-items, #mobile-filter-category-items');
      catContainers.forEach(container => {
        if (!container) return;
        let html = '';
        facets.categories.forEach(cat => {
          const isChecked = f.categories.includes(cat.slug) || f.categories.includes(cat.name);
          html += `<li>
            <label class="flex cursor-pointer items-center justify-between gap-2 group py-1" onclick="window.ProductAPI.toggleCategory('${cat.slug}')">
              <div class="flex items-center gap-2.5">
                <div class="relative flex size-5 items-center justify-center">
                  <input type="checkbox" class="sr-only" ${isChecked ? 'checked' : ''} />
                  <span class="flex size-5 items-center justify-center rounded transition-all duration-200 ${isChecked ? 'border-2 border-primary-main bg-primary-main' : 'border-2 border-action-active bg-white group-hover:border-primary-main'}">
                    ${isChecked ? '<svg class="text-white" fill="none" height="12" viewBox="0 0 12 12" width="12"><path d="M2 6L4.8 9L10 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
                  </span>
                </div>
                <span class="text-gray-primary text-sm font-medium group-hover:text-primary-main transition-colors">${cat.name}</span>
              </div>
              <span class="text-gray-secondary text-xs">(${cat.count})</span>
            </label>
          </li>`;
        });
        container.innerHTML = html || '<li class="text-xs text-gray-400 py-1">No categories</li>';
      });

      // 2. Price Range Slider & Inputs
      const pMin = facets.price.min;
      const pMax = facets.price.max;
      const curLo = f.priceMin != null ? f.priceMin : pMin;
      const curHi = f.priceMax != null ? f.priceMax : pMax;
      const span = Math.max(1, pMax - pMin);
      const loPct = ((Math.min(Math.max(curLo, pMin), pMax) - pMin) / span) * 100;
      const hiPct = ((Math.min(Math.max(curHi, pMin), pMax) - pMin) / span) * 100;

      // Update Track bars
      document.querySelectorAll('#filter-price-track, #mobile-filter-price-track').forEach(bar => {
        bar.style.left = `${loPct}%`;
        bar.style.right = `${100 - hiPct}%`;
      });

      // Update sliders
      document.querySelectorAll('#filter-price-slider-min, #mobile-filter-price-slider-min').forEach(sl => {
        sl.min = pMin;
        sl.max = pMax;
        sl.value = curLo;
        sl.oninput = (e) => {
          const val = Math.min(Number(e.target.value), curHi);
          this.setPrice(val, curHi);
        };
      });

      document.querySelectorAll('#filter-price-slider-max, #mobile-filter-price-slider-max').forEach(sl => {
        sl.min = pMin;
        sl.max = pMax;
        sl.value = curHi;
        sl.oninput = (e) => {
          const val = Math.max(Number(e.target.value), curLo);
          this.setPrice(curLo, val);
        };
      });

      // Update Inputs
      document.querySelectorAll('#filter-price-input-min, #mobile-filter-price-input-min').forEach(inp => {
        inp.value = curLo;
        inp.onchange = (e) => {
          const val = Math.min(Math.max(Number(e.target.value) || pMin, pMin), curHi);
          this.setPrice(val, curHi);
        };
      });

      document.querySelectorAll('#filter-price-input-max, #mobile-filter-price-input-max').forEach(inp => {
        inp.value = curHi;
        inp.onchange = (e) => {
          const val = Math.max(Math.min(Number(e.target.value) || pMax, pMax), curLo);
          this.setPrice(curLo, val);
        };
      });

      // 3. Ratings (5, 4, 3, 2, 1)
      const ratingContainers = document.querySelectorAll('#filter-rating-items, #mobile-filter-rating-items');
      ratingContainers.forEach(container => {
        if (!container) return;
        let html = '';
        [5, 4, 3, 2, 1].forEach(r => {
          const isActive = f.minRating === r;
          html += `<button type="button" onclick="window.ProductAPI.setRating(${r})" class="flex h-9 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-sm font-medium transition-all duration-200 cursor-pointer ${isActive ? 'border-primary-main bg-primary-main text-white font-bold shadow-xs' : 'border-gray-200 text-gray-700 bg-white hover:border-primary-main'}">
            <span>${r}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10.7226 3.93872L11.8664 6.24537C12.0224 6.56647 12.4384 6.87446 12.7893 6.93343L14.8626 7.28074C16.1885 7.50354 16.5004 8.47339 15.545 9.43012L13.9332 11.0553C13.6602 11.3305 13.5108 11.8613 13.5953 12.2414L14.0567 14.2531C14.4207 15.8455 13.5823 16.4615 12.1849 15.6293L10.2416 14.4694C9.89067 14.2597 9.31223 14.2597 8.95477 14.4694L7.01148 15.6293C5.62064 16.4615 4.77573 15.8389 5.13969 14.2531L5.60114 12.2414C5.68563 11.8613 5.53615 11.3305 5.26318 11.0553L3.65135 9.43012C2.70246 8.47339 3.00793 7.50354 4.33378 7.28074L6.40705 6.93343C6.75151 6.87446 7.16747 6.56647 7.32345 6.24537L8.46732 3.93872C9.09125 2.68709 10.1051 2.68709 10.7226 3.93872Z" fill="${isActive ? '#FFFFFF' : '#FFC107'}"/>
            </svg>
          </button>`;
        });
        container.innerHTML = html;
      });

      // 4. Colors Swatches
      const colorContainers = document.querySelectorAll('#filter-color-items, #mobile-filter-color-items');
      colorContainers.forEach(container => {
        if (!container) return;
        let html = '';
        facets.colors.forEach(col => {
          const isSelected = f.colors.includes(col.name.toLowerCase());
          const isWhite = col.name.toLowerCase() === 'white';
          html += `<button type="button" onclick="window.ProductAPI.toggleColor('${col.name.toLowerCase()}')"
            class="relative flex size-7 items-center justify-center rounded-full border border-gray-300 transition-all duration-200 cursor-pointer hover:scale-110 ${isSelected ? 'ring-2 ring-primary-main ring-offset-2' : ''}"
            style="background-color: ${col.hex};"
            title="${col.name} (${col.count})">
            ${isSelected ? `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 18" fill="none" class="${isWhite ? 'text-black' : 'text-white'}">
                <path d="M7.30393 13.3335C7.09862 13.3328 6.9028 13.247 6.76319 13.0965L3.16319 9.26684C2.88296 8.9682 2.89788 8.49892 3.19652 8.21869C3.49517 7.93846 3.96444 7.95338 4.24467 8.25202L7.29653 11.5039L13.5262 4.68906C13.6984 4.47455 13.9754 4.37318 14.2454 4.42581C14.5154 4.47843 14.7341 4.67637 14.8132 4.93987C14.8923 5.20336 14.8188 5.48899 14.6225 5.68165L7.85208 13.0891C7.71377 13.2423 7.51778 13.3309 7.31134 13.3335H7.30393Z" fill="currentColor"/>
              </svg>` : ''}
          </button>`;
        });
        container.innerHTML = html || '<span class="text-xs text-gray-400">Standard</span>';
      });

      // 5. Sizes / Pack Sizes
      const sizeContainers = document.querySelectorAll('#filter-size-items, #mobile-filter-size-items');
      sizeContainers.forEach(container => {
        if (!container) return;
        let html = '';
        facets.sizes.forEach(sz => {
          const isSelected = f.sizes.includes(sz.name);
          html += `<button type="button" onclick="window.ProductAPI.toggleSize('${sz.name}')"
            class="h-8.5 min-w-10 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer ${isSelected ? 'border-primary-main bg-primary-main text-white font-bold shadow-xs' : 'border-gray-200 text-gray-700 bg-white hover:border-primary-main hover:text-primary-main'}">
            ${sz.name} <span class="text-[10px] opacity-75">(${sz.count})</span>
          </button>`;
        });
        container.innerHTML = html;
      });

      // 6. Offers & Stock
      const offerContainers = document.querySelectorAll('#filter-offer-items, #mobile-filter-offer-items');
      offerContainers.forEach(container => {
        if (!container) return;
        const items = [
          { key: 'featured', label: 'Featured Products', count: facets.counts.featured, checked: f.featuredOnly },
          { key: 'onOffer', label: 'On Special Offer', count: facets.counts.onOffer, checked: f.onOffer },
          { key: 'inStock', label: 'In Stock Only', count: facets.counts.inStock, checked: f.inStockOnly }
        ];

        let html = '';
        items.forEach(it => {
          html += `<li>
            <label class="flex cursor-pointer items-center justify-between gap-2 group py-1" onclick="window.ProductAPI.toggleOffer('${it.key}')">
              <div class="flex items-center gap-2.5">
                <div class="relative flex size-5 items-center justify-center">
                  <input type="checkbox" class="sr-only" ${it.checked ? 'checked' : ''} />
                  <span class="flex size-5 items-center justify-center rounded transition-all duration-200 ${it.checked ? 'border-2 border-primary-main bg-primary-main' : 'border-2 border-action-active bg-white group-hover:border-primary-main'}">
                    ${it.checked ? '<svg class="text-white" fill="none" height="12" viewBox="0 0 12 12" width="12"><path d="M2 6L4.8 9L10 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
                  </span>
                </div>
                <span class="text-gray-primary text-sm font-medium group-hover:text-primary-main transition-colors">${it.label}</span>
              </div>
              <span class="text-gray-secondary text-xs">(${it.count})</span>
            </label>
          </li>`;
        });
        container.innerHTML = html;
      });

      // 7. Brands List
      const brandContainers = document.querySelectorAll('#filter-brand-items, #mobile-filter-brand-items');
      brandContainers.forEach(container => {
        if (!container) return;
        let html = '';
        facets.brands.forEach(br => {
          const isChecked = f.brands.includes(br.slug) || f.brands.includes(br.name);
          html += `<li>
            <label class="flex cursor-pointer items-center justify-between gap-2 group py-1" onclick="window.ProductAPI.toggleBrand('${br.slug}')">
              <div class="flex items-center gap-2.5">
                <div class="relative flex size-5 items-center justify-center">
                  <input type="checkbox" class="sr-only" ${isChecked ? 'checked' : ''} />
                  <span class="flex size-5 items-center justify-center rounded transition-all duration-200 ${isChecked ? 'border-2 border-primary-main bg-primary-main' : 'border-2 border-action-active bg-white group-hover:border-primary-main'}">
                    ${isChecked ? '<svg class="text-white" fill="none" height="12" viewBox="0 0 12 12" width="12"><path d="M2 6L4.8 9L10 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
                  </span>
                </div>
                <span class="text-gray-primary text-sm font-medium group-hover:text-primary-main transition-colors">${br.name}</span>
              </div>
              <span class="text-gray-secondary text-xs">(${br.count})</span>
            </label>
          </li>`;
        });
        container.innerHTML = html || '<li class="text-xs text-gray-400 py-1">No brands</li>';
      });
    },

    /**
     * Filter Category search box
     */
    filterCategoryList(query) {
      const q = (query || '').toLowerCase().trim();
      document.querySelectorAll('#filter-category-items li, #mobile-filter-category-items li').forEach(li => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(q) ? '' : 'none';
      });
    },

    /**
     * Filter Brand search box
     */
    filterBrandList(query) {
      const q = (query || '').toLowerCase().trim();
      document.querySelectorAll('#filter-brand-items li, #mobile-filter-brand-items li').forEach(li => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(q) ? '' : 'none';
      });
    },

    /**
     * Filter Mutation Methods
     */
    toggleCategory(slug) {
      const idx = this.filters.categories.indexOf(slug);
      if (idx > -1) {
        this.filters.categories.splice(idx, 1);
      } else {
        this.filters.categories.push(slug);
      }
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    toggleBrand(slug) {
      const idx = this.filters.brands.indexOf(slug);
      if (idx > -1) {
        this.filters.brands.splice(idx, 1);
      } else {
        this.filters.brands.push(slug);
      }
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    toggleColor(color) {
      const c = color.toLowerCase();
      const idx = this.filters.colors.indexOf(c);
      if (idx > -1) {
        this.filters.colors.splice(idx, 1);
      } else {
        this.filters.colors.push(c);
      }
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    toggleSize(size) {
      const idx = this.filters.sizes.indexOf(size);
      if (idx > -1) {
        this.filters.sizes.splice(idx, 1);
      } else {
        this.filters.sizes.push(size);
      }
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    setPrice(min, max) {
      this.filters.priceMin = min;
      this.filters.priceMax = max;
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    setRating(rating) {
      if (this.filters.minRating === rating) {
        this.filters.minRating = null;
      } else {
        this.filters.minRating = rating;
      }
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    toggleOffer(key) {
      if (key === 'featured') this.filters.featuredOnly = !this.filters.featuredOnly;
      if (key === 'onOffer') this.filters.onOffer = !this.filters.onOffer;
      if (key === 'inStock') this.filters.inStockOnly = !this.filters.inStockOnly;
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    setSort(sortKey) {
      this.filters.sort = sortKey;
      this.filters.page = 1;
      this.updateUrlParams();
      this.renderListingPages();
    },

    setPage(pageNum) {
      this.filters.page = pageNum;
      this.updateUrlParams();
      this.renderListingPages();
      window.scrollTo({ top: 350, behavior: 'smooth' });
    },

    clearAllFilters() {
      this.filters.categories = [];
      this.filters.brands = [];
      this.filters.colors = [];
      this.filters.sizes = [];
      this.filters.priceMin = this.facets.price.min;
      this.filters.priceMax = this.facets.price.max;
      this.filters.minRating = null;
      this.filters.featuredOnly = false;
      this.filters.onOffer = false;
      this.filters.inStockOnly = false;
      this.filters.search = '';
      this.filters.page = 1;

      // Clear search inputs
      const catInp = document.getElementById('filter-cat-query');
      if (catInp) catInp.value = '';
      const brInp = document.getElementById('filter-brand-query');
      if (brInp) brInp.value = '';

      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearCategoryFilter() {
      this.filters.categories = [];
      const catInp = document.getElementById('filter-cat-query');
      if (catInp) catInp.value = '';
      this.filterCategoryList('');
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearPriceFilter() {
      this.filters.priceMin = this.facets.price.min;
      this.filters.priceMax = this.facets.price.max;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearRatingFilter() {
      this.filters.minRating = null;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearColorFilter() {
      this.filters.colors = [];
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearSizeFilter() {
      this.filters.sizes = [];
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearBrandFilter() {
      this.filters.brands = [];
      const brInp = document.getElementById('filter-brand-query');
      if (brInp) brInp.value = '';
      this.filterBrandList('');
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    clearOffersFilter() {
      this.filters.featuredOnly = false;
      this.filters.onOffer = false;
      this.filters.inStockOnly = false;
      this.updateUrlParams();
      this.renderListingPages();
      this.renderFilterSidebar();
    },

    /**
     * Render All Product Sections Across Pages
     */
    renderAll() {
      if (!this.products || this.products.length === 0) return;

      this.renderFreshPicks();
      this.renderHomeBestSelling();
      this.renderHomeNewArrivals();
      this.renderHomeColumnSliders();
      this.renderHomeThemedSliders();
      this.renderListingPages();
      this.renderFilterSidebar();
      this.renderRelatedSliders();
      this.renderHeaderLiveSearch();

      if (window.WishlistAPI && typeof window.WishlistAPI.updateHeartButtons === 'function') {
        window.WishlistAPI.updateHeartButtons();
      }
    },

    /**
     * Home Page: Fresh Picks for You (Limited products with category-click navigation)
     */
    renderFreshPicks() {
      const container = document.getElementById('fresh-picks-container');
      if (!container) return;

      // Ensure every product card has category click navigation
      container.querySelectorAll('[data-product-card]').forEach(card => {
        const cat = card.getAttribute('data-category') || 'Vegetables';
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
          if (e.target.closest('button, a, input, label, [data-prevent-nav]')) {
            return;
          }
          window.location.href = 'top-banner-with-1-col.html?category=' + encodeURIComponent(cat);
        };
      });

      // Synchronize with real catalog products if available
      if (this.products && this.products.length > 0) {
        container.querySelectorAll('[data-product-card]').forEach(card => {
          const matchKey = (card.getAttribute('data-match') || card.getAttribute('data-name') || '').toLowerCase().trim();
          if (!matchKey) return;
          const found = this.products.find(p => (p.name || '').toLowerCase().includes(matchKey));
          if (found) {
            card.setAttribute('data-id', found.id);
            if (found.category) card.setAttribute('data-category', found.category);
            const priceEl = card.querySelector('[data-card-price]');
            if (priceEl && found.price) {
              priceEl.textContent = this.formatPrice(found.price);
            }
          }
        });
      }
    },

    /**
     * Home Page: Best Selling
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
     * Home Page: New Arrivals
     */
    renderHomeNewArrivals() {
      const containers = document.querySelectorAll('.new-arrival-slider .swiper-wrapper, .featured-product-slider .swiper-wrapper');
      containers.forEach(container => {
        const products = this.getProducts({ limit: 12, offset: 8 });
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
     * Home Page: Horizontal Column Sliders
     */
    renderHomeColumnSliders() {
      const groups = [
        { selector: '.top-rated-slider .swiper-wrapper', offset: 0 },
        { selector: '.top-items-slider .swiper-wrapper', offset: 8 },
        { selector: '.trending-product-slider .swiper-wrapper', offset: 16 },
        { selector: '.popular-items-slider .swiper-wrapper', offset: 24 }
      ];

      groups.forEach(group => {
        const containers = document.querySelectorAll(group.selector);
        containers.forEach(container => {
          const prods = this.getProducts({ limit: 8, offset: group.offset });
          if (prods.length === 0) return;

          let html = '';
          const slide1Prods = prods.slice(0, 4);
          const slide2Prods = prods.slice(4, 8);

          if (slide1Prods.length > 0) {
            html += '<div class="swiper-slide"><ul class="space-y-4">';
            slide1Prods.forEach(p => { html += this.generateHorizontalItemHtml(p); });
            html += '</ul></div>';
          }

          if (slide2Prods.length > 0) {
            html += '<div class="swiper-slide"><ul class="space-y-4">';
            slide2Prods.forEach(p => { html += this.generateHorizontalItemHtml(p); });
            html += '</ul></div>';
          }

          container.innerHTML = html;
          const sliderEl = container.closest('.swiper');
          if (sliderEl) this.initColumnSwiper(sliderEl);
        });
      });
    },

    generateHorizontalItemHtml(product) {
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const price = this.formatPrice(product.price || 0);
      const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const img = this.getImageUrl(product, 0);

      return `<li class="flex flex-col gap-4 rounded-xl border border-gray-300 bg-white p-4 sm:flex-row items-center transition-all duration-300 hover:shadow-md hover:border-primary-main">
        <a class="flex w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2 sm:size-32" href="product-details-6.html?id=${encodeURIComponent(id)}">
          <img alt="${name}" class="h-full w-full rounded-xl transition-transform duration-300 hover:scale-110 object-contain" src="${img}" onerror="this.onerror=null;this.src='src/images/home-1/best-selling-tabs/product-1.webp';" />
        </a>
        <div class="flex flex-1 flex-col justify-between w-full h-full min-w-0">
          <div class="space-y-3">
            <h4><a class="text-gray-primary hover:text-primary-main line-clamp-2 text-base leading-6 font-medium" href="product-details-6.html?id=${encodeURIComponent(id)}">${name}</a></h4>
            <div class="flex items-center gap-1 text-amber-400 text-xs">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              <span class="text-gray-secondary text-xs ml-1">(118)</span>
            </div>
          </div>
          <div class="mt-3 flex items-end justify-between">
            <div class="flex items-center gap-2">
              <span class="text-gray-primary text-base font-semibold">${price}</span>
              ${mrp ? ('<span class="text-gray-tertiary text-sm line-through">' + mrp + '</span>') : ''}
            </div>
            <button type="button" onclick="window.ProductAPI.addToCart('${id}')" class="group bg-primary-main hover:bg-primary-main-dark text-white inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95">
              <span>Add</span>
            </button>
          </div>
        </div>
      </li>`;
    },

    initColumnSwiper(sliderEl) {
      if (!sliderEl || typeof Swiper === 'undefined') return;
      try {
        if (sliderEl.swiper) sliderEl.swiper.destroy(true, true);
        const parent = sliderEl.closest('.overflow-hidden') || sliderEl.parentElement;
        let nextBtn = parent ? parent.querySelector('.top-rated-next, .top-items-next, .trending-product-next, .popular-items-next, .swiper-button-next') : null;
        let prevBtn = parent ? parent.querySelector('.top-rated-prev, .top-items-prev, .trending-product-prev, .popular-items-prev, .swiper-button-prev') : null;

        new Swiper(sliderEl, {
          slidesPerView: 1,
          spaceBetween: 24,
          speed: 500,
          observer: true,
          observeParents: true,
          navigation: { nextEl: nextBtn, prevEl: prevBtn }
        });
      } catch (err) {}
    },

    renderHomeThemedSliders() {
      const themes = [
        { selector: '.coffee-slider .swiper-wrapper', keywords: ['coffee', 'tea', 'beverage'] },
        { selector: '.beauty-slider .swiper-wrapper', keywords: ['care', 'soap', 'oil', 'cream'] },
        { selector: '.ice-cream-slider .swiper-wrapper', keywords: ['milk', 'dairy', 'sweet'] }
      ];

      themes.forEach(t => {
        const containers = document.querySelectorAll(t.selector);
        containers.forEach(container => {
          let prods = this.products.filter(p => {
            const cat = (p.category || '').toLowerCase();
            const nm = (p.name || '').toLowerCase();
            return t.keywords.some(k => cat.includes(k) || nm.includes(k));
          }).slice(0, 10);

          if (prods.length === 0) prods = this.products.slice(0, 8);

          let html = '';
          prods.forEach(p => { html += this.generateProductCardHtml(p, true); });
          container.innerHTML = html;

          const slider = container.closest('.swiper');
          if (slider && slider.swiper) slider.swiper.update();
        });
      });
    },

    renderRelatedSliders() {
      const containers = document.querySelectorAll('.related-product-slider .swiper-wrapper');
      containers.forEach(container => {
        let prods = [];
        if (this.currentProduct && this.currentProduct.category) {
          prods = this.getProducts({ category: this.currentProduct.category, limit: 8 });
        }
        if (prods.length < 4) prods = this.getProducts({ limit: 8, offset: 5 });

        let html = '';
        prods.forEach(p => { html += this.generateProductCardHtml(p, true); });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) slider.swiper.update();
      });
    },

    selectGalleryImage(imgUrl, index) {
      this.currentGalleryIndex = index;
      const mainImg = document.getElementById('product-main-view-img') || document.getElementById('product-main-image');
      if (mainImg) mainImg.src = imgUrl;

      document.querySelectorAll('.gallery-thumb-btn').forEach(btn => {
        const isCur = parseInt(btn.getAttribute('data-index'), 10) === index;
        btn.style.borderColor = isCur ? '#04535c' : '#e2e8f0';
        btn.style.boxShadow = isCur ? '0 0 0 2px rgba(4, 83, 92, 0.25)' : 'none';
      });
    },

    prevGalleryImage() {
      if (!this.currentProduct || !Array.isArray(this.currentProduct.imageUrls) || this.currentProduct.imageUrls.length <= 1) return;
      const total = this.currentProduct.imageUrls.length;
      let nextIdx = (this.currentGalleryIndex - 1 + total) % total;
      this.selectGalleryImage(this.currentProduct.imageUrls[nextIdx], nextIdx);
    },

    nextGalleryImage() {
      if (!this.currentProduct || !Array.isArray(this.currentProduct.imageUrls) || this.currentProduct.imageUrls.length <= 1) return;
      const total = this.currentProduct.imageUrls.length;
      let nextIdx = (this.currentGalleryIndex + 1) % total;
      this.selectGalleryImage(this.currentProduct.imageUrls[nextIdx], nextIdx);
    },

    renderProductDetailsPage(product) {
      if (!product) return;
      document.title = product.name + ' - WiseTrack E-Commerce';

      // Breadcrumb
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

      // Gallery
      const galleryContainer = document.getElementById('product-gallery-container') || document.querySelector('main section .w-full.xl\\:w-1\\/2');
      if (galleryContainer && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
        const images = product.imageUrls;
        const total = images.length;
        const mainImgUrl = images[this.currentGalleryIndex] || images[0];

        let thumbsHtml = '';
        if (total > 1) {
          images.forEach((imgUrl, i) => {
            thumbsHtml += `<button type="button" onclick="window.ProductAPI.selectGalleryImage('${imgUrl}', ${i})" class="gallery-thumb-btn shrink-0 bg-white rounded-xl p-1.5 border transition-all flex items-center justify-center cursor-pointer overflow-hidden" data-index="${i}" style="width: 76px; height: 76px; min-width: 76px; min-height: 76px; border: ${i === this.currentGalleryIndex ? '2px solid #04535c' : '1px solid #e2e8f0'};">
              <img src="${imgUrl}" alt="Thumbnail ${i + 1}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.onerror=null;this.src='src/images/home-1/best-selling-tabs/product-1.webp';" />
            </button>`;
          });
        }

        const galleryHtml = `<div class="flex flex-col-reverse md:flex-row gap-4 items-start w-full">
          ${total > 1 ? `<div class="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto w-full md:w-22 shrink-0 p-1" style="max-height: 520px;">${thumbsHtml}</div>` : ''}
          <div class="flex-1 w-full bg-gray-50 rounded-2xl flex items-center justify-center p-6 border border-gray-100 shadow-sm overflow-hidden relative" style="min-height: 440px; height: 500px;">
            ${total > 1 ? `<button type="button" onclick="window.ProductAPI.prevGalleryImage()" aria-label="Previous" class="hover:bg-primary-main hover:text-white text-gray-700 transition-all cursor-pointer z-10 size-10 rounded-full bg-white/95 flex items-center justify-center shadow-md border border-gray-200 absolute left-3 top-1/2 -translate-y-1/2"><svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 5L8.20711 9.29289C7.87377 9.62623 7.70711 9.79289 7.70711 10C7.70711 10.2071 7.87377 10.3738 8.20711 10.7071L12.5 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg></button>` : ''}
            <img id="product-main-view-img" src="${mainImgUrl}" alt="${product.name}" class="max-h-[420px] max-w-full object-contain transition-all duration-300" onerror="this.onerror=null;this.src='src/images/home-1/best-selling-tabs/product-1.webp';" />
            ${total > 1 ? `<button type="button" onclick="window.ProductAPI.nextGalleryImage()" aria-label="Next" class="hover:bg-primary-main hover:text-white text-gray-700 transition-all cursor-pointer z-10 size-10 rounded-full bg-white/95 flex items-center justify-center shadow-md border border-gray-200 absolute right-3 top-1/2 -translate-y-1/2"><svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L11.7929 10.7071C12.1262 10.3738 12.2929 10.2071 12.2929 10C12.2929 9.79289 12.1262 9.62623 11.7929 9.29289L7.5 5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg></button>` : ''}
          </div>
        </div>`;
        galleryContainer.innerHTML = galleryHtml;
      }

      // Details block
      const priceText = this.formatPrice(product.price || 0);
      const mrpText = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const isAvailable = product.availability !== 'out';

      const detailsContainer = document.getElementById('product-details-content') || document.querySelector('main section .flex-1.space-y-6');
      if (detailsContainer) {
        detailsContainer.innerHTML = `
          <div class="border-b border-gray-200 pb-4">
            <span class="text-xs font-bold text-primary-main uppercase tracking-widest">${product.category || 'General'}</span>
            <h1 class="text-gray-primary text-2xl sm:text-3xl font-bold mt-1 leading-tight">${product.name}</h1>
            <div class="flex items-center gap-2 mt-2">
              <div class="flex text-amber-400 text-sm">★★★★★</div>
              <span class="text-xs font-semibold text-gray-700">4.8</span>
              <span class="text-xs text-gray-400">(189 Customer reviews)</span>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold text-gray-900 font-tiktok-sans">${priceText}</span>
              ${mrpText ? ('<span class="text-base text-gray-400 line-through">' + mrpText + '</span>') : ''}
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                ${isAvailable ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            ${product.taxNote ? ('<p class="text-xs text-gray-500">' + product.taxNote + '</p>') : ''}
          </div>
          <p class="text-gray-600 text-sm leading-relaxed">${product.description || 'Pure, high-grade essentials sourced directly and packed fresh.'}</p>
          <div class="pt-4 border-t border-gray-100">
            <p class="text-sm font-semibold text-gray-800 mb-2">Unit / Size: <span class="text-primary-main font-bold">${product.unit || 'Standard'}</span></p>
            <div class="flex flex-wrap gap-4 items-center">
              <div class="border border-gray-300 flex h-12 items-center justify-between gap-4 rounded-lg px-4 py-2 w-36 bg-white">
                <button type="button" class="size-6 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer font-bold text-lg" onclick="const q=document.getElementById('detail-qty'); if(parseInt(q.textContent)>1) q.textContent=parseInt(q.textContent)-1;">-</button>
                <span id="detail-qty" class="text-gray-primary text-base font-bold">1</span>
                <button type="button" class="size-6 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer font-bold text-lg" onclick="const q=document.getElementById('detail-qty'); q.textContent=parseInt(q.textContent)+1;">+</button>
              </div>
              <button type="button" onclick="const q=parseInt(document.getElementById('detail-qty').textContent)||1; window.ProductAPI.addToCart('${product.id}', q);" class="bg-primary-main hover:bg-primary-main-dark text-white flex-1 h-12 flex items-center justify-center gap-2 rounded-lg font-semibold text-base transition-all duration-300 shadow-md active:scale-95 cursor-pointer">
                <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <span>Add to Cart</span>
              </button>
              <button type="button" onclick="window.ProductAPI.toggleWishlist('${product.id}')" class="size-12 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:text-red-500 hover:border-red-500 transition-colors cursor-pointer bg-white">
                <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </button>
            </div>
          </div>`;
      }

      this.renderRelatedSliders();
    },

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
            html += `<a href="product-details-6.html?id=${encodeURIComponent(p.id)}" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <img src="${pImg}" class="size-10 object-contain rounded bg-white border border-gray-100" />
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-gray-800 truncate">${p.name}</h4>
                <span class="text-xs text-gray-400">${p.category}</span>
              </div>
              <span class="text-sm font-bold text-primary-main">${pPrice}</span>
            </a>`;
          });
          html += '</div>';
          resultsContainer.innerHTML = html;
        });
      });
    },

    addToCart(productId, qty) {
      if (window.CartAPI && typeof window.CartAPI.addToCart === 'function') {
        window.CartAPI.addToCart(productId, qty);
        return;
      }

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
      if (window.WishlistAPI && typeof window.WishlistAPI.toggleWishlist === 'function') {
        window.WishlistAPI.toggleWishlist(productId);
        return;
      }

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

    showToast(message, type) {
      if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
        window.CartAPI.showToast(message, type);
      }
    }
  };

  // Global Quick Add to Cart with event isolation
  window.quickAddToCart = function(e, id, name, price, mrp, image, unit, category) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
      e.preventDefault();
    }
    const productData = {
      id: String(id || 'prod-' + Date.now()),
      itemId: String(id || 'prod-' + Date.now()),
      name: name || 'Fresh Produce',
      price: parseFloat(price) || 0,
      mrp: parseFloat(mrp) || null,
      image: image || 'src/images/home-1/best-selling-tabs/product-1.webp',
      unit: unit || '1 kg',
      category: category || 'Vegetables',
      qty: 1
    };

    if (window.CartAPI) {
      const existing = window.CartAPI.cart.find(i => String(i.id || i.itemId) === String(productData.id));
      if (existing) {
        existing.qty = (Number(existing.qty) || 1) + 1;
      } else {
        window.CartAPI.cart.push(productData);
      }
      window.CartAPI.saveToCache();
      window.CartAPI.updateAllUI();
      window.CartAPI.dispatchEvents();
      if (typeof window.CartAPI.showToast === 'function') {
        window.CartAPI.showToast((name || 'Product') + ' added to cart!');
      }
      window.CartAPI.syncWithApi();
    } else {
      alert((name || 'Product') + ' added to cart!');
    }
  };

  // Global Quick Wishlist Toggle with event isolation
  window.quickToggleWishlist = function(e, id, name, price, image, category) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
      e.preventDefault();
    }
    if (window.WishlistAPI && typeof window.WishlistAPI.toggle === 'function') {
      window.WishlistAPI.toggle({
        id: String(id || 'wish-' + Date.now()),
        name: name || 'Fresh Item',
        price: parseFloat(price) || 0,
        image: image || '',
        category: category || 'Vegetables'
      });
    }
  };

  // Global Click delegation: Any card with [data-product-card] navigates to category shop page
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-product-card]');
    if (card && !e.target.closest('button, a, input, label, [data-prevent-nav]')) {
      const cat = card.getAttribute('data-category') || 'Vegetables';
      window.location.href = 'top-banner-with-1-col.html?category=' + encodeURIComponent(cat);
    }
  });

  // Expose Globally
  window.ProductAPI = ProductAPI;
  window.WiseTrackCatalog = ProductAPI;

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProductAPI.init());
  } else {
    ProductAPI.init();
  }

})(window, document);
