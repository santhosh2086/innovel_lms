CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role VARCHAR(20) NOT NULL CHECK(role IN ('Admin','Instructor','Student')),
 status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Suspended')),
 grants TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS courses (
 id BIGSERIAL PRIMARY KEY, title VARCHAR(220) NOT NULL, description TEXT NOT NULL DEFAULT '', category VARCHAR(120), level VARCHAR(60), duration VARCHAR(80), thumbnail_url TEXT,
 instructor_id BIGINT REFERENCES users(id) ON DELETE SET NULL, price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(price >= 0), currency CHAR(3) NOT NULL DEFAULT 'INR',
 status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')), version INTEGER NOT NULL DEFAULT 1,
 outcomes JSONB NOT NULL DEFAULT '[]', prerequisites JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS course_modules (
 id BIGSERIAL PRIMARY KEY, course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE, title VARCHAR(220) NOT NULL, position INTEGER NOT NULL DEFAULT 0, is_required BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lessons (
 id BIGSERIAL PRIMARY KEY, module_id BIGINT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE, title VARCHAR(220) NOT NULL,
 content_type VARCHAR(30) NOT NULL DEFAULT 'text' CHECK(content_type IN ('video','text','pdf','download','external_link','live_class')),
 content_reference TEXT, position INTEGER NOT NULL DEFAULT 0, is_required BOOLEAN NOT NULL DEFAULT true, version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lesson_resources (
 id BIGSERIAL PRIMARY KEY, lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, title VARCHAR(220) NOT NULL, storage_key TEXT NOT NULL, visibility VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK(visibility IN ('public','enrolled','staff')), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
 id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES users(id), course_id BIGINT NOT NULL REFERENCES courses(id), amount NUMERIC(12,2) NOT NULL CHECK(amount >= 0), currency CHAR(3) NOT NULL DEFAULT 'INR',
 status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Authorized','Paid','Failed','Cancelled','Refunded','Disputed')),
 gateway VARCHAR(30) NOT NULL DEFAULT 'razorpay', gateway_order_id TEXT UNIQUE, gateway_payment_id TEXT UNIQUE, receipt TEXT UNIQUE, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS enrollments (
 id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES users(id), course_id BIGINT NOT NULL REFERENCES courses(id), payment_id BIGINT REFERENCES payments(id),
 status VARCHAR(24) NOT NULL DEFAULT 'Active' CHECK(status IN ('Pending','Active','Suspended','Completed','Revoked','Cancelled')),
 source VARCHAR(30) NOT NULL DEFAULT 'free', enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ,
 UNIQUE(student_id, course_id)
);
CREATE TABLE IF NOT EXISTS payment_events (
 id BIGSERIAL PRIMARY KEY, provider_event_id TEXT NOT NULL UNIQUE, event_type TEXT NOT NULL, processing_status VARCHAR(20) NOT NULL DEFAULT 'received', payload JSONB NOT NULL DEFAULT '{}', received_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS lesson_progress (
 id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES users(id), lesson_id BIGINT NOT NULL REFERENCES lessons(id), status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK(status IN ('started','completed')),
 last_position INTEGER NOT NULL DEFAULT 0 CHECK(last_position >= 0), started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS assessments (
 id BIGSERIAL PRIMARY KEY, course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE, module_id BIGINT REFERENCES course_modules(id) ON DELETE SET NULL,
 title VARCHAR(220) NOT NULL, duration_minutes INTEGER NOT NULL DEFAULT 10 CHECK(duration_minutes > 0), pass_mark NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK(pass_mark BETWEEN 0 AND 100),
 max_attempts INTEGER NOT NULL DEFAULT 3 CHECK(max_attempts > 0), status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')), version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS questions (
 id BIGSERIAL PRIMARY KEY, assessment_id BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE, type VARCHAR(20) NOT NULL DEFAULT 'single_choice', prompt TEXT NOT NULL,
 options JSONB NOT NULL DEFAULT '[]', answer_key JSONB NOT NULL, points NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK(points > 0), position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS assessment_attempts (
 id BIGSERIAL PRIMARY KEY, assessment_id BIGINT NOT NULL REFERENCES assessments(id), student_id BIGINT NOT NULL REFERENCES users(id), attempt_number INTEGER NOT NULL,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(), deadline_at TIMESTAMPTZ NOT NULL, submitted_at TIMESTAMPTZ, score NUMERIC(6,2), passed BOOLEAN, status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','expired')),
 UNIQUE(assessment_id,student_id,attempt_number)
);
CREATE TABLE IF NOT EXISTS attempt_answers (
 id BIGSERIAL PRIMARY KEY, attempt_id BIGINT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE, question_id BIGINT NOT NULL REFERENCES questions(id), answer JSONB NOT NULL, awarded_points NUMERIC(8,2) NOT NULL DEFAULT 0, UNIQUE(attempt_id,question_id)
);
CREATE TABLE IF NOT EXISTS certificates (
 id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES users(id), course_id BIGINT NOT NULL REFERENCES courses(id), public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), certificate_number TEXT NOT NULL UNIQUE,
 status VARCHAR(20) NOT NULL DEFAULT 'Issued' CHECK(status IN ('Issued','Revoked')), issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ, revoke_reason TEXT, UNIQUE(student_id,course_id)
);
CREATE TABLE IF NOT EXISTS course_batches (
 id BIGSERIAL PRIMARY KEY, course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE, name VARCHAR(180) NOT NULL, start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, status VARCHAR(20) NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS zoom_meetings (
 id BIGSERIAL PRIMARY KEY, course_id BIGINT NOT NULL REFERENCES courses(id), batch_id BIGINT REFERENCES course_batches(id) ON DELETE SET NULL, zoom_meeting_id TEXT UNIQUE,
 topic VARCHAR(220) NOT NULL, start_at TIMESTAMPTZ NOT NULL, timezone VARCHAR(80) NOT NULL DEFAULT 'UTC', duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
 attendee_join_url TEXT, host_start_url TEXT, status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','past','cancelled')), created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(60) NOT NULL, title VARCHAR(220) NOT NULL, body TEXT NOT NULL DEFAULT '', read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGSERIAL PRIMARY KEY, actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(120) NOT NULL, entity_type VARCHAR(80) NOT NULL, entity_id TEXT, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON enrollments(student_id,status);
CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id,position);
CREATE INDEX IF NOT EXISTS idx_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course_status ON assessments(course_id,status);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON assessment_attempts(student_id,assessment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);


CREATE TABLE IF NOT EXISTS signup_otps (
 id BIGSERIAL PRIMARY KEY, email VARCHAR(254) NOT NULL, name VARCHAR(160) NOT NULL, otp_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signup_otps_email_created_idx ON signup_otps(email, created_at DESC);
