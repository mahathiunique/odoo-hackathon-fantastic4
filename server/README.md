# AssetFlow Server

Backend API foundation for the **AssetFlow — Enterprise Asset & Resource Management System**.

## Development stage

**Stage 2: Backend Foundation — Completed**

**Stage 3: Authentication and User Management — Implemented**

**Stage 4: Departments and Asset Categories — Implemented**

**Stage 5: Employee Directory — Implemented**

**Stage 7: Asset Allocation and Returns — Implemented**

**Stage 8: Shared Resources and Resource Booking — Implemented (this branch)**

The server now supports JWT authentication, session restoration, admin-only user
management, password hashing, admin seeding, protected Department and Asset
Category APIs, the Employee directory, the Stage 7 Asset Allocation module, and the
Stage 8 Shared Resource and Resource Booking modules (resources, time-slot booking,
overlap prevention, concurrency-safe booking creation, booking calendar, my bookings,
and confirm/cancel/complete flows).

Stage 6 (Asset Management) is developed on a separate branch and is not required by
Stage 8. Resources and bookings run fully standalone. The Stage 7 Allocation module
was built independently from Stage 6 and uses a dynamic adapter to integrate with
Asset and AssetHistory once Stage 6 is merged. The backend starts successfully
without the Asset or AssetAllocation models.

## Technology stack

- Node.js (CommonJS)
- Express.js
- MongoDB Atlas
- Mongoose
- dotenv
- cors
- helmet
- morgan
- express-rate-limit
- nodemon (development)

## Stage 7 Parallel Development

Stage 7 was built independently from Stage 6. The Allocation module does not
define the Asset schema or AssetHistory schema. Instead it uses a dynamic
integration adapter that looks up `mongoose.model("Asset")` and
`mongoose.model("AssetHistory")` at runtime.

Key points:
- The backend starts successfully even when Stage 6 models are unavailable.
- Allocation operations return HTTP 503 with a readable message only when they
  need the missing Asset module.
- The adapter uses conditional updates and MongoDB transactions to keep Asset
  lifecycle state and Allocation records consistent.
- A partial unique index on `AssetAllocation` prevents double allocation of the
  same asset.
- All open allocations are preserved; allocations are never permanently deleted.

### Required Asset fields (Stage 6 integration contract)

```text
_id
assetTag
name
category
department
condition
lifecycleStatus
currentLocation
assignedToEmployee
assignedToDepartment
expectedReturnDate
isSharedResource
updatedBy
```

### Expected lifecycle values

```text
Available
Reserved
Allocated
Under Maintenance
Lost
Retired
Disposed
```

### Expected AssetHistory model

```text
asset
previousStatus
newStatus
action
reason
changes
performedBy
metadata
```

### Allocation API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/allocations` | List all allocations (Admin, Asset Manager, Maintenance Manager, Auditor) |
| GET | `/api/allocations/my` | Current employee's allocations (Employee) |
| GET | `/api/allocations/overdue` | Overdue allocations (Admin, Asset Manager, Auditor) |
| GET | `/api/allocations/stats` | Allocation statistics (Admin, Asset Manager) |
| GET | `/api/allocations/:id` | Allocation details (Admin, Asset Manager, Maintenance Manager, Auditor) |
| POST | `/api/allocations` | Create allocation (Admin, Asset Manager) |
| PATCH | `/api/allocations/:id/return` | Return asset (Admin, Asset Manager) |

### Roles and permissions

| Role | Allocations list | Create | Return | Overdue | Stats | My allocations |
|---|---|---|---|---|---|---|
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Asset Manager | Yes | Yes | Yes | Yes | Yes | Yes |
| Maintenance Manager | Read | No | No | No | No | No |
| Auditor | Read | No | No | Yes | No | No |
| Employee | No | No | No | No | No | Yes |

### Integration checklist after Stage 6 merge

1. Merge the Stage 6 branch.
2. Confirm `mongoose.model("Asset")` is registered.
3. Confirm `mongoose.model("AssetHistory")` is registered.
4. Confirm `/api/assets/options?availableOnly=true` works.
5. Confirm Asset fields match the Stage 7 integration contract.
6. Start the backend.
7. Test allocation creation.
8. Confirm Asset status changes to Allocated.
9. Confirm assignment fields are populated.
10. Confirm AssetHistory record is created.
11. Test Asset return.
12. Confirm Asset status changes to Available.
13. Confirm assignment fields are cleared.
14. Confirm the open-allocation unique index works.
15. Run `npm run seed:allocations`.
16. Run frontend production build.

