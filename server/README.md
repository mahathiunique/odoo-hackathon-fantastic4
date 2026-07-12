# AssetFlow Server

Backend API foundation for the **AssetFlow — Enterprise Asset & Resource Management System**.

## Development stage

**Stage 2: Backend Foundation — Completed**

**Stage 3: Authentication and User Management — Implemented**

**Stage 4: Departments and Asset Categories — Implemented**

The server now supports JWT authentication, session restoration, admin-only user
management, password hashing, admin seeding, and protected Department and Asset
Category APIs. Employees, assets, allocations, bookings, maintenance, audits,
notifications, and dashboard APIs remain outside the current backend stages.

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
