import React, { useState } from 'react';
import {
  Activity, ArrowRight, Award, BookOpen, Check, CheckCircle2, ClipboardList, CreditCard, Download,
  FileText, LockKeyhole, Plus, Search, ShieldCheck, Target, Users, Video
} from 'lucide-react';
import { PageTitle, SectionHeading, Stat, StatusPill, TONE, ModalShell, ReasonModal } from './ui.jsx';
import {
  COURSE_ACTIONS, GRANTABLE, MATRIX_ROWS, PERM, ROLES, canOnCourse, canTransitionCourse,
  hasPermission, initialsOf, isAdmin, ownsCourse, visibleCertificates, visiblePayments
} from './rbac.js';

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const money = n => `₹${n.toLocaleString('en-IN')}`;

/* ------------------------------------------------------------------ */
/* Staff dashboard (role-specific overview)                             */
/* ------------------------------------------------------------------ */

export function StaffDashboard({ user, courses, upcoming, users, onNavigate }) {
  const admin = isAdmin(user);
  const mine = admin ? courses : courses.filter(c => ownsCourse(user, c));
  const learners = mine.reduce((a, c) => a + c.learners, 0);
  const drafts = mine.filter(c => c.status === 'draft').length;
  const access = [
    ['Manage assigned courses & lessons', hasPermission(user, PERM.COURSE_MANAGE)],
    ['Publish courses', hasPermission(user, PERM.COURSE_PUBLISH)],
    ['Schedule Zoom live classes', hasPermission(user, PERM.ZOOM_MANAGE)],
    ['Create & manage assessments', hasPermission(user, PERM.ASSESSMENT_MANAGE)],
    ['Issue / revoke certificates', hasPermission(user, PERM.CERT_MANAGE)],
    ['Manage users & roles', hasPermission(user, PERM.USER_MANAGE)],
    ['Issue refunds', hasPermission(user, PERM.PAYMENT_REFUND)]
  ];
  return <>
    <PageTitle eyebrow={admin ? 'ADMINISTRATOR WORKSPACE' : 'INSTRUCTOR WORKSPACE'} title={`Welcome back, ${user.name.split(' ')[0]}.`}
      subtitle={admin ? 'Courses, people, payments and activity across the whole platform.' : 'The courses assigned to you and the learners inside them.'}
      action={<button className="btn btn-dark" onClick={() => onNavigate('Manage courses')}>Manage courses <ArrowRight size={16}/></button>}/>
    <div className="admin-stats">
      <Stat icon={BookOpen} label={admin ? 'Total courses' : 'Assigned courses'} value={String(mine.length).padStart(2, '0')} note={`${mine.filter(c => c.status === 'published').length} published`} tone="lilac"/>
      <Stat icon={Users} label="Active learners" value={String(learners)} note={admin ? `${users.filter(u => u.role === ROLES.STUDENT).length} student accounts` : 'In your courses'} tone="mint"/>
      <Stat icon={FileText} label="Drafts to review" value={String(drafts).padStart(2, '0')} note="Ready when you are" tone="peach"/>
      <Stat icon={Video} label="Upcoming live classes" value={hasPermission(user, PERM.ZOOM_MANAGE) ? String(upcoming.length).padStart(2, '0') : '—'} note={hasPermission(user, PERM.ZOOM_MANAGE) ? 'On your schedule' : 'Needs Zoom permission'} tone="yellow"/>
    </div>
    <div className="dashboard-grid">
      <section className="content-section">
        <SectionHeading title={admin ? 'All courses' : 'Your courses'} detail="Status at a glance" action="Manage" onAction={() => onNavigate('Manage courses')}/>
        <div className="mini-list">{mine.map(c => <div className="mini-row" key={c.id}><div><strong>{c.title}</strong><small>{c.category} · {c.learners} learners</small></div><StatusPill tone={TONE[c.status]}>{cap(c.status)}</StatusPill></div>)}
          {!mine.length && <p className="muted-note">No courses are assigned to you yet. An administrator assigns courses to instructors.</p>}</div>
      </section>
      <aside className="right-rail">
        <section className="access-card"><span className="eyebrow">YOUR ACCESS · {user.role.toUpperCase()}</span>
          {access.map(([label, on]) => <div className={`access-row ${on ? '' : 'off'}`} key={label}>{on ? <CheckCircle2 size={15}/> : <LockKeyhole size={14}/>}<span>{label}</span></div>)}
          {!admin && <p className="muted-note">Extra permissions are granted by an administrator.</p>}
        </section>
        {hasPermission(user, PERM.ZOOM_MANAGE) && <section className="upcoming-section"><SectionHeading title="Coming up" detail="Your live classes" action="Schedule" onAction={() => onNavigate('Live classes')}/>
          {upcoming.slice(0, 2).map(ev => <div className="event-item" key={ev.id}><div className="event-date"><strong>{ev.day}</strong><span>{ev.month}</span></div><div className="event-info"><span className="event-time">{ev.time}</span><strong>{ev.title}</strong><small>{ev.host} · {ev.label}</small></div></div>)}
          {!upcoming.length && <p className="muted-note">Nothing scheduled.</p>}</section>}
      </aside>
    </div>
  </>;
}

