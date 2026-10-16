# INNOVEL LMS API (PostgreSQL)
Base URL: `http://localhost:5000/api/v1`

Send `Authorization: Bearer <accessToken>` on protected routes. Role and resource ownership checks are performed by the API. Do not trust client-supplied prices, roles, scores or payment status.

## Health / auth
- `GET /health`
- `POST /auth/login` `{ "email": "...", "password": "...", "workspace": "Admin|Instructor|Student" }`
- `GET /auth/me`
- `POST /auth/change-password` `{ "currentPassword": "...", "newPassword": "12+ characters" }`
- `POST /auth/logout`

## Courses / course content
- `GET /courses?q=&category=&level=` public published catalogue
- `GET /courses/:id` public published course detail
- `GET /courses/manage/list` Admin all / Instructor assigned courses
- `POST /courses` Admin create course
- `PATCH /courses/:id` Admin or assigned Instructor update
- `POST /courses/:id/publish` Admin; Instructor only with `course.publish` grant
- `POST /courses/:id/archive` Admin; Instructor only with `course.publish` grant
- `GET /courses/:id/outline` authenticated; students must be enrolled
- `POST /courses/:courseId/modules` Admin / assigned Instructor
- `POST /modules/:moduleId/lessons` Admin / assigned Instructor
- `GET /lessons/:lessonId` authenticated; enrolled students or assigned instructor/admin
- `POST /lessons/:lessonId/resources` Admin / assigned Instructor
- `GET /lessons/:lessonId/resources` authenticated and visibility filtered

## Users (Admin only; API remains because user/role management is in the PDF even though the People UI page was removed)
- `GET /admin/users`
- `POST /admin/users` `{name,email,password,role,grants?}`
- `PATCH /admin/users/:id` `{name?,role?,status?,grants?}`

## Enrolment / learning / notifications
- `POST /enrollments/:courseId` free courses only; paid courses return `PAYMENT_REQUIRED`
- `GET /me/enrollments`
- `POST /lessons/:lessonId/progress` `{lastPosition,completed}`
- `GET /me/progress`
- `GET /me/payments`
- `GET /me/notifications`
- `POST /notifications/:id/read`

## Payments
- `POST /payments/create-order` `{courseId}` (Razorpay credentials required)
- `POST /payments/verify` `{razorpay_order_id,razorpay_payment_id,razorpay_signature}`
- `POST /payments/webhook` signed raw-body Razorpay webhook; configure this exact URL in Razorpay
- `GET /payments/:id` own payment or Admin

## Assessments
- `GET /courses/:courseId/assessments`
- `POST /assessments/:id/start`
- `GET /attempts/:id/questions` (answer keys are not returned)
- `POST /attempts/:id/submit` `{answers:[{questionId,answer}]}`; score calculated server-side
- `GET /me/assessments/:id/results`
- `POST /instructor/assessments` Admin or assigned Instructor with `assessment.manage` grant

## Live classes
- `POST /admin/zoom-meetings` Admin or assigned Instructor with `zoom.manage` grant
- `GET /me/zoom-meetings`
- `GET /zoom-meetings/:id/join` checks enrolment/ownership and returns attendee URL only
- `PATCH /admin/zoom-meetings/:id`

The meeting schedule APIs are implemented, but creating/updating/cancelling real Zoom meetings requires completing the Zoom OAuth service and populating the attendee URL. The app intentionally does not invent Zoom links.

## Admin reports
- `GET /admin/reports/summary`
- `GET /admin/audit`

## Not yet production-complete
- Forgot/reset-password delivery and refresh-token rotation/session revocation.
- Real Zoom OAuth meeting create/update/cancel calls.
- Certificate eligibility workflow, PDF rendering and public verification endpoint.
- Secure object storage and signed file URLs; resource `storage_key` is metadata only.
- Comprehensive automated API/integration/security tests and migrations version tracking.
- Full frontend wiring to replace all mock data with API calls.
