# College Hostel Management

A full stack hostel management system for colleges using Node.js/Express (backend) and React (frontend).

## Tech Stack

- Backend: Node.js, Express
- Database: MySQL (via `mysql2` or `sequelize` as configured)
- ORM/Query: raw SQL migrations and query builder scripts
- Frontend: React (Create React App structure in `hostel-frontend`)
- Auth: JWT tokens via middleware (`authMiddleware.js`)
- Role-based access control: middleware (`roleMiddleware.js`)
- Communication: RESTful API

## System Architecture and Flow

1. User requests are routed to specific endpoint in `routes/*`.
2. Middleware chain:
   - `authMiddleware`: verify JWT, attach user payload to `req.user`.
   - `roleMiddleware`: ensure role eligibility for the endpoint.
3. Route handler calls controller/service logic (in routing modules) to interact with DB (via `config/db.js`).
4. Business rules are applied (allocation, complaint handling, payments, notifications).
5. `utils/notificationService.js` sends events/notifications as needed.
6. JSON response returned with structured status and payload.

## Role-Based Access Control (RBAC)

Roles in the system:
- `admin` : full access to hostels, rooms, students, payments, analytics, and notifications.
- `warden`: manage their assigned hostels, allocate students, resolve complaints, view payments and student status.
- `student`: view own profile, submit complaints, track payments.

Typical rule sequence:
- Auth token validation (`authMiddleware`)
- Role guard (`roleMiddleware`) checks route-specific permission arrays (e.g., `["admin"]`, `["warden","admin"]`, `["student"]`).

## Authentication Flow

1. Login endpoint in `routes/authRoutes.js` validates credentials against DB.
2. On success, generate JWT token (usually includes userID, role, and expiry).
3. Client stores token (localStorage/sessionStorage) and sends `Authorization: Bearer <token>`.
4. `authMiddleware` decodes token, validates signature/expiry, attaches user to request.

## API Response Pattern

- Success:
  - HTTP 200/201
  - JSON: `{ success: true, data: <resource>, message: <optional> }`
- Failures:
  - HTTP 400/401/403/500
  - JSON: `{ success: false, error: "<reason>" }`

## Project Structure

- `server.js` : app entry point
- `config/db.js` : DB connection and pool config
- `routes/` : route declarations per feature and role
- `middleware/` : auth/role check
- `utils/notificationService.js` : notifications logic
- `migrate-*.js` : schema migration scripts
- `run_sync.js` : sync script (e.g., master data sync)

Frontend
- `hostel-frontend/`: React SPA with pages for login, dashboard, complaints, payments, and allocation.

## Setup (detailed)

1. Clone repository:
   - `git clone <repo> && cd "college hostel management"`
2. Install backend deps:
   - `npm install`
3. Install frontend deps:
   - `cd hostel-frontend && npm install`
4. Configure environment (`.env` at project root):
   - `DB_HOST=...`
   - `DB_USER=...`
   - `DB_PASSWORD=...`
   - `DB_NAME=...`
   - `JWT_SECRET=...`
   - `PORT=3001`
5. Setup DB schema/migrations:
   - (run scripts `migrate-warden.js`, `migrate-contact-schema.js`, `migrate-notification-schema.js` as needed)
6. Start backend:
   - `npm start`
7. Start frontend:
   - `cd hostel-frontend && npm start`

## Development Notes

- Keep `.gitignore` updated (e.g., `node_modules`, `.env`).
- Remove temporary scripts in root when not needed.
- Prefer using Postman/Insomnia for API flow before UI integration.

## Troubleshooting

- Check `server.js` logs for auth/DB connection issues.
- Verify token in network request header.
- Ensure user role exists and route permission matches.

