process.env.FIREBASE_DB_URL='https://x.firebasedatabase.app'; process.env.FIREBASE_SECRET='s';
const DB={ai:{2026:{maestres:{uMaestre:true}}}};
const get=(o,p)=>p.split('/').reduce((a,k)=>a&&a[k],o);
global.fetch=async(url,opt={})=>{ const u=new URL(url); const path=u.pathname.replace(/^\//,'').replace(/\.json$/,''); const auth=u.searchParams.get('auth');
  const resp=(st,body)=>({ok:st<300,status:st,json:async()=>body,text:async()=>JSON.stringify(body),headers:{get:()=>null}});
  if(path.startsWith('ai/2026/maestres/')){ const uid=path.split('/').pop(); const tokUid=JSON.parse(Buffer.from(auth.split('.')[1],'base64url').toString()).user_id; if(tokUid!==uid) return resp(401,{error:'denied'}); return resp(200,get(DB,path)??null); }
  return resp(200,null); };
const {handler}=require(__dirname+'/../netlify/functions/reto.js');
const tok=uid=>'h.'+Buffer.from(JSON.stringify({user_id:uid})).toString('base64url')+'.s';
(async()=>{
  const a=await handler({httpMethod:'POST',body:JSON.stringify({accion:'directo',idToken:tok('uMaestre')})}); const j=JSON.parse(a.body);
  console.log('maestre', a.statusCode, j.retos.length, j.retos[0].id, j.retos[0].opciones, 'correcta', j.retos[0].correcta, j.retos[0].opciones[j.retos[0].correcta]);
  const bank=require(__dirname+'/../netlify/functions/retos.json'); const s=bank.retos.find(r=>r.id===j.retos[0].id); console.log('esperada', s.opciones[s.correcta]);
  console.log('todas coinciden', j.retos.every(r=>{ const o=bank.retos.find(x=>x.id===r.id); return r.opciones[r.correcta]===o.opciones[o.correcta]; }));
  const b=await handler({httpMethod:'POST',body:JSON.stringify({accion:'directo',idToken:tok('otro')})}); console.log('otro', b.statusCode, b.body);
  const c=await handler({httpMethod:'POST',body:JSON.stringify({accion:'directo'})}); console.log('sin token', c.statusCode);
  const l=JSON.parse((await handler({httpMethod:'GET'})).body); console.log('lista excluye sobremesa', !l.retos.some(r=>r.id.startsWith('sob-')));
})();
