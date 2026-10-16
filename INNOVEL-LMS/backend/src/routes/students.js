import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
router.get('/', requireAuth, allowRoles('Admin','Instructor'), async (req,res,next) => {
  try {
    const params = req.user.role === 'Admin' ? [] : [req.user.id];
    const scope = req.user.role === 'Admin' ? '' : ' AND c.instructor_id=$1';
    const r = await query(`
      SELECT u.id AS student_id,u.name AS student_name,u.email AS student_email,u.status AS student_status,
        c.id AS course_id,c.title AS course_title,c.price AS course_fee,c.currency,
        e.status AS enrollment_status,e.enrolled_at,
        COALESCE(paid.paid_amount,0) AS paid_amount,
        COALESCE(paid.pending_amount,0) AS pending_amount,
        COALESCE(paid.payment_history,'[]'::json) AS payment_history
      FROM users u
      LEFT JOIN enrollments e ON e.student_id=u.id
      LEFT JOIN courses c ON c.id=e.course_id
      LEFT JOIN LATERAL (
        SELECT SUM(amount) FILTER (WHERE status='Paid') AS paid_amount,
               SUM(amount) FILTER (WHERE status IN ('Pending','Authorized')) AS pending_amount,
               json_agg(json_build_object('id',p.id,'amount',p.amount,'currency',p.currency,'status',p.status,'reference',COALESCE(p.gateway_payment_id,p.gateway_order_id,p.receipt),'date',p.created_at) ORDER BY p.created_at DESC) AS payment_history
        FROM payments p WHERE p.student_id=u.id AND p.course_id=c.id
      ) paid ON true
      WHERE u.role='Student' ${scope}
      ORDER BY u.name,c.title`, params);
    const students = new Map();
    for (const row of r.rows) {
      if (!students.has(String(row.student_id))) students.set(String(row.student_id), {
        id:String(row.student_id),name:row.student_name,email:row.student_email,status:row.student_status,courses:[],totalFees:0,paidAmount:0,pendingAmount:0,paymentHistory:[]
      });
      const s=students.get(String(row.student_id));
      if (row.course_id) {
        s.courses.push({id:Number(row.course_id),title:row.course_title,fee:Number(row.course_fee),currency:row.currency,enrollmentStatus:row.enrollment_status,enrolledAt:row.enrolled_at,paidAmount:Number(row.paid_amount||0),pendingAmount:Number(row.pending_amount||0)});
        s.totalFees+=Number(row.course_fee||0); s.paidAmount+=Number(row.paid_amount||0); s.pendingAmount+=Number(row.pending_amount||0);
        for (const pay of (row.payment_history||[])) s.paymentHistory.push({...pay,courseTitle:row.course_title});
      }
    }
    res.json({students:[...students.values()]});
  } catch(e) { next(e); }
});
export default router;
