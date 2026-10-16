import jwt from 'jsonwebtoken';
import { query } from '../db.js';
export async function requireAuth(req,res,next) {
  try {
    const token = (req.headers.authorization || '').startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!token) return res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Sign in to continue.'}});
    const jwtSecret=process.env.JWT_ACCESS_SECRET||process.env.JWT_SECRET;
    if(!jwtSecret) throw new Error('JWT secret is not configured');
    const payload = jwt.verify(token, jwtSecret);
    const result = await query('SELECT id,name,email,role,status,grants FROM users WHERE id=$1',[payload.sub]);
    const user = result.rows[0];
    if (!user || user.status !== 'Active') return res.status(401).json({error:{code:'ACCOUNT_UNAVAILABLE',message:'Account is unavailable.'}});
    req.user = user; next();
  } catch { return res.status(401).json({error:{code:'INVALID_SESSION',message:'Session is invalid or expired.'}}); }
}
export const allowRoles = (...roles) => (req,res,next) => roles.includes(req.user?.role) ? next() : res.status(403).json({error:{code:'FORBIDDEN',message:'You do not have permission for this action.'}});
export async function canManageCourse(req, courseId) {
  if (req.user.role === 'Admin') return true;
  if (req.user.role !== 'Instructor') return false;
  const r = await query('SELECT 1 FROM courses WHERE id=$1 AND instructor_id=$2',[courseId,req.user.id]);
  return r.rowCount > 0;
}
export async function isEnrolled(userId, courseId) {
  const r = await query("SELECT 1 FROM enrollments WHERE student_id=$1 AND course_id=$2 AND status='Active'",[userId,courseId]);
  return r.rowCount > 0;
}
