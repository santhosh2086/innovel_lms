import { describe, expect, it } from 'vitest';
import { SEED_COURSES } from './data.js';
import {
  PERM, canAccessLessons, canAccessPage, canEnrollInCourse, canOnCourse, canTransitionCourse, canViewCourse,
  hasPermission, navFor, visibleCertificates, visiblePayments
} from './rbac.js';
import { SEED_CERTIFICATES, SEED_PAYMENTS } from './data.js';

const testUsers = [
  {id:'u-admin',name:'Admin Test',email:'admin@test.invalid',role:'Admin',status:'Active',grants:[]},
  {id:'u-maya',name:'Instructor Maya',email:'maya@test.invalid',role:'Instructor',status:'Active',grants:[PERM.COURSE_PUBLISH,PERM.ZOOM_MANAGE,PERM.ASSESSMENT_MANAGE,PERM.CERT_MANAGE]},
  {id:'u-arun',name:'Instructor Arun',email:'arun@test.invalid',role:'Instructor',status:'Active',grants:[PERM.ZOOM_MANAGE]},
  {id:'u-nivetha',name:'Instructor Nivetha',email:'nivetha@test.invalid',role:'Instructor',status:'Active',grants:[]},
  {id:'u-kavin',name:'Student Test',email:'student@test.invalid',role:'Student',status:'Active',grants:[]},
  {id:'u-dev',name:'Suspended Test',email:'suspended@test.invalid',role:'Student',status:'Suspended',grants:[]}
];
const u = id => testUsers.find(x => x.id === id);
const c = id => SEED_COURSES.find(x => x.id === id);
const admin = u('u-admin'), maya = u('u-maya'), arun = u('u-arun'), nivetha = u('u-nivetha'), kavin = u('u-kavin'), dev = u('u-dev');

describe('role matrix (PDF §3)', () => {
  it('student records are visible only to admin and instructors', () => {
    expect(canAccessPage(admin, 'Students')).toBe(true);
    expect(canAccessPage(maya, 'Students')).toBe(true);
    expect(canAccessPage(kavin, 'Students')).toBe(false);
  });
  it('only admins manage users and roles', () => {
    expect(hasPermission(admin, PERM.USER_MANAGE)).toBe(true);
    expect(hasPermission(maya, PERM.USER_MANAGE)).toBe(false);
    expect(hasPermission(kavin, PERM.USER_MANAGE)).toBe(false);
  });
  it('instructors manage only assigned courses', () => {
    expect(canOnCourse(maya, PERM.COURSE_MANAGE, c(1))).toBe(true);
    expect(canOnCourse(maya, PERM.COURSE_MANAGE, c(2))).toBe(false);
    expect(canOnCourse(admin, PERM.COURSE_MANAGE, c(2))).toBe(true);
    expect(canOnCourse(kavin, PERM.COURSE_MANAGE, c(1))).toBe(false);
  });
  it('publishing, zoom, assessments and certificates need an explicit grant for instructors', () => {
    for (const p of [PERM.COURSE_PUBLISH, PERM.ZOOM_MANAGE, PERM.ASSESSMENT_MANAGE, PERM.CERT_MANAGE]) {
      expect(hasPermission(nivetha, p)).toBe(false);
      expect(hasPermission(maya, p)).toBe(true);
    }
    expect(hasPermission(arun, PERM.ZOOM_MANAGE)).toBe(true);
    expect(hasPermission(arun, PERM.COURSE_PUBLISH)).toBe(false);
  });
  it('a grant is useless outside the assigned course', () => {
    expect(canOnCourse(maya, PERM.COURSE_PUBLISH, c(7))).toBe(true);   // hers
    expect(canOnCourse(maya, PERM.COURSE_PUBLISH, c(8))).toBe(false);  // Arun's
  });
  it('students cannot escalate by carrying grants', () => {
    expect(hasPermission({ ...kavin, grants: [PERM.COURSE_PUBLISH, PERM.USER_MANAGE] }, PERM.COURSE_PUBLISH)).toBe(false);
  });
  it('a suspended account has no permissions at all', () => {
    expect(hasPermission(dev, PERM.CONTENT_VIEW)).toBe(false);
    expect(canAccessPage(dev, 'Overview')).toBe(false);
  });
});

