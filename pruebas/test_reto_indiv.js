// Capítulos individuales: cada miembro sus intentos; la Casa suma la media de los que participan.
//   node pruebas/test_reto_indiv.js   → termina con «TODO OK» o se para en el primer fallo
const assert=require('assert');
process.env.FIREBASE_DB_URL='https://x.firebasedatabase.app'; process.env.FIREBASE_SECRET='s';
const DB={ai:{2026:{
  privado:{p1:{codigo:'C1'},p2:{codigo:'C2'},p3:{codigo:'C3'},t1:{codigo:'T1'}},
  publico:{p1:{nombre:'Rápido',casa:'stark'},p2:{nombre:'Lento',casa:'stark'},p3:{nombre:'Mirón',casa:'stark'},t1:{nombre:'Targa',casa:'targaryen'}},
  larganoche:{config:{plazas:{stark:3,targaryen:1}},capitulos:{casas:{abierto:true},cifras:{abierto:true,modo:'individual'},rodaje:{abierto:true,modo:'individual'}}}}}};
const get=(o,p)=>p.split('/').reduce((a,k)=>a&&a[k],o); const set=(o,p,v)=>{const ks=p.split('/'),l=ks.pop();let c=o;for(const k of ks){c[k]=c[k]||{};c=c[k];} c[l]=v;};
let etagN=0; const etags={};
global.fetch=async(url,opt={})=>{ const u=new URL(url); const path=u.pathname.replace(/^\//,'').replace(/\.json$/,''); const m=opt.method||'GET';
  const resp=(status,body,h={})=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body),headers:{get:k=>h[k]}});
  if(m==='GET'){ const v=get(DB,path)??null; etags[path]=etags[path]||'e'+(etagN++); return resp(200,v,{ETag:etags[path]}); }
  if(m==='PUT'){ if(opt.headers&&opt.headers['if-match']&&opt.headers['if-match']!==etags[path]) return resp(412,{}); set(DB,path,JSON.parse(opt.body)); etags[path]='e'+(etagN++); return resp(200,{}); }
  if(m==='PATCH'){ const cur=get(DB,path)||{}; set(DB,path,{...cur,...JSON.parse(opt.body)}); return resp(200,{}); } };
const BANCO=require(__dirname+'/../netlify/functions/retos.json');
const {handler}=require(__dirname+'/../netlify/functions/reto.js');
const C={p1:'C1',p2:'C2',p3:'C3',t1:'T1'};
const post=async(pid,o)=>{ const r=await handler({httpMethod:'POST',body:JSON.stringify({pid,codigo:C[pid],...o})}); return {st:r.statusCode,...JSON.parse(r.body)}; };
const casa=()=>DB.ai[2026].larganoche.casas.stark;
(async()=>{
  // 1. el rápido acierta a la primera (3); el lento puede jugar el MISMO reto con sus propios intentos
  let r=await post('p1',{reto:'cifras-01',respuesta:3}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,3);
  assert.deepStrictEqual(r.media,{pts:3,part:1}); assert.strictEqual(casa().puntos,3); assert.strictEqual(casa().superados,1);
  r=await post('p1',{reto:'cifras-01',respuesta:3}); assert.strictEqual(r.resultado,'hecho','el mismo no puede repetir');
  r=await post('p2',{reto:'cifras-01',respuesta:5}); assert.strictEqual(r.resultado,'fallo','el lento no ve el reto resuelto');
  assert.deepStrictEqual(r.media,{pts:2,part:2},'media (3+0)/2 = 1,5 → 2');
  r=await post('p2',{reto:'cifras-01',respuesta:3}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,1);
  assert.deepStrictEqual(r.media,{pts:2,part:2}); assert.strictEqual(casa().puntos,2,'la Casa suma la media, no la suma');
  assert.strictEqual(casa().superados,1,'el escudo cuenta el reto una sola vez');
  assert(!casa().retos || !casa().retos['cifras-01'], 'nada en los retos de grupo');
  // 2. el que no juega no baja la media
  assert(!casa().miembros.p3);
  // 3. un capítulo en grupo sigue como antes y se suma a lo individual
  const lista=JSON.parse((await handler({httpMethod:'GET'})).body); const c1=lista.retos.find(x=>x.id==='casas-01');
  r=await post('p3',{reto:'casas-01',respuesta:c1.opciones.indexOf('Se acerca el invierno')}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,3);
  assert(!r.media); assert.strictEqual(casa().puntos,2+3); assert.strictEqual(casa().superados,2);
  r=await post('p1',{reto:'casas-01',respuesta:0}); assert.strictEqual(r.resultado,'hecho','en grupo, el reto ya es de la Casa');
  // 4. gema: en cuanto UN miembro termina todo el capítulo
  const cif=BANCO.retos.filter(x=>x.capitulo==='cifras'&&!x.sobremesa);
  let gema=null;
  for (const x of cif.filter(x=>x.id!=='cifras-01')){ const v=await post('p1',{reto:x.id,respuesta:x.correcta}); assert.strictEqual(v.resultado,'ok',x.id); if(v.capituloCompleto) gema=v.capituloCompleto; }
  assert.strictEqual(gema,'cifras'); assert(casa().capitulos.cifras);
  const med=casa().indiv.cifras; assert.deepStrictEqual(med,{pts:Math.round((3*cif.length+1)/2),part:2});
  assert.strictEqual(casa().puntos, med.pts+3); assert.strictEqual(casa().superados, cif.length+1);
  // 6. otra Casa no se mezcla
  r=await post('t1',{reto:'cifras-01',respuesta:3}); assert.strictEqual(r.resultado,'ok'); assert.deepStrictEqual(r.media,{pts:3,part:1});
  assert.strictEqual(casa().puntos, med.pts+3);
  // 7. foto en capítulo individual: el reloj del bonus es de cada uno
  const f1=lista.retos.find(x=>x.id==='foto-01'), ok=f1.opciones.indexOf('Los Martell');
  await post('p2',{accion:'abrir',reto:'foto-01'}); assert(casa().miembros.p2.retos['foto-01'].abierto, 'abrir apunta en la ficha del miembro');
  assert(!casa().retos['foto-01']);
  r=await post('p2',{reto:'foto-01',respuesta:ok}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,5,'3 + 2 por rapidez');
  r=await post('p1',{reto:'foto-01',respuesta:ok}); assert.strictEqual(r.puntos,3,'sin abrir no hay bonus');
  console.log('stark', casa().puntos, 'puntos ·', casa().superados, 'retos · media cifras', JSON.stringify(med)); console.log('TODO OK');
})().catch(e=>{ console.error('FALLO:', e.message); process.exit(1); });
