import json, os, time
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
bank=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','netlify','functions','retos.json'),encoding='utf-8'))
R={r['id']:r for r in bank['retos']}
P={}; plazas={'stark':3,'lannister':4,'targaryen':6,'baratheon':4,'tyrell':2}; n=0
for c,k in plazas.items():
    for i in range(k):
        n+=1; pid=f'p{n}'; P[pid]={'nombre':f'{c.title()} {i+1}','nombreNorm':f'{c} {i+1}','casa':c,'ts':1760000000000}
base={'publico':P,'privado':{k:{'codigo':'X-'+k,'uid':'local'} for k in P},'codigos':{'X-'+k:k for k in P},'deseos':{},'lotengo':{},'asignaciones':{},'estado':{'fase':'abierto'},'contador':plazas,'config':{'claveMaestre':'maestre'},
      'larganoche':{'config':{'plazas':plazas},'capitulos':{c['id']:{'abierto':True,'ts':1760000000000,'nombre':c['nombre'],'gema':c['gema']} for c in bank['capitulos']}}}
errors=[]
def shot(pg,n,full=False): pg.screenshot(path=f'{OUT}/{n}.png', full_page=full); print('📸',n)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    ctx.add_init_script(f"if(!localStorage.getItem('poniente_2026')) localStorage.setItem('poniente_2026', {json.dumps(json.dumps(base))});")
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(200)
    def entrar(pid):
        pg.evaluate(f"localStorage.setItem('poniente_pid_2026','{pid}')"); pg.goto('about:blank'); pg.goto(URL+'#/camara'); pg.wait_for_timeout(300); pg.click('#gStart'); pg.wait_for_timeout(600)
        pg.click('.tabs button[data-tab="noche"]'); pg.wait_for_timeout(600)
    def abrir(cap, rid):
        pg.click(f'.cap[data-cap="{cap}"]'); pg.wait_for_timeout(400)
        try: pg.click(f'.rl[data-reto="{rid}"]', timeout=8000)
        except Exception as e: shot(pg,'ERR_'+rid, full=True); print('DOM:', pg.evaluate("document.querySelector('#tabNoche').innerText.slice(0,200)")); raise
        pg.wait_for_timeout(500)
    def opcion_txt(t):
        opts=pg.locator('#rcard .opt'); texts=[opts.nth(i).inner_text() for i in range(opts.count())]
        return [i for i,x in enumerate(texts) if t in x][0]
    entrar('p1')   # Stark 1
    # 1. emojis
    abrir('batallas','emojis-01'); shot(pg,'40_emojis'); assert pg.locator('#rConfirm').is_disabled(), 'sin elegir no se puede confirmar'
    pg.locator('#rcard .opt').nth(0).click(); pg.wait_for_timeout(300)
    assert pg.locator('#rcard .opt.sel').count()==1 and pg.locator('#rres').inner_text().strip()=='', 'tocar una opción solo la marca, no valida'
    pg.locator('#rcard .opt').nth(opcion_txt('Boda Roja')).click(); pg.wait_for_timeout(300); shot(pg,'40b_emojis_marcada')
    assert pg.locator('#rcard .opt.sel').count()==1 and 'Boda Roja' in pg.locator('#rcard .opt.sel').inner_text(), 'la marca cambia a la nueva opción'
    pg.click('#rConfirm'); pg.wait_for_timeout(1500)
    if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    shot(pg,'41_emojis_ok'); pg.click('#nUp'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    # 2. mapa: fallo lejos, luego acierto en Invernalia
    abrir('norte','mapa-01'); shot(pg,'42_mapa')
    def click_mapa(x,y):
        pg.locator('#rmap svg').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        p=pg.evaluate(f"(()=>{{const svg=document.querySelector('#rmap svg'); const pt=svg.createSVGPoint(); pt.x={x}; pt.y={y}; const q=pt.matrixTransform(svg.getScreenCTM()); return [q.x,q.y];}})()")
        pg.mouse.click(p[0],p[1]); pg.wait_for_timeout(300)
    assert pg.evaluate("getComputedStyle(document.querySelector('#rmap svg path[d^=\"M150.7\"]')).fill")!='none', 'la tierra del mapa se pinta'
    click_mapa(200,400); assert pg.evaluate("getComputedStyle(document.querySelector('#mPin')).display")!='none', 'la ✖ se ve al tocar'
    # arrastrar la ✖ de (200,400) a (210,380)
    a0=pg.evaluate("(()=>{const svg=document.querySelector('#rmap svg'); const f=(x,y)=>{const pt=svg.createSVGPoint(); pt.x=x; pt.y=y; const q=pt.matrixTransform(svg.getScreenCTM()); return [q.x,q.y];}; return [f(200,400),f(210,380)];})()")
    pg.mouse.move(*a0[0]); pg.mouse.down(); pg.mouse.move(*a0[1], steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
    tr=pg.evaluate("document.querySelector('#mPin').getAttribute('transform')"); assert '210' in tr and '380' in tr, 'la ✖ se arrastra: '+tr
    shot(pg,'43_mapa_pin'); pg.click('#rConfirm'); pg.wait_for_timeout(1500); shot(pg,'44_mapa_fallo')
    pg.wait_for_timeout(300); click_mapa(136,158); pg.click('#rConfirm'); pg.wait_for_timeout(1500)
    if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    shot(pg,'45_mapa_ok'); pg.click('#nUp'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    # 3. ordena: confirmar tal cual (probable fallo), luego ordenar bien con flechas
    abrir('batallas','ordena-01'); shot(pg,'46_ordena')
    deseado=R['ordena-01']['items']
    def textos(): return [t.strip() for t in pg.locator('#ord .oi .t').all_inner_texts()]
    if textos()!=deseado:
        pg.click('#rConfirm'); pg.wait_for_timeout(1500); shot(pg,'47_ordena_fallo')
    for _ in range(20):
        cur=textos()
        if cur==deseado: break
        pos=[i for i,(a,b2) in enumerate(zip(cur,deseado)) if a!=b2][0]
        src=cur.index(deseado[pos]); pg.click(f'#ord [data-up="{src}"]'); pg.wait_for_timeout(250)
    pg.click('#rConfirm'); pg.wait_for_timeout(1500)
    if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    shot(pg,'48_ordena_ok'); pg.click('#nUp'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    # 4. empareja
    abrir('actores','empareja-01')
    pares=dict(R['empareja-01']['parejas'])
    izq=[t.strip() for t in pg.locator('#rcard [data-l]').all_inner_texts()]; der=[t.strip() for t in pg.locator('#rcard [data-r]').all_inner_texts()]
    for i,l in enumerate(izq):
        lname=l[1:].strip() if l[0].isdigit() else l
        pg.click(f'#rcard [data-l="{i}"]'); pg.wait_for_timeout(150)
        j=[k for k,d in enumerate(der) if pares[lname] in d][0]; pg.click(f'#rcard [data-r="{j}"]'); pg.wait_for_timeout(200)
        der=[t.strip() for t in pg.locator('#rcard [data-r]').all_inner_texts()]
    shot(pg,'49_empareja'); pg.click('#rConfirm'); pg.wait_for_timeout(1500)
    if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    shot(pg,'50_empareja_ok'); pg.click('#nUp'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    # 5. foto desenfocada: acierto rápido → +2
    abrir('rodaje','foto-01'); pg.wait_for_timeout(1500); shot(pg,'51_foto'); pg.locator('#rcard .opt').nth(opcion_txt('Martell')).click(); pg.click('#rConfirm'); pg.wait_for_timeout(1500)
    if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    shot(pg,'52_foto_ok'); pg.click('#nUp'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    # 6. cuervo: leer mi mitad; luego entrar como Targaryen (siguiente de stark) para leer la suya
    abrir('casas','cuervo-01'); pg.wait_for_timeout(500); shot(pg,'54_cuervo'); mitad1=pg.inner_text('#cuervoMitad'); otra=pg.inner_text('#cuervoOtra'); print('stark mitad',mitad1,'|',otra)
    entrar('p8')  # Targaryen 1
    abrir('casas','cuervo-01'); pg.wait_for_timeout(500); mitad2=pg.inner_text('#cuervoMitad'); print('targaryen mitad',mitad2)
    entrar('p1'); abrir('casas','cuervo-01'); pg.wait_for_timeout(500)
    pg.fill('#rClave', 'ZZZZ'+mitad2); pg.click('#rConfirm'); pg.wait_for_timeout(1500); shot(pg,'55_cuervo_fallo')
    pg.fill('#rClave', mitad1+mitad2); pg.click('#rConfirm'); pg.wait_for_timeout(1500)
    if pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    shot(pg,'56_cuervo_ok')
    st=json.loads(pg.evaluate("localStorage.getItem('poniente_2026')"))['larganoche']['casas']['stark']
    print({k:v for k,v in st.items() if k!='retos'}); print({k:{kk:vv for kk,vv in v.items() if kk in('ok','puntos','agotado','fallos')} for k,v in st['retos'].items()})
    b.close()
print('errores', [e for e in errors if 'localStorage' not in e])
