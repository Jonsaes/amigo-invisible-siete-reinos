# Los tipos «Adivina la cifra» (numero) y «Toca en la foto» (zona) en el móvil, en modo local.
# El reto de zona se mete solo en esta prueba (se intercepta retos.json): el banco real no lo lleva.
import json, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
bank=json.load(open(os.path.join(HERE,'..','netlify','functions','retos.json'),encoding='utf-8'))
bank['retos'].insert(0,{'id':'memoria-prueba','capitulo':'cifras','tipo':'memoria','dificultad':'caballero','imagen':'retos/viaje-07.jpg','pregunta':'¿Cuántos puentes llegaban al castillo?','opciones':['4 puentes','2 puentes','3 puentes','5 puentes'],'correcta':0,'explicacion':'Dos a cada lado.'})
bank['retos'].insert(0,{'id':'antorcha-prueba','capitulo':'cifras','tipo':'antorcha','dificultad':'caballero','pregunta':'Es de noche: encuentra la caravana de salvajes.','imagen':'retos/antorcha-mamuts.jpg','punto':[76.3,44.7],'radio':6.5,'explicacion':'Tormund y los suyos.'})
bank['retos'].insert(0,{'id':'zona-prueba','capitulo':'cifras','tipo':'zona','dificultad':'escudero','pregunta':'Toca la cabeza del león.','imagen':'escudos/lannister.png','punto':[50,40],'radio':10,'explicacion':'Ahí ruge.'})
P={}; plazas={'stark':2,'lannister':4,'targaryen':6,'baratheon':3,'tyrell':2}; n=0
for c,k in plazas.items():
    for i in range(k):
        n+=1; P[f'p{n}']={'nombre':f'{c.title()} {i+1}','nombreNorm':f'{c} {i+1}','casa':c,'ts':1760000000000}
base={'publico':P,'privado':{k:{'codigo':'X-'+k,'uid':'local'} for k in P},'codigos':{'X-'+k:k for k in P},'deseos':{},'lotengo':{},'asignaciones':{},'estado':{'fase':'abierto'},'contador':plazas,'config':{'claveMaestre':'maestre'},
      'larganoche':{'config':{'plazas':plazas},'capitulos':{c['id']:{'abierto':True,'ts':1760000000000,'nombre':c['nombre'],'gema':c['gema']} for c in bank['capitulos']}}}
