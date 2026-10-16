import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query, withTransaction, pool } from './db.js';
const names=['Aarav Kumar','Ananya Raman','Arjun Prakash','Diya Srinivasan','Harish Raj','Ishita Nair','Karthik Vel','Keerthana S','Madhav Krishnan','Meera Lakshmi','Naveen Kumar','Nila Devi','Pranav Mohan','Priya Darshini','Rahul Anand','Rithika Balan','Sanjay Kumar','Shreya V','Varun Raj','Yazhini M'];
try {
 const passwordHash=await bcrypt.hash(crypto.randomBytes(32).toString('hex'),Number(process.env.BCRYPT_ROUNDS||12));
 await withTransaction(async client=>{ for(let i=0;i<names.length;i++){ const email=`student${String(i+1).padStart(2,'0')}@demo.innovel.local`; await client.query("INSERT INTO users(name,email,password_hash,role,status) VALUES($1,$2,$3,'Student','Active') ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,role='Student',status='Active',updated_at=now()",[names[i],email,passwordHash]); }});
 const count=await query("SELECT count(*)::int AS count FROM users WHERE role='Student' AND email LIKE 'student__@demo.innovel.local'");
 console.log(`Seeded sample student records. Matching records: ${count.rows[0].count}. Seed passwords are intentionally not exposed.`);
} catch(e){console.error('Student seed failed:',e.message);process.exitCode=1;} finally{await pool.end();}
