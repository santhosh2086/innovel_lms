import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Award, Bell, BookOpen,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardList, Clock3, Code2, Compass, CreditCard, Download, FileText, GraduationCap, LayoutDashboard,
  LifeBuoy, LockKeyhole, LogOut, Menu, MoreHorizontal, Play, Plus, Search, Settings,
  ShieldCheck, Sparkles, Target, Users, Video, X, Zap, Lightbulb, PencilRuler, Library, NotebookPen
} from 'lucide-react';
import './styles.css';
import {
  SEED_COURSES, SEED_ENROLLMENTS, SEED_PROGRESS, SEED_COMPLETED, SEED_MEETINGS, SEED_ASSESSMENTS,
  SEED_PAYMENTS, SEED_CERTIFICATES, SEED_AUDIT, stamp, formatMeetingWhen
} from './data.js';
import {
  PERM, ROLES, GRANTABLE, COURSE_ACTIONS, canAccessLessons, canAccessPage, canEnrollInCourse, canOnCourse,
  canTransitionCourse, canViewCourse, canViewMeeting, hasPermission, initialsOf, isAdmin, isStudent, navFor, publishProblem
} from './rbac.js';
import { PageTitle, SectionHeading, Stat, AccessDenied } from './ui.jsx';
import { StaffDashboard, ManageCourses, AuditLog, PaymentsPage, AssessmentManager, CertificateManager, Reports, StudentsPage } from './staff.jsx';
import { LiveClasses, SettingsPage } from './shared.jsx';

// Sidebar icons per page. Which pages a user sees is decided by navFor(user) in rbac.js.
const NAV_ICONS = {
  'Overview': LayoutDashboard, 'My learning': BookOpen, 'Explore courses': Compass, 'Live classes': Video,
  'Assessments': Target, 'Certificates': Award, 'Payments': CreditCard,
  'Manage courses': BookOpen, 'Reports': Activity, 'Audit log': ClipboardList, 'Students': Users
};

