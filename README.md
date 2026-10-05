# Hospital Appointment and Slot Management System

Production-ready hospital appointment system built with Next.js and a PostgreSQL backend.

## Requirements

- Node.js 18+
- PostgreSQL 14+

## Setup

1. Install dependencies.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to your PostgreSQL connection string.
4. Optionally set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, and `INITIAL_ADMIN_NAME` to bootstrap the first admin account when the database is empty.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build for production

```bash
npm run build
npm start
```

## Notes

- Patient accounts are created through the registration screen.
- Doctor, patient, and appointment records are stored in PostgreSQL.
- The application uses secure HTTP-only session cookies.
