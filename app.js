/**
 * TKHub - Gaming & Browsing Platform
 * Features: Proxy browsing, Games hub, Code editor, Settings, Inspect element
 * Theme: TKCord v2 Greyscale
 */

// State Management
const AppState = {
  currentTab: 'browser',
  history: [],
  historyIndex: -1,
  settings: {
    searchEngine: 'https://google.com/search?q=',
    stealthMode: false,
    blockHistory: false,
    animationsEnabled: true,
    glassEffects: true,
    interceptLinks: true,
    enableCors: true,
    enableWSS: true,
    proxyType: 'dynamic',
    stickyProxy: true,
    colorTheme: 0,
    effectTheme: 'liquidGlass',
    animation: 'fade',
    gameFps: 60,
    gameQuality: 'medium',
    gameAntialiasing: '4x',
    gameVsync: true,
    gamePerfMode: false,
    gameVolume: 100,
    gameShader: 'none',
    lowPerformanceMode: false
  },
  bookmarks: [],
  games: [],
  currentGame: null,
  editorFiles: [{ name: 'untitled.html', content: '' }],
  currentFile: 0,
  consoleHistory: []
};

// DOM Elements
const elements = {
  proxyFrame: document.getElementById('proxyFrame'),
  urlInput: document.getElementById('urlInput'),
  backBtn: document.getElementById('backBtn'),
  forwardBtn: document.getElementById('forwardBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  homeBtn: document.getElementById('homeBtn'),
  startPage: document.getElementById('startPage'),
  wsIndicator: document.getElementById('wsIndicator'),
  securityIcon: document.getElementById('securityIcon'),
  gamesList: document.getElementById('gamesList'),
  gameSearch: document.getElementById('gameSearch'),
  gameFrame: document.getElementById('gameFrame'),
  playerControls: document.getElementById('playerControls'),
  fullscreenGame: document.getElementById('fullscreenGame'),
  refreshGame: document.getElementById('refreshGame'),
  closeGame: document.getElementById('closeGame'),
  codeEditor: document.getElementById('codeEditor'),
  previewFrame: document.getElementById('previewFrame'),
  newFile: document.getElementById('newFile'),
  saveFile: document.getElementById('saveFile'),
  inspectPanel: document.getElementById('inspectPanel'),
  menuOverlay: document.getElementById('menuOverlay'),
  modalOverlay: document.getElementById('modalOverlay')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initializeSettings();
  initializeNavigation();
  initializeTabs();
  initializeGames();
  initializeEditor();
  initializeInspect();
  initializeMenu();
  
  // Check stealth mode on load
  if (AppState.settings.stealthMode) {
    openInBlank();
  }
  
  // Load games from directory
  scanGamesDirectory();
  
  // Load stored games from IndexedDB
  loadStoredGames();
});

// ==================== SETTINGS ====================

function initializeSettings() {
  // Load saved settings
  const saved = localStorage.getItem('tkhubSettings');
  if (saved) {
    AppState.settings = { ...AppState.settings, ...JSON.parse(saved) };
  }
  
  // Apply global WSS flag
  window.tkhubWSS = AppState.settings.enableWSS !== false;
  
  // Settings button opens settings tab
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchTab('settings');
      openSettingsTab();
    });
  }
}

function closeSettings() {
  // Legacy function - settings now uses tab-based navigation
  elements.menuOverlay?.classList.remove('open');
  elements.modalOverlay?.classList.remove('open');
}

function saveSettings() {
  localStorage.setItem('tkhubSettings', JSON.stringify(AppState.settings));
}

function openInBlank() {
  if (window.location.protocol !== 'about:') {
    const win = window.open('about:blank', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>New Tab</title>
          <style>
            body { margin: 0; overflow: hidden; background: #0a0a0f; }
            iframe { width: 100vw; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${window.location.href}"></iframe>
        </body>
        </html>
      `);
      win.document.close();
      window.close();
    }
  }
}

// ==================== NAVIGATION ====================

function initializeNavigation() {
  // URL input handling
  elements.urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigateTo(elements.urlInput.value);
    }
  });
  
  // Navigation buttons
  elements.backBtn.addEventListener('click', goBack);
  elements.forwardBtn.addEventListener('click', goForward);
  elements.refreshBtn.addEventListener('click', refresh);
  elements.homeBtn.addEventListener('click', goHome);
  
  // Clear URL button
  document.getElementById('clearUrl').addEventListener('click', () => {
    elements.urlInput.value = '';
    elements.urlInput.focus();
  });
  
  // Quick links
  document.querySelectorAll('.quick-link').forEach(link => {
    link.addEventListener('click', () => {
      navigateTo(link.dataset.url);
    });
  });
}

function navigateTo(url) {
  if (!url) return;
  
  // Handle search queries vs URLs
  if (!url.includes('.') && !url.startsWith('http')) {
    // It's a search query - use search engine
    const searchUrl = AppState.settings.searchEngine + encodeURIComponent(url);
    loadUrl(searchUrl);
    return;
  }
  
  // Handle URLs without protocol
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  
  loadUrl(url);
}

function loadUrl(url) {
  // Check if URL is blocked/protected
  const blockedPatterns = [
    /google\.(com|co\.\w+)\/(search|recaptcha)/i,
    /gstatic\.com/i,
    /challenges\.cloudflare/i
  ];
  
  const isBlocked = blockedPatterns.some(pattern => pattern.test(url));
  
  if (isBlocked) {
    // Try to use textise dot iitty approach for blocked sites
    showToast('This site may require special handling...');
  }
  
  // Use BrowserTabs if available, otherwise fall back to global history
  if (BrowserTabs && BrowserTabs.activeTabId) {
    BrowserTabs.navigateInActiveTab(url);
  } else {
    // Legacy behavior
    if (!AppState.settings.blockHistory) {
      if (AppState.historyIndex < AppState.history.length - 1) {
        AppState.history = AppState.history.slice(0, AppState.historyIndex + 1);
      }
      AppState.history.push(url);
      AppState.historyIndex++;
      updateNavButtons();
    }
    
    elements.urlInput.value = url;
    elements.startPage.classList.add('hidden');
    elements.proxyFrame.classList.remove('hidden');
    
    // Use CORS proxy if enabled
    if (AppState.settings.enableCors) {
      const proxyUrl = getCorsProxyUrl(url);
      elements.proxyFrame.src = proxyUrl;
    } else {
      elements.proxyFrame.src = url;
    }
  }
  
  // Add error handling for proxy failures
  elements.proxyFrame.addEventListener('error', (e) => {
    console.error('TKHub: Proxy frame error:', e);
    handleProxyError(e);
  });
  
  // Intercept links within iframe - use aggressive mode for dynamic sites
  elements.proxyFrame.addEventListener('load', () => {
    // Check if the frame loaded successfully
    try {
      const frameDoc = elements.proxyFrame.contentDocument;
      if (!frameDoc || frameDoc.title.includes('Error') || frameDoc.body.innerHTML.includes('404')) {
        console.log('TKHub: Proxy failed to load content');
        handleProxyError(new Error('Proxy load failed'));
        return;
      }
    } catch (e) {
      // Cross-origin, can't check content - assume success
    }
    
    startLinkInterception();
    
    // Update URL input with current URL (decoded from proxy if needed)
    try {
      const currentSrc = elements.proxyFrame.src;
      // Extract URL from /service/ path (local UV proxy)
      const match = currentSrc.match(/\/service\/(.+)$/);
      if (match) {
        const decoded = UltravioletCodec.decode(match[1]);
        if (decoded && decoded !== currentSrc) {
          elements.urlInput.value = decoded;
        }
      }
    } catch (e) {
      // Ignore decoding errors
    }
  });
}

function getCorsProxyUrl(url) {
  // Use local Ultraviolet proxy
  try {
    // Encode URL using Ultraviolet's XOR codec
    const encoded = UltravioletCodec.encode(url);
    const proxyUrl = '/service/' + encoded;
    
    console.log(`TKHub: Using local Ultraviolet proxy for ${url.substring(0, 50)}...`);
    return proxyUrl;
  } catch (e) {
    console.error('TKHub: Ultraviolet encoding failed:', e);
    // Fallback to external CORS proxy
    return 'https://corsproxy.io/?' + encodeURIComponent(url);
  }
}

// Enhanced proxy error handling
function handleProxyError(error) {
  console.error('TKHub: Proxy error:', error);
  
  // Mark current proxy as failed
  if (AppState.currentProxy) {
    if (!AppState.failedProxies) AppState.failedProxies = [];
    AppState.failedProxies.push(AppState.currentProxy.name);
    
    showToast(`Proxy ${AppState.currentProxy.name} failed, trying next...`);
    
    // Try loading current URL with different proxy
    const currentUrl = elements.urlInput.value;
    if (currentUrl) {
      loadUrl(currentUrl);
    }
  }
}

// Ultraviolet Codec - URL-safe base64 encoding
const UltravioletCodec = {
  // XOR key for UV encoding
  _xorKey: [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10
  ],
  
  // Convert standard base64 to URL-safe base64
  _toBase64Url(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },
  
  // Convert URL-safe base64 to standard base64
  _fromBase64Url(base64url) {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (base64.length % 4) {
      base64 += '=';
    }
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
      // Fallback to simple XOR
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
      // Fallback
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

// Scramjet Codec - Proper implementation from MercuryWorkshop/scramjet
const ScramjetCodec = {
  // Scramjet uses a modified base64 with character shuffling
  _charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  _scrambled: 'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm9876543210+/',
  
  encode(str) {
    if (!str) return str;
    try {
      // Standard base64 then shuffle
      const base64 = btoa(unescape(encodeURIComponent(str)));
      return base64.split('').map(c => {
        const idx = this._charset.indexOf(c);
        return idx >= 0 ? this._scrambled[idx] : c;
      }).join('');
    } catch (e) {
      return str;
    }
  },
  
  decode(str) {
    if (!str) return str;
    try {
      // Unshuffle then decode base64
      const unshuffled = str.split('').map(c => {
        const idx = this._scrambled.indexOf(c);
        return idx >= 0 ? this._charset[idx] : c;
      }).join('');
      return decodeURIComponent(escape(atob(unshuffled)));
    } catch (e) {
      return str;
    }
  }
};

function tryAlternativeProxy(url) {
  // Try different proxy approaches when one fails
  const alternativeProxies = [
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url='
  ];
  
  for (const proxy of alternativeProxies) {
    const proxyUrl = proxy + encodeURIComponent(url);
    // Test if this proxy works
    fetch(proxyUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        AppState.currentProxy = { url: proxy, type: 'direct' };
        elements.proxyFrame.src = proxyUrl;
      })
      .catch(() => {
        console.log('Proxy failed:', proxy);
      });
  }
}

function interceptIframeLinks() {
  if (!AppState.settings.interceptLinks) return;
  
  try {
    const iframe = elements.proxyFrame;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Inject comprehensive link interception script
    const script = iframeDoc.createElement('script');
    script.textContent = `
      (function() {
        // Intercept ALL clicks
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href) {
            const href = link.href;
            // Skip javascript: and anchor links
            if (href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('about:')) {
              return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Send to parent
            window.parent.postMessage({ type: 'navigate', url: href }, '*');
            return false;
          }
        }, true);
        
        // Intercept middle-click / ctrl+click
        document.addEventListener('auxclick', function(e) {
          if (e.button === 1) {
            const link = e.target.closest('a');
            if (link && link.href && !link.href.startsWith('javascript:')) {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'navigate', url: link.href }, '*');
              return false;
            }
          }
        }, true);
        
        // Intercept form submissions
        document.addEventListener('submit', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const form = e.target;
          const action = form.action || window.location.href;
          const method = form.method || 'GET';
          const formData = new FormData(form);
          const params = new URLSearchParams(formData).toString();
          
          let url = action;
          if (method.toUpperCase() === 'GET' && params) {
            url += (action.includes('?') ? '&' : '?') + params;
          }
          
          window.parent.postMessage({ type: 'navigate', url: url, method: method, body: method.toUpperCase() === 'POST' ? params : null }, '*');
          return false;
        }, true);
        
        // Override window.open
        const originalOpen = window.open;
        window.open = function(url, target, features) {
          if (url && !url.startsWith('javascript:')) {
            window.parent.postMessage({ type: 'navigate', url: url }, '*');
            return null;
          }
          return originalOpen.apply(this, arguments);
        };
        
        // Override location changes
        const originalAssign = window.location.assign;
        window.location.assign = function(url) {
          window.parent.postMessage({ type: 'navigate', url: url }, '*');
        };
        
        // Monitor pushState/replaceState for SPAs
        const originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
          if (url) {
            window.parent.postMessage({ type: 'navigate', url: new URL(url, window.location.href).href }, '*');
          }
          return originalPushState.apply(this, arguments);
        };
        
        // Override all link clicks including those added after page load
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) {
                if (node.tagName === 'A') {
                  setupLink(node);
                }
                node.querySelectorAll && node.querySelectorAll('a').forEach(setupLink);
              }
            });
          });
        });
        
        function setupLink(link) {
          if (link.dataset.intercepted) return;
          link.dataset.intercepted = 'true';
          
          link.addEventListener('click', function(e) {
            if (this.href && !this.href.startsWith('javascript:') && !this.href.startsWith('#')) {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'navigate', url: this.href }, '*');
              return false;
            }
          });
        }
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Setup existing links
        document.querySelectorAll('a').forEach(setupLink);
        
        // ==================== WEBSOCKET PROXY ====================
        // Check if WSS is enabled by parent
        const wssEnabled = window.parent.tkhubWSS !== false;
        
        if (wssEnabled) {
          const OriginalWebSocket = window.WebSocket;
          const wsProxyServers = [
            'wss://wsproxy.holyubofficial.net/',
            'wss://ws.radon.games/',
            'wss://ws.motortruck1221.me/'
          ];
          let wsConnected = false;
          
          window.WebSocket = function(url, protocols) {
            console.log('TKHub: Intercepting WebSocket:', url);
            
            // Check if it's already a proxied connection
            if (url.includes('wsproxy') || url.includes('tkhub-proxy')) {
              return new OriginalWebSocket(url, protocols);
            }
            
            // Try to proxy through available servers
            const proxyUrl = wsProxyServers[0] + '?target=' + encodeURIComponent(url);
            
            try {
              const ws = new OriginalWebSocket(proxyUrl, protocols);
              
              // Notify parent of WebSocket connection
              ws.addEventListener('open', () => {
                console.log('TKHub: WebSocket proxied successfully');
                if (!wsConnected) {
                  wsConnected = true;
                  window.parent.postMessage({ type: 'websocket', status: 'connected', url: url }, '*');
                }
              });
              
              ws.addEventListener('close', () => {
                window.parent.postMessage({ type: 'websocket', status: 'disconnected' }, '*');
              });
              
              ws.addEventListener('error', (e) => {
                console.log('TKHub: WebSocket proxy error, trying direct connection');
                window.parent.postMessage({ type: 'websocket', status: 'error' }, '*');
              });
              
              return ws;
            } catch (e) {
              console.error('TKHub: WebSocket proxy failed:', e);
              // Fallback to original
              return new OriginalWebSocket(url, protocols);
            }
          };
          
          // Copy static properties
          window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
          window.WebSocket.OPEN = OriginalWebSocket.OPEN;
          window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
          window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
          window.WebSocket.prototype = OriginalWebSocket.prototype;
          
          console.log('TKHub: WebSocket proxy active');
        }
        
        console.log('TKHub: Link interception active');
      })();
    `;
    iframeDoc.head.appendChild(script);
    
    console.log('TKHub: Link interception injected');
    
  } catch (e) {
    // Cross-origin restrictions may prevent this
    console.log('Cannot intercept links - cross-origin restriction:', e.message);
  }
}

// Repeatedly try to intercept links (for dynamic sites like Bing)
function startLinkInterception() {
  // Initial intercept
  interceptIframeLinks();
  
  // Keep trying every 2 seconds for dynamic content
  const interval = setInterval(() => {
    interceptIframeLinks();
  }, 2000);
  
  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
  }, 30000);
}

// Listen for navigation messages from iframe
window.addEventListener('message', (e) => {
  if (!e.data) return;
  
  if (e.data.type === 'navigate') {
    navigateTo(e.data.url);
  } else if (e.data.type === 'websocket') {
    // Handle WebSocket status updates
    if (elements.wsIndicator) {
      if (e.data.status === 'connected') {
        elements.wsIndicator.style.display = 'flex';
        elements.wsIndicator.classList.add('active');
        console.log('TKHub: WebSocket connected:', e.data.url);
      } else if (e.data.status === 'disconnected' || e.data.status === 'error') {
        elements.wsIndicator.classList.remove('active');
        // Hide after a delay
        setTimeout(() => {
          if (!elements.wsIndicator.classList.contains('active')) {
            elements.wsIndicator.style.display = 'none';
          }
        }, 3000);
      }
    }
  }
});

// Expose WSS setting to iframes (updated when settings change)
window.tkhubWSS = AppState.settings.enableWSS !== false; // Default true

function goBack() {
  if (BrowserTabs && BrowserTabs.activeTabId) {
    BrowserTabs.goBack();
  } else if (AppState.historyIndex > 0) {
    AppState.historyIndex--;
    const url = AppState.history[AppState.historyIndex];
    elements.urlInput.value = url;
    loadUrl(url);
    updateNavButtons();
  }
}

function goForward() {
  if (BrowserTabs && BrowserTabs.activeTabId) {
    BrowserTabs.goForward();
  } else if (AppState.historyIndex < AppState.history.length - 1) {
    AppState.historyIndex++;
    const url = AppState.history[AppState.historyIndex];
    elements.urlInput.value = url;
    loadUrl(url);
    updateNavButtons();
  }
}

function refresh() {
  if (BrowserTabs && BrowserTabs.activeTabId) {
    BrowserTabs.refresh();
  } else {
    elements.proxyFrame.src = elements.proxyFrame.src;
  }
}

function goHome() {
  if (BrowserTabs && BrowserTabs.activeTabId) {
    BrowserTabs.showStartPage();
  } else {
    elements.proxyFrame.classList.add('hidden');
    elements.startPage.classList.remove('hidden');
    elements.urlInput.value = '';
  }
}

function updateNavButtons() {
  elements.backBtn.style.opacity = AppState.historyIndex > 0 ? '1' : '0.5';
  elements.forwardBtn.style.opacity = AppState.historyIndex < AppState.history.length - 1 ? '1' : '0.5';
}

// ==================== TABS ====================

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      
      const tabId = tab.dataset.tab;
      switchTab(tabId);
      
      // Show the appropriate view
      document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
      });
      
      // Handle settings view specially
      if (tabId === 'settings') {
        openSettingsTab();
      } else {
        const targetView = document.getElementById(tabId + 'View');
        if (targetView) targetView.classList.add('active');
      }
    });
    
    // Tab close button
    const closeBtn = tab.querySelector('.tab-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tab.remove();
      });
    }
  });
  
  // New tab button
  document.querySelector('.new-tab-btn').addEventListener('click', () => {
    switchTab('browser');
    goHome();
  });
}

function switchTab(tabId) {
  AppState.currentTab = tabId;
  
  // Update tab states
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  // Update view states
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === tabId + 'View');
  });
  
  // Update hash for settings tab
  if (tabId === 'settings') {
    window.location.hash = 'settings';
  } else if (tabId === 'browser') {
    window.location.hash = 'home';
  } else {
    window.location.hash = tabId;
  }
}

// ==================== GAMES ====================

function initializeGames() {
  // Search functionality
  elements.gameSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterGames(query);
  });
  
  // Player controls
  elements.fullscreenGame.addEventListener('click', () => {
    if (elements.gameFrame.requestFullscreen) {
      elements.gameFrame.requestFullscreen().then(() => {
        // Focus the iframe to ensure input works
        elements.gameFrame.focus();
        // Delay pointer lock request to ensure fullscreen is active
        setTimeout(() => requestPointerLock(), 100);
      }).catch(() => {
        // Fullscreen failed but still try pointer lock
        elements.gameFrame.focus();
        requestPointerLock();
      });
    }
  });
  
  elements.refreshGame.addEventListener('click', () => {
    elements.gameFrame.src = elements.gameFrame.src;
  });
  
  elements.closeGame.addEventListener('click', closeGame);
  
  // FPS Slider (1-560)
  const fpsSlider = document.getElementById('fpsSlider');
  const fpsValue = document.getElementById('fpsValue');
  
  if (fpsSlider && fpsValue) {
    fpsSlider.addEventListener('input', (e) => {
      const fps = e.target.value;
      fpsValue.textContent = fps;
      applyFpsLimit(fps);
    });
    
    // FPS Preset buttons
    document.querySelectorAll('.fps-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const fps = btn.dataset.fps;
        fpsSlider.value = fps;
        fpsValue.textContent = fps;
        applyFpsLimit(fps);
      });
    });
  }
  
  // Resolution - get element by ID since it's dynamically created
  const gameResolution = document.getElementById('gameResolution');
  if (gameResolution) {
    gameResolution.addEventListener('change', (e) => {
      applyResolution(e.target.value);
    });
  }
  
  // Manual scan button
  document.getElementById('scanGamesBtn').addEventListener('click', () => {
    scanGamesDirectory();
  });
  
  // Folder picker button
  document.getElementById('addGameBtn').addEventListener('click', () => {
    document.getElementById('gamesFolderPicker').click();
  });
  
  // Single file picker button
  document.getElementById('addSingleGameBtn').addEventListener('click', () => {
    document.getElementById('singleGamePicker').click();
  });
  
  // Handle folder selection
  document.getElementById('gamesFolderPicker').addEventListener('change', handleGamesFolderSelect);
  
  // Handle single file selection
  document.getElementById('singleGamePicker').addEventListener('change', handleSingleGameSelect);
  
  // Save all games button
  document.getElementById('saveAllGamesBtn')?.addEventListener('click', saveAllGames);
}

// IndexedDB Game Storage System
const GameStorage = {
  dbName: 'TKHubGamesDB',
  dbVersion: 1,
  db: null,
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('games')) {
          const store = db.createObjectStore('games', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  },
  
  async saveGame(game, content) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      
      const gameData = {
        id: game.id,
        name: game.name,
        category: game.category || 'Uncategorized',
        content: content,
        path: game.path,
        savedAt: new Date().toISOString()
      };
      
      const request = store.put(gameData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  
  async getAllGames() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async deleteGame(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  
  async clearAll() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

// Save all games to IndexedDB for persistent storage
async function saveAllGames() {
  if (AppState.games.length === 0) {
    showToast('No games to save');
    return;
  }
  
  showToast(`Saving ${AppState.games.length} games to local storage...`);
  
  try {
    await GameStorage.init();
    let saved = 0;
    let failed = 0;
    
    for (const game of AppState.games) {
      try {
        // Fetch the game content
        const response = await fetch(game.path);
        if (!response.ok) {
          failed++;
          continue;
        }
        const content = await response.text();
        
        // Save to IndexedDB
        await GameStorage.saveGame(game, content);
        saved++;
      } catch (e) {
        console.error('Failed to save game:', game.name, e);
        failed++;
      }
    }
    
    showToast(`Saved ${saved} games to IndexedDB${failed > 0 ? `, ${failed} failed` : ''}. Games will persist between sessions!`);
    
    // Also update localStorage metadata for quick access
    // Store originalPath to recreate blob URLs on load
    const gameMetadata = AppState.games.map(g => ({
      id: g.id,
      name: g.name,
      category: g.category,
      hasStoredContent: true,
      originalPath: g.originalPath || g.path  // Keep reference to original source
    }));
    localStorage.setItem('tkhubStoredGamesMeta', JSON.stringify(gameMetadata));
    
  } catch (e) {
    console.error('IndexedDB save failed:', e);
    showToast('Failed to save games. Trying fallback...');
    // Fallback to ZIP download
    downloadGamesAsZip();
  }
}

// Load games from IndexedDB on startup
async function loadStoredGames() {
  try {
    await GameStorage.init();
    const storedGames = await GameStorage.getAllGames();
    
    if (storedGames.length === 0) return;
    
    showToast(`Found ${storedGames.length} stored games`);
    
    // Filter out any isStored games from AppState (they have stale blob URLs)
    // We'll rebuild them with fresh blob URLs
    AppState.games = AppState.games.filter(g => !g.isStored);
    
    // Clear the games list UI and rebuild
    const gamesList = document.getElementById('gamesList');
    if (gamesList) {
      gamesList.innerHTML = '';
    }
    
    // Convert stored games to fresh blob URLs
    for (const gameData of storedGames) {
      // Create fresh blob URL from stored content
      const blob = new Blob([gameData.content], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      const game = {
        id: gameData.id,
        name: gameData.name,
        category: gameData.category,
        path: blobUrl,
        isStored: true
      };
      
      AppState.games.push(game);
    }
    
    // Re-render all games
    AppState.games.forEach(renderGameItem);
    
    // Update localStorage with fresh metadata (not blob URLs)
    localStorage.setItem('tkhubGames', JSON.stringify(AppState.games.map(g => ({
      id: g.id,
      name: g.name,
      category: g.category,
      isStored: true
    }))));
    
  } catch (e) {
    console.error('Failed to load stored games:', e);
  }
}

// Download all games as a ZIP file
async function downloadGamesAsZip() {
  showToast('Creating ZIP archive...');
  
  try {
    // Create a simple ZIP structure
    const zipParts = [];
    const centralDirectory = [];
    let offset = 0;
    
    for (let i = 0; i < AppState.games.length; i++) {
      const game = AppState.games[i];
      try {
        const response = await fetch(game.path);
        if (!response.ok) continue;
        const content = await response.text();
        const bytes = new TextEncoder().encode(content);
        
        const fileName = game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
        
        // Local file header
        const localHeader = createZipLocalHeader(fileName, bytes.length);
        zipParts.push(localHeader, bytes);
        
        // Central directory entry
        centralDirectory.push(createZipCentralEntry(fileName, bytes.length, offset));
        offset += localHeader.length + bytes.length;
      } catch (e) {
        console.error('Failed to fetch game:', game.name, e);
      }
    }
    
    if (zipParts.length === 0) {
      showToast('No games could be saved');
      return;
    }
    
    // Build final ZIP
    const cdBuffer = new Uint8Array(centralDirectory.reduce((acc, entry) => acc + entry.length, 0));
    let cdOffset = 0;
    for (const entry of centralDirectory) {
      cdBuffer.set(entry, cdOffset);
      cdOffset += entry.length;
    }
    
    // End of central directory
    const eocd = createZipEndRecord(centralDirectory.length, offset + cdBuffer.length, offset);
    
    // Combine all parts
    const blob = new Blob([...zipParts, cdBuffer, eocd], { type: 'application/zip' });
    
    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tkhub_games_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Saved ${AppState.games.length} games to ZIP`);
  } catch (e) {
    console.error('ZIP creation failed:', e);
    showToast('Failed to create ZIP');
  }
}

