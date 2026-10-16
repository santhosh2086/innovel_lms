import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { query, withTransaction } from '../db.js';
import { audit } from '../services/audit.js';
const router = Router();
const emailSchema = z.string().email().max(254).transform(v=>v.trim().toLowerCase());
const requestSchema = z.object({name:z.string().trim().min(2).max(160),email:emailSchema});
const verifySchema = z.object({email:emailSchema,otp:z.string().regex(/^\d{6}$/)});
const completeSchema = z.object({email:emailSchema,signupToken:z.string().min(30),password:z.string().min(12).max(200)});
function mailer(){
  if(!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.gmail.com',port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=='false',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
}
router.post('/request-otp',async(req,res,next)=>{
 try{
  const parsed=requestSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Enter your name and a valid email address.'}});
  const {name,email}=parsed.data;
  const transport=mailer(); if(!transport)return res.status(503).json({error:{code:'EMAIL_NOT_CONFIGURED',message:'Email OTP is not configured yet. Set SMTP_USER and SMTP_PASS in server/.env.'}});
  const existing=await query('SELECT id FROM users WHERE email=$1',[email]); if(existing.rowCount)return res.status(409).json({error:{code:'EMAIL_EXISTS',message:'An account already exists for this email. Please sign in.'}});
  const recent=await query("SELECT count(*)::int AS n FROM signup_otps WHERE email=$1 AND created_at > now() - interval '15 minutes'",[email]);
  if(recent.rows[0].n>=3)return res.status(429).json({error:{code:'OTP_RATE_LIMIT',message:'Too many OTP requests. Please try again in 15 minutes.'}});
  const otp=String(crypto.randomInt(0,1000000)).padStart(6,'0');
  const otpHash=await bcrypt.hash(otp,10); const ttl=Math.max(3,Math.min(15,Number(process.env.OTP_TTL_MINUTES||10)));
  await query('INSERT INTO signup_otps(email,name,otp_hash,expires_at) VALUES($1,$2,$3,now()+($4 * interval \'1 minute\'))',[email,name,otpHash,ttl]);
  await transport.sendMail({from:process.env.EMAIL_FROM||process.env.SMTP_USER,to:email,subject:'Your INNOVEL Learning verification code',text:`Your INNOVEL Learning email verification code is ${otp}. It expires in ${ttl} minutes. If you did not request this, ignore this email.`,html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Verify your email</h2><p>Hi ${name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}, use this code to continue your INNOVEL Learning signup:</p><div style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f4f1e9;border-radius:8px;text-align:center">${otp}</div><p>This code expires in ${ttl} minutes.</p></div>`});
  res.json({ok:true,message:'Verification code sent to your email. Check your inbox and spam folder.'});
 }catch(e){next(e);}
});
router.post('/verify-otp',async(req,res,next)=>{
 try{
  const parsed=verifySchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Enter the 6-digit verification code.'}});
  const {email,otp}=parsed.data;
  const r=await query("SELECT * FROM signup_otps WHERE email=$1 AND verified_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1",[email]); const row=r.rows[0];
  if(!row)return res.status(400).json({error:{code:'OTP_EXPIRED',message:'Verification code expired. Request a new code.'}});
  if(row.attempts>=5)return res.status(429).json({error:{code:'OTP_ATTEMPTS',message:'Too many incorrect attempts. Request a new code.'}});
  if(!(await bcrypt.compare(otp,row.otp_hash))){await query('UPDATE signup_otps SET attempts=attempts+1 WHERE id=$1',[row.id]);return res.status(400).json({error:{code:'OTP_INVALID',message:'That code is incorrect. Please try again.'}});}
  const signupToken=crypto.randomBytes(32).toString('hex'); const tokenHash=crypto.createHash('sha256').update(signupToken).digest('hex');
  await query('UPDATE signup_otps SET verified_at=now(),otp_hash=$2 WHERE id=$1',[row.id,`VERIFIED:${tokenHash}`]);
  res.json({ok:true,signupToken,message:'Email verified. Create your password to finish signup.'});
 }catch(e){next(e);}
});
router.post('/complete',async(req,res,next)=>{
 try{
  const parsed=completeSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Password must be at least 12 characters.'}});
  const {email,signupToken,password}=parsed.data; const tokenHash=crypto.createHash('sha256').update(signupToken).digest('hex');
  const r=await query("SELECT * FROM signup_otps WHERE email=$1 AND verified_at IS NOT NULL AND otp_hash=$2 AND created_at>now()-interval '20 minutes' ORDER BY created_at DESC LIMIT 1",[email,`VERIFIED:${tokenHash}`]); const verification=r.rows[0];
  if(!verification)return res.status(400).json({error:{code:'SIGNUP_VERIFICATION_EXPIRED',message:'Email verification expired. Please verify your email again.'}});
  const passwordHash=await bcrypt.hash(password,Number(process.env.BCRYPT_ROUNDS||12));
  const user=await withTransaction(async client=>{
   const created=await client.query("INSERT INTO users(name,email,password_hash,role,status) VALUES($1,$2,$3,'Student','Active') ON CONFLICT(email) DO NOTHING RETURNING id,name,email,role,status,grants",[verification.name,email,passwordHash]);
   if(!created.rowCount){const err=new Error('An account already exists for this email. Please sign in.');err.status=409;err.code='EMAIL_EXISTS';throw err;}
   await client.query('DELETE FROM signup_otps WHERE email=$1',[email]); return created.rows[0];
  });
  await audit(user.id,'student_signup','user',user.id); res.status(201).json({ok:true,message:'Account created. You can now sign in with your email and password.',user:{id:String(user.id),name:user.name,email:user.email,role:user.role,status:user.status,grants:user.grants}});
 }catch(e){next(e);}
});
export default router;
