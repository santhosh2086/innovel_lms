# INNOVEL LMS API — PostgreSQL

## 1) Create a fresh database
Create a PostgreSQL database named `innovel_lms` (or choose another name and update `DATABASE_URL`). Do not run destructive reset commands.

## 2) Configure secrets
Copy `.env.example` to `.env`, set the new database URL, and replace `JWT_ACCESS_SECRET` with a random secret. The requested starter accounts are configured as `admin@gmail.com` and `Instructor@gmail.com`, both with the supplied starter password `santhosh2029`. Change these starter passwords after first login. The seed script hashes passwords; it never stores them as plain text.

For paid course checkout, add valid Razorpay test keys. For real Zoom meetings, create a Zoom Server-to-Server OAuth app with meeting creation scopes and configure its Account ID, Client ID and Client Secret. Gmail OTP signup needs a Gmail App Password. Credentials are not included in the ZIP.

## 3) Install, migrate and seed
```powershell
cd server
npm install
npm run migrate
npm run seed:admin
npm run seed:students
npm run dev
```
The staff seed creates/upserts the admin and instructor accounts and inserts six starter courses only if matching titles do not already exist. The student seed is additive and creates 20 sample student records; it does not delete existing records. Sample student passwords are random and are not intended for login. Use signup to create your own student account.

Health check: `http://localhost:5000/api/v1/health`.

## 4) Frontend
In the project root, run `npm install`, then `npm run dev`. Frontend API URL defaults to `http://localhost:5000/api/v1`; set `VITE_API_URL` if the API is elsewhere.

Payment and Zoom integrations require valid provider credentials and cannot be live-verified without access to those accounts. Use Razorpay test mode before collecting real payments.
