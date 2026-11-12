# Capítulos individuales en el móvil: el Maestre abre «Cifras» (queda individual) y uno ya abierto sigue en grupo;
# Stark 1 acierta un reto y Stark 2 lo sigue teniendo pendiente con sus propios intentos; se ve la media de la Casa.
import json, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
bank=json.load(open(os.path.join(HERE,'..','netlify','functions','retos.json'),encoding='utf-8'))
P={}; plazas={'stark':2,'lannister':4,'targaryen':6,'baratheon':3,'tyrell':2}; n=0
for c,k in plazas.items():
    for i in range(k):
        n+=1; P[f'p{n}']={'nombre':f'{c.title()} {i+1}','nombreNorm':f'{c} {i+1}','casa':c,'ts':1760000000000}
# «casas» ya se abrió en grupo (sin modo); «cifras» está sin abrir
base={'publico':P,'privado':{k:{'codigo':'X-'+k,'uid':'local'} for k in P},'codigos':{'X-'+k:k for k in P},'deseos':{},'lotengo':{},'asignaciones':{},'estado':{'fase':'abierto'},'contador':plazas,'config':{'claveMaestre':'maestre'},
      'larganoche':{'config':{'plazas':plazas},'capitulos':{'casas':{'abierto':True,'ts':1760000000000,'nombre':'Las Casas','gema':'#e0b13c'}}}}
errors=[]
def shot(pg,n,full=False): pg.screenshot(path=f'{OUT}/{n}.png', full_page=full); print('📸',n)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    ctx.add_init_script(f"if(!localStorage.getItem('poniente_2026')) localStorage.setItem('poniente_2026', {json.dumps(json.dumps(base))});")
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(200)
    def ir(h):
        pg.goto('about:blank'); pg.goto(URL+h); pg.wait_for_timeout(400)
        if pg.locator('#gStart').is_visible(): pg.click('#gStart'); pg.wait_for_timeout(500)
    ln=lambda: json.loads(pg.evaluate("localStorage.getItem('poniente_2026')"))['larganoche']
    # --- Maestre: abre «Cifras» y cierra/reabre «Las Casas»
    ir('#/maestre')
    if pg.locator('#mKey').is_visible(): pg.fill('#mKey','maestre'); pg.click('#mGo'); pg.wait_for_timeout(900)
    pg.click('#mCaps [data-cap="cifras"]'); pg.wait_for_timeout(600)
    assert ln()['capitulos']['cifras'].get('modo')=='individual', ln()['capitulos']['cifras']
    raven=pg.locator('#mCapRavenTxt').inner_text(); assert 'cada uno a su ritmo' in raven, raven
    pg.click('#mCaps [data-cap="casas"]'); pg.wait_for_timeout(400)
    if pg.locator('#modal.show').count(): pg.locator('#mdBtns button').first.click(); pg.wait_for_timeout(400)
    pg.click('#mCaps [data-cap="casas"]'); pg.wait_for_timeout(600)
    assert ln()['capitulos']['casas']['abierto'] and 'modo' not in ln()['capitulos']['casas'], 'un capítulo ya jugado en grupo sigue en grupo'
    pg.locator('#mCaps').scroll_into_view_if_needed(); shot(pg,'70_maestre_modos')
    def entrar(pid):
        pg.evaluate(f"localStorage.setItem('poniente_pid_2026','{pid}')"); ir('#/camara')
        pg.click('.tabs button[data-tab="noche"]'); pg.wait_for_timeout(600)
    def cerrar_fx():
        while pg.locator('#fx.show').count(): pg.click('#fx'); pg.wait_for_timeout(300)
    # --- Stark 1 acierta cifras-01 (3 puntos)
    entrar('p1'); shot(pg,'71_capitulos_indiv', full=True)
    pg.click('.cap[data-cap="cifras"]'); pg.wait_for_timeout(400)
    pg.click('.rl[data-reto="cifras-01"]'); pg.wait_for_timeout(500)
    pg.evaluate("(()=>{const r=document.querySelector('#nRange'); r.value=3; r.dispatchEvent(new Event('input'));})()")
    pg.click('#rConfirm'); pg.wait_for_timeout(1300); cerrar_fx(); shot(pg,'72_indiv_ok')
    assert 'Media de tu Casa' in pg.locator('#rres').inner_text()
    # --- Stark 2: el mismo reto sigue pendiente para él
    entrar('p2'); pg.click('.cap[data-cap="cifras"]'); pg.wait_for_timeout(400); shot(pg,'73_indiv_otro', full=True)
    txt=pg.locator('#tabNoche').inner_text()
    assert 'TU PROGRESO: 0 DE' in txt, txt[:300]
    assert '1 participa' in txt, 'se ve la media de la Casa'
    pg.click('.rl[data-reto="cifras-01"]'); pg.wait_for_timeout(500)
    assert pg.locator('#nRange').count()==1, 'Stark 2 puede jugar el reto'
    assert 'INTENTO 1' in pg.locator('#rcard').inner_text()
    pg.evaluate("(()=>{const r=document.querySelector('#nRange'); r.value=5; r.dispatchEvent(new Event('input'));})()")
    pg.click('#rConfirm'); pg.wait_for_timeout(1300); cerrar_fx()
    st=ln()['casas']['stark']; print('stark', st['puntos'], st['indiv'])
    assert st['indiv']['cifras']=={'pts':2,'part':2} and st['puntos']==2, st
    # --- un reto del capítulo en grupo sigue siendo de la Casa
    pg.click('#nUp'); pg.wait_for_timeout(300); pg.click('#nBack'); pg.wait_for_timeout(300)
    pg.click('.cap[data-cap="casas"]'); pg.wait_for_timeout(400)
    assert 'TU PROGRESO' not in pg.locator('#tabNoche').inner_text()
    print('errores', [e for e in errors if 'localStorage' not in e]); assert not [e for e in errors if 'localStorage' not in e]
    print('TODO OK')
