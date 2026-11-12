import json, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); URL='http://localhost:8765/index.html'; OUT=HERE+'/capturas'
errors=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL+'#/demo'); pg.wait_for_timeout(300); pg.click('#gStart'); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+'/30_demo.png', full_page=True)
    pg.click('#map .mark[data-id="stark"]', force=True); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'/31_demo_ficha.png')
    b.close()
print('errores', errors)
