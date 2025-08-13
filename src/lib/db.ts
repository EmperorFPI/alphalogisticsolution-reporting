import { Pool } from 'pg';
if(!process.env.DATABASE_URL){throw new Error('DATABASE_URL not set');}
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:10000});
export async function query(text:string,params?:any[]){const c=await pool.connect();try{const r=await c.query(text,params);return {rows:r.rows};}finally{c.release();}}