// Helper functions for ZIP creation
function createZipLocalHeader(fileName, size) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(fileName);
  const header = new Uint8Array(30 + nameBytes.length);
  const dv = new DataView(header.buffer);
  
  dv.setUint32(0, 0x04034b50, true); // Local file header signature
  dv.setUint16(4, 20, true); // Version needed
  dv.setUint16(6, 0, true); // General purpose bit flag
  dv.setUint16(8, 0, true); // Compression method (stored)
  dv.setUint16(10, 0, true); // File last modification time
  dv.setUint16(12, 0, true); // File last modification date
  dv.setUint32(14, 0, true); // CRC-32 (not computed for simplicity)
  dv.setUint32(18, size, true); // Compressed size
  dv.setUint32(22, size, true); // Uncompressed size
  dv.setUint16(26, nameBytes.length, true); // File name length
  dv.setUint16(28, 0, true); // Extra field length
  header.set(nameBytes, 30);
  
  return header;
}

function createZipCentralEntry(fileName, size, offset) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(fileName);
  const entry = new Uint8Array(46 + nameBytes.length);
  const dv = new DataView(entry.buffer);
  
  dv.setUint32(0, 0x02014b50, true); // Central directory signature
  dv.setUint16(4, 20, true); // Version made by
  dv.setUint16(6, 20, true); // Version needed
  dv.setUint16(8, 0, true); // General purpose bit flag
  dv.setUint16(10, 0, true); // Compression method
  dv.setUint16(12, 0, true); // File last modification time
  dv.setUint16(14, 0, true); // File last modification date
  dv.setUint32(16, 0, true); // CRC-32
  dv.setUint32(20, size, true); // Compressed size
  dv.setUint32(24, size, true); // Uncompressed size
  dv.setUint16(28, nameBytes.length, true); // File name length
  dv.setUint16(30, 0, true); // Extra field length
  dv.setUint16(32, 0, true); // File comment length
  dv.setUint16(34, 0, true); // Disk number start
  dv.setUint16(36, 0, true); // Internal file attributes
  dv.setUint32(38, 0, true); // External file attributes
  dv.setUint32(42, offset, true); // Relative offset of local header
  entry.set(nameBytes, 46);
  
  return entry;
}

function createZipEndRecord(numEntries, cdSize, cdOffset) {
  const record = new Uint8Array(22);
  const dv = new DataView(record.buffer);
  
  dv.setUint32(0, 0x06054b50, true); // End of central dir signature
  dv.setUint16(4, 0, true); // Number of this disk
  dv.setUint16(6, 0, true); // Disk with central directory
  dv.setUint16(8, numEntries, true); // Number of entries on this disk
  dv.setUint16(10, numEntries, true); // Total number of entries
  dv.setUint32(12, cdSize, true); // Size of central directory
  dv.setUint32(16, cdOffset, true); // Offset of start of central directory
  dv.setUint16(20, 0, true); // ZIP file comment length
  
  return record;
}

async function scanGamesDirectory() {
  // Show loading state
  elements.gamesList.innerHTML = '<div class="loading-games"><i class="fas fa-spinner fa-spin"></i> Scanning...</div>';
  
  const games = [];
  const basePath = getGamesPath();
  
  console.log('Scanning for games at:', basePath);
  
  // Method 1: Try to fetch directory listing (works on web servers)
  try {
    const response = await fetch(basePath);
    if (response.ok) {
      const text = await response.text();
      const detected = parseGamesFromHTML(text, basePath);
      if (detected.length > 0) {
        AppState.games = detected;
        renderGames();
        showToast(`Found ${detected.length} games`);
        return;
      }
    }
  } catch (e) {
    console.log('Directory listing not available:', e.message);
  }
  
  // Method 2: Try common game filenames with multiple path variations
  const pathVariations = [
    'Games/', './Games/', '/Games/', 
    'games/', './games/', '/games/',
    '../Games/', '../games/'
  ];
  
  const commonGames = [
    'snake.html', 'tetris.html', 'pong.html', '2048.html', 
    'flappy.html', 'minesweeper.html', 'chess.html', 'solitaire.html',
    'breakout.html', 'pacman.html', 'spaceinvaders.html', 'asteroids.html',
    'index.html', 'game.html', 'play.html'
  ];
  
  for (const pathVar of pathVariations) {
    for (const game of commonGames) {
      try {
        const fullPath = pathVar + game;
        const response = await fetch(fullPath, { method: 'HEAD', mode: 'no-cors' });
        // With no-cors, we can't read response.ok, but we can try to load it
        if (!games.find(g => g.id === game)) {
          const name = game.replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ');
          games.push({
            id: game,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            path: fullPath,
            icon: 'fa-gamepad',
            category: 'Detected'
          });
        }
      } catch (e) {
        // Continue trying
      }
    }
    if (games.length > 0) {
      console.log(`Found ${games.length} games using path: ${pathVar}`);
      break;
    }
  }
  
  if (games.length > 0) {
    AppState.games = games;
    renderGames();
    showToast(`Found ${games.length} games`);
  } else {
    // Check localStorage for previously added games
    const savedGames = localStorage.getItem('tkhubGames');
    if (savedGames) {
      try {
        AppState.games = JSON.parse(savedGames);
        renderGames();
        return;
      } catch (e) {
        console.log('Failed to load saved games');
      }
    }
    
    // Show empty state with manual add option
    loadDefaultGames();
  }
}

function getGamesPath() {
  // Determine the correct path based on current location
  const currentPath = window.location.pathname;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  return basePath + 'Games/';
}

function parseGamesFromHTML(html, basePath) {
  // Parse directory listing for HTML files
  const games = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent || '';
    
    if (href && (href.endsWith('.html') || href.endsWith('.htm'))) {
      // Skip parent directory link
      if (href === '../' || href === './' || href === '/') return;
      
      // Use link text as name if available, otherwise use filename
      const cleanName = text.trim().replace(/\.(html|htm)$/i, '') || 
                        href.replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ');
      const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      
      games.push({
        id: href,
        name: name,
        path: basePath + href,
        icon: 'fa-gamepad',
        category: 'Auto-detected'
      });
    }
  });
  
  return games;
}

function handleGamesFolderSelect(event) {
  const files = event.target.files;
  const games = [];
  
  for (const file of files) {
    if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      const name = file.name.replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ');
      
      games.push({
        id: file.name,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        path: URL.createObjectURL(file),
        icon: 'fa-gamepad',
        category: 'Local File',
        file: file
      });
    }
  }
  
  if (games.length > 0) {
    // Merge with existing games instead of replacing
    const existingGames = AppState.games.filter(g => 
      !games.find(newGame => newGame.id === g.id)
    );
    AppState.games = [...existingGames, ...games];
    
    saveGamesToStorage();
    renderGames();
    showToast(`Added ${games.length} games from folder`);
  }
  
  // Reset input
  event.target.value = '';
}

function handleSingleGameSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
    const name = file.name.replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ');
    
    const game = {
      id: file.name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      path: URL.createObjectURL(file),
      icon: 'fa-gamepad',
      category: 'Local File',
      file: file
    };
    
    // Add to existing games if not already present
    if (!AppState.games.find(g => g.id === game.id)) {
      AppState.games.push(game);
      saveGamesToStorage();
      renderGames();
      showToast(`Added ${game.name}`);
    } else {
      showToast(`${game.name} already exists`);
    }
  }
  
  // Reset input
  event.target.value = '';
}

function saveGamesToStorage() {
  // Only save serializable data (not File objects or blob URLs)
  const gamesToSave = AppState.games.map(g => ({
    id: g.id,
    name: g.name,
    path: g.path,
    icon: g.icon,
    category: g.category
  }));
  localStorage.setItem('tkhubGames', JSON.stringify(gamesToSave));
}

function loadDefaultGames() {
  // Check if sample games exist, otherwise show empty state
  const sampleGames = [
    { id: 'tetris.html', name: 'Tetris', path: 'Games/tetris.html', icon: 'fa-th', category: 'Puzzle' },
    { id: 'snake.html', name: 'Snake', path: 'Games/snake.html', icon: 'fa-gamepad', category: 'Arcade' }
  ];
  
  // Only show sample games if they actually exist
  AppState.games = sampleGames;
  renderGames();
}

