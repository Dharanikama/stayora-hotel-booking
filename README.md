# Stayora — Hotel Room Booking System

A full-stack hotel room booking mini project built with **React + Vite + Tailwind-style custom CSS**, **Node.js + Express**, and **MongoDB Atlas**.

## Features
- Modern responsive hotel discovery UI with room cards, search, filters, and date selection
- Register/login with JWT authentication and bcrypt password hashing
- Browse room details, price, amenities, and capacity
- Book a room for a date range; server checks overlapping reservations
- View and cancel your bookings
- Admin panel in the app (sign in as admin): see all bookings, cancel them, add rooms, hide/show rooms
- MongoDB models for users, rooms, and bookings
- Demo seed script to create sample rooms and an admin account

> Payments are intentionally simulated for this academic mini project. Do not collect real card details.

## Requirements
- Node.js 20+
- A MongoDB Atlas cluster (free tier is sufficient) or local MongoDB
- Git


## Fastest deployment: one Render web service

This repository includes `render.yaml` so Render can build and serve the React frontend and Express API from **one web service**. MongoDB Atlas remains the external database.

1. Push this project to a GitHub repository.
2. Create a free MongoDB Atlas cluster and database user; copy the connection string and put the database name `stayora` before the `?` (for example `...mongodb.net/stayora?retryWrites=true&w=majority`). In Atlas > Network Access, allow `0.0.0.0/0` (Render's free plan has no fixed IP).
3. In Render, choose **New → Blueprint**, connect your GitHub repository, and let Render read `render.yaml`.
4. Enter the required secret values when prompted: `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (8+ characters, strong and unique). Render generates `JWT_SECRET` automatically.
5. Deploy. The same Render URL serves the website and the API; `/api/health` is the health check. No `CLIENT_URL` or `VITE_API_URL` is needed.
6. **No manual seeding is needed.** On every start the server adds the six sample rooms only if the rooms collection is empty, and creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if it does not exist. It never deletes data. If the admin account already exists, changing `ADMIN_PASSWORD` in Render and redeploying updates the admin's password. (`npm run seed -- --reset` still exists for local use and DOES delete all rooms.)
7. Confirm the Render URL opens, `/api/health` reports `ok`, and registration, login, room search, booking, cancellation, and the Admin panel (sign in with the admin email/password) work.

**Important:** Free hosting services may sleep when idle (the first request after a sleep can take about a minute). Double-booking protection works for one running instance (the Render free plan); a multi-instance setup would need a database-level guard.

## 1. Configure the backend
```bash
cd server
cp .env.example .env
```
Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER/stayora?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
ADMIN_NAME=Stayora Admin
ADMIN_EMAIL=admin@stayora.demo
ADMIN_PASSWORD=ChangeMe123!
```
Add your actual MongoDB Atlas connection string. In Atlas, create a database user and allow your current IP for development. For deployment, configure Network Access carefully and never commit credentials.

Install and seed:
```bash
npm install
npm run seed
npm run dev
```
Backend runs at `http://localhost:5000`.

## 2. Configure the frontend
Open a second terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

No frontend setting is needed locally: the Vite dev server forwards `/api` to `http://localhost:5000`. Set `VITE_API_URL` only if the API is hosted on a different domain.

## Demo admin
The seed script creates the account configured by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Change the password before sharing/deploying. Register a normal user through the UI to test the customer flow.

## API overview
- `GET /api/health`
- `GET /api/rooms` — list/search rooms
- `GET /api/rooms/:id` — room details
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` — authenticated
- `POST /api/bookings` — authenticated; validates dates and room availability
- `GET /api/bookings/my` — authenticated
- `PATCH /api/bookings/:id/cancel` — owner or admin
- `GET /api/admin/bookings` — admin
- `GET /api/admin/rooms` (includes hidden rooms), `POST /api/admin/rooms`, `PATCH /api/admin/rooms/:id`, `DELETE /api/admin/rooms/:id` (hides the room) — admin

## Deploy for free
### MongoDB Atlas
1. Create a free cluster and database user.
2. Add the deployment provider's outbound IP access as required by your provider; for a quick educational demo, Atlas allows `0.0.0.0/0`, but use strong credentials and restrict access where possible.
3. Copy the connection string into the backend environment variable `MONGODB_URI`.

### Backend (Render or similar Node hosting)
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (your deployed frontend URL), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `NODE_ENV=production`

### Frontend (Vercel or similar static hosting)
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api`

After deployment, test registration, login, room listing, booking, cancellation, and the public live URL. Submit both GitHub and live links through your teacher's form.

## Important notes
- Booking dates are interpreted as calendar dates. The server uses a half-open overlap check (`existing.checkIn < requested.checkOut` and `existing.checkOut > requested.checkIn`), so one guest can check out on the same date another checks in.
- Simultaneous bookings for the same room are serialised with an in-process lock, which is sufficient for a single server instance. For production use, add email verification, password reset, stronger audit logging, and a database-level guard if you run more than one instance.
