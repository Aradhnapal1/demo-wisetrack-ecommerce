/**
 * ============================================================================
 * WiseTrack E-Commerce - Dynamic Banner API Manager
 * File: src/api/banner.js
 * Homepage API: https://demo.wisetracktechnologies.com/api/homepage
 * Theme API:    https://demo.wisetracktechnologies.com/api/theme
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  const BANNER_CONFIG = {
    HOMEPAGE_URL: 'https://demo.wisetracktechnologies.com/api/homepage',
    THEME_URL: 'https://demo.wisetracktechnologies.com/api/theme',
    CACHE_KEY: 'wisetrack_banners_cache',
    CACHE_TIME_KEY: 'wisetrack_banners_time',
    SHOP_PAGE_URL: 'top-banner-with-1-col.html'
  };

  // Curated high-res grocery photography fallbacks (matching frontend-next demo-images)
  const FALLBACK_BANNERS = [
    {
      id: 'banner-sale-1',
      title: 'Monsoon Sale - Up To 30% Off',
      subtext: 'Browse the full catalog. Pure organic oils, pulses and fresh daily essentials.',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80&auto=format&fit=crop',
      badge: '30% OFF',
      badgeLabel: 'Exclusive Offer',
      link: BANNER_CONFIG.SHOP_PAGE_URL
    },
    {
      id: 'banner-smart-2',
      title: 'Shop the Smart Way Anytime, Anywhere',
      subtext: 'Discover a modern standard of grocery shopping where quality meets everyday convenience.',
      imageUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=1600&q=80&auto=format&fit=crop',
      badge: '25% OFF',
      badgeLabel: 'Special Deal',
      link: BANNER_CONFIG.SHOP_PAGE_URL
    },
    {
      id: 'banner-organic-3',
      title: '100% Certified Organic & Pure Staples',
      subtext: 'Cold-pressed oils, unpolished dals, premium dry fruits and nutritious millets at direct prices.',
      imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1600&q=80&auto=format&fit=crop',
      badge: 'FREE DELIVERY',
      badgeLabel: 'New Season',
      link: BANNER_CONFIG.SHOP_PAGE_URL
    },
    {
      id: 'banner-clean-4',
      title: 'Clean Home, Happy Living Care Essentials',
      subtext: 'Trusted home, hygiene and personal care products for your family at unbeatable value.',
      imageUrl: 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=1600&q=80&auto=format&fit=crop',
      badge: 'TOP RATED',
      badgeLabel: 'Daily Best',
      link: BANNER_CONFIG.SHOP_PAGE_URL
    }
  ];

  const BannerAPI = {
    banners: [],
    theme: null,
    isLoaded: false,

    async init() {
      // 1. Load from cache for instant render
      this.loadFromCache();

      // 2. Render initial view
      this.render();

      // 3. Fetch fresh data from API
      await this.fetchBanners();

      // 4. Re-render with live data
      this.render();
    },

    loadFromCache() {
      try {
        const cached = localStorage.getItem(BANNER_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.banners = parsed;
            this.isLoaded = true;
          }
        }
      } catch (e) {
        console.warn('[BannerAPI] Cache read error:', e);
      }

      if (!this.banners || this.banners.length === 0) {
        this.banners = [...FALLBACK_BANNERS];
      }
    },

    async fetchBanners() {
      try {
        const [hpRes, themeRes] = await Promise.allSettled([
          fetch(BANNER_CONFIG.HOMEPAGE_URL).then(r => r.ok ? r.json() : null),
          fetch(BANNER_CONFIG.THEME_URL).then(r => r.ok ? r.json() : null)
        ]);

        const liveBanners = [];
        const hpData = hpRes.status === 'fulfilled' ? hpRes.value : null;
        const themeData = themeRes.status === 'fulfilled' ? themeRes.value : null;

        if (themeData) {
          this.theme = themeData;
        }

        // Extract banners from homepage sections
        if (hpData && Array.isArray(hpData.sections)) {
          hpData.sections.forEach(sec => {
            if (sec.banners && Array.isArray(sec.banners)) {
              sec.banners.forEach((b, i) => {
                liveBanners.push({
                  id: b.id || ('hp-b-' + i),
                  title: b.title || sec.title || 'Special Promotion',
                  subtext: b.alt || 'Browse our full catalog and enjoy exclusive offers.',
                  imageUrl: b.imageUrl || b.imageMobileUrl || FALLBACK_BANNERS[0].imageUrl,
                  badge: 'SPECIAL OFFER',
                  badgeLabel: 'Limited Time',
                  link: BANNER_CONFIG.SHOP_PAGE_URL
                });
              });
            }
          });
        }

        // Extract from theme hero
        if (themeData && themeData.hero && (themeData.hero.headline || themeData.hero.imageUrl)) {
          liveBanners.push({
            id: 'theme-hero-banner',
            title: themeData.hero.headline || 'Everything your shop makes, now online.',
            subtext: themeData.hero.subtext || 'Browse the full catalog. Every order books straight into the accounts.',
            imageUrl: themeData.hero.imageUrl || FALLBACK_BANNERS[1].imageUrl,
            badge: 'SAVE BIG',
            badgeLabel: 'Storefront',
            link: BANNER_CONFIG.SHOP_PAGE_URL
          });
        }

        // Fill remaining slots with beautiful grocery banners so slider always has 3-4 slides
        FALLBACK_BANNERS.forEach(fb => {
          if (!liveBanners.some(b => b.title === fb.title)) {
            liveBanners.push(fb);
          }
        });

        if (liveBanners.length > 0) {
          this.banners = liveBanners.slice(0, 4);
          this.isLoaded = true;
          try {
            localStorage.setItem(BANNER_CONFIG.CACHE_KEY, JSON.stringify(this.banners));
            localStorage.setItem(BANNER_CONFIG.CACHE_TIME_KEY, Date.now().toString());
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[BannerAPI] Fetch error, using fallback:', err);
      }
    },

    render() {
      const isShopPage = window.location.pathname.includes('top-banner') || 
                         window.location.pathname.includes('shop') ||
                         document.getElementById('shop-top-banner-slider-wrapper') !== null ||
                         document.querySelector('.hero-slider .swiper-wrapper') !== null && document.getElementById('product-list-container') !== null;

      if (isShopPage) {
        this.renderShopTopBanner();
      } else {
        this.renderHomeHero();
        this.renderHomePromoBanners();
      }
    },

    /**
     * Render Main Hero Slider on Home Page (index.html)
     */
    renderHomeHero() {
      const container = document.getElementById('home-hero-slider-wrapper') || 
                        document.querySelector('main > section:first-of-type .hero-slider .swiper-wrapper');
      if (!container || !this.banners || this.banners.length === 0) return;

      let html = '';
      this.banners.forEach((b, idx) => {
        const bgColors = [
          'bg-primary-main',
          'bg-emerald-800',
          'bg-amber-900',
          'bg-slate-900'
        ];
        const bg = bgColors[idx % bgColors.length];

        html += `
        <div class="swiper-slide ${bg} py-16 lg:py-0 transition-colors duration-500">
          <div class="custom-container">
            <div class="grid grid-cols-1 items-center justify-between lg:grid-cols-12 lg:gap-16">
              <!-- Text Content -->
              <div class="wow animate__fadeInUp order-2 flex flex-col items-start text-left lg:order-1 lg:col-span-6 xl:col-span-6">
                <div class="mb-3 inline-flex items-center gap-2">
                  <span class="text-base font-medium tracking-wide text-white md:text-lg">${b.badgeLabel || 'Exclusive offer'}</span>
                  <span class="bg-success-dark inline-flex h-5 items-center justify-center rounded-full px-2 py-1 text-xs font-bold text-gray-800 uppercase shadow-xs">${b.badge || '25% OFF'}</span>
                </div>
                <h1 class="font-tiktok-sans mb-3 max-w-2xl text-3xl font-bold text-white md:text-5xl lg:leading-16">
                  ${b.title}
                </h1>
                <p class="mb-6 max-w-sm text-sm leading-relaxed text-white/90 md:max-w-md md:text-base">
                  ${b.subtext}
                </p>
                <a class="group bg-success-light text-primary-main inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all hover:bg-white shadow-md active:scale-95 md:text-base" href="${b.link || 'top-banner-with-1-col.html'}">
                  <span>Shop Now</span>
                  <svg class="size-4 transition-transform duration-500 group-hover:rotate-45 md:size-[22px]" fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.5833 6.41406L5.5 16.4974" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>
                    <path d="M10.0835 5.5H15.8335C16.1478 5.5 16.3049 5.5 16.4025 5.59763C16.5002 5.69526 16.5002 5.8524 16.5002 6.16667V11.9167" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>
                  </svg>
                </a>
              </div>
              <!-- Image Banner Content -->
              <div class="order-1 flex items-center justify-center lg:order-2 lg:col-span-6 xl:col-span-6">
                <div class="relative flex items-center justify-center p-4">
                  <img src="${b.imageUrl}" class="max-h-[340px] lg:max-h-[460px] w-full object-cover rounded-2xl shadow-2xl border-2 border-white/20 transition-transform duration-500 hover:scale-102" alt="${b.title}" onerror="this.onerror=null;this.src='${FALLBACK_BANNERS[0].imageUrl}';" />
                </div>
              </div>
            </div>
          </div>
        </div>`;
      });

      container.innerHTML = html;
      this.refreshSwiper(container.closest('.swiper'));
    },

    /**
     * Render Top Banner Slider on Shop Page (top-banner-with-1-col.html)
     */
    renderShopTopBanner() {
      const container = document.getElementById('shop-top-banner-slider-wrapper') || 
                        document.querySelector('main section .hero-slider .swiper-wrapper');
      if (!container || !this.banners || this.banners.length === 0) return;

      let html = '';
      this.banners.forEach((b, idx) => {
        const overlay = 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.7) 100%)';

        html += `
        <div class="swiper-slide relative flex h-[420px] sm:h-[470px] items-center overflow-hidden rounded-2xl px-6 py-20 md:px-12 lg:px-24"
             style="background: ${overlay}, url('${b.imageUrl}') no-repeat center center / cover;">
          <!-- Text Content -->
          <div class="flex max-w-xs flex-col items-start text-left sm:max-w-md lg:max-w-xl z-10">
            <div class="mb-3 inline-flex items-center gap-2">
              <span class="bg-primary-main/90 text-white inline-flex h-6 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase shadow-xs">
                ${b.badgeLabel || 'Category Spotlight'}
              </span>
              <span class="bg-success-dark text-gray-900 inline-flex h-6 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold uppercase shadow-xs">
                ${b.badge || 'UP TO 30% OFF'}
              </span>
            </div>
            <h1 class="font-tiktok-sans text-white mb-3 text-2xl leading-tight font-bold md:text-5xl lg:leading-16 drop-shadow-md">
              ${b.title}
            </h1>
            <p class="text-white/95 mb-6 max-w-sm text-sm leading-relaxed md:max-w-md md:text-base drop-shadow-sm">
              ${b.subtext}
            </p>
            <a class="group bg-success-light text-primary-main inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all hover:bg-white shadow-lg active:scale-95 md:text-base"
               href="${b.link || 'top-banner-with-1-col.html'}">
              <span>Shop Now</span>
              <svg class="size-4 transition-transform duration-500 group-hover:rotate-45 md:size-[22px]" fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5833 6.41406L5.5 16.4974" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>
                <path d="M10.0835 5.5H15.8335C16.1478 5.5 16.3049 5.5 16.4025 5.59763C16.5002 5.69526 16.5002 5.8524 16.5002 6.16667V11.9167" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>
              </svg>
            </a>
          </div>
        </div>`;
      });

      container.innerHTML = html;
      this.refreshSwiper(container.closest('.swiper'));
    },

    /**
     * Render Secondary Mid-Page Promo Banners on Home Page
     */
    renderHomePromoBanners() {
      // 1. Feature Grid Banners (Line ~4601 in index.html)
      const promoGrid = document.querySelector('section.py-12 .grid.grid-cols-1.gap-6.lg\\:grid-cols-2');
      if (promoGrid && this.banners && this.banners.length >= 2) {
        const b1 = this.banners[0];
        const b2 = this.banners[1];
        const b3 = this.banners[2] || this.banners[0];

        // Update main left promo image and text if available
        const mainImg = promoGrid.querySelector('.rounded-2xl > img');
        if (mainImg) mainImg.src = b1.imageUrl;

        const mainTitle = promoGrid.querySelector('.rounded-2xl h3');
        if (mainTitle && b1.title) mainTitle.innerHTML = b1.title.replace('-', '<br/>');

        const mainSub = promoGrid.querySelector('.rounded-2xl p');
        if (mainSub && b1.subtext) mainSub.textContent = b1.subtext;

        const mainBtn = promoGrid.querySelector('.rounded-2xl a');
        if (mainBtn) mainBtn.href = BANNER_CONFIG.SHOP_PAGE_URL;

        // Update secondary right promo images and links
        const rightBanners = promoGrid.querySelectorAll('.grid-cols-1 .relative');
        if (rightBanners.length >= 2) {
          const img1 = rightBanners[0].querySelector('img');
          const btn1 = rightBanners[0].querySelector('a');
          const h1 = rightBanners[0].querySelector('h3');
          if (img1) img1.src = b2.imageUrl;
          if (btn1) btn1.href = BANNER_CONFIG.SHOP_PAGE_URL;
          if (h1 && b2.title) h1.innerHTML = b2.title.replace('-', '<br/>');

          const img2 = rightBanners[1].querySelector('img');
          const btn2 = rightBanners[1].querySelector('a');
          const h2 = rightBanners[1].querySelector('h3');
          if (img2) img2.src = b3.imageUrl;
          if (btn2) btn2.href = BANNER_CONFIG.SHOP_PAGE_URL;
          if (h2 && b3.title) h2.innerHTML = b3.title.replace('-', '<br/>');
        }
      }

      // 2. Full Width CTA Banner (Line ~4688 in index.html)
      const fullWidthCta = document.querySelector('section.py-12 .w-full.rounded-2xl.bg-cover');
      if (fullWidthCta && this.banners.length > 0) {
        const banner = this.banners[this.banners.length - 1];
        fullWidthCta.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('${banner.imageUrl}')`;
        const ctaBtn = fullWidthCta.querySelector('a');
        if (ctaBtn) ctaBtn.href = BANNER_CONFIG.SHOP_PAGE_URL;
      }
    },

    /**
     * Safely updates or initializes Swiper slider
     */
    refreshSwiper(sliderEl) {
      if (!sliderEl || typeof Swiper === 'undefined') return;

      try {
        if (sliderEl.swiper) {
          sliderEl.swiper.update();
        } else {
          const parent = sliderEl.closest('section') || sliderEl.parentElement;
          new Swiper(sliderEl, {
            slidesPerView: 1,
            spaceBetween: 0,
            loop: true,
            speed: 800,
            autoplay: {
              delay: 5000,
              disableOnInteraction: false,
            },
            pagination: {
              el: parent ? parent.querySelector('.swiper-pagination') : sliderEl.querySelector('.swiper-pagination'),
              clickable: true,
            },
            navigation: {
              nextEl: parent ? (parent.querySelector('.hero-next, .swiper-button-next') || '.hero-next') : '.hero-next',
              prevEl: parent ? (parent.querySelector('.hero-prev, .swiper-button-prev') || '.hero-prev') : '.hero-prev',
            },
          });
        }
      } catch (err) {
        console.warn('[BannerAPI] Swiper update error:', err);
      }
    }
  };

  // Expose to window
  window.BannerAPI = BannerAPI;

  // Auto-init on DOMContentLoaded or immediate if document already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BannerAPI.init());
  } else {
    BannerAPI.init();
  }

})(window, document);