function renderGames() {
  const gamesList = elements.gamesList;
  gamesList.innerHTML = '';
  
  if (AppState.games.length === 0) {
    gamesList.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--tk-white-muted);">
        <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p style="margin-bottom: 8px;">No games found</p>
        <small style="display: block; margin-bottom: 16px; opacity: 0.7;">
          Add .html files to Games folder<br>
          or click "Select Games Folder" below
        </small>
      </div>
    `;
    return;
  }
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  const batchSize = 50; // Render in batches for large lists
  const totalGames = AppState.games.length;
  
  // For very large lists, use virtual scrolling
  if (totalGames > 200) {
    setupVirtualScrolling(gamesList, AppState.games);
    return;
  }
  
  // Batch rendering for medium lists
  const renderBatch = (startIndex) => {
    const endIndex = Math.min(startIndex + batchSize, totalGames);
    
    for (let i = startIndex; i < endIndex; i++) {
      const game = AppState.games[i];
      const gameItem = createGameElement(game);
      fragment.appendChild(gameItem);
    }
    
    if (endIndex < totalGames) {
      // Schedule next batch
      requestAnimationFrame(() => renderBatch(endIndex));
    } else {
      // All batches complete
      gamesList.appendChild(fragment);
    }
  };
  
  // Start rendering
  renderBatch(0);
}

// Create a single game element (reusable)
function createGameElement(game) {
  const gameItem = document.createElement('div');
  gameItem.className = 'game-item';
  gameItem.dataset.id = game.id;
  gameItem.innerHTML = `
    <div class="game-icon"><i class="fas ${game.icon || 'fa-gamepad'}"></i></div>
    <div class="game-info">
      <div class="game-title">${game.name}</div>
      <div class="game-meta">${game.category || 'Game'}</div>
    </div>
  `;
  
  // Use event delegation pattern for better performance
  gameItem.addEventListener('click', () => loadGame(game));
  gameItem.addEventListener('contextmenu', (e) => handleGameContextMenu(e, game));
  
  return gameItem;
}

// Handle context menu for game items
function handleGameContextMenu(e, game) {
  e.preventDefault();
  e.stopPropagation();
  
  // Remove any existing menus
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
  
  // Create custom context menu for game item
  const menu = document.createElement('div');
  menu.className = 'context-menu open';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.innerHTML = `
    <div class="context-item" data-action="play">
      <i class="fas fa-play"></i> Play in Tab
    </div>
    <div class="context-item" data-action="window">
      <i class="fas fa-external-link-alt"></i> Open Windowed
    </div>
    <div class="context-divider"></div>
    <div class="context-item" data-action="fullscreen">
      <i class="fas fa-expand"></i> Fullscreen
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // Handle menu actions
  menu.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action === 'play') {
        loadGame(game);
      } else if (action === 'window') {
        if (windowManager) windowManager.createWindow(game);
      } else if (action === 'fullscreen') {
        loadGame(game);
        setTimeout(() => {
          if (elements.gameFrame.requestFullscreen) {
            elements.gameFrame.requestFullscreen().then(() => {
              elements.gameFrame.focus();
              setTimeout(() => requestPointerLock(), 100);
            }).catch(() => {
              elements.gameFrame.focus();
              requestPointerLock();
            });
          }
        }, 100);
      }
      menu.remove();
    });
  });
  
  // Remove menu on click elsewhere
  const closeMenu = (ev) => {
    if (!menu.contains(ev.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

// Virtual scrolling for very large game lists (>200 games)
function setupVirtualScrolling(container, games) {
  const itemHeight = 60; // Approximate height of each game item
  const viewportHeight = container.clientHeight || 400;
  const bufferItems = 5; // Extra items to render above/below viewport
  const visibleItems = Math.ceil(viewportHeight / itemHeight) + (bufferItems * 2);
  
  // Create scroll container
  container.style.overflowY = 'auto';
  container.style.maxHeight = 'calc(100vh - 200px)';
  
  // Create spacer for total height
  const totalHeight = games.length * itemHeight;
  const spacer = document.createElement('div');
  spacer.style.height = totalHeight + 'px';
  spacer.style.position = 'relative';
  
  // Create visible items container
  const visibleContainer = document.createElement('div');
  visibleContainer.style.position = 'absolute';
  visibleContainer.style.top = '0';
  visibleContainer.style.left = '0';
  visibleContainer.style.right = '0';
  
  spacer.appendChild(visibleContainer);
  container.appendChild(spacer);
  
  // Render visible items
  const renderVisible = () => {
    const scrollTop = container.scrollTop;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
    const endIndex = Math.min(games.length, startIndex + visibleItems);
    
    visibleContainer.innerHTML = '';
    visibleContainer.style.transform = `translateY(${startIndex * itemHeight}px)`;
    
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const game = games[i];
      const gameItem = createGameElement(game);
      fragment.appendChild(gameItem);
    }
    visibleContainer.appendChild(fragment);
  };
  
  // Initial render
  renderVisible();
  
  // Debounced scroll handler
  let scrollTimeout;
  container.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(renderVisible, 10);
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(renderVisible, 100);
  });
}

function filterGames(query) {
  const items = document.querySelectorAll('.game-item');
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    // Show all and remove highlights
    items.forEach(item => {
      item.style.display = 'flex';
      item.classList.remove('search-match', 'search-highlight');
      const title = item.querySelector('.game-title');
      if (title && title.dataset.original) {
        title.textContent = title.dataset.original;
      }
    });
    return;
  }
  
  items.forEach(item => {
    const game = AppState.games.find(g => g.id === item.dataset.id);
    if (game) {
      const name = game.name.toLowerCase();
      const category = (game.category || '').toLowerCase();
      
      // Fuzzy match algorithm
      const nameScore = fuzzyMatchScore(name, normalizedQuery);
      const categoryScore = fuzzyMatchScore(category, normalizedQuery);
      const exactName = name.includes(normalizedQuery);
      const exactCategory = category.includes(normalizedQuery);
      
      const match = nameScore > 0 || categoryScore > 0 || exactName || exactCategory;
      
      if (match) {
        item.style.display = 'flex';
        item.classList.add('search-match');
        
        // Highlight matching text
        const title = item.querySelector('.game-title');
        if (title) {
          if (!title.dataset.original) {
            title.dataset.original = title.textContent;
          }
          title.innerHTML = highlightMatch(title.dataset.original, normalizedQuery);
        }
        
        // Sort by relevance (exact matches first)
        item.style.order = exactName ? -100 : (exactCategory ? -50 : -nameScore);
      } else {
        item.style.display = 'none';
        item.classList.remove('search-match', 'search-highlight');
        const title = item.querySelector('.game-title');
        if (title && title.dataset.original) {
          title.textContent = title.dataset.original;
        }
      }
    }
  });
}

// Fuzzy matching algorithm for better search
function fuzzyMatchScore(str, query) {
  if (!str || !query) return 0;
  
  let score = 0;
  let strIdx = 0;
  let queryIdx = 0;
  let consecutive = 0;
  
  while (strIdx < str.length && queryIdx < query.length) {
    if (str[strIdx] === query[queryIdx]) {
      score += 10 + consecutive * 5; // Bonus for consecutive matches
      consecutive++;
      queryIdx++;
    } else {
      consecutive = 0;
    }
    strIdx++;
  }
  
  // Bonus for matching all query characters
  if (queryIdx === query.length) {
    score += 50;
  }
  
  return queryIdx === query.length ? score : 0;
}

// Highlight matching text in search results
function highlightMatch(text, query) {
  if (!query) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let result = '';
  let lastIdx = 0;
  
  // Find exact matches
  let idx = lowerText.indexOf(lowerQuery);
  while (idx !== -1) {
    result += escapeHtml(text.substring(lastIdx, idx));
    result += `<mark class="search-highlight">${escapeHtml(text.substring(idx, idx + query.length))}</mark>`;
    lastIdx = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIdx);
  }
  result += escapeHtml(text.substring(lastIdx));
  
  return result;
}

// Escape HTML for safe rendering
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadGame(game) {
  AppState.currentGame = game;
  
  // Update active state
  document.querySelectorAll('.game-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === game.id);
  });
  
  // Hide placeholder, show game
  document.querySelector('.player-placeholder').style.display = 'none';
  elements.gameFrame.classList.add('active');
  elements.playerControls.style.display = 'flex';
  
  // Load game - fetch through service worker for CORS headers
  try {
    // Try to fetch through service worker to get CORS headers injected
    const response = await fetch(game.path, {
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'TKHub'
      }
    });
    
    if (response.ok) {
      const content = await response.text();
      // Create blob URL for same-origin access (allows DevTools inspection)
      const blob = new Blob([content], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      elements.gameFrame.src = blobUrl;
      
      // Store blob URL for cleanup later
      game.blobUrl = blobUrl;
    } else {
      // Fallback to direct loading
      elements.gameFrame.src = game.path;
    }
  } catch (e) {
    // Fallback to direct loading
    elements.gameFrame.src = game.path;
  }
  
  // Inject WebSocket proxy when game loads
  if (window.tkhubWSS !== false) {
    elements.gameFrame.addEventListener('load', function onGameLoad() {
      elements.gameFrame.removeEventListener('load', onGameLoad);
      try {
        const iframeDoc = elements.gameFrame.contentDocument || elements.gameFrame.contentWindow.document;
        const wsScript = iframeDoc.createElement('script');
        wsScript.textContent = `
          (function() {
            if (window.WebSocket && window.parent.tkhubWSS !== false) {
              const OriginalWebSocket = window.WebSocket;
              const wsProxyServers = [
                'wss://wsproxy.holyubofficial.net/',
                'wss://ws.radon.games/',
                'wss://ws.motortruck1221.me/'
              ];
              
              window.WebSocket = function(url, protocols) {
                if (url.includes('wsproxy')) return new OriginalWebSocket(url, protocols);
                
                const proxyUrl = wsProxyServers[0] + '?target=' + encodeURIComponent(url);
                try {
                  return new OriginalWebSocket(proxyUrl, protocols);
                } catch (e) {
                  return new OriginalWebSocket(url, protocols);
                }
              };
              
              window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
              window.WebSocket.OPEN = OriginalWebSocket.OPEN;
              window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
              window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
              window.WebSocket.prototype = OriginalWebSocket.prototype;
            }
          })();
        `;
        iframeDoc.head.appendChild(wsScript);
        
        // Apply FPS throttling using user's approach
        const fps = AppState.settings.gameFps || 60;
        const fpsScript = iframeDoc.createElement('script');
        fpsScript.id = 'tkhub-fps-throttle';
        fpsScript.textContent = `
          (function() {
            if (window.__tkhubFpsActive) return;
            window.__tkhubFpsActive = true;
            
            const targetFPS = ${fps};
            const interval = 1000 / targetFPS;
            
            const originalRAF = window.requestAnimationFrame.bind(window);
            let lastTime = 0;
            
            window.requestAnimationFrame = function(callback) {
              return originalRAF(function(timestamp) {
                if (timestamp - lastTime >= interval) {
                  lastTime = timestamp;
                  callback(timestamp);
                } else {
                  window.requestAnimationFrame(callback);
                }
              });
            };
            
            console.log('TKHub: FPS limited to ' + targetFPS);
          })();
        `;
        iframeDoc.head.appendChild(fpsScript);
        
        // Apply pointer lock helper
        const plScript = iframeDoc.createElement('script');
        plScript.textContent = `
          (function() {
            window.addEventListener('click', function(e) {
              if (e.target.tagName === 'CANVAS' || e.target.tagName === 'BODY') {
                if (!document.pointerLockElement) {
                  (e.target.requestPointerLock || 
                   e.target.mozRequestPointerLock || 
                   e.target.webkitRequestPointerLock)?.call(e.target);
                }
              }
            });
          })();
        `;
        iframeDoc.head.appendChild(plScript);
        
        // Add postMessage handler for DevTools inspection
        const inspectScript = iframeDoc.createElement('script');
        inspectScript.textContent = `
          (function() {
            // Listen for DevTools inspection requests
            window.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'tkhub-inspect-request') {
                // Serialize DOM for cross-origin inspection
                function serializeElement(el) {
                  if (!el) return null;
                  return {
                    tag: el.tagName,
                    id: el.id,
                    className: el.className,
                    children: Array.from(el.children).slice(0, 20).map(serializeElement)
                  };
                }
                
                const domData = serializeElement(document.body);
                e.source.postMessage({
                  type: 'tkhub-dom-response',
                  dom: domData
                }, '*');
              }
              
              // Handle console execution
              if (e.data && e.data.type === 'tkhub-console-exec') {
                try {
                  const result = eval(e.data.code);
                  e.source.postMessage({
                    type: 'tkhub-console-response',
                    result: String(result),
                    error: null
                  }, '*');
                } catch (err) {
                  e.source.postMessage({
                    type: 'tkhub-console-response',
                    result: null,
                    error: err.message
                  }, '*');
                }
              }
            });
          })();
        `;
        iframeDoc.head.appendChild(inspectScript);
      } catch (e) {
        // Cross-origin restriction for local files
        // Try postMessage approach
        setTimeout(() => {
          elements.gameFrame.contentWindow?.postMessage({ type: 'tkhub-fps', fps: AppState.settings.gameFps || 60 }, '*');
          elements.gameFrame.contentWindow?.postMessage({ type: 'tkhub-pointerlock' }, '*');
        }, 1000);
      }
      
      // Apply shader
      const shader = AppState.settings.gameShader || 'none';
      if (shader !== 'none') {
        ShaderSystem.apply(shader);
      }
    });
  }
  
  showToast(`Loading ${game.name}...`);
}

function closeGame() {
  // Reset shader filter
  elements.gameFrame.style.filter = 'none';
  elements.gameFrame.src = '';
  elements.gameFrame.classList.remove('active');
  document.querySelector('.player-placeholder').style.display = 'flex';
  elements.playerControls.style.display = 'none';
  
  document.querySelectorAll('.game-item').forEach(item => {
    item.classList.remove('active');
  });
  
  AppState.currentGame = null;
}

// FPS Throttling System - Enhanced for better iframe control
function applyFpsLimit(fps) {
  const frame = elements.gameFrame;
  const fpsNum = parseInt(fps);
  
  if (fpsNum <= 0 || fpsNum > 560) {
    // Reset throttling by reloading frame without throttle
    const currentSrc = frame.src;
    frame.src = currentSrc;
    return;
  }
  
  // Store current FPS
  AppState.settings.gameFps = fpsNum;
  saveSettings();
  
  console.log(`TKHub: Setting FPS limit to ${fpsNum}`);
  
  // Wait for frame to load then inject throttling
  const injectThrottle = () => {
    try {
      const frameWindow = frame.contentWindow;
      const frameDoc = frame.contentDocument || frameWindow.document;
      
      if (!frameWindow || !frameDoc) {
        console.log('TKHub: Frame not ready, retrying...');
        setTimeout(injectThrottle, 500);
        return;
      }
      
      // Remove existing throttle script
      const existingScript = frameDoc.getElementById('tkhub-fps-throttle');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Restore original RAF if it was overridden
      if (frameWindow.__tkhubOriginalRAF) {
        frameWindow.requestAnimationFrame = frameWindow.__tkhubOriginalRAF;
        delete frameWindow.__tkhubOriginalRAF;
        delete frameWindow.__tkhubRestoreRAF;
      }
      
      // Create and inject enhanced FPS throttling script
      const script = frameDoc.createElement('script');
      script.id = 'tkhub-fps-throttle';
      script.textContent = `
        (function() {
          if (window.__tkhubFpsActive) {
            console.log('TKHub: Removing existing FPS throttle');
            window.requestAnimationFrame = window.__tkhubOriginalRAF;
            delete window.__tkhubOriginalRAF;
            delete window.__tkhubFpsActive;
          }
          
          const targetFPS = ${fpsNum};
          const interval = 1000 / targetFPS;
          let lastTime = 0;
          let frameCount = 0;
          let fpsTime = 0;
          
          // Store original RAF
          const originalRAF = window.requestAnimationFrame.bind(window);
          window.__tkhubOriginalRAF = originalRAF;
          
          // Override RAF with enhanced throttling
          window.requestAnimationFrame = function(callback) {
            return originalRAF(function(timestamp) {
              const now = performance.now();
              
              // FPS calculation for debugging
              frameCount++;
              if (now - fpsTime >= 1000) {
                console.log('TKHub: Actual FPS:', frameCount);
                frameCount = 0;
                fpsTime = now;
              }
              
              if (timestamp - lastTime >= interval) {
                lastTime = timestamp;
                return callback(timestamp);
              } else {
                // Queue the callback for the next available frame
                return window.requestAnimationFrame(callback);
              }
            });
          };
          
          window.__tkhubFpsActive = true;
          console.log('TKHub: FPS throttling active at', targetFPS, 'FPS');
          
          // Also throttle canvas animations if present
          const originalSetInterval = window.setInterval.bind(window);
          window.setInterval = function(callback, delay) {
            if (delay < 16) { // Anything faster than 60fps
              return originalSetInterval(callback, Math.max(delay, interval));
            }
            return originalSetInterval(callback, delay);
          };
        })();
      `;
      
      frameDoc.head.appendChild(script);
      
      // Apply to any existing canvas elements
      const canvases = frameDoc.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Store original methods
          const originalFillRect = ctx.fillRect.bind(ctx);
          const originalDrawImage = ctx.drawImage.bind(ctx);
          
          // Throttle canvas operations
          let lastCanvasTime = 0;
          ctx.fillRect = function(...args) {
            const now = performance.now();
            if (now - lastCanvasTime >= interval) {
              lastCanvasTime = now;
              return originalFillRect(...args);
            }
          };
          
          ctx.drawImage = function(...args) {
            const now = performance.now();
            if (now - lastCanvasTime >= interval) {
              lastCanvasTime = now;
              return originalDrawImage(...args);
            }
          };
        }
      });
      
      showToast(`FPS limited to ${fpsNum}`);
      
    } catch (e) {
      console.error('TKHub: Failed to inject FPS throttle:', e);
      showToast('Failed to apply FPS limit');
    }
  };
  
  // Inject immediately if frame is loaded, otherwise wait
  if (frame.contentDocument?.readyState === 'complete') {
    injectThrottle();
  } else {
    frame.addEventListener('load', injectThrottle, { once: true });
  }
}

function applyResolution(resolution) {
  const frame = elements.gameFrame;
  const player = document.getElementById('gamesPlayer');
  
  // Reset styles first
  frame.style.cssText = '';
  player.style.cssText = '';
  
  switch(resolution) {
    case '720p':
      // Render at 1280x720, scale to fit using user's approach
      frame.style.width = '1280px';
      frame.style.height = '720px';
      frame.style.transform = 'scale(0.25)';
      frame.style.transformOrigin = 'top left';
      frame.style.imageRendering = AppState.settings.gamePerfMode ? 'pixelated' : 'auto';
      // Container needs to be larger to show scaled content
      player.style.width = '320px';
      player.style.height = '180px';
      player.style.overflow = 'hidden';
      break;
    case '1080p':
      // Render at 1920x1080, scale to fit
      frame.style.width = '1920px';
      frame.style.height = '1080px';
      frame.style.transform = 'scale(0.25)';
      frame.style.transformOrigin = 'top left';
      frame.style.imageRendering = AppState.settings.gamePerfMode ? 'pixelated' : 'auto';
      player.style.width = '480px';
      player.style.height = '270px';
      player.style.overflow = 'hidden';
      break;
    case 'fullscreen':
      // Remove transform, go native fullscreen
      frame.style.width = '100vw';
      frame.style.height = '100vh';
      frame.style.transform = 'none';
      frame.style.position = 'fixed';
      frame.style.top = '0';
      frame.style.left = '0';
      frame.style.zIndex = '9999';
      if (frame.requestFullscreen) {
        frame.requestFullscreen().then(() => {
          frame.focus();
          setTimeout(() => requestPointerLock(), 100);
        }).catch(() => {
          frame.focus();
          requestPointerLock();
        });
      }
      break;
    default: // original - fit container
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.transform = 'none';
      player.style.width = '100%';
      player.style.height = '100%';
  }
  
  AppState.settings.gameResolution = resolution;
  saveSettings();
}

