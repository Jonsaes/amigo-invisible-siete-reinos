import json, os, time
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
bank=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','netlify','functions','retos.json'),encoding='utf-8'))
P={}; plazas={'stark':3,'lannister':4,'targaryen':6,'baratheon':4,'tyrell':2}; n=0
for c,k in plazas.items():
    for i in range(k):
        n+=1; pid=f'p{n}'; P[pid]={'nombre':f'{c.title()} {i+1}','nombreNorm':f'{c} {i+1}','casa':c,'ts':1760000000000}
casas={'stark':{'puntos':31,'superados':16},'lannister':{'puntos':12,'superados':7},'targaryen':{'puntos':22,'superados':11},'baratheon':{'puntos':5,'superados':3},'tyrell':{'puntos':0,'superados':0}}
base={'publico':P,'privado':{k:{'codigo':'X-'+k,'uid':'local'} for k in P},'codigos':{'X-'+k:k for k in P},'deseos':{},'lotengo':{},'asignaciones':{},'estado':{'fase':'abierto'},'contador':plazas,'config':{'claveMaestre':'maestre'},
      'larganoche':{'config':{'plazas':plazas},'capitulos':{c['id']:{'abierto':True,'ts':1760000000000,'nombre':c['nombre'],'gema':c['gema']} for c in bank['capitulos']},'casas':casas},'directo':{}}
