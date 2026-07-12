# AssetFlow

**Enterprise Asset & Resource Management System** — a responsive ERP-style workspace that helps organizations understand what they own, where it is, who holds it, and what operational action is due next.

## Current phase

This repository contains the complete frontend prototype and a backend placeholder only. It includes mock authentication, role-aware routes, dashboard analytics, organization directories, asset lifecycle records, allocations, shared-resource bookings, maintenance workflows, audits, notifications, user administration, and profiles. Data is served through asynchronous mock services and persisted to browser `localStorage` after changes.

No Express APIs, database models, JWT handling, password hashing, or MongoDB connection are included. MongoDB Atlas is a future integration.

## Technology

React, Vite, JavaScript, Tailwind CSS, React Router, React Hook Form, Axios, Lucide, Recharts, React Hot Toast, and date-fns.

## Structure

```text
.
├── client/
│   ├── public/assets/
│   ├── src/
│   │   ├── components/    # common, layout, tables, auth, notifications
│   │   ├── context/       # authentication, notifications, sidebar
│   │   ├── hooks/
│   │   ├── mock/          # relational demonstration records
│   │   ├── pages/         # route screens and reusable module screens
│   │   ├── routes/
│   │   ├── services/      # future-API-shaped async mock layer
│   │   └── utils/
│   └── package.json
└── server/                # placeholders for later backend phases
```

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

You can also run the same commands directly inside `client/`.

The development server uses `http://localhost:5174` by default.

Create a production bundle with `npm run build`.

Copy `.env.example` to `.env` if you want to customize the future API URL. Mock mode is enabled by design in this phase.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@assetflow.com | Admin@123 |
| Asset Manager | assets@assetflow.com | Asset@123 |
| Maintenance Manager | maintenance@assetflow.com | Maintenance@123 |
| Auditor | auditor@assetflow.com | Auditor@123 |
| Employee | employee@assetflow.com | Employee@123 |

The login screen also provides one-click account filling. These credentials are intentionally frontend-only and must never be used as a production authentication design.

## Known frontend limitations

- Data belongs to the current browser; there is no cross-device synchronization.
- Frontend role guards improve the demo experience but are not security boundaries.
- Concurrent booking and double-allocation checks will ultimately require authoritative backend transactions.
- Password reset/change and persistent file uploads are deferred to the backend phase.

The backend will be added module by module in later development phases, beginning with Express and MongoDB Atlas, followed by authentication, core directories, assets, allocations, bookings, maintenance, audits, notifications, and dashboard APIs.
