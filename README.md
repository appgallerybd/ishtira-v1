# Ishtira (ইশতিরা)

Mobile-first Bengali/English shopping-list and expense tracker built with React, TypeScript, Vite, Dexie/IndexedDB and a Progressive Web App service worker.

## Implemented features
- Shopping lists: create, edit, duplicate, finish/reopen, and delete with related items.
- Items: add quantities, units, estimated unit prices, actual paid prices, mark pending/purchased/skipped, search, filter, and remove.
- Product library: save frequently purchased products with default units, price and category; edit/delete and reuse them.
- Calculations: purchased/pending/skipped totals, progress, estimated spend and recorded actual spend.
- Reports: filter lists by date range, per-list totals, print-friendly report (use browser Print → Save as PDF), CSV export.
- Preferences: Bengali/English, light/dark/system appearance, currency selection and Bengali numerals.
- Data portability: JSON backup and validated merge/restore; CSV spreadsheet export.
- Local-first storage: IndexedDB persistence, offline/online indicator, PWA manifest and service-worker build configuration.
- Responsive layout, keyboard-focus styles and reduced-motion support.
- GitHub Actions CI workflow runs typecheck, unit tests and production build.

## Run locally
Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

## Verify
```bash
npm run typecheck
npm test
npm run build
npm run lint
```

## Deployment
Deploy the generated `dist/` folder to an HTTPS static host and configure SPA fallback to `index.html`. Validate installability, cache refresh, offline startup, IndexedDB persistence, CSV/JSON operations, print output, and mobile layouts on real devices before release.

## Android packaging
An Android Trusted Web Activity can be prepared after deployment to a stable HTTPS domain. Configure the Android application ID, signing key and `/.well-known/assetlinks.json` Digital Asset Links file using Bubblewrap or an equivalent tool. Do not commit signing credentials. A signed Android APK/AAB is not produced by this repository's current CI workflow.

## Data and privacy
Data stays in the current browser profile on the current device; cloud sync and accounts are not implemented. Clearing browser site data can remove local records, so export JSON backups regularly and store them privately. Backup restore validates record relationships and merges by ID; only import files you trust.

## Known release checks
- CI must pass on the latest commit; a workflow run is not considered successful while in progress.
- PDF export currently uses the browser print dialog rather than a generated PDF file. Bengali font embedding and pagination need device/browser verification.
- Self-hosted Bengali font files must be sourced and licensed appropriately.
- Hosting, custom domain, offline behavior on real devices, accessibility and data-loss recovery should be verified before describing the app as fully production-ready.

## License
No open-source license has been selected by the repository owner. Confirm redistribution terms before publishing or reusing this project.
