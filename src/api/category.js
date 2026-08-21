/**
 * ============================================================================
 * WiseTrack E-Commerce - Category API & UI Manager
 * File: src/api/category.js
 * API Endpoint: https://demo.wisetracktechnologies.com/api/categories
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

  // 71 Default Fallback Categories (from WiseTrack API)
  const DEFAULT_CATEGORIES = [
    "All Purpose Cleaners",
    "Atta, Flours & Sooji",
    "Baby Bath & Hygiene",
    "Baby Food & Formula",
    "Bath Oil, Talcum & Handwash",
    "Bathing Accessories",
    "Bathing Soaps & Body Wash",
    "Bins & Bathroom Ware",
    "Biscuits, Cookies & Wafers",
    "Breads And Bakery",
    "Breakfast Cereals",
    "Cat Food",
    "Chips & Corn Snacks",
    "Chocolate And Candies",
    "Coconut Water & Packaged Water",
    "Coffee",
    "Cookware,crockery & Kitchen Appliances",
    "Daily Kitchen Needs",
    "Dairy & Yoghurt",
    "Dals & Pulses",
    "Detergents & Dishwashes",
    "Diapers & Wipes",
    "Disposable & Garbage",
    "Dog Food & Accessories",
    "Dry Fruits",
    "Edible Oils",
    "Energy & Soft Drinks",
    "Feminine Hygiene",
    "Fish Food",
    "Fragrances & Deos",
    "Fresheners & Repellents",
    "Fruit Juices & Drinks",
    "Fruits",
    "Ghee",
    "Hair Care",
    "Health & Medicine",
    "Home Baking & Topping",
    "Honey & Jams",
    "Household Items",
    "Ice Cream & Frozen Dessert",
    "Kitchen Accessories",
    "Makeup",
    "Masalas & Spices",
    "Mats And Bedsheet",
    "Men Bathing Essentials",
    "Men Perfumes & Deodorants",
    "Men Shaving Care",
    "Men Skin Care",
    "Milk Products",
    "Mithai",
    "Mops, Brushes & Scrubs",
    "Namkeen & Savoury",
    "Noodle, Pasta, Vermicelli",
    "Nutrition Mix",
    "Oral Care",
    "Pickles & Chutney",
    "Pooja Essentials",
    "Ready To Cook & Eat",
    "Rice & Similar Products",
    "Rusks, Cakes & Khari",
    "Salt, Sugar & Jaggery",
    "School & Office Supplies",
    "Sexual Wellness",
    "Shoe Care",
    "Skin Care",
    "Spreads, Sauces, Ketchup",
    "Styling & Grooming Appliances",
    "Sun Cream & Face Wash",
    "Tea",
    "Toys & Games",
    "Vegetables"
  ];

  /**
   * Generates tailored SVG icons for categories based on name keywords
   */
  function getCategoryIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('fruit') || n.includes('vegetable')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3" /></svg>`;
    }
    if (n.includes('milk') || n.includes('dairy') || n.includes('ghee') || n.includes('yoghurt') || n.includes('ice cream')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>`;
    }
    if (n.includes('bakery') || n.includes('bread') || n.includes('cake') || n.includes('biscuit') || n.includes('rusk')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10c0-3.3 2.7-6 6-6s6 2.7 6 6v10H4V10zM16 10h4v10h-4V10z" /></svg>`;
    }
    if (n.includes('tea') || n.includes('coffee') || n.includes('drink') || n.includes('juice') || n.includes('water')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>`;
    }
    if (n.includes('clean') || n.includes('detergent') || n.includes('wash') || n.includes('mop') || n.includes('brush')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 6H9L8 4z" /></svg>`;
    }
    if (n.includes('baby') || n.includes('diaper')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    }
    if (n.includes('cat') || n.includes('dog') || n.includes('pet') || n.includes('fish')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`;
    }
    if (n.includes('care') || n.includes('health') || n.includes('medicine') || n.includes('soap') || n.includes('makeup') || n.includes('skin') || n.includes('perfume')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
    }
    if (n.includes('rice') || n.includes('atta') || n.includes('dal') || n.includes('oil') || n.includes('masala') || n.includes('spices') || n.includes('salt') || n.includes('sugar')) {
      return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`;
    }
    return `<svg class="size-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>`;
  }

  // Category API Service & UI Controller
  const CategoryAPI = {
    url: API_CONFIG.URL,
    categories: DEFAULT_CATEGORIES,
    isLoaded: false,
    isLoading: false,

    /**
     * Initialize Category Service
     */
    async init() {
      // 1. Load from cache first for zero-latency initial render
      this.loadFromCache();

      // 2. Render UI immediately with cached/default categories
      this.renderAll();

      // 3. Fetch fresh data from live API in background
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
          }
        }
      } catch (err) {
        console.warn('[CategoryAPI] Error loading cache:', err);
      }
    },

    /**
     * Fetch categories from live API endpoint
     */
    async fetchCategories() {
      if (this.isLoading) return;
      this.isLoading = true;

      try {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.categories = data;
          this.isLoaded = true;

          // Save to local storage cache
          try {
            localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (e) {}

          // Update UI across page
          this.renderAll();

          // Dispatch custom event for external listeners
          window.dispatchEvent(new CustomEvent('categories:loaded', { detail: data }));
          window.dispatchEvent(new CustomEvent('categories-loaded', { detail: data }));

          // Update Alpine Store if initialized
          if (window.Alpine && window.Alpine.store) {
            const catStore = window.Alpine.store('categories');
            if (catStore) catStore.items = data;
          }

          return data;
        }
      } catch (error) {
        console.warn('[CategoryAPI] Live API fetch warning (using fallback data):', error);
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
      this.renderExploreDropdown();
      this.renderCategorySliders();
      this.renderSidebarFilter();
      this.renderFooterCategories();
      this.renderSearchDropdownCategories();
      this.renderMobileCategories();
    },

    /**
     * 1. Render Header "Explore All Categories" Menu Dropdown
     */
    renderExploreDropdown() {
      const allButtons = document.querySelectorAll('button, div');
      allButtons.forEach(btn => {
        if (btn.childNodes && Array.from(btn.childNodes).some(n => n.textContent && n.textContent.includes('Explore All Categories'))) {
          const container = btn.closest('[x-data]') || btn.parentElement;
          if (!container) return;
          const ul = container.querySelector('ul');
          if (!ul) return;

          ul.classList.add('w-[320px]', 'max-h-[460px]', 'overflow-hidden', 'flex', 'flex-col');
          ul.style.maxHeight = '460px';

          let html = `
            <div class="p-2.5 border-b border-gray-200 shrink-0 bg-white">
              <div class="relative">
                <input type="text" placeholder="Search ${this.categories.length} categories..." class="explore-cat-search w-full text-xs px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-main" />
                <svg class="size-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>
            <div class="overflow-y-auto flex-1 divide-y divide-gray-100" style="max-height: 380px;">
          `;

          this.categories.forEach(cat => {
            const encoded = encodeURIComponent(cat);
            const icon = getCategoryIcon(cat);
            html += `
              <li class="explore-cat-item">
                <a href="top-banner-with-1-col.html?category=${encoded}" class="text-gray-primary hover:text-primary-main hover:bg-gray-50 flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors">
                  <span class="bg-primary-main/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    ${icon}
                  </span>
                  <span class="truncate">${cat}</span>
                </a>
              </li>
            `;
          });

          html += `</div>`;
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

            slidesHtml += `
              <div class="swiper-slide">
                <a href="top-banner-with-1-col.html?category=${encoded}" class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-center transition-all duration-300 hover:border-primary-main hover:shadow-md">
                  <div class="flex size-16 items-center justify-center rounded-full bg-primary-main/10 transition-transform duration-300 group-hover:scale-110">
                    ${icon}
                  </div>
                  <div>
                    <span class="text-gray-primary group-hover:text-primary-main mb-1 block text-sm font-semibold transition-colors line-clamp-1">${cat}</span>
                    <span class="text-gray-secondary text-xs">${itemCount}+ Items</span>
                  </div>
                </a>
              </div>
            `;
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
          html += `
            <li class="sidebar-cat-item">
              <label class="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-sm text-gray-700 hover:text-primary-main transition-colors">
                <div class="flex items-center gap-2.5 truncate">
                  <input type="checkbox" name="category" value="${cat}" ${isChecked ? 'checked' : ''} class="size-4 rounded border-gray-300 text-primary-main focus:ring-primary-main cursor-pointer" onchange="window.CategoryAPI.onCategoryFilterChange(this)" />
                  <span class="truncate font-medium ${isChecked ? 'text-primary-main font-bold' : ''}">${cat}</span>
                </div>
                <span class="text-xs text-gray-400">(${count})</span>
              </label>
            </li>
          `;
        });

        ul.innerHTML = html;
        ul.classList.add('max-h-[300px]', 'overflow-y-auto', 'pr-2');

        const searchInput = parentBlock.querySelector('input[type="text"]:not([name="category"])');
        if (searchInput) {
          searchInput.placeholder = `Search ${this.categories.length} categories...`;
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
      }
    },

    /**
     * 4. Render Footer Category Links
     */
    renderFooterCategories() {
      document.querySelectorAll('h4').forEach(h4 => {
        if (h4.textContent.trim().toLowerCase() === 'category') {
          const parent = h4.parentElement;
          const ul = parent.querySelector('ul');
          if (ul) {
            const footerCats = this.categories.slice(0, 6);
            let html = '';
            footerCats.forEach(cat => {
              html += `
                <li>
                  <a class="hover:text-primary-main text-base transition-all hover:underline" href="top-banner-with-1-col.html?category=${encodeURIComponent(cat)}">
                    ${cat}
                  </a>
                </li>
              `;
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
      document.querySelectorAll('.search-dropdown-scrollbar, [x-show="showDropdown"]').forEach(dropdown => {
        let pillsContainer = dropdown.querySelector('.search-quick-categories');
        if (!pillsContainer) {
          const titleSpan = Array.from(dropdown.querySelectorAll('span')).find(s => s.textContent.includes('Recent Search'));
          if (titleSpan) {
            const wrapper = titleSpan.closest('div').parentElement;
            const section = document.createElement('div');
            section.className = 'mb-4 border-t border-gray-100 pt-3';
            section.innerHTML = `
              <span class="text-gray-primary text-xs font-semibold uppercase tracking-wider block mb-2">Popular Categories</span>
              <div class="search-quick-categories flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto"></div>
            `;
            wrapper.appendChild(section);
            pillsContainer = section.querySelector('.search-quick-categories');
          }
        }

        if (pillsContainer) {
          let html = '';
          this.categories.slice(0, 15).forEach(cat => {
            html += `
              <a href="top-banner-with-1-col.html?category=${encodeURIComponent(cat)}" class="border border-gray-200 hover:border-primary-main hover:bg-primary-main/5 text-gray-700 hover:text-primary-main text-xs px-2.5 py-1 rounded-full transition-colors">
                ${cat}
              </a>
            `;
          });
          pillsContainer.innerHTML = html;
        }
      });
    },

    /**
     * 6. Render Mobile Navigation Categories
     */
    renderMobileCategories() {
      document.querySelectorAll('.mobile-category-list').forEach(el => {
        let html = '';
        this.categories.forEach(cat => {
          html += `
            <li>
              <a href="top-banner-with-1-col.html?category=${encodeURIComponent(cat)}" class="flex items-center gap-2 py-2 px-3 text-sm text-gray-700 hover:text-primary-main">
                ${cat}
              </a>
            </li>
          `;
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