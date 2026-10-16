/**
 * INNOVEL LMS — role & permission layer (frontend)
 * ------------------------------------------------
 * Mirrors section 3 of the project documentation ("Roles and Permissions").
 *
 * IMPORTANT: this only controls what the UI shows. It is NOT security.
 * The Express API must enforce the same rules on every endpoint
 * (role + resource ownership + enrolment), exactly as the PDF requires.
 * Keep this file in sync with the backend's permission map.
 */

export const ROLES = { ADMIN: 'Admin', INSTRUCTOR: 'Instructor', STUDENT: 'Student' };

export const PERM = {
  USER_MANAGE: 'user.manage',               // manage users / roles
  COURSE_CREATE: 'course.create',
  COURSE_MANAGE: 'course.manage',           // scoped: assigned courses for instructors
  COURSE_PUBLISH: 'course.publish',         // instructor: only if permitted
  COURSE_ENROLL: 'course.enroll',
  CONTENT_MANAGE: 'content.manage',         // lessons / resources (scoped)
  CONTENT_VIEW: 'content.view',             // student: enrolled content only
  PAYMENT_VIEW_ALL: 'payment.viewAll',
  PAYMENT_VIEW_LIMITED: 'payment.viewLimited',
  PAYMENT_VIEW_OWN: 'payment.viewOwn',
  PAYMENT_REFUND: 'payment.refund',
  ZOOM_MANAGE: 'zoom.manage',               // instructor: assigned courses, if permitted
  ZOOM_JOIN: 'zoom.join',                   // student: eligible meetings only
  ASSESSMENT_MANAGE: 'assessment.manage',   // instructor: if permitted
  ASSESSMENT_TAKE: 'assessment.take',
  PROGRESS_VIEW_ALL: 'progress.viewAll',
  PROGRESS_VIEW_ASSIGNED: 'progress.viewAssigned',
  PROGRESS_VIEW_OWN: 'progress.viewOwn',
  CERT_MANAGE: 'certificate.manage',        // issue/revoke; instructor: only if explicitly permitted
  CERT_VIEW_OWN: 'certificate.viewOwn',
  REPORT_VIEW: 'report.view',
  AUDIT_VIEW: 'audit.view'
};

/** Permissions an admin can switch on per instructor ("If permitted" cells in the matrix). */
export const GRANTABLE = [
  { perm: PERM.COURSE_PUBLISH, label: 'Publish courses', hint: 'Publish, archive and restore their assigned courses.' },
  { perm: PERM.ZOOM_MANAGE, label: 'Manage Zoom meetings', hint: 'Schedule and cancel live classes for assigned courses.' },
  { perm: PERM.ASSESSMENT_MANAGE, label: 'Manage assessments', hint: 'Create and edit assessments for assigned courses.' },
  { perm: PERM.CERT_MANAGE, label: 'Issue / revoke certificates', hint: 'Revoke or reissue certificates (a reason is always recorded).' }
];
const GRANTABLE_SET = new Set(GRANTABLE.map(g => g.perm));

const ROLE_PERMS = {
  [ROLES.ADMIN]: [
    PERM.USER_MANAGE, PERM.COURSE_CREATE, PERM.COURSE_MANAGE, PERM.COURSE_PUBLISH, PERM.CONTENT_MANAGE,
    PERM.PAYMENT_VIEW_ALL, PERM.PAYMENT_REFUND, PERM.ZOOM_MANAGE, PERM.ASSESSMENT_MANAGE,
    PERM.PROGRESS_VIEW_ALL, PERM.CERT_MANAGE, PERM.REPORT_VIEW, PERM.AUDIT_VIEW
  ],
  [ROLES.INSTRUCTOR]: [
    PERM.COURSE_MANAGE, PERM.CONTENT_MANAGE, PERM.PAYMENT_VIEW_LIMITED, PERM.PROGRESS_VIEW_ASSIGNED, PERM.REPORT_VIEW
  ],
  [ROLES.STUDENT]: [
    PERM.COURSE_ENROLL, PERM.CONTENT_VIEW, PERM.PAYMENT_VIEW_OWN, PERM.ZOOM_JOIN,
    PERM.ASSESSMENT_TAKE, PERM.PROGRESS_VIEW_OWN, PERM.CERT_VIEW_OWN
  ]
};

