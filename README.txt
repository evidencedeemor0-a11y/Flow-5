FLOW WALLET
====================
Files:
- index.html
- style.css
- script.js
- manifest.json

Features:
- Passcode lock screen (default passcode: 1472)
- USD/GBP/EUR/NGN balance with a display-only currency symbol swap
  (the underlying number doesn't convert, just the symbol shown)
- Two balances: a Checking account (main card) and a Savings
  account (tap it to open the Savings page and withdraw back to
  Checking)
- Send money (via bank name, account number, account name, and an
  optional description) — or choose "My savings" as the
  destination to move money from Checking into Savings instead
- Request money and top-up flows, each routed through the same
  passcode-confirm + pending animation + success screen
- Local transaction history with search and filters (including
  internal transfers), tap any row for a detail view
  for a detail view
- Full Profile page (not a popup) with:
  - Editable display name / handle
  - Dark / light mode toggle
  - Accent color picker (Violet / Teal / Coral / Gold / Blue) -
    restyles the whole app live and is saved locally
  - "Enable notifications" toggle - requests browser notification
    permission; once granted, a native notification fires whenever
    a send or top-up completes
  - Change passcode
  - Clear transaction history / reset app
- LocalStorage persistence
- Mobile-friendly animations

IMPORTANT:
This package is a front-end wallet interface only. It stores account
state locally on the device. It is not connected to any real bank,
card network, or payment processor - connecting Send, Request, and
Top Up to real money movement would require a secure backend and
licensed payment/banking infrastructure.

iPhone:
For a quick home-screen experience, open index.html in Safari after
hosting it on a web server, then Share > Add to Home Screen. Local
file previews may not support every PWA feature.

Notifications: uses the browser's built-in Notification API (no
backend needed). Works well in Chrome/Android. iOS Safari does not
support this API even when the site is added to the Home Screen -
Apple requires the separate Web Push + service worker path for that,
which is out of scope for a static local file.