errors=[]
def shot(pg,n): pg.screenshot(path=f'{OUT}/{n}.png'); print('📸',n)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    ctx.add_init_script(f"if(!localStorage.getItem('poniente_2026')) localStorage.setItem('poniente_2026', {json.dumps(json.dumps(base))});")
    ctx.route('**/netlify/functions/retos.json', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(bank)))
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("localStorage.setItem('poniente_pid_2026','p1')"); pg.goto('about:blank'); pg.goto(URL+'#/camara'); pg.wait_for_timeout(300); pg.click('#gStart'); pg.wait_for_timeout(600)
    pg.click('.tabs button[data-tab="noche"]'); pg.wait_for_timeout(600)
    pg.click('.cap[data-cap="cifras"]'); pg.wait_for_timeout(400); shot(pg,'60_cifras_capitulo')
    def abrir(rid): pg.click(f'.rl[data-reto="{rid}"]'); pg.wait_for_timeout(500)
    def volver(): pg.click('#nUp'); pg.wait_for_timeout(400)
    def cerrar_fx():
        if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    # --- numero: barra, − y +, pista más/menos, acierto
    abrir('cifras-04'); shot(pg,'61_numero')
    assert pg.locator('#nVal').inner_text()=='2010', pg.locator('#nVal').inner_text()
    pg.click('#nMas'); pg.click('#nMas'); assert pg.locator('#nVal').inner_text()=='2012'
    pg.click('#rConfirm'); pg.wait_for_timeout(1200); shot(pg,'62_numero_fallo')
    assert 'MENOS' in pg.locator('#rres').inner_text(), pg.locator('#rres').inner_text()
    assert pg.locator('.npista').count()==1
    pg.evaluate("(()=>{const r=document.querySelector('#nRange'); r.value=2011; r.dispatchEvent(new Event('input'));})()")
    assert pg.locator('#nVal').inner_text()=='2011'
    pg.click('#rConfirm'); pg.wait_for_timeout(1200); cerrar_fx(); shot(pg,'63_numero_ok')
    assert 'Correcto' in pg.locator('#rres').inner_text()
    volver()
    abrir('cifras-06'); assert pg.locator('#nVal').inner_text()=='10.500', pg.locator('#nVal').inner_text()
    for _ in range(5): pg.click('#nMenos')
    assert pg.locator('#nVal').inner_text()=='8000'; shot(pg,'64_numero_miles'); volver()
    # --- zona: tocar, arrastrar, confirmar
    pg.set_viewport_size({'width':390,'height':1500}); abrir('zona-prueba'); pg.wait_for_timeout(500); pg.evaluate("document.querySelector('#rzona').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200); shot(pg,'65_zona')
    def pt(x,y):
        c=pg.locator('#rzona').bounding_box(); return (c['x']+c['width']*x/100, c['y']+c['height']*y/100)
    pg.mouse.click(*pt(15,85)); pg.wait_for_timeout(200)
    assert pg.evaluate("getComputedStyle(document.querySelector('#zPin')).display")!='none', 'la ✖ se ve'
    pg.click('#rConfirm'); pg.wait_for_timeout(1200); shot(pg,'66_zona_fallo')
    assert pg.locator('#rzona .zx.ko').count()==1
    pg.mouse.click(*pt(80,80)); pg.wait_for_timeout(200)
    a,bp=pt(80,80),pt(52,42); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(*bp, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    left=pg.evaluate("document.querySelector('#zPin').style.left"); assert left.startswith('52') or left.startswith('51') or left.startswith('53'), left
    shot(pg,'67_zona_arrastrada')
    pg.click('#rConfirm'); pg.wait_for_timeout(1200); cerrar_fx(); shot(pg,'68_zona_ok')
    assert 'Correcto' in pg.locator('#rres').inner_text()
    # --- antorcha: a oscuras, mover la luz, fallo, acierto y «amanece»
    volver(); abrir('antorcha-prueba'); pg.wait_for_timeout(600)
    pg.evaluate("document.querySelector('#rzona').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    assert pg.locator('#rzona.antorcha .noche').count()==1, 'empieza a oscuras'
    pg.mouse.move(*pt(20,60)); pg.mouse.down(); pg.mouse.move(*pt(45,55),steps=6); pg.mouse.up(); pg.wait_for_timeout(200); shot(pg,'69_antorcha_buscando')
    assert not pg.locator('#rConfirm').is_disabled()
    pg.click('#rConfirm'); pg.wait_for_timeout(1300)
    assert pg.locator('#rzona .zx.ko').count()==1 and pg.locator('#rzona .noche').count()==1, 'tras fallar sigue a oscuras'
    pg.evaluate("document.querySelector('#rzona').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    pg.mouse.move(*pt(70,50)); pg.mouse.down(); pg.mouse.move(*pt(76,45),steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    pg.click('#rConfirm'); pg.wait_for_timeout(1300); cerrar_fx(); shot(pg,'69b_antorcha_ok')
    assert 'Correcto' in pg.locator('#rres').inner_text() and pg.locator('#rzona .noche').count()==0, 'amanece al acertar'
    # --- mapa con foto (capítulo «Viaje por Poniente»): la foto arriba, el mapa sin nombres debajo; fallo y acierto
    pg.set_viewport_size({'width':390,'height':844}); volver(); pg.click('#nBack'); pg.wait_for_timeout(400)
    pg.click('.cap[data-cap="viaje"]'); pg.wait_for_timeout(400); shot(pg,'70_viaje_capitulo')
    abrir('viaje-05'); pg.wait_for_timeout(500)
    assert pg.locator('#rcard img.ri.lugar').count()==1 and pg.locator('#rmap svg').count()==1, 'foto y mapa'
    assert pg.evaluate("document.querySelector('#rcard img.ri.lugar').naturalWidth")>0, 'la foto carga'
    assert pg.evaluate("document.querySelector('#rcard img.ri.lugar').compareDocumentPosition(document.querySelector('#rmap')) & 4"), 'la foto va encima del mapa'
    shot(pg,'71_viaje_mapa_foto')
    def mp(x,y):  # punto del mapa (0-300 × 0-500) → píxeles de pantalla
        return pg.evaluate(f"(()=>{{const s=document.querySelector('#rmap svg'); const p=s.createSVGPoint(); p.x={x}; p.y={y}; const q=p.matrixTransform(s.getScreenCTM()); return [q.x,q.y];}})()")
    pg.evaluate("document.querySelector('#rmap').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    pg.mouse.click(*mp(177,366)); pg.wait_for_timeout(200); pg.click('#rConfirm'); pg.wait_for_timeout(1200); shot(pg,'72_viaje_fallo')
    assert 'Correcto' not in pg.locator('#rres').inner_text()
    pg.evaluate("document.querySelector('#rmap').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    pg.mouse.click(*mp(52,298)); pg.wait_for_timeout(200); pg.click('#rConfirm'); pg.wait_for_timeout(1300); cerrar_fx(); shot(pg,'73_viaje_ok')
    assert 'Correcto' in pg.locator('#rres').inner_text()
    # un mapa sin foto sigue igual
    pg.click('#nBack'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    pg.click('.cap[data-cap="norte"]'); pg.wait_for_timeout(300); abrir('mapa-01')
    assert pg.locator('#rcard img.ri').count()==0 and pg.locator('#rmap svg').count()==1, 'mapa sin foto'
    # captura de control: las zonas de los 10 retos del Viaje sobre el mapa con nombres
    zonas=[r for r in bank['retos'] if r.get('capitulo')=='viaje' and r['tipo']=='mapa']
    marks=''.join(f"<g transform=\"translate({r['punto'][0]},{r['punto'][1]})\"><circle r=\"{r['radio']}\" fill=\"#f1d27a33\" stroke=\"#f1d27a\" stroke-width=\"1\"/><text font-size=\"9\" fill=\"#fff\" text-anchor=\"middle\" y=\"3\">{r['id'][-2:]}</text></g>" for r in zonas)
    pg.evaluate("m=>{const s=document.querySelector('#rmap svg'); const g=document.createElementNS('http://www.w3.org/2000/svg','g'); s.appendChild(g); g.innerHTML=m;}", marks); pg.wait_for_timeout(300)
    pg.locator('#rmap').screenshot(path=f'{OUT}/74_viaje_zonas.png'); print('📸 74_viaje_zonas')
    # --- memoria del cuervo: la pregunta no se ve antes; 8 s de escena; recargar no deja volver a mirar
    pg.click('#nBack'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    pg.click('.cap[data-cap="cifras"]'); pg.wait_for_timeout(400)
    assert 'puentes' not in pg.locator('#tabNoche').inner_text(), 'la lista no chiva la pregunta'
    abrir('memoria-prueba'); pg.wait_for_timeout(400)
    assert 'puentes' not in pg.locator('#rcard').inner_text() and pg.locator('#memListo').count()==1
    shot(pg,'75_memoria_antes'); pg.click('#memListo'); pg.wait_for_timeout(1500); shot(pg,'76_memoria_mirando')
    assert pg.locator('#mem.velo').count()==0, 'se ve la escena'
    pg.wait_for_timeout(8200); shot(pg,'77_memoria_pregunta')
    assert 'puentes' in pg.locator('#rcard .q').inner_text() and pg.locator('#rcard .opt').count()==4
    pg.reload(); pg.wait_for_timeout(500)
    if pg.locator('#gStart').is_visible(): pg.click('#gStart'); pg.wait_for_timeout(400)
    pg.click('.tabs button[data-tab="noche"]'); pg.wait_for_timeout(500); pg.click('.cap[data-cap="cifras"]'); pg.wait_for_timeout(300); abrir('memoria-prueba'); pg.wait_for_timeout(900)
    assert pg.locator('#memListo').count()==0 and 'puentes' in pg.locator('#rcard .q').inner_text(), 'tras recargar, directamente a la pregunta'
    txt=[pg.locator('#rcard .opt').nth(i).inner_text() for i in range(4)]
    pg.locator('#rcard .opt').nth([i for i,t in enumerate(txt) if '2 puentes' in t][0]).click(); pg.click('#rConfirm'); pg.wait_for_timeout(1300)
    pg.locator('#rcard .opt').nth([i for i,t in enumerate(txt) if '4 puentes' in t][0]).click(); pg.click('#rConfirm'); pg.wait_for_timeout(1300); cerrar_fx(); shot(pg,'78_memoria_ok')
    assert 'Correcto' in pg.locator('#rres').inner_text() and pg.locator('#rcard img.ri').count()==1, 'al acertar vuelve la escena'
    print('errores', [e for e in errors if 'localStorage' not in e])
    assert not [e for e in errors if 'localStorage' not in e]
    print('TODO OK')
