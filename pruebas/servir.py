# Prepara y sirve la web en modo local (sin Firebase) para probarla con Playwright.
#   python3 pruebas/servir.py            → crea pruebas/_serve/ y arranca http://localhost:8765/index.html
# Lo que hace: copia index.html con FIREBASE_CONFIG = null, incrusta las fuentes (para que las capturas
# salgan bien sin internet) y enlaza las carpetas netlify/, img/, retos/ y unos escudos de prueba.
import re, os, sys, shutil, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); RAIZ=os.path.dirname(HERE); S=os.path.join(HERE,'_serve')
os.makedirs(S, exist_ok=True)
def enlaza(origen, destino):
    # en Windows los enlaces simbólicos piden permisos de administrador: si falla, se usa una unión de carpeta
    try: os.symlink(origen, destino)
    except OSError:
        if os.name!='nt': raise
        subprocess.check_call(['cmd','/c','mklink','/J',destino,origen], stdout=subprocess.DEVNULL)
html=open(os.path.join(RAIZ,'index.html'),encoding='utf-8').read()
html=re.sub(r'const FIREBASE_CONFIG = \{[\s\S]*?\};','const FIREBASE_CONFIG = null;',html)
fonts=open(os.path.join(HERE,'fonts.css'),encoding='utf-8').read().replace('font-family:CinzelD','font-family:"Cinzel Decorative"').replace('font-family:Fell','font-family:"IM Fell English"')
html=html.replace('<style>','<style>'+fonts,1)
open(os.path.join(S,'index.html'),'w',encoding='utf-8').write(html)
for src,dst in [('netlify','netlify'),('img','img'),('retos','retos'),('musica','musica')]:  # img y musica son opcionales
    d=os.path.join(S,dst); p=os.path.join(RAIZ,src)
    if os.path.islink(d) or os.path.exists(d): continue
    if os.path.isdir(p): enlaza(p,d)
esc=os.path.join(S,'escudos')
if not os.path.exists(esc) and os.path.isdir(os.path.join(RAIZ,'escudos')): enlaza(os.path.join(RAIZ,'escudos'), esc)
if '--solo-preparar' in sys.argv: print('preparado en', S); sys.exit(0)
print('sirviendo', S, 'en http://localhost:8765/index.html  (Ctrl+C para parar)')
subprocess.call([sys.executable,'-m','http.server','8765'], cwd=S)
