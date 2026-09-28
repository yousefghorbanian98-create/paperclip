# Installing Paperclip as an app (PWA)

The Paperclip UI is an installable Progressive Web App. Installing it gives you
a desktop or mobile app — own window, own launcher icon, no browser tab — while
the server keeps running wherever you already run it.

There is no separate mobile or desktop build to download: the app is whatever
Paperclip server you point it at, so it is always the same version as that
server.

## What "installed" changes

| | Browser tab | Installed app |
| --- | --- | --- |
| Window | Shares a browser window | Own window / own app switcher entry |
| Chrome | Browser toolbar | In-app row with Refresh, Share, Open in Browser |
| Launcher | Bookmark | Dock, Start menu, or home screen icon, plus shortcuts |
| Offline | Browser error page | Paperclip's offline screen and cached app shell |

The in-app control row is [`StandaloneBrowserControls`][controls]; it only
renders when the app is running chromeless, which it detects with
[`isChromelessDisplayMode`][display-mode].

## Requirements

- **A secure context.** Browsers only allow service workers and installation
  over HTTPS, or over `http://localhost` / `http://127.0.0.1`. A server reached
  at `http://192.168.x.x` or `http://my-box.local` cannot be installed — see
  [Remote server](#remote-self-hosted-server) below.
- **Nothing else.** No app store account, no signing certificate, no extra
  package to install on the server.

## Desktop

1. Open your Paperclip URL in Chrome, Edge, Brave, or another Chromium browser.
2. Use the install button in the address bar, or **⋮ → Cast, save and share →
   Install page as app** (Chrome) / **⋯ → Apps → Install this site as an app**
   (Edge).
3. Paperclip opens in its own window and is added to your Dock, Start menu, or
   application launcher.

Safari on macOS: **File → Add to Dock**. Firefox does not support installing
web apps; use it as a normal tab.

Right-clicking the installed icon exposes the manifest shortcuts: Dashboard,
Issues, Agents, Search.

## Mobile

- **Android (Chrome):** open the URL, then **⋮ → Add to Home screen → Install**.
- **iOS/iPadOS (Safari):** open the URL, then **Share → Add to Home Screen**.
  iOS only installs from Safari, not from Chrome or Firefox.

The layout is already responsive and pads itself with `env(safe-area-inset-*)`,
so notches, Dynamic Island, and home indicators are respected. On iOS the status
bar is translucent and Paperclip draws behind it.

## Connecting to a server

### Local server

Running Paperclip on the same machine (`paperclipai start`, Docker, or a source
checkout) serves the UI on `http://localhost:<port>`, which browsers treat as a
secure context. Install directly from that URL; the installed window keeps
launching against the same local server, and starts empty-handed if the server
is not running.

### Remote self-hosted server

Point the app at the HTTPS URL of your server. Any of these produce a valid
secure context:

- a reverse proxy with a real certificate (Caddy, nginx + Let's Encrypt,
  Cloudflare Tunnel);
- Tailscale HTTPS, including the built-in broker in
  `packages/tailscale-https-broker`.

Because `scope` is `/`, every Paperclip route stays inside the installed window
and only your own origin is in scope. Install once per server you use: each
origin becomes its own installed app, so a laptop server and a home-lab server
can live side by side.

Note that `<link rel="manifest">` is fetched with `crossorigin="use-credentials"`
specifically so that an authenticating reverse proxy in front of Paperclip can
still serve the manifest on every page load.

## Updates

Installed copies are not pinned to an old build. The service worker re-checks
`/sw.js` on focus and hourly, and a new server build changes that file
byte-for-byte, so parked windows reload onto the new bundle by themselves. See
`ui/src/lib/service-worker-updates.ts` and `stampServiceWorkerBuildId` in
`ui/src/lib/vite-sw-build-id.ts`.

## Uninstalling

- Desktop Chromium: open the app window → **⋮ → Uninstall Paperclip**.
- Android: long-press the icon → **Uninstall**.
- iOS: long-press the icon → **Remove App → Delete App**.

Uninstalling removes the window and the cached shell. It changes nothing on the
server.

## Where this is configured

| File | Role |
| --- | --- |
| `ui/public/site.webmanifest` | Name, icons, `display`, scope, launcher shortcuts |
| `ui/index.html` | Manifest link, viewport, iOS/Android install meta tags |
| `ui/public/sw.js` | Service worker: asset cache, offline screen, update flow |
| `ui/src/components/StandaloneBrowserControls.tsx` | Replacement for the hidden browser chrome |
| `ui/src/lib/pwa-display-mode.ts` | Chromeless-launch detection |

`ui/src/lib/pwa-install-mode.test.ts` locks the install behaviour described
here, including that every manifest shortcut points at a route that exists.

## Native wrappers

A store-distributed build (Tauri or Electron on desktop, Capacitor on mobile) is
possible on top of the same UI and server, and would additionally allow bundling
the Node server inside a desktop installer. Nothing in this repo does that yet;
the PWA path above covers install-to-launcher without any extra toolchain.

[controls]: ../ui/src/components/StandaloneBrowserControls.tsx
[display-mode]: ../ui/src/lib/pwa-display-mode.ts
