
/**
 * Sample data for the frontend phase. Every export here is replaced by an API
 * call in the backend phase. Note the shape: courses carry an `instructorId`
 * (ownership) and a `status` (draft | published | archived).
 */

export const SEED_COURSES = [
  { id: 1, title: 'Product design, from zero to shipped', category: 'Design', level: 'Beginner', lessons: 18, hours: '6h 20m', price: 2499, instructorId: 'u-maya', status: 'published', learners: 48, version: 1, color: 'lilac', description: 'Learn to turn fuzzy ideas into clear, tested product experiences. Work through discovery, wireframes, prototypes and a real hand-off.', tags: ['Figma', 'Research', 'Prototyping'] },
  { id: 2, title: 'Modern JavaScript: the useful bits', category: 'Development', level: 'Intermediate', lessons: 24, hours: '8h 10m', price: 0, instructorId: 'u-arun', status: 'published', learners: 72, version: 1, color: 'mint', description: 'Build confidence with the JavaScript patterns you will actually use at work: async flows, modules, data transforms and clean interfaces.', tags: ['JavaScript', 'ES2024', 'Projects'] },
  { id: 3, title: 'Data storytelling with dashboards', category: 'Data', level: 'Beginner', lessons: 15, hours: '4h 45m', price: 1799, instructorId: 'u-nivetha', status: 'published', learners: 36, version: 1, color: 'peach', description: 'Make data easier to act on. Shape a question, choose the right chart, and build a dashboard that communicates the point quickly.', tags: ['Analytics', 'Charts', 'SQL'] },
  { id: 4, title: 'Build a brand people remember', category: 'Business', level: 'All levels', lessons: 12, hours: '3h 30m', price: 999, instructorId: 'u-rohit', status: 'published', learners: 91, version: 1, color: 'blue', description: 'A practical guide to positioning, voice and a visual system that stays consistent as your business grows.', tags: ['Strategy', 'Identity', 'Writing'] },
  { id: 5, title: 'SQL for everyday decisions', category: 'Data', level: 'Beginner', lessons: 20, hours: '5h 50m', price: 0, instructorId: 'u-nivetha', status: 'published', learners: 23, version: 1, color: 'yellow', description: 'Query real-world datasets, join tables without fear, and get to the answer behind the numbers.', tags: ['SQL', 'Databases', 'Reporting'] },
  { id: 6, title: 'Ship your first React app', category: 'Development', level: 'Intermediate', lessons: 22, hours: '7h 05m', price: 2999, instructorId: 'u-arun', status: 'published', learners: 14, version: 1, color: 'rose', description: 'Move from components to a deployed app with a practical workflow for state, routing, forms and accessible UI.', tags: ['React', 'Vite', 'Frontend'] },
  { id: 7, title: 'Research that changes decisions', category: 'Design', level: 'Intermediate', lessons: 10, hours: '3h 15m', price: 1499, instructorId: 'u-maya', status: 'draft', learners: 0, version: 1, color: 'lilac', description: 'Plan, run and present user research so that teams act on it.', tags: ['Interviews', 'Synthesis'] },
  { id: 8, title: 'Legacy jQuery patterns', category: 'Development', level: 'Beginner', lessons: 9, hours: '2h 40m', price: 0, instructorId: 'u-arun', status: 'archived', learners: 11, version: 1, color: 'rose', description: 'A look back at jQuery-era patterns, kept for existing learners.', tags: ['jQuery', 'Legacy'] }
];

/** Active enrolments per student. */
export const SEED_ENROLLMENTS = { 'u-kavin': [1, 2, 4], 'u-ananya': [3, 5], 'u-dev': [1, 2] };
/** Course progress per student (%). Server-calculated in production — never client-supplied. */
export const SEED_PROGRESS = { 'u-kavin': { 1: 68, 2: 32, 4: 100 }, 'u-ananya': { 3: 20, 5: 100 }, 'u-dev': { 1: 10, 2: 100 } };
export const SEED_COMPLETED = { 'u-kavin': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };

