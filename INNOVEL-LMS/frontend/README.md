# INNOVEL LMS

A course-learning portal built with **React + Vite**, **Express**, and **PostgreSQL**. The repository includes the frontend, API, database migrations, sample seed scripts, course artwork, and tool logos.

## Features

- Role-based Admin, Instructor, and Student experiences
- Course catalog and enrolment workflows
- PostgreSQL-backed user, course, learning, and payment data
- Email OTP signup configuration (Gmail SMTP)
- Razorpay payment verification endpoints
- Zoom meeting integration endpoints
- Course banners and tool-logo assets stored locally in `public/`

> Payment, Gmail, and Zoom integrations require credentials from the respective providers. They cannot be verified as live integrations without valid provider accounts and configuration.

## Requirements

- Node.js 20 or newer
- PostgreSQL
- npm

## Run locally (Windows PowerShell)

### 1. Configure the database and API

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Edit `server/.env` and set at least:

- `DATABASE_URL` — your PostgreSQL connection URL
- `JWT_ACCESS_SECRET` — a strong random secret
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — your own admin seed credentials (password must be at least 12 characters)
- `INSTRUCTOR_EMAIL` and `INSTRUCTOR_PASSWORD` — your own instructor seed credentials (password must be at least 12 characters)

For optional integrations, set your own Razorpay test credentials, Zoom Server-to-Server OAuth credentials, and Gmail App Password. **Never commit `.env` or real credentials to GitHub.**

Create an empty database (for example, `innovel_lms`), then run:

```powershell
npm run migrate
npm run seed:admin
npm run seed:students
npm run dev
```

API health endpoint: `http://localhost:5000/api/v1/health`.

### 2. Run the frontend

Open a second terminal from the repository root:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). If the API runs at a different address, configure `VITE_API_URL` as needed.

## Tests and production build

From the repository root:

```powershell
npm test
npm run build
```

## Database safety

The migration and seed scripts are intended to add missing schema and starter data without wiping existing records. Back up your database before applying schema changes to an existing environment.

## Repository structure

```text
.
├── public/                 # Course banners and tool logos
├── src/                    # React UI and tests
├── server/
│   ├── src/                # Express routes, middleware, DB and seed scripts
│   ├── migrations/         # PostgreSQL schema migrations
│   └── .env.example        # Safe configuration template
├── index.html
├── package.json
└── README.md
```

## Security note

This repository intentionally excludes `.env` files, dependency folders, and build output. Before publishing, review your own Git history and never commit API keys, database passwords, app passwords, or production user data.
