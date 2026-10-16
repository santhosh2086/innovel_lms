import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Plus, ShieldCheck, Sparkles, Bell, Users, Video } from 'lucide-react';
import { PageTitle, ModalShell } from './ui.jsx';
import { PERM, canOnCourse, hasPermission, initialsOf } from './rbac.js';

const splitTitle = t => { const i = t.indexOf(': '); return i > 0 ? <>{t.slice(0, i)}:<br/><em>{t.slice(i + 2)}.</em></> : t; };

/* ------------------------------------------------------------------ */
/* Live classes                                                         */
/*  - student: only meetings of their active enrolments (+ join info)    */
/*  - admin: all courses · instructor: assigned courses, if permitted    */
/* `sessions` is already filtered by canViewMeeting() in App.            */
/* ------------------------------------------------------------------ */

export function LiveClasses({ user, sessions, courses, onSchedule, onCancel, onJoin, toast }) {
  const [tab, setTab] = useState('Upcoming');
  const [scheduling, setScheduling] = useState(false);
  const canSchedule = hasPermission(user, PERM.ZOOM_MANAGE);
  const manageable = courses.filter(c => c.status === 'published' && canOnCourse(user, PERM.ZOOM_MANAGE, c));
  const list = sessions.filter(s => s.status === (tab === 'Upcoming' ? 'Upcoming' : tab === 'Cancelled' ? 'Cancelled' : 'Past'));
  const next = sessions.find(s => s.status === 'Upcoming');
  return <>
    <PageTitle eyebrow="LEARN TOGETHER" title="Good questions, live." subtitle={canSchedule ? 'Schedule sessions for the courses you manage. Students only see classes for their active enrolments.' : 'Bring your curiosity. Leave with a little more clarity.'}
      action={canSchedule && <button className="btn btn-dark" disabled={!manageable.length} title={manageable.length ? '' : 'No published course available to schedule for'} onClick={() => setScheduling(true)}><Plus size={16}/> Schedule a class</button>}/>
    {next && <div className="live-feature"><div className="live-feature-copy"><span className="live-now-label"><i/> NEXT LIVE SESSION</span><h2>{splitTitle(next.title)}</h2><p>Bring the rough edges. We'll work through them together, one thoughtful question at a time.</p>
      <div className="live-host"><span className={`avatar avatar-${next.color}`}>{initialsOf(next.host)}</span><div><strong>{next.host}</strong><small>{next.label} · {next.duration} minutes</small></div></div>
      <button className="btn btn-dark" onClick={() => onJoin ? onJoin(next) : (next.joinUrl ? window.open(next.joinUrl, '_blank', 'noopener,noreferrer') : toast('Zoom join URL is not available for this class yet.'))}>{next.joinUrl ? 'Open Zoom' : canSchedule ? 'View session details' : 'How to join'} <ArrowRight size={16}/></button></div>
      <div className="live-feature-art"><div className="live-art-circle circle-a"/><div className="live-art-circle circle-b"/><div className="live-art-center"><Video size={36}/><span>LIVE<br/>LEARNING</span></div><div className="live-date-stamp"><strong>{next.day}</strong><span>{next.month}<br/>{next.time.split('· ')[1] || next.time}</span></div></div></div>}
    <div className="live-tabs">{['Upcoming', 'Past sessions', 'Cancelled'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {list.length
      ? <div className="live-list">{list.map(ev => { const course = courses.find(c => c.id === ev.courseId); const manage = canOnCourse(user, PERM.ZOOM_MANAGE, course) && ev.status === 'Upcoming'; return <div className="live-row" key={ev.id}>
          <div className={`live-row-date ${ev.color}`}><strong>{ev.day}</strong><span>{ev.month}</span></div>
          <div className="live-row-info"><span className="event-time">{ev.time}</span><h3>{ev.title}</h3><p>{ev.label} · Hosted by {ev.host}</p></div>
          <span className={`session-status ${ev.status === 'Cancelled' ? 'cancelled' : ''}`}>{ev.status}</span>
          {ev.status === 'Upcoming' && <button className="btn btn-outline" onClick={() => onJoin ? onJoin(ev) : (ev.joinUrl ? window.open(ev.joinUrl, '_blank', 'noopener,noreferrer') : toast('Zoom join URL is not available for this class yet.'))}>{ev.joinUrl ? 'Join Zoom' : canSchedule ? 'Details' : 'Join info'} <ArrowUpRight size={14}/></button>}
          {manage && <button className="btn btn-outline btn-danger" onClick={() => onCancel(ev)}>Cancel</button>}
        </div>; })}</div>
      : <div className="empty-state compact-empty"><div className="empty-icon"><CalendarDays size={23}/></div><h3>{tab === 'Past sessions' ? 'Your replays will live here.' : tab === 'Cancelled' ? 'No cancelled sessions.' : 'Nothing scheduled right now.'}</h3><p>{tab === 'Past sessions' ? 'After a live class, available replays and notes will show up here.' : tab === 'Cancelled' ? 'Nothing has been cancelled. Your schedule is looking good.' : 'Classes for your courses will appear here once they are scheduled.'}</p></div>}
    {scheduling && <MeetingModal courses={manageable} onClose={() => setScheduling(false)} onSave={d => { onSchedule(d); setScheduling(false); }}/>}
  </>;
}

function MeetingModal({ courses, onClose, onSave }) {
  const [f, setF] = useState({ courseId: courses[0]?.id, title: '', date: '', time: '16:30', duration: 45 });
  const ok = f.title.trim() && f.date && f.time && Number(f.duration) > 0;
  return <ModalShell onClose={onClose} icon={Video} eyebrow="LIVE CLASS" title="Schedule a class" intro="The backend creates the Zoom meeting. Host start links never reach students.">
    <label className="field-label">Course<select value={f.courseId} onChange={e => setF({ ...f, courseId: Number(e.target.value) })}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><small>Only courses you are allowed to manage are listed.</small></label>
    <label className="field-label">Topic<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Portfolio review"/></label>
    <label className="field-label">Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })}/></label>
    <label className="field-label">Start time<input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })}/><small>Timezone: Asia/Kolkata (IST)</small></label>
    <label className="field-label">Duration (minutes)<input type="number" min="5" value={f.duration} onChange={e => setF({ ...f, duration: e.target.value })}/></label>
    <button className="btn btn-dark btn-full" disabled={!ok} onClick={() => onSave({ ...f, duration: Number(f.duration) })}>Schedule class <ArrowRight size={16}/></button>
  </ModalShell>;
}