describe('course lifecycle & access', () => {
  it('drafts are hidden from students and from non-owners, archived stay visible to enrolled students', () => {
    expect(canViewCourse(kavin, c(7), [1, 2, 4])).toBe(false);
    expect(canViewCourse(arun, c(7), [])).toBe(false);
    expect(canViewCourse(maya, c(7), [])).toBe(true);
    expect(canViewCourse(admin, c(7), [])).toBe(true);
    expect(canViewCourse(kavin, c(8), [])).toBe(false);
    expect(canViewCourse(kavin, c(8), [8])).toBe(true);
  });
  it('only published courses can be newly enrolled in, and only by students', () => {
    expect(canEnrollInCourse(kavin, c(3), [1])).toBe(true);
    expect(canEnrollInCourse(kavin, c(7), [])).toBe(false);
    expect(canEnrollInCourse(kavin, c(8), [])).toBe(false);
    expect(canEnrollInCourse(kavin, c(1), [1])).toBe(false);
    expect(canEnrollInCourse(admin, c(3), [])).toBe(false);
  });
  it('students need an active enrolment for lessons; staff need content rights on that course', () => {
    expect(canAccessLessons(kavin, c(3), [1, 2, 4])).toBe(false);
    expect(canAccessLessons(kavin, c(1), [1, 2, 4])).toBe(true);
    expect(canAccessLessons(maya, c(1), [])).toBe(true);
    expect(canAccessLessons(maya, c(2), [])).toBe(false);
  });
  it('publish/archive/restore follow status and permission', () => {
    expect(canTransitionCourse(maya, c(7), 'publish')).toBe(true);
    expect(canTransitionCourse(maya, c(1), 'publish')).toBe(false);   // already published
    expect(canTransitionCourse(maya, c(1), 'archive')).toBe(true);
    expect(canTransitionCourse(arun, c(8), 'restore')).toBe(false);   // no publish grant
    expect(canTransitionCourse(admin, c(8), 'restore')).toBe(true);
    expect(canTransitionCourse(kavin, c(1), 'archive')).toBe(false);
  });
});

describe('payments & certificates scoping', () => {
  it('students see only their own payments; instructors only their courses; admin all', () => {
    expect(visiblePayments(kavin, SEED_PAYMENTS, SEED_COURSES).every(p => p.studentId === 'u-kavin')).toBe(true);
    expect(visiblePayments(arun, SEED_PAYMENTS, SEED_COURSES).every(p => c(p.courseId).instructorId === 'u-arun')).toBe(true);
    expect(visiblePayments(admin, SEED_PAYMENTS, SEED_COURSES)).toHaveLength(SEED_PAYMENTS.length);
  });
  it('instructors see certificates only with the grant and only for assigned courses', () => {
    expect(visibleCertificates(nivetha, SEED_CERTIFICATES, SEED_COURSES)).toHaveLength(0);
    expect(visibleCertificates(maya, SEED_CERTIFICATES, SEED_COURSES)).toHaveLength(0); // none of Maya's courses have one
    expect(visibleCertificates(admin, SEED_CERTIFICATES, SEED_COURSES)).toHaveLength(SEED_CERTIFICATES.length);
    expect(visibleCertificates(kavin, SEED_CERTIFICATES, SEED_COURSES).every(x => x.studentId === 'u-kavin')).toBe(true);
  });
});

describe('navigation / route guard', () => {
  const pages = user => navFor(user).flatMap(g => g.items);
  it('student', () => {
    expect(pages(kavin)).toEqual(['Overview', 'My learning', 'Explore courses', 'Live classes', 'Assessments', 'Certificates', 'Payments']);
  });
  it('instructor without extras', () => {
    expect(pages(nivetha)).toEqual(['Overview', 'Payments', 'Manage courses', 'Reports']);
  });
  it('instructor with all extras', () => {
    expect(pages(maya)).toEqual(['Overview', 'Live classes', 'Assessments', 'Certificates', 'Payments', 'Manage courses', 'Reports']);
  });
  it('Explore courses is student-only', () => {
    expect(canAccessPage(kavin, 'Explore courses')).toBe(true);
    expect(canAccessPage(admin, 'Explore courses')).toBe(false);
    expect(canAccessPage(maya, 'Explore courses')).toBe(false);
  });
  it('admin gets people and audit log, students never do', () => {
    expect(pages(admin)).toContain('People');
    expect(pages(admin)).toContain('Audit log');
    expect(canAccessPage(kavin, 'People')).toBe(false);
    expect(canAccessPage(kavin, 'Manage courses')).toBe(false);
    expect(canAccessPage(maya, 'People')).toBe(false);
    expect(canAccessPage(nivetha, 'Live classes')).toBe(false);
    expect(canAccessPage(admin, 'My learning')).toBe(false);
  });
});