/* ------------------------------------------------------------------ */
/* Basic checks                                                         */
/* ------------------------------------------------------------------ */

export const isAdmin = u => u?.role === ROLES.ADMIN;
export const isStudent = u => u?.role === ROLES.STUDENT;
export const isStaff = u => u?.role === ROLES.ADMIN || u?.role === ROLES.INSTRUCTOR;

/** Suspended / unknown accounts have no permissions at all. */
export function hasPermission(user, perm) {
  if (!user || user.status !== 'Active') return false;
  if ((ROLE_PERMS[user.role] || []).includes(perm)) return true;
  return user.role === ROLES.INSTRUCTOR && GRANTABLE_SET.has(perm) && (user.grants || []).includes(perm);
}

/** Resource ownership: a course is "assigned" to exactly one instructor. */
export const ownsCourse = (user, course) => !!user && !!course && course.instructorId === user.id;

/** Permission + resource scope. Admin: all courses. Instructor: assigned courses only. */
export const canOnCourse = (user, perm, course) =>
  !!course && hasPermission(user, perm) && (isAdmin(user) || ownsCourse(user, course));

/* ------------------------------------------------------------------ */
/* Course lifecycle & access                                            */
/* ------------------------------------------------------------------ */

export const COURSE_ACTIONS = {
  publish: { from: 'draft', to: 'published', label: 'Publish', audit: 'Course published' },
  archive: { from: 'published', to: 'archived', label: 'Archive', audit: 'Course archived' },
  restore: { from: 'archived', to: 'draft', label: 'Restore', audit: 'Course restored to draft' }
};

export const canTransitionCourse = (user, course, action) =>
  !!course && course.status === COURSE_ACTIONS[action].from && canOnCourse(user, PERM.COURSE_PUBLISH, course);

/** Validate required fields before publishing (PDF §5). Returns a message or ''. */
export function publishProblem(course) {
  if (!course.title?.trim()) return 'Add a course title before publishing.';
  if (!course.description?.trim()) return 'Add a description before publishing.';
  if (!course.instructorId) return 'Assign an instructor before publishing.';
  return '';
}

/** Draft courses are never public. Archived ones stay visible to people already enrolled. */
export function canViewCourse(user, course, enrolledIds = []) {
  if (!user || user.status !== 'Active' || !course) return false;
  if (course.status === 'published') return true;
  if (isStudent(user)) return course.status === 'archived' && enrolledIds.includes(course.id);
  return canOnCourse(user, PERM.COURSE_MANAGE, course);
}

/** Only active, published courses can be newly enrolled in (PDF §5/§6). */
export const canEnrollInCourse = (user, course, enrolledIds = []) =>
  hasPermission(user, PERM.COURSE_ENROLL) && course?.status === 'published' && !enrolledIds.includes(course.id);

/** Lessons: students need an active enrolment; staff need content rights on that course. */
export function canAccessLessons(user, course, enrolledIds = []) {
  if (!course) return false;
  if (hasPermission(user, PERM.CONTENT_VIEW)) return enrolledIds.includes(course.id) && course.status !== 'draft';
  return canOnCourse(user, PERM.CONTENT_MANAGE, course);
}

/* ------------------------------------------------------------------ */
/* Zoom, payments, certificates                                         */
/* ------------------------------------------------------------------ */

/** Staff: only courses they may manage. Students: only meetings of their active enrolments. */
export function canViewMeeting(user, meeting, course, enrolledIds = []) {
  if (hasPermission(user, PERM.ZOOM_MANAGE)) return canOnCourse(user, PERM.ZOOM_MANAGE, course);
  if (hasPermission(user, PERM.ZOOM_JOIN)) return enrolledIds.includes(meeting.courseId);
  return false;
}