export const SEED_MEETINGS = [
  { id: 'm1', courseId: 1, title: 'Design critique: round two', day: '15', month: 'OCT', time: 'Today · 4:30 PM', duration: 45, status: 'Upcoming', label: 'Product design' },
  { id: 'm2', courseId: 2, title: 'JavaScript office hours', day: '17', month: 'OCT', time: 'Fri · 11:00 AM', duration: 30, status: 'Upcoming', label: 'Modern JavaScript' },
  { id: 'm3', courseId: 3, title: 'Dashboard teardown', day: '20', month: 'OCT', time: 'Mon · 3:00 PM', duration: 60, status: 'Upcoming', label: 'Data storytelling' },
  { id: 'm4', courseId: 6, title: 'React Q&A', day: '22', month: 'OCT', time: 'Wed · 5:00 PM', duration: 45, status: 'Upcoming', label: 'Ship your first React app' }
];

export const SEED_ASSESSMENTS = [
  { id: 'a1', courseId: 1, title: 'Design foundations knowledge check', questions: 6, duration: 10, passMark: 70, maxAttempts: 3, status: 'Published', version: 1 },
  { id: 'a2', courseId: 2, title: 'Async JavaScript quiz', questions: 8, duration: 15, passMark: 60, maxAttempts: 2, status: 'Draft', version: 1 },
  { id: 'a3', courseId: 3, title: 'Choosing the right chart', questions: 5, duration: 8, passMark: 70, maxAttempts: 3, status: 'Published', version: 2 }
];

export const SEED_PAYMENTS = [
  { id: 'pay-1', studentId: 'u-kavin', courseId: 1, amount: 2499, status: 'Paid', date: '02 Oct 2026', ref: 'order_Qx7…41' },
  { id: 'pay-2', studentId: 'u-kavin', courseId: 4, amount: 999, status: 'Paid', date: '28 Sep 2026', ref: 'order_Pz2…93' },
  { id: 'pay-3', studentId: 'u-ananya', courseId: 3, amount: 1799, status: 'Paid', date: '09 Oct 2026', ref: 'order_Rt5…08' },
  { id: 'pay-4', studentId: 'u-ananya', courseId: 6, amount: 2999, status: 'Failed', date: '10 Oct 2026', ref: 'order_Sw9…27' },
  { id: 'pay-5', studentId: 'u-dev', courseId: 1, amount: 2499, status: 'Refunded', date: '30 Sep 2026', ref: 'order_Nb3…66' }
];

export const SEED_CERTIFICATES = [
  { id: 'IN-26-BBR-001', studentId: 'u-kavin', courseId: 4, issued: '08 OCT 2026', status: 'Issued' },
  { id: 'IN-26-SQL-014', studentId: 'u-ananya', courseId: 5, issued: '11 OCT 2026', status: 'Issued' },
  { id: 'IN-26-JS-007', studentId: 'u-dev', courseId: 2, issued: '03 OCT 2026', status: 'Revoked' }
];

export const SEED_AUDIT = [
  { id: 'au-3', actor: 'Priya Nair', role: 'Admin', action: 'Role changed', entity: 'Maya Krishnan', detail: 'Student → Instructor', time: '12 Oct, 10:42 am' },
  { id: 'au-2', actor: 'Maya Krishnan', role: 'Instructor', action: 'Meeting cancelled', entity: 'Layout clinic', detail: 'Product design', time: '11 Oct, 5:10 pm' },
  { id: 'au-1', actor: 'Priya Nair', role: 'Admin', action: 'Payment refunded', entity: 'pay-5 · Dev Anand', detail: 'Reason: duplicate purchase', time: '30 Sep, 3:25 pm' }
];

/**
 * Mock sign-in. The server replaces this: it checks the password hash, returns a
 * short-lived access token and puts the role in the token. The UI never decides a role.
 * Wrong email/password/workspace all return the SAME message (no account enumeration).
 */
export function mockAuthenticate(users, email, password, workspace) {
  const generic = { ok: false, message: 'Email, password or workspace is incorrect.' };
  const u = users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || password !== DEMO_PASSWORD || u.role !== workspace) return generic;
  if (u.status !== 'Active') return { ok: false, message: 'This account is suspended. Please contact an administrator.' };
  return { ok: true, user: u };
}

export const stamp = () =>
  new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });

/** "2026-10-21" + "16:30" → { day:'21', month:'OCT', time:'Wed · 4:30 PM' } */
export function formatMeetingWhen(date, time) {
  const d = new Date(`${date}T${time}`);
  if (Number.isNaN(d.getTime())) return { day: '--', month: '---', time };
  return {
    day: String(d.getDate()),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    time: `${d.toLocaleString('en-US', { weekday: 'short' })} · ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  };
}