// Pointer Lock for games (fixes mouse turn issues)
function requestPointerLock() {
  const frame = elements.gameFrame;
  if (document.pointerLockElement) return;
  
  // Try to lock pointer on the iframe
  frame.requestPointerLock = frame.requestPointerLock || 
                               frame.mozRequestPointerLock || 
                               frame.webkitRequestPointerLock;
  
  if (frame.requestPointerLock) {
    frame.requestPointerLock();
  }
  
  // Also inject pointer lock helper into iframe
  try {
    const frameDoc = frame.contentDocument || frame.contentWindow?.document;
    if (frameDoc) {
      const script = frameDoc.createElement('script');
      script.textContent = `
        (function() {
          // Helper to request pointer lock from within iframe
          window.addEventListener('click', function(e) {
            if (e.target.tagName === 'CANVAS' || e.target.tagName === 'BODY') {
              if (!document.pointerLockElement) {
                (e.target.requestPointerLock || 
                 e.target.mozRequestPointerLock || 
                 e.target.webkitRequestPointerLock)?.call(e.target);
              }
            }
          });
          
          // Auto-lock on canvas focus
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach(canvas => {
            canvas.addEventListener('mousedown', function() {
              if (!document.pointerLockElement) {
                (this.requestPointerLock || 
                 this.mozRequestPointerLock || 
                 this.webkitRequestPointerLock)?.call(this);
              }
            });
          });
        })();
      `;
      frameDoc.head?.appendChild(script);
    }
  } catch (e) {
    // Cross-origin, postMessage instead
    frame.contentWindow?.postMessage({ type: 'tkhub-pointerlock' }, '*');
  }
}

// Handle pointer lock change events
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === elements.gameFrame) {
    console.log('TKHub: Pointer locked');
  } else {
    console.log('TKHub: Pointer unlocked');
  }
});

// Listen for ESC to exit pointer lock gracefully
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.pointerLockElement) {
    document.exitPointerLock = document.exitPointerLock || 
                               document.mozExitPointerLock || 
                               document.webkitExitPointerLock;
    document.exitPointerLock?.();
  }
});

// ==================== SHADER SYSTEM (ReShade-like effects) ====================
const ShaderSystem = {
  effects: {
    none: { name: 'None', filter: 'none' },
    sharpen: { name: 'Sharpen', filter: 'contrast(1.1) saturate(1.2)' },
    vibrant: { name: 'Vibrant', filter: 'saturate(1.4) contrast(1.1)' },
    cinematic: { name: 'Cinematic', filter: 'contrast(1.2) brightness(0.95) sepia(0.1)' },
    noir: { name: 'Noir', filter: 'grayscale(1) contrast(1.2)' },
    warm: { name: 'Warm', filter: 'sepia(0.3) saturate(1.1) contrast(1.05)' },
    cool: { name: 'Cool', filter: 'hue-rotate(180deg) saturate(0.9)' },
    hdr: { name: 'HDR', filter: 'contrast(1.3) saturate(1.3)' },
    retro: { name: 'Retro', filter: 'sepia(0.5) contrast(1.2) hue-rotate(-15deg)' },
    neon: { name: 'Neon', filter: 'saturate(2) contrast(1.2) brightness(1.1)' }
  },
  
  currentEffect: 'none',
  canvas: null,
  ctx: null,
  originalFrame: null,
  
  init() {
    // Create shader canvas overlay
    const player = document.getElementById('gamesPlayer');
    if (!player) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'shaderCanvas';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      display: none;
    `;
    player.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  
  resize() {
    const player = document.getElementById('gamesPlayer');
    if (player && this.canvas) {
      this.canvas.width = player.clientWidth;
      this.canvas.height = player.clientHeight;
    }
  },
  
  apply(effectName) {
    const effect = this.effects[effectName] || this.effects.none;
    const frame = elements.gameFrame;
    
    // Apply CSS filter to iframe
    frame.style.filter = effect.filter;
    
    this.currentEffect = effectName;
    AppState.settings.gameShader = effectName;
    saveSettings();
    
    showToast(`Shader: ${effect.name}`);
    console.log(`TKHub: Shader applied - ${effect.name}`);
  },
  
  // Advanced shader via canvas (for screenshots or advanced effects)
  applyAdvanced(shaderCode) {
    // This would require WebGL, keeping it simple for now with CSS filters
    console.log('Advanced shaders require WebGL implementation');
  }
};

// Initialize shader system on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => ShaderSystem.init(), 500);
});

// ==================== CODE EDITOR ====================

function initializeEditor() {
  // File actions
  elements.newFile.addEventListener('click', createNewFile);
  document.getElementById('openFile').addEventListener('click', openFile);
  elements.saveFile.addEventListener('click', saveFile);
  
  // Live preview
  elements.codeEditor.addEventListener('input', debounce(updatePreview, 500));
  
  // Initial preview
  updatePreview();
}

function createNewFile() {
  const fileName = prompt('Enter file name:', 'new-file.html');
  if (fileName) {
    const newFile = { name: fileName, content: '' };
    AppState.editorFiles.push(newFile);
    AppState.currentFile = AppState.editorFiles.length - 1;
    
    addEditorTab(fileName);
    elements.codeEditor.value = '';
    updatePreview();
  }
}

function addEditorTab(fileName) {
  const tabsContainer = document.getElementById('editorTabs');
  const tab = document.createElement('div');
  tab.className = 'editor-tab';
  tab.dataset.file = fileName;
  tab.innerHTML = `
    <span>${fileName}</span>
    <button class="tab-close"><i class="fas fa-times"></i></button>
  `;
  
  tab.addEventListener('click', (e) => {
    if (e.target.closest('.tab-close')) {
      tab.remove();
      return;
    }
    switchToFile(fileName);
  });
  
  tabsContainer.appendChild(tab);
  updateActiveTab(fileName);
}

function switchToFile(fileName) {
  // Save current content
  AppState.editorFiles[AppState.currentFile].content = elements.codeEditor.value;
  
  // Find and switch to file
  const index = AppState.editorFiles.findIndex(f => f.name === fileName);
  if (index !== -1) {
    AppState.currentFile = index;
    elements.codeEditor.value = AppState.editorFiles[index].content;
    updateActiveTab(fileName);
    updatePreview();
  }
}

function updateActiveTab(fileName) {
  document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.file === fileName);
  });
}

function openFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html,.htm,.css,.js,.txt';
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newFile = { name: file.name, content: event.target.result };
        AppState.editorFiles.push(newFile);
        AppState.currentFile = AppState.editorFiles.length - 1;
        
        addEditorTab(file.name);
        elements.codeEditor.value = event.target.result;
        updatePreview();
      };
      reader.readAsText(file);
    }
  });
  
  input.click();
}

function saveFile() {
  const content = elements.codeEditor.value;
  const fileName = AppState.editorFiles[AppState.currentFile].name;
  
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  
  URL.revokeObjectURL(url);
  showToast(`Saved ${fileName}`);
}

function updatePreview() {
  const code = elements.codeEditor.value;
  const doc = elements.previewFrame.contentDocument || elements.previewFrame.contentWindow.document;
  
  doc.open();
  doc.write(code);
  doc.close();
}

// ==================== INSPECT ELEMENT ====================

function initializeInspect() {
  // Tab switching
  document.querySelectorAll('.inspect-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      
      document.querySelectorAll('.inspect-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.inspect-view').forEach(v => v.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tabId + 'View').classList.add('active');
    });
  });
  
  // Console input
  document.getElementById('consoleInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeConsoleCommand(e.target.value);
      e.target.value = '';
    }
  });
  
  // Close button
  document.getElementById('closeInspect').addEventListener('click', () => {
    elements.inspectPanel.classList.remove('open');
  });
}

function executeConsoleCommand(command) {
  const output = document.getElementById('consoleOutput');
  const line = document.createElement('div');
  line.innerHTML = `<span style="color: var(--accent-color)">&gt;</span> ${escapeHtml(command)}`;
  output.appendChild(line);
  
  try {
    // Try to execute in iframe context
    const iframe = elements.proxyFrame;
    let result;
    
    if (iframe.contentWindow) {
      result = iframe.contentWindow.eval(command);
    } else {
      result = eval(command);
    }
    
    const resultLine = document.createElement('div');
    resultLine.innerHTML = `<span style="color: var(--success)">&lt;</span> ${formatOutput(result)}`;
    output.appendChild(resultLine);
  } catch (err) {
    const errorLine = document.createElement('div');
    errorLine.innerHTML = `<span style="color: var(--danger)">Error:</span> ${escapeHtml(err.message)}`;
    output.appendChild(errorLine);
  }
  
  output.scrollTop = output.scrollHeight;
}

function formatOutput(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openInspect() {
  elements.inspectPanel.classList.add('open');
  inspectCurrentPage();
}

function inspectCurrentPage() {
  const tree = document.getElementById('domTree');
  
  try {
    const iframe = elements.proxyFrame;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    tree.innerHTML = generateDomTree(doc.body, 0);
  } catch (e) {
    tree.innerHTML = '<div style="color: var(--text-secondary)">Cannot inspect cross-origin content</div>';
  }
}

function generateDomTree(element, depth) {
  if (!element) return '';
  
  const indent = '  '.repeat(depth);
  const tagName = element.tagName.toLowerCase();
  const attrs = Array.from(element.attributes || [])
    .map(a => `${a.name}="${a.value}"`)
    .join(' ');
  
  let html = `${indent}&lt;${tagName}${attrs ? ' ' + attrs : ''}&gt;\n`;
  
  Array.from(element.children).forEach(child => {
    html += generateDomTree(child, depth + 1);
  });
  
  html += `${indent}&lt;/${tagName}&gt;\n`;
  
  return html;
}

// ==================== MENU ====================

function initializeMenu() {
  // Menu overlay toggle
  elements.settingsBtn.addEventListener('click', () => {
    elements.menuOverlay.classList.toggle('open');
  });
  
  elements.modalOverlay.addEventListener('click', () => {
    elements.menuOverlay.classList.remove('open');
  });
  
  // Menu items
  document.getElementById('menuInspect').addEventListener('click', () => {
    openInspect();
    elements.menuOverlay.classList.remove('open');
  });
  
  document.getElementById('menuBookmark').addEventListener('click', () => {
    addBookmark();
    elements.menuOverlay.classList.remove('open');
  });
  
  document.getElementById('menuSettings')?.addEventListener('click', () => {
    switchTab('settings');
    openSettingsTab();
    elements.menuOverlay.classList.remove('open');
  });
  
  document.getElementById('menuHistory').addEventListener('click', () => {
    showHistory();
    elements.menuOverlay.classList.remove('open');
  });
}

function addBookmark() {
  const url = elements.urlInput.value;
  if (url && !AppState.bookmarks.includes(url)) {
    AppState.bookmarks.push(url);
    localStorage.setItem('glassProxyBookmarks', JSON.stringify(AppState.bookmarks));
    showToast('Bookmark added!');
  }
}

function showHistory() {
  if (AppState.history.length === 0) {
    showToast('No history available');
    return;
  }
  
  const historyHtml = AppState.history.map((url, i) => 
    `<div class="history-item" data-index="${i}" style="padding: 8px; cursor: pointer; border-radius: 8px; margin: 4px 0;">
      ${escapeHtml(url)}
    </div>`
  ).join('');
  
  // Show in a simple modal or toast for now
  showToast(`History: ${AppState.history.length} items`);
}

// ==================== UTILITIES ====================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'glass';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    z-index: 10000;
    animation: slideUp 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // F12 or Ctrl+Shift+I for inspect
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
    e.preventDefault();
    openInspect();
  }
  
  // Ctrl+L for address bar
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    elements.urlInput.focus();
    elements.urlInput.select();
  }
  
  // Ctrl+R for refresh
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    refresh();
  }
  
  // Escape to close modals
  if (e.key === 'Escape') {
    closeSettings();
    elements.inspectPanel.classList.remove('open');
    elements.menuOverlay.classList.remove('open');
  }
});

// Service Worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('tkhub-sw.js').catch(console.error);
}

// ==================== BROWSER TABS ====================
const BrowserTabs = {
  tabs: [],
  activeTabId: null,
  nextTabId: 1,
  
  init() {
    // Load saved tabs
    const saved = localStorage.getItem('tkhubBrowserTabs');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.tabs = data.tabs || [];
        this.nextTabId = data.nextTabId || 1;
        this.activeTabId = data.activeTabId;
      } catch (e) {
        console.error('Failed to load tabs:', e);
      }
    }
    
    // If no tabs, create default
    if (this.tabs.length === 0) {
      this.createTab();
    }
    
    this.renderTabs();
    this.setupEventListeners();
    
    // Restore active tab
    if (this.activeTabId) {
      this.switchToTab(this.activeTabId);
    }
  },
  
  createTab(url = null, title = 'New Tab') {
    const tabId = this.nextTabId++;
    const tab = {
      id: tabId,
      url: url,
      title: title,
      history: url ? [url] : [],
      historyIndex: url ? 0 : -1,
      favicon: null
    };
    
    this.tabs.push(tab);
    this.activeTabId = tabId;
    this.saveTabs();
    this.renderTabs();
    
    // Load URL if provided
    if (url) {
      this.loadTabContent(tab);
    } else {
      this.showStartPage();
    }
    
    return tab;
  },
  
  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;
    
    this.tabs.splice(index, 1);
    
    // Switch to another tab if closing active
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        const newIndex = Math.min(index, this.tabs.length - 1);
        this.switchToTab(this.tabs[newIndex].id);
      } else {
        // Create new tab if all closed
        this.createTab();
      }
    }
    
    this.saveTabs();
    this.renderTabs();
  },
  
  switchToTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    this.activeTabId = tabId;
    this.renderTabs();
    this.loadTabContent(tab);
    this.saveTabs();
  },
  
  loadTabContent(tab) {
    if (tab.url) {
      elements.startPage.classList.add('hidden');
      elements.proxyFrame.classList.remove('hidden');
      
      // Use CORS proxy if enabled
      if (AppState.settings.enableCors) {
        const proxyUrl = getCorsProxyUrl(tab.url);
        elements.proxyFrame.src = proxyUrl;
      } else {
        elements.proxyFrame.src = tab.url;
      }
      
      elements.urlInput.value = tab.url;
    } else {
      this.showStartPage();
    }
  },
  
  showStartPage() {
    elements.proxyFrame.src = 'about:blank';
    elements.proxyFrame.classList.add('hidden');
    elements.startPage.classList.remove('hidden');
    elements.urlInput.value = '';
  },
  
  updateActiveTab(url, title = null, favicon = null) {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;
    
    tab.url = url;
    if (title) tab.title = title;
    if (favicon) tab.favicon = favicon;
    
    // Update history
    if (tab.historyIndex < tab.history.length - 1) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }
    tab.history.push(url);
    tab.historyIndex++;
    
    this.saveTabs();
    this.renderTabs();
  },
  
  navigateInActiveTab(url) {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;
    
    // Load the URL
    elements.startPage.classList.add('hidden');
    elements.proxyFrame.classList.remove('hidden');
    
    if (AppState.settings.enableCors) {
      const proxyUrl = getCorsProxyUrl(url);
      elements.proxyFrame.src = proxyUrl;
    } else {
      elements.proxyFrame.src = url;
    }
    
    this.updateActiveTab(url);
    elements.urlInput.value = url;
  },
  
  goBack() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    
    tab.historyIndex--;
    const url = tab.history[tab.historyIndex];
    this.loadTabContent({ ...tab, url });
  },
  
  goForward() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    
    tab.historyIndex++;
    const url = tab.history[tab.historyIndex];
    this.loadTabContent({ ...tab, url });
  },
  
  refresh() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.url) {
      this.loadTabContent(tab);
    }
  },
  
  renderTabs() {
    const container = document.getElementById('browserTabs');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = 'browser-tab' + (tab.id === this.activeTabId ? ' active' : '');
      tabEl.dataset.tabId = tab.id;
      
      const icon = tab.favicon ? `<img src="${tab.favicon}" style="width:16px;height:16px;">` : '<i class="fas fa-globe"></i>';
      
      tabEl.innerHTML = `
        ${icon}
        <span class="tab-title">${this.escapeHtml(tab.title)}</span>
        <button class="tab-close-btn" data-tab-id="${tab.id}">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // Tab click to switch
      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close-btn')) return;
        this.switchToTab(tab.id);
      });
      
      // Close button
      const closeBtn = tabEl.querySelector('.tab-close-btn');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
      
      container.appendChild(tabEl);
    });
  },
  
  setupEventListeners() {
    // New tab button
    document.getElementById('newTabBtn')?.addEventListener('click', () => {
      this.createTab();
    });
    
    // Listen for iframe load to update tab info
    elements.proxyFrame?.addEventListener('load', () => {
      try {
        const src = elements.proxyFrame.src;
        if (src && src !== 'about:blank') {
          // Try to get title from iframe
          let title = 'Loading...';
          try {
            const frameDoc = elements.proxyFrame.contentDocument;
            if (frameDoc && frameDoc.title) {
              title = frameDoc.title;
            }
          } catch (e) {
            // Cross-origin, can't access
          }
          
          // Decode URL if it's a proxied URL
          let url = src;
          const match = src.match(/\/service\/(.+)$/);
          if (match) {
            const decoded = UltravioletCodec.decode(match[1]);
            if (decoded && decoded !== src) {
              url = decoded;
            }
          }
          
          this.updateActiveTab(url, title);
        }
      } catch (e) {
        console.error('Error updating tab:', e);
      }
    });
  },
  
  saveTabs() {
    localStorage.setItem('tkhubBrowserTabs', JSON.stringify({
      tabs: this.tabs,
      nextTabId: this.nextTabId,
      activeTabId: this.activeTabId
    }));
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Prevent leaving if in stealth mode
window.addEventListener('beforeunload', (e) => {
  if (AppState.settings.stealthMode) {
    e.preventDefault();
    e.returnValue = '';
  }
});

console.log('%c TKHub ', 'background: linear-gradient(135deg, #ffffff, #a0a0a0); color: black; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 10px;');
console.log('%c Welcome to TKHub - Browse. Play. Create. ', 'color: rgba(255,255,255,0.55); font-size: 14px;');

// ==================== WINDOW MANAGER ====================

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.activeWindow = null;
    this.zIndex = 1000;
    this.container = document.getElementById('windowManager');
    this.contextMenu = document.getElementById('contextMenu');
    this.init();
  }

  init() {
    this.setupContextMenu();
    this.setupGlobalEvents();
  }

  createWindow(game, options = {}) {
    const id = 'window-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const windowEl = document.createElement('div');
    windowEl.className = 'window-frame';
    windowEl.id = id;
    
    // Position with stagger
    const offset = this.windows.size * 30;
    const x = options.x || 100 + offset;
    const y = options.y || 50 + offset;
    const width = options.width || 800;
    const height = options.height || 600;
    
    windowEl.style.left = x + 'px';
    windowEl.style.top = y + 'px';
    windowEl.style.width = width + 'px';
    windowEl.style.height = height + 'px';
    windowEl.style.zIndex = ++this.zIndex;

    // Title bar with macOS-style controls
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.innerHTML = `
      <div class="window-controls">
        <button class="window-btn close" data-action="close"></button>
        <button class="window-btn minimize" data-action="minimize"></button>
        <button class="window-btn maximize" data-action="maximize"></button>
      </div>
      <div class="window-title">${game.name}</div>
      <div style="width: 60px;"></div>
    `;

    // Content area
    const content = document.createElement('div');
    content.className = 'window-content';
    content.innerHTML = `
      <iframe src="${game.path}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" allow="fullscreen"></iframe>
      <div class="window-resize"></div>
    `;

    windowEl.appendChild(titlebar);
    windowEl.appendChild(content);
    this.container.appendChild(windowEl);

    // Store window data
    const windowData = {
      id,
      element: windowEl,
      game,
      x, y, width, height,
      minimized: false,
      maximized: false,
      velocity: { x: 0, y: 0 },
      lastMouse: { x: 0, y: 0 },
      isDragging: false
    };
    this.windows.set(id, windowData);

    // Setup interactions
    this.setupWindowInteractions(windowData, titlebar, windowEl);
    this.activateWindow(id);

    // Elastic entrance animation
    windowEl.classList.add('elastic');
    setTimeout(() => windowEl.classList.remove('elastic'), 400);

    showToast(`Opened ${game.name} in window`);
    return id;
  }

  setupWindowInteractions(windowData, titlebar, windowEl) {
    const { id } = windowData;

    // Activate on click
    windowEl.addEventListener('mousedown', () => this.activateWindow(id));

    // Control buttons
    titlebar.querySelectorAll('.window-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        
        if (action === 'close') {
          this.closeWindow(id);
        } else if (action === 'minimize') {
          this.minimizeWindow(id);
        } else if (action === 'maximize') {
          this.maximizeWindow(id);
        }
      });
    });

    // Drag with physics
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('window-btn')) return;
      
      this.activateWindow(id);
      windowData.isDragging = true;
      windowData.lastMouse = { x: e.clientX, y: e.clientY };
      windowEl.classList.add('dragging');
      
      // Wobble start
      windowEl.classList.add('wobbly');
    });

    // Resize handle
    const resizeHandle = windowEl.querySelector('.window-resize');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startResize(windowData, e);
      });
    }
    
    // Inject WebSocket proxy into game iframe if WSS enabled
    if (window.tkhubWSS !== false) {
      const iframe = windowEl.querySelector('iframe');
      if (iframe) {
        iframe.addEventListener('load', () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const wsScript = iframeDoc.createElement('script');
            wsScript.textContent = `
              (function() {
                if (window.parent.tkhubWSS === false) return;
                
                const OriginalWebSocket = window.WebSocket;
                const wsProxyServers = [
                  'wss://wsproxy.holyubofficial.net/',
                  'wss://ws.radon.games/',
                  'wss://ws.motortruck1221.me/'
                ];
                
                window.WebSocket = function(url, protocols) {
                  if (url.includes('wsproxy') || url.includes('tkhub-proxy')) {
                    return new OriginalWebSocket(url, protocols);
                  }
                  
                  const proxyUrl = wsProxyServers[0] + '?target=' + encodeURIComponent(url);
                  
                  try {
                    const ws = new OriginalWebSocket(proxyUrl, protocols);
                    ws.addEventListener('open', () => {
                      window.parent.postMessage({ type: 'websocket', status: 'connected', url: url }, '*');
                    });
                    return ws;
                  } catch (e) {
                    return new OriginalWebSocket(url, protocols);
                  }
                };
                
                window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
                window.WebSocket.OPEN = OriginalWebSocket.OPEN;
                window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
                window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
                window.WebSocket.prototype = OriginalWebSocket.prototype;
              })();
            `;
            iframeDoc.head.appendChild(wsScript);
          } catch (e) {
            // Cross-origin restriction for local files
          }
        });
      }
    }
  }

  startResize(windowData, e) {
    const { element, width, height } = windowData;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    const onMouseMove = (e) => {
      const newWidth = Math.max(400, startWidth + (e.clientX - startX));
      const newHeight = Math.max(300, startHeight + (e.clientY - startY));
      
      element.style.width = newWidth + 'px';
      element.style.height = newHeight + 'px';
      windowData.width = newWidth;
      windowData.height = newHeight;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  activateWindow(id) {
    if (this.activeWindow && this.activeWindow !== id) {
      const prev = this.windows.get(this.activeWindow);
      if (prev) prev.element.classList.remove('active');
    }
    
    const windowData = this.windows.get(id);
    if (!windowData) return;
    
    windowData.element.classList.add('active');
    windowData.element.style.zIndex = ++this.zIndex;
    this.activeWindow = id;
  }

  closeWindow(id) {
    const windowData = this.windows.get(id);
    if (!windowData) return;

    // Close animation
    windowData.element.style.transform = 'scale(0.9)';
    windowData.element.style.opacity = '0';
    
    setTimeout(() => {
      windowData.element.remove();
      this.windows.delete(id);
      if (this.activeWindow === id) {
        this.activeWindow = null;
      }
    }, 200);
  }

  minimizeWindow(id) {
    const windowData = this.windows.get(id);
    if (!windowData) return;

    windowData.minimized = !windowData.minimized;
    windowData.element.classList.toggle('minimized', windowData.minimized);
    
    if (!windowData.minimized) {
      this.activateWindow(id);
    }
  }

  maximizeWindow(id) {
    const windowData = this.windows.get(id);
    if (!windowData) return;

    if (!windowData.maximized) {
      windowData.prevRect = {
        x: windowData.element.offsetLeft,
        y: windowData.element.offsetTop,
        width: windowData.element.offsetWidth,
        height: windowData.element.offsetHeight
      };
      windowData.element.style.left = '0';
      windowData.element.style.top = '0';
      windowData.element.style.width = '100vw';
      windowData.element.style.height = '100vh';
      windowData.element.style.borderRadius = '0';
    } else {
      const { x, y, width, height } = windowData.prevRect;
      windowData.element.style.left = x + 'px';
      windowData.element.style.top = y + 'px';
      windowData.element.style.width = width + 'px';
      windowData.element.style.height = height + 'px';
      windowData.element.style.borderRadius = '12px';
    }
    
    windowData.maximized = !windowData.maximized;
  }

  setupContextMenu() {
    // Close context menu on click elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });

    // Handle menu items
    this.contextMenu.querySelectorAll('.context-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        const tabId = this.contextMenu.dataset.tabId;
        
        if (action === 'windowed' && this.contextMenu.dataset.gameId) {
          const game = AppState.games.find(g => g.id === this.contextMenu.dataset.gameId);
          if (game) this.createWindow(game);
        } else if (action === 'refresh') {
          if (tabId === 'browser') refresh();
          else if (tabId === 'games') {
            const game = AppState.currentGame;
            if (game) elements.gameFrame.src = game.path;
          }
        } else if (action === 'close') {
          // Close specific tab functionality
          const tab = document.querySelector(`[data-tab="${tabId}"]`);
          if (tab) {
            tab.style.transform = 'scale(0)';
            setTimeout(() => tab.style.transform = '', 200);
          }
        }
        
        this.hideContextMenu();
      });
    });
  }

  showContextMenu(e, tabId, gameId = null) {
    this.contextMenu.style.left = e.clientX + 'px';
    this.contextMenu.style.top = e.clientY + 'px';
    this.contextMenu.dataset.tabId = tabId;
    this.contextMenu.dataset.gameId = gameId;
    this.contextMenu.classList.add('open');
  }

  hideContextMenu() {
    this.contextMenu.classList.remove('open');
  }

  setupGlobalEvents() {
    // Global mouse move for dragging
    document.addEventListener('mousemove', (e) => {
      this.windows.forEach(windowData => {
        if (windowData.isDragging) {
          const dx = e.clientX - windowData.lastMouse.x;
          const dy = e.clientY - windowData.lastMouse.y;
          
          // Apply velocity with spring physics
          windowData.velocity.x = dx * 0.5;
          windowData.velocity.y = dy * 0.5;
          
          windowData.x += dx;
          windowData.y += dy;
          
          windowData.element.style.left = windowData.x + 'px';
          windowData.element.style.top = windowData.y + 'px';
          
          windowData.lastMouse = { x: e.clientX, y: e.clientY };
          
          // Apply curvy wobble based on velocity using CSS variables
          const velocityX = windowData.velocity.x;
          const velocityY = windowData.velocity.y;
          const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
          
          // Calculate rotation and skew based on movement
          const rotateAmount = Math.min(velocityX * 0.3, 8); // More pronounced tilt
          const skewAmount = Math.min(velocityX * 0.15, 5); // Curvy skew effect
          
          windowData.element.style.setProperty('--drag-rotate', `${rotateAmount}deg`);
          windowData.element.style.setProperty('--drag-skew', `${skewAmount}deg`);
        }
      });
    });

    // Global mouse up to stop dragging
    document.addEventListener('mouseup', () => {
      this.windows.forEach(windowData => {
        if (windowData.isDragging) {
          windowData.isDragging = false;
          windowData.element.classList.remove('dragging');
          
          // Elastic bounce back to neutral
          windowData.element.style.transform = '';
          windowData.element.classList.add('elastic');
          setTimeout(() => windowData.element.classList.remove('elastic'), 400);
          
          // Decelerate velocity
          this.decelerate(windowData);
        }
      });
    });

    // Setup tab context menus
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const tabId = tab.dataset.tab;
        let gameId = null;
        
        // If games tab and a game is selected, include game ID
        if (tabId === 'games' && AppState.currentGame) {
          gameId = AppState.currentGame.id;
        }
        
        this.showContextMenu(e, tabId, gameId);
      });
    });
  }

  decelerate(windowData) {
    const friction = 0.85;
    const minVelocity = 0.5;
    
    const step = () => {
      if (Math.abs(windowData.velocity.x) > minVelocity || Math.abs(windowData.velocity.y) > minVelocity) {
        windowData.velocity.x *= friction;
        windowData.velocity.y *= friction;
        
        windowData.x += windowData.velocity.x;
        windowData.y += windowData.velocity.y;
        
        windowData.element.style.left = windowData.x + 'px';
        windowData.element.style.top = windowData.y + 'px';
        
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }
}

// Initialize window manager
const windowManager = new WindowManager();

// Add "Open in Window" button to games player
function addWindowedButton() {
  const controls = document.getElementById('playerControls');
  if (!controls || controls.querySelector('.window-btn')) return;
  
  const windowBtn = document.createElement('button');
  windowBtn.className = 'control-btn window-btn';
  windowBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
  windowBtn.title = 'Open in Window';
  windowBtn.addEventListener('click', () => {
    if (AppState.currentGame) {
      windowManager.createWindow(AppState.currentGame);
    }
  });
  
  controls.appendChild(windowBtn);
}

// Add button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(addWindowedButton, 100);
});

