// QuickQR Analytics Tracker - Lightweight conversion tracking
(function() {
  'use strict';

  const QQR = {
    config: {
      apiKey: null,
      endpoint: null,
      scanId: null,
      debug: false
    },

    init: function(options) {
      this.config.apiKey = options.apiKey || null;
      this.config.endpoint = options.endpoint || this.detectEndpoint();
      this.config.scanId = options.scanId || this.getScanIdFromURL();
      this.config.debug = options.debug || false;

      if (this.config.debug) {
        console.log('[QQR] Initialized with config:', this.config);
      }

      return this;
    },

    detectEndpoint: function() {
      // Auto-detect based on current hostname
      const hostname = window.location.hostname;
      if (hostname.includes('quickqr.io') || hostname.includes('qqr.io')) {
        return 'https://api.quickqr.io/v1/conversions';
      } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return 'http://localhost:4321/api/v1/conversions';
      }
      return 'https://api.quickqr.io/v1/conversions';
    },

    getScanIdFromURL: function() {
      const params = new URLSearchParams(window.location.search);
      return params.get('qr_scan_id') || params.get('_qr') || params.get('qqr_scan');
    },

    generateFingerprint: function() {
      // Simple fingerprint based on available browser data
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset()
      ];
      return btoa(components.join('|')).slice(0, 32);
    },

    track: function(eventName, properties) {
      if (!this.config.scanId) {
        if (this.config.debug) {
          console.log('[QQR] No scan_id found, skipping track:', eventName);
        }
        return Promise.resolve(null);
      }

      if (!this.config.apiKey) {
        console.warn('[QQR] No API key configured, skipping track');
        return Promise.resolve(null);
      }

      const payload = {
        scan_id: this.config.scanId,
        event_type: eventName,
        properties: properties || {},
        url: window.location.href,
        referrer: document.referrer || null,
        fingerprint: this.generateFingerprint(),
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: screen.width + 'x' + screen.height
      };

      if (this.config.debug) {
        console.log('[QQR] Tracking event:', payload);
      }

      return fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.config.apiKey
        },
        body: JSON.stringify(payload),
        keepalive: true // Ensures request completes even if page unloads
      }).then(function(response) {
        if (!response.ok) {
          throw new Error('QQR track failed: ' + response.status);
        }
        return response.json();
      }).catch(function(error) {
        if (QQR.config.debug) {
          console.error('[QQR] Track error:', error);
        }
        // Silently fail - don't break user experience
        return null;
      });
    },

    // Predefined event helpers
    trackPurchase: function(amount, currency, items) {
      return this.track('purchase', {
        revenue: amount,
        currency: currency || 'USD',
        items: items || [],
        value: amount
      });
    },

    trackSignup: function(method, userId) {
      return this.track('signup', {
        method: method || 'direct',
        user_id: userId
      });
    },

    trackLead: function(type, value) {
      return this.track('lead', {
        lead_type: type,
        lead_value: value
      });
    },

    trackPageView: function(pageName) {
      return this.track('page_view', {
        page: pageName || window.location.pathname
      });
    },

    trackAddToCart: function(productId, productName, price, quantity) {
      return this.track('add_to_cart', {
        product_id: productId,
        product_name: productName,
        price: price,
        quantity: quantity || 1,
        value: price * (quantity || 1)
      });
    },

    trackCheckoutStart: function(cartValue, itemCount) {
      return this.track('checkout_start', {
        cart_value: cartValue,
        item_count: itemCount
      });
    },

    trackCheckoutComplete: function(orderId, total, currency) {
      return this.track('checkout_complete', {
        order_id: orderId,
        revenue: total,
        currency: currency || 'USD',
        value: total
      });
    }
  };

  // Expose to global scope
  window.QQR = QQR;

  // Auto-initialize if data attributes are present
  document.addEventListener('DOMContentLoaded', function() {
    const scriptTag = document.querySelector('script[data-qqr-api-key]');
    if (scriptTag) {
      QQR.init({
        apiKey: scriptTag.getAttribute('data-qqr-api-key'),
        endpoint: scriptTag.getAttribute('data-qqr-endpoint'),
        scanId: scriptTag.getAttribute('data-qqr-scan-id'),
        debug: scriptTag.hasAttribute('data-qqr-debug')
      });

      // Auto-track page view if configured
      if (scriptTag.hasAttribute('data-qqr-auto-pageview')) {
        QQR.trackPageView();
      }
    }
  });

  // Support for module imports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QQR;
  }
})();