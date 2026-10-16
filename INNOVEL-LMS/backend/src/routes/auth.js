import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
const router = Router();
const loginSchema = z.object({email:z.string().email().max(254),password:z.string().min(1).max(200),workspace:z.enum(['Admin','Instructor','Student']).optional()});
router.post('/login', async (req,res,next) => {
  try {
    const parsed=loginSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Enter a valid email and password.'}});
    const {email,password,workspace}=parsed.data;
    const jwtSecret=process.env.JWT_ACCESS_SECRET||process.env.JWT_SECRET;
    if(!jwtSecret) return res.status(503).json({error:{code:'AUTH_NOT_CONFIGURED',message:'JWT_ACCESS_SECRET is missing from server/.env.'}});
    const result=await query('SELECT * FROM users WHERE email=lower($1)',[email.trim()]); const u=result.rows[0];
    if(!u || u.status!=='Active' || !(await bcrypt.compare(password,u.password_hash)) || (workspace && workspace!==u.role)) return res.status(401).json({error:{code:'INVALID_CREDENTIALS',message:'Email, password or workspace is incorrect.'}});
    const token=jwt.sign({sub:String(u.id),role:u.role},jwtSecret,{expiresIn:process.env.JWT_ACCESS_TTL||'15m',issuer:'innovel-lms'});
    await audit(u.id,'login','user',u.id);
    res.json({accessToken:token,tokenType:'Bearer',expiresIn:process.env.JWT_ACCESS_TTL||'15m',user:{id:String(u.id),name:u.name,email:u.email,role:u.role,status:u.status,grants:u.grants}});
  } catch(e){next(e);}
});
router.get('/me',requireAuth,(req,res)=>res.json({user:{...req.user,id:String(req.user.id)}}));
router.post('/change-password',requireAuth,async(req,res,next)=>{
  try { const s=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(12).max(200)}).safeParse(req.body); if(!s.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'New password must be at least 12 characters.'}});
    const r=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]); if(!(await bcrypt.compare(s.data.currentPassword,r.rows[0].password_hash)))return res.status(400).json({error:{code:'PASSWORD_MISMATCH',message:'Current password is incorrect.'}});
    const hash=await bcrypt.hash(s.data.newPassword,Number(process.env.BCRYPT_ROUNDS||12)); await query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[hash,req.user.id]); await audit(req.user.id,'password_changed','user',req.user.id); res.json({ok:true});
  }catch(e){next(e);}
});
router.post('/logout',requireAuth,async(req,res,next)=>{try{await audit(req.user.id,'logout','user',req.user.id);res.json({ok:true,message:'Signed out. Discard the access token on the client.'});}catch(e){next(e);}});
export default router;
