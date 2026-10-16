import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, pool, withTransaction } from './db.js';
const adminEmail=(process.env.ADMIN_EMAIL||'admin@gmail.com').trim().toLowerCase();
const adminPassword=process.env.ADMIN_PASSWORD||'santhosh2029';
const instructorEmail=(process.env.INSTRUCTOR_EMAIL||'instructor@gmail.com').trim().toLowerCase();
const instructorPassword=process.env.INSTRUCTOR_PASSWORD||'santhosh2029';
if(adminPassword.length<12||instructorPassword.length<12){console.error('Admin and instructor passwords must be at least 12 characters.');process.exitCode=1;}
else try {
 const adminHash=await bcrypt.hash(adminPassword,Number(process.env.BCRYPT_ROUNDS||12));
 const instructorHash=await bcrypt.hash(instructorPassword,Number(process.env.BCRYPT_ROUNDS||12));
 const result=await withTransaction(async client=>{
  const a=await client.query(`INSERT INTO users(name,email,password_hash,role,status) VALUES('INNOVEL Admin',$1,$2,'Admin','Active') ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='Admin',status='Active',updated_at=now() RETURNING id,email`,[adminEmail,adminHash]);
  const i=await client.query(`INSERT INTO users(name,email,password_hash,role,status,grants) VALUES('INNOVEL Instructor',$1,$2,'Instructor','Active',ARRAY['zoom.manage','assessment.manage','course.publish']) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='Instructor',status='Active',grants=ARRAY['zoom.manage','assessment.manage','course.publish'],updated_at=now() RETURNING id,email`,[instructorEmail,instructorHash]);
  const samples=[['Full Stack Web Development','Learn modern HTML, CSS, JavaScript, React and backend API development.','Development',19999],['Python Programming','Build a strong foundation in Python with practical exercises.','Development',9999],['Data Analytics with SQL','Query, clean and interpret data using SQL and dashboards.','Data',12999],['UI/UX Design Fundamentals','Research, wireframe and prototype useful digital experiences.','Design',8999],['Java Programming','Core Java, object-oriented programming and application basics.','Development',11999],['Digital Marketing Essentials','Understand content, search, analytics and campaign planning.','Business',7999]];
  for(const [title,description,category,price] of samples){await client.query(`INSERT INTO courses(title,description,category,level,duration,instructor_id,price,currency,status) SELECT $1::text,$2::text,$3::text,'Beginner','8 weeks',$4::bigint,$5::numeric,'INR','published' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE lower(title)=lower($1::text))`,[title,description,category,i.rows[0].id,price]);}
  return {admin:a.rows[0],instructor:i.rows[0]};
 });
 console.log('Admin account ready:',result.admin.email); console.log('Instructor account ready:',result.instructor.email); console.log('Six starter courses are available (existing course data was preserved).');
} catch(e){console.error('Could not seed staff accounts:',e.message);process.exitCode=1;} finally {await pool.end();}
