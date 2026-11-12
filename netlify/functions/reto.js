// La Larga Noche · el árbitro de los retos.
// Vive en Netlify, fuera del alcance del navegador. Guarda las respuestas correctas,
// corrige lo que envía cada jugador y apunta el resultado en Firebase con una clave
// que solo conoce Netlify. La web nunca escribe puntos por su cuenta.
//
//   GET  /.netlify/functions/reto?lista=1                       → capítulos y retos SIN la respuesta correcta
//   POST /.netlify/functions/reto  {accion:'responder', pid, codigo, reto, respuesta}  → corrige y guarda
//   POST /.netlify/functions/reto  {accion:'abrir', pid, codigo, reto}     → apunta cuándo se abrió (foto desenfocada)
//   POST /.netlify/functions/reto  {accion:'cuervo', pid, codigo, reto}    → la mitad de clave de la Casa y quién tiene la otra
//   POST /.netlify/functions/reto  {accion:'directo', idToken}             → (solo el Maestre) las preguntas de la sobremesa con sus respuestas
//
// Variables de entorno en Netlify (Site configuration → Environment variables):
//   FIREBASE_DB_URL          la databaseURL de tu firebaseConfig (termina en firebasedatabase.app)
//   FIREBASE_SECRET          el "Database secret" de Firebase (Configuración → Cuentas de servicio → Secretos)
//     … o, si tu Firebase ya no muestra secretos:
//   FIREBASE_SERVICE_ACCOUNT el JSON entero de una cuenta de servicio (Generar nueva clave privada)
//   ANIO                     opcional, por defecto 2026 (el mismo que JUEGO.anio en index.html)

const BANCO = require('./retos.json');
const crypto = require('crypto');

const ROOT = 'ai/' + (process.env.ANIO || '2026');
const PUNTOS = [3, 1, 0];           // por intento: 1.º, 2.º, 3.º
const MAX_INTENTOS = 3;
const ESCARCHA_MAX = 5;
const RADIO_MAPA = 30;              // tolerancia por defecto al señalar en el mapa (unidades del mapa, 0-300 × 0-500)
const RADIO_ZONA = 8;               // tolerancia por defecto al tocar en una foto (% del ancho y del alto de la imagen)
const FOTO_BONUS = [[5, 2], [12, 1]]; // foto desenfocada: [segundos, puntos extra] si se acierta a la primera
const BONUS = { foto: FOTO_BONUS, antorcha: [[15, 2], [30, 1]] }; // la antorcha: buscar a oscuras da más tiempo

