import json, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
errors=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL+'#/demo-tv'); pg.wait_for_timeout(400)
    if pg.locator('#gStart').is_visible(): pg.click('#gStart')
    # pasos: espera(7) p0(9) c0(7) p1(9) c1(7) p2(9) c2(7) p3(9) c3(7) apuesta(7) p4(9) c4(7) final(12)
    plan=[('espera',7),('p0',9),('c0',7),('p1',9),('c1',7),('p2',9),('c2',7),('p3',9),('c3',7),('apuesta',7),('p4',9),('c4',7),('final',12)]
    for name,dur in plan:
        pg.wait_for_timeout(dur*1000-5000 if name!='espera' else 1500); pg.screenshot(path=f'{OUT}/dtv_{name}.png'); print('📸',name)
        pg.wait_for_timeout(5000 if name!='espera' else 5500)
    b.close()
print('ERRORES:', [e for e in errors if 'localStorage' not in e])
