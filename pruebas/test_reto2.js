process.env.FIREBASE_DB_URL='https://x.firebasedatabase.app'; process.env.FIREBASE_SECRET='s';
const DB={ai:{2026:{privado:{p1:{codigo:'C1',uid:'u'},p8:{codigo:'C8',uid:'u'}},publico:{p1:{nombre:'Ana',casa:'stark'},p2:{nombre:'M',casa:'stark'},p3:{nombre:'J',casa:'stark'},p8:{nombre:'Ana',casa:'targaryen'}},
  larganoche:{config:{plazas:{stark:3,targaryen:1,lannister:4}},capitulos:{norte:{abierto:true},batallas:{abierto:true},actores:{abierto:true},familia:{abierto:true},rodaje:{abierto:true}}}}}};
const get=(o,p)=>p.split('/').reduce((a,k)=>a&&a[k],o); const set=(o,p,v)=>{const ks=p.split('/'),l=ks.pop();let c=o;for(const k of ks){c[k]=c[k]||{};c=c[k];} c[l]=v;};
let n=0; const et={};
global.fetch=async(url,opt={})=>{ const u=new URL(url); const path=u.pathname.replace(/^\//,'').replace(/\.json$/,''); const m=opt.method||'GET';
  const resp=(st,body,h={})=>({ok:st<300,status:st,json:async()=>body,text:async()=>JSON.stringify(body),headers:{get:k=>h[k]}});
  if(m==='GET'){ et[path]=et[path]||'e'+(n++); return resp(200,get(DB,path)??null,{ETag:et[path]}); }
  if(m==='PUT'){ if(opt.headers&&opt.headers['if-match']&&opt.headers['if-match']!==et[path]) return resp(412,{}); set(DB,path,JSON.parse(opt.body)); et[path]='e'+(n++); return resp(200,{}); }
  if(m==='PATCH'){ set(DB,path,{...(get(DB,path)||{}),...JSON.parse(opt.body)}); return resp(200,{}); } };
const {handler}=require(__dirname+'/../netlify/functions/reto.js');
const post=async(o)=>JSON.parse((await handler({httpMethod:'POST',body:JSON.stringify(o)})).body);
(async()=>{
  const lista=JSON.parse((await handler({httpMethod:'GET'})).body); const L=Object.fromEntries(lista.retos.map(r=>[r.id,r]));
  console.log('mapa lejos', (await post({pid:'p1',codigo:'C1',reto:'mapa-01',respuesta:{x:10,y:10}})).resultado);
  console.log('mapa cerca', (await post({pid:'p1',codigo:'C1',reto:'mapa-01',respuesta:{x:140,y:165}})).resultado);
  // ordena: calcular respuesta correcta a partir de la lista servida
  const bank=require(__dirname+'/../netlify/functions/retos.json'); const O=bank.retos.find(r=>r.id==='ordena-01');
  const resp=O.items.map(t=>L['ordena-01'].items.indexOf(t)); console.log('ordena mal', (await post({pid:'p1',codigo:'C1',reto:'ordena-01',respuesta:[0,1,2,3].filter(i=>true).reverse()})).resultado, 'bien', (await post({pid:'p1',codigo:'C1',reto:'ordena-01',respuesta:resp})).resultado);
  const E=bank.retos.find(r=>r.id==='empareja-01'); const map=L['empareja-01'].izq.map(l=>L['empareja-01'].der.indexOf(E.parejas.find(p=>p[0]===l)[1]));
  console.log('empareja bien', (await post({pid:'p1',codigo:'C1',reto:'empareja-01',respuesta:map})).resultado);
  const c1=await post({pid:'p1',codigo:'C1',reto:'cuervo-01',accion:'cuervo'}); const c2=await post({pid:'p8',codigo:'C8',reto:'cuervo-01',accion:'cuervo'}); console.log('cuervo', c1, c2);
  console.log('cuervo mal', (await post({pid:'p1',codigo:'C1',reto:'cuervo-01',respuesta:'AAAABBBB'})).resultado, 'bien', (await post({pid:'p1',codigo:'C1',reto:'cuervo-01',respuesta:c1.mitad+c2.mitad})).resultado);
  await post({pid:'p1',codigo:'C1',reto:'foto-01',accion:'abrir'}); const F=bank.retos.find(r=>r.id==='foto-01'); const fi=L['foto-01'].opciones.indexOf(F.opciones[F.correcta]);
  const fr=await post({pid:'p1',codigo:'C1',reto:'foto-01',respuesta:fi}); console.log('foto', fr.resultado, fr.puntos, 'extra', fr.extra);
  console.log('respuesta inválida', await post({pid:'p1',codigo:'C1',reto:'mapa-02',respuesta:'x'}));
  console.log('stark', JSON.stringify({...DB.ai[2026].larganoche.casas.stark, retos:undefined}));
})();
