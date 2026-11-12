// Simula Firebase en memoria y ejercita la función
process.env.FIREBASE_DB_URL='https://x.firebasedatabase.app'; process.env.FIREBASE_SECRET='s';
const DB={ai:{2026:{privado:{p1:{codigo:'STARK-1',uid:'u'}},publico:{p1:{nombre:'Ana',casa:'stark'},p2:{nombre:'Marta',casa:'stark'},p3:{nombre:'Pepe',casa:'stark'}},larganoche:{config:{plazas:{stark:3}},capitulos:{casas:{abierto:true}}}}}};
const get=(o,p)=>p.split('/').reduce((a,k)=>a&&a[k],o); const set=(o,p,v)=>{const ks=p.split('/'),l=ks.pop();let c=o;for(const k of ks){c[k]=c[k]||{};c=c[k];} c[l]=v;};
let etagN=0; const etags={};
global.fetch=async(url,opt={})=>{ const u=new URL(url); const path=u.pathname.replace(/^\//,'').replace(/\.json$/,''); const m=opt.method||'GET';
  const resp=(status,body,h={})=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body),headers:{get:k=>h[k]}});
  if(m==='GET'){ const v=get(DB,path)??null; etags[path]=etags[path]||'e'+(etagN++); return resp(200,v,{ETag:etags[path]}); }
  if(m==='PUT'){ if(opt.headers&&opt.headers['if-match']&&opt.headers['if-match']!==etags[path]) return resp(412,{}); set(DB,path,JSON.parse(opt.body)); etags[path]='e'+(etagN++); return resp(200,{}); }
  if(m==='PATCH'){ const cur=get(DB,path)||{}; set(DB,path,{...cur,...JSON.parse(opt.body)}); return resp(200,{}); } };
const {handler}=require(__dirname+'/../netlify/functions/reto.js');
(async()=>{
  const lista=JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{lista:'1'}})).body);
  console.log('retos servidos',lista.retos.length,'tiene correcta?',JSON.stringify(lista.retos[0]).includes('correcta'));
  const r0=lista.retos.find(r=>r.id==='casas-01'); console.log(r0.opciones);
  const post=async(o)=>JSON.parse((await handler({httpMethod:'POST',body:JSON.stringify(o)})).body);
  console.log('codigo malo', await post({pid:'p1',codigo:'X',reto:'casas-01',opcion:0}));
  const wrong=r0.opciones.indexOf('Fuego y Sangre'), right=r0.opciones.indexOf('Se acerca el invierno');
  console.log('fallo', await post({pid:'p1',codigo:'STARK-1',reto:'casas-01',opcion:wrong}));
  console.log('acierto 2º', await post({pid:'p1',codigo:'STARK-1',reto:'casas-01',opcion:right}));
  console.log('repetido', await post({pid:'p1',codigo:'STARK-1',reto:'casas-01',opcion:right}));
  console.log('cap cerrado', await post({pid:'p1',codigo:'STARK-1',reto:'norte-01',opcion:0}));
  // agotar casas-02
  const r2=lista.retos.find(r=>r.id==='casas-02'); const corr=r2.opciones.indexOf('¡Oye mi rugido!'); const malas=[0,1,2,3].filter(i=>i!==corr);
  for(const i of malas) console.log('agotando', (await post({pid:'p1',codigo:'STARK-1',reto:'casas-02',opcion:i})).resultado);
  console.log('casa', JSON.stringify(DB.ai[2026].larganoche.casas.stark).slice(0,300));
  console.log('persona', DB.ai[2026].larganoche.personas.p1, 'stats', DB.ai[2026].larganoche.retos);
})();
