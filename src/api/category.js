/**
 * ============================================================================
 * WiseTrack E-Commerce - Category API & UI Manager
 * File: src/api/category.js
 * API Endpoint: https://demo.wisetracktechnologies.com/api/categories
 * Response Format: ["string", "string", ...]
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    URL: 'https://demo.wisetracktechnologies.com/api/categories',
    CACHE_KEY: 'wisetrack_categories_cache',
    CACHE_TIMESTAMP_KEY: 'wisetrack_categories_cache_time',
    CACHE_EXPIRY_MS: 30 * 60 * 1000 // 30 minutes cache
  };

  /**
   * Generates tailored SVG icons for categories based on name keywords
   */
  /**
   * Generates tailored SVG icons for categories based on name keywords
   */
  function getCategoryIcon(name, customClass = 'size-5 text-primary-main') {
    const n = (name || '').toLowerCase();
    if (n.includes('fruit') || n.includes('vegetable')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3" /></svg>`;
    }
    if (n.includes('milk') || n.includes('dairy') || n.includes('ghee') || n.includes('yoghurt') || n.includes('ice cream')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>`;
    }
    if (n.includes('bakery') || n.includes('bread') || n.includes('cake') || n.includes('biscuit') || n.includes('rusk')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10c0-3.3 2.7-6 6-6s6 2.7 6 6v10H4V10zM16 10h4v10h-4V10z" /></svg>`;
    }
    if (n.includes('tea') || n.includes('coffee') || n.includes('drink') || n.includes('juice') || n.includes('water')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>`;
    }
    if (n.includes('clean') || n.includes('detergent') || n.includes('wash') || n.includes('mop') || n.includes('brush')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 6H9L8 4z" /></svg>`;
    }
    if (n.includes('baby') || n.includes('diaper')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    }
    if (n.includes('cat') || n.includes('dog') || n.includes('pet') || n.includes('fish')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`;
    }
    if (n.includes('care') || n.includes('health') || n.includes('medicine') || n.includes('soap') || n.includes('makeup') || n.includes('skin') || n.includes('perfume')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
    }
    if (n.includes('rice') || n.includes('atta') || n.includes('dal') || n.includes('oil') || n.includes('masala') || n.includes('spices') || n.includes('salt') || n.includes('sugar')) {
      return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`;
    }
    return `<svg class="${customClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>`;
  }

  function getCategoryGroup(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('fruit') || n.includes('vegetable') || n.includes('milk') || n.includes('dairy') || n.includes('yoghurt') || n.includes('ice cream')) return 'fresh';
    if (n.includes('atta') || n.includes('flour') || n.includes('sooji') || n.includes('dal') || n.includes('pulse') || n.includes('rice') || n.includes('cereal') || n.includes('nutrition mix')) return 'staples';
    if (n.includes('oil') || n.includes('ghee') || n.includes('masala') || n.includes('spice') || n.includes('salt') || n.includes('sugar') || n.includes('pickle') || n.includes('honey') || n.includes('jam')) return 'oils';
    if (n.includes('biscuit') || n.includes('cookie') || n.includes('snack') || n.includes('chip') || n.includes('chocolate') || n.includes('mithai') || n.includes('namkeen') || n.includes('tea') || n.includes('coffee') || n.includes('drink') || n.includes('juice') || n.includes('noodle') || n.includes('pasta') || n.includes('rusk') || n.includes('cake') || n.includes('bread')) return 'snacks';
    if (n.includes('soap') || n.includes('wash') || n.includes('care') || n.includes('shaving') || n.includes('deo') || n.includes('perfume') || n.includes('makeup') || n.includes('oral') || n.includes('health') || n.includes('medicine') || n.includes('hygiene') || n.includes('skin') || n.includes('hair')) return 'care';
    if (n.includes('clean') || n.includes('detergent') || n.includes('mop') || n.includes('brush') || n.includes('bin') || n.includes('freshener') || n.includes('kitchen') || n.includes('cookware') || n.includes('mat') || n.includes('pooja') || n.includes('household') || n.includes('shoe') || n.includes('school')) return 'home';
    if (n.includes('baby') || n.includes('diaper') || n.includes('cat') || n.includes('dog') || n.includes('pet') || n.includes('fish') || n.includes('toy')) return 'baby';
    return 'staples';
  }

  // Category API Service & UI Controller
  const CategoryAPI = {
    url: API_CONFIG.URL,
    categories: [],
    isLoaded: false,
    isLoading: false,

    /**
     * Initialize Category Service
     */
    async init() {
      // 1. Load from cache if available
      this.loadFromCache();

      // 2. If cached categories exist, render immediately
      if (this.categories.length > 0) {
        this.renderAll();
      }

      // 3. Fetch fresh data from live API endpoint
      await this.fetchCategories();
    },

    /**
     * Load cached categories from localStorage
     */
    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.categories = parsed;
            this.isLoaded = true;
          }
        }
      } catch (err) {
        console.warn('[CategoryAPI] Error reading cache:', err);
      }
    },

    /**
     * Fetch categories directly from live API endpoint
     * Response: ["string", "string", ...]
     */
    async fetchCategories() {
      if (this.isLoading) return;
      this.isLoading = true;

      try {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        
        const data = await response.json();
        if (Array.isArray(data)) {
          // Store pure API response string array
          this.categories = data.filter(item => typeof item === 'string' && item.trim().length > 0);
          this.isLoaded = true;

          // Save to localStorage cache
          try {
            localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(this.categories));
            localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (e) {}

          // Render across all UI sections
          this.renderAll();

          // Dispatch custom events
          window.dispatchEvent(new CustomEvent('categories:loaded', { detail: this.categories }));
          window.dispatchEvent(new CustomEvent('categories-loaded', { detail: this.categories }));
          window.dispatchEvent(new CustomEvent('categories-updated', { detail: this.categories }));

          // Update Alpine Store if initialized
          if (window.Alpine && window.Alpine.store) {
            const catStore = window.Alpine.store('categories');
            if (catStore) catStore.items = this.categories;
          }

          return this.categories;
        }
      } catch (error) {
        console.error('[CategoryAPI] Failed to fetch categories from API:', error);
      } finally {
        this.isLoading = false;
      }

      return this.categories;
    },

    /**
     * Get current category list
     */
    getCategories() {
      return this.categories;
    },

    /**
     * Get category icon SVG
     */
    getIcon(categoryName) {
      return getCategoryIcon(categoryName);
    },

    /**
     * Render all category UI sections on the page
     */
    renderAll() {
      if (!this.categories || this.categories.length === 0) return;

      this.renderAllCategoriesGrid();
      this.renderExploreDropdown();
      this.renderCategorySliders();
      this.renderSidebarFilter();
      this.renderFooterCategories();
      this.renderSearchDropdownCategories();
      this.renderMobileCategories();
    },

    /**
     * 0. Render Flipkart-style Top Category Strip
     */
    renderFlipkartCategoryStrip() {
      const container = document.getElementById('flipkart-category-strip');
      if (!container || !this.categories.length) return;

      const topCategories = [
        { name: 'Vegetables', label: 'Vegetables' },
        { name: 'Fruits', label: 'Fresh Fruits' },
        { name: 'Dairy & Yoghurt', label: 'Dairy & Milk' },
        { name: 'Atta, Flours & Sooji', label: 'Atta & Flours' },
        { name: 'Dals & Pulses', label: 'Dals & Pulses' },
        { name: 'Edible Oils', label: 'Edible Oils' },
        { name: 'Biscuits, Cookies & Wafers', label: 'Biscuits & Bakery' },
        { name: 'Energy & Soft Drinks', label: 'Drinks & Juices' },
        { name: 'Chips & Corn Snacks', label: 'Snacks & Chips' },
        { name: 'Dry Fruits', label: 'Dry Fruits' },
        { name: 'Bathing Soaps & Body Wash', label: 'Personal Care' },
        { name: 'Detergents & Dishwashes', label: 'Cleaners' },
        { name: 'Baby Bath & Hygiene', label: 'Baby Care' },
        { name: 'Pooja Essentials', label: 'Pooja Items' }
      ];

      let html = '';
      topCategories.forEach(item => {
        const matchingCat = this.categories.find(c => c.toLowerCase() === item.name.toLowerCase()) || item.name;
        const encoded = encodeURIComponent(matchingCat);
        const icon = getCategoryIcon(matchingCat, 'size-6 sm:size-7 text-primary-main group-hover:scale-110 transition-transform');

        html += `
        <a href="top-banner-with-1-col.html?category=${encoded}" class="group flex flex-col items-center justify-center shrink-0 min-w-[70px] sm:min-w-[84px] p-1.5 transition-all text-center cursor-pointer">
          <div class="size-13 sm:size-15 rounded-2xl bg-gray-50 border border-gray-100 group-hover:border-primary-main group-hover:bg-primary-main/10 flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:shadow-md mb-1.5">
            ${icon}
          </div>
          <span class="text-[11px] sm:text-xs font-semibold text-gray-700 group-hover:text-primary-main transition-colors text-center line-clamp-1 leading-tight max-w-[80px]">
            ${item.label}
          </span>
        </a>`;
      });

      // Add "All 70+ Categories" Chip
      html += `
      <a href="#all-categories-section" class="group flex flex-col items-center justify-center shrink-0 min-w-[70px] sm:min-w-[84px] p-1.5 transition-all text-center cursor-pointer" onclick="document.getElementById('all-categories-section') && document.getElementById('all-categories-section').scrollIntoView({ behavior: 'smooth' })">
        <div class="size-13 sm:size-15 rounded-2xl bg-emerald-100 border border-emerald-300 group-hover:bg-primary-main group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:shadow-md mb-1.5 text-primary-main">
          <svg class="size-6 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </div>
        <span class="text-[11px] sm:text-xs font-bold text-primary-main group-hover:underline transition-colors text-center line-clamp-1 leading-tight max-w-[80px]">
          All 70+
        </span>
      </a>`;

      container.innerHTML = html;
    },

    /**
     * 0b. Render All 71 Categories Grid Section
     */
    renderAllCategoriesGrid() {
      const grid = document.getElementById('all-categories-grid');
      if (!grid || !this.categories.length) return;

      let html = '';
      this.categories.forEach((cat) => {
        const encoded = encodeURIComponent(cat);
        const icon = getCategoryIcon(cat, 'size-6 sm:size-7 text-primary-main');
        const group = getCategoryGroup(cat);

        html += `
        <div class="category-card-item col-span-1" data-category="${cat.toLowerCase()}" data-tab="${group}">
          <a href="top-banner-with-1-col.html?category=${encoded}" class="group flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-gray-150 bg-white hover:border-primary-main hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center h-full cursor-pointer">
            <div class="size-13 sm:size-15 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100 group-hover:bg-primary-main/10 group-hover:border-primary-main transition-all duration-300 mb-2 shadow-2xs group-hover:scale-108">
              ${icon}
            </div>
            <div class="flex-1 flex flex-col justify-center w-full py-1">
              <span class="text-xs sm:text-sm font-semibold text-gray-800 group-hover:text-primary-main transition-colors line-clamp-2 leading-tight">
                ${cat}
              </span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100 w-full flex items-center justify-between">
              <span class="text-[10px] sm:text-[11px] font-bold text-primary-main bg-emerald-50 px-2 py-0.5 rounded-full">Shop Now</span>
              <svg class="size-3 text-gray-400 group-hover:text-primary-main group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
          </a>
        </div>`;
      });

      grid.innerHTML = html;
    },

    /**
     * Filter All Categories Grid by Search Query
     */
    filterAllCategories(query) {
      const q = (query || '').toLowerCase().trim();
      const items = document.querySelectorAll('#all-categories-grid .category-card-item');
      let visibleCount = 0;

      items.forEach(el => {
        const text = el.getAttribute('data-category') || '';
        const matches = text.includes(q);
        el.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      const emptyEl = document.getElementById('all-cat-no-results');
      if (emptyEl) {
        emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    },

    /**
     * Filter All Categories Grid by Category Tab
     */
    filterCategoryTab(tabName) {
      const items = document.querySelectorAll('#all-categories-grid .category-card-item');
      const pills = document.querySelectorAll('#category-filter-pills .cat-pill');

      pills.forEach(p => {
        if (p.getAttribute('onclick') && p.getAttribute('onclick').includes("'" + tabName + "'")) {
          p.classList.add('bg-primary-main', 'text-white');
          p.classList.remove('bg-gray-100', 'text-gray-700');
        } else {
          p.classList.remove('bg-primary-main', 'text-white');
          p.classList.add('bg-gray-100', 'text-gray-700');
        }
      });

      items.forEach(el => {
        const tab = el.getAttribute('data-tab') || '';
        if (tabName === 'all' || tab === tabName) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    },

    /**
     * 1. Render Header "Explore All Categories" Menu Dropdown
     */
    renderExploreDropdown() {
      if (!this.categories.length) return;

      const allButtons = document.querySelectorAll('button, div');
      allButtons.forEach(btn => {
        if (btn.childNodes && Array.from(btn.childNodes).some(n => n.textContent && n.textContent.includes('Explore All Categories'))) {
          const container = btn.closest('[x-data]') || btn.parentElement;
          if (!container) return;
          const ul = container.querySelector('ul');
          if (!ul) return;

          ul.classList.add('w-[320px]', 'max-h-[460px]', 'overflow-hidden', 'flex', 'flex-col');
          ul.style.maxHeight = '460px';

          let html = '<div class="p-2.5 border-b border-gray-200 shrink-0 bg-white">' +
            '<div class="relative">' +
              '<input type="text" placeholder="Search ' + this.categories.length + ' categories..." class="explore-cat-search w-full text-xs px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-main" />' +
              '<svg class="size-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>' +
            '</div>' +
          '</div>' +
          '<div class="overflow-y-auto flex-1 divide-y divide-gray-100" style="max-height: 380px;">';

          this.categories.forEach(cat => {
            const encoded = encodeURIComponent(cat);
            const icon = getCategoryIcon(cat);
            html += '<li class="explore-cat-item">' +
              '<a href="top-banner-with-1-col.html?category=' + encoded + '" class="text-gray-primary hover:text-primary-main hover:bg-gray-50 flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors">' +
                '<span class="bg-primary-main/10 flex size-8 shrink-0 items-center justify-center rounded-lg">' +
                  icon +
                '</span>' +
                '<span class="truncate">' + cat + '</span>' +
              '</a>' +
            '</li>';
          });

          html += '</div>';
          ul.innerHTML = html;

          // Attach instant live search filter
          const searchInput = ul.querySelector('.explore-cat-search');
          if (searchInput) {
            searchInput.addEventListener('input', (e) => {
              const query = e.target.value.toLowerCase();
              ul.querySelectorAll('.explore-cat-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? '' : 'none';
              });
            });
          }
        }
      });
    },

    /**
     * 2. Render Homepage Category Sliders & Carousels
     */
    renderCategorySliders() {
      if (!this.categories.length) return;

      const sliderSelectors = [
        '.category-slider',
        '.category-10-slider',
        '.category-twelve-slider',
        '.category-thirteen-slider',
        '.category-two-slider',
        '.category-three-slider',
        '.category-four-slider',
        '.category-slider-5',
        '.category-six-slider',
        '.category-seven-slider',
        '.category-eight-slider',
        '.category-9-slider',
        '.category-19-slider',
        '.category-20-slider'
      ];

      sliderSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(sliderEl => {
          const wrapper = sliderEl.querySelector('.swiper-wrapper');
          if (!wrapper) return;

          const displayCats = this.categories.slice(0, 18);
          let slidesHtml = '';

          displayCats.forEach((cat, index) => {
            const encoded = encodeURIComponent(cat);
            const icon = getCategoryIcon(cat);
            const itemCount = 45 + (index * 19) % 360;

            slidesHtml += '<div class="swiper-slide">' +
              '<a href="top-banner-with-1-col.html?category=' + encoded + '" class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-center transition-all duration-300 hover:border-primary-main hover:shadow-md">' +
                '<div class="flex size-16 items-center justify-center rounded-full bg-primary-main/10 transition-transform duration-300 group-hover:scale-110">' +
                  icon +
                '</div>' +
                '<div>' +
                  '<span class="text-gray-primary group-hover:text-primary-main mb-1 block text-sm font-semibold transition-colors line-clamp-1">' + cat + '</span>' +
                  '<span class="text-gray-secondary text-xs">' + itemCount + '+ Items</span>' +
                '</div>' +
              '</a>' +
            '</div>';
          });

          wrapper.innerHTML = slidesHtml;

          if (sliderEl.swiper) {
            sliderEl.swiper.update();
          } else if (typeof window.initSingleSwiper === 'function') {
            window.initSingleSwiper(sliderEl);
          }
        });
      });
    },

    /**
     * 3. Render Shop/Listing Page Sidebar Filter Checkboxes
     */
    renderSidebarFilter() {
      if (!this.categories.length) return;

      const sidebarCatContainers = document.querySelectorAll('.divide-gray-tertiary\\/24, .filter-category-container');
      sidebarCatContainers.forEach(container => {
        const heading = Array.from(container.querySelectorAll('h3, h4')).find(h => h.textContent.trim().toLowerCase() === 'category');
        if (!heading) return;

        const parentBlock = heading.closest('div.py-6, .filter-block') || heading.parentElement.parentElement;
        if (!parentBlock) return;

        const ul = parentBlock.querySelector('ul');
        if (!ul) return;

        const urlParams = new URLSearchParams(window.location.search);
        const activeCategory = urlParams.get('category') || '';

        let html = '';
        this.categories.forEach((cat, idx) => {
          const isChecked = activeCategory.toLowerCase() === cat.toLowerCase();
          const count = 15 + (idx * 17) % 220;
          html += '<li class="sidebar-cat-item">' +
            '<label class="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-sm text-gray-700 hover:text-primary-main transition-colors">' +
              '<div class="flex items-center gap-2.5 truncate">' +
                '<input type="checkbox" name="category" value="' + cat + '" ' + (isChecked ? 'checked' : '') + ' class="size-4 rounded border-gray-300 text-primary-main focus:ring-primary-main cursor-pointer" onchange="window.CategoryAPI.onCategoryFilterChange(this)" />' +
                '<span class="truncate font-medium ' + (isChecked ? 'text-primary-main font-bold' : '') + '">' + cat + '</span>' +
              '</div>' +
              '<span class="text-xs text-gray-400">(' + count + ')</span>' +
            '</label>' +
          '</li>';
        });

        ul.innerHTML = html;
        ul.classList.add('max-h-[300px]', 'overflow-y-auto', 'pr-2');

        const searchInput = parentBlock.querySelector('input[type="text"]:not([name="category"])');
        if (searchInput) {
          searchInput.placeholder = 'Search ' + this.categories.length + ' categories...';
          searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            ul.querySelectorAll('.sidebar-cat-item').forEach(item => {
              const text = item.textContent.toLowerCase();
              item.style.display = text.includes(val) ? '' : 'none';
            });
          });
        }
      });
    },

    /**
     * Handle category checkbox filter change
     */
    onCategoryFilterChange(input) {
      if (input.checked) {
        const url = new URL(window.location);
        url.searchParams.set('category', input.value);
        window.history.pushState({}, '', url);
        if (window.ProductAPI && typeof window.ProductAPI.renderListingProducts === 'function') {
          window.ProductAPI.renderListingProducts();
        }
      }
    },

    /**
     * 4. Render Footer Category Links
     */
    renderFooterCategories() {
      if (!this.categories.length) return;

      document.querySelectorAll('h4').forEach(h4 => {
        if (h4.textContent.trim().toLowerCase() === 'category') {
          const parent = h4.parentElement;
          const ul = parent.querySelector('ul');
          if (ul) {
            const footerCats = this.categories.slice(0, 6);
            let html = '';
            footerCats.forEach(cat => {
              html += '<li>' +
                '<a class="hover:text-primary-main text-base transition-all hover:underline" href="top-banner-with-1-col.html?category=' + encodeURIComponent(cat) + '">' +
                  cat +
                '</a>' +
              '</li>';
            });
            ul.innerHTML = html;
          }
        }
      });
    },

    /**
     * 5. Render Search Dropdown Quick Categories
     */
    renderSearchDropdownCategories() {
      if (!this.categories.length) return;

      document.querySelectorAll('.search-dropdown-scrollbar, [x-show="showDropdown"]').forEach(dropdown => {
        let pillsContainer = dropdown.querySelector('.search-quick-categories');
        if (!pillsContainer) {
          const titleSpan = Array.from(dropdown.querySelectorAll('span')).find(s => s.textContent.includes('Recent Search'));
          if (titleSpan) {
            const wrapper = titleSpan.closest('div').parentElement;
            const section = document.createElement('div');
            section.className = 'mb-4 border-t border-gray-100 pt-3';
            section.innerHTML = '<span class="text-gray-primary text-xs font-semibold uppercase tracking-wider block mb-2">Popular Categories</span>' +
              '<div class="search-quick-categories flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto"></div>';
            wrapper.appendChild(section);
            pillsContainer = section.querySelector('.search-quick-categories');
          }
        }

        if (pillsContainer) {
          let html = '';
          this.categories.slice(0, 15).forEach(cat => {
            html += '<a href="top-banner-with-1-col.html?category=' + encodeURIComponent(cat) + '" class="border border-gray-200 hover:border-primary-main hover:bg-primary-main/5 text-gray-700 hover:text-primary-main text-xs px-2.5 py-1 rounded-full transition-colors">' +
              cat +
            '</a>';
          });
          pillsContainer.innerHTML = html;
        }
      });
    },

    /**
     * 6. Render Mobile Navigation Categories
     */
    renderMobileCategories() {
      if (!this.categories.length) return;

      document.querySelectorAll('.mobile-category-list').forEach(el => {
        let html = '';
        this.categories.forEach(cat => {
          html += '<li>' +
            '<a href="top-banner-with-1-col.html?category=' + encodeURIComponent(cat) + '" class="flex items-center gap-2 py-2 px-3 text-sm text-gray-700 hover:text-primary-main">' +
              cat +
            '</a>' +
          '</li>';
        });
        el.innerHTML = html;
      });
    }
  };

  // Expose API Globally
  window.CategoryAPI = CategoryAPI;
  window.WiseTrackCategories = CategoryAPI;

  // Alpine.js Store Integration
  document.addEventListener('alpine:init', () => {
    if (window.Alpine && window.Alpine.store) {
      window.Alpine.store('categories', {
        items: CategoryAPI.categories,
        search: '',
        get filtered() {
          if (!this.search) return this.items;
          return this.items.filter(c => c.toLowerCase().includes(this.search.toLowerCase()));
        }
      });
    }
  });

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CategoryAPI.init());
  } else {
    CategoryAPI.init();
  }

})(window, document);