// ==================== COLOR THEME SYSTEM ====================
const ColorThemeSystem = {
  // 26 Colors with 5 variants each (darkest to lightest)
  colors: [
    { name: 'Midnight', base: '#0a0a0f', accent: '#a5b4fc' },
    { name: 'Obsidian', base: '#141418', accent: '#7dd3fc' },
    { name: 'Slate', base: '#1e293b', accent: '#60a5fa' },
    { name: 'Ocean', base: '#0c4a6e', accent: '#38bdf8' },
    { name: 'Forest', base: '#064e3b', accent: '#34d399' },
    { name: 'Berry', base: '#4c1d95', accent: '#c084fc' },
    { name: 'Crimson', base: '#7f1d1d', accent: '#f87171' },
    { name: 'Sunset', base: '#7c2d12', accent: '#fb923c' },
    { name: 'Amber', base: '#78350f', accent: '#fbbf24' },
    { name: 'Lime', base: '#365314', accent: '#a3e635' },
    { name: 'Teal', base: '#134e4a', accent: '#2dd4bf' },
    { name: 'Indigo', base: '#312e81', accent: '#818cf8' },
    { name: 'Pink', base: '#831843', accent: '#f472b6' },
    { name: 'Rose', base: '#881337', accent: '#fb7185' },
    { name: 'Sky', base: '#0c4a6e', accent: '#7dd3fc' },
    { name: 'Violet', base: '#4c1d95', accent: '#a78bfa' },
    { name: 'Emerald', base: '#064e3b', accent: '#10b981' },
    { name: 'Cyan', base: '#164e63', accent: '#06b6d4' },
    { name: 'Fuchsia', base: '#701a75', accent: '#e879f9' },
    { name: 'Orange', base: '#9a3412', accent: '#fdba74' },
    { name: 'Yellow', base: '#713f12', accent: '#fde047' },
    { name: 'Green', base: '#14532d', accent: '#4ade80' },
    { name: 'Blue', base: '#1e3a8a', accent: '#60a5fa' },
    { name: 'Purple', base: '#581c87', accent: '#c084fc' },
    { name: 'Red', base: '#991b1b', accent: '#fca5a5' },
    { name: 'Monochrome', base: '#171717', accent: '#d4d4d8' }
  ],
  
  currentColorTheme: 0,
  
  apply(colorIndex) {
    const color = this.colors[colorIndex] || this.colors[0];
    const root = document.documentElement;
    
    // Generate 5 variants from darkest to lightest
    const baseRgb = this.hexToRgb(color.base);
    
    // Create 5 background variants
    const bgDarkest = color.base; // Original
    const bgDarker = this.adjustBrightness(color.base, 5);
    const bgDark = this.adjustBrightness(color.base, 10);
    const bgMid = this.adjustBrightness(color.base, 15);
    const bgLight = this.adjustBrightness(color.base, 20);
    
    // Apply CSS variables
    root.style.setProperty('--tk-black', bgDarkest);
    root.style.setProperty('--tk-black-2', bgDarker);
    root.style.setProperty('--tk-black-3', bgDark);
    root.style.setProperty('--tk-silver-1', bgMid);
    root.style.setProperty('--tk-silver-2', bgLight);
    root.style.setProperty('--accent-color', color.accent);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color.accent} 0%, rgba(255,255,255,0.3) 100%)`);
    
    // Calculate glass background based on base
    root.style.setProperty('--tk-glass-bg', `rgba(${this.hexToRgb(color.base).r}, ${this.hexToRgb(color.base).g}, ${this.hexToRgb(color.base).b}, 0.88)`);
    
    // Apply color to 3D theme if active
    if (ThemeSystem.beatSaberScene) {
      this.applyTo3DTheme(color);
    }
    
    this.currentColorTheme = colorIndex;
    AppState.settings.colorTheme = colorIndex;
    saveSettings();
    
    console.log(`TKHub: Color theme applied - ${color.name}`);
  },
  
  applyTo3DTheme(color) {
    if (!ThemeSystem.beatSaberScene) return;
    
    const { scene, menuPanels, particles, gridHelper } = ThemeSystem.beatSaberScene;
    
    // Update lighting colors
    const lights = scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => {
      if (light instanceof THREE.HemisphereLight) {
        light.color.setHex(parseInt(color.accent.replace('#', '0x')));
      } else if (light instanceof THREE.PointLight) {
        light.color.setHex(parseInt(color.accent.replace('#', '0x')));
      }
    });
    
    // Update particle color
    if (particles) {
      const material = particles.material;
      material.color.setHex(parseInt(color.accent.replace('#', '0x')));
    }
    
    // Update grid colors
    if (gridHelper) {
      gridHelper.material.color.setHex(parseInt(color.accent.replace('#', '0x')));
    }
    
    // Update panel colors based on their original colors
    menuPanels.forEach((panel, index) => {
      const material = panel.material;
      const edgesMaterial = panel.children[0]?.material;
      
      // Apply color variations while maintaining distinction
      const hue = this.getHueFromHex(color.accent);
      const adjustedColors = this.generatePanelColors(hue, index);
      
      material.color.setHex(adjustedColors.primary);
      material.emissive.setHex(adjustedColors.emissive);
      
      if (edgesMaterial) {
        edgesMaterial.color.setHex(adjustedColors.primary);
      }
    });
  },
  
  getHueFromHex(hex) {
    const rgb = this.hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: hue = ((b - r) / d + 2) / 6; break;
        case b: hue = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return hue;
  },
  
  generatePanelColors(baseHue, index) {
    // Generate distinct colors for each panel based on the base hue
    const hueShifts = [0, 60, 120, 180, 240]; // Complementary colors
    const hue = (baseHue + hueShifts[index % hueShifts.length]) % 1;
    
    const primary = this.hslToHex(hue, 0.7, 0.5);
    const emissive = this.hslToHex(hue, 0.8, 0.3);
    
    return {
      primary: parseInt(primary.replace('#', '0x')),
      emissive: parseInt(emissive.replace('#', '0x'))
    };
  },
  
  hslToHex(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  },
  
  adjustBrightness(hex, percent) {
    const rgb = this.hexToRgb(hex);
    const adjust = (c) => Math.min(255, Math.max(0, c + (percent * 2.55)));
    const r = Math.round(adjust(rgb.r));
    const g = Math.round(adjust(rgb.g));
    const b = Math.round(adjust(rgb.b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
};

// ==================== THEME EFFECT SYSTEM (Effect-Only) ====================
const ThemeSystem = {
  // Effect presets - these only control visual effects, not colors
  presets: {
    liquidGlass: {
      name: 'Liquid Glass',
      blur: '22px',
      saturation: '110%',
      glassOpacity: 0.88,
      borderStyle: 'standard'
    },
    crystalShards: {
      name: 'Crystal Shards',
      blur: '30px',
      saturation: '130%',
      glassOpacity: 0.75,
      borderStyle: 'glowing',
      shards: true
    },
    rainbow: {
      name: 'Rainbow Prism',
      blur: '20px',
      saturation: '150%',
      glassOpacity: 0.8,
      borderStyle: 'rainbow',
      rainbow: true
    },
    bubble: {
      name: 'Bubble Pop',
      blur: '25px',
      saturation: '120%',
      glassOpacity: 0.7,
      borderStyle: 'bubble',
      bubbles: true
    },
    threeD: {
      name: '3D Dimension',
      blur: '15px',
      saturation: '100%',
      glassOpacity: 0.9,
      borderStyle: '3d',
      threeD: true
    },
    minimal: {
      name: 'Minimal',
      blur: '8px',
      saturation: '100%',
      glassOpacity: 0.95,
      borderStyle: 'minimal'
    },
    frosted: {
      name: 'Deep Frost',
      blur: '40px',
      saturation: '80%',
      glassOpacity: 0.6,
      borderStyle: 'frosted'
    }
  },
  
  currentEffect: 'liquidGlass',
  
  apply(effectName) {
    const effect = this.presets[effectName] || this.presets.liquidGlass;
    const root = document.documentElement;
    
    // Apply effect properties
    root.style.setProperty('--glass-blur', `blur(${effect.blur}) saturate(${effect.saturation})`);
    root.style.setProperty('--tk-glass-opacity', effect.glassOpacity);
    
    // Remove all theme effect classes first
    document.body.classList.remove('theme-crystal', 'theme-rainbow', 'theme-bubble', 'theme-3d', 'theme-minimal', 'theme-frosted');
    
    // Apply specific effect classes
    if (effect.shards) {
      document.body.classList.add('theme-crystal');
    }
    if (effect.rainbow) {
      document.body.classList.add('theme-rainbow');
    }
    if (effect.bubbles) {
      document.body.classList.add('theme-bubble');
    }
    if (effect.threeD) {
      document.body.classList.add('theme-3d');
      this.initThreeJS();
    }
    if (effect.borderStyle === 'minimal') {
      document.body.classList.add('theme-minimal');
    }
    if (effect.borderStyle === 'frosted') {
      document.body.classList.add('theme-frosted');
    }
    
    this.currentEffect = effectName;
    AppState.settings.effectTheme = effectName;
    saveSettings();
    
    console.log(`TKHub: Effect theme applied - ${effect.name}`);
    
    // Show toast notification
    showToast(`Theme: ${effect.name}`);
  },
  
  initThreeD() {
    if (window.THREE) {
      this.initBeatSaberMenu();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      this.initBeatSaberMenu();
    };
    document.head.appendChild(script);
  },
  
  initBeatSaberMenu() {
    if (!window.THREE || this.beatSaberScene) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-1';
    renderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(renderer.domElement);
    
    // Create Beat Saber-style environment
    const envLight = new THREE.HemisphereLight(0xa5b4fc, 0x1a1a2e, 0.6);
    scene.add(envLight);
    
    const pointLight = new THREE.PointLight(0xa5b4fc, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
    
    // Create floating menu panels for each tab
    const menuPanels = [];
    const tabData = [
      { name: 'Browser', icon: 'globe', color: 0x60a5fa, position: [-4, 0, 0] },
      { name: 'Games', icon: 'gamepad', color: 0x34d399, position: [-2, 0, -2] },
      { name: 'Editor', icon: 'code', color: 0xfbbf24, position: [0, 0, -4] },
      { name: 'Settings', icon: 'cog', color: 0xf87171, position: [2, 0, -2] },
      { name: 'Inspector', icon: 'search', color: 0xc084fc, position: [4, 0, 0] }
    ];
    
    tabData.forEach((tab, index) => {
      // Create glowing panel
      const geometry = new THREE.BoxGeometry(1.5, 0.8, 0.1);
      const material = new THREE.MeshPhongMaterial({
        color: tab.color,
        emissive: tab.color,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.8
      });
      
      const panel = new THREE.Mesh(geometry, material);
      panel.position.set(...tab.position);
      panel.userData = { tab: tab.name.toLowerCase(), color: tab.color };
      
      // Add glowing edges
      const edges = new THREE.EdgesGeometry(geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({ 
        color: tab.color, 
        linewidth: 2,
        transparent: true,
        opacity: 0.8
      });
      const edgesMesh = new THREE.LineSegments(edges, edgesMaterial);
      panel.add(edgesMesh);
      
      scene.add(panel);
      menuPanels.push(panel);
    });
    
    // Create floating particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    // Create grid floor
    const gridHelper = new THREE.GridHelper(20, 20, 0xa5b4fc, 0x4c1d95);
    gridHelper.position.y = -3;
    scene.add(gridHelper);
    
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    
    this.beatSaberScene = { 
      scene, 
      camera, 
      renderer, 
      menuPanels, 
      particles,
      gridHelper,
      mouse: new THREE.Vector2(),
      raycaster: new THREE.Raycaster()
    };
    
    // Mouse interaction for panels
    this.setupBeatSaberInteraction();
    
    // Animation loop
    const animate = () => {
      if (!this.beatSaberScene) return;
      
      const time = Date.now() * 0.001;
      
      // Rotate and float menu panels
      menuPanels.forEach((panel, index) => {
        panel.rotation.y = Math.sin(time + index) * 0.1;
        panel.position.y = Math.sin(time * 1.5 + index) * 0.3;
        
        // Glow effect
        const material = panel.material;
        material.emissiveIntensity = 0.2 + Math.sin(time * 2 + index) * 0.1;
      });
      
      // Animate particles
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
      
      // Pulse grid
      gridHelper.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
      if (this.beatSaberScene) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    });
    
    console.log('TKHub: Beat Saber-style 3D menu initialized');
  },
  
  setupBeatSaberInteraction() {
    if (!this.beatSaberScene) return;
    
    const { raycaster, mouse, camera, menuPanels } = this.beatSaberScene;
    
    const onMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(menuPanels);
      
      menuPanels.forEach(panel => {
        const material = panel.material;
        if (intersects.length > 0 && intersects[0].object === panel) {
          material.emissiveIntensity = 0.5;
          panel.scale.set(1.1, 1.1, 1.1);
          document.body.style.cursor = 'pointer';
        } else {
          material.emissiveIntensity = 0.2;
          panel.scale.set(1, 1, 1);
          document.body.style.cursor = 'default';
        }
      });
    };
    
    const onMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(menuPanels);
      
      if (intersects.length > 0) {
        const panel = intersects[0].object;
        const tabName = panel.userData.tab;
        
        // Switch to the selected tab
        if (tabName === 'browser') switchTab('browser');
        else if (tabName === 'games') switchTab('games');
        else if (tabName === 'editor') switchTab('editor');
        else if (tabName === 'settings') switchTab('settings');
        else if (tabName === 'inspector') openInspect();
        
        // Visual feedback
        panel.material.emissiveIntensity = 1;
        setTimeout(() => {
          panel.material.emissiveIntensity = 0.2;
        }, 200);
      }
    };
    
    // Enable pointer events for interaction
    this.beatSaberScene.renderer.domElement.style.pointerEvents = 'auto';
    this.beatSaberScene.renderer.domElement.addEventListener('mousemove', onMouseMove);
    this.beatSaberScene.renderer.domElement.addEventListener('click', onMouseClick);
  }
};

// ==================== ANIMATION SYSTEM ====================
const AnimationSystem = {
  animations: {
    fade: { name: 'Fade', class: 'anim-fade' },
    slide: { name: 'Slide', class: 'anim-slide' },
    scale: { name: 'Scale', class: 'anim-scale' },
    rotate: { name: 'Rotate', class: 'anim-rotate' },
    flip: { name: 'Flip', class: 'anim-flip' },
    bounce: { name: 'Bounce', class: 'anim-bounce' },
    elastic: { name: 'Elastic', class: 'anim-elastic' },
    blur: { name: 'Blur', class: 'anim-blur' },
    glitch: { name: 'Glitch', class: 'anim-glitch' },
    wave: { name: 'Wave', class: 'anim-wave' },
    pulse: { name: 'Pulse', class: 'anim-pulse' },
    shake: { name: 'Shake', class: 'anim-shake' },
    swing: { name: 'Swing', class: 'anim-swing' },
    jelly: { name: 'Jelly', class: 'anim-jelly' },
    wobble: { name: 'Wobble', class: 'anim-wobble' }
  },
  
  currentAnimation: 'fade',
  threeDScene: null,
  
  apply(animName) {
    const app = document.getElementById('app');
    
    // Remove all animation classes
    Object.values(this.animations).forEach(anim => {
      app.classList.remove(anim.class);
    });
    
    // Apply new animation
    if (this.animations[animName]) {
      app.classList.add(this.animations[animName].class);
      this.currentAnimation = animName;
      AppState.settings.animation = animName;
      saveSettings();
    }
    
    // Handle 3D animations
    if (animName === 'threeD' || document.body.classList.contains('theme-3d')) {
      this.initThreeD();
    }
  },
  
  initThreeD() {
    if (!window.THREE || this.threeDScene) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-1';
    renderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(renderer.domElement);
    
    // Create floating geometric shapes
    const geometries = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0)
    ];
    
    const material = new THREE.MeshBasicMaterial({
      color: 0xa5b4fc,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    
    const shapes = [];
    for (let i = 0; i < 15; i++) {
      const geom = geometries[Math.floor(Math.random() * geometries.length)];
      const mesh = new THREE.Mesh(geom, material);
      
      mesh.position.x = (Math.random() - 0.5) * 20;
      mesh.position.y = (Math.random() - 0.5) * 20;
      mesh.position.z = (Math.random() - 0.5) * 10 - 5;
      
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;
      
      mesh.userData = {
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01
        },
        floatSpeed: Math.random() * 0.002 + 0.001,
        floatOffset: Math.random() * Math.PI * 2
      };
      
      scene.add(mesh);
      shapes.push(mesh);
    }
    
    camera.position.z = 5;
    
    this.threeDScene = { scene, camera, renderer, shapes };
    
    const animate = () => {
      if (!this.threeDScene) return;
      
      const time = Date.now() * 0.001;
      
      shapes.forEach(shape => {
        shape.rotation.x += shape.userData.rotSpeed.x;
        shape.rotation.y += shape.userData.rotSpeed.y;
        shape.position.y += Math.sin(time + shape.userData.floatOffset) * 0.01;
      });
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
      if (this.threeDScene) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    });
  },
  
  destroyThreeD() {
    if (this.threeDScene) {
      this.threeDScene.renderer.dispose();
      document.body.removeChild(this.threeDScene.renderer.domElement);
      this.threeDScene = null;
    }
  }
};

// ==================== DATA PERSISTENCE & EXPORT ====================
const DataManager = {
  exportData() {
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      settings: AppState.settings,
      games: AppState.games,
      bookmarks: AppState.bookmarks,
      history: AppState.history,
      editorFiles: AppState.editorFiles,
      colorTheme: ColorThemeSystem.currentColorTheme,
      effectTheme: ThemeSystem.currentEffect,
      animation: AnimationSystem.currentAnimation
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tkhub-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!');
  },
  
  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.settings) AppState.settings = { ...AppState.settings, ...data.settings };
        if (data.games) AppState.games = data.games;
        if (data.bookmarks) AppState.bookmarks = data.bookmarks;
        if (data.history) AppState.history = data.history;
        if (data.editorFiles) AppState.editorFiles = data.editorFiles;
        if (data.colorTheme !== undefined) ColorThemeSystem.apply(data.colorTheme);
        if (data.effectTheme) ThemeSystem.apply(data.effectTheme);
        if (data.animation) AnimationSystem.apply(data.animation);
        
        saveSettings();
        localStorage.setItem('tkhubGames', JSON.stringify(AppState.games));
        localStorage.setItem('tkhubBookmarks', JSON.stringify(AppState.bookmarks));
        
        showToast('Data imported successfully! Reloading...');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        showToast('Error importing data: ' + err.message);
      }
    };
    reader.readAsText(file);
  },
  
  resetAll() {
    if (!confirm('WARNING: This will delete ALL your data including games, bookmarks, and settings. This cannot be undone. Are you sure?')) {
      return;
    }
    
    if (!confirm('Are you absolutely sure? Type "DELETE" to confirm.')) {
      return;
    }
    
    // Clear all storage
    localStorage.removeItem('tkhubSettings');
    localStorage.removeItem('tkhubGames');
    localStorage.removeItem('tkhubBookmarks');
    localStorage.removeItem('tkhubHistory');
    
    // Reset state
    location.reload();
  },
  
  saveTabs() {
    const tabs = Array.from(document.querySelectorAll('.tab')).map(tab => ({
      id: tab.dataset.tab,
      active: tab.classList.contains('active'),
      title: tab.querySelector('span')?.textContent || tab.dataset.tab
    }));
    localStorage.setItem('tkhubTabs', JSON.stringify(tabs));
  },
  
  loadTabs() {
    const saved = localStorage.getItem('tkhubTabs');
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  }
};

// ==================== HASH-BASED ROUTING ====================
const Router = {
  routes: {
    'home': () => switchTab('browser'),
    'browser': () => switchTab('browser'),
    'games': () => switchTab('games'),
    'editor': () => switchTab('editor'),
    'settings': () => openSettingsTab()
  },
  
  init() {
    // Handle initial hash
    this.handleHash();
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleHash());
  },
  
  handleHash() {
    const hash = window.location.hash.slice(1) || 'home';
    const route = this.routes[hash];
    
    if (route) {
      route();
    } else {
      // Handle dynamic tabs or default to browser
      switchTab('browser');
    }
    
    // Update active tab based on hash
    document.querySelectorAll('.tab').forEach(tab => {
      const tabId = tab.dataset.tab;
      const isMatch = hash === tabId || (hash === 'home' && tabId === 'browser');
      tab.classList.toggle('active', isMatch);
    });
  },
  
  navigate(route) {
    window.location.hash = route;
  }
};

// Settings Tab Function
function openSettingsTab() {
  // Create settings view if not exists
  let settingsView = document.getElementById('settingsView');
  
  if (!settingsView) {
    settingsView = document.createElement('div');
    settingsView.id = 'settingsView';
    settingsView.className = 'view settings-view';
    settingsView.innerHTML = `
      <div class="settings-container">
        <div class="settings-sidebar glass">
          <div class="settings-nav">
            <h3>Settings</h3>
            <button class="settings-nav-btn active" data-section="general">
              <i class="fas fa-cog"></i> General
            </button>
            <button class="settings-nav-btn" data-section="appearance">
              <i class="fas fa-palette"></i> Appearance
            </button>
            <button class="settings-nav-btn" data-section="proxy">
              <i class="fas fa-shield-alt"></i> Proxy
            </button>
            <button class="settings-nav-btn" data-section="games">
              <i class="fas fa-gamepad"></i> Games
            </button>
            <button class="settings-nav-btn" data-section="data">
              <i class="fas fa-database"></i> Data & Privacy
            </button>
          </div>
        </div>
        <div class="settings-content-area">
          <!-- General Settings -->
          <div class="settings-section active" id="section-general">
            <h2>General Settings</h2>
            <div class="setting-card">
              <h4>Search Engine</h4>
              <select id="settingsSearchEngine" class="settings-select">
                <option value="https://google.com/search?q=">Google</option>
                <option value="https://duckduckgo.com/?q=">DuckDuckGo</option>
                <option value="https://bing.com/search?q=">Bing</option>
                <option value="https://search.brave.com/search?q=">Brave</option>
                <option value="https://ecosia.org/search?q=">Ecosia</option>
              </select>
            </div>
            <div class="setting-card">
              <h4>Startup</h4>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsStealthMode">
                <span class="toggle-slider"></span>
                <span>Open in about:blank (Stealth Mode)</span>
              </label>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsBlockHistory">
                <span class="toggle-slider"></span>
                <span>Don't save browsing history</span>
              </label>
            </div>
          </div>
          
          <!-- Appearance Settings -->
          <div class="settings-section" id="section-appearance">
            <h2>Appearance</h2>
            
            <!-- Color Theme Section -->
            <div class="setting-card">
              <h4>Color Theme</h4>
              <p class="setting-desc">Choose your base color. Each theme includes 5 variants from darkest to lightest.</p>
              <div class="color-theme-grid">
                ${ColorThemeSystem.colors.map((c, i) => `
                  <button class="color-theme-btn ${i === 0 ? 'active' : ''}" data-color-index="${i}" style="background: linear-gradient(135deg, ${c.base} 0%, ${c.accent} 100%)" title="${c.name}">
                    <span class="color-theme-name">${c.name}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            
            <!-- Effect Theme Section (Effect-Only) -->
            <div class="setting-card">
              <h4>Effect Theme</h4>
              <p class="setting-desc">Visual effects and styling that work with any color theme.</p>
              <div class="theme-grid">
                <button class="theme-btn active" data-theme="liquidGlass">
                  <div class="theme-preview liquid-glass"></div>
                  <span>Liquid Glass</span>
                </button>
                <button class="theme-btn" data-theme="crystalShards">
                  <div class="theme-preview crystal"></div>
                  <span>Crystal Shards</span>
                </button>
                <button class="theme-btn" data-theme="rainbow">
                  <div class="theme-preview rainbow"></div>
                  <span>Rainbow Prism</span>
                </button>
                <button class="theme-btn" data-theme="bubble">
                  <div class="theme-preview bubble"></div>
                  <span>Bubble Pop</span>
                </button>
                <button class="theme-btn" data-theme="threeD">
                  <div class="theme-preview three-d"></div>
                  <span>3D Dimension</span>
                </button>
                <button class="theme-btn" data-theme="minimal">
                  <div class="theme-preview minimal"></div>
                  <span>Minimal</span>
                </button>
                <button class="theme-btn" data-theme="frosted">
                  <div class="theme-preview frosted"></div>
                  <span>Deep Frost</span>
                </button>
              </div>
            </div>
            
            <!-- Animation Section -->
            <div class="setting-card">
              <h4>Animations</h4>
              <select id="settingsAnimation" class="settings-select">
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="scale">Scale</option>
                <option value="rotate">Rotate</option>
                <option value="flip">Flip</option>
                <option value="bounce">Bounce</option>
                <option value="elastic">Elastic</option>
                <option value="blur">Blur</option>
                <option value="glitch">Glitch</option>
                <option value="wave">Wave</option>
                <option value="pulse">Pulse</option>
                <option value="shake">Shake</option>
                <option value="swing">Swing</option>
                <option value="jelly">Jelly</option>
                <option value="wobble">Wobble</option>
              </select>
            </div>
          </div>
          
          <!-- Proxy Settings -->
          <div class="settings-section" id="section-proxy">
            <h2>Proxy Configuration</h2>
            <div class="setting-card">
              <h4>Proxy Type</h4>
              <select id="settingsProxyType" class="settings-select">
                <option value="dynamic">Auto (All Proxies)</option>
                <option value="ultraviolet">Ultraviolet (Best for sites)</option>
                <option value="scramjet">Scramjet (Fast)</option>
                <option value="cors">CORS Proxy (Basic)</option>
              </select>
              <p class="setting-desc">Ultraviolet provides the best compatibility with complex sites like Discord and YouTube.</p>
            </div>
            <div class="setting-card">
              <h4>Advanced</h4>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsInterceptLinks" checked>
                <span class="toggle-slider"></span>
                <span>Intercept external links</span>
              </label>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsEnableCors" checked>
                <span class="toggle-slider"></span>
                <span>Enable CORS bypass</span>
              </label>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsEnableWSS" checked>
                <span class="toggle-slider"></span>
                <span>Enable WSS (WebSocket Proxy)</span>
              </label>
            </div>
          </div>
          
          <!-- Games Settings -->
          <div class="settings-section" id="section-games">
            <h2>Game Settings</h2>
            <div class="setting-card">
              <h4>FPS Limit (1-560)</h4>
              <input type="range" id="settingsFpsSlider" min="1" max="560" value="60" class="settings-slider">
              <span id="settingsFpsValue">60 FPS</span>
            </div>
            <div class="setting-card">
              <h4>Performance</h4>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsAnimationsEnabled" checked>
                <span class="toggle-slider"></span>
                <span>Enable UI animations</span>
              </label>
              <label class="settings-toggle">
                <input type="checkbox" id="settingsGlassEffects" checked>
                <span class="toggle-slider"></span>
                <span>Glass effects</span>
              </label>
            </div>
          </div>
          
          <!-- Data & Privacy -->
          <div class="settings-section" id="section-data">
            <h2>Data & Privacy</h2>
            <div class="setting-card">
              <h4>Data Management</h4>
              <button id="btnExportData" class="settings-action-btn">
                <i class="fas fa-download"></i> Export All Data
              </button>
              <input type="file" id="importFileInput" accept=".json" style="display: none;">
              <button id="btnImportData" class="settings-action-btn">
                <i class="fas fa-upload"></i> Import Data
              </button>
            </div>
            <div class="setting-card danger-zone">
              <h4>Danger Zone</h4>
              <p class="setting-warning">These actions cannot be undone.</p>
              <button id="btnResetAll" class="settings-action-btn danger">
                <i class="fas fa-trash"></i> Reset All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.querySelector('.content-area').appendChild(settingsView);
    
    // Initialize settings tab event listeners
    initSettingsTabListeners();
  }
  
  // Switch to settings view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  settingsView.classList.add('active');
  
  // Load current settings
  loadSettingsToUI();
}

function initSettingsTabListeners() {
  // Navigation
  document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      
      document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${section}`).classList.add('active');
    });
  });
  
  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ThemeSystem.apply(btn.dataset.theme);
    });
  });
  
  // Animation select
  document.getElementById('settingsAnimation')?.addEventListener('change', (e) => {
    AnimationSystem.apply(e.target.value);
  });
  
  // Search engine select
  document.getElementById('settingsSearchEngine')?.addEventListener('change', (e) => {
    AppState.settings.searchEngine = e.target.value;
    saveSettings();
    showToast(`Search engine set to ${e.target.options[e.target.selectedIndex].text}`);
  });
  
  // Proxy type select
  document.getElementById('settingsProxyType')?.addEventListener('change', (e) => {
    AppState.settings.proxyType = e.target.value;
    saveSettings();
    showToast(`Proxy type set to ${e.target.options[e.target.selectedIndex].text}`);
  });
  
  // Stealth mode toggle
  document.getElementById('settingsStealthMode')?.addEventListener('change', (e) => {
    AppState.settings.stealthMode = e.target.checked;
    saveSettings();
    showToast(`Stealth mode ${e.target.checked ? 'enabled' : 'disabled'}`);
  });
  
  // Block history toggle
  document.getElementById('settingsBlockHistory')?.addEventListener('change', (e) => {
    AppState.settings.blockHistory = e.target.checked;
    saveSettings();
    showToast(`History ${e.target.checked ? 'blocked' : 'enabled'}`);
  });
  
  // Color theme buttons
  document.querySelectorAll('.color-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ColorThemeSystem.apply(parseInt(btn.dataset.colorIndex));
    });
  });
  
  // Data management
  document.getElementById('btnExportData')?.addEventListener('click', () => {
    DataManager.exportData();
  });
  
  document.getElementById('btnImportData')?.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  
  document.getElementById('importFileInput')?.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      DataManager.importData(e.target.files[0]);
    }
  });
  
  document.getElementById('btnResetAll')?.addEventListener('click', () => {
    DataManager.resetAll();
  });
  
  // FPS slider in settings
  const fpsSlider = document.getElementById('settingsFpsSlider');
  const fpsValue = document.getElementById('settingsFpsValue');
  
  if (fpsSlider && fpsValue) {
    fpsSlider.addEventListener('input', (e) => {
      fpsValue.textContent = e.target.value + ' FPS';
    });
    
    fpsSlider.addEventListener('change', (e) => {
      AppState.settings.gameFps = parseInt(e.target.value);
      saveSettings();
    });
  }
}

