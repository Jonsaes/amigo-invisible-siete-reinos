// Tipos «numero» (adivina la cifra) y «zona» (toca en la foto) en el árbitro, con Firebase simulada en memoria.
//   node pruebas/test_reto_tipos.js   → termina con «TODO OK» o se para en el primer fallo
const assert=require('assert');
process.env.FIREBASE_DB_URL='https://x.firebasedatabase.app'; process.env.FIREBASE_SECRET='s';
const DB={ai:{2026:{privado:{p1:{codigo:'STARK-1',uid:'u'}},publico:{p1:{nombre:'Ana',casa:'stark'},p2:{nombre:'Marta',casa:'stark'}},larganoche:{config:{plazas:{stark:2}},capitulos:{cifras:{abierto:true},pruebas:{abierto:true}}}}}};
const get=(o,p)=>p.split('/').reduce((a,k)=>a&&a[k],o); const set=(o,p,v)=>{const ks=p.split('/'),l=ks.pop();let c=o;for(const k of ks){c[k]=c[k]||{};c=c[k];} c[l]=v;};
let etagN=0; const etags={};
global.fetch=async(url,opt={})=>{ const u=new URL(url); const path=u.pathname.replace(/^\//,'').replace(/\.json$/,''); const m=opt.method||'GET';
  const resp=(status,body,h={})=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body),headers:{get:k=>h[k]}});
  if(m==='GET'){ const v=get(DB,path)??null; etags[path]=etags[path]||'e'+(etagN++); return resp(200,v,{ETag:etags[path]}); }
  if(m==='PUT'){ if(opt.headers&&opt.headers['if-match']&&opt.headers['if-match']!==etags[path]) return resp(412,{}); set(DB,path,JSON.parse(opt.body)); etags[path]='e'+(etagN++); return resp(200,{}); }
  if(m==='PATCH'){ const cur=get(DB,path)||{}; set(DB,path,{...cur,...JSON.parse(opt.body)}); return resp(200,{}); } };
// un reto de zona solo para esta prueba (no está en el banco real)
const BANCO=require(__dirname+'/../netlify/functions/retos.json');
BANCO.retos.push({id:'memoria-prueba',capitulo:'pruebas',tipo:'memoria',dificultad:'caballero',imagen:'retos/x.jpg',pregunta:'¿Cuántos puentes había?',opciones:['4','2','3','5'],correcta:0});
BANCO.retos.push({id:'antorcha-prueba',capitulo:'pruebas',tipo:'antorcha',dificultad:'caballero',pregunta:'Encuentra el león',imagen:'escudos/lannister.png',punto:[50,45],radio:10});
BANCO.retos.push({id:'zona-prueba',capitulo:'pruebas',tipo:'zona',dificultad:'escudero',pregunta:'Toca el león',imagen:'escudos/lannister.png',punto:[50,45],radio:10});
const {handler}=require(__dirname+'/../netlify/functions/reto.js');
const post=async o=>{ const r=await handler({httpMethod:'POST',body:JSON.stringify({pid:'p1',codigo:'STARK-1',...o})}); return {st:r.statusCode,...JSON.parse(r.body)}; };
(async()=>{
  const lista=JSON.parse((await handler({httpMethod:'GET'})).body);
  const n=lista.retos.find(r=>r.id==='cifras-04'), z=lista.retos.find(r=>r.id==='zona-prueba');
  assert.deepStrictEqual([n.min,n.max,n.paso], [2000,2020,1]); assert(!('correcta' in n), 'la lista no lleva la respuesta');
  assert(!('punto' in z) && z.radio===10, 'la zona no lleva el punto');
  // numero: pista más/menos, fuera de rango, acierto
  let r=await post({reto:'cifras-04',respuesta:2015}); assert.strictEqual(r.resultado,'fallo'); assert.strictEqual(r.fallos[0].mas,false);
  r=await post({reto:'cifras-04',respuesta:2025}); assert.strictEqual(r.st,400,'fuera de rango se rechaza');
  r=await post({reto:'cifras-04',respuesta:'2011'}); assert.strictEqual(r.st,400,'un texto se rechaza');
  r=await post({reto:'cifras-04',respuesta:2005}); assert.strictEqual(r.resultado,'fallo'); assert.strictEqual(r.fallos[1].mas,true);
  r=await post({reto:'cifras-04',respuesta:2011}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,0,'tercer intento: 0 puntos');
  // margen: los Emmy son 59 con ±3
  r=await post({reto:'cifras-08',respuesta:57}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,3);
  r=await post({reto:'cifras-01',respuesta:2}); assert.strictEqual(r.resultado,'fallo'); assert.strictEqual(r.fallos[0].mas,true);
  r=await post({reto:'cifras-01',respuesta:3}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,1);
  // zona: lejos falla, dentro del radio acierta
  r=await post({reto:'zona-prueba',respuesta:{x:10,y:90}}); assert.strictEqual(r.resultado,'fallo'); assert.deepStrictEqual(r.fallos[0],{x:10,y:90});
  r=await post({reto:'zona-prueba',respuesta:{x:'a'}}); assert.strictEqual(r.st,400);
  r=await post({reto:'zona-prueba',respuesta:{x:56,y:51}}); assert.strictEqual(r.resultado,'ok'); assert.deepStrictEqual(r.correcta,{x:50,y:45});
  // antorcha: se corrige como la zona y da bonus por rapidez si se abrió antes
  const an=lista.retos.find(r=>r.id==='antorcha-prueba'); assert(an && an.radio===10 && !('punto' in an));
  await post({accion:'abrir',reto:'antorcha-prueba'});
  r=await post({reto:'antorcha-prueba',respuesta:{x:52,y:47}}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,5,'3 + 2 por encontrarlo en menos de 15 s');
  // memoria: la lista no da la pregunta ni las opciones; 'abrir' sí, y se corrige con ese orden
  const me=lista.retos.find(r=>r.id==='memoria-prueba'); assert(me && me.pregunta==='' && !me.opciones && me.segundos===8, JSON.stringify(me));
  const ab=await post({accion:'abrir',reto:'memoria-prueba'}); assert.strictEqual(ab.pregunta,'¿Cuántos puentes había?'); assert.strictEqual(ab.opciones.length,4);
  r=await post({reto:'memoria-prueba',respuesta:ab.opciones.indexOf('2')}); assert.strictEqual(r.resultado,'fallo');
  r=await post({reto:'memoria-prueba',respuesta:ab.opciones.indexOf('4')}); assert.strictEqual(r.resultado,'ok'); assert.strictEqual(r.puntos,1);
  const c=DB.ai[2026].larganoche.casas.stark; console.log('casa', c.puntos, 'puntos,', c.superados, 'superados');
  assert.strictEqual(c.puntos, 0+3+1+1+5+1); console.log('TODO OK');
})().catch(e=>{ console.error('FALLO:', e.message); process.exit(1); });
