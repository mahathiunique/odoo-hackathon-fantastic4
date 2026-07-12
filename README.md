# AssetFlow

**Enterprise Asset & Resource Management System** — a responsive ERP-style workspace that helps organizations understand what they own, where it is, who holds it, and what operational action is due next.

## Development roadmap

```text
Stage 1: Frontend and mock data — Completed
Stage 2: Backend foundation and MongoDB Atlas — Completed
Stage 3: Authentication and user management — Completed
Stage 4: Departments and asset categories — Completed
Stage 5: Employee directory — Completed
Stage 6: Asset management and lifecycle — Completed
Stage 7: Asset allocation and returns — Completed
Stage 8: Shared resources and booking — Completed
Stage 9: Maintenance workflow — In progress on separate branch
Stage 10: Audit cycle and discrepancies — Completed on this branch
Stage 6: Asset management and lifecycle — In progress on separate branch
Stage 7: Asset allocation and returns — In progress on separate branch
Stage 8: Shared resources and booking — Completed
Stage 9: Maintenance request and approval workflow — In progress on separate branch
Stage 10: Audit cycle and discrepancy management — In progress on separate branch
Stage 11: Notifications, activity logs and dashboard APIs — Completed
```

Stage 8 operates independently using standalone shared resources. Resources and
bookings do not require the Stage 6 Asset module; a resource may optionally be
linked to an Asset only after Stage 6 is merged (see `server/README.md`).

## URLs

```text
Frontend:    http://localhost:5174
Backend:     http://localhost:5000
Health check: http://localhost:5000/api/health
```

Departments and categories use real APIs. Other feature modules continue using mock data until their backend stages.

## Technology

- Frontend: React, Vite, JavaScript, Tailwind CSS, React Router, React Hook Form, Axios, Lucide, Recharts, React Hot Toast, and date-fns.
- Backend: Node.js, Express, MongoDB Atlas, Mongoose, dotenv, cors, helmet, morgan, express-rate-limit.

## Frontend

The frontend uses real JWT authentication, user-management, Department, Asset
Category, Notification, Activity Log and Dashboard APIs. Later business modules
(assets, allocations, resources, bookings, maintenance, audits) continue using
mock services and browser `localStorage` until their backend stages are
implemented.

### Run the frontend

```bash
cd client
npm install
npm run dev
```

The development server uses `http://localhost:5174` by default.

## Backend (Stages 2–4)

The backend is now an Express + MongoDB Atlas foundation. It provides a health-check
endpoint, centralized responses, centralized error handling, request logging, rate
limiting, CORS for the frontend, and graceful shutdown. It also provides JWT
authentication, user management, Department and Asset Category models, validation,
protected CRUD routes, server-side search, filters, sorting, pagination, options
endpoints, and soft deactivation.

### Run the backend

```bash
cd server
npm install
npm run dev
```

Then open `http://localhost:5000/api/health`.

### Seed initial data

```bash
npm run seed:admin
npm run seed:organization
npm run seed:resources
npm run seed:notifications
```

`npm run seed:resources` seeds Stage 8 shared resources and a few non-overlapping
sample bookings. It never creates Assets and does not require Stage 6 or Stage 7.

## MongoDB Atlas

The backend connects to MongoDB Atlas using `MONGODB_URI` from `server/.env`.
See `server/README.md` for full setup instructions. The `.env` file is never committed.

## Demo credentials

| Role                | Email                     | Password        |
| ------------------- | ------------------------- | --------------- |
| Admin               | admin@assetflow.com       | Admin@123       |
| Asset Manager       | assets@assetflow.com      | Asset@123       |
| Maintenance Manager | maintenance@assetflow.com | Maintenance@123 |
| Auditor             | auditor@assetflow.com     | Auditor@123     |
| Employee            | employee@assetflow.com    | Employee@123    |

The seeded Admin credentials come from `server/.env`. Change all demonstration
credentials before using the application outside local development.

## Known limitations

- Modules after Stage 4 still belong to the current browser; they do not synchronize across devices.
- Backend middleware is the authorization boundary; frontend role guards only control visibility.
- Concurrent booking and double-allocation checks will ultimately require authoritative backend transactions.
- Self-service password changes and persistent file uploads remain deferred.