### Seed order after merge

```bash
npm run seed:admin
npm run seed:organization
npm run seed:employees
npm run seed:assets
npm run seed:allocations
```

## Folder structure

```text
server/
├── config/
│   ├── database.js          # MongoDB Atlas connection
│   └── environment.js       # Centralized env config + validation
│
├── controllers/
│   └── healthController.js   # Health-check controller
│
├── middleware/
│   ├── errorMiddleware.js    # Centralized error handling
│   ├── notFoundMiddleware.js # Unknown route handler
│   └── requestLogger.js      # Structured request logging
│
├── routes/
│   ├── healthRoutes.js       # Health routes
│   └── index.js              # Route aggregator (future modules mount here)
│
├── services/
│   └── healthService.js      # Health data construction
│
├── utils/
│   ├── ApiError.js           # Custom operational error class
│   ├── asyncHandler.js       # Async error wrapper
│   └── response.js           # Standard API response helpers
│
├── models/                   # Reserved for Mongoose schemas (future)
├── seed/                     # Reserved for seed scripts (future)
│
├── app.js                    # Express app configuration
├── server.js                 # Server bootstrap + graceful shutdown
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Installation

```bash
cd server
npm install
```

## Environment variables

Copy `.env.example` to `.env` and provide the required values:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/assetflow?retryWrites=true&w=majority

CLIENT_URL=http://localhost:5174

API_PREFIX=/api

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

| Variable                  | Required | Default                 | Description                     |
| ------------------------- | -------- | ----------------------- | ------------------------------- |
| `MONGODB_URI`             | Yes      | —                       | MongoDB Atlas connection string |
| `PORT`                    | No       | `5000`                  | Server port                     |
| `NODE_ENV`                | No       | `development`           | Environment name                |
| `CLIENT_URL`              | No       | `http://localhost:5174` | Allowed frontend origin         |
| `API_PREFIX`              | No       | `/api`                  | API route prefix                |
| `RATE_LIMIT_WINDOW_MS`    | No       | `900000`                | Rate-limit window (ms)          |
| `RATE_LIMIT_MAX_REQUESTS` | No       | `200`                   | Max requests per window         |

Never commit `.env`. The `.env.example` file is safe to commit.

Default demo admin credentials are included in `.env.example` for local development only.
For production, change them and consider using secure HTTP-only cookies instead of
local storage for JWTs.

## MongoDB Atlas setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas.
2. Create a free shared (M0) cluster.
3. Create a database user under **Database Access** and save the username/password securely.
4. Under **Network Access**, add your current IP address.
5. For temporary hackathon testing you may allow `0.0.0.0/0`, but note this is
   less secure and should not be used in production.
6. Go to **Connect > Drivers**, choose the Node.js driver, and copy the connection string.
7. Replace `USERNAME`, `PASSWORD`, and `CLUSTER` placeholders. Use `assetflow` as the database name.
8. Place the full string in `server/.env` as `MONGODB_URI`.
9. Never commit the `.env` file.

Special characters in the password (for example `@`, `:`, `/`, `#`) must be
URL-encoded (for example `#` becomes `%23`).

