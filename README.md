# Ruveco

Live trip tracking for transport. An owner creates a trip, the driver starts it and shares GPS, and the receiver watches on a public link.

Built with Next.js (App Router) and Firebase. Maps, place search and routing use free OpenStreetMap services.

**Setup:** see [SETUP.md](SETUP.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev:local` | Runs the app on the local Firebase emulators. No Firebase project or keys needed. |
| `npm run dev` | Runs the app against the Firebase project in `.env.local`. |
| `npm run test:e2e` | Runs the spec's "Done when" scenario and the access rules. Needs `dev:local` running. |
| `npm run build` | Production build. |
| `npm run lint` / `npm run typecheck` | Code checks. |
| `npm run deploy:rules` | Deploys Firestore, Realtime Database and Storage security rules. |
| `npm run seed:companies` | Fills the `vehicleCompanies` table used by the Add Vehicle dropdown. |

## How it is put together

- **Screens** (`src/app`): `/login`, `/onboarding/*`, `/owner/*`, `/driver/*`, and the public tracking page `/t/[token]`.
- **Server routes** (`src/app/api`): every write goes through these, using the Firebase Admin SDK. Trip status only changes here (start, end, cancel), never from a form.
- **Firestore:** users, drivers, vehicles, vehicle companies, trips, planned routes, notifications. Browsers can only read their own records (`firestore.rules`).
- **Realtime Database:** GPS points and the latest position of each trip. Only the assigned driver can write, and only while the trip is in progress (`database.rules.json`).
- **Storage:** license photos, face photos and trip documents (`storage.rules`).
- **GPS** (`src/lib/tracker.ts`): sends a point every 15 seconds, queues points on the phone when offline, and keeps the screen awake.
- **Public tracking** (`src/app/api/track/[token]`): returns only status, ETA and map data. The link expires 48 hours after the trip is completed.

## Folders

```
src/app            screens and API routes
src/components     UI: brand (logo, truck illustrations), ui (buttons, sheets, fields), trip (cards, map)
src/lib            types, formatting, Firebase clients, GPS tracker, live data hooks
src/lib/server     server-only helpers: auth, routing (distance and ETA), trip helpers
scripts            seed script, end-to-end test, map worker copy
*.rules            Firebase security rules
```
