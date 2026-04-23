/**
 * Ultraviolet Bundle
 * Minimal bundle for TKHub service worker
 */

// EventEmitter implementation
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
  
  removeListener(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
}

// XOR Codec - URL-safe base64 encoding (matches app.js)
const xor = {
  _xorKey: [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10
  ],
  
  _toBase64Url(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },
  
  _fromBase64Url(base64url) {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return base64;
  },
  
  encode(str) {
    if (!str) return str;
    try {
      const bytes = new TextEncoder().encode(str);
      const xorBytes = bytes.map((byte, i) => byte ^ this._xorKey[i % this._xorKey.length]);
      const base64 = btoa(String.fromCharCode(...xorBytes));
      return this._toBase64Url(base64);
    } catch (e) {
      const base64 = btoa(str.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ (i % 2 ? 2 : 1))
      ).join(''));
      return this._toBase64Url(base64);
    }
  },
  
  decode(str) {
    if (!str) return str;
    try {
      const base64 = this._fromBase64Url(str);
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const xorBytes = bytes.map((byte, i) => byte ^ this._xorKey[i % this._xorKey.length]);
      return new TextDecoder().decode(xorBytes);
    } catch (e) {
      try {
        const base64 = this._fromBase64Url(str);
        const decoded = atob(base64);
        return decoded.split('').map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ (i % 2 ? 2 : 1))
        ).join('');
      } catch {
        return str;
      }
    }
  }
};

// Base64 Codec
const base64 = {
  encode: (str) => {
    try {
      return btoa(str);
    } catch {
      return btoa(unescape(encodeURIComponent(str)));
    }
  },
  decode: (str) => {
    try {
      return atob(str);
    } catch {
      return decodeURIComponent(escape(atob(str)));
    }
  }
};

// Ultraviolet Core
class Ultraviolet {
  constructor(options = {}) {
    this.prefix = options.prefix || '/service/';
    this.codec = options.codec || xor;
    this.eventEmitter = new EventEmitter();
  }
  
  encode(url) {
    return this.codec.encode(url);
  }
  
  decode(url) {
    return this.codec.decode(url);
  }
  
  hook(window) {
    // Hook window object for proxy
    const uv = this;
    
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = uv.rewriteUrl(input);
      } else if (input instanceof Request) {
        input = new Request(uv.rewriteUrl(input.url), input);
      }
      return originalFetch.call(this, input, init);
    };
    
    // Override XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      xhr.open = function(method, url, async, user, password) {
        return originalOpen.call(this, method, uv.rewriteUrl(url), async, user, password);
      };
      return xhr;
    };
    
    // Override WebSocket
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      return new originalWebSocket(uv.rewriteUrl(url), protocols);
    };
    
    // Override location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      get: () => uv.createProxyLocation(originalLocation),
      configurable: true
    });
  }
  
  rewriteUrl(url) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return this.prefix + this.encode(url);
      }
      return url;
    } catch (e) {
      return url;
    }
  }
  
  createProxyLocation(location) {
    const uv = this;
    return new Proxy(location, {
      get(target, prop) {
        if (prop === 'href') {
          return uv.decode(target.href.split(uv.prefix)[1] || target.href);
        }
        return target[prop];
      }
    });
  }
}

// Bare Client for server communication
class BareClient {
  constructor() {
    this.baseUrl = '';
  }
  
  async fetch(request) {
    return fetch(request);
  }
}

// UVServiceWorker Class
class UVServiceWorker extends EventEmitter {
  constructor(config = self.__uv$config) {
    super();
    this.config = config || {
      prefix: '/service/',
      encodeUrl: xor.encode,
      decodeUrl: xor.decode
    };
    this.bareClient = new BareClient();
  }
  
  route(event) {
    const url = new URL(event.request.url);
    return url.pathname.startsWith(this.config.prefix);
  }
  
  async fetch(event) {
    const request = event.request;
    const url = new URL(request.url);
    
    // Extract target URL from path
    const encodedUrl = url.pathname.slice(this.config.prefix.length);
    const targetUrl = this.config.decodeUrl(encodedUrl);
    
    console.log('UV: Proxying request to', targetUrl);
    
    try {
      // Create new request with target URL
      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: this.filterHeaders(request.headers),
        body: request.body,
        mode: 'cors',
        credentials: 'omit'
      });
      
      // Fetch from target
      const response = await fetch(newRequest);
      
      // Process response
      return this.processResponse(response, targetUrl);
      
    } catch (error) {
      console.error('UV: Fetch failed', error);
      return new Response('Proxy Error: ' + error.message, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
  
  filterHeaders(headers) {
    // Remove problematic headers
    const filtered = new Headers();
    const blockedHeaders = ['origin', 'referer', 'cookie', 'host'];
    
    headers.forEach((value, key) => {
      if (!blockedHeaders.includes(key.toLowerCase())) {
        filtered.set(key, value);
      }
    });
    
    return filtered;
  }
  
  processResponse(response, targetUrl) {
    const headers = new Headers(response.headers);
    
    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    
    // Remove problematic headers
    headers.delete('content-security-policy');
    headers.delete('x-frame-options');
    headers.delete('x-content-type-options');
    
    // Process content based on type
    const contentType = headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      return this.processHtml(response, headers, targetUrl);
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
  
  async processHtml(response, headers, targetUrl) {
    const text = await response.text();
    
    // Rewrite URLs in HTML
    let processed = text;
    const baseUrl = new URL(targetUrl);
    
    // Inject UV client script
    const uvScript = `<script src="/src/uv.client.js"></script><script>self.__uv$config = ${JSON.stringify(this.config)};</script>`;
    processed = processed.replace('<head>', `<head>${uvScript}`);
    processed = processed.replace('<HEAD>', `<HEAD>${uvScript}`);
    
    // Rewrite absolute URLs
    processed = processed.replace(/href="https?:\/\/([^"]+)"/g, (match, url) => {
      return `href="${this.config.prefix}${this.config.encodeUrl('https://' + url)}"`;
    });
    
    processed = processed.replace(/src="https?:\/\/([^"]+)"/g, (match, url) => {
      return `src="${this.config.prefix}${this.config.encodeUrl('https://' + url)}"`;
    });
    
    processed = processed.replace(/action="https?:\/\/([^"]+)"/g, (match, url) => {
      return `action="${this.config.prefix}${this.config.encodeUrl('https://' + url)}"`;
    });
    
    return new Response(processed, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
}

// Expose Ultraviolet globally
self.Ultraviolet = Ultraviolet;
self.Ultraviolet.EventEmitter = EventEmitter;
self.Ultraviolet.codec = { xor, base64 };
self.BareClient = BareClient;
self.UVServiceWorker = UVServiceWorker;

// Default config
self.__uv$config = {
  prefix: '/service/',
  encodeUrl: xor.encode,
  decodeUrl: xor.decode,
  handler: '/src/uv.handler.js',
  client: '/src/uv.client.js',
  bundle: '/src/uv.bundle.js',
  config: '/src/uv.config.js',
  sw: '/src/uv.sw.js',
};

console.log('TKHub: Ultraviolet bundle loaded');