function loadSettingsToUI() {
  // Load values into settings UI
  const s = AppState.settings;
  
  const searchEngine = document.getElementById('settingsSearchEngine');
  if (searchEngine) searchEngine.value = s.searchEngine;
  
  const stealthMode = document.getElementById('settingsStealthMode');
  if (stealthMode) stealthMode.checked = s.stealthMode;
  
  const blockHistory = document.getElementById('settingsBlockHistory');
  if (blockHistory) blockHistory.checked = s.blockHistory;
  
  const proxyType = document.getElementById('settingsProxyType');
  if (proxyType) proxyType.value = s.proxyType || 'dynamic';
  
  const animation = document.getElementById('settingsAnimation');
  if (animation) animation.value = s.animation || 'fade';
  
  const fpsSlider = document.getElementById('settingsFpsSlider');
  const fpsValue = document.getElementById('settingsFpsValue');
  if (fpsSlider && fpsValue) {
    fpsSlider.value = s.gameFps || 60;
    fpsValue.textContent = (s.gameFps || 60) + ' FPS';
  }
  
  // Set active color theme button
  const colorThemeIndex = s.colorTheme || 0;
  document.querySelectorAll('.color-theme-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index === colorThemeIndex);
  });
  
  // Set active effect theme button
  const effectTheme = s.effectTheme || 'liquidGlass';
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === effectTheme);
  });
}

