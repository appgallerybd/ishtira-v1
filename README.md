# Ishtira (ইশতিরা)

A mobile-first, local-first shopping list and expense tracker built with React, TypeScript, Vite, Dexie/IndexedDB and a PWA service worker.

## Current features
- Bengali and English interface; theme selection (light, dark, system)
- Local shopping lists with dates, notes, item quantities, units and estimated prices
- Pending → Purchased → Skipped status cycle and status-based ordering
- Actual-price tracking; only purchased items with a recorded price count toward actual spending
- Search and status filters within a list
- Shopping history, CSV export and JSON backup/merge restore
- IndexedDB persistence with Dexie, basic schema versioning
- PWA manifest and service-worker build configuration
- Responsive mobile UI and offline/online indicator

## Requirements
- Node.js 20+
- npm 10+ recommended

## Development
```bash
npm install
npm run dev
```

## Quality checks
```bash
npm run typecheck
npm test
npm run build
```

## Deploy
Build with `npm run build` and deploy the `dist/` directory to an HTTPS static host. Configure the host to serve `index.html` for SPA navigation. Verify the service worker and offline behavior on the deployed origin.

## Android packaging
The PWA can be wrapped as a Trusted Web Activity once it is deployed to HTTPS. Set up Bubblewrap with the final domain, Android application ID and signing key; publish the corresponding Digital Asset Links file at `/.well-known/assetlinks.json`. Never commit signing keys or passwords. A production APK workflow still requires a deployed domain, signing configuration, and verified Digital Asset Links.

## Local data and privacy
Shopping data stays in the browser's IndexedDB on this device. It does not sync to other devices. Clearing browser site data or removing the app may erase local data; use JSON backup regularly. Restore validates the top-level schema and merges records by ID; only import backups you trust.

## Limitations to address before a production release
- Bengali font files need to be legally sourced and bundled if self-hosting SolaimanLipi.
- PDF export and embedded Bengali-font verification are not yet implemented.
- Saved product library UI, list duplication, custom date-range analytics and full import conflict resolution remain to be implemented.
- Confirm install/offline behavior on real Android devices and test database persistence under browser reloads.
- Configure hosting, domain verification, Digital Asset Links and signed Android build before claiming a release-ready APK.

## License
See repository owner-provided licensing terms before redistributing this project.
