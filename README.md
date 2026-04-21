# TKHub v1.2.2

## What's New in v1.2.2

### Performance & Optimization
- **Low Performance Mode** - Optimizes site for old/weak hardware (Intel i3 1st gen, integrated GPU)
  - Disables blur/glass effects
  - Disables background animations
  - Reduces game FPS to 30
  - Uses simpler CSS without expensive filters
  - Sets lower resolution scaling (800x600)
- **Fixed Game Persistence** - Games now properly show up after saving and reloading
  - Blob URLs are refreshed on load from IndexedDB content
  - Games list is properly cleared and rebuilt on startup

### Core Features
- **FPS Slider (1-560)** - Full range FPS control with real requestAnimationFrame throttling
- **Transform-based Resolution** - Render at native resolution, scale to fit with pixelated rendering
- **26 Color Themes** - Complete color palette with 5 background variants each
- **7 Effect Themes** - Visual effects that work with any color:
  - Liquid Glass (default)
  - Crystal Shards
  - Rainbow Prism
  - Bubble Pop
  - 3D Dimension (with Three.js)
  - Minimal
  - Deep Frost
- **15 View Animations** - Smooth transitions between views
- **Pointer Lock** - Full mouse capture for games (fixes turn limits)
- **Fuzzy Game Search** - Find games with partial matching and highlighting

### Proxy & Connectivity
- **Ultraviolet Proxy** - Proper implementation with XOR encoding
- **Scramjet Proxy** - Character-shuffled base64 encoding
- **WebSocket Secure (WSS)** - Full WebSocket proxy support for real-time apps
- **Auto Proxy Rotation** - Fallback system for reliability

### Games
- **Game Settings Popover** - Quality, anti-aliasing, V-Sync, performance mode, volume
- **Game DevTools** - Inspect Element, Console, Elements tree, Network log for games
- **Mod Manager** - Save, inject, and manage JavaScript mods for games
- **IndexedDB Game Storage** - Games persist across sessions
- **Cross-Origin DevTools** - Service worker CORS headers for game inspection
- **Save All Games** - Persist all games to IndexedDB for offline accessing user's approach
- **Auto-Scan** - Automatic HTML game detection
- **Persistent Game Storage** - Save all games to IndexedDB, persists between sessions
- **Save All Games** - One-click save all games to local storage (not file explorer)
- **FPS Limiting** - Working throttling using user's approach
- **Windowed Mode** - Draggable, resizable game windows with macOS controls

### UI/UX
- **Daily Quotes** - Rotating inspirational quotes on homepage
- **Session Restore** - Resume where you left off
- **Intro Animation** - Elements animate in from screen edges
- **Changelog Modal** - First-launch changelog with README integration
- **Version Badge** - Display current version on homepage
- **Keyboard Shortcuts** - Ctrl+1-5 for tab switching, Escape to close

### Data & Privacy
- **Export/Import** - Full data backup and restore
- **Reset All** - Complete data wipe option
- **Auto-Save** - All settings persist automatically
- **Stealth Mode** - Open in about:blank option

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1 | Home |
| Ctrl+2 | Browser |
| Ctrl+3 | Games |
| Ctrl+4 | Editor |
| Ctrl+5 | Settings |
| Escape | Close modals/panels |
| F / F11 | Fullscreen (in games) |

## Version History

### v1.2.1 (Current)
- Fixed FPS slider with working throttling
- Added pointer lock for games (fixes mouse turn issues)
- Added DevTools panel for games (Inspect, Console, Elements, Network)
- Added Mod Manager for saving and injecting JavaScript mods
- Added fuzzy search for games with highlighting
- Changed "Save All Games" to use IndexedDB (persistent between sessions)
- Added resolution scaling with transform
- Added pixelated rendering option for performance mode

### v1.0
- Initial release
- Basic proxy functionality
- Game iframe support
- Settings panel
- Windowed mode

---

Built by TKJ.