/* ------------------------------------------------------------------ */
/* Manage courses — admin: all · instructor: assigned only              */
/* ------------------------------------------------------------------ */

export function ManageCourses({ user, courses, users, onSave, onStatus }) {
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | course
  const scoped = courses.filter(c => canOnCourse(user, PERM.COURSE_MANAGE, c));
  const rows = scoped.filter(c => c.title.toLowerCase().includes(term.toLowerCase()));
  const instructors = users.filter(u => u.role === ROLES.INSTRUCTOR && u.status === 'Active');
  const canCreate = hasPermission(user, PERM.COURSE_CREATE);
  return <>
    <PageTitle eyebrow="TEACHING WORKSPACE" title="Courses, thoughtfully made." subtitle="Shape the learning experience from the first outline to the final lesson."
      action={canCreate && <button className="btn btn-dark" onClick={() => setEditing('new')}><Plus size={16}/> New course</button>}/>
    {!isAdmin(user) && <div className="scope-banner"><ShieldCheck size={16}/><span>You see only the courses assigned to you. {hasPermission(user, PERM.COURSE_PUBLISH) ? 'You have permission to publish them.' : 'Publishing needs permission from an administrator.'}</span></div>}
    <div className="admin-stats">
      <Stat icon={BookOpen} label="Courses" value={String(scoped.length).padStart(2, '0')} note={isAdmin(user) ? 'Across the platform' : 'Assigned to you'} tone="lilac"/>
      <Stat icon={Users} label="Active learners" value={String(scoped.reduce((a, c) => a + c.learners, 0))} note="Across these courses" tone="mint"/>
      <Stat icon={CheckCircle2} label="Published" value={String(scoped.filter(c => c.status === 'published').length).padStart(2, '0')} note="Open for enrolment" tone="peach"/>
      <Stat icon={FileText} label="Drafts to review" value={String(scoped.filter(c => c.status === 'draft').length).padStart(2, '0')} note="Not visible to learners" tone="yellow"/>
    </div>
    <div className="table-panel">
      <div className="table-toolbar"><div><h2>Course catalogue</h2><p>{isAdmin(user) ? 'Manage the learning paths your community sees.' : 'Your assigned learning paths.'}</p></div><label className="table-search"><Search size={15}/><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Find a course"/></label></div>
      <div className="data-table manage-table">
        <div className="table-row table-header"><span>COURSE</span><span>INSTRUCTOR</span><span>LEARNERS</span><span>STATUS</span><span>ACTIONS</span></div>
        {rows.map(c => <div className="table-row" key={c.id}>
          <div className="table-course"><div className={`table-course-icon ${c.color}`}><BookOpen size={17}/></div><div><strong>{c.title}</strong><small>{c.category} · {c.lessons} lessons</small></div></div>
          <span className="table-instructor">{c.instructor}</span><span className="table-learners">{c.learners}</span>
          <span><StatusPill tone={TONE[c.status]}>{cap(c.status)}</StatusPill></span>
          <div className="row-actions">
            <button className="btn-mini" onClick={() => setEditing(c)}>Edit</button>
            {Object.keys(COURSE_ACTIONS).filter(a => COURSE_ACTIONS[a].from === c.status).map(a => canTransitionCourse(user, c, a)
              ? <button key={a} className="btn-mini primary" onClick={() => onStatus(c, a)}>{COURSE_ACTIONS[a].label}</button>
              : <button key={a} className="btn-mini" disabled title="Needs publish permission from an administrator"><LockKeyhole size={11}/> {COURSE_ACTIONS[a].label}</button>)}
          </div>
        </div>)}
        {!rows.length && <div className="empty-state compact-empty"><div className="empty-icon"><BookOpen size={23}/></div><h3>No courses to show</h3><p>{isAdmin(user) ? 'Try a different search.' : 'Courses appear here once an administrator assigns them to you.'}</p></div>}
      </div>
      <div className="table-footer"><span>Showing {rows.length} of {scoped.length} courses</span><span>Page 1 of 1</span></div>
    </div>
    {editing && <CourseModal course={editing === 'new' ? null : editing} instructors={instructors} canAssign={isAdmin(user)} onClose={() => setEditing(null)} onSave={data => { onSave(data, editing === 'new' ? null : editing); setEditing(null); }}/>}
  </>;
}

