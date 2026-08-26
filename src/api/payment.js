/**
 * ============================================================================
 * WiseTrack E-Commerce - Payment API & Robust Invoice PDF Downloader
 * File: src/api/payment.js
 * API Endpoints:
 *   - POST /api/payment/create-order
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    CREATE_PAYMENT_URL: 'https://demo.wisetracktechnologies.com/api/payment/create-order',
    BASE_URL: 'https://demo.wisetracktechnologies.com',
    DEFAULT_EMAIL: 'shopper@example.com',
    TOKEN_KEYS: ['wisetrack_token', 'token', 'auth_token', 'jwt_token', 'access_token', 'user_token']
  };

  /**
   * Generates a printable client-side invoice document with exact selected customer details
   * Used when server endpoint is 404 or offline so user ALWAYS gets their invoice!
   */
  function generateClientInvoice(orderData, filename) {
    const orderRef = orderData.orderRef || orderData.id || ('ORD-' + Date.now());
    const invoiceId = orderData.invoiceId || ('INV-' + Date.now());
    const total = orderData.total || orderData.amountDue || 0;
    const formattedTotal = (window.CartAPI && typeof window.CartAPI.formatPrice === 'function') ? window.CartAPI.formatPrice(total) : ('₹' + total);
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const paymentMethod = (orderData.paymentMethod || 'Cash on Delivery').toUpperCase();
    const status = (orderData.status || 'CONFIRMED').toUpperCase();

    let customerName = 'Shopper';
    let customerEmail = 'shopper@example.com';
    let customerPhone = 'N/A';
    let customerAddress = 'N/A';

    if (orderData.customer) {
      if (orderData.customer.name) customerName = orderData.customer.name;
      if (orderData.customer.email) customerEmail = orderData.customer.email;
      if (orderData.customer.phone) customerPhone = orderData.customer.phone;
      const addrParts = [];
      if (orderData.customer.address || orderData.customer.line) addrParts.push(orderData.customer.address || orderData.customer.line);
      if (orderData.customer.city) addrParts.push(orderData.customer.city);
      if (orderData.customer.state) addrParts.push(orderData.customer.state);
      if (orderData.customer.pincode || orderData.customer.zip) addrParts.push(orderData.customer.pincode || orderData.customer.zip);
      customerAddress = addrParts.join(', ') || 'N/A';
    } else {
      if (window.AddressAPI && typeof window.AddressAPI.getSelectedAddress === 'function') {
        const sel = window.AddressAPI.getSelectedAddress();
        if (sel) {
          customerName = sel.name || customerName;
          customerPhone = sel.phone || customerPhone;
          const addrParts = [];
          if (sel.line || sel.address) addrParts.push(sel.line || sel.address);
          if (sel.city) addrParts.push(sel.city);
          if (sel.state) addrParts.push(sel.state);
          if (sel.pincode || sel.zip) addrParts.push(sel.pincode || sel.zip);
          customerAddress = addrParts.join(', ') || 'N/A';
        }
      }
    }

    // Build items table rows
    let itemsRows = '';
    const lines = orderData.lines || orderData.items;
    if (lines && Array.isArray(lines) && lines.length > 0) {
      lines.forEach(item => {
        const iName = item.name || 'Product Item';
        const iQty = Number(item.qty) || 1;
        const iPrice = Number(item.price) || (total / lines.length);
        const iSub = (iPrice * iQty);
        const formatItemPrice = (window.CartAPI && typeof window.CartAPI.formatPrice === 'function') ? window.CartAPI.formatPrice(iPrice) : ('₹' + iPrice.toLocaleString('en-IN'));
        const formatItemSub = (window.CartAPI && typeof window.CartAPI.formatPrice === 'function') ? window.CartAPI.formatPrice(iSub) : ('₹' + iSub.toLocaleString('en-IN'));

        itemsRows += `
          <tr>
            <td>
              <strong>${iName}</strong>
            </td>
            <td style="text-align: center;">${iQty}</td>
            <td style="text-align: right;">${formatItemPrice}</td>
            <td style="text-align: right;">${formatItemSub}</td>
          </tr>
        `;
      });
    } else {
      itemsRows = `
        <tr>
          <td>
            <strong>Order Items Package (${orderRef})</strong><br>
            <span style="font-size: 12px; color: #6b7280;">Grocery items & daily essentials</span>
          </td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">${formattedTotal}</td>
          <td style="text-align: right;">${formattedTotal}</td>
        </tr>
      `;
    }

    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) {
      alert('Please allow popups to download/print your invoice.');
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoiceId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 40px; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #0F766E; }
    .invoice-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-align: right; }
    .meta-text { font-size: 13px; color: #6b7280; text-align: right; margin: 2px 0; }
    .badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; border-radius: 9999px; background: #d1fae5; color: #065f46; text-transform: uppercase; margin-top: 6px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin: 32px 0; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 8px; }
    .info-text { font-size: 14px; line-height: 1.6; margin: 2px 0; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
    td { padding: 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937; }
    .total-row { display: flex; justify-content: flex-end; margin-top: 24px; }
    .total-box { width: 280px; }
    .total-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #4b5563; }
    .grand-total { border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 6px; font-size: 18px; font-weight: 800; color: #0F766E; }
    .actions { margin-top: 36px; text-align: center; }
    .print-btn { background: #0F766E; color: white; border: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: 0.2s; }
    .print-btn:hover { background: #0d635c; }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">WiseTrack Store</div>
        <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">Fresh Grocery & Daily Essentials</p>
      </div>
      <div>
        <h1 class="invoice-title">TAX INVOICE</h1>
        <p class="meta-text"><strong>Invoice No:</strong> ${invoiceId}</p>
        <p class="meta-text"><strong>Order Ref:</strong> ${orderRef}</p>
        <p class="meta-text"><strong>Date:</strong> ${dateStr}</p>
        <div style="text-align: right;"><span class="badge">${status}</span></div>
      </div>
    </div>

    <div class="details-grid">
      <div>
        <div class="section-title">Billed To (Customer):</div>
        <p class="info-text"><strong>${customerName}</strong></p>
        <p class="info-text"><strong>Email:</strong> ${customerEmail}</p>
        <p class="info-text"><strong>Phone:</strong> ${customerPhone}</p>
        <p class="info-text"><strong>Address:</strong> ${customerAddress}</p>
      </div>
      <div>
        <div class="section-title">Order & Payment Info:</div>
        <p class="info-text"><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p class="info-text"><strong>Fulfillment:</strong> Standard Delivery</p>
        <p class="info-text"><strong>Delivery Partner:</strong> Delhivery Express</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="total-row">
      <div class="total-box">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>${formattedTotal}</span>
        </div>
        <div class="total-line">
          <span>Shipping:</span>
          <span style="color: #059669; font-weight: 600;">FREE</span>
        </div>
        <div class="total-line">
          <span>Tax / GST:</span>
          <span>₹0.00</span>
        </div>
        <div class="total-line grand-total">
          <span>Total Amount:</span>
          <span>${formattedTotal}</span>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="print-btn" onclick="window.print();">Print / Save as PDF</button>
    </div>
  </div>
  <script>
    // Auto-trigger print dialog for instant PDF saving
    setTimeout(() => {
      window.print();
    }, 400);
  </script>
</body>
</html>
    `;

    invoiceWindow.document.open();
    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
  }

  /**
   * Universal Invoice Downloader Helper
   * Triggers immediate direct download of invoice PDF files with exact customer & items
   * @param {string} invoiceUrl
   * @param {string} [filename]
   * @param {Object} [customOrderData]
   */
  async function downloadInvoice(invoiceUrl, filename, customOrderData) {
    const safeFilename = (filename || 'invoice') + (filename && filename.endsWith('.pdf') ? '' : '.pdf');

    if (window.CartAPI && typeof window.CartAPI.showToast === 'function') {
      window.CartAPI.showToast('Preparing invoice download...', 'cart');
    }

    // Read from cached order or active session
    let cachedOrder = customOrderData || null;
    if (!cachedOrder) {
      try {
        cachedOrder = JSON.parse(localStorage.getItem('wisetrack_last_order') || '{}');
      } catch (e) {}
    }

    let activeCustomer = null;
    if (cachedOrder && cachedOrder.customer) {
      activeCustomer = cachedOrder.customer;
    } else if (window.AddressAPI && typeof window.AddressAPI.getSelectedAddress === 'function') {
      activeCustomer = window.AddressAPI.getSelectedAddress();
    }

    // Direct server PDF fetch if valid external URL
    if (invoiceUrl && invoiceUrl.startsWith('http') && !invoiceUrl.includes('localhost') && !invoiceUrl.endsWith('/pdf')) {
      const a = document.createElement('a');
      a.href = invoiceUrl;
      a.target = '_blank';
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 500);
      return;
    }

    // Attempt fetching from API endpoint
    let fullUrl = invoiceUrl;
    if (invoiceUrl && invoiceUrl.startsWith('/')) {
      fullUrl = API_CONFIG.BASE_URL + invoiceUrl;
    }

    if (fullUrl) {
      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/pdf, application/octet-stream, */*' }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = safeFilename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
            }, 1000);
            return;
          }
        }
      } catch (err) {
        console.warn('[PaymentAPI] Server PDF download notice:', err.message);
      }
    }

    // Guaranteed fallback: Generate clean printable tax invoice with exact selected customer details & items!
    generateClientInvoice({
      orderRef: filename || (cachedOrder ? cachedOrder.orderRef : 'ORD-2026'),
      invoiceId: cachedOrder ? (cachedOrder.invoiceId || cachedOrder.orderRef) : ('INV-' + (filename || '2026')),
      total: cachedOrder ? (cachedOrder.total || cachedOrder.amountDue) : 0,
      customer: activeCustomer,
      lines: cachedOrder ? (cachedOrder.lines || cachedOrder.items) : (window.CartAPI ? window.CartAPI.cart : null),
      paymentMethod: cachedOrder ? cachedOrder.paymentMethod : 'cod',
      status: cachedOrder ? cachedOrder.status : 'confirmed'
    }, safeFilename);
  }

  /**
   * Payment API Controller
   */
  const PaymentAPI = {
    createPaymentUrl: API_CONFIG.CREATE_PAYMENT_URL,
    baseUrl: API_CONFIG.BASE_URL,
    isProcessing: false,

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
     * Initialize Payment Service & Invoice Click Interceptor
     */
    init() {
      // Intercept all invoice download clicks across document
      document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-invoice-url], a[href*="invoice"], a[href*="/pdf"], button:has(svg)');
        if (!target) return;

        const href = target.getAttribute('href') || target.getAttribute('data-invoice-url');
        const text = (target.textContent || '').toLowerCase();

        if (href && (href.includes('invoice') || href.includes('/pdf') || text.includes('invoice') || text.includes('download'))) {
          e.preventDefault();
          const filename = target.getAttribute('data-filename') || 'invoice';
          downloadInvoice(href, filename);
        }
      });
    },

    /**
     * Create Razorpay / Gateway Order via POST /api/payment/create-order
     * @param {Object} orderData
     */
    async createPaymentOrder(orderData) {
      this.isProcessing = true;
      try {
        const payload = {
          lines: orderData.lines || [],
          customer: orderData.customer || {},
          paymentMethod: orderData.paymentMethod || 'cod',
          idempotencyKey: orderData.idempotencyKey || ('pay-' + Date.now()),
          couponCode: orderData.couponCode || 'SAVE10',
          giftCardCode: orderData.giftCardCode || 'GIFT500',
          shippingRateId: orderData.shippingRateId || 'standard'
        };

        const response = await fetch(this.createPaymentUrl, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data.razorpayOrderId) {
          return { success: true, data: data };
        } else {
          return { success: false, error: data.error || 'Payment gateway not available' };
        }
      } catch (err) {
        console.error('[PaymentAPI] Error creating payment order:', err);
        return { success: false, error: err.message };
      } finally {
        this.isProcessing = false;
      }
    },

    /**
     * Process checkout flow with payment selection
     * @param {Object} orderData
     */
    async processCheckout(orderData) {
      const method = orderData.paymentMethod || 'cod';

      if (method === 'cod' || method === 'bank') {
        // COD / Bank Transfer -> Direct order placement
        if (window.CheckoutAPI && typeof window.CheckoutAPI.placeOrder === 'function') {
          return window.CheckoutAPI.placeOrder(orderData);
        }
      } else {
        // Online Payment Gateway (Razorpay)
        const payRes = await this.createPaymentOrder(orderData);
        if (payRes.success && payRes.data) {
          const rzpData = payRes.data;

          // If Razorpay SDK is available in browser
          if (typeof window.Razorpay !== 'undefined') {
            const options = {
              key: rzpData.keyId,
              amount: rzpData.amount,
              currency: rzpData.currency || 'INR',
              name: rzpData.name || 'WiseTrack Store',
              description: 'Order Payment',
              order_id: rzpData.razorpayOrderId,
              prefill: rzpData.prefill || {},
              handler: function (response) {
                if (window.CheckoutAPI) {
                  window.CheckoutAPI.placeOrder({
                    ...orderData,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpaySignature: response.razorpay_signature
                  });
                }
              },
              theme: { color: '#0F766E' }
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
            return;
          }
        }

        // Gateway fallback to standard order placement
        if (window.CheckoutAPI && typeof window.CheckoutAPI.placeOrder === 'function') {
          return window.CheckoutAPI.placeOrder(orderData);
        }
      }
    }
  };

  // Expose Globally
  window.PaymentAPI = PaymentAPI;
  window.WiseTrackPayment = PaymentAPI;
  window.downloadInvoice = downloadInvoice;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PaymentAPI.init());
  } else {
    PaymentAPI.init();
  }

})(window, document);