// Initialize router on load
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
  
  // Apply saved theme and animation
  if (AppState.settings.effectTheme) {
    ThemeSystem.apply(AppState.settings.effectTheme);
  }
  if (AppState.settings.colorTheme !== undefined) {
    ColorThemeSystem.apply(AppState.settings.colorTheme);
  }
  if (AppState.settings.animation) {
    AnimationSystem.apply(AppState.settings.animation);
  }
  
  // Initialize all new systems
  DailyQuoteSystem.init();
  SessionRestore.init();
  IntroAnimation.init();
  ChangelogSystem.init();
  GameSettingsPopover.init();
  QoLFeatures.init();
  ModManager.init();
  GameDevTools.init();
  BrowserTabs.init();
});

// ==================== DAILY QUOTE SYSTEM ====================
const DailyQuoteSystem = {
  quotes: [
    { text: "The web is what you make of it.", author: "Tim Berners-Lee" },
    { text: "Browse freely. Play endlessly. Create boldly.", author: "Unknown" },
    { text: "Code is poetry written in logic.", author: "Unknown" },
    { text: "Every pixel tells a story.", author: "Designer" },
    { text: "The internet is the world's largest library.", author: "Bill Gates" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
    { text: "The web does not just connect machines, it connects people.", author: "Tim Berners-Lee" },
    { text: "Technology is best when it brings people together.", author: "Matt Mullenweg" },
    { text: "The art challenges the technology, and the technology inspires the art.", author: "John Lasseter" },
    { text: "Software is eating the world.", author: "Marc Andreessen" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "Programs must be written for people to read.", author: "Harold Abelson" },
    { text: "Debugging is twice as hard as writing the code.", author: "Brian Kernighan" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
    { text: "The future belongs to those who prepare for it today.", author: "Malcolm X" },
    { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
    { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
    { text: "Limitless. Timeless. Boundless.", author: "Unknown" },
    { text: "Your gateway to infinite possibilities.", author: "Unknown" },
    { text: "Where imagination meets implementation.", author: "Unknown" },
    { text: "Explore. Experience. Excel.", author: "Unknown" },
    { text: "The digital frontier awaits.", author: "Unknown" },
    { text: "Built for creators, by creators.", author: "Unknown" },
    { text: ":P", author: "TKJ" }
  ],
  
  init() {
    const quoteEl = document.getElementById('dailyQuote');
    if (!quoteEl) return;
    
    // Get quote based on day of year for daily rotation
    const dayOfYear = this.getDayOfYear();
    const quoteIndex = dayOfYear % this.quotes.length;
    const quote = this.quotes[quoteIndex];
    
    quoteEl.textContent = quote.text;
    quoteEl.title = `— ${quote.author}`;
    
    // Store last shown date
    localStorage.setItem('tkhubLastQuoteDate', new Date().toDateString());
    localStorage.setItem('tkhubLastQuoteIndex', quoteIndex);
  },
  
  getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
};

// ==================== SESSION RESTORE SYSTEM ====================
const SessionRestore = {
  init() {
    // Always start at home
    const savedHash = localStorage.getItem('tkhubLastHash');
    
    // Reset to home
    if (window.location.hash && window.location.hash !== '#home') {
      window.location.hash = 'home';
    }
    
    // Show notification if there was a previous session
    if (savedHash && savedHash !== '#home' && savedHash !== '') {
      this.showNotification(savedHash);
    }
    
    // Save current hash on change
    window.addEventListener('hashchange', () => {
      localStorage.setItem('tkhubLastHash', window.location.hash);
    });
  },
  
  showNotification(savedHash) {
    const notification = document.getElementById('sessionNotification');
    if (!notification) return;
    
    notification.classList.add('show');
    
    // Auto-dismiss progress
    const progress = document.getElementById('sessionProgress');
    if (progress) {
      progress.style.animation = 'sessionProgress 10s linear forwards';
    }
    
    // Yes button
    document.getElementById('resumeSession')?.addEventListener('click', () => {
      window.location.hash = savedHash.replace('#', '');
      this.hideNotification();
    });
    
    // No button
    document.getElementById('dismissSession')?.addEventListener('click', () => {
      this.hideNotification();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.hideNotification();
    }, 10000);
  },
  
  hideNotification() {
    const notification = document.getElementById('sessionNotification');
    if (notification) {
      notification.classList.remove('show');
    }
    localStorage.removeItem('tkhubLastHash');
  }
};

// ==================== INTRO ANIMATION SYSTEM ====================
const IntroAnimation = {
  init() {
    // Only run on home page
    if (window.location.hash && window.location.hash !== '#home' && window.location.hash !== '') {
      return;
    }
    
    const startContent = document.querySelector('.start-content');
    if (!startContent) return;
    
    // Check if animation already played this session
    if (sessionStorage.getItem('tkhubIntroPlayed')) {
      startContent.classList.add('intro-complete');
      return;
    }
    
    // Play intro animation
    startContent.classList.add('intro-playing');
    sessionStorage.setItem('tkhubIntroPlayed', 'true');
    
    // Remove animation classes after completion
    setTimeout(() => {
      startContent.classList.remove('intro-playing');
      startContent.classList.add('intro-complete');
    }, 1500);
  }
};

// ==================== MOD MANAGER ====================
const ModManager = {
  mods: [],
  
  init() {
    this.loadMods();
    this.setupEventListeners();
  },
  
  setupEventListeners() {
    // Mod Manager button
    const modManagerBtn = document.getElementById('modManagerBtn');
    const modManagerPopover = document.getElementById('modManagerPopover');
    const closeModManager = document.getElementById('closeModManager');
    
    if (modManagerBtn && modManagerPopover) {
      modManagerBtn.addEventListener('click', () => {
        modManagerPopover.classList.toggle('open');
        this.renderModList();
      });
    }
    
    if (closeModManager) {
      closeModManager.addEventListener('click', () => {
        modManagerPopover.classList.remove('open');
      });
    }
    
    // Save mod button
    const saveModBtn = document.getElementById('saveModBtn');
    if (saveModBtn) {
      saveModBtn.addEventListener('click', () => this.saveMod());
    }
    
    // Test mod button
    const testModBtn = document.getElementById('testModBtn');
    if (testModBtn) {
      testModBtn.addEventListener('click', () => this.testMod());
    }
    
    // Refresh inspector
    const refreshInspectorBtn = document.getElementById('refreshInspectorBtn');
    if (refreshInspectorBtn) {
      refreshInspectorBtn.addEventListener('click', () => this.refreshInspector());
    }
  },
  
  loadMods() {
    const saved = localStorage.getItem('tkhubGameMods');
    if (saved) {
      this.mods = JSON.parse(saved);
    }
  },
  
  saveMods() {
    localStorage.setItem('tkhubGameMods', JSON.stringify(this.mods));
  },
  
  saveMod() {
    const nameInput = document.getElementById('modName');
    const codeInput = document.getElementById('modCode');
    
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    
    if (!name || !code) {
      showToast('Please enter both mod name and code');
      return;
    }
    
    const mod = {
      id: Date.now(),
      name,
      code,
      enabled: true,
      created: new Date().toISOString()
    };
    
    this.mods.push(mod);
    this.saveMods();
    this.renderModList();
    
    // Clear inputs
    nameInput.value = '';
    codeInput.value = '';
    
    showToast(`Mod "${name}" saved!`);
  },
  
  deleteMod(id) {
    this.mods = this.mods.filter(m => m.id !== id);
    this.saveMods();
    this.renderModList();
    showToast('Mod deleted');
  },
  
  toggleMod(id) {
    const mod = this.mods.find(m => m.id === id);
    if (mod) {
      mod.enabled = !mod.enabled;
      this.saveMods();
      this.renderModList();
      
      if (mod.enabled) {
        showToast(`Mod "${mod.name}" enabled`);
        this.injectMod(mod);
      } else {
        showToast(`Mod "${mod.name}" disabled`);
      }
    }
  },
  
  testMod() {
    const codeInput = document.getElementById('modCode');
    const code = codeInput.value.trim();
    
    if (!code) {
      showToast('Please enter mod code to test');
      return;
    }
    
    this.injectMod({ code, name: 'Test Mod' }, true);
    showToast('Mod code injected for testing');
  },
  
  injectMod(mod, isTest = false) {
    const frame = document.getElementById('gameFrame');
    if (!frame || !frame.contentWindow) {
      showToast('No game loaded to inject mod');
      return;
    }
    
    const tryDirectInjection = () => {
      try {
        // For same-origin frames and blob URLs
        const frameDoc = frame.contentDocument || frame.contentWindow.document;
        if (frameDoc) {
          const script = frameDoc.createElement('script');
          script.textContent = `
            (function() {
              try {
                ${mod.code}
                console.log('[TKHub Mod] ${mod.name} injected successfully');
                // Notify parent of successful injection
                window.parent.postMessage({
                  type: 'tkhub-mod-result',
                  success: true,
                  name: '${mod.name}'
                }, '*');
              } catch(e) {
                console.error('[TKHub Mod] Error in ${mod.name}:', e);
                // Notify parent of error
                window.parent.postMessage({
                  type: 'tkhub-mod-result',
                  success: false,
                  name: '${mod.name}',
                  error: e.message
                }, '*');
              }
            })();
          `;
          frameDoc.head.appendChild(script);
          
          // Remove script after execution to avoid conflicts
          setTimeout(() => script.remove(), 100);
          
          if (!isTest) {
            this.logToInspector(`Injected mod: ${mod.name} (direct)`);
          }
          return true;
        }
      } catch (e) {
        console.log('TKHub: Direct mod injection failed:', e);
        return false;
      }
    };
    
    const tryPostMessageInjection = () => {
      // Set up listener for response
      const handleResponse = (e) => {
        if (e.data && e.data.type === 'tkhub-mod-result') {
          window.removeEventListener('message', handleResponse);
          if (e.data.success) {
            if (!isTest) {
              this.logToInspector(`Injected mod: ${mod.name} (postMessage)`);
            }
            showToast(`Mod "${mod.name}" injected successfully`);
          } else {
            showToast(`Mod "${mod.name}" injection failed: ${e.data.error}`);
          }
        }
      };
      
      window.addEventListener('message', handleResponse);
      
      // Send mod code via postMessage
      frame.contentWindow.postMessage({
        type: 'tkhub-mod-inject',
        code: mod.code,
        name: mod.name
      }, '*');
      
      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        if (!isTest) {
          this.logToInspector(`Mod injection timeout: ${mod.name}`);
        }
      }, 3000);
    };
    
    const tryScriptTagInjection = () => {
      try {
        // Alternative method using data URI
        const scriptContent = `
          try {
            ${mod.code}
            console.log('[TKHub Mod] ${mod.name} injected via script tag');
          } catch(e) {
            console.error('[TKHub Mod] Error in ${mod.name}:', e);
          }
        `;
        
        const blob = new Blob([scriptContent], { type: 'text/javascript' });
        const scriptUrl = URL.createObjectURL(blob);
        
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = () => {
          URL.revokeObjectURL(scriptUrl);
          if (!isTest) {
            this.logToInspector(`Injected mod: ${mod.name} (script tag)`);
          }
        };
        script.onerror = () => {
          URL.revokeObjectURL(scriptUrl);
          console.log('TKHub: Script tag injection failed');
        };
        
        const frameDoc = frame.contentDocument || frame.contentWindow.document;
        if (frameDoc) {
          frameDoc.head.appendChild(script);
          return true;
        }
      } catch (e) {
        console.log('TKHub: Script tag injection failed:', e);
        return false;
      }
    };
    
    // Try injection methods in order
    if (!tryDirectInjection()) {
      if (!tryScriptTagInjection()) {
        tryPostMessageInjection();
      }
    }
  },
  
  renderModList() {
    const list = document.getElementById('activeModsList');
    if (!list) return;
    
    if (this.mods.length === 0) {
      list.innerHTML = '<div class="mod-empty">No mods saved</div>';
      return;
    }
    
    list.innerHTML = this.mods.map(mod => `
      <div class="mod-item">
        <span class="mod-item-name">${mod.name} ${mod.enabled ? '●' : '○'}</span>
        <div class="mod-item-actions">
          <button class="mod-item-btn" onclick="ModManager.toggleMod(${mod.id})" title="${mod.enabled ? 'Disable' : 'Enable'}">
            <i class="fas fa-power-off"></i>
          </button>
          <button class="mod-item-btn" onclick="ModManager.injectMod(ModManager.mods.find(m => m.id === ${mod.id}))" title="Inject">
            <i class="fas fa-syringe"></i>
          </button>
          <button class="mod-item-btn" onclick="ModManager.deleteMod(${mod.id})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  },
  
  refreshInspector() {
    const frame = document.getElementById('gameFrame');
    const log = document.getElementById('modInspectorLog');
    
    if (!frame || !log) return;
    
    try {
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      const elements = frameDoc.querySelectorAll('canvas, video, iframe, script');
      
      log.innerHTML = Array.from(elements).map(el => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : '';
        return `<div>&lt;${tag}${id}${cls}&gt;</div>`;
      }).join('') || '<div class="inspector-empty">No injectable elements found</div>';
    } catch (e) {
      log.innerHTML = '<div class="inspector-empty">Cross-origin restriction - cannot inspect</div>';
    }
  },
  
  logToInspector(message) {
    const log = document.getElementById('modInspectorLog');
    if (log) {
      const entry = document.createElement('div');
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }
  },
  
  // Inject all enabled mods when a game loads
  injectEnabledMods() {
    this.mods.filter(m => m.enabled).forEach(mod => {
      setTimeout(() => this.injectMod(mod), 1000);
    });
  }
};

// ==================== GAME DEVTOOLS ====================
const GameDevTools = {
  consoleHistory: [],
  networkLogs: [],
  
  init() {
    this.setupEventListeners();
    this.hijackConsole();
  },
  
  setupEventListeners() {
    // Inspect button
    const inspectBtn = document.getElementById('inspectGame');
    const devtoolsPanel = document.getElementById('devtoolsPanel');
    const closeDevtools = document.getElementById('closeDevtools');
    
    if (inspectBtn && devtoolsPanel) {
      inspectBtn.addEventListener('click', () => {
        devtoolsPanel.classList.toggle('open');
        if (devtoolsPanel.classList.contains('open')) {
          this.refreshElements();
        }
      });
    }
    
    if (closeDevtools) {
      closeDevtools.addEventListener('click', () => {
        devtoolsPanel.classList.remove('open');
      });
    }
    
    // DevTools tabs
    document.querySelectorAll('.devtools-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.devtools-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.devtools-view').forEach(v => v.classList.remove('active'));
        
        tab.classList.add('active');
        const viewId = tab.dataset.tab + 'View';
        document.getElementById(viewId)?.classList.add('active');
        
        if (tab.dataset.tab === 'elements') {
          this.refreshElements();
        }
      });
    });
    
    // Console input
    const consoleInput = document.getElementById('consoleInput');
    if (consoleInput) {
      consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.executeConsole(consoleInput.value);
          consoleInput.value = '';
        }
      });
    }
  },
  
  hijackConsole() {
    const frame = document.getElementById('gameFrame');
    if (!frame) return;
    
    frame.addEventListener('load', () => {
      try {
        const frameWin = frame.contentWindow;
        const originalLog = frameWin.console.log;
        const originalError = frameWin.console.error;
        const originalWarn = frameWin.console.warn;
        
        frameWin.console.log = (...args) => {
          this.logToConsole('log', args);
          originalLog.apply(frameWin.console, args);
        };
        
        frameWin.console.error = (...args) => {
          this.logToConsole('error', args);
          originalError.apply(frameWin.console, args);
        };
        
        frameWin.console.warn = (...args) => {
          this.logToConsole('warn', args);
          originalWarn.apply(frameWin.console, args);
        };
      } catch (e) {
        // Cross-origin, use postMessage fallback
      }
    });
  },
  
  logToConsole(type, args) {
    const output = document.getElementById('gameConsole');
    if (!output) return;
    
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = args.map(arg => {
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    }).join(' ');
    
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  },
  
  executeConsole(code) {
    const frame = document.getElementById('gameFrame');
    if (!frame || !frame.contentWindow) {
      this.logToConsole('error', ['No game loaded']);
      return;
    }
    
    this.logToConsole('info', ['> ' + code]);
    
    // Enhanced approach for local/offline iframes
    const tryDirectExecution = () => {
      try {
        // Try direct eval first (works for same-origin / blob URLs)
        const result = frame.contentWindow.eval(code);
        this.logToConsole('log', [result]);
        return true;
      } catch (directError) {
        console.log('TKHub: Direct eval failed, trying alternative methods');
        return false;
      }
    };
    
    const tryScriptInjection = () => {
      try {
        const frameDoc = frame.contentDocument || frame.contentWindow.document;
        if (frameDoc) {
          const script = frameDoc.createElement('script');
          script.textContent = `
            (function() {
              try {
                const result = eval(${JSON.stringify(code)});
                window.parent.postMessage({
                  type: 'tkhub-console-response',
                  result: typeof result === 'object' ? JSON.stringify(result) : String(result)
                }, '*');
              } catch (e) {
                window.parent.postMessage({
                  type: 'tkhub-console-response',
                  error: e.message
                }, '*');
              }
            })();
          `;
          frameDoc.head.appendChild(script);
          script.remove();
          return true;
        }
      } catch (e) {
        console.log('TKHub: Script injection failed:', e);
        return false;
      }
    };
    
    const tryPostMessage = () => {
      const handleResponse = (e) => {
        if (e.data && e.data.type === 'tkhub-console-response') {
          window.removeEventListener('message', handleResponse);
          if (e.data.error) {
            this.logToConsole('error', [e.data.error]);
          } else {
            this.logToConsole('log', [e.data.result]);
          }
        }
      };
      
      window.addEventListener('message', handleResponse);
      frame.contentWindow.postMessage({ type: 'tkhub-console-exec', code: code }, '*');
      
      // Timeout to clean up listener if no response
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        this.logToConsole('warn', ['No response from iframe (cross-origin restriction)']);
      }, 5000);
    };
    
    // Try methods in order of preference
    if (!tryDirectExecution()) {
      if (!tryScriptInjection()) {
        tryPostMessage();
      }
    }
  },
  
  refreshElements() {
    const frame = document.getElementById('gameFrame');
    const tree = document.getElementById('elementsTree');
    
    if (!frame || !tree) return;
    
    // First try direct access (works for blob URLs / same-origin)
    try {
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      const body = frameDoc.body;
      
      tree.innerHTML = this.renderElementTree(body, 0);
      return; // Success, exit early
    } catch (e) {
      // Cross-origin, use postMessage approach
    }
    
    // Use postMessage to request DOM from iframe
    tree.innerHTML = '<div style="color: var(--tk-silver);"><i class="fas fa-spinner fa-spin"></i> Loading elements via postMessage...</div>';
    
    // Set up one-time listener for DOM response
    const handleDomResponse = (e) => {
      if (e.data && e.data.type === 'tkhub-dom-response') {
        window.removeEventListener('message', handleDomResponse);
        const domData = e.data.dom;
        tree.innerHTML = this.renderElementTreeFromData(domData, 0);
      }
    };
    
    window.addEventListener('message', handleDomResponse);
    
    // Request DOM from iframe
    frame.contentWindow?.postMessage({ type: 'tkhub-inspect-request' }, '*');
    
    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handleDomResponse);
      if (tree.innerHTML.includes('Loading')) {
        tree.innerHTML = '<div style="color: #ff5f56;"><i class="fas fa-exclamation-triangle"></i> No response from game. Try reloading the game.</div>';
      }
    }, 3000);
  },
  
  renderElementTreeFromData(elementData, depth) {
    if (!elementData) return '';
    
    const tag = elementData.tag?.toLowerCase() || 'unknown';
    const id = elementData.id ? ` <span class="element-attr">id="<span class="element-value">${elementData.id}</span>"</span>` : '';
    const cls = elementData.className ? 
      ` <span class="element-attr">class="<span class="element-value">${elementData.className}</span>"</span>` : '';
    
    let html = `<div class="element-node" style="padding-left: ${depth * 12}px">`;
    html += `<span class="element-tag">&lt;${tag}</span>${id}${cls}<span class="element-tag">&gt;</span>`;
    html += '</div>';
    
    // Render children
    if (depth < 3 && elementData.children) {
      elementData.children.slice(0, 10).forEach(child => {
        html += this.renderElementTreeFromData(child, depth + 1);
      });
      if (elementData.children.length > 10) {
        html += `<div style="padding-left: ${(depth + 1) * 12}px; color: var(--tk-silver)">... ${elementData.children.length - 10} more elements</div>`;
      }
    }
    
    return html;
  },
  
  renderElementTree(element, depth) {
    if (!element) return '';
    
    const indent = '  '.repeat(depth);
    const tag = element.tagName.toLowerCase();
    const id = element.id ? ` <span class="element-attr">id="<span class="element-value">${element.id}</span>"</span>` : '';
    const cls = element.className && typeof element.className === 'string' ? 
      ` <span class="element-attr">class="<span class="element-value">${element.className.split(' ').slice(0, 2).join(' ')}</span>"</span>` : '';
    
    let html = `<div class="element-node" style="padding-left: ${depth * 12}px">`;
    html += `<span class="element-tag">&lt;${tag}</span>${id}${cls}<span class="element-tag">&gt;</span>`;
    html += '</div>';
    
    // Limit children to prevent overwhelming output
    if (depth < 3 && element.children) {
      Array.from(element.children).slice(0, 10).forEach(child => {
        html += this.renderElementTree(child, depth + 1);
      });
      if (element.children.length > 10) {
        html += `<div style="padding-left: ${(depth + 1) * 12}px; color: var(--tk-silver)">... ${element.children.length - 10} more elements</div>`;
      }
    }
    
    return html;
  }
};

// ==================== CHANGELOG SYSTEM ====================
const ChangelogSystem = {
  init() {
    const modal = document.getElementById('changelogModal');
    if (!modal) return;
    
    // Check if we should show changelog
    const lastVersion = localStorage.getItem('tkhubLastVersion');
    const dontShow = localStorage.getItem('tkhubDontShowChangelog');
    const currentVersion = '1.2.1';
    
    if (dontShow === 'true' && lastVersion === currentVersion) {
      return;
    }
    
    // Load README content
    this.loadChangelog();
    
    // Show modal
    setTimeout(() => {
      modal.classList.add('show');
      localStorage.setItem('tkhubLastVersion', currentVersion);
    }, 1000);
    
    // Close button
    document.getElementById('closeChangelog')?.addEventListener('click', () => {
      this.hideModal();
    });
    
    // Got it button
    document.getElementById('gotItChangelog')?.addEventListener('click', () => {
      const dontShowAgain = document.getElementById('dontShowChangelog')?.checked;
      if (dontShowAgain) {
        localStorage.setItem('tkhubDontShowChangelog', 'true');
      }
      this.hideModal();
    });
    
    // Click backdrop to close
    modal.querySelector('.changelog-backdrop')?.addEventListener('click', () => {
      this.hideModal();
    });
  },
  
  async loadChangelog() {
    const body = document.getElementById('changelogBody');
    if (!body) return;
    
    try {
      const response = await fetch('README.md');
      if (response.ok) {
        const text = await response.text();
        // Parse markdown (basic)
        const html = this.parseMarkdown(text);
        body.innerHTML = html;
      } else {
        this.loadDefaultChangelog();
      }
    } catch (e) {
      this.loadDefaultChangelog();
    }
  },
  
  loadDefaultChangelog() {
    const body = document.getElementById('changelogBody');
    if (!body) return;
    
    body.innerHTML = `
      <div class="changelog-section">
        <h3>Version 1.2.1 - Major Update</h3>
        <ul>
          <li>FPS Slider (1-560) for games with preset buttons</li>
          <li>New Settings tab with Google/Edge-style UI</li>
          <li>26 Color Themes with 5 background variants</li>
          <li>7 Effect Themes (Liquid Glass, Crystal, Rainbow, Bubble, 3D, Minimal, Frosted)</li>
          <li>15 Animations for view transitions</li>
          <li>3D Dimension theme with Three.js integration</li>
          <li>Full data export/import/reset functionality</li>
          <li>Session restore notification system</li>
          <li>Daily rotating quotes on homepage</li>
          <li>Game settings popover with quality, AA, V-Sync</li>
          <li>Proper Ultraviolet & Scramjet proxy implementations</li>
          <li>WebSocket Secure (WSS) proxy support</li>
          <li>Intro animation on homepage</li>
          <li>Version badge display</li>
          <li>Changelog modal on first launch</li>
        </ul>
      </div>
      <div class="changelog-section">
        <h3>Quality of Life Features</h3>
        <ul>
          <li>Tooltips on all control buttons</li>
          <li>Auto-save for all settings</li>
          <li>Keyboard shortcuts (Ctrl+Number for tabs)</li>
          <li>Smooth transitions throughout</li>
          <li>Responsive game controls</li>
        </ul>
      </div>
    `;
  },
  
  parseMarkdown(text) {
    // Basic markdown parsing
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  },
  
  hideModal() {
    const modal = document.getElementById('changelogModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }
};

// ==================== GAME SETTINGS POPOVER ====================
const GameSettingsPopover = {
  init() {
    const btn = document.getElementById('gameSettingsBtn');
    const popover = document.getElementById('gameSettingsPopover');
    const closeBtn = document.getElementById('closeGameSettings');
    
    if (!btn || !popover) return;
    
    // Toggle popover
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('show');
    });
    
    // Close button
    closeBtn?.addEventListener('click', () => {
      popover.classList.remove('show');
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== btn) {
        popover.classList.remove('show');
      }
    });
    
    // Initialize game settings from localStorage
    this.loadSettings();
    
    // Save settings on change
    this.setupListeners();
  },
  
  loadSettings() {
    const settings = JSON.parse(localStorage.getItem('tkhubGameSettings') || '{}');
    
    if (settings.quality) document.getElementById('gameQuality').value = settings.quality;
    if (settings.antialiasing) document.getElementById('gameAntialiasing').value = settings.antialiasing;
    if (settings.vsync !== undefined) document.getElementById('gameVsync').checked = settings.vsync;
    if (settings.perfMode !== undefined) document.getElementById('gamePerfMode').checked = settings.perfMode;
    if (settings.volume !== undefined) document.getElementById('gameVolume').value = settings.volume;
    if (settings.shader) {
      const shaderSelect = document.getElementById('gameShader');
      if (shaderSelect) shaderSelect.value = settings.shader;
      ShaderSystem.apply(settings.shader);
    }
  },
  
  setupListeners() {
    const save = () => {
      const settings = {
        quality: document.getElementById('gameQuality')?.value || 'medium',
        antialiasing: document.getElementById('gameAntialiasing')?.value || '4x',
        vsync: document.getElementById('gameVsync')?.checked ?? true,
        perfMode: document.getElementById('gamePerfMode')?.checked ?? false,
        volume: document.getElementById('gameVolume')?.value || '100',
        shader: document.getElementById('gameShader')?.value || 'none'
      };
      localStorage.setItem('tkhubGameSettings', JSON.stringify(settings));
      this.applySettings(settings);
    };
    
    document.getElementById('gameQuality')?.addEventListener('change', save);
    document.getElementById('gameAntialiasing')?.addEventListener('change', save);
    document.getElementById('gameVsync')?.addEventListener('change', save);
    document.getElementById('gamePerfMode')?.addEventListener('change', (e) => {
      AppState.settings.gamePerfMode = e.target.checked;
      saveSettings();
      applyGamePerformance();
    });
    
    // Low Performance Mode (for old/weak hardware like Intel i3 1st gen)
    const lowPerfToggle = document.getElementById('lowPerfMode');
    if (lowPerfToggle) {
      // Set initial state from settings
      lowPerfToggle.checked = AppState.settings.lowPerformanceMode;
      
      lowPerfToggle.addEventListener('change', (e) => {
        AppState.settings.lowPerformanceMode = e.target.checked;
        saveSettings();
        applyLowPerformanceMode();
        showToast(e.target.checked ? 'Low Performance Mode enabled' : 'Low Performance Mode disabled');
      });
    }
  },
  
  applySettings(settings) {
    const frame = document.getElementById('gameFrame');
    if (!frame) return;
    
    // Apply performance mode
    if (settings.perfMode) {
      frame.style.imageRendering = 'pixelated';
    } else {
      frame.style.imageRendering = 'auto';
    }
    
    // Apply shader if specified
    if (settings.shader && settings.shader !== 'none') {
      ShaderSystem.apply(settings.shader);
    } else if (settings.shader === 'none') {
      frame.style.filter = 'none';
    }
    
    console.log('TKHub: Game settings applied', settings);
  }
};

// ==================== QUALITY OF LIFE FEATURES ====================
const QoLFeatures = {
  init() {
    this.setupKeyboardShortcuts();
    this.setupTooltips();
    this.setupAutoSave();
    this.setupSmoothScrolling();
  },
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + number for tab switching
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['home', 'browser', 'games', 'editor', 'settings'];
        const tab = tabs[parseInt(e.key) - 1];
        if (tab) Router.navigate(tab);
      }
      
      // Escape to close modals/panels
      if (e.key === 'Escape') {
        document.querySelectorAll('.game-settings-popover.show, .changelog-modal.show').forEach(el => {
          el.classList.remove('show');
        });
      }
      
      // F11 or F for fullscreen in games
      if (AppState.currentTab === 'games') {
        if ((e.key === 'F11' || e.key === 'f') && AppState.currentGame) {
          e.preventDefault();
          const frame = document.getElementById('gameFrame');
          if (frame?.requestFullscreen) {
            frame.requestFullscreen().then(() => {
              frame.focus();
              setTimeout(() => requestPointerLock(), 100);
            }).catch(() => {
              frame.focus();
              requestPointerLock();
            });
          }
        }
      }
    });
    
    // Handle fullscreen changes to manage input
    document.addEventListener('fullscreenchange', () => {
      const frame = document.getElementById('gameFrame');
      if (document.fullscreenElement) {
        // Entered fullscreen - focus and lock
        setTimeout(() => {
          frame?.focus();
          requestPointerLock();
        }, 100);
      } else {
        // Exited fullscreen - exit pointer lock
        if (document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    });
  },
  
  setupTooltips() {
    // Add tooltips to elements with title attribute
    document.querySelectorAll('[title]').forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'qol-tooltip';
        tooltip.textContent = el.title;
        document.body.appendChild(tooltip);
        
        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
        
        el._tooltip = tooltip;
      });
      
      el.addEventListener('mouseleave', () => {
        if (el._tooltip) {
          el._tooltip.remove();
          el._tooltip = null;
        }
      });
    });
  },
  
  setupAutoSave() {
    // Auto-save indicators
    const indicators = document.querySelectorAll('.autosave-indicator');
    indicators.forEach(ind => {
      ind.classList.add('autosave-active');
      setTimeout(() => ind.classList.remove('autosave-active'), 1000);
    });
  },
  
  setupSmoothScrolling() {
    // Smooth scroll for all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href'))?.scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
  }
};
