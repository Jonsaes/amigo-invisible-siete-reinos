import os, time
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
errors=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':720})
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL+'#/demo-tv'); pg.wait_for_timeout(400)
    if pg.locator('#gStart').is_visible(): pg.click('#gStart')
    t0=time.time()
    for at in [4,7.5,13,24,34,40,47,56,64,69,77.5,86]:
        while time.time()-t0<at: pg.wait_for_timeout(100)
        pg.screenshot(path=f'{OUT}/intro_{at}.png'); print('📸',at, pg.evaluate("document.querySelector('#tv').className"))
    b.close()
print('ERRORES:', [e for e in errors if 'localStorage' not in e])