export default function App() {
  /* ---- data (replaced by API calls in the backend phase) ---- */
  const [users, setUsers] = useState([]);
  const [studentRecords, setStudentRecords] = useState([]);
  const [apiToken, setApiToken] = useState('');
  const [rawCourses, setRawCourses] = useState(SEED_COURSES);
  const [meetings, setMeetings] = useState(SEED_MEETINGS);
  const [assessments, setAssessments] = useState(SEED_ASSESSMENTS);
  const [certificates, setCertificates] = useState(SEED_CERTIFICATES);
  const [payments, setPayments] = useState(SEED_PAYMENTS);
  const [audit, setAudit] = useState(SEED_AUDIT);
  const [enrollments, setEnrollments] = useState(SEED_ENROLLMENTS);
  const [completedMap, setCompletedMap] = useState(SEED_COMPLETED);

  /* ---- session: the role ALWAYS comes from the signed-in account, never from a UI control ---- */
  const [sessionUserId, setSessionUserId] = useState(null);
  const [loginRole, setLoginRole] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  /* ---- ui state ---- */
  const [page, setPage] = useState('Overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(1);
  const [notice, setNotice] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [modal, setModal] = useState('');
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(3);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  const user = users.find(u => u.id === sessionUserId && u.status === 'Active') || null;
  const enrolled = user ? (enrollments[user.id] || []) : [];
  const completed = user ? (completedMap[user.id] || []) : [];

  /* courses = stored course + instructor name (from the users list) + this student's progress */
  const courses = useMemo(() => rawCourses.map(c => {
    const name = users.find(u => u.id === c.instructorId)?.name || 'Unassigned';
    return { ...c, instructor: name, initials: initialsOf(name), progress: SEED_PROGRESS[user?.id]?.[c.id] ?? 0 };
  }), [rawCourses, users, user?.id]);
  const selectedCourse = courses.find(c => c.id === selectedId) || courses[0];

  /* catalogue: drafts are never public; archived stay visible only to people already enrolled */
  const filteredCourses = useMemo(() => courses.filter(c => {
    if (!canViewCourse(user, c, enrolled)) return false;
    const matchesText = `${c.title} ${c.category} ${c.instructor}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || c.category === filter || (filter === 'Free' && c.price === 0) || (filter === 'Paid' && c.price > 0);
    return matchesText && matchesFilter;
  }), [courses, user, enrolled, search, filter]);

  /* live classes: students → active enrolments only; staff → courses they may manage */
  const sessions = user ? meetings.map(m => {
    const c = courses.find(x => x.id === m.courseId);
    return c && canViewMeeting(user, m, c, enrolled) ? { ...m, host: c.instructor, color: c.color } : null;
  }).filter(Boolean) : [];
  const upcoming = sessions.filter(s => s.status === 'Upcoming');

  const myCerts = user ? certificates.filter(c => c.studentId === user.id) : [];
  const myCert = myCerts[0];
  const studentAssessment = assessments.find(a => a.id === 'a1' && a.status === 'Published' && enrolled.includes(a.courseId)); // sample quiz is for course 1

  const toast = message => { setNotice(message); window.setTimeout(() => setNotice(''), 2800); };
  const denyToast = () => toast('Your role does not allow that action.');
  const logAudit = (action, entity, detail) => setAudit(prev => [{ id: `au-${Date.now()}-${prev.length}`, actor: user.name, role: user.role, action, entity, detail, time: stamp() }, ...prev]);
  const navigate = next => { setPage(next); setMobileNav(false); setShowProfile(false); setShowNotifications(false); };

  /* ---- learning ---- */
  const openCourse = course => { if (!canViewCourse(user, course, enrolled)) return denyToast(); setSelectedId(course.id); setPage('Course detail'); };
  const startCourse = course => { if (!canAccessLessons(user, course, enrolled)) return toast('Enrol in this course to open its lessons.'); setSelectedId(course.id); setLessonIndex(3); setPage('Lesson player'); };
  const toggleComplete = id => {
    if (!hasPermission(user, PERM.CONTENT_VIEW)) return denyToast(); // only students record their own progress
    setCompletedMap(prev => { const cur = prev[user.id] || []; return { ...prev, [user.id]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }; });
  };
  const handleEnroll = async () => {
    if (!canEnrollInCourse(user, selectedCourse, enrolled)) return toast('Enrolment is not available for this course.');
    if (selectedCourse.price > 0) { setModal('checkout'); return; }
    try { const r=await fetch(`${apiBase}/enrollments/${selectedCourse.id}`,{method:'POST',headers:{Authorization:`Bearer ${apiToken}`}}); const j=await r.json(); if(!r.ok)throw new Error(j?.error?.message||'Could not save enrolment.'); setEnrollments(prev => ({ ...prev, [user.id]: [...new Set([...(prev[user.id] || []), selectedCourse.id])] })); setModal('enrolled'); } catch(e) { toast(e.message||'Could not save enrolment to the database.'); }
  };

  /* ---- courses (admin: all · instructor: assigned) ---- */
  const saveCourse = (data, existing) => {
    const clean = { title: data.title.trim(), description: data.description.trim(), category: data.category, price: data.price };
    if (existing) {
      if (!canOnCourse(user, PERM.COURSE_MANAGE, existing)) return denyToast();
      setRawCourses(prev => prev.map(c => c.id === existing.id ? { ...c, ...clean, instructorId: isAdmin(user) ? data.instructorId : c.instructorId } : c));
      logAudit('Course updated', clean.title, 'Details edited'); toast(`“${clean.title}” updated.`); return;
    }
    if (!hasPermission(user, PERM.COURSE_CREATE)) return denyToast();
    const color = { Design: 'lilac', Development: 'mint', Data: 'peach', Business: 'blue' }[data.category] || 'lilac';
    setRawCourses(prev => [...prev, { id: Math.max(...prev.map(c => c.id)) + 1, ...clean, level: 'All levels', lessons: 0, hours: '0h 00m', instructorId: data.instructorId, status: 'draft', learners: 0, version: 1, color, tags: [] }]);
    logAudit('Course created', clean.title, 'Saved as draft'); toast(`Draft “${clean.title}” created.`);
  };
  const changeCourseStatus = (course, action) => {
    if (!canTransitionCourse(user, course, action)) return denyToast();
    if (action === 'publish') { const problem = publishProblem(course); if (problem) return toast(problem); }
    const { to, audit: label } = COURSE_ACTIONS[action];
    setRawCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: to } : c));
    logAudit(label, course.title, `Status: ${course.status} → ${to}`); toast(`“${course.title}” is now ${to}.`);
  };

  /* ---- live classes ---- */
  const joinMeeting = async meeting => {
    if (!apiToken) return toast('Please sign in again before opening Zoom.');
    try {
      const response = await fetch(`${apiBase}/zoom-meetings/${meeting.id}/join`, {headers:{Authorization:`Bearer ${apiToken}`}});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Could not get the Zoom join link.');
      if (!payload.joinUrl) throw new Error('Zoom did not return a participant join link.');
      window.open(payload.joinUrl, '_blank', 'noopener,noreferrer');
    } catch (e) { toast(e.message || 'Could not open Zoom meeting.'); }
  };

  const scheduleMeeting = async d => {
    const course = courses.find(c => Number(c.id) === Number(d.courseId));
    if (!course || course.status !== 'published' || !canOnCourse(user, PERM.ZOOM_MANAGE, course)) return denyToast();
    if (!apiToken) return toast('Please sign in again before scheduling a class.');
    try {
      const startAt = new Date(`${d.date}T${d.time}`).toISOString();
      const response = await fetch(`${apiBase}/admin/zoom-meetings`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiToken}`},body:JSON.stringify({courseId:Number(course.id),topic:d.title.trim(),startAt,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',durationMinutes:Number(d.duration)})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Could not save live class.');
      const m = payload.meeting;
      setMeetings(prev => [...prev, {id:String(m.id),courseId:Number(m.course_id),title:m.topic,...formatMeetingWhen(d.date,d.time),date:d.date,time:d.time,duration:Number(m.duration_minutes),status:'Upcoming',label:course.title}]);
      logAudit('Meeting scheduled', d.title.trim(), course.title); toast('Live class saved.');
    } catch(e) { toast(e.message || 'Could not save live class.'); }
  };
  const cancelMeeting = async m => {
    const course = courses.find(c => Number(c.id) === Number(m.courseId));
    if (!canOnCourse(user, PERM.ZOOM_MANAGE, course)) return denyToast();
    try {
      const response = await fetch(`${apiBase}/admin/zoom-meetings/${m.id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiToken}`},body:JSON.stringify({status:'cancelled'})});
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error?.message||'Could not cancel live class.');
      setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, status: 'Cancelled' } : x));
      logAudit('Meeting cancelled', m.title, course.title); toast('Class cancelled.');
    } catch(e) { toast(e.message || 'Could not cancel live class.'); }
  };

  /* ---- assessments ---- */
  const saveAssessment = (d, existing) => {
    const course = courses.find(c => c.id === (existing ? existing.courseId : d.courseId));
    if (!canOnCourse(user, PERM.ASSESSMENT_MANAGE, course)) return denyToast();
    if (existing) {
      setAssessments(prev => prev.map(a => a.id === existing.id ? { ...a, title: d.title.trim(), duration: d.duration, passMark: d.passMark, maxAttempts: d.maxAttempts, version: a.version + 1 } : a));
      logAudit('Assessment updated', existing.title, `Saved as v${existing.version + 1}`);
    } else {
      setAssessments(prev => [...prev, { id: `a${Date.now()}`, courseId: d.courseId, title: d.title.trim(), questions: d.questions, duration: d.duration, passMark: d.passMark, maxAttempts: d.maxAttempts, status: 'Draft', version: 1 }]);
      logAudit('Assessment created', d.title.trim(), course.title);
    }
    toast('Assessment saved.');
  };
  const toggleAssessment = a => {
    const course = courses.find(c => c.id === a.courseId);
    if (!canOnCourse(user, PERM.ASSESSMENT_MANAGE, course)) return denyToast();
    const to = a.status === 'Published' ? 'Draft' : 'Published';
    setAssessments(prev => prev.map(x => x.id === a.id ? { ...x, status: to } : x));
    logAudit(`Assessment ${to === 'Published' ? 'published' : 'unpublished'}`, a.title, course.title);
  };

  /* ---- certificates & payments ---- */
  const changeCertificate = type => (cert, reason) => {
    const course = courses.find(c => c.id === cert.courseId);
    if (!canOnCourse(user, PERM.CERT_MANAGE, course)) return denyToast();
    setCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, status: type === 'revoke' ? 'Revoked' : 'Issued' } : c));
    logAudit(type === 'revoke' ? 'Certificate revoked' : 'Certificate reissued', cert.id, `Reason: ${reason}`);
    toast(type === 'revoke' ? 'Certificate revoked.' : 'Certificate reissued.');
  };
  const refundPayment = async (p, reason) => {
    if (!hasPermission(user, PERM.PAYMENT_REFUND)) return denyToast();
    if (!apiToken) return toast('Please sign in again before refunding a payment.');
    try {
      const response = await fetch(`${apiBase}/payments/${p.id}/refund`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiToken}`},body:JSON.stringify({reason})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Razorpay refund failed.');
      setPayments(prev => prev.map(x => x.id === p.id ? {...x,status:'Refunded'} : x));
      logAudit('Payment refunded', `${p.id} · ${users.find(u => u.id === p.studentId)?.name}`, `Reason: ${reason}`);
      toast('Razorpay confirmed the refund.');
    } catch(e) { toast(e.message || 'Could not refund payment.'); }
  };

  /* ---- people (admin only) ---- */
  const activeAdmins = users.filter(u => u.role === ROLES.ADMIN && u.status === 'Active').length;
  const changeRole = (target, role) => {
    if (!hasPermission(user, PERM.USER_MANAGE) || target.id === user.id) return denyToast();
    if (target.role === ROLES.ADMIN && activeAdmins < 2) return toast('At least one active administrator is required.');
    if (target.role === ROLES.INSTRUCTOR && rawCourses.some(c => c.instructorId === target.id)) return toast(`Reassign ${target.name.split(' ')[0]}'s courses before changing their role.`);
    setUsers(prev => prev.map(u => u.id === target.id ? { ...u, role, grants: [] } : u));
    logAudit('Role changed', target.name, `${target.role} → ${role}`); toast(`${target.name} is now ${role === ROLES.ADMIN ? 'an' : 'a'} ${role}.`);
  };
  const toggleUserStatus = target => {
    if (!hasPermission(user, PERM.USER_MANAGE) || target.id === user.id) return denyToast();
    const to = target.status === 'Active' ? 'Suspended' : 'Active';
    if (to === 'Suspended' && target.role === ROLES.ADMIN && activeAdmins < 2) return toast('At least one active administrator is required.');
    setUsers(prev => prev.map(u => u.id === target.id ? { ...u, status: to } : u));
    logAudit(to === 'Suspended' ? 'Account suspended' : 'Account activated', target.name, target.role); toast(`${target.name} is now ${to.toLowerCase()}.`);
  };
  const saveGrants = (target, grants) => {
    if (!hasPermission(user, PERM.USER_MANAGE) || target.role !== ROLES.INSTRUCTOR) return denyToast();
    setUsers(prev => prev.map(u => u.id === target.id ? { ...u, grants } : u));
    logAudit('Permissions changed', target.name, grants.length ? GRANTABLE.filter(g => grants.includes(g.perm)).map(g => g.label).join(', ') : 'No extra permissions');
    toast('Permissions saved.');
  };
  const renameSelf = name => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, name } : u));

  /* ---- sign in / out ---- */
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const handleLogin = async () => { setStudentRecords([]);
    if (!loginEmail.trim() || !loginPassword) { setLoginError('Enter your email address and password to continue.'); return; }
    try {
      const response = await fetch(`${apiBase}/auth/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginEmail,password:loginPassword,workspace:loginRole})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Email, password or workspace is incorrect.');
      const signedIn = {...payload.user,id:String(payload.user.id),grants:payload.user.grants||[]};
      setApiToken(payload.accessToken); setUsers(prev=>[...prev.filter(u=>String(u.id)!==String(signedIn.id)),signedIn]);
      setSessionUserId(String(signedIn.id)); setLoginRole(''); setPage('Overview'); setLoginError(''); setLoginPassword('');
      // Load persisted workspace data from PostgreSQL-backed APIs; never silently replace a successful empty result with demo records.
      const authHeaders={Authorization:`Bearer ${payload.accessToken}`};
      const courseEndpoint=signedIn.role==='Admin'||signedIn.role==='Instructor'?`${apiBase}/courses/manage/list`:`${apiBase}/courses`;
      const [courseResponse,meetingResponse]=await Promise.all([fetch(courseEndpoint,{headers:authHeaders}),fetch(`${apiBase}/me/zoom-meetings`,{headers:authHeaders})]);
      if(courseResponse.ok){const cj=await courseResponse.json();const rows=cj.courses||[];setRawCourses(rows.map(c=>({id:Number(c.id),title:c.title,description:c.description||'',category:c.category||'Development',price:Number(c.price||0),level:c.level||'All levels',hours:c.duration||'8 weeks',instructorId:String(c.instructor_id||''),status:c.status,learners:0,version:c.version||1,color:'mint',tags:[]})));}
      if(meetingResponse.ok){const mj=await meetingResponse.json();setMeetings((mj.meetings||[]).map(m=>({id:String(m.id),courseId:Number(m.course_id),title:m.topic,label:m.course_title,date:new Date(m.start_at).toLocaleDateString(),time:new Date(m.start_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),duration:m.duration_minutes,status:m.status==='cancelled'?'Cancelled':new Date(m.start_at)>new Date()?'Upcoming':'Past',joinUrl:m.attendee_join_url})));}
      const paymentResponse=await fetch(`${apiBase}/payments/me`,{headers:authHeaders});
      if(paymentResponse.ok){const pj=await paymentResponse.json();setPayments((pj.payments||[]).map(p=>({id:String(p.id),studentId:String(p.student_id),courseId:Number(p.course_id),amount:Number(p.amount),status:p.status,date:new Date(p.created_at).toLocaleDateString('en-IN'),ref:p.gateway_payment_id||p.gateway_order_id||`payment-${p.id}`,courseTitle:p.course_title,studentName:p.student_name,currency:p.currency})));}
      if(signedIn.role==='Student'){const er=await fetch(`${apiBase}/me/enrollments`,{headers:authHeaders});if(er.ok){const ej=await er.json();setEnrollments({[String(signedIn.id)]:(ej.enrollments||[]).filter(e=>e.status==='Active').map(e=>Number(e.course_id))});}}
      const userResponse= signedIn.role==='Admin'?await fetch(`${apiBase}/admin/users`,{headers:authHeaders}):null;
      if(userResponse?.ok){const uj=await userResponse.json();setUsers(prev=>[...prev.filter(u=>!uj.users.some(db=>String(db.id)===String(u.id))),...uj.users.map(db=>({...db,id:String(db.id),grants:db.grants||[]}))]);} const studentsResponse=(signedIn.role==='Admin'||signedIn.role==='Instructor')?await fetch(`${apiBase}/students`,{headers:authHeaders}):null; if(studentsResponse?.ok){const sj=await studentsResponse.json();setStudentRecords(sj.students||[]);}
      setQuizDone(false); setQuizAnswer(''); setModal(''); setFilter('All'); setSearch('');
    } catch (error) { setLoginError(error.message || 'Could not connect to the LMS server.'); }
  };
  const handleLogout = async () => { setStudentRecords([]); try { if(apiToken) await fetch(`${apiBase}/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${apiToken}`}}); } catch {} setApiToken(''); setSessionUserId(null); setLoginRole(''); setLoginPassword(''); setPage('Overview'); setShowProfile(false); setModal(''); };
  const callSignup = async (path,body) => { const r=await fetch(`${apiBase}/signup/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j=await r.json(); if(!r.ok)throw new Error(j?.error?.message||'Signup request failed.'); return j; };
  const signupRequestOtp = (name,email) => callSignup('request-otp',{name,email});
  const signupVerifyOtp = (email,otp) => callSignup('verify-otp',{email,otp});
  const signupComplete = (email,signupToken,password) => callSignup('complete',{email,signupToken,password});

  if (!user) return <LoginPortal role={loginRole} setRole={setLoginRole} email={loginEmail} setEmail={setLoginEmail} password={loginPassword} setPassword={setLoginPassword} showPassword={showLoginPassword} setShowPassword={setShowLoginPassword} error={loginError} setError={setLoginError} onLogin={handleLogin} onRequestOtp={signupRequestOtp} onVerifyOtp={signupVerifyOtp} onCompleteSignup={signupComplete} onSignupCreated={(newUser)=>{setUsers(prev=>[...prev,{...newUser,id:String(newUser.id),grants:newUser.grants||[]}]);setLoginRole('Student');setLoginEmail(newUser.email);setLoginPassword('');setLoginError('');}} />;

  /* ---- route guard ---- */
  const student = isStudent(user);
  const initials = initialsOf(user.name);
  const blocked = !canAccessPage(user, page) ? 'page'
    : page === 'Course detail' && !canViewCourse(user, selectedCourse, enrolled) ? 'course'
    : page === 'Lesson player' && !canAccessLessons(user, selectedCourse, enrolled) ? 'lessons' : '';
  const notifications = student
    ? [{ tone: 'purple', title: 'Live class reminder', text: 'Design critique starts today at 4:30 PM.', when: '12 min ago' }, { tone: 'green', title: 'Lesson completed', text: 'Nice work — you finished “Layout foundations”.', when: 'Yesterday' }]
    : [{ tone: 'purple', title: 'New enrolment', text: 'A learner joined one of your courses.', when: '12 min ago' }, { tone: 'green', title: 'Course status', text: 'A draft course is waiting to be reviewed.', when: 'Yesterday' }];

  let content;
  if (blocked === 'page') content = <AccessDenied onHome={() => navigate('Overview')} />;
  else if (blocked === 'course') content = <AccessDenied title="This course isn't available." message="It may still be a draft, or it may have been withdrawn." onHome={() => navigate('Overview')} />;
  else if (blocked === 'lessons') content = <AccessDenied title="Lessons are for enrolled learners." message="Enrol in this course to open its lessons." onHome={() => navigate('Explore courses')} />;
  else content = <>
    {page === 'Overview' && (student
      ? <Dashboard user={user} courses={courses} upcoming={upcoming} certCount={myCerts.filter(c => c.status === 'Issued').length} enrolled={enrolled} completed={completed} onNavigate={navigate} onOpenCourse={openCourse} onStartCourse={startCourse} toast={toast} />
      : <StaffDashboard user={user} courses={courses} upcoming={upcoming} users={users} onNavigate={navigate} />)}
    {page === 'Explore courses' && <Explore courses={filteredCourses} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onOpenCourse={openCourse} enrolled={enrolled} />}
    {page === 'My learning' && <MyLearning courses={courses} enrolled={enrolled} completed={completed} onOpenCourse={openCourse} onStartCourse={startCourse} />}
    {page === 'Course detail' && <CourseDetail course={selectedCourse} user={user} enrolled={enrolled} onBack={() => navigate('Explore courses')} onEnroll={handleEnroll} onStart={() => startCourse(selectedCourse)} onManage={() => navigate('Manage courses')} />}
    {page === 'Lesson player' && <LessonPlayer course={selectedCourse} completed={completed} toggleComplete={toggleComplete} lessonIndex={lessonIndex} setLessonIndex={setLessonIndex} onBack={() => navigate(student ? 'My learning' : 'Manage courses')} toast={toast} readOnly={!student} />}
    {page === 'Live classes' && <LiveClasses user={user} sessions={sessions} courses={courses} onSchedule={scheduleMeeting} onCancel={cancelMeeting} onJoin={joinMeeting} toast={toast} />}
    {page === 'Assessments' && (student
      ? <Assessments assessment={studentAssessment} quizDone={quizDone} setQuizDone={setQuizDone} quizAnswer={quizAnswer} setQuizAnswer={setQuizAnswer} toast={toast} />
      : <AssessmentManager user={user} courses={courses} assessments={assessments} onSave={saveAssessment} onToggle={toggleAssessment} />)}
    {page === 'Certificates' && (student
      ? <Certificates user={user} cert={myCert} course={courses.find(c => c.id === myCert?.courseId)} onDownload={() => toast('Certificate PDF download will be connected to the backend.')} />
      : <CertificateManager user={user} certificates={certificates} courses={courses} users={users} onRevoke={changeCertificate('revoke')} onReissue={changeCertificate('reissue')} />)}
    {page === 'Payments' && <PaymentsPage user={user} payments={payments} courses={courses} users={users} onRefund={refundPayment} />}
    {page === 'Students' && <StudentsPage user={user} students={studentRecords} />}
    {page === 'Manage courses' && <ManageCourses user={user} courses={courses} users={users} onSave={saveCourse} onStatus={changeCourseStatus} />}
    {page === 'Audit log' && <AuditLog audit={audit} />}
    {page === 'Reports' && <Reports user={user} courses={courses} payments={payments} certificates={certificates} />}
    {page === 'Settings' && <SettingsPage user={user} onRename={renameSelf} toast={toast} />}
  </>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''} ${sideCollapsed ? 'collapsed' : ''}`}>
      <div className="brand-row brand-row-clean"><div className="brand-mark"><GraduationCap size={19}/></div><div className="brand-name">INNOVEL<span>Learning</span></div><button className="icon-btn sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">{!sideCollapsed && 'YOUR WORKSPACE'}<button className="collapse-btn" onClick={() => setSideCollapsed(!sideCollapsed)} title="Collapse sidebar"><ChevronLeft size={15}/></button></div>
      {navFor(user).map(group => <div className="nav-group" key={group.label}><div className="nav-caption">{!sideCollapsed && group.label}</div>{group.items.map(id => { const Icon = NAV_ICONS[id]; return <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)} title={id}><Icon size={18}/>{!sideCollapsed && <span>{id}</span>}{!sideCollapsed && id === 'Live classes' && upcoming.length > 0 && <span className="nav-count">{upcoming.length}</span>}</button>; })}</div>)}
      <div className="sidebar-spacer"/>
      <button className="nav-item sidebar-logout" onClick={handleLogout} title="Sign out"><LogOut size={18}/>{!sideCollapsed && <span>Logout</span>}</button>
      {!sideCollapsed && <div className="help-card"><div className="help-icon"><LifeBuoy size={17}/></div><strong>Need a hand?</strong><p>Good learning days start with fewer blockers.</p><button onClick={() => toast('Support centre is coming with the backend setup.')}>Visit help centre <ArrowUpRight size={14}/></button></div>}
      <button className="nav-item settings-link" onClick={() => navigate('Settings')} title="Settings"><Settings size={18}/>{!sideCollapsed && <span>Settings</span>}</button>
      <div className="sidebar-footer"><div className="avatar avatar-user">{initials}</div>{!sideCollapsed && <><div className="user-meta"><strong>{user.name}</strong><span>{user.role} account</span></div><button className="more-btn" onClick={() => setShowProfile(!showProfile)}><MoreHorizontal size={19}/></button></>}</div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}

    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div></div><div className="topbar-actions"><label className={`top-search ${courseSearchOpen ? 'search-open' : ''}`}><Search size={16}/><input value={search} onChange={e => { setSearch(e.target.value); if (page !== 'Explore courses') setPage('Explore courses'); }} placeholder="Search anything..."/><kbd>⌘ K</kbd></label><button className={`icon-btn notification-btn ${showNotifications ? 'pressed' : ''}`} onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }} aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-divider"/><button className="top-avatar" data-initials={initials} onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}>{initials}<ChevronDown size={13}/></button></div>
        {showNotifications && <div className="floating-panel notifications-panel"><div className="panel-heading"><strong>Notifications</strong><span className="small-pill">{notifications.length} new</span></div>{notifications.map(n => <div className="notification-row" key={n.title}><span className={`notification-dot ${n.tone}`}/><div><strong>{n.title}</strong><p>{n.text}</p><small>{n.when}</small></div></div>)}<button className="panel-link" onClick={() => { setShowNotifications(false); navigate('Overview'); }}>Go to overview <ArrowRight size={14}/></button></div>}
        {showProfile && <div className="floating-panel profile-panel"><div className="profile-panel-head"><div className="avatar avatar-user">{initials}</div><div><strong>{user.name}</strong><p>{user.email}</p></div></div><button onClick={() => { setShowProfile(false); navigate('Settings'); }}><Settings size={16}/> Account settings</button><div className="profile-role-row"><ShieldCheck size={16}/> Signed in as <span className="role-mini">{user.role}</span></div><button onClick={handleLogout}><LogOut size={16}/> Sign out</button></div>}
      </header>

      <div className="page-content">
        {content}
        {modal && student && <Modal type={modal} course={selectedCourse} apiBase={apiBase} apiToken={apiToken} onClose={() => setModal('')} onPaid={courseId=>setEnrollments(prev=>({...prev,[user.id]:[...new Set([...(prev[user.id]||[]),courseId])]}))} onSuccess={() => { setModal(''); toast('You are enrolled. Your learning space is ready.'); navigate('My learning'); }} toast={toast} />}
      </div>
      <footer className="page-footer"><span>© 2026 INNOVEL Learning</span><span><span className="status-dot"/> All systems operational <span className="footer-sep">·</span> Made for curious minds</span></footer>
    </main>
    {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice('')}><X size={14}/></button></div>}
  </div>;
}

function LoginPortal({role,setRole,email,setEmail,password,setPassword,showPassword,setShowPassword,error,setError,onLogin,onRequestOtp,onVerifyOtp,onCompleteSignup,onSignupCreated}) {
  const [mode,setMode]=useState('login'); const [name,setName]=useState(''); const [otp,setOtp]=useState(''); const [signupToken,setSignupToken]=useState(''); const [newPassword,setNewPassword]=useState(''); const [stage,setStage]=useState(1); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const roles=[{id:'Student',title:'Student',description:'Create an account or continue learning.',icon:GraduationCap},{id:'Instructor',title:'Instructor',description:'Manage your courses, lessons and learners.',icon:BookOpen},{id:'Admin',title:'Administrator',description:'Oversee courses, users and platform activity.',icon:ShieldCheck}]; const active=roles.find(x=>x.id===role);
  const run=async fn=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e.message||'Request failed.');}finally{setBusy(false);}};
  return <div className="login-portal"><div className="login-top"><div className="brand-row brand-row-clean"><div className="brand-mark"><GraduationCap size={19}/></div><div className="brand-name">INNOVEL<span>Learning</span></div></div><span className="login-top-note">LEARN. PRACTISE. GET CERTIFIED.</span></div><div className="login-layout"><section className="login-intro"><div className="eyebrow">YOUR CLASSROOM, ANYTIME</div><h1>Every lesson takes you <em>one step ahead.</em></h1><p>Join live classes, finish lessons at your own pace, take quizzes and earn certificates you can share.</p><div className="login-art login-art-photo"><img className="login-art-image" src="/course-images/learning-hero.jpg" alt="A bright study desk with learning books, laptop and notes" loading="eager"/></div><div className="login-quote">“An investment in knowledge pays the best interest.”</div></section><section className="login-panel"><div className="login-panel-heading"><span className="eyebrow">YOUR ACCOUNT</span><h2>{mode==='signup'?'Create your student account':active?`${active.title} sign in`:'Welcome back.'}</h2><p>{mode==='signup'?'Verify your email, then create a password.':active?`Sign in to continue to your ${active.title.toLowerCase()} workspace.`:'Choose your workspace to get started.'}</p></div>
  {mode==='signup'?<div className="login-form"><button type="button" className="login-back" onClick={()=>{setMode('login');setStage(1);setError('');setMessage('');}}> <ArrowLeft size={14}/> Back to sign in</button>
    {stage===1&&<><label className="login-field"><span>Full name</span><div className="login-input-wrap"><Users size={16}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required/></div></label><label className="login-field"><span>Email address</span><div className="login-input-wrap"><span>@</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></div></label><button className="login-submit" disabled={busy||name.trim().length<2||!email.includes('@')} onClick={()=>run(async()=>{const r=await onRequestOtp(name,email);setStage(2);setMessage(r.message);})}>{busy?'Sending code…':'Send verification code'} <ArrowRight size={16}/></button></>}
    {stage===2&&<><label className="login-field"><span>6-digit email OTP</span><div className="login-input-wrap"><ShieldCheck size={16}/><input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" placeholder="Code from your email" maxLength={6} required/></div></label><button className="login-submit" disabled={busy||otp.length!==6} onClick={()=>run(async()=>{const r=await onVerifyOtp(email,otp);setSignupToken(r.signupToken);setStage(3);setMessage(r.message);})}>{busy?'Verifying…':'Verify email'} <ArrowRight size={16}/></button></>}
    {stage===3&&<><label className="login-field"><span>Create password</span><div className="login-input-wrap"><LockKeyhole size={16}/><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 12 characters" minLength={12} required/></div></label><p className="login-security">Your password is securely hashed before storage.</p><button className="login-submit" disabled={busy||newPassword.length<12} onClick={()=>run(async()=>{const r=await onCompleteSignup(email,signupToken,newPassword);onSignupCreated(r.user);setMode('login');setStage(1);setNewPassword('');setOtp('');setMessage('Account created. Sign in using your email and password.');})}>{busy?'Creating account…':'Create student account'} <ArrowRight size={16}/></button></>}
    {message&&<div className="login-security" role="status">{message}</div>}{error&&<div className="login-error" role="alert">{error}</div>}</div>
  :!role?<div className="login-role-list">{roles.map(item=>{const Icon=item.icon;return <button className="login-role-card" key={item.id} onClick={()=>{setRole(item.id);setError('');}}><span className="login-role-icon"><Icon size={20}/></span><span className="login-role-copy"><strong>{item.title}</strong><small>{item.description}</small></span><ArrowRight size={17}/></button>})}</div>:<form className="login-form" onSubmit={e=>{e.preventDefault();onLogin();}} noValidate><button type="button" className="login-back" onClick={()=>{setRole('');setError('');setPassword('');}}> <ArrowLeft size={14}/> All account types</button><div className="login-selected-role"><span className="login-role-icon">{active&&<active.icon size={19}/>}</span><div><strong>{active?.title} workspace</strong><small>Separate sign-in for {active?.title.toLowerCase()}s</small></div><button type="button" onClick={()=>setRole('')} className="login-change">Change</button></div><label className="login-field"><span>Email address</span><div className="login-input-wrap"><span>@</span><input type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} required/></div></label><label className="login-field"><span>Password</span><div className="login-input-wrap"><LockKeyhole size={16}/><input type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} required/><button type="button" className="login-show-password" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button></div></label><div className="login-form-meta"><label className="login-remember"><input type="checkbox"/> Remember me</label><button type="button" className="login-text-button" onClick={()=>setError('Password reset workflow is not configured yet.')}>Forgot password?</button></div>{error&&<div className="login-error" role="alert">{error}</div>}<button className="login-submit" type="submit">Sign in to {active?.title.toLowerCase()} <ArrowRight size={16}/></button><p className="login-security"><ShieldCheck size={15}/> Your account access is role-specific.</p>{role==='Student'&&<button type="button" className="login-text-button" onClick={()=>{setMode('signup');setStage(1);setError('');setMessage('');}}>New student? Sign up with email OTP</button>}<p className="login-demo-note">Sign-in is verified by the backend. Student accounts are stored in PostgreSQL.</p></form>}
  <div className="login-panel-footer"><span>© 2026 INNOVEL Learning</span><span>Help · Privacy</span></div></section></div></div>;
}

function Dashboard({ user, courses, upcoming, certCount, enrolled, completed, onNavigate, onOpenCourse, onStartCourse, toast }) {
  const myCourses = courses.filter(c => enrolled.includes(c.id));
  const nextCourse = myCourses.find(c => c.progress < 100) || myCourses[0];
  return <>
    <section className="welcome-banner"><div className="edu-floaters" aria-hidden="true"><span className="fl fl-1"><BookOpen size={46}/></span><span className="fl fl-2"><Lightbulb size={38}/></span><span className="fl fl-3"><PencilRuler size={42}/></span><span className="fl fl-4"><Award size={40}/></span><span className="fl fl-5"><NotebookPen size={36}/></span></div><div className="welcome-copy"><div className="welcome-kicker"><GraduationCap size={14}/> {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><h1>Welcome back, {user.name.split(' ')[0]}.<br/>Ready for today’s lesson?</h1><p>Pick up where you left off. One lesson, one quiz, one step closer to your certificate.</p><div className="welcome-actions"><button className="btn btn-dark" disabled={!nextCourse} onClick={() => onStartCourse(nextCourse)}>Continue learning <ArrowRight size={16}/></button><button className="btn btn-quiet" onClick={() => onNavigate('Explore courses')}>Explore courses <Compass size={16}/></button></div></div><div className="welcome-art" aria-hidden="true"><div className="plan-board"><h3>Today’s study plan</h3><ul><li className="done"><i><Check size={12}/></i><span>Open your course</span></li><li><i/><span>Finish one lesson</span></li><li><i/><span>Take a quick quiz</span></li><li><i/><span>Join a live class</span></li></ul></div></div></section>
    <div className="stats-grid"><Stat icon={BookOpen} label="Courses in progress" value={String(myCourses.filter(c => c.progress < 100).length).padStart(2,'0')} note="One lesson at a time" tone="lilac"/><Stat icon={Clock3} label="Learning time" value="12.4h" note="+2.5h from last week" tone="mint" trend/><Stat icon={Target} label="Lessons completed" value={String(completed.length + 6)} note="You're building a habit" tone="peach"/><Stat icon={Award} label="Certificates earned" value={String(certCount).padStart(2,'0')} note={certCount ? 'Your first of many' : 'Finish a course to earn one'} tone="yellow"/></div>
    <div className="dashboard-grid"><section className="content-section"><SectionHeading title="Pick up where you left off" detail="Your current learning queue" action="View all" onAction={() => onNavigate('My learning')}/><div className="continue-list">{myCourses.filter(c => c.progress < 100).slice(0,3).map((c,i)=><CourseRow key={c.id} course={c} onClick={() => onStartCourse(c)} index={i}/>)}</div><div className="section-gap"/><SectionHeading title="Made for your next step" detail="A few good places to go from here" action="Browse catalogue" onAction={() => onNavigate('Explore courses')}/><div className="recommend-grid">{courses.filter(c=>!enrolled.includes(c.id)&&c.status==='published').slice(0,2).map(c=><CourseCard key={c.id} course={c} onClick={() => onOpenCourse(c)}/>)}</div></section><aside className="right-rail"><section className="streak-card"><div className="streak-head"><div><span className="eyebrow">YOUR RHYTHM</span><h3>You're on a roll.</h3></div><div className="streak-icon">✳</div></div><p>Learning a little, often, is how the good stuff sticks.</p><div className="week-row">{['M','T','W','T','F','S','S'].map((d,i)=><div className="week-day" key={i}><span>{d}</span><i className={i<4?'done':i===4?'today':''}>{i<4?<Check size={12}/>:i===4?'•':''}</i></div>)}</div><div className="streak-foot"><span><i className="tiny-dot"/> 4 day streak</span><span>Keep it going <ArrowUpRight size={13}/></span></div></section><section className="upcoming-section"><SectionHeading title="Coming up" detail="Live learning, together" action="Full schedule" onAction={() => onNavigate('Live classes')}/>{upcoming.slice(0,2).map((ev,i)=><div className="event-item" key={ev.title}><div className="event-date"><strong>{ev.day}</strong><span>{ev.month}</span></div><div className="event-info"><span className="event-time">{ev.time}</span><strong>{ev.title}</strong><small>{ev.host} · {ev.label}</small></div><button className="event-arrow" onClick={() => onNavigate('Live classes')}><ArrowUpRight size={15}/></button></div>)}{!upcoming.length&&<p className="muted-note">No upcoming sessions for your courses.</p>}</section><div className="quote-card"><div className="quote-mark">“</div><p>The beautiful thing about learning is nobody can take it away from you.</p><span>— B.B. King</span><div className="quote-line"/></div></aside></div>
  </>;
}
function CourseVisual({course, compact=false}) {
  // Match the artwork to the actual course title/category/tags, never the database ID.
  // Database IDs can change between local seed data and PostgreSQL records.
  const courseTitle = String(course.title || '').toLowerCase();
  const courseText = `${courseTitle} ${course.category || ''} ${(course.tags || []).join(' ')}`.toLowerCase();
  let image = 'web-development.jpg';
  // Match specific programming languages before the broad development fallback.
  // Python and Java must never inherit the generic HTML/CSS/React banner.
  if (/python|pandas|numpy|django|flask/.test(courseTitle)) image = 'python-programming.svg';
  else if (/java programming|java developer|core java|spring boot/.test(courseTitle)) image = 'java-programming.svg';
  else if (/jquery|legacy/.test(courseTitle)) image = 'legacy-jquery.jpg';
  else if (/full.?stack|mern|end.to.end/.test(courseTitle)) image = 'full-stack.jpg';
  else if (/digital marketing|marketing|social media|campaign/.test(courseTitle)) image = 'digital-marketing.jpg';
  else if (/sql|database|postgres|data storytelling|dashboard|analytics|data science/.test(courseTitle)) image = 'data-science.jpg';
  else if (/user research|research that changes|interview|synthesis/.test(courseTitle)) image = 'user-research.jpg';
  else if (/brand|business|communication|strategy|writing|identity/.test(courseTitle)) image = 'business-communication.jpg';
  else if (/product design|ui.?ux|figma|prototype|design/.test(courseTitle)) image = 'ui-ux-design.jpg';
  else if (/react app|react|javascript|web development|frontend|front.end/.test(courseTitle)) image = 'web-development.jpg';
  else if (/jquery|legacy/.test(courseText)) image = 'legacy-jquery.jpg';
  else if (/full.?stack|mern/.test(courseText)) image = 'full-stack.jpg';
  else if (/marketing|campaign/.test(courseText)) image = 'digital-marketing.jpg';
  else if (/sql|database|postgres|data|dashboard|analytics/.test(courseText)) image = 'data-science.jpg';
  else if (/research|interview|synthesis/.test(courseText)) image = 'user-research.jpg';
  else if (/brand|business|communication|strategy|writing|identity/.test(courseText)) image = 'business-communication.jpg';
  else if (/design|figma|prototype/.test(courseText)) image = 'ui-ux-design.jpg';

  return <div className={`course-visual course-visual-photo ${compact?'compact':''}`}>
    <img src={`/course-images/${image}`} alt={`${course.title} — relevant course tools and artwork`} loading="lazy"/>
    <div className="course-photo-shade"/>
    <div className="visual-label">{String(course.category || 'LEARNING').toUpperCase()} <span>·</span> COURSE</div>
    <div className="course-tool-tags">{(course.tags || []).slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div>
    <div className="visual-bottom"><span>{String(course.level || 'ALL LEVELS').toUpperCase()}</span><span>{String(course.lessons || 0).padStart(2,'0')} LESSONS</span></div>
  </div>;
}
function CourseRow({course,onClick,index}) { return <button className="course-row" onClick={onClick}><div className="row-course-art"><CourseVisual course={course} compact/></div><div className="row-course-main"><div className="row-course-top"><span className="category-label">{course.category}</span><span className="row-duration"><Clock3 size={12}/>{course.hours}</span></div><strong>{course.title}</strong><div className="row-progress"><div className="progress-track"><i style={{width:`${course.progress}%`}}/></div><span>{course.progress}%</span></div></div><span className="row-play"><Play size={15} fill="currentColor"/></span></button>; }
function CourseCard({course,onClick}) { return <button className="course-card" onClick={onClick}><CourseVisual course={course}/><div className="course-card-body"><div className="card-meta"><span className="category-label">{course.category}</span><span>{course.level}</span></div><h3>{course.title}</h3><div className="instructor-line"><span className={`avatar avatar-${course.color}`}>{course.initials}</span><span>{course.instructor}</span><span className="card-price">{course.price===0?'Free':`₹${course.price.toLocaleString('en-IN')}`}</span></div></div></button>; }
function Explore({courses:items,filter,setFilter,search,setSearch,onOpenCourse,enrolled}) { return <><PageTitle eyebrow="THE COURSE LIBRARY" title="Find your next thing." subtitle="Good skills, thoughtful teachers, and projects worth showing off." action={<button className="btn btn-dark" onClick={() => {setFilter('All');setSearch('')}}><Compass size={16}/> Reset discovery</button>}/><div className="catalogue-toolbar"><div className="filter-tabs">{['All','Design','Development','Data','Business','Free','Paid'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="results-count">{items.length} courses <span>·</span> thoughtfully picked</div></div>{items.length?<div className="catalogue-grid">{items.map(c=><div className="catalogue-card-wrap" key={c.id}><CourseCard course={c} onClick={()=>onOpenCourse(c)}/>{enrolled.includes(c.id)?<span className="enrolled-badge"><Check size={12}/> Enrolled</span>:c.status!=='published'&&<span className="enrolled-badge">{c.status[0].toUpperCase()+c.status.slice(1)}</span>}</div>)}</div>:<div className="empty-state"><div className="empty-icon"><Search size={23}/></div><h3>No courses found just yet</h3><p>Try a different search or loosen up the filters a little.</p><button className="btn btn-outline" onClick={()=>{setFilter('All');setSearch('')}}>Clear filters</button></div>}</>; }
function MyLearning({courses,enrolled,completed,onOpenCourse,onStartCourse}) { const list=courses.filter(c=>enrolled.includes(c.id)); return <><PageTitle eyebrow="YOUR LEARNING SPACE" title="Keep the momentum." subtitle="Every lesson is a small investment in the person you're becoming."/><div className="learning-summary"><div><span className="eyebrow">THIS WEEK</span><strong>2h 35m</strong><p>of focused learning time</p></div><div className="summary-divider"/><div><span className="eyebrow">COMPLETION</span><strong>{Math.round(list.reduce((a,c)=>a+c.progress,0)/(list.length||1))}%</strong><p>average across your courses</p></div><div className="summary-motif">✳</div></div><div className="section-heading learning-heading"><div><h2>In progress <span className="count-bubble">{list.filter(c=>c.progress<100).length}</span></h2><p>Your learning queue, right where you left it.</p></div><span className="sort-label">Recently active <ChevronDown size={14}/></span></div>{list.length?<div className="learning-list">{list.map(c=><div className="learning-card" key={c.id}><div className="learning-art" onClick={()=>onOpenCourse(c)}><CourseVisual course={c}/></div><div className="learning-card-content"><div className="card-meta"><span className="category-label">{c.category}</span><span>{c.lessons} lessons · {c.hours}</span></div><h3>{c.title}</h3><p>with {c.instructor}</p><div className="learning-progress"><div className="progress-track"><i style={{width:`${c.progress}%`}}/></div><span>{c.progress}% complete</span></div><div className="learning-card-actions"><button className="btn btn-dark" onClick={()=>onStartCourse(c)}>{c.progress?'Continue course':'Start learning'} <ArrowRight size={15}/></button><button className="btn btn-quiet" onClick={()=>onOpenCourse(c)}>Course details</button></div></div></div>)}</div>:<div className="empty-state"><div className="empty-icon"><BookOpen size={24}/></div><h3>Your next chapter starts here.</h3><p>Explore the library and enrol in a course to get going.</p></div>}</>; }
function CourseDetail({course,user,enrolled,onBack,onEnroll,onStart,onManage}) { const isEnrolled=enrolled.includes(course.id); const student=isStudent(user); const canEnroll=canEnrollInCourse(user,course,enrolled); const canPreview=canAccessLessons(user,course,enrolled); const canManage=canOnCourse(user,PERM.COURSE_MANAGE,course); return <><button className="back-link" onClick={onBack}><ArrowLeft size={15}/> Back to courses</button><div className="detail-layout"><div className="detail-main"><CourseVisual course={course}/><div className="detail-heading"><div className="detail-tags"><span className="category-label">{course.category}</span><span>{course.level}</span><span><Clock3 size={13}/>{course.hours}</span>{course.status!=='published'&&<span className="small-pill">{course.status}</span>}</div><h1>{course.title}</h1><p>{course.description}</p><div className="instructor-large"><span className={`avatar avatar-${course.color}`}>{course.initials}</span><div><small>YOUR INSTRUCTOR</small><strong>{course.instructor}</strong></div><span className="instructor-note">Practitioner-led learning</span></div></div><section className="detail-section"><h2>What you'll walk away with</h2><div className="outcome-grid"><div><CheckCircle2 size={17}/><span>Practical skills you can apply straight away</span></div><div><CheckCircle2 size={17}/><span>A project to add to your portfolio</span></div><div><CheckCircle2 size={17}/><span>Clear frameworks, not just theory</span></div><div><CheckCircle2 size={17}/><span>A shareable completion certificate</span></div></div></section><section className="detail-section syllabus-section"><div className="section-heading"><div><h2>Inside the course</h2><p>A peek at the learning path</p></div><span className="syllabus-count">{course.lessons} lessons · {course.hours}</span></div>{['Start with the fundamentals','Build your working toolkit','Put it into practice','Polish, share and reflect'].map((s,i)=><div className="syllabus-row" key={s}><div className="syllabus-number">{String(i+1).padStart(2,'0')}</div><div><strong>{s}</strong><small>{[4,6,5,3][i]} lessons · {['Foundations','Guided practice','Project work','Finishing touches'][i]}</small></div><ChevronDown size={16}/></div>)}</section></div><aside className="detail-aside"><div className="enrol-card"><div className="enrol-card-top"><span className="eyebrow">YOUR NEXT CHAPTER</span><span className="enrol-spark">✳</span></div><div className="enrol-price">{course.price===0?'Free':`₹${course.price.toLocaleString('en-IN')}`}<small>{course.price===0?'No payment needed':'one-time payment'}</small></div><div className="enrol-includes"><div><Check size={15}/> Lifetime course access</div><div><Check size={15}/> All lessons & resources</div><div><Check size={15}/> Practical projects</div><div><Check size={15}/> Certificate on completion</div><div><Check size={15}/> Instructor-led live sessions</div></div>{student?(isEnrolled?<button className="btn btn-dark btn-full" onClick={onStart}>Continue learning <ArrowRight size={16}/></button>:canEnroll?<button className="btn btn-dark btn-full" onClick={onEnroll}>{course.price===0?'Enrol for free':'Enrol in this course'} <ArrowRight size={16}/></button>:<button className="btn btn-outline btn-full" disabled>No longer open for enrolment</button>):<div className="staff-cta">{canPreview&&<button className="btn btn-dark btn-full" onClick={onStart}>Preview lessons <ArrowRight size={16}/></button>}{canManage&&<button className="btn btn-outline btn-full" onClick={onManage}>Manage this course</button>}{!canPreview&&!canManage&&<p className="muted-note">Staff accounts can browse the catalogue but cannot enrol.</p>}</div>}<p className="enrol-foot"><LockKeyhole size={13}/> Secure enrolment · Learn at your pace</p></div><div className="detail-note"><Sparkles size={16}/><p><strong>A note on learning</strong>There are no shortcuts here. Just a clear path, useful practice, and room to get better.</p></div></aside></div></>; }
function LessonPlayer({course,completed,toggleComplete,lessonIndex,setLessonIndex,onBack,toast,readOnly}) { const lessons=['Welcome & how to use this course','Start with the right question','Layout foundations','Build your first working draft','Make it clearer with feedback','Polish and share your work']; const current=lessons[lessonIndex%lessons.length]; const done=completed.includes(lessonIndex+1); return <><div className="player-top"><button className="back-link" onClick={onBack}><ArrowLeft size={15}/> {readOnly?'Manage courses':'My learning'}</button><div className="player-course-name"><span className="player-dot"/>{course.title}</div><span className="player-progress-text">{readOnly?'Staff preview · progress not tracked':`${Math.min(100,Math.round((completed.length/18)*100))}% complete`}</span></div><div className="player-layout"><div className="player-main"><div className="lesson-video"><div className="video-orbit"/><div className="video-center-mark">i<span>.</span></div><div className="video-copy"><span>LESSON {String(lessonIndex+1).padStart(2,'0')} / 06</span><h2>{current}</h2><p>Take your time. The good work happens in the details.</p></div><button className="video-play" onClick={()=>toast('Video playback will connect when the backend and lesson storage are ready.')}><Play size={22} fill="currentColor"/></button><div className="video-bottom"><span><Video size={14}/> Lesson video</span><span>HD · 08:42</span></div></div><div className="lesson-heading"><div><div className="eyebrow">CHAPTER {String(Math.floor(lessonIndex/2)+1).padStart(2,'0')} · THE PRACTICE</div><h1>{current}</h1></div>{readOnly?<span className="small-pill">Preview only</span>:<button className={`btn ${done?'btn-complete':'btn-dark'}`} onClick={()=>{toggleComplete(lessonIndex+1);if(!done)toast('Lesson marked complete. Nice work!')}}>{done?<><CheckCircle2 size={16}/> Completed</>:<>Mark complete <Check size={16}/></>}</button>}</div><p className="lesson-description">Good work starts with paying attention. In this lesson, we'll break the idea into manageable pieces, look at a practical example, and give you a simple exercise to try on your own. Don't worry about getting it perfect on the first pass — focus on understanding why each choice works.</p><div className="lesson-tip"><Sparkles size={18}/><div><strong>A thought to keep in mind</strong><p>Clarity beats cleverness. If someone can understand your work without you in the room, you're on the right track.</p></div></div><div className="lesson-nav"><button className="btn btn-outline" disabled={lessonIndex===0} onClick={()=>setLessonIndex(Math.max(0,lessonIndex-1))}><ChevronLeft size={16}/> Previous lesson</button><button className="btn btn-dark" onClick={()=>{setLessonIndex((lessonIndex+1)%lessons.length);window.scrollTo({top:0,behavior:'smooth'})}}>Next lesson <ArrowRight size={16}/></button></div></div><aside className="lesson-sidebar"><div className="lesson-sidebar-head"><div><span className="eyebrow">COURSE CONTENT</span><h3>Learning path</h3></div><span className="lesson-total">06</span></div><div className="lesson-chapter"><span>01</span><strong>Getting started</strong><ChevronDown size={15}/></div>{lessons.slice(0,2).map((l,i)=><button key={l} className={`lesson-item ${lessonIndex===i?'current':''}`} onClick={()=>setLessonIndex(i)}><span className="lesson-state">{completed.includes(i+1)?<CheckCircle2 size={15}/>:<Play size={12}/>}</span><span><strong>{l}</strong><small>Video · {i===0?'04:20':'08:10'}</small></span></button>)}<div className="lesson-chapter"><span>02</span><strong>Make it real</strong><ChevronDown size={15}/></div>{lessons.slice(2).map((l,i)=><button key={l} className={`lesson-item ${lessonIndex===i+2?'current':''}`} onClick={()=>setLessonIndex(i+2)}><span className="lesson-state">{completed.includes(i+3)?<CheckCircle2 size={15}/>:<Play size={12}/>}</span><span><strong>{l}</strong><small>{i===2?'Video · 08:42':i===3?'Reading · 5 min':'Video · 06:30'}</small></span></button>)}<div className="lesson-help"><CircleHelp size={16}/><div><strong>Stuck on something?</strong><p>Ask your instructor in the course discussion.</p></div></div></aside></div></>; }
function Assessments({assessment,quizDone,setQuizDone,quizAnswer,setQuizAnswer,toast}) { if(!assessment) return <><PageTitle eyebrow="CHECK WHAT STICKS" title="A little test of what you know." subtitle="Assessments are for learning, not just scores."/><div className="empty-state"><div className="empty-icon"><Target size={23}/></div><h3>No assessments for you yet</h3><p>Assessments appear here for the courses you are enrolled in.</p></div></>; return <><PageTitle eyebrow="CHECK WHAT STICKS" title="A little test of what you know." subtitle="Assessments are for learning, not just scores. Take a breath and have a go."/><div className="assessment-layout"><div className="assessment-main"><div className="assessment-feature"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>{assessment.title}</h2><p>Six questions to help you connect the dots from your first module.</p><div className="assessment-meta"><span><FileText size={14}/> {assessment.questions} questions</span><span><Clock3 size={14}/> {assessment.duration} minutes</span><span><Target size={14}/> Pass mark {assessment.passMark}%</span></div></div><div className="assessment-motif"><Target size={55}/><span>01</span></div></div><div className="quiz-card"><div className="quiz-card-head"><div><span className="eyebrow">SAMPLE QUESTION · 01 OF 06</span><h3>What is the main purpose of a low-fidelity wireframe?</h3></div><span className="question-points">1 point</span></div><p className="quiz-hint">Choose the best answer. You can review your choice before submitting.</p><div className="answer-options">{[{v:'a',t:'To finalise colours, typography and visual polish'},{v:'b',t:'To explore structure and flow before visual details'},{v:'c',t:'To replace usability testing entirely'},{v:'d',t:'To demonstrate the finished product to customers'}].map(o=><button key={o.v} className={`answer-option ${quizAnswer===o.v?'chosen':''} ${quizDone&&o.v==='b'?'correct':''} ${quizDone&&quizAnswer===o.v&&o.v!=='b'?'incorrect':''}`} onClick={()=>!quizDone&&setQuizAnswer(o.v)}><span className="answer-letter">{o.v.toUpperCase()}</span><span>{o.t}</span>{quizDone&&o.v==='b'?<CheckCircle2 size={17}/>:quizAnswer===o.v?<span className="answer-radio"/>:null}</button>)}</div>{quizDone?<div className={`quiz-feedback ${quizAnswer==='b'?'right':'wrong'}`}><CheckCircle2 size={18}/><div><strong>{quizAnswer==='b'?'That’s right. Nice work.':'Not quite — and that’s okay.'}</strong><p>A low-fidelity wireframe helps you explore the structure, hierarchy and user flow before investing in visual details.</p></div></div>:<button className="btn btn-dark submit-answer" disabled={!quizAnswer} onClick={()=>{setQuizDone(true);toast(quizAnswer==='b'?'Correct answer!':'Answer submitted. Review the explanation below.')}}>Check answer <ArrowRight size={16}/></button>}</div></div><aside className="assessment-side"><div className="assessment-progress-card"><span className="eyebrow">YOUR PROGRESS</span><div className="assessment-progress-number">{quizDone?'1':'0'}<small> / 6</small></div><p>questions completed</p><div className="progress-track"><i style={{width:quizDone?'17%':'0%'}}/></div><div className="assessment-score"><span>Best score</span><strong>{quizDone?(quizAnswer==='b'?'100%':'0%'):'—'}</strong></div></div><div className="assessment-tip"><Sparkles size={17}/><h3>Before you begin</h3><p>Read each question carefully. Your first instinct is often useful, but don't be afraid to think it through.</p></div></aside></div></>; }
function Certificates({user,cert,course,onDownload}) { const head=<PageTitle eyebrow="MILESTONES WORTH KEEPING" title="Proof of the work." subtitle="The skills matter most. These are a nice way to mark the progress."/>; if(!cert) return <>{head}<div className="empty-state"><div className="empty-icon"><Award size={23}/></div><h3>No certificates yet</h3><p>Finish all required lessons and assessments in a course to earn one.</p></div></>; if(cert.status==='Revoked') return <>{head}<div className="empty-state"><div className="empty-icon"><LockKeyhole size={23}/></div><h3>This certificate was revoked</h3><p>Please contact your instructor or an administrator if you have questions.</p></div></>; return <><PageTitle eyebrow="MILESTONES WORTH KEEPING" title="Proof of the work." subtitle="The skills matter most. These are a nice way to mark the progress."/><div className="certificate-highlight"><div className="certificate-paper"><div className="certificate-seal">✳<small>VERIFIED</small></div><div className="certificate-title">Certificate <em>of completion</em></div><p className="certificate-intro">This is to recognise that</p><div className="certificate-name">{user.name}</div><p className="certificate-copy">has completed the course</p><div className="certificate-course">{course.title}</div><div className="certificate-bottom"><div><span>ISSUED ON</span><strong>{cert.issued}</strong></div><div className="signature">Learning team</div><div><span>CERTIFICATE ID</span><strong>{cert.id}</strong></div></div></div><div className="certificate-side"><span className="eyebrow">YOUR MILESTONE · 01</span><h2>Look how far<br/>you've come.</h2><p>Every finished course is proof that you showed up, stayed curious, and put in the work.</p><div className="verified-line"><ShieldCheck size={17}/><div><strong>Completion verified</strong><small>Certificate preview · Sample data</small></div></div><button className="btn btn-dark" onClick={onDownload}><Download size={16}/> Download certificate <ArrowDownRight size={15}/></button></div></div><div className="certificate-note"><LockKeyhole size={16}/><p><strong>About your certificates</strong>Certificates are issued after all required lessons and assessments are completed. This screen currently shows sample data; official verification will be connected to the backend.</p></div></>; }
function Modal({type,course,onClose,onSuccess,toast,apiBase,apiToken,onPaid}) { const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const pay=async()=>{setBusy(true);setError('');try{const headers={'Content-Type':'application/json',Authorization:`Bearer ${apiToken}`};const orderResponse=await fetch(`${apiBase}/payments/create-order`,{method:'POST',headers,body:JSON.stringify({courseId:course.id})});const orderPayload=await orderResponse.json();if(!orderResponse.ok)throw new Error(orderPayload?.error?.message||'Could not create payment order.');const checkout=orderPayload.checkout;if(!window.Razorpay){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>reject(new Error('Razorpay checkout could not load. Check your internet connection.'));document.body.appendChild(script);});}await new Promise((resolve,reject)=>{const instance=new window.Razorpay({key:checkout.keyId,amount:checkout.amount,currency:checkout.currency,name:'INNOVEL Learning',description:checkout.courseTitle,order_id:checkout.orderId,handler:async response=>{try{const vr=await fetch(`${apiBase}/payments/verify`,{method:'POST',headers,body:JSON.stringify(response)});const vj=await vr.json();if(!vr.ok)throw new Error(vj?.error?.message||'Payment verification failed.');onPaid?.(course.id);resolve();}catch(e){reject(e);}},modal:{ondismiss:()=>reject(new Error('Checkout was closed before payment was confirmed.'))}});instance.on('payment.failed',r=>reject(new Error(r?.error?.description||'Payment failed.')));instance.open();});onSuccess();}catch(e){setError(e.message||'Payment could not be completed.');}finally{setBusy(false);}}; if(type==='checkout') return <div className="modal-backdrop" onClick={onClose}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-symbol"><CreditCard size={23}/></div><span className="eyebrow">SECURE CHECKOUT</span><h2>One step closer.</h2><p>You're enrolling in <strong>{course.title}</strong>.</p><div className="checkout-summary"><span>Course fee</span><strong>₹{course.price.toLocaleString('en-IN')}</strong></div><div className="checkout-summary"><span>Taxes</span><span>As shown by Razorpay</span></div><div className="checkout-total"><span>Total due</span><strong>₹{course.price.toLocaleString('en-IN')}</strong></div><div className="payment-placeholder"><LockKeyhole size={16}/><span>Payment access is enabled only after server-side verification.</span></div>{error&&<div className="login-error" role="alert">{error}</div>}<button className="btn btn-dark btn-full" disabled={busy} onClick={pay}>{busy?'Connecting to secure checkout…':'Continue to payment'} <ArrowRight size={16}/></button><p className="modal-foot">Use Razorpay test mode until your live account is verified.</p></div></div>; if(type==='enrolled') return <div className="modal-backdrop" onClick={onClose}><div className="modal-card success-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="success-mark"><Check size={26}/></div><span className="eyebrow">YOU'RE IN</span><h2>Let the learning begin.</h2><p><strong>{course.title}</strong> is now in your learning space. Take it at your own pace.</p><button className="btn btn-dark btn-full" onClick={onSuccess}>Go to my learning <ArrowRight size={16}/></button></div></div>; return null; }