export function visiblePayments(user, payments, courses) {
  if (hasPermission(user, PERM.PAYMENT_VIEW_ALL)) return payments;
  if (hasPermission(user, PERM.PAYMENT_VIEW_LIMITED))
    return payments.filter(p => ownsCourse(user, courses.find(c => c.id === p.courseId)));
  if (hasPermission(user, PERM.PAYMENT_VIEW_OWN)) return payments.filter(p => p.studentId === user.id);
  return [];
}

export function visibleCertificates(user, certs, courses) {
  if (!hasPermission(user, PERM.CERT_MANAGE)) return hasPermission(user, PERM.CERT_VIEW_OWN) ? certs.filter(c => c.studentId === user.id) : [];
  return certs.filter(c => canOnCourse(user, PERM.CERT_MANAGE, courses.find(x => x.id === c.courseId)));
}

/* ------------------------------------------------------------------ */
/* Page access (route guard) and navigation                             */
/* ------------------------------------------------------------------ */

const any = (u, ...perms) => perms.some(p => hasPermission(u, p));

const PAGE_RULES = {
  'Overview': u => !!u && u.status === 'Active',
  'Explore courses': u => isStudent(u) && u.status === 'Active',
  'Course detail': u => isStudent(u) && u.status === 'Active',   // per-course checks happen in canViewCourse
  'Settings': u => !!u && u.status === 'Active',
  'My learning': u => any(u, PERM.CONTENT_VIEW),
  'Lesson player': u => any(u, PERM.CONTENT_VIEW, PERM.CONTENT_MANAGE), // per-course checks: canAccessLessons
  'Live classes': u => any(u, PERM.ZOOM_JOIN, PERM.ZOOM_MANAGE),
  'Assessments': u => any(u, PERM.ASSESSMENT_TAKE, PERM.ASSESSMENT_MANAGE),
  'Certificates': u => any(u, PERM.CERT_VIEW_OWN, PERM.CERT_MANAGE),
  'Payments': u => any(u, PERM.PAYMENT_VIEW_OWN, PERM.PAYMENT_VIEW_ALL, PERM.PAYMENT_VIEW_LIMITED),
  'Students': u => isAdmin(u) || u?.role === ROLES.INSTRUCTOR,
  'Manage courses': u => any(u, PERM.COURSE_MANAGE),
  'Reports': u => any(u, PERM.REPORT_VIEW),
  'Audit log': u => any(u, PERM.AUDIT_VIEW)
};

export const canAccessPage = (user, page) => !!PAGE_RULES[page] && PAGE_RULES[page](user);

const NAV_GROUPS = [
  { label: u => 'WORKSPACE', items: ['Overview', 'My learning', 'Explore courses', 'Live classes'] },
  { label: u => (isStudent(u) ? 'YOUR PROGRESS' : 'OUTCOMES'), items: ['Assessments', 'Certificates', 'Payments'] },
  { label: u => 'LEARNERS', items: ['Students'] },
  { label: u => 'TEACHING', items: ['Manage courses', 'Reports'] },
  { label: u => 'ADMINISTRATION', items: ['Audit log'] }
];

/** Sidebar: only groups/items the user can actually open. */
export const navFor = user =>
  NAV_GROUPS
    .map(g => ({ label: g.label(user), items: g.items.filter(p => canAccessPage(user, p)) }))
    .filter(g => g.items.length);

/* ------------------------------------------------------------------ */
/* Role matrix shown to admins (copied from PDF §3)                     */
/* ------------------------------------------------------------------ */

export const MATRIX_ROWS = [
  ['Manage users/roles', 'All', 'No', 'No'],
  ['Manage courses', 'All', 'Assigned courses', 'No'],
  ['Publish course', 'Yes', 'If permitted', 'No'],
  ['Manage lessons/resources', 'All', 'Assigned courses', 'View enrolled content'],
  ['Payments/refunds', 'All / authorized', 'Limited view', 'Own records'],
  ['Zoom meetings', 'All courses', 'Assigned, if permitted', 'View/join eligible'],
  ['Assessments', 'Configure', 'Create/manage if permitted', 'Take enrolled'],
  ['Progress/results', 'All students', 'Assigned students', 'Own records'],
  ['Certificates', 'Issue/revoke', 'If explicitly permitted', 'View/download own']
];

export const initialsOf = name =>
  (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
