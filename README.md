# AssetFlow

**Enterprise Asset & Resource Management System** — a responsive ERP-style workspace that helps organizations understand what they own, where it is, who holds it, and what operational action is due next.

## Development roadmap

```text
Stage 1: Frontend and mock data — Completed
Stage 2: Backend foundation and MongoDB Atlas — Completed
Stage 3: Authentication and user management — Pending
```

## URLs

```text
Frontend:    http://localhost:5174
Backend:     http://localhost:5000
Health check: http://localhost:5000/api/health
```

The frontend still uses mock data during Stage 2 (`VITE_USE_MOCK_DATA=true`).

## Technology

- Frontend: React, Vite, JavaScript, Tailwind CSS, React Router, React Hook Form, Axios, Lucide, Recharts, React Hot Toast, and date-fns.
- Backend: Node.js, Express, MongoDB Atlas, Mongoose, dotenv, cors, helmet, morgan, express-rate-limit.

## Frontend (Stage 1)

The frontend prototype includes mock authentication, role-aware routes, dashboard analytics, organization directories, asset lifecycle records, allocations, shared-resource bookings, maintenance workflows, audits, notifications, user administration, and profiles. Data is served through asynchronous mock services and persisted to browser `localStorage` after changes.

### Run the frontend

```bash
cd client
npm install
npm run dev
```

The development server uses `http://localhost:5174` by default.

## Backend (Stage 2)

The backend is now an Express + MongoDB Atlas foundation. It provides a health-check
endpoint, centralized responses, centralized error handling, request logging, rate
limiting, CORS for the frontend, and graceful shutdown. No feature modules or
authentication are implemented yet.

### Run the backend

```bash
cd server
npm install
npm run dev
```

Then open `http://localhost:5000/api/health`.

## MongoDB Atlas

The backend connects to MongoDB Atlas using `MONGODB_URI` from `server/.env`.
See `server/README.md` for full setup instructions. The `.env` file is never committed.

## Demo credentials (frontend only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@assetflow.com | Admin@123 |
| Asset Manager | assets@assetflow.com | Asset@123 |
| Maintenance Manager | maintenance@assetflow.com | Maintenance@123 |
| Auditor | auditor@assetflow.com | Auditor@123 |
| Employee | employee@assetflow.com | Employee@123 |

The login screen also provides one-click account filling. These credentials are intentionally frontend-only and must never be used as a production authentication design.

## Known limitations

- Data belongs to the current browser; there is no cross-device synchronization yet.
- Frontend role guards improve the demo experience but are not security boundaries.
- Concurrent booking and double-allocation checks will ultimately require authoritative backend transactions.
- Password reset/change and persistent file uploads are deferred to the backend phase.
