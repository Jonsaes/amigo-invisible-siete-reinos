# Pruebas automáticas (para Claude Code o para quien quiera tocar el código)

Todo se prueba en **modo local** (sin Firebase): la web guarda en `localStorage` y el árbitro de Netlify se
simula en el navegador (`llamar()` en `index.html`) y con una Firebase falsa en memoria (`test_reto*.js`).

## Preparar (una vez por sesión)
```
pip install playwright && python -m playwright install chromium     # si no está
python3 pruebas/servir.py &          # sirve la web en http://localhost:8765/index.html
```
`servir.py` crea `pruebas/_serve/` (no se sube a git) con `FIREBASE_CONFIG = null` y las fuentes incrustadas.
**Después de cada cambio en `index.html` hay que volver a ejecutar `servir.py`** (o `servir.py --solo-preparar` si el servidor ya corre).

## Qué prueba cada archivo
| Archivo | Qué comprueba | Cuánto tarda |
|---|---|---|
| `test_reto.js`, `test_reto2.js`, `test_reto3.js` (`node pruebas/test_reto.js`) | El árbitro `netlify/functions/reto.js`: corrección de cada tipo de reto, intentos, puntos, foto con bonus, cuervo, la acción `directo` solo para el Maestre | segundos |
| `test_reto_indiv.js` | El árbitro en capítulos individuales: intentos de cada uno, media de los que participan, escudo, gema, foto con bonus por persona, y que los de grupo siguen igual | segundos |
| `test_indiv.py` | En el móvil: el Maestre abre un capítulo (queda individual; uno ya jugado sigue en grupo), un Stark acierta y el otro sigue teniendo el reto | ~30 s |
| `test_reto_tipos.js` | El árbitro con los tipos `numero` (pista más/menos, margen, fuera de rango) y `zona` (mete un reto de zona de mentira) | segundos |
| `test_tipos.py` | En el móvil: «Adivina la cifra» (barra, − y +, pista), «Toca en la foto» (tocar, arrastrar la ✖, confirmar) y «La antorcha» (a oscuras, fallo, acierto y «amanece»); los retos de zona y antorcha los inyecta la prueba. También juega un reto de mapa con foto del «Viaje por Poniente» (fallo y acierto), comprueba que un mapa sin foto sigue igual y deja `74_viaje_zonas.png` con las zonas de los 10 lugares sobre el mapa. | ~40 s |
| `test_retos.py` | La Larga Noche en el móvil: un reto de cada tipo de principio a fin (emojis, mapa, ordena, empareja, cuervo, foto) | ~1 min |
| `test_sobremesa.py` | La sobremesa completa: Maestre prepara → intro → tele → móviles responden → cerrar → apuesta → ceremonia → terminar, y las tres demos | ~3 min |
| `test_demo_tv.py`, `test_intro.py`, `test_demo.py` | Solo capturas de la demo de la tele, la intro y la demo de portada | 1–2 min |

Las capturas van a `pruebas/capturas/` (no se sube a git). Los `assert` de los `.py` son la prueba; si
alguno falla, el script se para con el error. Al final imprimen `ERRORES:` con los errores de consola del
navegador: los de `localStorage` (por `about:blank`), `ERR_TUNNEL_CONNECTION_FAILED` (Google Fonts sin internet) y los
404 de las imágenes opcionales de `img/` (el juego usa sus propios dibujos si faltan) son normales.

## Cómo está montado el modo local
- `test_*.py` meten unos datos de partida en `localStorage` (19 jugadores, Casas completas, capítulos abiertos).
- Se entra como un jugador poniendo `poniente_pid_2026` en `localStorage` y abriendo `#/camara`.
- La Sala del Maestre en local se abre con la clave `maestre`.
- Un solo navegador hace de Maestre, de jugadores y de tele cambiando de ruta (`#/maestre`, `#/camara`, `#/pantalla`).