/* ------------------------------------------------------------------ */
/* Settings — role is shown, never editable by the user                 */
/* ------------------------------------------------------------------ */

export function SettingsPage({ user, onRename, toast }) {
  const [name, setName] = useState(user.name);
  return <><PageTitle eyebrow="MAKE IT YOURS" title="A space that works for you." subtitle="Manage your profile and a few preferences. The essentials, without the noise."/>
    <div className="settings-layout">
      <aside className="settings-nav"><button className="active"><Users size={16}/> Profile</button><button onClick={() => toast('Security settings will be connected to authentication APIs.')}><ShieldCheck size={16}/> Security</button><button onClick={() => toast('Notification preferences will be saved in the backend.')}><Bell size={16}/> Notifications</button><button onClick={() => toast('Appearance preferences are coming soon.')}><Sparkles size={16}/> Appearance</button></aside>
      <div className="settings-main">
        <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Your profile</h2><p>How you'll appear across your learning space.</p></div><span className="small-pill">Personal details</span></div>
          <div className="profile-edit-top"><div className="avatar avatar-user profile-edit-avatar">{initialsOf(user.name)}</div><div><strong>Profile photo</strong><p>Initials are used for now. Photo upload can be added later.</p><button className="text-button" onClick={() => toast('Profile photo upload is not enabled in this frontend preview.')}>Change photo <ArrowUpRight size={14}/></button></div></div>
          <label className="field-label">Display name<input value={name} onChange={e => setName(e.target.value)}/></label>
          <label className="field-label">Email address<input value={user.email} readOnly/><small>Email changes require verification.</small></label>
          <label className="field-label">Account role<input value={user.role} readOnly/><small>Roles are assigned by an administrator and enforced by the server.</small></label>
          <div className="settings-actions"><button className="btn btn-dark" onClick={() => { if (!name.trim()) { toast('Display name cannot be empty.'); return; } onRename(name.trim()); toast('Profile changes saved in this preview.'); }}>Save changes <Check size={15}/></button><button className="btn btn-quiet" onClick={() => setName(user.name)}>Discard</button></div>
        </section>
        <section className="settings-panel preference-panel"><div className="settings-panel-heading"><div><h2>Your learning preferences</h2><p>Small details that make learning feel more personal.</p></div></div>
          <Preference title="Weekly learning reminder" detail="A gentle nudge to keep your rhythm." defaultOn/><Preference title="Live class notifications" detail="Remind me before sessions start." defaultOn/><Preference title="Course recommendations" detail="Suggest what might be useful next."/></section>
      </div></div></>;
}

function Preference({ title, detail, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return <div className="preference-row"><div><strong>{title}</strong><p>{detail}</p></div><button className={`toggle ${on ? 'on' : ''}`} onClick={() => setOn(!on)} aria-label={`Toggle ${title}`}><i/></button></div>;
}