## Available endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `http://localhost:5000/` | API root information |
| GET | `http://localhost:5000/api/health` | Backend health check |
| POST | `http://localhost:5000/api/auth/login` | Authenticate a user and receive a JWT |
| GET | `http://localhost:5000/api/auth/me` | Retrieve the current authenticated user |
| POST | `http://localhost:5000/api/auth/logout` | End the client session |
| GET | `http://localhost:5000/api/users` | List users (Admin only) |
| GET/POST | `http://localhost:5000/api/departments` | List or create departments |
| GET | `http://localhost:5000/api/departments/options` | Active department options |
| GET/PUT | `http://localhost:5000/api/departments/:id` | Read or update a department |
| PATCH | `http://localhost:5000/api/departments/:id/status` | Change department status |
| GET/POST | `http://localhost:5000/api/categories` | List or create categories |
| GET | `http://localhost:5000/api/categories/options` | Active category options |
| GET/PUT | `http://localhost:5000/api/categories/:id` | Read or update a category |
| PATCH | `http://localhost:5000/api/categories/:id/status` | Change category status |
| GET | `http://localhost:5000/api/allocations` | List allocations |
| GET | `http://localhost:5000/api/allocations/my` | Current employee allocations |
| GET | `http://localhost:5000/api/allocations/overdue` | Overdue allocations |
| GET | `http://localhost:5000/api/allocations/stats` | Allocation statistics |
| GET | `http://localhost:5000/api/allocations/:id` | Allocation details |
| POST | `http://localhost:5000/api/allocations` | Create allocation |
| PATCH | `http://localhost:5000/api/allocations/:id/return` | Return asset |
| GET/POST | `http://localhost:5000/api/resources` | List or create shared resources |
| GET | `http://localhost:5000/api/resources/options` | Active/available resource options |
| GET/PUT | `http://localhost:5000/api/resources/:id` | Read or update a resource |
| PATCH | `http://localhost:5000/api/resources/:id/status` | Activate/deactivate a resource |
| PATCH | `http://localhost:5000/api/resources/:id/availability` | Change availability |
| DELETE | `http://localhost:5000/api/resources/:id` | Soft-deactivate a resource |
| GET/POST | `http://localhost:5000/api/bookings` | List all bookings / create a booking |
| GET | `http://localhost:5000/api/bookings/my` | Current user's bookings |
| GET | `http://localhost:5000/api/bookings/calendar` | Calendar bookings (max 90-day range) |
| GET | `http://localhost:5000/api/bookings/stats` | Booking statistics (Admin/Asset Manager) |
| POST | `http://localhost:5000/api/bookings/check-availability` | Check a time slot |
| GET | `http://localhost:5000/api/bookings/:id` | Read a booking |
| PATCH | `http://localhost:5000/api/bookings/:id/confirm` | Confirm a pending booking |
| PATCH | `http://localhost:5000/api/bookings/:id/cancel` | Cancel a booking |
| PATCH | `http://localhost:5000/api/bookings/:id/complete` | Complete a booking |

Allowed frontend origin: `http://localhost:5174`

## Running commands

Development (with auto-reload):

```bash
npm run dev
```

Production:

```bash
npm start
```

Syntax check:

```bash
npm run check
```

Stage 4 unit tests:

```bash
npm test
```

Organization seed (run the Admin seed first):

```bash
npm run seed:organization
```

Stage 8 resources and sample bookings seed (run the Admin seed first). This never
creates Assets and does not require Stage 6 or Stage 7:

```bash
npm run seed:resources
```

## Stage 8 — Shared Resources and Booking

Stage 8 is independently functional and never imports the Asset model directly.

### Overlap prevention

A booking blocks a time slot only when its status is `Pending` or `Confirmed`.
Overlap is detected with the exact rule
`existing.startTime < new.endTime AND existing.endTime > new.startTime`, so
boundary-touching bookings (for example 10:00–11:00 and 11:00–12:00) are allowed.
`Cancelled` and `Completed` bookings never block future slots.

### Concurrency-safe creation

Booking creation and confirmation run inside a MongoDB transaction that first
`$inc`-s the resource's `bookingVersion`, creating a write dependency on the same
resource document. Concurrent transactions for the same resource conflict; transient
transaction errors are retried up to three times, after which overlaps are rechecked.
This guarantees that two simultaneous requests cannot both book the same slot.

### Optional Asset integration (available after Stage 6)

`integrations/resourceAssetAdapter.js` performs a dynamic `mongoose.model("Asset")`
lookup. Before Stage 6 is merged:

- Resources can be created, listed, and booked with `linkedAsset = null`.
- Supplying `linkedAsset` returns HTTP `503` with a clear message instead of crashing.

After Stage 6 is merged, linking validates that the Asset exists, is
`isSharedResource = true`, and is not `Lost`, `Retired`, or `Disposed`. Bookings are
rejected when the linked Asset is `Under Maintenance`, `Lost`, `Retired`, or
`Disposed`. Bookings never modify Asset lifecycle status and never write AssetHistory.

## Testing instructions

Start the server, then verify:

```bash
# Root endpoint
curl http://localhost:5000/

# Health check
curl http://localhost:5000/api/health

# Unknown route returns 404
curl http://localhost:5000/api/unknown

# Rate limit / CORS can be inspected from the browser on http://localhost:5174
```

## Troubleshooting

- **Server fails to start with "Missing required environment variable: MONGODB_URI"** —
  create `server/.env` from `.env.example` and set the connection string.
- **MongoDB connection fails** — verify the database user, network access, and that
  the password is URL-encoded.
- **CORS errors from the frontend** — confirm `CLIENT_URL` matches the frontend origin
  (`http://localhost:5174`).
- **Logs showing the connection string** — this should never happen; the server logs
  only the database host and name.
