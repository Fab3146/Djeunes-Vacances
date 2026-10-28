const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const {neon}=require('@neondatabase/serverless');
const E=require('../src/argentine/engine.cjs')(require('../data/argentine/catalog.json'));
const flatten=s=>{const f={settings:s.settings,selected:s.selected,notes:s.notes};for(const p of s.profiles){f['profile:'+p.id]=p.name;for(const [k,v]of Object.entries(p.votes))f[`vote:${p.id}:${k}`]=v;for(const[k,v]of Object.entries(p.themes))f[`theme:${p.id}:${k}`]=v;}return f;};
(async()=>{
 const sql=neon(process.env.DATABASE_URL);const command=process.argv[2];
 if(command==='migrate'){const source=fs.readFileSync(path.join(__dirname,'../db/argentine.sql'),'utf8');const statements=source.match(/(?:\$\$[\s\S]*?\$\$|'(?:''|[^'])*'|--[^\n]*|[^;])+;/g)||[];await sql.transaction(statements.map(statement=>sql.query(statement)));console.log('Migration additive appliquée.');return;}
 if(command!=='seed')throw Error('Utilisation: migrate | seed <fichier JSON> <identifiant>');
 const file=process.argv[3],seed=process.argv[4]||'argentine-2027';if(!file)throw Error('Fichier requis.');
 if(!/^[a-z0-9-]{1,80}$/.test(seed))throw Error('Identifiant invalide.');
 const state=E.parseBackup(JSON.parse(fs.readFileSync(file,'utf8')));
 const existing=await sql`select revision from a9_trips where seed_key=${seed}`;
 if(existing.length){console.log('Voyage déjà importé ; aucune réponse modifiée.');return;}
 const ops=Object.entries(flatten(state)).map(([key,value])=>({key,value,version:0}));
 fs.mkdirSync('.private',{recursive:true});
 const privateFile=path.join('.private',seed+'.json');
 const saved=fs.existsSync(privateFile)?JSON.parse(fs.readFileSync(privateFile,'utf8')):null;
 if(saved&&(saved.seed!==seed||!/^argentine-[a-f0-9]{48}$/.test(saved.slug)))throw Error('Fichier privé incohérent.');
 const slug=saved?.slug||'argentine-'+crypto.randomBytes(24).toString('hex'),hash=crypto.createHash('sha256').update(slug).digest('hex');
 // Store the only recoverable copy of the access link before committing its hash.
 if(!saved)fs.writeFileSync(privateFile,JSON.stringify({slug,seed},null,2),{mode:0o600,flag:'wx'});
 await sql.transaction([sql`insert into a9_trips(access_hash,seed_key) values(${hash},${seed})`,sql`select a9_apply(${hash},${JSON.stringify(ops)}::jsonb,0)`]);
 console.log('Import unique terminé. Lien enregistré dans le fichier privé local.');
})().catch(e=>{console.error('Opération impossible:',e.code||e.name);process.exitCode=1;});
