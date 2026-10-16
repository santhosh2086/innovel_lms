import { query } from '../db.js';
export async function audit(actorId, action, entityType, entityId = null, metadata = {}) {
  await query('INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',[actorId,action,entityType,entityId == null ? null : String(entityId),JSON.stringify(metadata)]);
}
export async function notify(userId,type,title,body='') {
  await query('INSERT INTO notifications(user_id,type,title,body) VALUES($1,$2,$3,$4)',[userId,type,title,body]);
}
