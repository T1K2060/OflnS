/**
 * Ultraviolet Client
 * Client-side URL rewriting and hooking
 */

(function() {
  'use strict';
  
  // Don't run multiple times
  if (window.__uvLoaded) return;
  window.__uvLoaded = true;
  
  // Get config from global
  const config = window.__uv$config || {
    prefix: '/service/',
    encodeUrl: (str) => {
      if (!str) return str;
      return encodeURIComponent(
        str
          .toString()
          .split('')
          .map((char, ind) =>
            ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char
          )
          .join('')
      );
    },
    decodeUrl: (str) => {
      if (!str) return str;
      let input = str;
      try {
        input = decodeURIComponent(str);
      } catch (e) {}
      return input
        .split('')
        .map((char, ind) =>
          ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char
        )
        .join('');
    }
  };
  
  const prefix = config.prefix;
  
  function encodeUrl(url) {
    try {
      return config.encodeUrl(url);
    } catch (e) {
      return url;
    }
  }
  
  function decodeUrl(url) {
    try {
      return config.decodeUrl(url);
    } catch (e) {
      return url;
    }
  }
  
  function rewriteUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    // Skip data URLs, javascript, and mailto
    if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
      return url;
    }
    
    // Skip relative paths (already rewritten in HTML)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Handle relative URLs
      if (url.startsWith('/')) {
        const currentOrigin = window.location.origin;
        return prefix + encodeUrl(currentOrigin + url);
      }
      return url;
    }
    
    return prefix + encodeUrl(url);
  }
  
  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    let url = input;
    if (typeof input === 'string') {
      url = rewriteUrl(input);
    } else if (input instanceof Request) {
      url = new Request(rewriteUrl(input.url), input);
    }
    return originalFetch.call(this, url, init);
  };
  
  // Override XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    xhr.open = function(method, url, async, user, password) {
      return originalOpen.call(this, method, rewriteUrl(url), async, user, password);
    };
    return xhr;
  };
  
  // Override WebSocket
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    return new originalWebSocket(rewriteUrl(url), protocols);
  };
  
  // Override EventSource
  const originalEventSource = window.EventSource;
  window.EventSource = function(url, options) {
    return new originalEventSource(rewriteUrl(url), options);
  };
  
  // Override window.open
  const originalOpen = window.open;
  window.open = function(url, target, features) {
    return originalOpen.call(this, rewriteUrl(url), target, features);
  };
  
  // Override history methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(state, title, url) {
    return originalPushState.call(this, state, title, url ? rewriteUrl(url) : url);
  };
  
  history.replaceState = function(state, title, url) {
    return originalReplaceState.call(this, state, title, url ? rewriteUrl(url) : url);
  };
  
  // Override location
  const originalLocation = window.location;
  let currentUrl = originalLocation.href;
  
  try {
    Object.defineProperty(window, 'location', {
      get: function() {
        return new Proxy(originalLocation, {
          get: function(target, prop) {
            if (prop === 'href') {
              // Try to decode the URL
              const encodedPart = target.href.split(prefix)[1];
              if (encodedPart) {
                return decodeUrl(decodeURIComponent(encodedPart));
              }
              return target.href;
            }
            return target[prop];
          },
          set: function(target, prop, value) {
            if (prop === 'href') {
              target.href = rewriteUrl(value);
              return true;
            }
            target[prop] = value;
            return true;
          }
        });
      },
      configurable: true
    });
  } catch (e) {
    console.log('UV: Could not override location');
  }
  
  // Override document methods that create elements
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    // Hook src and href setters
    if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'img' || 
        tagName.toLowerCase() === 'iframe' || tagName.toLowerCase() === 'link') {
      
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' || name === 'href' || name === 'action') {
          value = rewriteUrl(value);
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  // Override link click handlers
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.startsWith(window.location.origin + prefix)) {
      if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
        link.href = rewriteUrl(link.href);
      }
    }
  }, true);
  
  // Override form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.action) {
      form.action = rewriteUrl(form.action);
    }
  }, true);
  
  console.log('TKHub: Ultraviolet client loaded');
})();