function CourseModal({ course, instructors, canAssign, onClose, onSave }) {
  const [f, setF] = useState(() => course
    ? { title: course.title, description: course.description, category: course.category, price: course.price, instructorId: course.instructorId }
    : { title: '', description: '', category: 'Development', price: 0, instructorId: instructors[0]?.id || '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const assigned = instructors.find(i => i.id === f.instructorId);
  return <ModalShell onClose={onClose} icon={BookOpen} eyebrow="COURSE AUTHORING" title={course ? 'Edit course' : 'Start with an idea.'}
    intro={course ? 'Changes keep stable lesson IDs, so learner progress is preserved.' : 'New courses start as drafts and are not visible to learners.'}>
    <label className="field-label">Course title<input value={f.title} onChange={set('title')} placeholder="e.g. The art of better questions"/></label>
    <label className="field-label">Short description<textarea rows="3" value={f.description} onChange={set('description')} placeholder="What will learners be able to do?"/></label>
    <label className="field-label">Category<select value={f.category} onChange={set('category')}>{['Design', 'Development', 'Data', 'Business'].map(c => <option key={c}>{c}</option>)}</select></label>
    <label className="field-label">Price (₹, 0 = free)<input type="number" min="0" step="1" value={f.price} onChange={set('price')}/></label>
    {canAssign
      ? <label className="field-label">Assigned instructor<select value={f.instructorId} onChange={set('instructorId')}>{instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select><small>Only administrators can assign courses to instructors.</small></label>
      : <label className="field-label">Assigned instructor<input value={assigned?.name || 'You'} readOnly/></label>}
    <button className="btn btn-dark btn-full" disabled={!f.title.trim() || (canAssign && !f.instructorId)} onClick={() => onSave({ ...f, price: Math.max(0, Math.floor(Number(f.price) || 0)) })}>{course ? 'Save changes' : 'Save as draft'} <ArrowRight size={16}/></button>
  </ModalShell>;
}

/* ------------------------------------------------------------------ */
/* People — admin only (manage users / roles)                           */
/* ------------------------------------------------------------------ */

export function People({ user, users, onRole, onToggleStatus, onGrants, toast }) {
  const [grantTarget, setGrantTarget] = useState(null);
  const count = r => users.filter(u => u.role === r).length;
  return <>
    <PageTitle eyebrow="PEOPLE & PERMISSIONS" title="The people behind the progress." subtitle="Keep roles clear, accounts healthy, and the learning community moving."
      action={<button className="btn btn-dark" onClick={() => toast('Invite flow will be connected to the backend.')}><Plus size={16}/> Invite member</button>}/>
    <div className="admin-stats">
      <Stat icon={Users} label="Total members" value={String(users.length)} note="Across all roles" tone="lilac"/>
      <Stat icon={ShieldCheck} label="Students" value={String(count(ROLES.STUDENT)).padStart(2, '0')} note={`${users.filter(u => u.status === 'Suspended').length} suspended`} tone="mint"/>
      <Stat icon={BookOpen} label="Instructors" value={String(count(ROLES.INSTRUCTOR)).padStart(2, '0')} note="Assigned by course" tone="peach"/>
      <Stat icon={ShieldCheck} label="Admins" value={String(count(ROLES.ADMIN)).padStart(2, '0')} note="Permission-controlled" tone="yellow"/>
    </div>
    <div className="table-panel">
      <div className="table-toolbar"><div><h2>Community directory</h2><p>Change roles, suspend accounts and set instructor permissions. Every change is audited.</p></div><button className="btn btn-outline" onClick={() => toast('Export will be available after API integration.')}><Download size={15}/> Export</button></div>
      <div className="data-table people-table">
        <div className="table-row table-header"><span>MEMBER</span><span>ROLE</span><span>STATUS</span><span>JOINED</span><span>ACTIONS</span></div>
        {users.map((p, i) => { const self = p.id === user.id; return <div className="table-row" key={p.id}>
          <div className="table-course"><div className={`avatar avatar-${['lilac', 'mint', 'blue', 'peach', 'yellow'][i % 5]}`}>{initialsOf(p.name)}</div><div><strong>{p.name}{self && ' (you)'}</strong><small>{p.email}</small></div></div>
          <select className="inline-select" value={p.role} disabled={self} aria-label={`Role for ${p.name}`} onChange={e => onRole(p, e.target.value)}>{Object.values(ROLES).map(r => <option key={r}>{r}</option>)}</select>
          <span><StatusPill tone={TONE[p.status]}>{p.status}</StatusPill></span>
          <span className="table-instructor">{p.joined}</span>
          <div className="row-actions">
            {p.role === ROLES.INSTRUCTOR && <button className="btn-mini" onClick={() => setGrantTarget(p)}>Permissions</button>}
            {!self && <button className="btn-mini" onClick={() => onToggleStatus(p)}>{p.status === 'Active' ? 'Suspend' : 'Activate'}</button>}
          </div>
        </div>; })}
      </div>
    </div>
    <div className="table-panel matrix-panel">
      <div className="table-toolbar"><div><h2>Role matrix</h2><p>What each role can do. The server enforces the same rules on every request.</p></div></div>
      <div className="matrix-scroll"><table className="matrix"><thead><tr><th>Capability</th><th>Admin</th><th>Instructor</th><th>Student</th></tr></thead>
        <tbody>{MATRIX_ROWS.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
    </div>
    {grantTarget && <GrantsModal target={grantTarget} onClose={() => setGrantTarget(null)} onSave={sel => { onGrants(grantTarget, sel); setGrantTarget(null); }}/>}
  </>;
}

function GrantsModal({ target, onClose, onSave }) {
  const [sel, setSel] = useState(target.grants || []);
  const toggle = p => setSel(sel.includes(p) ? sel.filter(x => x !== p) : [...sel, p]);
  return <ModalShell onClose={onClose} icon={ShieldCheck} eyebrow="INSTRUCTOR PERMISSIONS" title={`${target.name.split(' ')[0]}'s extra access`}
    intro="Instructors always manage lessons and see progress for the courses assigned to them. These extras apply only to those assigned courses.">
    <div className="grant-list">{GRANTABLE.map(g => <label className="grant-row" key={g.perm}><input type="checkbox" checked={sel.includes(g.perm)} onChange={() => toggle(g.perm)}/><span><strong>{g.label}</strong><small>{g.hint}</small></span></label>)}</div>
    <button className="btn btn-dark btn-full" onClick={() => onSave(sel)}>Save permissions <Check size={16}/></button>
  </ModalShell>;
}

/* ------------------------------------------------------------------ */
/* Audit log — admin only                                               */
/* ------------------------------------------------------------------ */

export function AuditLog({ audit }) {
  return <>
    <PageTitle eyebrow="ACCOUNTABILITY" title="Who did what, and when." subtitle="Role changes, course publication, refunds, certificate revocation and meeting cancellations."/>
    <div className="table-panel"><div className="table-toolbar"><div><h2>Recent activity</h2><p>Newest first. Entries cannot be edited from the interface.</p></div><span className="small-pill">{audit.length} events</span></div>
      <div className="data-table audit-table">
        <div className="table-row table-header"><span>WHEN</span><span>ACTOR</span><span>ACTION</span><span>DETAILS</span></div>
        {audit.map(a => <div className="table-row" key={a.id}><span className="table-instructor">{a.time}</span><div><strong className="cell-strong">{a.actor}</strong><small className="cell-sub">{a.role}</small></div><span className="role-chip">{a.action}</span><div><strong className="cell-strong">{a.entity}</strong><small className="cell-sub">{a.detail}</small></div></div>)}
      </div></div>
  </>;
}

/* ------------------------------------------------------------------ */
/* Payments — student: own · instructor: limited · admin: all + refund  */
/* ------------------------------------------------------------------ */

export function PaymentsPage({ user, payments, courses, users, onRefund }) {
  const [refunding, setRefunding] = useState(null);
  const rows = visiblePayments(user, payments, courses);
  const level = hasPermission(user, PERM.PAYMENT_VIEW_ALL) ? 'all' : hasPermission(user, PERM.PAYMENT_VIEW_LIMITED) ? 'limited' : 'own';
  const canRefund = hasPermission(user, PERM.PAYMENT_REFUND);
  return <>
    <PageTitle eyebrow={level === 'own' ? 'YOUR RECEIPTS' : 'BILLING'} title={level === 'own' ? 'Your payments.' : 'Payments & refunds.'}
      subtitle={level === 'all' ? 'Every payment on the platform. Refunds are recorded in the audit log.' : level === 'limited' ? 'A limited view of payments for your courses. Amounts are visible to administrators only.' : 'Only your own payment records are shown here.'}/>
    <div className="table-panel"><div className="table-toolbar"><div><h2>{level === 'own' ? 'Payment history' : 'Payment records'}</h2><p>Status comes from the server after Razorpay verification.</p></div><span className="small-pill">{rows.length} records</span></div>
      <div className="data-table payments-table">
        <div className="table-row table-header"><span>COURSE</span><span>AMOUNT</span><span>STATUS</span><span>DATE</span><span>{canRefund ? 'ACTIONS' : level === 'own' ? 'REFERENCE' : ''}</span></div>
        {rows.map(p => { const c = courses.find(x => x.id === p.courseId); const s = users.find(x => x.id === p.studentId); return <div className="table-row" key={p.id}>
          <div className="table-course"><div className={`table-course-icon ${c?.color}`}><CreditCard size={17}/></div><div><strong>{c?.title}</strong><small>{level === 'own' ? 'Your payment' : s?.name}</small></div></div>
          <span className="table-learners">{level === 'limited' ? '—' : money(p.amount)}</span>
          <span><StatusPill tone={TONE[p.status]}>{p.status}</StatusPill></span><span className="table-instructor">{p.date}</span>
          <div className="row-actions">{canRefund && p.status === 'Paid' && <button className="btn-mini" onClick={() => setRefunding(p)}>Refund</button>}{level === 'own' && <span className="table-instructor">{p.ref}</span>}</div>
        </div>; })}
        {!rows.length && <div className="empty-state compact-empty"><div className="empty-icon"><CreditCard size={23}/></div><h3>No payments yet</h3><p>Paid enrolments will appear here.</p></div>}
      </div></div>
    {refunding && <ReasonModal icon={CreditCard} eyebrow="REFUND" title="Refund this payment?" intro={`${money(refunding.amount)} will be marked as refunded. Access follows the refund policy defined for the platform.`} confirmLabel="Confirm refund" onClose={() => setRefunding(null)} onConfirm={reason => { onRefund(refunding, reason); setRefunding(null); }}/>}
  </>;
}

/* ------------------------------------------------------------------ */
/* Assessment management — admin: configure · instructor: if permitted  */
/* ------------------------------------------------------------------ */

export function AssessmentManager({ user, courses, assessments, onSave, onToggle }) {
  const [editing, setEditing] = useState(null); // null | 'new' | assessment
  const manageable = courses.filter(c => canOnCourse(user, PERM.ASSESSMENT_MANAGE, c));
  const rows = assessments.filter(a => manageable.some(c => c.id === a.courseId));
  return <>
    <PageTitle eyebrow="ASSESSMENT SETTINGS" title="Check what sticks." subtitle="Duration, pass mark and attempt limits are enforced by the server when learners take a test."
      action={<button className="btn btn-dark" disabled={!manageable.length} onClick={() => setEditing('new')}><Plus size={16}/> New assessment</button>}/>
    {!isAdmin(user) && <div className="scope-banner"><ShieldCheck size={16}/><span>You can manage assessments for your assigned courses only.</span></div>}
    <div className="table-panel"><div className="table-toolbar"><div><h2>Assessments</h2><p>Editing creates a new version — earlier results keep the version they were taken on.</p></div></div>
      <div className="data-table assess-table">
        <div className="table-row table-header"><span>ASSESSMENT</span><span>COURSE</span><span>RULES</span><span>STATUS</span><span>ACTIONS</span></div>
        {rows.map(a => { const c = courses.find(x => x.id === a.courseId); return <div className="table-row" key={a.id}>
          <div className="table-course"><div className={`table-course-icon ${c.color}`}><Target size={17}/></div><div><strong>{a.title}</strong><small>{a.questions} questions · v{a.version}</small></div></div>
          <span className="table-instructor">{c.title}</span><span className="table-instructor">{a.duration} min · pass {a.passMark}% · {a.maxAttempts} tries</span>
          <span><StatusPill tone={TONE[a.status]}>{a.status}</StatusPill></span>
          <div className="row-actions"><button className="btn-mini" onClick={() => setEditing(a)}>Edit</button><button className="btn-mini primary" onClick={() => onToggle(a)}>{a.status === 'Published' ? 'Unpublish' : 'Publish'}</button></div>
        </div>; })}
        {!rows.length && <div className="empty-state compact-empty"><div className="empty-icon"><Target size={23}/></div><h3>No assessments yet</h3><p>Create one for a course you manage.</p></div>}
      </div></div>
    {editing && <AssessmentModal assessment={editing === 'new' ? null : editing} courses={manageable} onClose={() => setEditing(null)} onSave={d => { onSave(d, editing === 'new' ? null : editing); setEditing(null); }}/>}
  </>;
}

function AssessmentModal({ assessment, courses, onClose, onSave }) {
  const [f, setF] = useState(() => assessment
    ? { title: assessment.title, courseId: assessment.courseId, questions: assessment.questions, duration: assessment.duration, passMark: assessment.passMark, maxAttempts: assessment.maxAttempts }
    : { title: '', courseId: courses[0]?.id, questions: 5, duration: 10, passMark: 70, maxAttempts: 3 });
  const num = k => e => setF({ ...f, [k]: e.target.value });
  const ok = f.title.trim() && Number(f.duration) > 0 && Number(f.passMark) >= 1 && Number(f.passMark) <= 100 && Number(f.maxAttempts) >= 1;
  return <ModalShell onClose={onClose} icon={Target} eyebrow="ASSESSMENT" title={assessment ? 'Edit settings' : 'New assessment'} intro={assessment ? 'Saving creates a new version. Past attempts are not rewritten.' : 'Starts as a draft. Answer keys stay on the server.'}>
    <label className="field-label">Title<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })}/></label>
    {!assessment && <label className="field-label">Course<select value={f.courseId} onChange={e => setF({ ...f, courseId: Number(e.target.value) })}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
    <label className="field-label">Duration (minutes)<input type="number" min="1" value={f.duration} onChange={num('duration')}/></label>
    <label className="field-label">Pass mark (%)<input type="number" min="1" max="100" value={f.passMark} onChange={num('passMark')}/></label>
    <label className="field-label">Attempt limit<input type="number" min="1" value={f.maxAttempts} onChange={num('maxAttempts')}/></label>
    <button className="btn btn-dark btn-full" disabled={!ok} onClick={() => onSave({ ...f, duration: Number(f.duration), passMark: Number(f.passMark), maxAttempts: Number(f.maxAttempts) })}>{assessment ? 'Save new version' : 'Save as draft'} <ArrowRight size={16}/></button>
  </ModalShell>;
}

/* ------------------------------------------------------------------ */
/* Certificates — admin: issue/revoke · instructor: if permitted        */
/* ------------------------------------------------------------------ */

export function CertificateManager({ user, certificates, courses, users, onRevoke, onReissue }) {
  const [action, setAction] = useState(null); // { type:'revoke'|'reissue', cert }
  const rows = visibleCertificates(user, certificates, courses);
  return <>
    <PageTitle eyebrow="MILESTONES WORTH KEEPING" title="Certificates, with a paper trail." subtitle="Revoking or reissuing always records a reason and appears in the audit log."/>
    {!isAdmin(user) && <div className="scope-banner"><ShieldCheck size={16}/><span>You can manage certificates for your assigned courses only.</span></div>}
    <div className="table-panel"><div className="table-toolbar"><div><h2>Issued certificates</h2><p>Learners can verify them with their public ID.</p></div><span className="small-pill">{rows.length} certificates</span></div>
      <div className="data-table assess-table">
        <div className="table-row table-header"><span>CERTIFICATE</span><span>LEARNER</span><span>ISSUED</span><span>STATUS</span><span>ACTIONS</span></div>
        {rows.map(ct => { const c = courses.find(x => x.id === ct.courseId); const s = users.find(x => x.id === ct.studentId); return <div className="table-row" key={ct.id}>
          <div className="table-course"><div className={`table-course-icon ${c.color}`}><Award size={17}/></div><div><strong>{c.title}</strong><small>{ct.id}</small></div></div>
          <span className="table-instructor">{s?.name}</span><span className="table-instructor">{ct.issued}</span>
          <span><StatusPill tone={TONE[ct.status]}>{ct.status}</StatusPill></span>
          <div className="row-actions">{ct.status === 'Issued' ? <button className="btn-mini" onClick={() => setAction({ type: 'revoke', cert: ct })}>Revoke</button> : <button className="btn-mini primary" onClick={() => setAction({ type: 'reissue', cert: ct })}>Reissue</button>}</div>
        </div>; })}
        {!rows.length && <div className="empty-state compact-empty"><div className="empty-icon"><Award size={23}/></div><h3>No certificates yet</h3><p>They appear once learners complete a course.</p></div>}
      </div></div>
    {action && <ReasonModal icon={Award} eyebrow={action.type === 'revoke' ? 'REVOKE CERTIFICATE' : 'REISSUE CERTIFICATE'} title={action.type === 'revoke' ? 'Revoke this certificate?' : 'Reissue this certificate?'}
      intro={action.type === 'revoke' ? 'The learner will no longer be able to download it and verification will fail.' : 'The certificate becomes valid and downloadable again.'}
      confirmLabel={action.type === 'revoke' ? 'Revoke certificate' : 'Reissue certificate'} onClose={() => setAction(null)}
      onConfirm={reason => { (action.type === 'revoke' ? onRevoke : onReissue)(action.cert, reason); setAction(null); }}/>}
  </>;
}

/* ------------------------------------------------------------------ */
/* Reports — admin: everything · instructor: assigned students/courses  */
/* ------------------------------------------------------------------ */

export function Reports({ user, courses, payments, certificates }) {
  const admin = isAdmin(user);
  const mine = admin ? courses : courses.filter(c => ownsCourse(user, c));
  const ids = new Set(mine.map(c => c.id));
  const learners = mine.reduce((a, c) => a + c.learners, 0);
  const paid = payments.filter(p => ids.has(p.courseId) && p.status === 'Paid');
  const certs = certificates.filter(c => ids.has(c.courseId) && c.status === 'Issued').length;
  const showRevenue = hasPermission(user, PERM.PAYMENT_VIEW_ALL);
  return <>
    <PageTitle eyebrow="INSIGHTS & OUTCOMES" title="The story behind the numbers." subtitle={admin ? 'A clear view of what learners are doing, where they get stuck, and what is working.' : 'Progress and outcomes for the learners in your assigned courses.'}/>
    {!admin && <div className="scope-banner"><ShieldCheck size={16}/><span>Reports are limited to your assigned courses and their students.</span></div>}
    <div className="admin-stats">
      <Stat icon={Users} label="Active learners" value={String(learners)} note={admin ? 'Across all courses' : 'In your courses'} tone="lilac"/>
      <Stat icon={Activity} label="Course completion" value="72.4%" note="Illustrative sample" tone="mint"/>
      {showRevenue
        ? <Stat icon={CreditCard} label="Course revenue" value={money(paid.reduce((a, p) => a + p.amount, 0))} note="From verified payments" tone="peach"/>
        : <Stat icon={CreditCard} label="Paid enrolments" value={String(paid.length)} note="Amounts are admin-only" tone="peach"/>}
      <Stat icon={Award} label="Certificates issued" value={String(certs)} note="Currently valid" tone="yellow"/>
    </div>
    <div className="reports-grid">
      <section className="report-panel"><div className="section-heading"><div><h2>Learning activity</h2><p>Active learners over the last 7 days</p></div><span className="small-pill">Last 7 days</span></div>
        <div className="bar-chart">{[{ d: 'Thu', v: 46 }, { d: 'Fri', v: 63 }, { d: 'Sat', v: 36 }, { d: 'Sun', v: 52 }, { d: 'Mon', v: 76 }, { d: 'Tue', v: 60 }, { d: 'Wed', v: 88 }].map(x => <div className="bar-column" key={x.d}><span className="bar-value">{x.v * (admin ? 10 : 3)}</span><div className="bar-track"><i style={{ height: `${x.v}%` }}/></div><small>{x.d}</small></div>)}</div></section>
      <section className="report-panel category-panel"><div className="section-heading"><div><h2>{admin ? 'Learners by course' : 'Your courses'}</h2><p>Learners enrolled right now</p></div></div>
        <div className="mini-list">{mine.map(c => <div className="mini-row" key={c.id}><div><strong>{c.title}</strong><small>{c.category}</small></div><span className="small-pill">{c.learners}</span></div>)}</div></section>
    </div>
    <div className="report-footnote"><Activity size={15}/> Chart and completion figures are illustrative for frontend review. Live reports will use verified database records.</div>
  </>;
}


/* Existing student records, course enrolments and payment history from PostgreSQL. */
export function StudentsPage({ user, students = [] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const moneyINR = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const rows = students.filter(s => `${s.name} ${s.email} ${s.courses.map(c => c.title).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  return <div>
    <PageTitle eyebrow="LEARNER RECORDS" title="Students" subtitle={user.role === 'Admin' ? 'All registered students, their courses, fees and payment history.' : 'Students enrolled in your assigned courses, with course-wise fees and payment history.'}/>
    <div className="section-heading"><div><h2>Existing students</h2><p>{rows.length} student record{rows.length === 1 ? '' : 's'} from the database</p></div><div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students or courses"/></div></div>
    {!rows.length ? <div className="empty-state"><div className="empty-icon"><Users size={23}/></div><h3>No student records found</h3><p>Once students are enrolled in courses, their details and fee history will appear here.</p></div> :
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Courses</th><th>Total fees</th><th>Paid</th><th>Pending</th><th></th></tr></thead><tbody>
      {rows.map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.email}</small><small>{s.status}</small></td><td>{s.courses.map(c => <div key={c.id} className="student-course-line">{c.title}<small>{c.enrollmentStatus}</small></div>)}</td><td>{moneyINR(s.totalFees)}</td><td>{moneyINR(s.paidAmount)}</td><td>{moneyINR(s.pendingAmount)}</td><td><button className="btn btn-outline" onClick={() => setSelected(s)}>Details</button></td></tr>)}
    </tbody></table></div>}
    {selected && <ModalShell onClose={() => setSelected(null)} icon={Users} eyebrow="STUDENT RECORD" title={selected.name} intro={selected.email}>
      <div className="student-finance-grid"><div><small>Total course fees</small><strong>{moneyINR(selected.totalFees)}</strong></div><div><small>Paid</small><strong>{moneyINR(selected.paidAmount)}</strong></div><div><small>Pending</small><strong>{moneyINR(selected.pendingAmount)}</strong></div></div>
      <h3>Enrolled courses</h3>{selected.courses.map(c => <div className="student-detail-course" key={c.id}><strong>{c.title}</strong><span>Course fee: {moneyINR(c.fee)} · Paid: {moneyINR(c.paidAmount)} · Pending: {moneyINR(c.pendingAmount)}</span><small>Status: {c.enrollmentStatus} · Enrolled: {c.enrolledAt ? new Date(c.enrolledAt).toLocaleDateString('en-IN') : '—'}</small></div>)}
      <h3>Payment history</h3>{selected.paymentHistory.length ? selected.paymentHistory.map((p,i) => <div className="student-payment-row" key={`${p.id}-${i}`}><div><strong>{p.courseTitle}</strong><small>{p.date ? new Date(p.date).toLocaleString('en-IN') : '—'} · Ref: {p.reference || 'Not available'}</small></div><div><strong>{moneyINR(p.amount)}</strong><small>{p.status}</small></div></div>) : <p>No payment records are available for this student yet.</p>}
    </ModalShell>}
  </div>;
}
