import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, LockKeyhole, ShieldCheck, X } from 'lucide-react';

export function PageTitle({ eyebrow, title, subtitle, action, children }) {
  return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="title-actions">{action}{children}</div></div>;
}

export function SectionHeading({ title, detail, action, onAction }) {
  return <div className="section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action && <button className="text-button" onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>;
}

export function Stat({ icon: Icon, label, value, note, tone, trend }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}{trend && <span className="trend"><ArrowUpRight size={14}/></span>}</div><div className="stat-note">{note}</div></div>;
}

export const StatusPill = ({ tone, children }) => <span className={`status-pill ${tone}`}><i/>{children}</span>;

export const TONE = {
  draft: 'draft', published: 'published', archived: 'archived', Draft: 'draft', Published: 'published',
  Active: 'published', Suspended: 'suspended', Paid: 'published', Failed: 'failed', Refunded: 'archived',
  Issued: 'published', Revoked: 'failed', Upcoming: 'published', Cancelled: 'failed'
};

export function ModalShell({ onClose, icon: Icon, eyebrow, title, intro, children }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button>
    <div className="modal-symbol"><Icon size={22}/></div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{intro && <p>{intro}</p>}{children}
  </div></div>;
}

/** Sensitive actions (refund, revoke, reissue…) must record a reason for the audit log. */
export function ReasonModal({ icon = ShieldCheck, eyebrow, title, intro, confirmLabel, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return <ModalShell onClose={onClose} icon={icon} eyebrow={eyebrow} title={title} intro={intro}>
    <label className="field-label">Reason (saved in the audit log)<textarea rows="3" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this needed?"/></label>
    <button className="btn btn-dark btn-full" disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>{confirmLabel} <Check size={16}/></button>
  </ModalShell>;
}

/** Shown when a signed-in user opens something their role does not allow. */
export function AccessDenied({ title = 'This area is not available to your account.', message, onHome }) {
  return <div className="empty-state access-denied">
    <div className="empty-icon"><LockKeyhole size={23}/></div>
    <h3>{title}</h3>
    <p>{message || 'Your role does not include this. If you think that is a mistake, ask an administrator.'}</p>
    <button className="btn btn-outline" onClick={onHome}>Back to overview</button>
  </div>;
}
