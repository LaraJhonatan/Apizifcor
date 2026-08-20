require('dotenv').config();
const sql=require('mssql'),crypto=require('crypto'),bcrypt=require('bcrypt');
(async()=>{const pool=await sql.connect({server:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE,options:{encrypt:true,trustServerCertificate:false}});
const ex=await pool.request().query("SELECT id FROM empresas WHERE nit='000000003'");
if(ex.recordset.length){const e=ex.recordset[0].id;
await pool.request().input('id',sql.UniqueIdentifier,e).query('DELETE FROM products WHERE empresaId=@id');
await pool.request().input('id',sql.UniqueIdentifier,e).query('DELETE FROM cuentas_empresa WHERE empresaId=@id');
await pool.request().input('id',sql.UniqueIdentifier,e).query('DELETE FROM empresas WHERE id=@id');}
const id=crypto.randomUUID();
await pool.request().input('id',sql.UniqueIdentifier,id).query("INSERT INTO empresas (id,nit,razonSocial,estado,correo,correoVerificado,rutValidado,createdAt,updatedAt) VALUES (@id,'000000003','EMPRESA TEST VISUAL','ACTIVA','t@e.com',1,1,GETDATE(),GETDATE())");
const h=await bcrypt.hash('TestPass1234',12);
await pool.request().input('i',sql.UniqueIdentifier,crypto.randomUUID()).input('e',sql.UniqueIdentifier,id).input('h',sql.NVarChar,h).query("INSERT INTO cuentas_empresa (id,empresaId,passwordHash,activo,createdAt,updatedAt) VALUES (@i,@e,@h,1,GETDATE(),GETDATE())");
console.log('empresaId='+id);await pool.close();})().catch(e=>{console.error(e);process.exit(1)});
