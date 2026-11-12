// Lee una página de producto y devuelve solo lo que encuentra de verdad:
// título, descripción, imagen, precio, moneda y tienda. Nunca inventa nada.
// Uso: /.netlify/functions/ficha?url=https://tienda.com/producto

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const q = event.queryStringParameters || {};
  // Modo imagen: descarga una foto de una tienda y la sirve como nuestra (las tiendas bloquean el uso directo).
  if (q.img) {
    let u; try { u = new URL(q.img); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return { statusCode: 400, body: 'url' }; }
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(u.href, { headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*', 'Referer': u.origin + '/' }, redirect: 'follow', signal: ctrl.signal });
      clearTimeout(t);
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.startsWith('image/')) return { statusCode: 404, body: 'no image' };
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 6_000_000) return { statusCode: 413, body: 'too big' };
      return { statusCode: 200, headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' }, body: buf.toString('base64'), isBase64Encoded: true };
    } catch (e) { return { statusCode: 502, body: 'fetch failed' }; }
  }
  const raw = q.url || '';
  let url;
  try { url = new URL(raw); if (!/^https?:$/.test(url.protocol)) throw 0; }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'url' }) }; }

  const out = { ok: false, url: url.href, tienda: url.hostname.replace(/^www\./, '') };
  // Amazon: la foto se puede sacar por el código ASIN aunque la página no responda.
  const asin = /amazon\./.test(url.hostname) && (url.pathname.match(/\/dp\/([A-Z0-9]{10})/) || url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/) || [])[1];
  if (asin) { out.img = `https://ws-eu.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL250_&ID=AsinImage&MarketPlace=ES&ServiceVersion=20070822&WS=1`; out.url = `https://${url.hostname}/dp/${asin}`; }

  let html = '';
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url.href, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9', 'Accept': 'text/html,*/*' }, redirect: 'follow', signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) html = (await r.text()).slice(0, 1_500_000);
  } catch (e) { /* sin página: devolvemos lo poco que tengamos (p. ej. la foto por ASIN) */ }

  if (html) {
    const dec = s => s && s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&(aacute|eacute|iacute|oacute|uacute|ntilde|Aacute|Eacute|Iacute|Oacute|Uacute|Ntilde|uuml|ccedil|euro);/g, (_, n) => ({aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',ntilde:'ñ',Aacute:'Á',Eacute:'É',Iacute:'Í',Oacute:'Ó',Uacute:'Ú',Ntilde:'Ñ',uuml:'ü',ccedil:'ç',euro:'€'})[n]).replace(/\s+/g, ' ').trim();
    const meta = (...names) => { for (const n of names) { const m = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']+)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, 'i')); if (m) return dec(m[1]); } return ''; };
    // JSON-LD de producto (lo más fiable cuando existe)
    let ld = null;
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try { const j = JSON.parse(m[1]); const arr = [].concat(j, j['@graph'] || []); const p = arr.find(x => x && /Product/i.test(String(x['@type']))); if (p) { ld = p; break; } } catch {}
    }
    const offer = ld && [].concat(ld.offers || [])[0];
    const titulo = (ld && ld.name) || meta('og:title', 'twitter:title') || (/amazon\./.test(url.hostname) && dec((html.match(/id="productTitle"[^>]*>([^<]+)</) || [])[1])) || dec((html.match(/<title[^>]*>([^<]+)</i) || [])[1]);
    let desc = (ld && typeof ld.description === 'string' && ld.description) || meta('og:description', 'description', 'twitter:description');
    if (desc && titulo && desc.replace(/\s+/g,' ').startsWith(String(titulo).replace(/\s+/g,' ').slice(0, 40))) desc = '';
    const img = (ld && [].concat(ld.image || [])[0] && ([].concat(ld.image)[0].url || [].concat(ld.image)[0])) || meta('og:image', 'twitter:image') || (/amazon\./.test(url.hostname) && (html.match(/"hiRes":"(https:[^"]+)"/) || html.match(/id="landingImage"[^>]+src="([^"]+)"/) || [])[1]);
    let precio = (offer && (offer.price || (offer.priceSpecification && offer.priceSpecification.price))) || meta('product:price:amount', 'og:price:amount', 'price') || (/amazon\./.test(url.hostname) && dec((html.match(/class="a-price[^"]*"[^>]*>[\s\S]*?class="a-offscreen">([^<]+)</) || [])[1]));
    let moneda = (offer && (offer.priceCurrency || (offer.priceSpecification && offer.priceSpecification.priceCurrency))) || meta('product:price:currency', 'og:price:currency');
    if (precio && typeof precio === 'string' && /[€$£]/.test(precio)) { moneda = moneda || (precio.includes('€') ? 'EUR' : precio.includes('£') ? 'GBP' : 'USD'); precio = precio.replace(/[^\d.,]/g, ''); }
    const tienda = meta('og:site_name') || out.tienda;
    if (titulo && !/robot|captcha|sorry/i.test(titulo)) out.titulo = titulo.slice(0, 120);
    if (desc) out.desc = desc.slice(0, 300);
    if (img && typeof img === 'string' && /^https?:/.test(img)) out.img = img;
    if (precio) {
      const n = String(precio).trim().replace(/^(\d+)\.(\d{1,2})$/, '$1,$2');   // 29.90 → 29,90
      if (/^\d/.test(n)) {
        if (!moneda && url.hostname.endsWith('.es')) moneda = 'EUR';   // tienda española sin moneda declarada
        out.precio = n + (moneda === 'EUR' ? ' €' : moneda === 'GBP' ? ' £' : moneda === 'USD' ? ' $' : moneda ? ' ' + moneda : '');
      }
    }
    if (tienda) out.tienda = String(tienda).slice(0, 40);
  }
  out.ok = !!(out.titulo || out.img);
  return { statusCode: 200, headers, body: JSON.stringify(out) };
};
