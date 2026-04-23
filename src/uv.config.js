/**
 * Ultraviolet Configuration
 */

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

// Set config globally
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