/* ---------- Acceso a Firebase (REST, con credenciales de administrador) ---------- */
let tokenCache = null;
async function credencial() {
  if (process.env.FIREBASE_SECRET) return 'auth=' + encodeURIComponent(process.env.FIREBASE_SECRET);
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) throw new Error('Falta FIREBASE_SECRET o FIREBASE_SERVICE_ACCOUNT en Netlify');
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return 'access_token=' + tokenCache.token;
  const key = JSON.parse(sa);
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + unsigned + '.' + sig });
  const j = await r.json();
  if (!j.access_token) throw new Error('No se pudo obtener token: ' + JSON.stringify(j));
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return 'access_token=' + j.access_token;
}
function dbUrl(path, extra) { const base = (process.env.FIREBASE_DB_URL || '').replace(/\/$/, ''); if (!base) throw new Error('Falta FIREBASE_DB_URL en Netlify'); return `${base}/${ROOT}/${path}.json?${extra}`; }
async function dbGet(path, etag) {
  const r = await fetch(dbUrl(path, await credencial()), { headers: etag ? { 'X-Firebase-ETag': 'true' } : {} });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status} ${await r.text()}`);
  const v = await r.json();
  return etag ? { v, etag: r.headers.get('ETag') } : v;
}
async function dbPut(path, val, etag) {
  const r = await fetch(dbUrl(path, await credencial()), { method: 'PUT', headers: etag ? { 'if-match': etag } : {}, body: JSON.stringify(val) });
  if (r.status === 412) return false;          // alguien escribió antes: reintentar
  if (!r.ok) throw new Error(`PUT ${path} → ${r.status} ${await r.text()}`);
  return true;
}
async function dbPatch(path, obj) {
  const r = await fetch(dbUrl(path, await credencial()), { method: 'PATCH', body: JSON.stringify(obj) });
  if (!r.ok) throw new Error(`PATCH ${path} → ${r.status} ${await r.text()}`);
}

/* ---------- Barajado determinista (igual en la web, para el modo local) ---------- */
function semilla(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function baraja(n, clave) {
  let a = semilla(clave + '|' + ROOT); const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;                                   // idx[posiciónMostrada] = posiciónOriginal
}
const orden = reto => baraja((reto.opciones || []).length, reto.id);
const TIPOS_OPCIONES = ['test', 'foto', 'silueta', 'emojis', 'memoria'];
const tipoDe = reto => reto.tipo || 'test';

// Lo que ve el navegador de cada reto: nunca la respuesta.
function publico(reto) {
  const tipo = tipoDe(reto);
  const r = { id: reto.id, capitulo: reto.capitulo, tipo, dificultad: reto.dificultad || 'caballero', pregunta: reto.pregunta || '' };
  if (reto.imagen) r.imagen = reto.imagen;
  if (reto.emojis) r.emojis = reto.emojis;
  if (reto.ejemplo) r.ejemplo = true;
  if (TIPOS_OPCIONES.includes(tipo) && tipo !== 'memoria') r.opciones = orden(reto).map(i => reto.opciones[i]);
  // memoria del cuervo: la pregunta y las opciones NO van en la lista; las da 'abrir' cuando el jugador ya está mirando la escena
  if (tipo === 'memoria') { r.pregunta = ''; r.segundos = reto.segundos || 8; }
  if (tipo === 'ordena') r.items = baraja(reto.items.length, reto.id + '|ordena').map(i => reto.items[i]);
  if (tipo === 'empareja') { r.izq = reto.parejas.map(p => p[0]); r.der = baraja(reto.parejas.length, reto.id + '|der').map(i => reto.parejas[i][1]); }
  if (tipo === 'mapa') r.radio = reto.radio || RADIO_MAPA;
  if (tipo === 'cuervo') r.pista = reto.pista || '';
  if (tipo === 'zona' || tipo === 'antorcha') r.radio = reto.radio || RADIO_ZONA;
  if (tipo === 'numero') Object.assign(r, { min: reto.min, max: reto.max, paso: reto.paso || 1, margen: reto.margen || 0, unidad: reto.unidad || '' });
  return r;
}
const jugables = () => BANCO.retos.filter(r => !r.sobremesa);

/* ---------- Retos de cuervo: cada Casa tiene media clave; la otra mitad la tiene la Casa siguiente ---------- */
function claveCuervo(reto, casa) {
  const sec = process.env.FIREBASE_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT || 'poniente';
  const h = crypto.createHash('sha256').update(reto.id + '|' + casa + '|' + sec).digest('hex');
  const ALFA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 4; i++) s += ALFA[parseInt(h.substr(i * 2, 2), 16) % ALFA.length];
  return s;
}
function casaSiguiente(casas, casa) { const i = casas.indexOf(casa); return casas[(i + 1) % casas.length]; }

/* ---------- ¿Es correcta la respuesta? ---------- */
function corregir(reto, respuesta, ctx) {
  const tipo = tipoDe(reto);
  if (TIPOS_OPCIONES.includes(tipo)) { const o = orden(reto); const correcta = o.indexOf(reto.correcta); return { ok: respuesta === correcta, correcta, guardar: respuesta }; }
  if (tipo === 'mapa') { const [px, py] = reto.punto; const x = Number(respuesta && respuesta.x), y = Number(respuesta && respuesta.y); const d = Math.hypot(x - px, y - py); return { ok: d <= (reto.radio || RADIO_MAPA), correcta: { x: px, y: py }, guardar: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }; }
  if (tipo === 'ordena') { const b = baraja(reto.items.length, reto.id + '|ordena'); const r = Array.isArray(respuesta) ? respuesta.map(i => b[i]) : []; const ok = r.length === reto.items.length && r.every((v, i) => v === i); return { ok, correcta: b.map((_, i) => b.indexOf(i)), guardar: respuesta }; }
  if (tipo === 'empareja') { const b = baraja(reto.parejas.length, reto.id + '|der'); const r = Array.isArray(respuesta) ? respuesta.map(i => b[i]) : []; const ok = r.length === reto.parejas.length && r.every((v, i) => v === i); return { ok, correcta: b.map((_, i) => b.indexOf(i)), guardar: respuesta }; }
  if (tipo === 'cuervo') { const esperada = claveCuervo(reto, ctx.casa) + claveCuervo(reto, casaSiguiente(ctx.casas, ctx.casa)); const dada = String(respuesta || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return { ok: dada === esperada, correcta: esperada, guardar: dada.slice(0, 12) }; }
  // antorcha = toca en la foto, pero a oscuras con una antorcha (se corrige igual)
  if (tipo === 'zona' || tipo === 'antorcha') { const [px, py] = reto.punto; const x = Number(respuesta && respuesta.x), y = Number(respuesta && respuesta.y); return { ok: Math.hypot(x - px, y - py) <= (reto.radio || RADIO_ZONA), correcta: { x: px, y: py }, guardar: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }; }
  // numero: en cada fallo se guarda si la respuesta buena es más alta o más baja (es la pista del siguiente intento)
  if (tipo === 'numero') { const n = Number(respuesta); return { ok: Math.abs(n - reto.correcta) <= (reto.margen || 0), correcta: reto.correcta, guardar: { n, mas: reto.correcta > n } }; }
  throw new Error('tipo de reto desconocido: ' + tipo);
}
function respuestaValida(reto, respuesta) {
  const tipo = tipoDe(reto);
  if (TIPOS_OPCIONES.includes(tipo)) return Number.isInteger(respuesta) && respuesta >= 0 && respuesta < reto.opciones.length;
  if (tipo === 'mapa') return respuesta && typeof respuesta === 'object' && isFinite(respuesta.x) && isFinite(respuesta.y);
  if (tipo === 'ordena') return Array.isArray(respuesta) && respuesta.length === reto.items.length && respuesta.every(Number.isInteger);
  if (tipo === 'empareja') return Array.isArray(respuesta) && respuesta.length === reto.parejas.length && respuesta.every(Number.isInteger);
  if (tipo === 'cuervo') return typeof respuesta === 'string' && respuesta.length <= 20;
  if (tipo === 'zona' || tipo === 'antorcha') return respuesta && typeof respuesta === 'object' && isFinite(respuesta.x) && isFinite(respuesta.y);
  if (tipo === 'numero') return typeof respuesta === 'number' && isFinite(respuesta) && respuesta >= reto.min && respuesta <= reto.max;
  return false;
}

/* ---------- Corrección y puntos ---------- */
// Dos formas de jugar un capítulo (la decide el Maestre al abrirlo: larganoche/capitulos/{id}.modo):
//  · en grupo (sin modo, los primeros capítulos): 3 intentos por reto para toda la Casa, en casas/{casa}/retos.
//  · 'individual': cada miembro tiene sus 3 intentos (casas/{casa}/miembros/{pid}/retos) y la Casa suma, por capítulo,
//    la MEDIA redondeada de los miembros que han contestado algo de ese capítulo (casas/{casa}/indiv/{cap}).
//    Los retos de cuervo siguen siendo de la Casa (hacen falta dos Casas hablando).
const terminado = x => !!(x && (x.ok || x.agotado));
const tocado = x => !!(x && (x.ok || x.agotado || (x.fallos && x.fallos.length)));
function capCompleto(e, cap, indiv) {
  const delCap = jugables().filter(x => x.capitulo === cap);
  if (!indiv) return delCap.every(x => terminado(e.retos[x.id]));
  // individual: basta con que UN miembro termine sus retos (y la Casa los de cuervo)
  return Object.values(e.miembros || {}).some(m => delCap.every(x => tipoDe(x) === 'cuervo' ? terminado(e.retos[x.id]) : terminado((m.retos || {})[x.id])));
}
function mediaCapitulo(e, cap) {
  const ids = new Set(jugables().filter(x => x.capitulo === cap && tipoDe(x) !== 'cuervo').map(x => x.id));
  const part = Object.values(e.miembros || {}).filter(m => Object.keys(m.retos || {}).some(id => ids.has(id) && tocado(m.retos[id])));
  if (!part.length) return { pts: 0, part: 0 };
  const suma = part.reduce((a, m) => a + Object.keys(m.retos).filter(id => ids.has(id)).reduce((b, id) => b + (m.retos[id].puntos || 0), 0), 0);
  return { pts: Math.round(suma / part.length), part: part.length };
}
function aplicar(estado, reto, respuesta, pid, ahora, ctx) {
  // estado: nodo larganoche/casas/{casa}. Devuelve {estado, resultado}
  const e = estado && typeof estado === 'object' ? estado : {};
  e.retos = e.retos || {}; e.capitulos = e.capitulos || {};
  e.puntos = e.puntos || 0; e.superados = e.superados || 0; e.escarcha = e.escarcha || 0;
  const indiv = !!(ctx && ctx.indiv) && tipoDe(reto) !== 'cuervo';
  let r;
  if (indiv) {
    e.miembros = e.miembros || {}; e.indiv = e.indiv || {}; e.hechos = e.hechos || {};
    const m = e.miembros[pid] = e.miembros[pid] || {}; m.retos = m.retos || {};
    r = m.retos[reto.id] = m.retos[reto.id] || { fallos: [] };
  } else r = e.retos[reto.id] = e.retos[reto.id] || { fallos: [] };
  r.fallos = r.fallos || [];
  const c = corregir(reto, respuesta, ctx);
  if (r.ok || r.agotado) return { estado: e, resultado: { resultado: 'hecho', ok: !!r.ok, puntos: r.puntos || 0, intentos: r.fallos.length, correcta: c.correcta, explicacion: reto.explicacion || '', por: r.por || null } };
  const intento = r.fallos.length;
  let resultado;
  if (c.ok) {
    let p = PUNTOS[Math.min(intento, PUNTOS.length - 1)], extra = 0;
    const tablaBonus = BONUS[tipoDe(reto)];
    if (tablaBonus && intento === 0 && r.abierto) { const seg = (ahora - r.abierto) / 1000; for (const [lim, pts] of tablaBonus) { if (seg <= lim) { extra = pts; break; } } }
    p += extra;
    Object.assign(r, { ok: true, puntos: p, por: pid, ts: ahora });
    if (!indiv) { e.puntos += p; e.superados += 1; } e.escarcha = Math.max(0, e.escarcha - 1); e.ultimo = ahora; e.ultimoPor = pid; if (!e.primero) e.primero = ahora;
    resultado = { resultado: 'ok', puntos: p, extra, intentos: intento + 1, correcta: c.correcta, explicacion: reto.explicacion || '' };
  } else {
    r.fallos.push(c.guardar); r.ultimoPor = pid; r.ts = ahora;
    e.escarcha = Math.min(ESCARCHA_MAX, e.escarcha + 1); e.fallos = (e.fallos || 0) + 1;
    if (r.fallos.length >= MAX_INTENTOS) {
      r.agotado = true; r.puntos = 0; if (!indiv) e.superados += 1; e.ultimo = ahora;
      resultado = { resultado: 'agotado', puntos: 0, intentos: r.fallos.length, correcta: c.correcta, explicacion: reto.explicacion || '', fallos: r.fallos };
    } else resultado = { resultado: 'fallo', puntos: 0, intentos: r.fallos.length, fallos: r.fallos };
  }
  if (indiv) {
    // el reto cuenta para los adornos del escudo la primera vez que alguien de la Casa lo termina
    if (terminado(r) && !e.hechos[reto.id]) { e.hechos[reto.id] = ahora; e.superados += 1; }
    const antes = (e.indiv[reto.capitulo] || {}).pts || 0, med = mediaCapitulo(e, reto.capitulo);
    e.indiv[reto.capitulo] = med; e.puntos += med.pts - antes;
    resultado.media = med;
  }
  // ¿Capítulo completo?
  if (terminado(r) && !e.capitulos[reto.capitulo] && capCompleto(e, reto.capitulo, !!(ctx && ctx.indiv))) { e.capitulos[reto.capitulo] = ahora; resultado.capituloCompleto = reto.capitulo; }
  resultado.casa = { puntos: e.puntos, superados: e.superados, escarcha: e.escarcha };
  return { estado: e, resultado };
}

/* ---------- Handler ---------- */
exports.handler = async (event) => {
  const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const out = (code, body) => ({ statusCode: code, headers: H, body: JSON.stringify(body) });
  try {
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, headers: { ...H, 'Cache-Control': 'public, max-age=120' }, body: JSON.stringify({ capitulos: BANCO.capitulos, retos: jugables().map(publico), puntos: PUNTOS, maxIntentos: MAX_INTENTOS }) };
    }
    if (event.httpMethod !== 'POST') return out(405, { error: 'metodo' });
    let b; try { b = JSON.parse(event.body || '{}'); } catch { return out(400, { error: 'json' }); }
    const accion = b.accion || 'responder';

    // El Maestre pide las preguntas de la sobremesa CON sus respuestas. Se identifica con su sesión de Firebase:
    // si con ese token se puede leer maestres/{uid} (las reglas solo lo permiten al propio uid), es el Maestre.
    if (accion === 'directo') {
      const tok = String(b.idToken || ''); if (!tok) return out(403, { error: 'maestre' });
      let uid = ''; try { uid = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).user_id || ''; } catch { return out(403, { error: 'maestre' }); }
      if (!uid) return out(403, { error: 'maestre' });
      const r = await fetch(dbUrl('maestres/' + uid, 'auth=' + encodeURIComponent(tok)));
      if (!r.ok || (await r.json()) === null) return out(403, { error: 'maestre', mensaje: 'Solo el Maestre puede dirigir la sobremesa.' });
      const vivos = BANCO.retos.filter(x => x.sobremesa && TIPOS_OPCIONES.includes(tipoDe(x)));
      return out(200, { retos: vivos.map(x => { const o = orden(x); return { ...publico(x), correcta: o.indexOf(x.correcta), explicacion: x.explicacion || '' }; }) });
    }
    const pid = String(b.pid || ''), codigo = String(b.codigo || ''), retoId = String(b.reto || '');
    if (!/^[\w-]{2,40}$/.test(pid) || !codigo || !retoId) return out(400, { error: 'datos' });
    const reto = jugables().find(r => r.id === retoId);
    if (!reto) return out(404, { error: 'reto' });

    // 1. Identidad: el código secreto es la llave
    const priv = await dbGet('privado/' + pid);
    if (!priv || priv.codigo !== codigo) return out(403, { error: 'codigo', mensaje: 'El cuervo no te reconoce. Vuelve a entrar con tu código.' });
    const pub = await dbGet('publico/' + pid);
    if (!pub || !pub.casa) return out(403, { error: 'registro' });
    const casa = pub.casa;

    // 2. La Casa tiene que estar completa (plazas las publica el Maestre desde su Sala)
    const plazasTodas = (await dbGet('larganoche/config/plazas')) || {};
    const plazas = plazasTodas[casa];
    if (!plazas) return out(409, { error: 'config', mensaje: 'El Maestre aún no ha abierto La Larga Noche.' });
    const todos = (await dbGet('publico')) || {};
    const miembros = Object.values(todos).filter(p => p && p.casa === casa).length;
    if (miembros < plazas) return out(409, { error: 'incompleta', faltan: plazas - miembros, mensaje: `Vuestra Casa aún no está completa. Faltan ${plazas - miembros}.` });
    const casas = Object.keys(plazasTodas).filter(k => plazasTodas[k] > 0).sort();

    // 3. El capítulo tiene que estar abierto
    const cap = await dbGet('larganoche/capitulos/' + reto.capitulo);
    if (!cap || !cap.abierto) return out(409, { error: 'cerrado', mensaje: 'El Maestre aún no ha abierto este capítulo.' });

    const ahora = Date.now();
    if (accion === 'cuervo') {
      if (tipoDe(reto) !== 'cuervo') return out(400, { error: 'tipo' });
      const otra = casaSiguiente(casas, casa);
      return out(200, { mitad: claveCuervo(reto, casa), otra, nota: 'Vuestra mitad va primero; la de la otra Casa, después.' });
    }
    const indiv = cap.modo === 'individual';
    if (accion === 'abrir') {
      const ruta = indiv && tipoDe(reto) !== 'cuervo' ? `larganoche/casas/${casa}/miembros/${pid}/retos/${reto.id}` : `larganoche/casas/${casa}/retos/${reto.id}`;
      const r = (await dbGet(ruta)) || {};
      if (!r.abierto && !r.ok && !r.agotado) await dbPatch(ruta, { abierto: ahora, fallos: r.fallos || [] });
      const memoria = tipoDe(reto) === 'memoria' ? { pregunta: reto.pregunta, opciones: orden(reto).map(i => reto.opciones[i]) } : {};
      return out(200, { abierto: r.abierto || ahora, ...memoria });
    }
    if (accion !== 'responder') return out(400, { error: 'accion' });
    const respuesta = b.respuesta !== undefined ? b.respuesta : b.opcion;
    if (!respuestaValida(reto, respuesta)) return out(400, { error: 'respuesta' });

    // 4. Corregir y guardar (con ETag: si dos de la misma Casa escriben a la vez, el segundo vuelve a leer y reintenta)
    let res = null;
    for (let i = 0; i < 8; i++) {
      const { v, etag } = await dbGet('larganoche/casas/' + casa, true);
      const { estado, resultado } = aplicar(v, reto, respuesta, pid, ahora, { casa, casas, indiv });
      if (resultado.resultado === 'hecho') { res = resultado; break; }
      if (await dbPut('larganoche/casas/' + casa, estado, etag)) { res = resultado; break; }
    }
    if (!res) return out(503, { error: 'ocupado', mensaje: 'Los cuervos se han cruzado. Inténtalo otra vez.' });

    // 5. Apuntes secundarios: persona y estadísticas del reto
    if (res.resultado !== 'hecho') {
      const per = (await dbGet('larganoche/personas/' + pid)) || {};
      await dbPatch('larganoche/personas/' + pid, { nombre: pub.nombre || '', casa, aciertos: (per.aciertos || 0) + (res.resultado === 'ok' ? 1 : 0), fallos: (per.fallos || 0) + (res.resultado === 'ok' ? 0 : 1), puntos: (per.puntos || 0) + (res.puntos || 0), ultimo: ahora, ultimoReto: reto.id });
      const st = (await dbGet('larganoche/retos/' + reto.id)) || {};
      await dbPatch('larganoche/retos/' + reto.id, { ok: (st.ok || 0) + (res.resultado === 'ok' ? 1 : 0), fallos: (st.fallos || 0) + (res.resultado === 'ok' ? 0 : 1), agotados: (st.agotados || 0) + (res.resultado === 'agotado' ? 1 : 0) });
    }
    return out(200, res);
  } catch (e) {
    console.error(e);
    return out(500, { error: 'servidor', mensaje: 'El Maestre no responde: ' + (e.message || e) });
  }
};