errors=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); 
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    ctx.add_init_script(f"if(!localStorage.getItem('poniente_2026')) localStorage.setItem('poniente_2026', {json.dumps(json.dumps(base))});")
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append('CONSOLE '+m.text) if m.type=='error' else None)
    def shot(n,full=False,tv=False):
        pg.set_viewport_size({'width':1280,'height':720} if tv else {'width':390,'height':844}); pg.wait_for_timeout(250)
        pg.screenshot(path=f'{OUT}/{n}.png', full_page=full); print('📸',n)
    def ir(h):
        pg.goto('about:blank'); pg.goto(URL+h); pg.wait_for_timeout(400)
        if pg.locator('#gStart').is_visible(): pg.click('#gStart'); pg.wait_for_timeout(500)
    def maestre():
        ir('#/maestre'); 
        if pg.locator('#mKey').is_visible(): pg.fill('#mKey','maestre'); pg.click('#mGo'); pg.wait_for_timeout(900)
    def dclick(name):
        pg.click(f'#dBtns [data-d="{name}"]'); pg.wait_for_timeout(700)
    def camara(pid):
        pg.evaluate(f"localStorage.setItem('poniente_pid_2026','{pid}')"); ir('#/camara')
    def estado(): return pg.evaluate("JSON.parse(localStorage.getItem('poniente_2026')).directo")
    maestre(); shot('60_maestre_off', full=True)
    dclick('preparar'); shot('61_maestre_espera')
    d=estado(); print('salida', d['salida']); assert d['estado']=='espera' and d['salida']['stark']==300 and d['salida']['tyrell']==0
    ir('#/pantalla'); shot('62_tv_espera', tv=True)
    camara('p1'); shot('63_movil_espera')
    maestre(); dclick('intro'); d=estado(); assert d['estado']=='intro'
    ir('#/pantalla'); pg.wait_for_timeout(3500); shot('63b_tv_intro', tv=True); pg.wait_for_timeout(6000); shot('63c_tv_intro', tv=True)
    camara('p1'); assert 'ventaja' in pg.locator('#liveBox').inner_text()
    maestre(); assert pg.locator('#dBtns [data-d="saltar"]').count()==1; dclick('saltar'); d=estado(); assert d['estado']=='espera'
    dclick('lanzar'); d=estado(); assert d['estado']=='pregunta' and d['i']==0; q=d['reto']; print('Q1', q['pregunta'], q['opciones'])
    ir('#/pantalla'); shot('64_tv_pregunta', tv=True)
    # stark responde (correcta), lannister responde mal, targaryen no responde
    corr=[r for r in bank['retos'] if r.get('sobremesa')][0]
    camara('p1'); shot('65_movil_pregunta')
    # cuál es la correcta mostrada: buscar texto
    opts=pg.locator('#liveBox .opt'); texts=[opts.nth(i).inner_text() for i in range(opts.count())]
    ci=[i for i,t in enumerate(texts) if corr['opciones'][corr['correcta']] in t][0]
    opts.nth(ci).click(); pg.wait_for_timeout(600); shot('66_movil_respondida')
    camara('p2'); assert pg.locator('#liveBox .opt').count()==0, 'segundo stark no debería poder responder'
    camara('p4'); opts=pg.locator('#liveBox .opt'); opts.nth((ci+1)%4).click(); pg.wait_for_timeout(500)
    ir('#/pantalla'); shot('67_tv_dos_respuestas', tv=True)
    maestre(); shot('68_maestre_pregunta'); dclick('cerrar'); d=estado(); assert d['estado']=='cerrada'; res=d['resultado']['0']; print('res', res)
    assert res['casas']['stark']['ok'] and not res['casas']['lannister']['ok'] and res['casas']['targaryen']['sin']
    assert d['puntos']['stark']>=400
    ir('#/pantalla'); shot('69_tv_cerrada', tv=True)
    camara('p1'); shot('70_movil_acierto'); camara('p4'); shot('71_movil_fallo')
    # avanzar hasta la apuesta
    maestre()
    nq=d['n']
    for k in range(1, nq-1):
        dclick('lanzar'); d=estado(); assert d['estado']=='pregunta' and d['i']==k, (d['estado'], d['i'], k)
        dclick('cerrar'); d=estado(); assert d['estado']=='cerrada'
    assert pg.locator('#dBtns [data-d="apuesta"]').count()==1, pg.locator('#dBtns').inner_text()
    dclick('apuesta'); d=estado(); assert d['estado']=='apuesta'
    ir('#/pantalla'); shot('72_tv_apuesta_vacia', tv=True)
    camara('p1'); shot('73_movil_apuesta'); pg.evaluate("document.querySelector('#betR').value=document.querySelector('#betR').max; document.querySelector('#betR').dispatchEvent(new Event('input'))"); pg.click('#betOk'); pg.wait_for_timeout(300); pg.click('#mdBtns button >> nth=0'); pg.wait_for_timeout(500); shot('74_movil_apostado')
    camara('p4'); pg.evaluate("document.querySelector('#betR').value=5; document.querySelector('#betR').dispatchEvent(new Event('input'))"); pg.click('#betOk'); pg.wait_for_timeout(300); pg.click('#mdBtns button >> nth=0'); pg.wait_for_timeout(500)
    d=estado(); print('apuestas', d['apuestas']); pts_stark=d['puntos']['stark']; assert d['apuestas']['stark']==pts_stark
    ir('#/pantalla'); shot('75_tv_apuesta', tv=True)
    maestre(); dclick('lanzar'); d=estado(); assert d['i']==nq-1 and d['estado']=='pregunta'
    last=[r for r in bank['retos'] if r.get('sobremesa')][nq-1]
    camara('p1'); opts=pg.locator('#liveBox .opt'); texts=[opts.nth(i).inner_text() for i in range(opts.count())]
    ci=[i for i,t in enumerate(texts) if last['opciones'][last['correcta']] in t][0]; opts.nth((ci+1)%len(texts)).click(); pg.wait_for_timeout(400)   # stark falla y pierde todo
    camara('p4'); opts=pg.locator('#liveBox .opt'); texts=[opts.nth(i).inner_text() for i in range(opts.count())]
    ci=[i for i,t in enumerate(texts) if last['opciones'][last['correcta']] in t][0]; opts.nth(ci).click(); pg.wait_for_timeout(400)   # lannister acierta
    maestre(); dclick('cerrar'); d=estado(); print('final puntos', d['puntos']); assert d['puntos']['stark']==0, d['puntos']
    assert d['resultado'][str(nq-1)]['casas']['lannister']['pts']>=105
    assert pg.locator('#dBtns [data-d="final"]').count()==1
    dclick('final'); d=estado(); assert d['estado']=='final'
    ir('#/pantalla'); pg.wait_for_timeout(4000); shot('76_tv_final', tv=True)
    camara('p4'); shot('77_movil_final'); camara('p1'); shot('78_movil_final_perdedor')
    maestre(); shot('79_maestre_final', full=True); dclick('terminar'); pg.click('#mdBtns button >> nth=0'); pg.wait_for_timeout(600); d=estado(); assert d['estado']=='off'
    camara('p1'); assert pg.locator('.tabs').is_visible(), 'la cámara debe volver a la normalidad'
    # demos
    ir('#/demo-tv'); pg.wait_for_timeout(800); shot('80_demo_tv_espera', tv=True); pg.wait_for_timeout(7000); shot('81_demo_tv_pregunta', tv=True); pg.wait_for_timeout(7000); shot('82_demo_tv_cerrada', tv=True); pg.wait_for_timeout(7000); shot('83_demo_tv_apuesta', tv=True); pg.wait_for_timeout(21000); shot('84_demo_tv_final', tv=True)
    ir('#/demo-movil'); pg.wait_for_timeout(800); shot('85_demo_movil_espera'); pg.wait_for_timeout(7000); shot('86_demo_movil_pregunta'); pg.wait_for_timeout(7000); shot('87_demo_movil_cerrada'); pg.wait_for_timeout(7000); shot('88_demo_movil_apuesta')
    ir('#/demo-retos'); pg.wait_for_timeout(2500); shot('89_demo_retos', full=True)
    # salir de la demo
    pg.click('#demoOut'); pg.wait_for_timeout(1200); assert 'maestre' in pg.url
    b.close()
print('ERRORES:', errors)
